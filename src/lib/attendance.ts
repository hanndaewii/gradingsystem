// Attendance — the professor marks 'p' (present), 'a' (absent) or 'l' (late)
// per student and per period. The status is the source of truth; it is also
// encoded into the "Attendance" criterion's score so the class record and the
// gradebook stay in step.
import type { AttendanceStatus } from "../types";

/** The name of the criterion that carries the attendance score. */
export const ATTENDANCE_CRITERION = "Attendance";

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  p: "Present",
  a: "Absent",
  l: "Late",
};

export const ATTENDANCE_SHORT: Record<AttendanceStatus, string> = {
  p: "P",
  a: "A",
  l: "L",
};

/** Credit given for each status, as a fraction of the criterion's maximum. */
export const ATTENDANCE_CREDIT: Record<AttendanceStatus, number> = {
  p: 1,
  l: 0.75,
  a: 0,
};

/** The score an attendance mark is worth. */
export function attendanceScore(status: AttendanceStatus, maxScore: number): number {
  return Math.round(maxScore * ATTENDANCE_CREDIT[status] * 100) / 100;
}

/** Accepts p / a / l (or the full words) — anything else is null. */
export function parseAttendance(input: string): AttendanceStatus | null {
  const v = input.trim().toLowerCase();
  if (v === "p" || v === "present") return "p";
  if (v === "a" || v === "absent") return "a";
  if (v === "l" || v === "late") return "l";
  return null;
}

/** Finds the criterion that receives the attendance score (if it exists). */
export function findAttendanceCriterion<T extends { name: string }>(
  assessments: T[],
): T | undefined {
  return assessments.find(
    (a) => a.name.trim().toLowerCase() === ATTENDANCE_CRITERION.toLowerCase(),
  );
}
