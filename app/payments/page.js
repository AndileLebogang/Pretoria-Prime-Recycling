'use client';
import { useEffect, useState } from 'react';
import AppShell, { useUser } from '@/components/AppShell';
import { supabase } from '@/lib/supabase';
import { whatsappLink } from '@/lib/site';
import { fullShortDate, rand } from '@/lib/format';
 
const statusLabel = { paid: 'Paid', pending: 'Pending', failed: 'Failed' };
const accountTypes = ['Cheque / Current', 'Savings', 'Transmission'];
const emptyForm = { account_holder: '', bank_name: '', account_number: '', branch_code: '', account_type: accountTypes[0] };
 
function maskAccount(n) {
  if (!n) return '';
  return `•••• ${String(n).slice(-4)}`;
}
 
function validate(f) {
  if (!f.account_holder.trim()) return 'Enter the account holder name.';
  if (!f.bank_name.trim()) return 'Enter your bank name.';
  if (!/^\d{6,16}$/.test(f.account_number)) return 'Account number must be 6 to 16 digits, numbers only.';
  if (!/^\d{6}$/.test(f.branch_code)) return 'Branch code must be 6 digits.';
  return null;
}
 
function PaymentsBody() {
  const user = useUser();
  const [d, setD] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'error' | 'ok', text }
 
  useEffect(() => {
    let on = true;
    (async () => {
      const [bank, pay, prof] = await Promise.all([
        supabase.from('bank_details').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('payments').select('*').eq('user_id', user.id).order('paid_on', { ascending: false }).limit(12),
        supabase.from('profiles').select('reference,full_name').eq('id', user.id).maybeSingle(),
      ]);
      if (!on) return;
      if (bank.error || pay.error) setLoadError(true);
      const saved = bank.data || null;
      setD({ bank: saved, payments: pay.data ?? [], profile: prof.data });
      if (saved) {
        setForm({
          account_holder: saved.account_holder || '',
          bank_name: saved.bank_name || '',
          account_number: saved.account_number || '',
          branch_code: saved.branch_code || '',
          account_type: saved.account_type || accountTypes[0],
        });
      } else {
        setForm({ ...emptyForm, account_holder: prof.data?.full_name || '' });
        setEditing(true);
      }
    })();
    return () => { on = false; };
  }, [user.id]);
 
  function update(key, value) {
    setMsg(null);
    setForm((f) => ({ ...f, [key]: value }));
  }
 
  async function save(e) {
    e.preventDefault();
    const clean = {
      ...form,
      account_holder: form.account_holder.trim(),
      bank_name: form.bank_name.trim(),
      account_number: form.account_number.replace(/\s/g, ''),
      branch_code: form.branch_code.replace(/\s/g, ''),
    };
    const problem = validate(clean);
    if (problem) return setMsg({ type: 'error', text: problem });
 
    setSaving(true);
    setMsg(null);
    const { data, error } = await supabase
      .from('bank_details')
      .upsert({ user_id: user.id, ...clean, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select()
      .maybeSingle();
    setSaving(false);
 
    if (error) return setMsg({ type: 'error', text: 'We could not save your details. Check your connection and try again.' });
    setD((prev) => ({ ...prev, bank: data || { ...clean } }));
    setForm(clean);
    setEditing(false);
    setMsg({ type: 'ok', text: 'Banking details saved.' });
  }
 
  function cancelEdit() {
    const b = d.bank;
    setForm({
      account_holder: b.account_holder || '',
      bank_name: b.bank_name || '',
      account_number: b.account_number || '',
      branch_code: b.branch_code || '',
      account_type: b.account_type || accountTypes[0],
    });
    setMsg(null);
    setEditing(false);
  }
 
  if (!d) return <p className="muted">Loading...</p>;
  const { bank, profile } = d;
 
  return (
    <>
      <section className="plan-card" aria-label="Payout account">
        <small>Payout account</small>
        <h2>{bank ? bank.bank_name : 'No banking details yet'}</h2>
        <p>{bank ? `${bank.account_type} ${maskAccount(bank.account_number)}` : 'Add your bank account so we can pay you.'}</p>
        <span className="pill">{bank ? 'Details saved' : 'Details needed'}</span>
      </section>
 
      {loadError && (
        <p className="muted small" role="alert" style={{ marginTop: '0.6rem' }}>
          Some information could not be loaded. Refresh the page to try again.
        </p>
      )}
 
      <h2 className="section-title">Banking details</h2>
      <div className="card">
        {!editing && bank ? (
          <>
            <dl className="kv">
              <dt>Account holder</dt><dd>{bank.account_holder}</dd>
              <dt>Bank</dt><dd>{bank.bank_name}</dd>
              <dt>Account number</dt><dd>{maskAccount(bank.account_number)}</dd>
              <dt>Branch code</dt><dd>{bank.branch_code}</dd>
              <dt>Account type</dt><dd>{bank.account_type}</dd>
            </dl>
            <div style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => { setMsg(null); setEditing(true); }}>
                Edit banking details
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={save} noValidate>
            <p className="muted small" style={{ margin: '0 0 0.8rem' }}>
              We pay you into this account. The account must be in your own name.
            </p>
 
            <label htmlFor="account_holder">Account holder name</label>
            <input id="account_holder" className="input" type="text" autoComplete="name"
              value={form.account_holder} onChange={(e) => update('account_holder', e.target.value)} />
 
            <label htmlFor="bank_name" style={{ marginTop: '0.8rem', display: 'block' }}>Bank</label>
            <input id="bank_name" className="input" type="text" list="za-banks"
              value={form.bank_name} onChange={(e) => update('bank_name', e.target.value)} />
            <datalist id="za-banks">
              <option value="ABSA" />
              <option value="African Bank" />
              <option value="Capitec" />
              <option value="Discovery Bank" />
              <option value="FNB" />
              <option value="Investec" />
              <option value="Nedbank" />
              <option value="Standard Bank" />
              <option value="TymeBank" />
            </datalist>
 
            <label htmlFor="account_number" style={{ marginTop: '0.8rem', display: 'block' }}>Account number</label>
            <input id="account_number" className="input" type="text" inputMode="numeric" autoComplete="off"
              value={form.account_number} onChange={(e) => update('account_number', e.target.value.replace(/[^\d\s]/g, ''))} />
 
            <label htmlFor="branch_code" style={{ marginTop: '0.8rem', display: 'block' }}>Branch code</label>
            <input id="branch_code" className="input" type="text" inputMode="numeric" maxLength={6} autoComplete="off"
              value={form.branch_code} onChange={(e) => update('branch_code', e.target.value.replace(/\D/g, ''))} />
 
            <label htmlFor="account_type" style={{ marginTop: '0.8rem', display: 'block' }}>Account type</label>
            <select id="account_type" className="input" value={form.account_type} onChange={(e) => update('account_type', e.target.value)}>
              {accountTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
 
            {msg && (
              <p role={msg.type === 'error' ? 'alert' : 'status'} className="small" style={{ marginTop: '0.8rem', color: msg.type === 'error' ? '#c0392b' : undefined }}>
                {msg.text}
              </p>
            )}
 
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.6rem' }}>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? 'Saving...' : 'Save banking details'}
              </button>
              {bank && (
                <button type="button" className="btn btn-outline" onClick={cancelEdit} disabled={saving}>Cancel</button>
              )}
            </div>
          </form>
        )}
        {!editing && msg?.type === 'ok' && (
          <p role="status" className="small" style={{ marginTop: '0.8rem' }}>{msg.text}</p>
        )}
      </div>
 
      <h2 className="section-title">Payments received</h2>
      {d.payments.length === 0 ? (
        <div className="card muted">
          {bank
            ? 'No payments yet. Payments from us will appear here once they are sent.'
            : 'No payments yet. Add your banking details above so we can pay you.'}
        </div>
      ) : (
        <div className="stack">
          {d.payments.map((p) => (
            <div className="row" key={p.id}>
              <div className="grow"><b>{fullShortDate(p.paid_on)}</b><small>{statusLabel[p.status] || p.status} • {p.method}</small></div>
              <span className="end">{rand(p.amount, true)}</span>
            </div>
          ))}
        </div>
      )}
 
      <div style={{ marginTop: '1.4rem' }}>
        <a className="btn btn-outline" href={whatsappLink(`Hi, I need help with my banking details or a payment. My reference is ${profile?.reference || ''}.`)} target="_blank" rel="noopener noreferrer">Get help with payments</a>
      </div>
    </>
  );
}
 
export default function Payments() {
  return <AppShell title="Payout details" back="/home"><PaymentsBody /></AppShell>;
}
 