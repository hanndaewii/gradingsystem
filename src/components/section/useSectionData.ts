// useSectionData — WO-5's own loader (spec step 2). One read sweep per
// section via the `api` layer, plus optimistic appliers so grade entry,
// submits and comments feel instant; `reload()` re-syncs from the store.
// Never touches localStorage (that belongs to the api alone).
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useAsync } from "../../lib/useAsync";
import { buildPeriodProgress } from "../../lib/grades";
import { PERIODS } from "../../types";
import type {
  Assessment, Comment, Course, Grade, HistoryEntry, PeriodId, PeriodProgress,
  PeriodState, Section, Student,
} from "../../types";

/** Query-state views of the section page (D2). */
export type SectionView = "gradebook" | "summary" | "history" | "discussion";

export interface SectionBundle {
  section: Section;
  course: Course;
  students: Student[];
  assessmentsByPeriod: Record<PeriodId, Assessment[]>;
  grades: Grade[];
  progress: PeriodProgress[];
  history: HistoryEntry[];
  comments: Comment[];
}

/** Human text for any thrown value (ApiError.message included). */
export function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function loadBundle(sectionId: string): Promise<SectionBundle | null> {
  const section = await api.getSection(sectionId);
  if (!section) return null; // unknown id OR foreign section (api scopes reads)
  const course = await api.getCourse(section.courseId);
  if (!course) return null;
  const [prelim, midterm, semifinals, finals, students, grades, progress, history, comments] =
    await Promise.all([
      api.listAssessments(sectionId, "prelim"),
      api.listAssessments(sectionId, "midterm"),
      api.listAssessments(sectionId, "semifinals"),
      api.listAssessments(sectionId, "finals"),
      api.listStudents(sectionId),
      api.listGrades(sectionId),
      api.getSectionProgress(sectionId),
      api.listHistory(sectionId),
      api.listComments(sectionId),
    ]);
  return {
    section,
    course,
    students,
    assessmentsByPeriod: { prelim, midterm, semifinals, finals },
    grades,
    progress,
    history,
    comments,
  };
}

/** Period states recovered from the loaded progress rows. */
export function statesFromProgress(progress: PeriodProgress[]): Record<PeriodId, PeriodState> {
  const states = {} as Record<PeriodId, PeriodState>;
  for (const p of progress) states[p.period] = { status: p.status, submittedAt: p.submittedAt };
  return states;
}

const EMPTY_STUDENTS: Student[] = [];
const EMPTY_ASSESSMENTS: Assessment[] = [];
const EMPTY_GRADES: Grade[] = [];
const EMPTY_HISTORY: HistoryEntry[] = [];
const EMPTY_COMMENTS: Comment[] = [];
const EMPTY_BY_PERIOD: Record<PeriodId, Assessment[]> = {
  prelim: [], midterm: [], semifinals: [], finals: [],
};

export interface UseSectionDataResult {
  section: Section | null;
  course: Course | null;
  students: Student[];
  assessmentsByPeriod: Record<PeriodId, Assessment[]>;
  grades: Grade[];
  progress: PeriodProgress[];
  history: HistoryEntry[];
  comments: Comment[];
  /** "assessmentId:studentRowId" → Grade (D1: the row PK, never the institutional number). */
  gradesByCell: Map<string, Grade>;
  loading: boolean;
  error: Error | null;
  /** Loaded but nothing readable → unknown id or "Not your section". */
  notFound: boolean;
  reload(): void;
  applyGradeLocal(grade: Grade): void;
  applySectionLocal(section: Section): void;
  applyHistoryLocal(entry: HistoryEntry): void;
  applyCommentLocal(comment: Comment): void;
}

export function useSectionData(sectionId: string): UseSectionDataResult {
  const loaded = useAsync(() => loadBundle(sectionId), [sectionId]);
  const [local, setLocal] = useState<SectionBundle | null>(null);

  // Fresh server data replaces the optimistic view. `reload()` keeps the
  // previous `data` reference, so this does not clobber pending edits
  // mid-reload — only a completed fetch (new reference) re-syncs.
  useEffect(() => {
    setLocal(loaded.data);
  }, [loaded.data]);

  /** Recompute all four periods' progress from local grades + states. */
  const recomputeProgress = useCallback(
    (bundle: SectionBundle, grades: Grade[]): PeriodProgress[] => {
      const states = statesFromProgress(bundle.progress);
      return PERIODS.map((period) =>
        buildPeriodProgress({
          period,
          students: bundle.students,
          assessments: bundle.assessmentsByPeriod[period] ?? EMPTY_ASSESSMENTS,
          grades,
          state: states[period] ?? { status: "not_started", submittedAt: null },
        }),
      );
    },
    [],
  );

  const applyGradeLocal = useCallback(
    (grade: Grade) => {
      setLocal((prev) => {
        if (!prev) return prev;
        const sameCell = (g: Grade) =>
          g.assessmentId === grade.assessmentId && g.studentRowId === grade.studentRowId;
        const removed = prev.grades.some(sameCell);
        // Clearing a never-set cell returns an id:"" shell — nothing to store.
        const keepNew = grade.id !== "";
        if (!removed && !keepNew) return prev;
        const grades = [
          ...prev.grades.filter((g) => !sameCell(g)),
          ...(keepNew ? [grade] : []),
        ];
        return { ...prev, grades, progress: recomputeProgress(prev, grades) };
      });
    },
    [recomputeProgress],
  );

  const applySectionLocal = useCallback((section: Section) => {
    setLocal((prev) => (prev ? { ...prev, section } : prev));
  }, []);

  /**
   * Optimistic history prepend. Submit/reopen entries also flip the matching
   * period's status locally so the SubmitBar/tabs react before `reload()`
   * returns (submit/reopen are the only history kinds that change status).
   */
  const applyHistoryLocal = useCallback((entry: HistoryEntry) => {
    setLocal((prev) => {
      if (!prev) return prev;
      const statusFlip =
        (entry.kind === "submit" || entry.kind === "reopen") && entry.period != null;
      const progress = statusFlip
        ? prev.progress.map((p) =>
            p.period === entry.period
              ? {
                  ...p,
                  status: entry.kind === "submit" ? ("submitted" as const) : ("draft" as const),
                  submittedAt: entry.kind === "submit" ? entry.at : null,
                }
              : p,
          )
        : prev.progress;
      return { ...prev, history: [entry, ...prev.history], progress };
    });
  }, []);

  const applyCommentLocal = useCallback((comment: Comment) => {
    setLocal((prev) => (prev ? { ...prev, comments: [comment, ...prev.comments] } : prev));
  }, []);

  const gradesByCell = useMemo(() => {
    const map = new Map<string, Grade>();
    for (const g of local?.grades ?? []) map.set(`${g.assessmentId}:${g.studentRowId}`, g);
    return map;
  }, [local?.grades]);

  return {
    section: local?.section ?? null,
    course: local?.course ?? null,
    students: local?.students ?? EMPTY_STUDENTS,
    assessmentsByPeriod: local?.assessmentsByPeriod ?? EMPTY_BY_PERIOD,
    grades: local?.grades ?? EMPTY_GRADES,
    progress: local?.progress ?? [],
    history: local?.history ?? EMPTY_HISTORY,
    comments: local?.comments ?? EMPTY_COMMENTS,
    gradesByCell,
    loading: loaded.loading,
    error: loaded.error,
    notFound: !loaded.loading && loaded.error === null && loaded.data === null,
    reload: loaded.reload,
    applyGradeLocal,
    applySectionLocal,
    applyHistoryLocal,
    applyCommentLocal,
  };
}
