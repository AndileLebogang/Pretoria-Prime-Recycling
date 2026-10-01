'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icons';
import { useUser } from './AppShell';
import { useIsAdmin } from '@/lib/useIsAdmin';

const items = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/schedule', label: 'Schedule', icon: 'calendar' },
  { href: '/payments', label: 'Payments', icon: 'card' },
  { href: '/profile', label: 'Profile', icon: 'user' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const user = useUser();
  const { isAdmin } = useIsAdmin(user?.id);
  const list = isAdmin ? [...items, { href: '/admin', label: 'Admin', icon: 'shield' }] : items;

  return (
    <nav className="bottom-nav" style={{ gridTemplateColumns: `repeat(${list.length}, 1fr)` }} aria-label="Main">
      {list.map((i) => (
        <Link key={i.href} href={i.href} aria-current={pathname === i.href || (i.href === '/admin' && pathname.startsWith('/admin')) ? 'page' : undefined}>
          <Icon name={i.icon} />
          <span>{i.label}</span>
        </Link>
      ))}
    </nav>
  );
}
