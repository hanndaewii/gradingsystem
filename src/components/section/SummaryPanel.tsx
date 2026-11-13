// SummaryPanel — the ledger view (spec step 11): per-period cards, the
// four-period semester table, the large Final Semester Grade (with the
// semester-complete gold tick, no confetti), the WeightsEditor and the
// ScaleTableEditor. Admin sees everything read-only.
import { StatusPill, TickIcon } from "../../components/ui";
import { PERIODS, PERIOD_LABELS } from "../../types";
import type {
  AttendanceRow, PeriodId, PeriodProgress, PeriodStatus, Section, Student, TermDates,
} from "../../types";
import type { Assessment, Grade } from "../../types";
import { classAveragePct, isFinalStatus, semesterGrade } from "../../lib/grades";
import { formatGrade, formatPercent, plural } from "../../lib/format";
import { WeightsEditor } from "./WeightsEditor";
import { ScaleTableEditor } from "./ScaleTableEditor";
import { TermDatesEditor } from "./TermDatesEditor";

export interface SummaryPanelProps {
  section: Section;
  students: Student[];
  assessmentsByPeriod: Record<PeriodId, Assessment[]>;
  grades: Grade[];
  progress: PeriodProgress[];
  /** Each term's window in the school calendar. */
  termDates: TermDates;
  /** The attendance marks, so a term can be filled in from them. */
  attendanceRows: AttendanceRow[];
  readOnly: boolean;
  termDatesBusy?: boolean;
  onSectionChange(section: Section): void;
  /** Save one term's window (the page checks what it would move first). */
  onTermDatesChange(period: PeriodId, startDate: string | null, endDate: string | null): void;
}

const pillTone = (status: PeriodStatus): "neutral" | "progress" | "done" | "approved" =>
  status === "approved"
    ? "approved"
    : status === "submitted"
      ? "done"
      : status === "draft"
        ? "progress"
        : "neutral";

const pillLabel = (status: PeriodStatus): string =>
  status === "approved"
    ? "Approved"
    : status === "submitted"
      ? "Submitted"
      : status === "draft"
        ? "Draft"
        : "Not started";

export function SummaryPanel({
  section, students, assessmentsByPeriod, grades, progress, termDates, attendanceRows,
  readOnly, termDatesBusy = false, onSectionChange, onTermDatesChange,
}: SummaryPanelProps): JSX.Element {
  const periodGrades = progress.map((p) => ({
    period: p.period,
    pct: p.periodGrade,
    hasAssessments: (assessmentsByPeriod[p.period]?.length ?? 0) > 0,
  }));
  const semester = semesterGrade({ periodGrades, weights: section.periodWeights });
  const allAssessments = PERIODS.flatMap((p) => assessmentsByPeriod[p] ?? []);
  const classAverage = classAveragePct({
    students,
    assessments: allAssessments,
    grades,
    weights: section.periodWeights,
  });
  const semesterComplete = progress.length === PERIODS.length && progress.every((p) => isFinalStatus(p.status));

  return (
    <div className="sec-summary">
      <div className="sec-summary__cards">
        {PERIODS.map((p) => {
          const prog = progress.find((x) => x.period === p);
          const count = assessmentsByPeriod[p]?.length ?? 0;
          return (
            <div key={p} className="sec-summary__card">
              <div className="sec-summary__cardhead">
                <span className="sec-summary__periodname">{PERIOD_LABELS[p]}</span>
                <StatusPill tone={pillTone(prog?.status ?? "not_started")} label={pillLabel(prog?.status ?? "not_started")} />
              </div>
              <span className="sec-summary__grade num">{formatGrade(prog?.periodGrade ?? null, section)}</span>
              <span className="sec-summary__meta mono-label">
                {count} {plural(count, "assessment")}
                {prog && prog.totalCells > 0 ? ` · ${prog.gradedCells}/${prog.totalCells} cells` : ""}
              </span>
            </div>
          );
        })}
      </div>

      <table className="sec-table sec-summary__table">
        <thead>
          <tr>
            <th scope="col" className="mono-label">Period</th>
            <th scope="col" className="mono-label">Weight</th>
            <th scope="col" className="mono-label">Status</th>
            <th scope="col" className="mono-label">Period grade</th>
          </tr>
        </thead>
        <tbody>
          {PERIODS.map((p) => {
            const prog = progress.find((x) => x.period === p);
            return (
              <tr key={p}>
                <td>{PERIOD_LABELS[p]}</td>
                <td className="num">{section.periodWeights[p]}%</td>
                <td>
                  <StatusPill tone={pillTone(prog?.status ?? "not_started")} label={pillLabel(prog?.status ?? "not_started")} />
                </td>
                <td className="num">{formatGrade(prog?.periodGrade ?? null, section)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className={semesterComplete ? "sec-final sec-final--complete" : "sec-final"}>
        <span className="mono-label">Final semester grade</span>
        <div className="sec-final__row">
          {semesterComplete ? <TickIcon size={20} className="sec-final__tick" /> : null}
          <span className="sec-final__value num">{formatGrade(semester.pct, section)}</span>
        </div>
        <span className="sec-final__sub num">
          {semester.pct == null
            ? "No gradable periods yet"
            : `${formatPercent(semester.pct)} · weights over ${semester.usedWeight}%`}
          {classAverage != null ? ` · class average ${formatPercent(classAverage)}` : ""}
        </span>
        {semesterComplete ? <span className="sec-final__donelabel mono-label">All four periods submitted</span> : null}
      </div>

      <div className="sec-summary__editors">
        <section className="sec-summary__editor">
          <h3 className="mono-label">Period weights</h3>
          <WeightsEditor section={section} readOnly={readOnly} onSectionChange={onSectionChange} />
        </section>
        <section className="sec-summary__editor">
          <h3 className="mono-label">Grading scale & order</h3>
          <ScaleTableEditor section={section} progress={progress} readOnly={readOnly} onSectionChange={onSectionChange} />
        </section>
        <section className="sec-summary__editor">
          <h3 className="mono-label">Term dates</h3>
          <TermDatesEditor
            termDates={termDates}
            rows={attendanceRows}
            readOnly={readOnly}
            busy={termDatesBusy}
            onSave={onTermDatesChange}
          />
        </section>
      </div>

      <p className="sec-summary__footnote mono-label">{grades.length} grade entries recorded for this section</p>
    </div>
  );
}
