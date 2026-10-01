'use client';
import { useEffect, useState } from 'react';
import AppShell, { useUser } from '@/components/AppShell';
import { supabase } from '@/lib/supabase';
import { days } from '@/lib/site';
import { fullShortDate, longDate, nextPickupDate, rand } from '@/lib/format';

const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const dayLong = (n) => days.find((x) => x.n === n)?.long || '';

// Same rule as the customer schedule page: a one-off move counts only while it is today or later.
function nextDate(s) {
  if (s.moved_to) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const m = fromISO(s.moved_to);
    if (m >= today) return m;
  }
  return new Date(nextPickupDate(s.collection_day));
}

function AdminBody() {
  const user = useUser();
  const [d, setD] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState('pickups');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [amount, setAmount] = useState('');
  const [pay, setPay] = useState({ status: 'idle', message: '' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let on = true;
    (async () => {
      const me = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      if (!on) return;
      if (!me.data?.is_admin) { setD({ denied: true }); return; }
      const [pr, sc, bk, py] = await Promise.all([
        supabase.from('profiles').select('id,reference,full_name,address'),
        supabase.from('pickup_schedules').select('*'),
        supabase.from('bank_details').select('*'),
        supabase.from('payments').select('*').order('paid_on', { ascending: false }).limit(500),
      ]);
      if (!on) return;
      if (pr.error || sc.error || bk.error || py.error) setLoadError(true);
      setD({ profiles: pr.data ?? [], schedules: sc.data ?? [], banks: bk.data ?? [], payments: py.data ?? [] });
    })();
    return () => { on = false; };
  }, [user.id]);

  if (!d) return <p className="muted">Loading...</p>;
  if (d.denied) return <div className="card muted">You do not have access to this page.</div>;

  const schedBy = Object.fromEntries(d.schedules.map((s) => [s.user_id, s]));
  const bankBy = Object.fromEntries(d.banks.map((b) => [b.user_id, b]));
  const lastPaidBy = {};
  d.payments.forEach((p) => { if (!lastPaidBy[p.user_id]) lastPaidBy[p.user_id] = p; }); // already newest first
  const customers = d.profiles.map((p) => ({ ...p, sched: schedBy[p.id], bank: bankBy[p.id], last: lastPaidBy[p.id] }));
  const nameOf = (c) => c.full_name || c.reference || 'Unnamed customer';

  const activePickups = customers.filter((c) => c.sched?.weekly);
  const stats = [
    ['Customers', customers.length],
    ['Active pickups', activePickups.length],
    ['No bank details', customers.filter((c) => !c.bank).length],
    ['Pending payments', d.payments.filter((p) => p.status === 'pending').length],
  ];

  const groups = {};
  activePickups.forEach((c) => {
    const dt = nextDate(c.sched);
    const k = toISO(dt);
    (groups[k] ||= { date: dt, items: [] }).items.push(c);
  });
  const sortedGroups = Object.values(groups).sort((a, b) => a.date - b.date);

  const needle = q.trim().toLowerCase();
  const filtered = customers.filter((c) => !needle || [c.full_name, c.reference, c.address].some((v) => v?.toLowerCase().includes(needle)));

  function toggle(id) {
    setOpen(open === id ? null : id);
    setAmount('');
    setPay({ status: 'idle', message: '' });
    setCopied(false);
  }

  async function copyAccount(n) {
    try { await navigator.clipboard.writeText(n); setCopied(true); } catch { setCopied(false); }
  }

  async function recordPayment(c) {
    const value = Number(amount);
    if (!(value > 0)) { setPay({ status: 'error', message: 'Enter an amount greater than zero.' }); return; }
    setPay({ status: 'saving', message: '' });
    const { data, error } = await supabase.from('payments')
      .insert({ user_id: c.id, amount: value, paid_on: toISO(new Date()), status: 'paid', method: 'EFT' })
      .select()
      .maybeSingle();
    if (error || !data) { setPay({ status: 'error', message: 'Could not record the payment. Please try again.' }); return; }
    setD((prev) => ({ ...prev, payments: [data, ...prev.payments] }));
    setAmount('');
    setPay({ status: 'done', message: `Recorded ${rand(value)} paid to ${nameOf(c)}.` });
  }

  return (
    <>
      <div className="stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
        {stats.map(([label, n]) => (
          <div className="card" key={label}><small className="muted">{label}</small><h2 style={{ margin: '0.2rem 0 0' }}>{n}</h2></div>
        ))}
      </div>

      {loadError && <p className="muted small" role="alert" style={{ marginTop: '0.6rem' }}>Some data could not be loaded. Check the admin policies have been applied, then refresh.</p>}

      <div className="days" role="tablist" aria-label="Dashboard sections" style={{ marginTop: '1.2rem' }}>
        <button type="button" role="tab" className="day" aria-pressed={tab === 'pickups'} onClick={() => setTab('pickups')}>Pickups</button>
        <button type="button" role="tab" className="day" aria-pressed={tab === 'customers'} onClick={() => setTab('customers')}>Customers &amp; payouts</button>
      </div>

      {tab === 'pickups' && (
        <>
          <h2 className="section-title">Upcoming pickups</h2>
          {sortedGroups.length === 0 ? (
            <div className="card muted">No customers have an active weekly pickup yet.</div>
          ) : sortedGroups.map((g) => (
            <div key={toISO(g.date)} style={{ marginBottom: '1rem' }}>
              <b>{longDate(g.date)}</b> <span className="muted small">• {g.items.length} {g.items.length === 1 ? 'pickup' : 'pickups'}</span>
              <div className="stack" style={{ marginTop: '0.4rem' }}>
                {g.items.map((c) => (
                  <div className="row" key={c.id}>
                    <div className="grow">
                      <b>{nameOf(c)}</b>
                      <small>{c.sched.address || c.address || 'No address'}</small>
                      <small>{c.sched.materials?.length ? c.sched.materials.join(', ') : 'No materials selected'}</small>
                      {c.sched.notes && <small>Note: {c.sched.notes}</small>}
                    </div>
                    <span className="pill">{c.sched.moved_to && fromISO(c.sched.moved_to) >= new Date().setHours(0, 0, 0, 0) ? 'Moved' : dayLong(c.sched.collection_day)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'customers' && (
        <>
          <h2 className="section-title">Customers &amp; payouts</h2>
          <label className="field">
            <span className="muted small">Search by name, reference or address</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <div className="stack" style={{ marginTop: '0.8rem' }}>
            {filtered.length === 0 && <div className="card muted">No customers match your search.</div>}
            {filtered.map((c) => (
              <div key={c.id}>
                <div className="row">
                  <div className="grow">
                    <b>{nameOf(c)}</b>
                    <small>{c.reference || 'No reference'} • {c.bank ? `${c.bank.bank_name}` : 'No bank details'}</small>
                    <small>{c.last ? `Last paid ${fullShortDate(c.last.paid_on)} (${rand(c.last.amount)})` : 'Never paid'}</small>
                  </div>
                  <button type="button" className="btn btn-outline" onClick={() => toggle(c.id)} aria-expanded={open === c.id}>{open === c.id ? 'Close' : 'Open'}</button>
                </div>

                {open === c.id && (
                  <div className="card" style={{ marginTop: '0.4rem' }}>
                    <dl className="kv">
                      <dt>Address</dt><dd>{c.address || 'Not provided'}</dd>
                      <dt>Pickup</dt><dd>{c.sched?.weekly ? `Every ${dayLong(c.sched.collection_day)}` : 'Not scheduled'}</dd>
                    </dl>

                    <h3 className="section-title" style={{ marginBottom: '0.4rem' }}>Banking details</h3>
                    {c.bank ? (
                      <>
                        <dl className="kv">
                          <dt>Account holder</dt><dd>{c.bank.account_holder}</dd>
                          <dt>Bank</dt><dd>{c.bank.bank_name}</dd>
                          <dt>Account number</dt><dd>{c.bank.account_number}</dd>
                          <dt>Branch code</dt><dd>{c.bank.branch_code}</dd>
                          <dt>Account type</dt><dd>{c.bank.account_type}</dd>
                          <dt>Payment reference</dt><dd>{c.reference || 'None'}</dd>
                        </dl>
                        <button type="button" className="btn btn-outline" onClick={() => copyAccount(c.bank.account_number)}>{copied ? 'Copied' : 'Copy account number'}</button>

                        <h3 className="section-title" style={{ marginBottom: '0.4rem' }}>Record a payment</h3>
                        <p className="muted small" style={{ margin: '0 0 0.6rem' }}>Make the EFT in your bank first, then record it here so the customer sees it.</p>
                        <label className="field">Amount paid (R)
                          <input type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => { setAmount(e.target.value); setPay({ status: 'idle', message: '' }); }} />
                        </label>
                        {pay.status === 'done' && <div className="notice notice-ok" role="status" style={{ marginTop: '0.6rem' }}>{pay.message}</div>}
                        {pay.status === 'error' && <div className="notice notice-error" role="alert" style={{ marginTop: '0.6rem' }}>{pay.message}</div>}
                        <div style={{ marginTop: '0.8rem' }}>
                          <button type="button" className="btn" onClick={() => recordPayment(c)} disabled={pay.status === 'saving'}>
                            {pay.status === 'saving' ? 'Saving...' : 'Record payment'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="muted small" style={{ margin: 0 }}>This customer has not added banking details yet, so they cannot be paid.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default function Admin() {
  return <AppShell title="Admin" back="/home"><AdminBody /></AppShell>;
}