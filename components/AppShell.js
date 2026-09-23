'use client';
import { createContext, useContext } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import BottomNav from './BottomNav';
import { Icon } from './Icons';
import RecycleMark from './RecycleMark';

const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

// Wraps every signed-in screen: login check, header, bottom navigation.
export default function AppShell({ title, back, nav = true, children }) {
  const { loading, user, missing } = useAuth();

  if (missing) {
    return (
      <div className="app"><div className="screen">
        <div className="notice notice-error">
          The app is not connected to Supabase yet. Add your two keys to <b>.env.local</b> and restart.
        </div>
      </div></div>
    );
  }
  if (loading || !user) {
    return <div className="app splash"><RecycleMark size={72} color="var(--green)" /></div>;
  }

  return (
    <UserContext.Provider value={user}>
      <div className="app">
        {title && (
          <header className="top">
            {back && <Link href={back} className="icon-btn" aria-label="Back"><Icon name="back" /></Link>}
            <h1>{title}</h1>
          </header>
        )}
        <main className="screen">{children}</main>
        {nav && <BottomNav />}
      </div>
    </UserContext.Provider>
  );
}
