import AppShell from '@/components/AppShell';
import { Icon } from '@/components/Icons';
import { site, faqs, whatsappLink } from '@/lib/site';

export default function Support() {
  return (
    <AppShell title="Help & support" back="/home">
      <div className="menu">
        <a href={whatsappLink()} target="_blank" rel="noopener noreferrer"><span className="lead"><Icon name="chat" /></span><span className="grow">Message us on WhatsApp</span></a>
        <a href={`tel:${site.phoneLink}`}><span className="lead"><Icon name="help" /></span><span className="grow">Call {site.phoneDisplay}</span></a>
        <a href={`mailto:${site.email}`}><span className="lead"><Icon name="bell" /></span><span className="grow">{site.email}</span></a>
      </div>

      <h2 className="section-title">Common questions</h2>
      <div className="stack">
        {faqs.map((f) => (
          <details className="faq" key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
        ))}
      </div>

      <h2 className="section-title">About {site.name}</h2>
      <p className="muted">{site.slogan}. We collect paper, plastic, glass and metal from your door every week so recycling is one less thing to think about.</p>
    </AppShell>
  );
}
