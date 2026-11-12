// SectionsTable (WO-6) — the term's sections as a dense ledger table:
// Professor (serif), Course (mono code + serif title), Section (mono
// name + schedule), the four period cells, Class Average, Last Submit,
// and a plain link to the read-only section page. Rows sort by course
// code then section name; the sticky header rides under the app header;
// hairline row rules, mono numerals, no zebra. Read-only — no edit
// affordances anywhere.
import { Link, useNavigate } from "react-router-dom";
import type { PeriodId, SectionOverview } from "../../types";
import { PERIODS, PERIOD_SHORT } from "../../types";
import { formatPercent, formatDateTime } from "../../lib/format";
import { Button, EmptyState } from "../ui";
import { PeriodStatusCell } from "./PeriodStatusCell";

export function SectionsTable({
  rows,
  activePeriod,
  onClearFilters,
}: {
  rows: SectionOverview[];
  activePeriod: PeriodId | null;
  /** Shown by the empty state so a dead end is never a dead end. */
  onClearFilters?: () => void;
}): JSX.Element {
  const navigate = useNavigate();
  const cellActive = (period: PeriodId): string | undefined =>
    activePeriod === period ? "is-active" : undefined;

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No sections match these filters"
        body="Nothing in this term matches the professor, course or period you picked."
        action={
          onClearFilters ? (
            <Button variant="secondary" onClick={onClearFilters}>
              Clear filters
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <table className="adm-table">
      <thead>
        <tr>
          <th scope="col" className="adm-table__cell-prof">
            Professor
          </th>
          <th scope="col" className="adm-table__cell-course">
            Course
          </th>
          <th scope="col" className="adm-table__cell-section">
            Section
          </th>
          {PERIODS.map((p) => (
            <th scope="col" key={p} className={`adm-table__cell-period ${cellActive(p) ?? ""}`.trim()}>
              {PERIOD_SHORT[p]}
            </th>
          ))}
          <th scope="col">Class avg</th>
          <th scope="col">Last submit</th>
          <th scope="col">Open</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
            <tr
              key={row.section.id}
              className="adm-table__row"
              onClick={() => navigate(`/sections/${row.section.id}`)}
            >
              <td className="adm-table__cell-prof">{row.professorName}</td>
              <td className="adm-table__cell-course">
                <span className="adm-table__code">{row.course.code}</span>
                <div className="adm-table__title">{row.course.title}</div>
              </td>
              <td className="adm-table__cell-section">
                <span className="adm-table__sec-name">{row.section.name}</span>
                <div className="adm-table__sec-meta">
                  {row.section.schedule}
                  {row.section.room ? ` · ${row.section.room}` : ""}
                </div>
              </td>
              {row.periods.map((p) => (
                <td key={p.period} className={`adm-table__cell-period ${cellActive(p.period) ?? ""}`.trim()}>
                  <PeriodStatusCell progress={p} />
                </td>
              ))}
              <td className="adm-table__cell-avg">
                {row.classAverage != null ? (
                  <span className="adm-table__num">{formatPercent(row.classAverage)}</span>
                ) : (
                  <span className="adm-table__none">—</span>
                )}
              </td>
              <td className="adm-table__cell-last">
                {row.lastSubmitAt != null ? (
                  <span className="adm-table__num">{formatDateTime(row.lastSubmitAt)}</span>
                ) : (
                  <span className="adm-table__none">—</span>
                )}
              </td>
              <td>
                <Link
                  className="adm-table__open"
                  to={`/sections/${row.section.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  Open
                </Link>
              </td>
            </tr>
        ))}
      </tbody>
    </table>
  );
}
