import AppShell from '@/components/AppShell';
import { binGuide } from '@/lib/site';

export default function Bins() {
  return (
    <AppShell title="Bins guide" back="/home">
      <p className="muted">Rinse containers and keep items dry. Put recyclables out before 07:00 on your collection day.</p>
      <div className="stack">
        {binGuide.map((g) => (
          <section className="card guide" key={g.title}>
            <h3>{g.title}</h3>
            <p className="yes"><b>Yes: </b>{g.yes}</p>
            <p className="no"><b>No: </b>{g.no}</p>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
