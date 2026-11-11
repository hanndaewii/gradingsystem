// Calendar helpers — local-time date maths for the attendance calendar.
// Dates are handled as plain `YYYY-MM-DD` strings so they match the
// `date` columns in Postgres without any timezone drift.

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const WEEKDAY_NAMES = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

/** Single-letter weekday initials, Monday first (the PH school week). */
export const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

/** `YYYY-MM-DD` for a local Date (never UTC — `toISOString` would shift it). */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** A local Date from a `YYYY-MM-DD` string. */
export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(iso: string): number {
  return (parseIsoDate(iso).getDay() + 6) % 7;
}

/** Every day of the month as `YYYY-MM-DD`. */
export function daysInMonth(year: number, month: number): string[] {
  const out: string[] = [];
  const count = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= count; d += 1) out.push(isoDate(new Date(year, month, d)));
  return out;
}

/** "September 2025" */
export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month] ?? ""} ${year}`;
}

/** "Wed, 3 September 2025" */
export function longDate(iso: string): string {
  const d = parseIsoDate(iso);
  return `${WEEKDAY_NAMES[weekdayIndex(iso)].slice(0, 3)}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/** The day number of a `YYYY-MM-DD` string. */
export function dayNumber(iso: string): number {
  return parseIsoDate(iso).getDate();
}
