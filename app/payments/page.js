'use client';
import { useEffect, useState } from 'react';
import AppShell, { useUser } from '@/components/AppShell';
import { supabase } from '@/lib/supabase';
import { site, whatsappLink } from '@/lib/site';
import { fullShortDate, rand, shortDate } from '@/lib/format';

const statusLabel = { paid: 'Paid', pending: 'Pending', failed: 'Failed' };

function PaymentsBody() {
  const user = useUser();
  const [d, setD] = useState(null);

  useEffect(() => {
    let on = true;
    (async () => {
      const [sub, pay, prof] = await Promise.all([
        supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('payments').select('*').eq('user_id', user.id).order('paid_on', { ascending: false }).limit(12),
        supabase.from('profiles').select('reference,full_name').eq('id', user.id).maybeSingle(),
      ]);
      if (on) setD({ sub: sub.data, payments: pay.data ?? [], profile: prof.data });
    })();
    return () => { on = false; };
  }, [user.id]);

  if (!d) return <p className="muted">Loading...</p>;
  const { sub, profile } = d;
  const b = site.bank;

  return (
    <>
      <section className="plan-card" aria-label="Your plan">
        <small>{sub?.plan || `${site.area} monthly plan`}</small>
        <h2>{rand(sub?.amount ?? 150)} / month</h2>
        <p>{sub?.next_billing_date ? `Next billing ${shortDate(sub.next_billing_date)}` : 'Monthly plan'}</p>
        <span className="pill">{sub?.status || 'active'}</span>
      </section>

      <h2 className="section-title">Payment method</h2>
      <div className="card">
        <b>Pay by EFT</b>
        <p className="muted small" style={{ margin: '0.2rem 0 0.8rem' }}>Use your reference so we can match your payment.</p>
        <dl className="kv">
          <dt>Bank</dt><dd>{b.bankName}</dd>
          <dt>Account name</dt><dd>{b.accountName}</dd>
          <dt>Account number</dt><dd>{b.accountNumber}</dd>
          <dt>Branch code</dt><dd>{b.branchCode}</dd>
          <dt>Account type</dt><dd>{b.accountType}</dd>
        </dl>
        <div style={{ marginTop: '1rem' }}>
          <span className="muted small">Your reference</span>
          <div className="ref">{profile?.reference || '...'}</div>
        </div>
      </div>
      <p className="muted small" style={{ marginTop: '0.6rem' }}>Card payments are coming soon.</p>

      <h2 className="section-title">Billing history</h2>
      {d.payments.length === 0 ? (
        <div className="card muted">No payments yet. Your first payment will appear here once we receive it.</div>
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
        <a className="btn btn-outline" href={whatsappLink(`Hi, I'd like to manage my subscription. My reference is ${profile?.reference || ''}.`)} target="_blank" rel="noopener noreferrer">Manage subscription</a>
      </div>
    </>
  );
}

export default function Payments() {
  return <AppShell title="Payment & subscription" back="/home"><PaymentsBody /></AppShell>;
}
