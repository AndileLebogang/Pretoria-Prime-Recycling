'use client';
import { useEffect, useState } from 'react';
import AppShell, { useUser } from '@/components/AppShell';
import { supabase } from '@/lib/supabase';
import { site, days, materials as allMaterials } from '@/lib/site';
import { longDate, nextPickupDate } from '@/lib/format';

function ScheduleBody() {
  const user = useUser();
  const [form, setForm] = useState(null);
  const [state, setState] = useState({ status: 'idle', message: '' });

  useEffect(() => {
    let on = true;
    (async () => {
      const [s, p] = await Promise.all([
        supabase.from('pickup_schedules').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('address').eq('id', user.id).maybeSingle(),
      ]);
      if (!on) return;
      const row = s.data || {};
      setForm({
        weekly: row.weekly ?? true,
        collection_day: row.collection_day ?? 3,
        materials: row.materials ?? [],
        address: row.address || p.data?.address || '',
        notes: row.notes || '',
      });
    })();
    return () => { on = false; };
  }, [user.id]);

  if (!form) return <p className="muted">Loading...</p>;

  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setState({ status: 'idle', message: '' }); };
  const toggleMaterial = (m) => set({ materials: form.materials.includes(m) ? form.materials.filter((x) => x !== m) : [...form.materials, m] });
  const dayName = days.find((d) => d.n === form.collection_day).long;

  async function save() {
    setState({ status: 'saving', message: '' });
    const { error } = await supabase.from('pickup_schedules').upsert({
      user_id: user.id, ...form, address: form.address.trim(), notes: form.notes.trim() || null, updated_at: new Date().toISOString(),
    });
    if (error) { setState({ status: 'error', message: 'We could not save your pickup. Please try again.' }); return; }
    setState({
      status: 'done',
      message: form.weekly ? `Pickup confirmed. Your next collection is ${longDate(nextPickupDate(form.collection_day))}.` : 'Weekly collection is switched off.',
    });
  }

  return (
    <div className="form" style={{ gap: '1.4rem' }}>
      <div className="switch-row">
        <div>
          <b>Weekly collection</b>
          <span className="muted small">{form.weekly ? `Every ${dayName}, ${site.collectionWindow}` : 'Switched off'}</span>
        </div>
        <button type="button" className="switch" role="switch" aria-checked={form.weekly} aria-label="Weekly collection" onClick={() => set({ weekly: !form.weekly })} />
      </div>

      <div>
        <div className="section-title" style={{ marginTop: 0 }}>Select collection day</div>
        <div className="days" role="group" aria-label="Collection day">
          {days.map((d) => (
            <button key={d.n} type="button" className="day" aria-pressed={form.collection_day === d.n} aria-label={d.long} onClick={() => set({ collection_day: d.n })}>{d.short}</button>
          ))}
        </div>
      </div>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="section-title" style={{ marginTop: 0, padding: 0 }}>What are you recycling?</legend>
        <div className="stack">
          {allMaterials.map((m) => (
            <label className="check" key={m}>
              <input type="checkbox" checked={form.materials.includes(m)} onChange={() => toggleMaterial(m)} />{m}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">Pickup address
        <input value={form.address} onChange={(e) => set({ address: e.target.value })} required />
      </label>
      <label className="field">Notes for collector (optional)
        <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Gate code, where to find the bags..." />
      </label>

      {state.status === 'done' && <div className="notice notice-ok" role="status">{state.message}</div>}
      {state.status === 'error' && <div className="notice notice-error" role="alert">{state.message}</div>}
      <button className="btn" onClick={save} disabled={state.status === 'saving' || !form.address.trim()}>
        {state.status === 'saving' ? 'Saving...' : 'Confirm pickup'}
      </button>
    </div>
  );
}

export default function Schedule() {
  return <AppShell title="Schedule pickup" back="/home"><ScheduleBody /></AppShell>;
}
