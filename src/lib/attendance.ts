// Attendance — the professor marks 'p' (present), 'a' (absent) or 'l' (late)
// for every student on every class date of the month. The status is the
// source of truth; it is also encoded into the "Attendance" criterion's score
// so the class record and the gradebook stay in step.
import type { AttendanceStatus } from "../types";

/** The name of the criterion that carries the attendance score. */
export const ATTENDANCE_CRITERION = "Attendance";

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  p: "Present",
  a: "Absent",
  l: "Late",
};

/** Credit given for each status, as a fraction of the criterion's maximum. */
export const ATTENDANCE_CREDIT: Record<AttendanceStatus, number> = {
  p: 1,
  l: 0.75,
  a: 0,
};

/**
 * The Attendance criterion's score for a whole period: the average credit the
 * student earned across every class date marked in that period. No marks yet
 * means no score (null), so an unmarked student never silently scores zero.
 */
export function attendanceTotalScore(
  statuses: AttendanceStatus[],
  maxScore: number,
): number | null {
  if (statuses.length === 0) return null;
  const total = statuses.reduce((sum, s) => sum + ATTENDANCE_CREDIT[s], 0);
  return Math.round((total / statuses.length) * maxScore * 100) / 100;
}

/** Accepts p / a / l (or the full words) — anything else is null. */
export function parseAttendance(input: string): AttendanceStatus | null {
  const v = input.trim().toLowerCase();
  if (v === "p" || v === "present") return "p";
  if (v === "a" || v === "absent") return "a";
  if (v === "l" || v === "late") return "l";
  return null;
}
