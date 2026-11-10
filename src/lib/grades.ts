// Pure grading math (spec §3.3; rules D6/D10/D14/D16). No Date.now() — every
// function is pure; time-dependent callers pass their own timestamps.
import { PERIODS } from "../types";
import type { Assessment, Grade, PeriodId, PeriodProgress, PeriodState, ScaleRow, Section, Student } from "../types";

export interface AssessmentScore { assessmentId: string; maxScore: number; weight: number | null; score: number | null }

export interface PeriodGradeInput { period: PeriodId; pct: number | null; hasAssessments: boolean }

/**
 * D14 — weighted vs equal period grade (percentage 0–100 for one student).
 * If any scorable assessment (maxScore > 0) has weight > 0 → weighted:
 *   Σ((score ?? 0)/maxScore × weight) / Σweights   (null weights count 0).
 * Else equal-weight: mean of (score ?? 0)/maxScore over scorable assessments.
 * Missing score counts as 0 (provisional). Assessments with maxScore <= 0 are
 * excluded from numerator and denominator. Null when nothing is scorable.
 */
export function periodGrade(entries: AssessmentScore[]): number | null {
  const scorable = entries.filter((e) => e.maxScore > 0);
  if (scorable.length === 0) return null;
  const weighted = scorable.some((e) => e.weight != null && e.weight > 0);
  if (weighted) {
    let num = 0;
    let den = 0;
    for (const e of scorable) {
      const w = e.weight != null && e.weight > 0 ? e.weight : 0;
      num += ((e.score ?? 0) / e.maxScore) * w;
      den += w;
    }
    if (den <= 0) return null;
    return (num / den) * 100;
  }
  let sum = 0;
  for (const e of scorable) sum += (e.score ?? 0) / e.maxScore;
  return (sum / scorable.length) * 100;
}

/**
 * D10 — semester percentage: Σ(weight_p × periodGrade_p) over periods that
 * have ≥1 assessment, divided by Σ(weight_p over those periods). Ungraded
 * periods contribute 0 to the numerator but their weight still counts.
 * `complete` = at least one period has assessments, every such period is
 * graded, and the used weight is positive.
 */
export function semesterGrade(input: { periodGrades: PeriodGradeInput[]; weights: Record<PeriodId, number> }): { pct: number | null; usedWeight: number; complete: boolean } {
  let num = 0;
  let usedWeight = 0;
  let any = false;
  let allGraded = true;
  for (const pg of input.periodGrades) {
    if (!pg.hasAssessments) continue;
    any = true;
    const w = input.weights[pg.period] ?? 0;
    usedWeight += w;
    if (pg.pct == null) {
      allGraded = false;
      continue; // ungraded → 0 contribution
    }
    num += w * pg.pct;
  }
  const pct = usedWeight > 0 ? num / usedWeight : null;
  const complete = any && allGraded && usedWeight > 0;
  return { pct, usedWeight, complete };
}

/** Counting part of completeness: total vs graded cells for one period. */
export function countCompleteness(input: { students: Student[]; assessments: Assessment[]; grades: Grade[]; period: PeriodId }): {
  totalCells: number;
  gradedCells: number;
  complete: boolean;
  perAssessment: Record<string, boolean>;
} {
  const periodAssessments = input.assessments.filter((a) => a.period === input.period);
  const assessmentIds = new Set(periodAssessments.map((a) => a.id));
  const studentRowIds = new Set(input.students.map((s) => s.id));
  const gradedByAssessment = new Map<string, Set<string>>();
  let gradedCells = 0;
  for (const g of input.grades) {
    if (g.score == null) continue;
    if (!assessmentIds.has(g.assessmentId) || !studentRowIds.has(g.studentRowId)) continue;
    gradedCells += 1;
    let seen = gradedByAssessment.get(g.assessmentId);
    if (!seen) {
      seen = new Set<string>();
      gradedByAssessment.set(g.assessmentId, seen);
    }
    seen.add(g.studentRowId);
  }
  const perAssessment: Record<string, boolean> = {};
  for (const a of periodAssessments) {
    perAssessment[a.id] = input.students.length > 0 && (gradedByAssessment.get(a.id)?.size ?? 0) >= input.students.length;
  }
  const totalCells = periodAssessments.length * input.students.length;
  const complete = totalCells > 0 && gradedCells >= totalCells;
  return { totalCells, gradedCells, complete, perAssessment };
}

/**
 * Full PeriodProgress for one period: counting part + period/status fields +
 * the section's average period % (mean of per-student percentages) and the
 * last grade update timestamp among this period's grade rows.
 */
export function buildPeriodProgress(input: { period: PeriodId; students: Student[]; assessments: Assessment[]; grades: Grade[]; state: PeriodState }): PeriodProgress {
  const counting = countCompleteness({ students: input.students, assessments: input.assessments, grades: input.grades, period: input.period });
  const periodAssessments = input.assessments.filter((a) => a.period === input.period);
  const assessmentIds = new Set(periodAssessments.map((a) => a.id));
  const studentRowIds = new Set(input.students.map((s) => s.id));

  const gradesByStudent = new Map<string, Map<string, Grade>>();
  for (const g of input.grades) {
    if (!studentRowIds.has(g.studentRowId)) continue;
    let m = gradesByStudent.get(g.studentRowId);
    if (!m) {
      m = new Map<string, Grade>();
      gradesByStudent.set(g.studentRowId, m);
    }
    m.set(g.assessmentId, g);
  }
  const pcts: number[] = [];
  for (const s of input.students) {
    const pct = studentPeriodPct(periodAssessments, gradesByStudent.get(s.id));
    if (pct != null) pcts.push(pct);
  }
  const avg = pcts.length === 0 ? null : pcts.reduce((acc, v) => acc + v, 0) / pcts.length;

  let lastGradeUpdateAt: string | null = null;
  for (const g of input.grades) {
    if (!assessmentIds.has(g.assessmentId) || !studentRowIds.has(g.studentRowId)) continue;
    if (lastGradeUpdateAt == null || g.updatedAt > lastGradeUpdateAt) lastGradeUpdateAt = g.updatedAt;
  }

  return {
    period: input.period,
    status: input.state.status,
    submittedAt: input.state.submittedAt,
    gradedCells: counting.gradedCells,
    totalCells: counting.totalCells,
    complete: counting.complete,
    perAssessment: counting.perAssessment,
    periodGrade: avg,
    lastGradeUpdateAt,
  };
}

/**
 * D6 — editability rule. Submitted → locked; else enforceOrder === false →
 * editable; else manually unlocked → editable; else editable iff it is the
 * first non-submitted period in PERIODS order.
 */
export function isPeriodEditable(input: { section: Section; states: Record<PeriodId, PeriodState>; period: PeriodId }): boolean {
  const st = input.states[input.period];
  if (!st) return false;
  if (st.status === "submitted") return false;
  if (input.section.enforceOrder === false) return true;
  if (input.section.unlockedPeriods.includes(input.period)) return true;
  let firstOpen: PeriodId | null = null;
  for (const p of PERIODS) {
    const s = input.states[p];
    if (s && s.status !== "submitted") {
      firstOpen = p;
      break;
    }
  }
  return firstOpen === input.period;
}

/**
 * First row (table sorted descending by minPct) with pct >= minPct. Falls back
 * to the last row, and to a safe F row for an empty table.
 */
export function scaleLookup(table: ScaleRow[], pct: number): ScaleRow {
  if (table.length === 0) return { minPct: 0, letter: "F", grade5: 5 };
  for (const row of table) {
    if (pct >= row.minPct) return row;
  }
  return table[table.length - 1];
}

/**
 * D10 — mean over students of each student's semester percentage, where the
 * semester % = Σ(weight_p × periodGrade_p) / Σ(weight_p over periods that have
 * ≥1 assessment) and ungraded periods contribute 0. Null when there are no
 * students, no assessments, or no usable weight.
 */
export function classAveragePct(input: { students: Student[]; assessments: Assessment[]; grades: Grade[]; weights: Record<PeriodId, number> }): number | null {
  if (input.students.length === 0 || input.assessments.length === 0) return null;
  const byPeriod = new Map<PeriodId, Assessment[]>();
  for (const a of input.assessments) {
    let list = byPeriod.get(a.period);
    if (!list) {
      list = [];
      byPeriod.set(a.period, list);
    }
    list.push(a);
  }
  const gradesByStudent = new Map<string, Map<string, Grade>>();
  for (const g of input.grades) {
    let m = gradesByStudent.get(g.studentRowId);
    if (!m) {
      m = new Map<string, Grade>();
      gradesByStudent.set(g.studentRowId, m);
    }
    m.set(g.assessmentId, g);
  }
  let sum = 0;
  let counted = 0;
  for (const s of input.students) {
    const periodGrades: PeriodGradeInput[] = [];
    for (const p of PERIODS) {
      const list = byPeriod.get(p);
      if (!list || list.length === 0) continue;
      periodGrades.push({ period: p, pct: studentPeriodPct(list, gradesByStudent.get(s.id)), hasAssessments: true });
    }
    const sem = semesterGrade({ periodGrades, weights: input.weights });
    if (sem.pct == null) continue;
    sum += sem.pct;
    counted += 1;
  }
  if (counted === 0) return null;
  return sum / counted;
}

// ── internal helpers ─────────────────────────────────────────────────────────

function studentPeriodPct(assessments: Assessment[], grades: Map<string, Grade> | undefined): number | null {
  const entries: AssessmentScore[] = assessments.map((a) => ({
    assessmentId: a.id,
    maxScore: a.maxScore,
    weight: a.weight,
    score: grades?.get(a.id)?.score ?? null,
  }));
  return periodGrade(entries);
}
