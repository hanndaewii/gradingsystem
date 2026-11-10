// RosterTable — the editable gradebook (spec step 7, D15): autocommit on
// blur/Enter, Escape reverts, invalid input reverts with a warn toast, values
// clamp to [0, maxScore], blank clears. Live Period Grade + Running Semester
// Grade footers; `flash` drives the "85 → 92" trace highlight; readOnly (or a
// locked period) renders plain mono text cells.
import { useEffect, useMemo, useState } from "react";
import { Button, EmptyState, Menu, useToast } from "../../components/ui";
import { PERIODS } from "../../types";
import type { Assessment, Grade, PeriodId, PeriodState, Section, Student } from "../../types";
import { buildPeriodProgress, classAveragePct, isPeriodEditable, periodGrade } from "../../lib/grades";
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
  // Hide the ID column when every student was added without one (AUTO-####).
  const idsSynthetic = students.every((s) => /^AUTO-/i.test(s.studentNo.trim()));

  return (
    <div className="sec-tablewrap">
      <table className="sec-table">
        <thead>
          <tr>
            {!idsSynthetic ? <th scope="col" className="sec-table__id mono-label">Student ID</th> : null}
            <th scope="col" className="sec-table__name mono-label">Name</th>
            {assessments.map((a) => (
              <th key={a.id} scope="col" className="sec-table__assess">
                <span className="sec-table__assessname">{a.name}</span>
                <span className="sec-table__assessmeta num">
                  max {a.maxScore}
                  {a.weight != null ? ` · ${a.weight}%` : ""}
                </span>
              </th>
            ))}
            <th scope="col" className="sec-table__periodgrade mono-label">
              Period grade
            </th>
            {!readOnly ? <th scope="col" className="sec-table__actions" aria-label="Row actions" /> : null}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const perPct = periodGrade(entriesFor(student, assessments));
            return (
              <tr key={student.id}>
                {!idsSynthetic ? <td className="sec-table__id num">{student.studentNo}</td> : null}
                <td className="sec-table__name">{student.name}</td>
                {assessments.map((a) => {
                  const key = cellKey(a.id, student.id);
                  const g = gradesByCell.get(key);
                  const authoritative = scoreText(g);
                  const display = drafts.get(key) ?? pending.get(key) ?? authoritative;
                  const isFlash = flashKey === key;
                  return (
                    <td
                      key={a.id}
                      id={`sec-cell-${a.id}-${student.id}`}
                      className={cx("sec-cell", isFlash && "sec-cell--flash")}
                    >
                      {editable ? (
                        <input
                          className="ui-input sec-cell__input num"
                          inputMode="decimal"
                          autoComplete="off"
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
                        <span className="num">{authoritative === "" ? "—" : authoritative}</span>
                      )}
                      {isFlash && flash ? (
                        <span className="sec-cell__chip num" aria-hidden="true">
                          {flash.oldScore ?? "—"} → {flash.newScore ?? "—"}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
                <td className="sec-table__periodgrade num">{formatGrade(perPct, section)}</td>
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
            <td className="sec-table__id" />
            <td className="sec-table__name">
              <span className="mono-label">Averages{provisional ? " · provisional" : ""}</span>
            </td>
            {assessments.map((a) => {
              const avg = periodGrade(
                students.map((s) => ({
                  assessmentId: a.id,
                  maxScore: a.maxScore,
                  weight: null, // equal-weight mean over the roster
                  score: gradesByCell.get(cellKey(a.id, s.id))?.score ?? null,
                })),
              );
              return (
                <td key={a.id} className="sec-cell num">
                  {avg == null ? "—" : formatPercent(avg)}
                </td>
              );
            })}
            <td className="sec-table__periodgrade num">{formatGrade(periodAverage, section)}</td>
            {!readOnly ? <td className="sec-table__actions" /> : null}
          </tr>
          <tr className="sec-table__foot sec-table__foot--semester">
            <td className="sec-table__id" />
            <td
              colSpan={assessments.length + 2 + (readOnly ? 0 : 1)}
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
