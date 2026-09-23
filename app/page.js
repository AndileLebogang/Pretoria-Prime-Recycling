'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RecycleMark from '@/components/RecycleMark';
import { useAuth } from '@/lib/useAuth';
import { site } from '@/lib/site';

const slides = [
  { text: site.slogan },
  { text: 'Choose your collection day and what you are recycling. We collect from your door every week.' },
  { text: 'Track what you recycle, pay your monthly plan and get updates in one place.' },
];

export default function Onboarding() {
  const router = useRouter();
  const { user } = useAuth({ require: false });
  const [i, setI] = useState(0);

  useEffect(() => { if (user) router.replace('/home'); }, [user, router]);

  return (
    <div className="app onboard" style={{ paddingBottom: '2rem' }}>
      <div className="badge-circle"><RecycleMark size={110} /></div>
      <h1>{site.name}</h1>
      <p className="slide-text" aria-live="polite">{slides[i].text}</p>
      <div className="dots" role="group" aria-label="Introduction slides">
        {slides.map((_, n) => (
          <button key={n} aria-label={`Slide ${n + 1}`} aria-current={n === i} onClick={() => setI(n)} />
        ))}
      </div>
      <div className="actions">
        <Link href="/signup" className="btn">Get started</Link>
        <p className="muted small" style={{ margin: 0 }}>Already have an account? <Link href="/login" style={{ color: 'var(--green)', fontWeight: 700 }}>Log in</Link></p>
      </div>
    </div>
  );
}
