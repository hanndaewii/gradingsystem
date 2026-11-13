// ─────────────────────────────────────────────────────────────────────────────
// Shared domain contracts (spec §3.1 + §3.2) — canonical, dependency-free.
// NOTE (D1): grades and history reference `studentRowId` (= Student.id, the row
// PK). `studentNo` is the institutional ID and the CSV/duplicate key. The token
// `studentId` must never be used for a Student anywhere.
// ─────────────────────────────────────────────────────────────────────────────

export type Role = "professor" | "admin";
export type PeriodId = "prelim" | "midterm" | "semifinals" | "finals";
/** not_started → draft → submitted → approved. "approved" is the department
 *  head's sign-off: final for the professor, and only the head can undo it. */
export type PeriodStatus = "not_started" | "draft" | "submitted" | "approved";
export type DisplayScale = "percent-letter" | "scale5";

export const PERIODS: PeriodId[] = ["prelim", "midterm", "semifinals", "finals"];
export const PERIOD_LABELS: Record<PeriodId, string> = {
  prelim: "Prelim", midterm: "Midterm", semifinals: "Semi-Finals", finals: "Finals",
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

export interface PeriodState {
  status: PeriodStatus;
  submittedAt: string | null;
  /** When the department head approved it (null until then). */
  approvedAt?: string | null;
}

/** 'p' present, 'a' absent, 'l' late. */
export type AttendanceStatus = "p" | "a" | "l";

/** One student's attendance for one class date. */
export interface AttendanceRow {
  sectionId: string;
  studentRowId: string;
  period: PeriodId;
  /** The class date the mark belongs to (YYYY-MM-DD). */
  sessionDate: string;
  status: AttendanceStatus;
  updatedAt: string;
}

/** The result of saving one attendance mark. */
export interface AttendanceSave {
  /** Every attendance mark in the section (after the save). */
  rows: AttendanceRow[];
  /** The Attendance criterion's score for this student in this period. */
  score: number | null;
  /** The Attendance criterion that carries the score (null when there is none). */
  assessmentId: string | null;
}

/** Each term's window in the school calendar. */
export type TermDates = Record<PeriodId, { startDate: string | null; endDate: string | null }>;

/** A group of marks that would move from one term to another. */
export interface TermDateMove {
  from: PeriodId;
  to: PeriodId;
  count: number;
}

/** A milestone on the section calendar: classes started, exam, holiday, note. */
export interface CalendarEvent {
  id: string;
  sectionId: string;
  period: PeriodId;
  /** YYYY-MM-DD */
  eventDate: string;
  kind: "start" | "exam" | "holiday" | "event";
  label: string;
}

export interface PeriodProgress {
  period: PeriodId; status: PeriodStatus; submittedAt: string | null;
  /** Set once the department head has approved the period. */
  approvedAt?: string | null;
  gradedCells: number; totalCells: number; complete: boolean;
  perAssessment: Record<string, boolean>;    // assessmentId -> fully graded
  periodGrade: number | null;                // section average % for this period
  lastGradeUpdateAt: string | null;
  /** The term's window has passed and this period is not submitted yet. */
  overdue?: boolean;
  /** The date the term's window closes (null when no window is set). */
  endedAt?: string | null;
}

export interface SectionOverview {
  section: Section; course: Course; professorName: string; studentCount: number;
  periods: PeriodProgress[]; classAverage: number | null; lastSubmitAt: string | null;
}

export interface DeleteImpact { sections: number; students: number; grades: number }

export interface HistoryEntry {
  id: string; sectionId: string;
  kind: "grade" | "submit" | "reopen" | "import" | "approve" | "unlock";
  period: PeriodId | null; assessmentId: string | null; studentRowId: string | null;
  oldScore: number | null; newScore: number | null; at: string; actorId: string;
  detail?: string;
}

export interface Comment { id: string; sectionId: string; period: PeriodId | null; authorId: string; authorName: string; body: string; at: string }

export class ApiError extends Error {
  field?: string; code?: string;   // codes: PERIOD_SUBMITTED | PERIOD_APPROVED | PERIOD_LOCKED | PERIOD_STATE | DUPLICATE_CODE | WEIGHTS_NOT_100 | INCOMPLETE | NOT_FOUND | BAD_CREDENTIALS | FORBIDDEN
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
  /** Role-scoped sign-in: the same email can hold a professor password and a
   *  department-head password; the role chosen here is the one that applies
   *  for this session. */
  signInWithRole(email: string, password: string, role: "professor" | "admin"): Promise<Profile>;
  signOut(): Promise<void>;
  getSession(): Promise<Profile | null>;
  // Registration by emailed code: request a one-time code, then exchange it
  // for a session (and, on the Supabase backend, a professor profile row).
  requestRegistrationCode(email: string): Promise<void>;
  completeRegistration(input: { email: string; code: string; name: string; department: string }): Promise<Profile>;
  /** Sets a password for the signed-in user (right after registration, so the
   *  professor signs in with email + password from then on). */
  setPassword(password: string): Promise<void>;
  /** Attendance: list the marks for a section, and set/clear one mark. Setting a
   *  mark also encodes it into the "Attendance" criterion's score. */
  listAttendance(sectionId: string): Promise<AttendanceRow[]>;
  setAttendance(
    sectionId: string,
    period: PeriodId,
    studentRowId: string,
    sessionDate: string,
    status: AttendanceStatus | null,
  ): Promise<AttendanceSave>;
  /** Calendar milestones: when classes started, when the exam is, other notes. */
  listCalendarEvents(sectionId: string): Promise<CalendarEvent[]>;
  setCalendarEvent(
    sectionId: string,
    event: {
      period: PeriodId;
      eventDate: string;
      kind: CalendarEvent["kind"];
      label: string;
    },
  ): Promise<CalendarEvent[]>;
  /** Removes a calendar milestone. */
  clearCalendarEvent(sectionId: string, eventDate: string): Promise<CalendarEvent[]>;
  /** The school calendar: each term's own start and end date. A class date
   *  belongs to the first term whose window contains it. */
  listTermDates(sectionId: string): Promise<TermDates>;
  /** What would move if a term's window changed (nothing is written). */
  previewTermDates(
    sectionId: string,
    period: PeriodId,
    startDate: string | null,
    endDate: string | null,
  ): Promise<TermDateMove[]>;
  /** Saves a term's window and moves the marks that now belong elsewhere. */
  setTermDates(
    sectionId: string,
    period: PeriodId,
    startDate: string | null,
    endDate: string | null,
  ): Promise<TermDateMove[]>;
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
  /** Department head only: sign off a submitted period (final for the professor). */
  approvePeriod(sectionId: string, period: PeriodId): Promise<PeriodState>;  // PERIOD_STATE if not submitted
  /** Department head only: send an approved period back to draft for corrections. */
  unlockPeriod(sectionId: string, period: PeriodId): Promise<PeriodState>;
  setWeights(sectionId: string, weights: Record<PeriodId, number>): Promise<Section>;  // WEIGHTS_NOT_100
  comment(sectionId: string, input: { period: PeriodId | null; body: string }): Promise<Comment>;

  resetDemoData(): Promise<void>;   // reseed localStorage, keep session user if still present
}
