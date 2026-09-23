'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Icon } from '@/components/Icons';

export default function Login() {
  const router = useRouter();
  const [state, setState] = useState({ status: 'idle', message: '' });

  async function onSubmit(e) {
    e.preventDefault();
    if (!supabase) { setState({ status: 'error', message: 'The app is not connected to Supabase yet.' }); return; }
    const f = new FormData(e.currentTarget);
    setState({ status: 'sending', message: '' });
    const { error } = await supabase.auth.signInWithPassword({ email: f.get('email').trim(), password: f.get('password') });
    if (error) { setState({ status: 'error', message: 'We could not log you in. Check your email and password, and confirm your email if you just signed up.' }); return; }
    router.replace('/home');
  }

  return (
    <div className="app auth">
      <Link href="/" className="icon-btn back" aria-label="Back"><Icon name="back" /></Link>
      <h1>Welcome back</h1>
      <p className="muted">Log in to manage your collections.</p>
      <form className="form" onSubmit={onSubmit}>
        <label className="field">Email<input name="email" type="email" required autoComplete="email" /></label>
        <label className="field">Password<input name="password" type="password" required autoComplete="current-password" /></label>
        {state.status === 'error' && <div className="notice notice-error" role="alert">{state.message}</div>}
        <button className="btn" disabled={state.status === 'sending'}>{state.status === 'sending' ? 'Logging in...' : 'Log in'}</button>
      </form>
      <p className="switch-link muted">New here? <Link href="/signup">Create an account</Link></p>
    </div>
  );
}
