'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell, { useUser } from '@/components/AppShell';
import { Icon } from '@/components/Icons';
import { supabase } from '@/lib/supabase';
import { site } from '@/lib/site';
import { initials } from '@/lib/format';

function ProfileBody() {
  const user = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let on = true;
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => { if (on) setProfile(data || {}); });
    return () => { on = false; };
  }, [user.id]);

  if (!profile) return <p className="muted">Loading...</p>;

  async function saveProfile(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const patch = { full_name: f.get('full_name').trim(), phone: f.get('phone').trim(), address: f.get('address').trim() };
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
    if (error) { setMsg('We could not save your details. Please try again.'); return; }
    setProfile((p) => ({ ...p, ...patch })); setEditing(false); setMsg('');
  }

  async function toggleWhatsapp() {
    const value = !profile.whatsapp_updates;
    setProfile((p) => ({ ...p, whatsapp_updates: value }));
    await supabase.from('profiles').update({ whatsapp_updates: value }).eq('id', user.id);
  }

  async function logOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  const shareText = `I use ${site.name} for weekly recycling collection in ${site.area}. Join here: ${typeof window !== 'undefined' ? window.location.origin : ''}`;

  return (
    <>
      <div className="profile-head">
        <div className="avatar" aria-hidden="true">{initials(profile.full_name)}</div>
        <h1>{profile.full_name || 'Your profile'}</h1>
        <p className="muted small" style={{ margin: '0.2rem 0' }}>{profile.address}</p>
        <button className="linklike" onClick={() => setEditing((v) => !v)}>{editing ? 'Cancel' : 'Edit profile'}</button>
      </div>

      {editing && (
        <form className="form card" style={{ marginBottom: '1rem' }} onSubmit={saveProfile}>
          <label className="field">Full name<input name="full_name" defaultValue={profile.full_name || ''} required /></label>
          <label className="field">Phone number<input name="phone" type="tel" defaultValue={profile.phone || ''} /></label>
          <label className="field">Home address<input name="address" defaultValue={profile.address || ''} required /></label>
          {msg && <div className="notice notice-error" role="alert">{msg}</div>}
          <button className="btn">Save changes</button>
        </form>
      )}

      <div className="menu">
        <Link href="/payments"><span className="lead"><Icon name="wallet" /></span><span className="grow">My subscription</span><span className="end"><Icon name="chevron" size={18} /></span></Link>
        <Link href="/schedule"><span className="lead"><Icon name="calendar" /></span><span className="grow">Collection schedule</span><span className="end"><Icon name="chevron" size={18} /></span></Link>
        <Link href="/notifications"><span className="lead"><Icon name="bell" /></span><span className="grow">Notifications</span><span className="end"><Icon name="chevron" size={18} /></span></Link>
      </div>

      <div className="menu">
        <div>
          <span className="lead"><Icon name="chat" /></span>
          <span className="grow">WhatsApp updates</span>
          <button type="button" className="switch" role="switch" aria-checked={!!profile.whatsapp_updates} aria-label="WhatsApp updates" onClick={toggleWhatsapp} />
        </div>
        <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">
          <span className="lead"><Icon name="share" /></span><span className="grow">Refer a neighbour</span><span className="end"><Icon name="chevron" size={18} /></span>
        </a>
      </div>

      <div className="menu">
        <Link href="/bins"><span className="lead"><Icon name="bin" /></span><span className="grow">Bins guide</span><span className="end"><Icon name="chevron" size={18} /></span></Link>
        <Link href="/support"><span className="lead"><Icon name="help" /></span><span className="grow">Help & support</span><span className="end"><Icon name="chevron" size={18} /></span></Link>
        <button type="button" className="danger" onClick={logOut}><Icon name="logout" /><span className="grow">Log out</span></button>
      </div>
    </>
  );
}

export default function Profile() {
  return <AppShell title="Profile"><ProfileBody /></AppShell>;
}
