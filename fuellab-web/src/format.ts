// Friendly date labels for YYYY-MM-DD strings (parsed as local dates, never UTC).
import { addDays } from '@fuellab/shared';

function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "Thursday, Nov 13" */
export function longDate(iso: string): string {
  return parse(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

/** "Nov 13" */
export function shortDate(iso: string): string {
  return parse(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** "Nov 10 – 16" or "Oct 27 – Nov 2" for a Monday week start. */
export function weekRange(weekStart: string): string {
  const a = parse(weekStart);
  const b = parse(addDays(weekStart, 6));
  const startLabel = shortDate(weekStart);
  const endLabel = a.getMonth() === b.getMonth() ? String(b.getDate()) : shortDate(addDays(weekStart, 6));
  return `${startLabel} – ${endLabel}`;
}

/** "Today", "Yesterday", "Tomorrow" or the weekday name, relative to `today`. */
export function relativeDay(iso: string, today: string): string {
  if (iso === today) return 'Today';
  if (iso === addDays(today, -1)) return 'Yesterday';
  if (iso === addDays(today, 1)) return 'Tomorrow';
  return parse(iso).toLocaleDateString(undefined, { weekday: 'long' });
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
