// CourseCard (WO-4) — one card per course on the professor home grid:
// code + title (serif), a hairline list of its sections (name, schedule
// in mono) each with a 4-segment ProgressSegments row (§3.7 mapping
// verbatim) + a StatusPill summary, "Add section", and a Menu with
// Edit course / Delete course.
import { Link } from "react-router-dom";
import { PERIOD_LABELS, PERIOD_SHORT } from "../../types";
import type { Course, PeriodProgress } from "../../types";
import { plural } from "../../lib/format";
import type { SectionOverview } from "../../types";
import { Button, Menu, ProgressSegments, StatusPill } from "../ui";
import type { ProgressSegment, StatusPillProps } from "../ui";

export interface CourseCardProps {
  course: Course;
  /** Overview rows (one per section) for this course, sorted by section name. */
  sections: SectionOverview[];
  onAddSection(): void;
  onEditCourse(): void;
  onDeleteCourse(): void;
}

/** §3.7 mapping — verbatim. */
function segmentsFor(periods: PeriodProgress[]): ProgressSegment[] {
  return periods.map((p) => ({
    key: p.period,
    label: PERIOD_SHORT[p.period],
    ratio: p.totalCells === 0 ? 0 : p.gradedCells / p.totalCells,
    state: p.status,
  }));
}

/** One summary pill for a whole section across its four periods. */
function summaryFor(periods: PeriodProgress[]): { tone: StatusPillProps["tone"]; label: string; title: string } {
  const title = periods
    .map((p) => {
      const cells = `${p.gradedCells}/${p.totalCells}`;
      if (p.status === "submitted") return `${PERIOD_LABELS[p.period]}: submitted`;
      if (p.status === "draft") return `${PERIOD_LABELS[p.period]}: draft — ${cells} entries graded`;
      return `${PERIOD_LABELS[p.period]}: not started`;
    })
    .join(" · ");
  const submitted = periods.filter((p) => p.status === "submitted").length;
  if (submitted === periods.length && periods.length > 0) {
    return { tone: "done", label: "Complete", title };
  }
  if (periods.some((p) => p.status === "draft")) {
    const graded = periods.reduce((acc, p) => acc + p.gradedCells, 0);
    const total = periods.reduce((acc, p) => acc + p.totalCells, 0);
    return { tone: "progress", label: `In progress · ${graded}/${total}`, title };
  }
  return { tone: "neutral", label: "Not started", title };
}

export default function CourseCard({ course, sections, onAddSection, onEditCourse, onDeleteCourse }: CourseCardProps): JSX.Element {
  return (
    <article className="prof-card">
      <header className="prof-card__head">
        <div className="prof-card__names">
          <span className="prof-card__code num">{course.code}</span>
          <h3 className="prof-card__title">{course.title}</h3>
        </div>
        <Menu
          ariaLabel={`Course actions for ${course.code}`}
          items={[
            { key: "edit", label: "Edit course", onSelect: onEditCourse },
            { key: "delete", label: "Delete course", tone: "danger", onSelect: onDeleteCourse },
          ]}
        />
      </header>

      {sections.length === 0 ? (
        <p className="prof-card__nosections num">No sections yet.</p>
      ) : (
        <div className="prof-card__sections">
          {sections.map((row) => {
            const summary = summaryFor(row.periods);
            return (
              <div key={row.section.id} className="prof-card__section">
                <div className="prof-card__section-line">
                  <Link className="prof-card__section-name" to={`/sections/${row.section.id}`}>
                    {row.section.name}
                  </Link>
                  <span className="prof-card__section-sched num">{row.section.schedule}</span>
                  <span className="prof-card__section-students num">
                    {row.studentCount} {plural(row.studentCount, "student")}
                  </span>
                </div>
                <div className="prof-card__section-progress">
                  <ProgressSegments segments={segmentsFor(row.periods)} size="sm" />
                  <StatusPill tone={summary.tone} label={summary.label} title={summary.title} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <footer className="prof-card__foot">
        <Button size="sm" onClick={onAddSection}>
          Add section
        </Button>
      </footer>
    </article>
  );
}
