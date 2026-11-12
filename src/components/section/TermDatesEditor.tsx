// TermDatesEditor — each term's window in the school calendar.
//
// The attendance calendar follows these dates: a class date belongs to the
// first term whose window contains it, and the calendar jumps to the month
// the term opens in. The dates are the professor's, because the school
// calendar shifts from year to year.
import { useEffect, useState } from "react";
import { PERIODS, PERIOD_LABELS } from "../../types";
import type { AttendanceRow, PeriodId, TermDates } from "../../types";

export interface TermDatesEditorProps {
  termDates: TermDates;
  /** The attendance marks, so a term can be filled in from them. */
  rows: AttendanceRow[];
  readOnly: boolean;
  busy?: boolean;
  /** Save one term's window. The page checks what it would move first. */
  onSave(period: PeriodId, startDate: string | null, endDate: string | null): void;
}

export function TermDatesEditor({
  termDates,
  rows,
  readOnly,
  busy = false,
  onSave,
}: TermDatesEditorProps): JSX.Element {
  const [draft, setDraft] = useState<TermDates>(() => ({ ...termDates }));

  // The server's dates win whenever they arrive (or change).
  useEffect(() => {
    setDraft({ ...termDates });
  }, [termDates]);

  const set = (period: PeriodId, key: "startDate" | "endDate", value: string): void => {
    setDraft((prev) => ({
      ...prev,
      [period]: { ...prev[period], [key]: value === "" ? null : value },
    }));
  };

  /** The first and last day the professor marked in this term. */
  const markedRange = (period: PeriodId): { start: string; end: string } | null => {
    const days = rows.filter((r) => r.period === period).map((r) => r.sessionDate).sort();
    if (days.length === 0) return null;
    return { start: days[0], end: days[days.length - 1] };
  };

  const changed = (period: PeriodId): boolean =>
    draft[period]?.startDate !== termDates[period]?.startDate ||
    draft[period]?.endDate !== termDates[period]?.endDate;

  return (
    <div className="sec-termdates">
      <table className="sec-table sec-termdates__table">
        <thead>
          <tr>
            <th scope="col" className="mono-label">Term</th>
            <th scope="col" className="mono-label">Starts</th>
            <th scope="col" className="mono-label">Ends</th>
            <th scope="col" className="mono-label">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {PERIODS.map((period) => {
            const range = markedRange(period);
            return (
              <tr key={period}>
                <td>{PERIOD_LABELS[period]}</td>
                <td>
                  <input
                    type="date"
                    className="sec-termdates__date"
                    value={draft[period]?.startDate ?? ""}
                    disabled={readOnly || busy}
                    onChange={(e) => set(period, "startDate", e.target.value)}
                    aria-label={`${PERIOD_LABELS[period]} start date`}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    className="sec-termdates__date"
                    value={draft[period]?.endDate ?? ""}
                    disabled={readOnly || busy}
                    onChange={(e) => set(period, "endDate", e.target.value)}
                    aria-label={`${PERIOD_LABELS[period]} end date`}
                  />
                </td>
                <td className="sec-termdates__actions">
                  {range && !readOnly ? (
                    <button
                      type="button"
                      className="sec-att__link"
                      title={`Use ${range.start} – ${range.end}, the days you marked in this term`}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          [period]: { startDate: range.start, endDate: range.end },
                        }))
                      }
                    >
                      From marks
                    </button>
                  ) : null}
                  {!readOnly ? (
                    <button
                      type="button"
                      className="sec-cal__save sec-termdates__save"
                      disabled={busy || !changed(period)}
                      onClick={() =>
                        onSave(period, draft[period]?.startDate ?? null, draft[period]?.endDate ?? null)
                      }
                    >
                      Save
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="sec-termdates__hint mono-label">
        A class date belongs to the first term whose dates contain it. Leave a term empty to
        keep the marks you have already filed under it.
      </p>
    </div>
  );
}
