'use client';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Checks whether the current user's profile has role = 'admin'.
export function useIsAdmin(userId) {
  const [state, setState] = useState({ loading: true, isAdmin: false });
  useEffect(() => {
    if (!userId || !supabase) { setState({ loading: false, isAdmin: false }); return; }
    let on = true;
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
      .then(({ data }) => { if (on) setState({ loading: false, isAdmin: data?.role === 'admin' }); })
      .catch(() => { if (on) setState({ loading: false, isAdmin: false }); });
    return () => { on = false; };
  }, [userId]);
  return state;
}
