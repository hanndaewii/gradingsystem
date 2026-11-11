// RosterTable — the editable gradebook (spec step 7, D15): autocommit on
// blur/Enter, Escape reverts, invalid input reverts with a warn toast, values
// clamp to [0, maxScore], blank clears. Live Period Grade + Running Semester
// Grade footers; `flash` drives the "85 → 92" trace highlight; readOnly (or a
// locked period) renders plain mono text cells.
import { useEffect, useMemo, useState } from "react";
import { Button, EmptyState, Menu, useToast } from "../../components/ui";
import { PERIODS, PERIOD_LABELS } from "../../types";
import type { Assessment, Grade, PeriodId, PeriodState, Section, Student } from "../../types";
import { buildPeriodProgress, classAveragePct, isPeriodEditable, periodGrade } from "../../lib/grades";
import { buildSheetColumns } from "../../lib/classRecord";
import type { AssessmentScore } from "../../lib/grades";
import { clampScore, formatGrade, formatPercent, parseScoreInput } from "../../lib/format";
import { cx } from "./cx";

export interface FlashTarget {
  assessmentId: string;
  studentRowId: string;
  oldScore: number | null;
  newScore: number | null;
}

export interface RosterTableProps {
  students: Student[];
  /** Assessments of the active period — one column each. */
  assessments: Assessment[];
  gradesByCell: Map<string, Grade>;
  readOnly: boolean;
  flash: FlashTarget | null;
  onCommit(studentRowId: string, assessmentId: string, score: number | null): Promise<void>;
  onRemove(student: Student): void;
  /** Opens RosterAddModal; also used by the empty-roster action. */
  onAddStudents?(): void;
  // Scale/weights/lock context needed by the live footers and formatting.
  section: Section;
  period: PeriodId;
  assessmentsByPeriod: Record<PeriodId, Assessment[]>;
  states: Record<PeriodId, PeriodState>;
}

const cellKey = (assessmentId: string, studentRowId: string): string => `${assessmentId}:${studentRowId}`;

const scoreText = (g: Grade | undefined): string =>
  g && g.score != null ? String(g.score) : "";

export function RosterTable({
  students, assessments, gradesByCell, readOnly, flash, onCommit, onRemove,
  onAddStudents, section, period, assessmentsByPeriod, states,
}: RosterTableProps): JSX.Element {
  const toast = useToast();
  // Draft = what the user is typing; Pending = committed value shown until the
  // optimistic apply confirms it (or reverted on failure).
  const [drafts, setDrafts] = useState<Map<string, string>>(new Map());
  const [pending, setPending] = useState<Map<string, string>>(new Map());

  const editable = !readOnly && isPeriodEditable({ section, states, period });

  // Drop pending values once the store reflects them.
  useEffect(() => {
    setPending((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Map(prev);
      for (const [key, value] of prev) {
        if (scoreText(gradesByCell.get(key)) === value) {
          next.delete(key);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [gradesByCell]);

  const allGrades = useMemo(() => Array.from(gradesByCell.values()), [gradesByCell]);

  const entriesFor = (student: Student, list: Assessment[]): AssessmentScore[] =>
    list.map((a) => ({
      assessmentId: a.id,
      maxScore: a.maxScore,
      weight: a.weight,
      score: gradesByCell.get(cellKey(a.id, student.id))?.score ?? null,
    }));

  // Footer math — every formula comes from src/lib/grades.ts.
  const periodAverage = useMemo(
    () =>
      buildPeriodProgress({
        period,
        students,
        assessments,
        grades: allGrades,
        state: { status: "draft", submittedAt: null }, // echo fields only
      }).periodGrade,
    [period, students, assessments, allGrades],
  );

  const semesterAverage = useMemo(
    () =>
      classAveragePct({
        students,
        assessments: PERIODS.flatMap((p) => assessmentsByPeriod[p] ?? []),
        grades: allGrades,
        weights: section.periodWeights,
      }),
    [students, assessmentsByPeriod, allGrades, section.periodWeights],
  );

  // "Provisional" while any period that already has grades is unsubmitted.
  const provisional = useMemo(
    () =>
      PERIODS.some((p) => {
        const ids = new Set((assessmentsByPeriod[p] ?? []).map((a) => a.id));
        if (ids.size === 0) return false;
        const hasGrades = allGrades.some((g) => g.score != null && ids.has(g.assessmentId));
        return hasGrades && states[p]?.status !== "submitted";
      }),
    [assessmentsByPeriod, allGrades, states],
  );

  function setDraft(key: string, value: string | undefined): void {
    setDrafts((prev) => {
      const next = new Map(prev);
      if (value === undefined) next.delete(key);
      else next.set(key, value);
      return next;
    });
  }

  function setPendingValue(key: string, value: string | undefined): void {
    setPending((prev) => {
      const next = new Map(prev);
      if (value === undefined) next.delete(key);
      else next.set(key, value);
      return next;
    });
  }

  async function commit(assessment: Assessment, student: Student): Promise<void> {
    const key = cellKey(assessment.id, student.id);
    const raw = drafts.get(key);
    if (raw === undefined) return; // blurred without typing
    const parsed = parseScoreInput(raw);
    if (parsed === "invalid") {
      // D15: never silently clear — revert + warn.
      toast.push({
        tone: "warn",
        title: "Invalid score",
        description: `"${raw}" is not a number for ${assessment.name} — reverted.`,
      });
      setDraft(key, undefined);
      return;
    }
    const value = parsed == null ? null : clampScore(parsed, assessment.maxScore);
    setDraft(key, undefined);
    setPendingValue(key, value == null ? "" : String(value));
    try {
      await onCommit(student.id, assessment.id, value);
    } catch {
      setPendingValue(key, undefined); // revert the display; toast came from SectionPage
    }
  }

  function revert(assessment: Assessment, student: Student): void {
    const key = cellKey(assessment.id, student.id);
    setDraft(key, undefined);
    setPendingValue(key, undefined);
  }

  if (students.length === 0) {
    return (
      <EmptyState
        title="No students yet"
        body="Add students one at a time, paste a roster, or import a CSV file."
        action={
          onAddStudents && !readOnly ? (
            <Button variant="primary" onClick={onAddStudents}>
              Add students
            </Button>
          ) : undefined
        }
      />
    );
  }

  const flashKey = flash ? cellKey(flash.assessmentId, flash.studentRowId) : null;

  // Class-record math (the professor's Excel sheet): each standalone
  // assessment is followed by its weighted contribution; consecutive
  // assessments sharing a `group` key collapse into raw columns + one
  // "Total" column + one group-weight column. Normalised so all
  // contribution columns always sum to the PG (D14).
  const eqW = assessments.length > 0 ? 100 / assessments.length : 0;
  const weightOf = (a: Assessment): number => (a.weight ?? eqW);
  const sumW = assessments.reduce((acc, a) => (a.maxScore > 0 ? acc + weightOf(a) : acc), 0);
  const normFactor = sumW > 0 ? 100 / sumW : 0;
  const sheetCols = useMemo(() => buildSheetColumns(assessments), [assessments]);
  const periodWeight = section.periodWeights[period];

  return (
    <div className="sec-tablewrap">
      <table className="sec-table">
        <thead>
          <tr>
            <th scope="col" className="sec-table__name mono-label">Name</th>
            {sheetCols.map((col) => {
              if (col.kind === "raw") {
                const a = col.assessment;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className="sec-table__assess"
                    title={`${a.name} — max score ${a.maxScore}`}
                  >
                    <span className="sec-table__assessname">{a.name}</span>
                  </th>
                );
              }
              if (col.kind === "weight") {
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className="sec-table__pcthead num"
                    title={`Weight toward the ${PERIOD_LABELS[period]} grade`}
                  >
                    {col.weight}%
                  </th>
                );
              }
              if (col.kind === "grouptotal") {
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className="sec-table__totalhead"
                    title={`Average of ${col.members.map((m) => m.name).join(", ")}`}
                  >
                    Total
                  </th>
                );
              }
              return (
                <th
                  key={col.key}
                  scope="col"
                  className="sec-table__pcthead num"
                  title={`Group weight — sum of ${col.members.map((m) => m.name).join(", ")}`}
                >
                  {col.weight}%
                </th>
              );
            })}
            <th scope="col" className="sec-table__periodgrade mono-label" title="Period grade">
              PG
            </th>
            <th
              scope="col"
              className="sec-table__periodgrade mono-label"
              title={`Period grade × ${periodWeight}% semester weight`}
            >
              PG {periodWeight}%
            </th>
            {!readOnly ? <th scope="col" className="sec-table__actions" aria-label="Row actions" /> : null}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const perPct = periodGrade(entriesFor(student, assessments));
            const complete =
              assessments.length > 0 &&
              assessments.every((a) => (gradesByCell.get(cellKey(a.id, student.id))?.score ?? null) != null);
            return (
              <tr key={student.id} className={cx(complete && "sec-row--complete")}>
                <td className="sec-table__name" title={`Student ID: ${student.studentNo}`}>
                  {student.name}
                </td>
                {sheetCols.map((col) => {
                  if (col.kind === "raw") {
                    const a = col.assessment;
                    const key = cellKey(a.id, student.id);
                    const g = gradesByCell.get(key);
                    const authoritative = scoreText(g);
                    const display = drafts.get(key) ?? pending.get(key) ?? authoritative;
                    const isFlash = flashKey === key;
                    return (
                      <td
                        key={col.key}
                        id={`sec-cell-${a.id}-${student.id}`}
                        className={cx("sec-cell", isFlash && "sec-cell--flash")}
                      >
                        {editable ? (
                          <input
                            className="ui-input sec-cell__input num"
                            inputMode="decimal"
                            autoComplete="off"
                            size={2}
                            aria-label={`${student.name} (${student.studentNo}) — ${a.name}, out of ${a.maxScore}`}
                            value={display}
                            onChange={(e) => setDraft(key, e.target.value)}
                            onBlur={() => void commit(a, student)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void commit(a, student);
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                revert(a, student);
                              }
                            }}
                          />
                        ) : (
                          <span
                            className="sec-cell__locked num"
                            title="This period is locked — reopen or unlock it to edit scores"
                          >
                            {authoritative === "" ? "—" : authoritative}
                          </span>
                        )}
                        {isFlash && flash ? (
                          <span className="sec-cell__chip num" aria-hidden="true">
                            {flash.oldScore ?? "—"} → {flash.newScore ?? "—"}
                          </span>
                        ) : null}
                      </td>
                    );
                  }
                  if (col.kind === "weight") {
                    const a = col.assessment;
                    // The sheet always shows a value — missing scores count 0 (D14).
                    const score = gradesByCell.get(cellKey(a.id, student.id))?.score ?? 0;
                    const pct = a.maxScore <= 0 ? 0 : (score / a.maxScore) * weightOf(a) * normFactor;
                    return (
                      <td key={col.key} className="sec-table__contrib num">
                        {`${pct.toFixed(2)}%`}
                      </td>
                    );
                  }
                  if (col.kind === "grouptotal") {
                    const total = periodGrade(entriesFor(student, col.members)) ?? 0;
                    return (
                      <td key={col.key} className="sec-table__total num">
                        {String(Number(total.toFixed(2)))}
                      </td>
                    );
                  }
                  let sum = 0;
                  for (const m of col.members) {
                    const score = gradesByCell.get(cellKey(m.id, student.id))?.score ?? 0;
                    if (m.maxScore <= 0) continue;
                    sum += (score / m.maxScore) * weightOf(m) * normFactor;
                  }
                  return (
                    <td key={col.key} className="sec-table__contrib num">
                      {`${sum.toFixed(2)}%`}
                    </td>
                  );
                })}
                <td
                  className="sec-table__periodgrade num"
                  title={perPct == null ? "Period grade" : `Exact period grade: ${perPct.toFixed(2)}%`}
                >
                  {perPct == null ? 0 : Math.round(perPct)}
                </td>
                <td
                  className="sec-table__periodgrade num"
                  title={`Unrounded period grade × ${periodWeight}% semester weight`}
                >
                  {`${(((perPct ?? 0) * periodWeight) / 100).toFixed(2)}%`}
                </td>
                {!readOnly ? (
                  <td className="sec-table__actions">
                    <Menu
                      ariaLabel={`Actions for ${student.name}`}
                      items={[
                        {
                          key: "remove",
                          label: "Remove student",
                          tone: "danger",
                          onSelect: () => onRemove(student),
                        },
                      ]}
                    />
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="sec-table__foot">
            <td className="sec-table__name">
              <span className="mono-label">Averages{provisional ? " · provisional" : ""}</span>
            </td>
            {sheetCols.map((col) => {
              if (col.kind === "raw") {
                const a = col.assessment;
                const avg = periodGrade(
                  students.map((s) => ({
                    assessmentId: a.id,
                    maxScore: a.maxScore,
                    weight: null, // equal-weight mean over the roster
                    score: gradesByCell.get(cellKey(a.id, s.id))?.score ?? null,
                  })),
                );
                return (
                  <td key={col.key} className="sec-cell num">
                    {avg == null ? "—" : formatPercent(avg)}
                  </td>
                );
              }
              if (col.kind === "grouptotal") {
                const pgs = students
                  .map((s) => periodGrade(entriesFor(s, col.members)))
                  .filter((v): v is number => v != null);
                const avg = pgs.length > 0 ? pgs.reduce((acc, v) => acc + v, 0) / pgs.length : null;
                return (
                  <td key={col.key} className="sec-table__total num">
                    {avg == null ? "—" : String(Number(avg.toFixed(2)))}
                  </td>
                );
              }
              return <td key={col.key} className="sec-table__contrib num" />;
            })}
            <td className="sec-table__periodgrade num">
              {periodAverage == null ? 0 : Math.round(periodAverage)}
            </td>
            <td className="sec-table__periodgrade num">
              {`${(((periodAverage ?? 0) * periodWeight) / 100).toFixed(2)}%`}
            </td>
            {!readOnly ? <td className="sec-table__actions" /> : null}
          </tr>
          <tr className="sec-table__foot sec-table__foot--semester">
            <td
              colSpan={1 + sheetCols.length + 2 + (readOnly ? 0 : 1)}
              className="sec-table__semester"
            >
              <span className="mono-label">Running semester grade</span>
              <span className="sec-table__semestervalue num">
                {formatGrade(semesterAverage, section)}
                {provisional && semesterAverage != null ? (
                  <span className="sec-table__provisional"> provisional</span>
                ) : null}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
