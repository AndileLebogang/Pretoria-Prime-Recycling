'use client';
import { useEffect, useState } from 'react';
import AppShell, { useUser } from '@/components/AppShell';
import { supabase } from '@/lib/supabase';
import { site, days, materials as allMaterials } from '@/lib/site';
import { longDate, nextPickupDate } from '@/lib/format';

const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

// A one-off "moved" date only counts while it is today or later.
function activeMove(f) {
  if (!f.moved_to) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = fromISO(f.moved_to);
  return d >= today ? d : null;
}
const nextDate = (f) => activeMove(f) || nextPickupDate(f.collection_day);

function ScheduleBody() {
  const user = useUser();
  const [form, setForm] = useState(null);
  const [state, setState] = useState({ status: 'idle', message: '' });
  const [view, setView] = useState('edit'); // 'edit' | 'confirmed' | 'schedule' | 'move'
  const [moveMode, setMoveMode] = useState('once'); // 'once' | 'weekly'
  const [moveDate, setMoveDate] = useState('');
  const [moveDay, setMoveDay] = useState(3);

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
        moved_to: row.moved_to ?? null,
      });
    })();
    return () => { on = false; };
  }, [user.id]);

  if (!form) return <p className="muted">Loading...</p>;

  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setState({ status: 'idle', message: '' }); };
  const toggleMaterial = (m) => set({ materials: form.materials.includes(m) ? form.materials.filter((x) => x !== m) : [...form.materials, m] });
  const dayName = days.find((d) => d.n === form.collection_day).long;
  const go = (v) => { setState({ status: 'idle', message: '' }); setView(v); };

  function openMove() {
    setMoveMode('once');
    setMoveDate('');
    setMoveDay(form.collection_day);
    go('move');
  }

  // Upcoming collection dates the person can move to (next two weeks), minus the current one.
  function moveOptions() {
    const current = toISO(new Date(nextDate(form)));
    const seen = new Set();
    const out = [];
    days.forEach((d) => {
      const base = new Date(nextPickupDate(d.n));
      [0, 7].forEach((add) => {
        const x = new Date(base);
        x.setDate(x.getDate() + add);
        const k = toISO(x);
        if (k !== current && !seen.has(k)) { seen.add(k); out.push(x); }
      });
    });
    return out.sort((a, b) => a - b);
  }

  async function save() {
    setState({ status: 'saving', message: '' });
    const { error } = await supabase.from('pickup_schedules').upsert({
      user_id: user.id, ...form, moved_to: null, address: form.address.trim(), notes: form.notes.trim() || null, updated_at: new Date().toISOString(),
    });
    if (error) { setState({ status: 'error', message: 'We could not save your pickup. Please try again.' }); return; }
    setForm((f) => ({ ...f, moved_to: null }));
    if (form.weekly) {
      setState({ status: 'idle', message: '' });
      setView('confirmed');
    } else {
      setState({ status: 'done', message: 'Weekly collection is switched off.' });
    }
  }

  async function saveMove() {
    const payload = moveMode === 'once'
      ? { moved_to: moveDate }
      : { collection_day: moveDay, moved_to: null };
    setState({ status: 'saving', message: '' });
    const { error } = await supabase.from('pickup_schedules')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (error) { setState({ status: 'error', message: 'We could not move your pickup. Please try again.' }); return; }
    const updated = { ...form, ...payload };
    setForm(updated);
    setState({
      status: 'done',
      message: moveMode === 'once'
        ? `Your next pickup has moved to ${longDate(fromISO(moveDate))}.`
        : `Your weekly pickup is now every ${days.find((d) => d.n === moveDay).long}. Next collection is ${longDate(nextPickupDate(moveDay))}.`,
    });
    setView('schedule');
  }

  if (view === 'confirmed') {
    return (
      <div className="form" style={{ gap: '1.2rem' }}>
        <div className="notice notice-ok" role="status">
          <b>Pickup confirmed</b>
          <p style={{ margin: '0.3rem 0 0' }}>Your next collection is {longDate(nextDate(form))}, {site.collectionWindow}.</p>
        </div>
        <div className="stack">
          <button type="button" className="btn" onClick={() => go('schedule')}>View my schedule</button>
          <button type="button" className="btn btn-outline" onClick={openMove}>Move my pickup</button>
          <a className="btn btn-outline" href="/home">Back to home</a>
        </div>
      </div>
    );
  }

  if (view === 'schedule') {
    const moved = activeMove(form);
    return (
      <div className="form" style={{ gap: '1.2rem' }}>
        {state.status === 'done' && <div className="notice notice-ok" role="status">{state.message}</div>}
        <section className="plan-card" aria-label="Your scheduled pickup">
          <small>Next pickup</small>
          <h2>{longDate(nextDate(form))}</h2>
          <p>{site.collectionWindow}</p>
          <span className="pill">{moved ? 'Moved for this week' : form.weekly ? `Every ${dayName}` : 'Weekly collection off'}</span>
        </section>
        <div className="card">
          <dl className="kv">
            <dt>Repeats</dt><dd>{form.weekly ? `Every ${dayName}` : 'Switched off'}</dd>
            <dt>Recycling</dt><dd>{form.materials.length ? form.materials.join(', ') : 'None selected'}</dd>
            <dt>Address</dt><dd>{form.address}</dd>
            {form.notes && (<><dt>Notes</dt><dd>{form.notes}</dd></>)}
          </dl>
        </div>
        <div className="stack">
          <button type="button" className="btn" onClick={openMove}>Move my pickup</button>
          <button type="button" className="btn btn-outline" onClick={() => go('edit')}>Edit pickup details</button>
          <a className="btn btn-outline" href="/home">Back to home</a>
        </div>
      </div>
    );
  }

  if (view === 'move') {
    const options = moveOptions();
    const cannotSave = state.status === 'saving' || (moveMode === 'once' ? !moveDate : moveDay === form.collection_day);
    return (
      <div className="form" style={{ gap: '1.4rem' }}>
        <p className="muted small" style={{ margin: 0 }}>Your next pickup is {longDate(nextDate(form))}.</p>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="section-title" style={{ marginTop: 0, padding: 0 }}>What would you like to move?</legend>
          <div className="stack">
            <label className="check">
              <input type="radio" name="moveMode" checked={moveMode === 'once'} onChange={() => setMoveMode('once')} />
              Only my next pickup
            </label>
            <label className="check">
              <input type="radio" name="moveMode" checked={moveMode === 'weekly'} onChange={() => setMoveMode('weekly')} />
              My pickup every week
            </label>
          </div>
        </fieldset>

        {moveMode === 'once' ? (
          <label className="field">Move to
            <select value={moveDate} onChange={(e) => { setMoveDate(e.target.value); setState({ status: 'idle', message: '' }); }}>
              <option value="">Choose a date</option>
              {options.map((x) => <option key={toISO(x)} value={toISO(x)}>{longDate(x)}</option>)}
            </select>
          </label>
        ) : (
          <div>
            <div className="section-title" style={{ marginTop: 0 }}>New collection day</div>
            <div className="days" role="group" aria-label="New collection day">
              {days.map((d) => (
                <button key={d.n} type="button" className="day" aria-pressed={moveDay === d.n} aria-label={d.long} onClick={() => { setMoveDay(d.n); setState({ status: 'idle', message: '' }); }}>{d.short}</button>
              ))}
            </div>
          </div>
        )}

        {state.status === 'error' && <div className="notice notice-error" role="alert">{state.message}</div>}
        <div className="stack">
          <button className="btn" onClick={saveMove} disabled={cannotSave}>
            {state.status === 'saving' ? 'Saving...' : 'Confirm move'}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => go('schedule')} disabled={state.status === 'saving'}>Cancel</button>
        </div>
      </div>
    );
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