'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabase';

// Tracks the logged-in user. With require = true, sends visitors to /login.
export function useAuth({ require = true } = {}) {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, user: null, missing: false });

  useEffect(() => {
    if (!supabase) { setState({ loading: false, user: null, missing: true }); return; }
    let active = true;
    const apply = (session) => {
      if (!active) return;
      const user = session?.user ?? null;
      setState({ loading: false, user, missing: false });
      if (require && !user) router.replace('/login');
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
