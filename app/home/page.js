'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell, { useUser } from '@/components/AppShell';
import RecycleMark from '@/components/RecycleMark';
import { Icon } from '@/components/Icons';
import { supabase } from '@/lib/supabase';
import { site, days } from '@/lib/site';
import { longDate, nextPickupDate, parseDate, rand, shortDate } from '@/lib/format';

function HomeBody() {
  const user = useUser();
  const [d, setD] = useState(null);

  useEffect(() => {
    let on = true;
    (async () => {
      const uid = user.id;
      const [p, s, sub, pk, pay, n] = await Promise.all([
        supabase.from('profiles').select('full_name,address').eq('id', uid).maybeSingle(),
        supabase.from('pickup_schedules').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('subscriptions').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('pickups').select('*').eq('user_id', uid).order('pickup_date', { ascending: false }).limit(100),
        supabase.from('payments').select('*').eq('user_id', uid).order('paid_on', { ascending: false }).limit(5),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false),
      ]);
      if (on) setD({ profile: p.data, schedule: s.data, sub: sub.data, pickups: pk.data ?? [], payments: pay.data ?? [], unread: n.count ?? 0 });
    })();
    return () => { on = false; };
  }, [user.id]);

  if (!d) return <p className="muted">Loading...</p>;

  const firstName = (d.profile?.full_name || '').split(' ')[0] || 'there';
  const now = new Date();
  const completed = d.pickups.filter((x) => x.status === 'completed');
  const kgMonth = completed
    .filter((x) => { const t = parseDate(x.pickup_date); return t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear(); })
    .reduce((sum, x) => sum + Number(x.weight_kg || 0), 0);

  const weekly = d.schedule?.weekly;
  const next = weekly ? nextPickupDate(d.schedule.collection_day) : null;
  const dayName = days.find((x) => x.n === d.schedule?.collection_day)?.long;

  const activity = [
    ...completed.slice(0, 4).map((x) => ({ key: 'p' + x.id, date: x.pickup_date, title: 'Pickup completed', sub: `${shortDate(x.pickup_date)}${x.weight_kg ? ` • ${x.weight_kg}kg collected` : ''}` })),
    ...d.payments.filter((x) => x.status === 'paid').map((x) => ({ key: 'm' + x.id, date: x.paid_on, title: 'Payment received', sub: `${shortDate(x.paid_on)} • ${rand(x.amount)}` })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  return (
    <>
      <div className="greet">
        <div>
          <h1>Hi, {firstName}</h1>
          <p>{d.profile?.address || `${site.area}, ${site.city}`}</p>
        </div>
        <Link href="/notifications" className="icon-btn bell" aria-label={d.unread ? `Notifications, ${d.unread} unread` : 'Notifications'}>
          <Icon name="bell" />
          {d.unread > 0 && <span className="badge" />}
        </Link>
      </div>

      <section className="hero-card" aria-label="Next pickup">
        <span className="mark" aria-hidden="true"><RecycleMark size={150} /></span>
        <small>Next pickup</small>
        {next ? (
          <>
            <h2>{longDate(next)}</h2>
            <p>Collection window: {site.collectionWindow}</p>
          </>
        ) : (
          <>
            <h2>Not scheduled</h2>
            <p>Weekly collection is switched off.</p>
          </>
        )}
        <Link href="/schedule" className="btn btn-small btn-on-green" style={{ display: 'inline-flex' }}>{next ? 'View details' : 'Set up collection'}</Link>
      </section>

      <div className="tiles">
        <Link href="/schedule" className="tile"><span className="ico"><Icon name="calendar" size={26} /></span>Schedule</Link>
        <Link href="/payments" className="tile"><span className="ico"><Icon name="wallet" size={26} /></span>Payment</Link>
        <Link href="/bins" className="tile"><span className="ico"><Icon name="bin" size={26} /></span>Bins guide</Link>
        <Link href="/support" className="tile"><span className="ico"><Icon name="help" size={26} /></span>Support</Link>
      </div>

      <h2 className="section-title">Your impact</h2>
      <div className="stats">
        <div className="stat"><b>{kgMonth.toFixed(kgMonth % 1 ? 1 : 0)}kg</b><span>Recycled this month</span></div>
        <div className="stat"><b>{rand(d.sub?.amount ?? 150)}</b><span>Monthly plan</span></div>
        <div className="stat"><b>{completed.length}</b><span>Pickups completed</span></div>
      </div>

      <h2 className="section-title">Recent activity</h2>
      {activity.length === 0 ? (
        <div className="card muted">Nothing yet. Your first collection will show up here{dayName ? ` after ${dayName}` : ''}.</div>
      ) : (
        <div className="stack">
          {activity.map((a) => (
            <div className="row" key={a.key}><span className="dot" /><div className="grow"><b>{a.title}</b><small>{a.sub}</small></div></div>
          ))}
        </div>
      )}
    </>
  );
}

export default function Home() {
  return <AppShell><HomeBody /></AppShell>;
}
