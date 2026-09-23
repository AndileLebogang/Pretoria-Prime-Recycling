'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Icon } from '@/components/Icons';
import { site } from '@/lib/site';

export default function SignUp() {
  const router = useRouter();
  const [state, setState] = useState({ status: 'idle', message: '' });

  async function onSubmit(e) {
    e.preventDefault();
    if (!supabase) { setState({ status: 'error', message: 'The app is not connected to Supabase yet.' }); return; }
    const f = new FormData(e.currentTarget);
    setState({ status: 'sending', message: '' });
    const { data, error } = await supabase.auth.signUp({
      email: f.get('email').trim(),
      password: f.get('password'),
      options: { data: { full_name: f.get('full_name').trim(), phone: f.get('phone').trim(), address: f.get('address').trim() } },
    });
    if (error) { setState({ status: 'error', message: error.message }); return; }
    if (data.session) router.replace('/home');
    else setState({ status: 'confirm', message: 'Account created. Check your email for a confirmation link, then log in.' });
  }

  return (
    <div className="app auth">
      <Link href="/" className="icon-btn back" aria-label="Back"><Icon name="back" /></Link>
      <h1>Create your account</h1>
      <p className="muted">Sign up to schedule your weekly recyclable collection.</p>

      {state.status === 'confirm' ? (
        <div className="notice notice-ok" role="status">{state.message}</div>
      ) : (
        <form className="form" onSubmit={onSubmit}>
          <label className="field">Full name<input name="full_name" required autoComplete="name" /></label>
          <label className="field">Home address ({site.area})<input name="address" required autoComplete="street-address" /></label>
          <label className="field">Phone number<input name="phone" type="tel" required autoComplete="tel" /></label>
          <label className="field">Email<input name="email" type="email" required autoComplete="email" /></label>
          <label className="field">Password (at least 8 characters)<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
          {state.status === 'error' && <div className="notice notice-error" role="alert">{state.message}</div>}
          <button className="btn" disabled={state.status === 'sending'}>{state.status === 'sending' ? 'Creating account...' : 'Sign up'}</button>
        </form>
      )}
      <p className="switch-link muted">Already have an account? <Link href="/login">Log in</Link></p>
    </div>
  );
}
