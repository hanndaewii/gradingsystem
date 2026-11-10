// SectionsTable (WO-6) — the term's sections as a dense ledger table:
// Professor (serif), Course (mono code + serif title), Section (mono
// name + schedule), the four period cells, Class Average, Last Submit,
// and a plain link to the read-only section page. Rows sort by course
// code then section name; the sticky header rides under the app header;
// hairline row rules, mono numerals, no zebra. Read-only — no edit
// affordances anywhere.
import { Link } from "react-router-dom";
import type { PeriodId, SectionOverview } from "../../types";
import { PERIODS, PERIOD_SHORT } from "../../types";
import { formatPercent, formatDateTime } from "../../lib/format";
import { PeriodStatusCell } from "./PeriodStatusCell";

const COL_COUNT = 3 + PERIODS.length + 3;

export function SectionsTable({
  rows,
  activePeriod,
}: {
  rows: SectionOverview[];
  activePeriod: PeriodId | null;
}): JSX.Element {
  const cellActive = (period: PeriodId): string | undefined =>
    activePeriod === period ? "is-active" : undefined;

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
        {rows.length === 0 ? (
          <tr>
            <td className="adm-table__empty" colSpan={COL_COUNT}>
              No sections match the current filters.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.section.id}>
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
                <Link className="adm-table__open" to={`/sections/${row.section.id}`}>
                  Open
                </Link>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
