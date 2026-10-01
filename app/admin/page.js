'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import './admin.css';

const PLAN = 150;
const PAID = 'paid'; // the status value saved for a paid payment
const METHODS = ['EFT', 'PayShap', 'Cash'];
const TABS = [['overview', 'Overview'], ['customers', 'Customers'], ['pickups', 'Pickups'], ['payments', 'Payments']];
const HIDE = ['id', 'created_at', 'updated_at'];
const rand = (n) => 'R' + Number(n || 0).toLocaleString('en-ZA');
const fmtDate = (d) => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtVal = (v) => Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v === null ? '-' : String(v);
const today = () => new Date().toLocaleDateString('en-CA');
const monthStartStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const isPaid = (p) => String(p.status || '').toLowerCase() === PAID;

export default function Admin() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('overview');
  const [customers, setCustomers] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [payments, setPayments] = useState([]);
  const [q, setQ] = useState('');
  const [method, setMethod] = useState('EFT');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    const [c, p, pay] = await Promise.all([
      supabase.from('profiles').select('*').neq('role', 'admin'),
      supabase.from('pickup_schedules').select('*'),
      supabase.from('payments').select('*').order('paid_on', { ascending: false }),
    ]);
    const problems = [];
    if (c.error) problems.push('profiles: ' + c.error.message);
    if (p.error) problems.push('pickup_schedules: ' + p.error.message);
    if (pay.error) problems.push('payments: ' + pay.error.message);
    setError(problems.length ? 'Could not load - ' + problems.join(' | ') : '');
    setCustomers(c.data || []);
    setPickups(p.data || []);
    setPayments(pay.data || []);
  }

  useEffect(() => {
    (async () => {
      if (!supabase) { router.replace('/login'); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }
      const { data: me } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      if (me?.role !== 'admin') { router.replace('/home'); return; }
      setReady(true);
      load();
    })();
  }, []);

  const byId = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);
  const thisMonth = payments.filter((p) => isPaid(p) && p.paid_on >= monthStartStr());
  const paidIds = new Set(thisMonth.map((p) => p.user_id));
  const revenue = thisMonth.reduce((s, p) => s + Number(p.amount), 0);
  const unpaid = customers.filter((c) => !paidIds.has(c.id));
  const filtered = customers.filter((c) => `${c.full_name} ${c.phone} ${c.address}`.toLowerCase().includes(q.toLowerCase()));

  async function markPaid(c) {
    setBusy(c.id);
    const { error: err } = await supabase.from('payments').insert({
      user_id: c.id, paid_on: today(), amount: PLAN, status: PAID, method,
    });
    if (err) setError('Could not record payment: ' + err.message); else await load();
    setBusy(null);
  }

  async function logout() { await supabase.auth.signOut(); router.replace('/login'); }

  function ownerOf(row) {
    const v = Object.values(row).find((x) => typeof x === 'string' && byId[x]);
    return { owner: byId[v], ownerKey: v };
  }

  if (!ready) return <div className="adm-load">Loading...</div>;

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-brand">Pretoria Prime Recycling<small>Admin</small></div>
        <nav className="adm-nav">
          {TABS.map(([k, label]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
        </nav>
        <button className="adm-out" onClick={logout}>Log out</button>
      </aside>

      <main className="adm-main">
        <h1>{TABS.find(([k]) => k === tab)[1]}</h1>
        {error && <div className="adm-err">{error}</div>}

        {tab === 'overview' && (
          <>
            <div className="adm-stats">
              <div className="adm-card"><b>{customers.length}</b><span>Customers</span></div>
              <div className="adm-card"><b>{rand(revenue)}</b><span>Collected this month</span></div>
              <div className="adm-card"><b>{paidIds.size}</b><span>Paid this month</span></div>
              <div className="adm-card warn"><b>{rand(unpaid.length * PLAN)}</b><span>Outstanding ({unpaid.length})</span></div>
            </div>
            <div className="adm-two">
              <section className="adm-card">
                <h2>Awaiting payment</h2>
                {unpaid.length === 0 && <p className="adm-muted">Everyone has paid this month.</p>}
                {unpaid.slice(0, 6).map((c) => (
                  <div className="adm-row" key={c.id}>
                    <div><b>{c.full_name}</b><small>{c.address}</small></div>
                    <button className="adm-btn" disabled={busy === c.id} onClick={() => markPaid(c)}>Mark paid</button>
                  </div>
                ))}
              </section>
              <section className="adm-card">
                <h2>Recent payments</h2>
                {payments.length === 0 && <p className="adm-muted">No payments recorded yet.</p>}
                {payments.slice(0, 6).map((p) => (
                  <div className="adm-row" key={p.id}>
                    <div><b>{byId[p.user_id]?.full_name || 'Unknown'}</b><small>{fmtDate(p.paid_on)} · {p.method || '-'}</small></div>
                    <b>{rand(p.amount)}</b>
                  </div>
                ))}
              </section>
            </div>
          </>
        )}

        {tab === 'customers' && (
          <section className="adm-card">
            <div className="adm-bar">
              <input className="adm-search" placeholder="Search name, phone or address" value={q} onChange={(e) => setQ(e.target.value)} />
              <select className="adm-search adm-method" value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Payment method">
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="adm-scroll">
              <table>
                <thead><tr><th>Name</th><th>Phone</th><th>Address</th><th>This month</th><th></th></tr></thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td><b>{c.full_name}</b></td>
                      <td>{c.phone}</td>
                      <td>{c.address}</td>
                      <td><span className={'adm-badge ' + (paidIds.has(c.id) ? 'ok' : 'no')}>{paidIds.has(c.id) ? 'Paid' : 'Unpaid'}</span></td>
                      <td><button className="adm-btn" disabled={paidIds.has(c.id) || busy === c.id} onClick={() => markPaid(c)}>Mark paid ({rand(PLAN)})</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <p className="adm-muted">No customers found.</p>}
            </div>
          </section>
        )}

        {tab === 'pickups' && (
          <div className="adm-list">
            {pickups.length === 0 && <p className="adm-muted">No pickup schedules yet.</p>}
            {pickups.map((row, i) => {
              const { owner, ownerKey } = ownerOf(row);
              const fields = Object.entries(row).filter(([k, v]) => !HIDE.includes(k) && v !== ownerKey);
              return (
                <section className="adm-card" key={row.id || i}>
                  <h2>{owner?.full_name || 'Unknown customer'}</h2>
                  {owner && <small className="adm-muted">{owner.address} · {owner.phone}</small>}
                  <div className="adm-chips">
                    {fields.map(([k, v]) => <span key={k}><em>{k.replace(/_/g, ' ')}</em> {fmtVal(v)}</span>)}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {tab === 'payments' && (
          <section className="adm-card">
            <div className="adm-scroll">
              <table>
                <thead><tr><th>Customer</th><th>Method</th><th>Status</th><th>Amount</th><th>Date</th></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td><b>{byId[p.user_id]?.full_name || 'Unknown'}</b></td>
                      <td>{p.method || '-'}</td>
                      <td><span className={'adm-badge ' + (isPaid(p) ? 'ok' : 'no')}>{p.status || '-'}</span></td>
                      <td>{rand(p.amount)}</td>
                      <td>{fmtDate(p.paid_on)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payments.length === 0 && <p className="adm-muted">No payments recorded yet.</p>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}