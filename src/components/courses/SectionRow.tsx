// SectionRow (WO-4) — one row per section on the course page: name +
// schedule + room (mono), a 4-segment ProgressSegments bar (§3.7 mapping
// verbatim) with per-period StatusPills, the class average via formatGrade
// with the section's own scale, an "Open" link, and a Menu with
// Edit/Delete section (section write-ownership lives here — D17).
import { Link } from "react-router-dom";
import { PERIOD_LABELS, PERIOD_SHORT } from "../../types";
import { formatDateTime, formatGrade, plural } from "../../lib/format";
import type { SectionOverview } from "../../types";
import { Menu, ProgressSegments, StatusPill } from "../ui";
import type { ProgressSegment } from "../ui";

export interface SectionRowProps {
  overview: SectionOverview;
  onEdit(): void;
  onDelete(): void;
}

/** §3.7 mapping — verbatim. */
function segmentsFor(periods: SectionOverview["periods"]): ProgressSegment[] {
  return periods.map((p) => ({
    key: p.period,
    label: PERIOD_SHORT[p.period],
    ratio: p.totalCells === 0 ? 0 : p.gradedCells / p.totalCells,
    state: p.status,
  }));
}

export default function SectionRow({ overview, onEdit, onDelete }: SectionRowProps): JSX.Element {
  const { section, periods, classAverage, studentCount } = overview;
  return (
    <article className="prof-row">
      <div className="prof-row__top">
        <Link className="prof-row__name" to={`/sections/${section.id}`}>
          {section.name}
        </Link>
        <span className="prof-row__sched num">
          {section.schedule}
          {section.room ? ` · ${section.room}` : ""}
        </span>
        <span className="prof-row__students num">
          {studentCount} {plural(studentCount, "student")}
        </span>
        <span className="prof-row__spacer" />
        <Link className="prof-row__open" to={`/sections/${section.id}`}>
          Open
        </Link>
        <Menu
          ariaLabel={`Section actions for ${section.name}`}
          items={[
            { key: "edit", label: "Edit section", onSelect: onEdit },
            { key: "delete", label: "Delete section", tone: "danger", onSelect: onDelete },
          ]}
        />
      </div>

      <div className="prof-row__progress">
        <ProgressSegments segments={segmentsFor(periods)} size="sm" />
        <div className="prof-row__pills">
          {periods.map((p) => {
            const tone =
              p.status === "approved"
                ? "approved"
                : p.status === "submitted"
                  ? "done"
                  : p.status === "draft"
                    ? "progress"
                    : "neutral";
            const title = `${PERIOD_LABELS[p.period]}: ${p.status.replace("_", " ")} - ${p.gradedCells}/${p.totalCells} entries graded${
              p.approvedAt
                ? ` · approved ${formatDateTime(p.approvedAt)}`
                : p.submittedAt
                  ? ` · submitted ${formatDateTime(p.submittedAt)}`
                  : ""
            }`;
            return <StatusPill key={p.period} tone={tone} label={PERIOD_SHORT[p.period]} title={title} />;
          })}
        </div>
        <div className="prof-row__avg">
          <span className="mono-label">Class average</span>
          <span className="prof-row__avg-value num">{formatGrade(classAverage, section)}</span>
        </div>
      </div>
    </article>
  );
}
