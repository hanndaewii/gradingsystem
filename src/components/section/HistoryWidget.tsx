// HistoryWidget — newest-first edit history (spec step 12, D13): relative
// time, kind·period tags, a period filter, a "Show older" limit control, and
// clickable "85 → 92" chips on grade entries (only while the traced cell
// still exists; removed targets render as text with a note).
import { useMemo, useState } from "react";
import { Button, Select } from "../../components/ui";
import { PERIODS, PERIOD_LABELS } from "../../types";
import type { HistoryEntry, PeriodId } from "../../types";
import { formatDateTime, relativeDay } from "../../lib/format";

export interface HistoryWidgetProps {
  entries: HistoryEntry[];
  /** Click a grade row → trace it in the gradebook. */
  onTrace(entry: HistoryEntry): void;
  /** False when the entry's assessment/student row no longer exists. */
  cellExists(entry: HistoryEntry): boolean;
}

const KIND_LABEL: Record<HistoryEntry["kind"], string> = {
  grade: "Grade",
  submit: "Submitted",
  reopen: "Reopened",
  import: "CSV import",
};

const INITIAL_LIMIT = 12;
const PAGE = 24;

const transition = (e: HistoryEntry): string => `${e.oldScore ?? "—"} → ${e.newScore ?? "—"}`;

export function HistoryWidget({ entries, onTrace, cellExists }: HistoryWidgetProps): JSX.Element {
  const [filter, setFilter] = useState<PeriodId | "all">("all");
  const [limit, setLimit] = useState(INITIAL_LIMIT);

  const filtered = useMemo(
    () => (filter === "all" ? entries : entries.filter((e) => e.period === filter)),
    [entries, filter],
  );
  const visible = filtered.slice(0, limit);

  return (
    <div className="sec-history">
      <div className="sec-history__toolbar">
        <label className="mono-label" htmlFor="sec-history-filter">
          Period
        </label>
        <Select
          id="sec-history-filter"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as PeriodId | "all");
            setLimit(INITIAL_LIMIT);
          }}
        >
          <option value="all">All periods</option>
          {PERIODS.map((p) => (
            <option key={p} value={p}>
              {PERIOD_LABELS[p]}
            </option>
          ))}
        </Select>
        <span className="sec-history__count mono-label">
          Showing {visible.length} of {filtered.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="sec-history__empty">No history {filter === "all" ? "yet" : `for ${PERIOD_LABELS[filter]}`}.</p>
      ) : (
        <ul className="sec-history__list">
          {visible.map((e) => {
            const traceable = e.kind === "grade" && cellExists(e);
            return (
              <li key={e.id} className="sec-history__row">
                <span className="sec-history__time num" title={formatDateTime(e.at)}>
                  {relativeDay(e.at)}
                </span>
                <span className="sec-history__tag mono-label">
                  {KIND_LABEL[e.kind]}
                  {e.period ? ` · ${PERIOD_LABELS[e.period]}` : ""}
                </span>
                <span className="sec-history__body">
                  {e.kind === "grade" ? (
                    traceable ? (
                      <button type="button" className="sec-history__trace num" title="Show this change in the gradebook" onClick={() => onTrace(e)}>
                        {transition(e)}
                      </button>
                    ) : (
                      <span className="sec-history__removed num" title="The assessment or student row was removed">
                        {transition(e)} <span className="mono-label">removed</span>
                      </span>
                    )
                  ) : (
                    <span className="sec-history__detail">{e.detail ?? "—"}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > limit ? (
        <div className="sec-history__older">
          <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
            Show older
          </Button>
        </div>
      ) : null}
    </div>
  );
}
