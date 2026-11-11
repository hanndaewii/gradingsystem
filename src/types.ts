// ─────────────────────────────────────────────────────────────────────────────
// Shared domain contracts (spec §3.1 + §3.2) — canonical, dependency-free.
// NOTE (D1): grades and history reference `studentRowId` (= Student.id, the row
// PK). `studentNo` is the institutional ID and the CSV/duplicate key. The token
// `studentId` must never be used for a Student anywhere.
// ─────────────────────────────────────────────────────────────────────────────

export type Role = "professor" | "admin";
export type PeriodId = "prelim" | "midterm" | "semifinals" | "finals";
export type PeriodStatus = "not_started" | "draft" | "submitted";
export type DisplayScale = "percent-letter" | "scale5";

export const PERIODS: PeriodId[] = ["prelim", "midterm", "semifinals", "finals"];
export const PERIOD_LABELS: Record<PeriodId, string> = {
  prelim: "Prelim", midterm: "Midterm", semifinals: "Semi-finals", finals: "Finals",
};
export const PERIOD_SHORT: Record<PeriodId, string> = {
  prelim: "Prelim", midterm: "Mid", semifinals: "Semi", finals: "Finals",
};

export interface Term { academicYear: string; semester: 1 | 2 }   // academicYear: "2025-2026"

export interface Profile { id: string; email: string; password: string; name: string; department: string; bio: string; role: Role }

export interface Course { id: string; professorId: string; academicYear: string; semester: 1 | 2; code: string; title: string; createdAt: string }

export interface ScaleRow { minPct: number; letter: string; grade5: number }

export interface Section {
  id: string; courseId: string; name: string; schedule: string; room: string;
  displayScale: DisplayScale; scaleTable: ScaleRow[];
  periodWeights: Record<PeriodId, number>;   // must total 100
  enforceOrder: boolean;
  unlockedPeriods: PeriodId[];               // manual unlocks (D5)
  createdAt: string;
}

export interface Assessment { id: string; sectionId: string; period: PeriodId; name: string; maxScore: number; weight: number | null; /** Total-group key: consecutive assessments sharing a key collapse into one "Total" column (the Excel class-record grouping). */ group: string | null; order: number }

export interface Student { id: string; sectionId: string; studentNo: string; name: string }   // see D1

export interface Grade { id: string; sectionId: string; assessmentId: string; studentRowId: string; score: number | null; updatedAt: string }

export interface PeriodState { status: PeriodStatus; submittedAt: string | null }

export interface PeriodProgress {
  period: PeriodId; status: PeriodStatus; submittedAt: string | null;
  gradedCells: number; totalCells: number; complete: boolean;
  perAssessment: Record<string, boolean>;    // assessmentId -> fully graded
  periodGrade: number | null;                // section average % for this period
  lastGradeUpdateAt: string | null;
}

export interface SectionOverview {
  section: Section; course: Course; professorName: string; studentCount: number;
  periods: PeriodProgress[]; classAverage: number | null; lastSubmitAt: string | null;
}

export interface DeleteImpact { sections: number; students: number; grades: number }

export interface HistoryEntry {
  id: string; sectionId: string; kind: "grade" | "submit" | "reopen" | "import";
  period: PeriodId | null; assessmentId: string | null; studentRowId: string | null;
  oldScore: number | null; newScore: number | null; at: string; actorId: string;
  detail?: string;
}

export interface Comment { id: string; sectionId: string; period: PeriodId | null; authorId: string; authorName: string; body: string; at: string }

export class ApiError extends Error {
  field?: string; code?: string;   // codes: PERIOD_SUBMITTED | PERIOD_LOCKED | DUPLICATE_CODE | WEIGHTS_NOT_100 | INCOMPLETE | NOT_FOUND | BAD_CREDENTIALS | FORBIDDEN
  constructor(message: string, opts?: { field?: string; code?: string }) {
    super(message);
    this.name = "ApiError";
    if (opts?.field !== undefined) this.field = opts.field;
    if (opts?.code !== undefined) this.code = opts.code;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Api surface (spec §3.2). Implemented by `src/api/local.ts`, exported as the
// singleton `api` from `src/api/index.ts`. All methods async. Role scoping is
// inside the implementation: professor sees/writes only rows under their own
// courses; admin reads everything and may only `comment` / `updateProfile`.
// Mutations on admin-owned scope throw ApiError with code "FORBIDDEN".
// ─────────────────────────────────────────────────────────────────────────────

export interface Api {
  // auth / session
  signIn(email: string, password: string): Promise<Profile>;              // ApiError BAD_CREDENTIALS
  signOut(): Promise<void>;
  getSession(): Promise<Profile | null>;
  // Registration by emailed code: request a one-time code, then exchange it
  // for a session (and, on the Supabase backend, a professor profile row).
  requestRegistrationCode(email: string): Promise<void>;
  completeRegistration(input: { email: string; code: string; name: string; department: string }): Promise<Profile>;
  updateProfile(id: string, patch: Partial<Pick<Profile, "name" | "department" | "bio">>): Promise<Profile>;

  // reads
  listTerms(): Promise<Term[]>;
  listCourses(term: Term): Promise<Course[]>;
  getCourse(id: string): Promise<Course | null>;
  listSections(courseId: string): Promise<Section[]>;
  getSection(id: string): Promise<Section | null>;
  listAssessments(sectionId: string, period: PeriodId): Promise<Assessment[]>;
  listStudents(sectionId: string): Promise<Student[]>;
  listGrades(sectionId: string): Promise<Grade[]>;
  listHistory(sectionId: string, limit?: number): Promise<HistoryEntry[]>;   // newest first
  listComments(sectionId: string): Promise<Comment[]>;                       // newest first
  getSectionProgress(sectionId: string): Promise<PeriodProgress[]>;          // always all 4, PERIODS order
  getTermOverview(term: Term): Promise<SectionOverview[]>;
  getDeleteImpact(kind: "course" | "section", id: string): Promise<DeleteImpact>;

  // writes
  createCourse(input: { code: string; title: string; academicYear: string; semester: 1 | 2 }): Promise<Course>;  // DUPLICATE_CODE, field:"code"
  updateCourse(id: string, patch: Partial<Pick<Course, "code" | "title">>): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  createSection(courseId: string, input: { name: string; schedule: string; room: string; copyFromSectionId?: string | null }): Promise<Section>;
  updateSection(id: string, patch: Partial<Pick<Section, "name" | "schedule" | "room" | "displayScale" | "scaleTable" | "enforceOrder" | "unlockedPeriods">>): Promise<Section>;
  deleteSection(id: string): Promise<void>;
  setAssessments(sectionId: string, period: PeriodId, defs: { id?: string; name: string; maxScore: number; weight: number | null; group?: string | null }[]): Promise<Assessment[]>;
  addStudents(sectionId: string, students: { name: string; studentNo?: string }[]): Promise<{ added: number; duplicates: string[] }>;
  removeStudent(sectionId: string, studentRowId: string): Promise<void>;
  setGrade(sectionId: string, assessmentId: string, studentRowId: string, score: number | null): Promise<Grade>;
  importCsv(sectionId: string, period: PeriodId, rows: { studentKey: string; scores: Record<string, number | null> }[]): Promise<{ applied: number; skipped: number; skippedKeys: string[] }>;
  submitPeriod(sectionId: string, period: PeriodId): Promise<PeriodState>;   // INCOMPLETE if not 100% graded
  reopenPeriod(sectionId: string, period: PeriodId): Promise<PeriodState>;
  setWeights(sectionId: string, weights: Record<PeriodId, number>): Promise<Section>;  // WEIGHTS_NOT_100
  comment(sectionId: string, input: { period: PeriodId | null; body: string }): Promise<Comment>;

  resetDemoData(): Promise<void>;   // reseed localStorage, keep session user if still present
}
