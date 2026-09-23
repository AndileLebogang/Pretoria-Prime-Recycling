const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// "2026-07-30" -> local Date (avoids timezone shifting the day)
export const parseDate = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const rand = (n, decimals = false) =>
  'R' + Number(n).toLocaleString('en-ZA', { minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: 2 }).replace(/\s/g, ' ');

export const longDate = (d) => `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
export const shortDate = (s) => { const d = typeof s === 'string' ? parseDate(s) : s; return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`; };
export const fullShortDate = (s) => { const d = typeof s === 'string' ? parseDate(s) : s; return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

// Next collection date for an ISO weekday (1 = Mon ... 7 = Sun).
export function nextPickupDate(day, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const todayIso = ((d.getDay() + 6) % 7) + 1;
  let diff = (day - todayIso + 7) % 7;
  if (diff === 0 && from.getHours() >= 9) diff = 7; // today's window has passed
  d.setDate(d.getDate() + diff);
  return d;
}

export function timeAgo(iso) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days < 7 ? `${days}d ago` : `${Math.round(days / 7)}w ago`;
}

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
