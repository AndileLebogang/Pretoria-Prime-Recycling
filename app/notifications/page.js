'use client';
import { useEffect, useState } from 'react';
import AppShell, { useUser } from '@/components/AppShell';
import { Icon } from '@/components/Icons';
import { supabase } from '@/lib/supabase';
import { timeAgo } from '@/lib/format';

const iconFor = { pickup: 'truck', payment: 'wallet', info: 'bell' };

function NotificationsBody() {
  const user = useUser();
  const [items, setItems] = useState(null);

  useEffect(() => {
    let on = true;
    (async () => {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
      if (!on) return;
      setItems(data ?? []);
      const unread = (data ?? []).some((n) => !n.read);
      if (unread) supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false).then(() => {});
    })();
    return () => { on = false; };
  }, [user.id]);

  async function clearAll() {
    setItems([]);
    await supabase.from('notifications').delete().eq('user_id', user.id);
  }

  if (!items) return <p className="muted">Loading...</p>;
  if (items.length === 0) return <div className="card muted">You are all caught up. New updates will appear here.</div>;

  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = Date.now() - 7 * 86400000;
  const groups = [
    ['Today', items.filter((n) => new Date(n.created_at) >= startOfToday)],
    ['Earlier this week', items.filter((n) => new Date(n.created_at) < startOfToday && new Date(n.created_at).getTime() >= weekAgo)],
    ['Older', items.filter((n) => new Date(n.created_at).getTime() < weekAgo)],
  ].filter(([, list]) => list.length);

  return (
    <>
      <div className="page-actions"><button className="linklike" onClick={clearAll}>Clear all</button></div>
      {groups.map(([label, list]) => (
        <section key={label}>
          <div className="group-label">{label}</div>
          <div className="stack">
            {list.map((n) => (
              <div className={`note${n.read ? '' : ' unread'}`} key={n.id}>
                <span className="ico"><Icon name={iconFor[n.kind] || 'bell'} /></span>
                <div style={{ flex: 1, minWidth: 0 }}><b>{n.title}</b>{n.body && <p>{n.body}</p>}</div>
                <time dateTime={n.created_at}>{timeAgo(n.created_at)}</time>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export default function Notifications() {
  return <AppShell title="Notifications" back="/home" nav={false}><NotificationsBody /></AppShell>;
}
