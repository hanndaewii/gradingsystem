// AttendancePanel — the professor marks 'p' (present), 'a' (absent) or
// 'l' (late) for every student in every period (Prelim → Finals). Each mark
// is also encoded into the section's "Attendance" criterion score, so the
// class record and the gradebook always agree.
import { useState } from "react";
import { PERIODS, PERIOD_LABELS } from "../../types";
import type { AttendanceRow, AttendanceStatus, PeriodId, Student } from "../../types";
import { ATTENDANCE_LABEL, parseAttendance } from "../../lib/attendance";
import { cx } from "./cx";

export interface AttendancePanelProps {
  students: Student[];
  rows: AttendanceRow[];
  readOnly: boolean;
  /** Writes one mark; the parent reloads the list afterwards. */
  onSet(period: PeriodId, studentRowId: string, status: AttendanceStatus | null): Promise<void>;
  /** Marks a whole period present in one go. */
  onSetMany(period: PeriodId, entries: { studentRowId: string; status: AttendanceStatus }[]): Promise<void>;
}

const cellId = (period: PeriodId, studentRowId: string): string => `sec-att-${period}-${studentRowId}`;

export function AttendancePanel({
  students,
  rows,
  readOnly,
  onSet,
  onSetMany,
}: AttendancePanelProps): JSX.Element {
  const [busy, setBusy] = useState(false);

  const statusFor = (period: PeriodId, studentRowId: string): AttendanceStatus | null => {
    const row = rows.find(
      (r) => r.period === period && r.studentRowId === studentRowId,
    );
    return row ? row.status : null;
  };

  const countsFor = (period: PeriodId): { p: number; a: number; l: number } => {
    let p = 0;
    let a = 0;
    let l = 0;
    for (const row of rows) {
      if (row.period !== period) continue;
      if (row.status === "p") p += 1;
      else if (row.status === "a") a += 1;
      else if (row.status === "l") l += 1;
    }
    return { p, a, l };
  };

  function focusNext(period: PeriodId, studentRowId: string): void {
    const index = students.findIndex((s) => s.id === studentRowId);
    const next = students[index + 1];
    if (!next) return;
    document.getElementById(cellId(period, next.id))?.focus();
  }

  async function handleType(
    period: PeriodId,
    studentRowId: string,
    raw: string,
  ): Promise<void> {
    const parsed = parseAttendance(raw);
    setBusy(true);
    try {
      await onSet(period, studentRowId, parsed);
      if (parsed !== null) focusNext(period, studentRowId);
    } finally {
      setBusy(false);
    }
  }

  async function markAllPresent(period: PeriodId): Promise<void> {
    setBusy(true);
    try {
      const entries = students
        .filter((s) => statusFor(period, s.id) !== "p")
        .map((s) => ({ studentRowId: s.id, status: "p" as AttendanceStatus }));
      if (entries.length > 0) await onSetMany(period, entries);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sec-att">
      <p className="sec-att__hint mono-label">
        Type P (present) · A (absent) · L (late) — each mark updates the Attendance criterion
      </p>

      <div className="sec-tablewrap">
        <table className="sec-table sec-att__table">
          <thead>
            <tr>
              <th scope="col" className="sec-table__name mono-label">
                Student
              </th>
              {PERIODS.map((period) => {
                const counts = countsFor(period);
                return (
                  <th key={period} scope="col" className="sec-att__period">
                    <span className="sec-att__periodname">{PERIOD_LABELS[period]}</span>
                    <span className="sec-att__counts num">
                      {counts.p}P · {counts.a}A · {counts.l}L
                    </span>
                    {!readOnly ? (
                      <button
                        type="button"
                        className="sec-att__all"
                        disabled={busy}
                        onClick={() => void markAllPresent(period)}
                      >
                        All present
                      </button>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td className="sec-table__name">{student.name}</td>
                {PERIODS.map((period) => {
                  const status = statusFor(period, student.id);
                  return (
                    <td key={period} className="sec-att__cell">
                      <input
                        id={cellId(period, student.id)}
                        className={cx("sec-att__input", status && `is-${status}`)}
                        defaultValue={status ?? ""}
                        key={`${period}-${student.id}`}
                        maxLength={1}
                        disabled={readOnly || busy}
                        autoComplete="off"
                        inputMode="text"
                        aria-label={`${student.name} — ${PERIOD_LABELS[period]} attendance`}
                        title={status ? ATTENDANCE_LABEL[status] : "Not marked"}
                        onChange={(e) => void handleType(period, student.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            focusNext(period, student.id);
                          }
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {students.length === 0 ? (
        <p className="sec-att__none">Add students to the roster first, then mark their attendance.</p>
      ) : null}
    </div>
  );
}
