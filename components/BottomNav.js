'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icons';

const items = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/schedule', label: 'Schedule', icon: 'calendar' },
  { href: '/payments', label: 'Payments', icon: 'card' },
  { href: '/profile', label: 'Profile', icon: 'user' },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav" aria-label="Main">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={pathname === i.href ? 'page' : undefined}>
          <Icon name={i.icon} />
          <span>{i.label}</span>
        </Link>
      ))}
    </nav>
  );
}
