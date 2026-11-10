// Pure formatting helpers (spec §3.4) + the pinned default grading scale (§3.5).
import { scaleLookup } from "./grades";
import type { ScaleRow, Section, Term } from "../types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const DAY_MS = 86_400_000;

/** "87.5%" | "88%" — at most 1 decimal, trailing .0 trimmed. */
export function formatPercent(pct: number): string {
  const rounded = Math.round(pct * 10) / 10;
  const s = rounded.toFixed(1);
  return `${s.endsWith(".0") ? s.slice(0, -2) : s}%`;
}

/** Always 2 decimals: "1.75". */
export function formatScale5(v: number): string {
  return v.toFixed(2);
}

/** "87.5% · B+" | "1.75" | "—" (uses the section's own scale + display mode). */
export function formatGrade(pct: number | null, section: Pick<Section, "displayScale" | "scaleTable">): string {
  if (pct == null) return "—";
  const row = scaleLookup(section.scaleTable, pct);
  if (section.displayScale === "scale5") return formatScale5(row.grade5);
  return `${formatPercent(pct)} · ${row.letter}`;
}

/** Clamp a score into [0, maxScore]. */
export function clampScore(v: number, maxScore: number): number {
  return Math.min(maxScore, Math.max(0, v));
}

/** Blank → null (clears); unparseable non-empty → "invalid"; else the number. */
export function parseScoreInput(raw: string): number | null | "invalid" {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return "invalid";
  return n;
}

/** "Mar 12, 2026" */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "Mar 12, 2026 · 09:14" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(iso)} · ${hh}:${mm}`;
}

/** "today" | "1 day ago" | "3 days ago" | "Mar 12, 2026" (beyond a week). */
export function relativeDay(iso: string, now?: number): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const n = now ?? Date.now();
  const a = new Date(t);
  a.setHours(0, 0, 0, 0);
  const b = new Date(n);
  b.setHours(0, 0, 0, 0);
  const diff = Math.round((b.getTime() - a.getTime()) / DAY_MS);
  if (diff <= 0) return "today";
  if (diff === 1) return "1 day ago";
  if (diff <= 7) return `${diff} days ago`;
  return formatDate(iso);
}

/** True when the timestamp falls within the last `days` days (D9: last 7). */
export function isWithinLastDays(iso: string | null, days: number, now?: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const n = now ?? Date.now();
  return t <= n + 60_000 && n - t <= days * DAY_MS;
}

export function todayISO(): string {
  return new Date().toISOString();
}

export function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

/** (AY−1, 2nd Sem) for semester 1; (same AY, 1st Sem) for semester 2. */
export function prevTerm(term: Term): Term {
  const start = Number(term.academicYear.slice(0, 4));
  if (term.semester === 1) {
    return { academicYear: Number.isFinite(start) ? `${start - 1}-${start}` : term.academicYear, semester: 2 };
  }
  return { academicYear: term.academicYear, semester: 1 };
}

/** "1st Sem · 2025-2026" */
export function termLabel(term: Term): string {
  return `${term.semester === 1 ? "1st" : "2nd"} Sem · ${term.academicYear}`;
}

/** n === 1 ? one : many (default many = one + "s"). */
export function plural(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many;
}

/**
 * Default grading scale (§3.5), stored sorted descending by minPct:
 * 97 → A+ 1.00 | 94 → A 1.25 | 92 → A- 1.50 | 89 → B+ 1.75 | 86 → B 2.00 |
 * 83 → B- 2.25 | 80 → C+ 2.50 | 77 → C 2.75 | 74 → C- 3.00 | 71 → D+ 3.25 |
 * 68 → D 3.50 | 65 → D- 3.75 | 0 → F 5.00
 */
export const DEFAULT_SCALE_TABLE: ScaleRow[] = [
  { minPct: 97, letter: "A+", grade5: 1.0 },
  { minPct: 94, letter: "A", grade5: 1.25 },
  { minPct: 92, letter: "A-", grade5: 1.5 },
  { minPct: 89, letter: "B+", grade5: 1.75 },
  { minPct: 86, letter: "B", grade5: 2.0 },
  { minPct: 83, letter: "B-", grade5: 2.25 },
  { minPct: 80, letter: "C+", grade5: 2.5 },
  { minPct: 77, letter: "C", grade5: 2.75 },
  { minPct: 74, letter: "C-", grade5: 3.0 },
  { minPct: 71, letter: "D+", grade5: 3.25 },
  { minPct: 68, letter: "D", grade5: 3.5 },
  { minPct: 65, letter: "D-", grade5: 3.75 },
  { minPct: 0, letter: "F", grade5: 5.0 },
];
