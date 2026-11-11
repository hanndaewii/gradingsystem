// createSupabaseApi — the Supabase-backed implementation of the `Api`
// interface (src/types.ts). Mirrors the behaviour and ApiError codes of the
// localStorage reference implementation (`./local.ts`), with Postgres RLS as
// the source of truth for scoping:
//   • professor: full read/write on rows under courses.professor_id = auth.uid()
//   • admin: SELECT on everything; INSERT on comments; own profile only
//   • unauthenticated: nothing
// Every table lives in the dedicated `faculty` schema (this project's `public`
// schema holds an unrelated grading system — never touch it), so EVERY table
// query goes through `.schema("faculty")`.
//
// Column bridge (snake_case → camelCase in src/types.ts):
//   academic_year→academicYear · student_no→studentNo · max_score→maxScore ·
//   group_key→group · period_weights/scale_table jsonb→objects ·
//   unlocked_periods text[]→PeriodId[] · grades.student_id→Grade.studentRowId ·
//   grade_history.student_id→HistoryEntry.studentRowId · actor_id→actorId
//
// Error mapping: 23505→DUPLICATE_CODE · 42501→FORBIDDEN · trigger message
// "PERIOD_SUBMITTED…"→PERIOD_SUBMITTED (friendly pre-checks mirror local.ts).
import { type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import { requireSupabase } from "./client";
import { ApiError, PERIODS } from "../types";
import { verifyCredential } from "./adminApi";
import type {
  Api, Assessment, AttendanceRow, AttendanceStatus, CalendarEvent, Comment, Course, Grade,
  HistoryEntry, PeriodId,
  PeriodProgress, PeriodState, Profile, ScaleRow, Section, SectionOverview,
  Student, Term,
} from "../types";
import { buildPeriodProgress, classAveragePct, isPeriodEditable } from "../lib/grades";
import { clampScore, DEFAULT_SCALE_TABLE } from "../lib/format";

// ── env (browser-safe publishable key; see .env / .env.example) ─────────────
const ENV = import.meta.env as Record<string, string | undefined>;
const SUPABASE_URL = ENV.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = ENV.VITE_SUPABASE_ANON_KEY;
// Our tables live in `public` with a `faculty_` prefix (the project's own
// grading system keeps the unprefixed names), so PostgREST serves them
// out of the box with no "exposed schemas" change.
const TABLE_PREFIX = "faculty_";

// ── raw row shapes (snake_case, as PostgREST returns them) ──────────────────
interface ProfileRow { id: string; email: string; name: string; department?: string | null; bio?: string | null; role: string }
interface TermRow { id: string; academic_year: string; semester: number }
interface CourseRow { id: string; professor_id: string; term_id: string; code: string; title: string; created_at: string }
interface SectionRow {
  id: string; course_id: string; name: string; schedule?: string | null; room?: string | null;
  display_scale?: string | null; scale_table?: unknown; period_weights?: unknown;
  enforce_order?: boolean | null; unlocked_periods?: unknown; created_at: string;
}
interface PeriodRow { id: string; section_id?: string; period: string; status: string; submitted_at: string | null }
interface AssessmentRow {
  id: string; section_id: string; period_id: string; name: string;
  max_score: number | string; weight: number | string | null;
  group_key?: string | null; order?: number | null;
}
interface StudentRow { id: string; section_id: string; student_no: string; name: string }
interface GradeRow {
  id: string; section_id: string; assessment_id: string; student_id: string;
  score: number | string | null; updated_at: string;
}
interface HistoryRow {
  id: string; section_id: string; kind: string; period: string | null; assessment_id: string | null;
  student_id: string | null; old_score: number | string | null; new_score: number | string | null;
  at: string; actor_id: string | null; detail?: string | null;
}
interface CommentRow { id: string; section_id: string; period: string | null; author_id: string; body: string; at: string; author?: { name?: string | null } | null }
interface AttendanceDbRow {
  section_id: string; student_id: string; period: string; session_date: string;
  status: string; updated_at: string;
}
interface CalendarEventRow {
  id: string; section_id: string; period: string; event_date: string; kind: string; label: string;
}

// ── pure helpers (module scope) ──────────────────────────────────────────────

/** Normalize a PostgREST timestamp to a stable "Z" ISO string. */
function normTs(v: string): string {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toISOString();
}

/** numeric columns may arrive as number or string — always land on number. */
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asPeriod(v: unknown): PeriodId | null {
  return typeof v === "string" && (PERIODS as readonly string[]).includes(v) ? (v as PeriodId) : null;
}

function asStatus(v: unknown): PeriodState["status"] {
  return v === "submitted" ? "submitted" : v === "draft" ? "draft" : "not_started";
}

function asKind(v: string): HistoryEntry["kind"] {
  return v === "submit" || v === "reopen" || v === "import" ? v : "grade";
}

function notStarted(): PeriodState {
  return { status: "not_started", submittedAt: null };
}

function mapProfile(r: ProfileRow): Profile {
  return {
    id: r.id, email: r.email, password: "",   // demo-only field — auth owns credentials
    name: r.name, department: r.department ?? "", bio: r.bio ?? "",
    role: r.role === "admin" ? "admin" : "professor",
  };
}

/** scale_table jsonb → ScaleRow[]; falls back to the pinned default scale. */
function scaleTableOf(v: unknown): ScaleRow[] {
  const rows: ScaleRow[] = [];
  if (Array.isArray(v)) {
    for (const item of v) {
      if (item == null || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      rows.push({ minPct: num(o.minPct), letter: typeof o.letter === "string" ? o.letter : "", grade5: num(o.grade5) });
    }
  }
  return rows.length > 0 ? rows : DEFAULT_SCALE_TABLE.map((r) => ({ ...r }));
}

/** period_weights jsonb → Record<PeriodId, number>; missing keys default to 25. */
function weightsOf(v: unknown): Record<PeriodId, number> {
  const out: Record<PeriodId, number> = { prelim: 25, midterm: 25, semifinals: 25, finals: 25 };
  if (v != null && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const p of PERIODS) {
      const raw = o[p];
      if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) out[p] = raw;
    }
  }
  return out;
}

/** unlocked_periods text[] → PeriodId[] (unknown entries dropped). */
function periodListOf(v: unknown): PeriodId[] {
  if (!Array.isArray(v)) return [];
  return v.filter((p): p is PeriodId => asPeriod(p) != null);
}

function mapCourseRow(r: CourseRow, term: { academicYear: string; semester: 1 | 2 }): Course {
  return {
    id: r.id, professorId: r.professor_id, academicYear: term.academicYear, semester: term.semester,
    code: r.code, title: r.title, createdAt: normTs(r.created_at),
  };
}

function mapSection(r: SectionRow): Section {
  return {
    id: r.id, courseId: r.course_id, name: r.name, schedule: r.schedule ?? "", room: r.room ?? "",
    displayScale: r.display_scale === "scale5" ? "scale5" : "percent-letter",
    scaleTable: scaleTableOf(r.scale_table),
    periodWeights: weightsOf(r.period_weights),
    enforceOrder: r.enforce_order !== false,
    unlockedPeriods: periodListOf(r.unlocked_periods),
    createdAt: normTs(r.created_at),
  };
}

function mapStudent(r: StudentRow): Student {
  return { id: r.id, sectionId: r.section_id, studentNo: r.student_no, name: r.name };
}

function mapGrade(r: GradeRow): Grade {
  return {
    id: r.id, sectionId: r.section_id, assessmentId: r.assessment_id,
    studentRowId: r.student_id, score: r.score == null ? null : num(r.score), updatedAt: normTs(r.updated_at),
  };
}

function mapHistory(r: HistoryRow): HistoryEntry {
  return {
    id: r.id, sectionId: r.section_id, kind: asKind(r.kind), period: asPeriod(r.period),
    assessmentId: r.assessment_id, studentRowId: r.student_id,
    oldScore: r.old_score == null ? null : num(r.old_score),
    newScore: r.new_score == null ? null : num(r.new_score),
    at: normTs(r.at), actorId: r.actor_id ?? "", detail: r.detail ?? undefined,
  };
}

function mapAssessment(r: AssessmentRow, period: PeriodId): Assessment {
  return {
    id: r.id, sectionId: r.section_id, period, name: r.name,
    maxScore: num(r.max_score), weight: r.weight == null ? null : num(r.weight),
    group: r.group_key ?? null, order: r.order == null ? 0 : num(r.order),
  };
}

/** periods rows → the PeriodState map the grading lib expects (defaults fill gaps). */
function statesFromRows(rows: PeriodRow[]): Record<PeriodId, PeriodState> {
  const out: Record<PeriodId, PeriodState> = {
    prelim: notStarted(), midterm: notStarted(), semifinals: notStarted(), finals: notStarted(),
  };
  for (const r of rows) {
    const p = asPeriod(r.period);
    if (p) out[p] = { status: asStatus(r.status), submittedAt: r.submitted_at ? normTs(r.submitted_at) : null };
  }
  return out;
}

function stateOf(rows: PeriodRow[], period: PeriodId): PeriodState {
  const r = rows.find((x) => asPeriod(x.period) === period);
  return r ? { status: asStatus(r.status), submittedAt: r.submitted_at ? normTs(r.submitted_at) : null } : notStarted();
}

function groupBy<K, V>(pairs: [K, V][]): Map<K, V[]> {
  const m = new Map<K, V[]>();
  for (const [k, v] of pairs) {
    const arr = m.get(k);
    if (arr) arr.push(v);
    else m.set(k, [v]);
  }
  return m;
}

// ─────────────────────────────────────────────────────────────────────────────
export function createSupabaseApi(): Api {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new ApiError("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — cannot start the Supabase API.");
  }
  const supabase: SupabaseClient = requireSupabase();

  /** Every table lives in the `faculty` schema — this is the ONLY door in. */
  const tbl = (name: string) => supabase.from(`${TABLE_PREFIX}${name}`);

  // ── error mapping ─────────────────────────────────────────────────────────
  const mapDbError = (err: PostgrestError, fallback: string): ApiError => {
    if (err.message.includes("PERIOD_SUBMITTED")) {
      return new ApiError("This period is submitted — reopen it before making changes.", { code: "PERIOD_SUBMITTED" });
    }
    if (err.message.includes("JWT")) {
      return new ApiError("Your session has expired — sign in again.", { code: "FORBIDDEN" });
    }
    if (err.code === "42501") {   // row-level-security denial
      return new ApiError(err.message, { code: "FORBIDDEN" });
    }
    return new ApiError(err.message || fallback);
  };
  const duplicateCode = (err: PostgrestError): boolean => err.code === "23505";
  const gradeWriteError = (err: PostgrestError): ApiError => mapDbError(err, "Could not save the grade.");

  // ── query result helpers ──────────────────────────────────────────────────
  const list = async <T>(p: PromiseLike<{ data: unknown; error: PostgrestError | null }>, fallback: string): Promise<T[]> => {
    const { data, error } = await p;
    if (error) throw mapDbError(error, fallback);
    return (data ?? []) as T[];
  };
  const single = async <T>(p: PromiseLike<{ data: unknown; error: PostgrestError | null }>, fallback: string): Promise<T | null> => {
    const { data, error } = await p;
    if (error) throw mapDbError(error, fallback);
    return (data ?? null) as T | null;
  };
  const exec = async (p: PromiseLike<{ error: PostgrestError | null }>, fallback: string): Promise<void> => {
    const { error } = await p;
    if (error) throw mapDbError(error, fallback);
  };
  const firstRow = <T>(data: unknown): T | undefined => ((data ?? []) as T[])[0];

  // ── auth / scoping helpers ────────────────────────────────────────────────
  const fetchProfileRow = (id: string): Promise<ProfileRow | null> =>
    single<ProfileRow>(tbl("profiles").select("*", { count: "estimated" }).eq("id", id).maybeSingle(), "Could not load the profile.");

  const actor = async (): Promise<Profile> => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) throw new ApiError("You are not signed in.", { code: "FORBIDDEN" });
    const row = await fetchProfileRow(uid);
    if (!row) throw new ApiError("No profile for this account.", { code: "FORBIDDEN" });
    return mapProfile(row);
  };

  // Ownership is by course.professor_id — the department head may also teach,
  // so an admin who creates a course owns it (and can grade it) like anyone else.
  const isOwner = (course: CourseRow, user: Profile): boolean => course.professor_id === user.id;
  const canRead = (course: CourseRow, user: Profile): boolean => user.role === "admin" || isOwner(course, user);

  const fetchCourseRow = (id: string): Promise<CourseRow | null> =>
    single<CourseRow>(tbl("courses").select("*", { count: "estimated" }).eq("id", id).maybeSingle(), "Could not load the course.");

  const fetchSectionRow = (id: string): Promise<SectionRow | null> =>
    single<SectionRow>(tbl("sections").select("*", { count: "estimated" }).eq("id", id).maybeSingle(), "Could not load the section.");

  const fetchPeriodRows = (sectionId: string): Promise<PeriodRow[]> =>
    list<PeriodRow>(
      tbl("periods").select("id, period, status, submitted_at", { count: "estimated" }).eq("section_id", sectionId),
      "Could not load the period states.",
    );

  const fetchTermRow = (id: string): Promise<TermRow | null> =>
    single<TermRow>(tbl("terms").select("*", { count: "estimated" }).eq("id", id).maybeSingle(), "Could not load the term.");

  const resolveTermRow = (academicYear: string, semester: 1 | 2): Promise<TermRow | null> =>
    single<TermRow>(
      tbl("terms").select("*", { count: "estimated" }).eq("academic_year", academicYear).eq("semester", semester).maybeSingle(),
      "Could not load the term.",
    );

  /** Resolve a term, creating it on demand (terms are shared calendar data). */
  const ensureTermRow = async (academicYear: string, semester: 1 | 2): Promise<TermRow> => {
    const existing = await resolveTermRow(academicYear, semester);
    if (existing) return existing;
    const { data, error } = await tbl("terms")
      .upsert({ academic_year: academicYear, semester }, { onConflict: "academic_year,semester" })
      .select("*")
      .single();
    if (error) throw new ApiError("Could not create that term.", { code: "FORBIDDEN" });
    return data as TermRow;
  };

  const termOf = async (termId: string): Promise<{ academicYear: string; semester: 1 | 2 }> => {
    const row = await fetchTermRow(termId);
    if (!row) throw new ApiError("Term not found.", { code: "NOT_FOUND" });
    return { academicYear: row.academic_year, semester: row.semester === 2 ? 2 : 1 };
  };

  /** Resolve a section the actor may READ; null when foreign or unknown. */
  const readableSection = async (sectionId: string, user: Profile): Promise<Section | null> => {
    const secRow = await fetchSectionRow(sectionId);
    if (!secRow) return null;
    const course = await fetchCourseRow(secRow.course_id);
    if (!course || !canRead(course, user)) return null;
    return mapSection(secRow);
  };

  /** Resolve a section the actor may WRITE (professor + owner) or throw. */
  const ownedSection = async (sectionId: string, user: Profile): Promise<Section> => {
    const secRow = await fetchSectionRow(sectionId);
    const course = secRow ? await fetchCourseRow(secRow.course_id) : null;
    if (!secRow || !course) throw new ApiError("Section not found.", { code: "NOT_FOUND" });
    if (!isOwner(course, user)) {
      throw new ApiError("Only the section's professor can do that.", { code: "FORBIDDEN" });
    }
    return mapSection(secRow);
  };

  /** Risk 5 — submitted/locked enforcement mirrors local.ts exactly. */
  const assertEditable = (section: Section, period: PeriodId, rows: PeriodRow[]): void => {
    const state = stateOf(rows, period);
    if (state.status === "submitted") {
      throw new ApiError("This period is submitted — reopen it before making changes.", { code: "PERIOD_SUBMITTED" });
    }
    if (!isPeriodEditable({ section, states: statesFromRows(rows), period })) {
      throw new ApiError(
        `${period.charAt(0).toUpperCase()}${period.slice(1)} is locked — submit earlier periods first or unlock it manually.`,
        { code: "PERIOD_LOCKED" },
      );
    }
  };

  /** The periods row for (section, period) — created on demand when missing. */
  const ensurePeriodRow = async (sectionId: string, period: PeriodId): Promise<PeriodRow> => {
    const rows = await fetchPeriodRows(sectionId);
    const found = rows.find((r) => asPeriod(r.period) === period);
    if (found) return found;
    const row = await single<PeriodRow>(
      tbl("periods").insert({ section_id: sectionId, period }).select("id, period, status, submitted_at").single(),
      "Could not create the period row.",
    );
    if (!row) throw new ApiError("Could not create the period row.");
    return row;
  };

  const pushHistory = async (entry: {
    sectionId: string; kind: HistoryEntry["kind"]; period: PeriodId | null; assessmentId: string | null;
    studentRowId: string | null; oldScore: number | null; newScore: number | null; at: string; actorId: string; detail?: string;
  }): Promise<void> => {
    await exec(
      tbl("grade_history").insert({
        section_id: entry.sectionId, kind: entry.kind, period: entry.period, assessment_id: entry.assessmentId,
        student_id: entry.studentRowId, old_score: entry.oldScore, new_score: entry.newScore,
        at: entry.at, actor_id: entry.actorId, detail: entry.detail ?? null,
      }),
      "Could not record history.",
    );
  };

  /** Progress for all four periods from pre-fetched rows (grading lib does the math). */
  const buildProgress = (
    students: Student[], assessmentRows: AssessmentRow[], grades: Grade[], periodRows: PeriodRow[],
  ): PeriodProgress[] => {
    const periodById = new Map(periodRows.map((r): [string, PeriodId | null] => [r.id, asPeriod(r.period)]));
    const assessments = assessmentRows.flatMap((r) => {
      const p = periodById.get(r.period_id);
      return p ? [mapAssessment(r, p)] : [];
    });
    const states = statesFromRows(periodRows);
    return PERIODS.map((period) => buildPeriodProgress({ period, students, assessments, grades, state: states[period] }));
  };

  // ── attendance ────────────────────────────────────────────────────────────
  const attendanceRowsFor = async (sectionId: string): Promise<AttendanceRow[]> => {
    const rows = await list<AttendanceDbRow>(
      tbl("attendance")
        .select("section_id, student_id, period, session_date, status, updated_at")
        .eq("section_id", sectionId),
      "Could not load attendance.",
    );
    return rows
      .map((r) => ({
        sectionId: r.section_id,
        studentRowId: r.student_id,
        period: asPeriod(r.period),
        sessionDate: r.session_date,
        status: r.status as AttendanceStatus,
        updatedAt: normTs(r.updated_at),
      }))
      .filter((r): r is AttendanceRow => r.period !== null);
  };

  /** Postgres reports a raised exception as a message; keep it readable. */
  const attendanceErrorMessage = (raw: string): string => {
    const text = raw.replace(/\s+/g, " ").trim();
    return text.length > 0 ? text : "Could not save the attendance mark.";
  };

  const calendarEventsFor = async (sectionId: string): Promise<CalendarEvent[]> => {
    const rows = await list<CalendarEventRow>(
      tbl("calendar_events")
        .select("id, section_id, period, event_date, kind, label")
        .eq("section_id", sectionId),
      "Could not load the calendar.",
    );
    return rows
      .map((r) => ({
        id: r.id,
        sectionId: r.section_id,
        period: asPeriod(r.period),
        eventDate: r.event_date,
        kind: (r.kind as CalendarEvent["kind"]) ?? "event",
        label: r.label ?? "",
      }))
      .filter((r): r is CalendarEvent => r.period !== null);
  };

  const api: Api = {
    // ── auth / session ───────────────────────────────────────────────────────
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new ApiError("Email or password is incorrect.", { code: "BAD_CREDENTIALS" });
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new ApiError("Email or password is incorrect.", { code: "BAD_CREDENTIALS" });
      const row = await fetchProfileRow(uid);
      if (!row) {
        throw new ApiError("No profile for this account. Ask the department head to provision your faculty profile.", { code: "FORBIDDEN" });
      }
      return mapProfile(row);
    },

    /** Role-scoped sign-in — the email may hold a professor password and a
     *  department-head password; the Worker verifies the one for the role
     *  chosen on the login screen and mints the session. */
    async signInWithRole(email, password, role) {
      try {
        const { token_hash } = await verifyCredential({ email: email.trim(), password, role });
        const { data: otp, error: otpError } = await supabase.auth.verifyOtp({
          token_hash,
          type: "magiclink",
        });
        if (otpError || !otp.session) {
          throw new ApiError("Email or password is incorrect.", { code: "BAD_CREDENTIALS" });
        }
        // verifyOtp leaves the session in memory only (implicit flow), so a
        // page refresh would sign the user out. Persist it explicitly.
        await supabase.auth.setSession({
          access_token: otp.session.access_token,
          refresh_token: otp.session.refresh_token,
        });
      } catch (err) {
        if (err instanceof ApiError) throw err;
        // A credential problem (wrong password / wrong role) is reported
        // verbatim; only a network failure falls back to plain Supabase sign-in.
        const status = (err as { status?: number }).status;
        if (status === 401 || status === 400) {
          throw new ApiError(err instanceof Error ? err.message : "Email or password is incorrect.", {
            code: "BAD_CREDENTIALS",
          });
        }
        return api.signIn(email, password);
      }
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new ApiError("Email or password is incorrect.", { code: "BAD_CREDENTIALS" });
      const row = await fetchProfileRow(uid);
      if (!row) {
        throw new ApiError(
          "Your account has no faculty profile yet — ask the department head to add you.",
          { code: "FORBIDDEN" },
        );
      }
      return mapProfile(row);
    },

    async setPassword(password) {
      if (!password || password.length < 8) {
        throw new ApiError("Use a password of at least 8 characters.", { field: "password" });
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new ApiError(error.message || "Could not set your password.", { field: "password" });
    },

    async listAttendance(sectionId) {
      const user = await actor();
      const section = await readableSection(sectionId, user);
      if (!section) throw new ApiError("Section not found.", { code: "NOT_FOUND" });
      return attendanceRowsFor(sectionId);
    },

    async setAttendance(sectionId, period, studentRowId, sessionDate, status) {
      // One round trip: the database stores the mark, re-averages the
      // Attendance criterion over the MARKED days (a blank day never counts
      // as absent), writes the score and records the history.
      const { data, error } = await supabase.rpc("faculty_set_attendance", {
        p_section_id: sectionId,
        p_student_id: studentRowId,
        p_period: period,
        p_session_date: sessionDate,
        p_status: status,
      });
      if (error) throw new ApiError(attendanceErrorMessage(error.message));
      const payload = (data ?? {}) as {
        score: number | null;
        assessment_id: string | null;
        rows: AttendanceRow[];
      };
      return {
        rows: (payload.rows ?? []).map((r) => ({
          ...r,
          period: asPeriod(r.period) ?? r.period,
          status: r.status as AttendanceStatus,
        })),
        score: payload.score == null ? null : Number(payload.score),
        assessmentId: payload.assessment_id ?? null,
      };
    },

    async listCalendarEvents(sectionId) {
      const user = await actor();
      const section = await readableSection(sectionId, user);
      if (!section) throw new ApiError("Section not found.", { code: "NOT_FOUND" });
      return calendarEventsFor(sectionId);
    },

    async clearCalendarEvent(sectionId, eventDate) {
      const user = await actor();
      const section = await ownedSection(sectionId, user);
      const periodRows = await fetchPeriodRows(sectionId);
      const existing = await single<CalendarEventRow>(
        tbl("calendar_events")
          .select("id, section_id, period, event_date, kind, label")
          .eq("section_id", sectionId)
          .eq("event_date", eventDate)
          .maybeSingle(),
        "Could not load the calendar entry.",
      );
      if (existing) {
        assertEditable(section, asPeriod(existing.period) ?? "prelim", periodRows);
        await exec(
          tbl("calendar_events").delete().eq("section_id", sectionId).eq("event_date", eventDate),
          "Could not remove the calendar entry.",
        );
      }
      return calendarEventsFor(sectionId);
    },

    async setCalendarEvent(sectionId, event) {
      const user = await actor();
      const section = await ownedSection(sectionId, user);
      const periodRows = await fetchPeriodRows(sectionId);
      assertEditable(section, event.period, periodRows);
      const at = new Date().toISOString();
      const payload = {
        section_id: sectionId,
        period: event.period,
        event_date: event.eventDate,
        kind: event.kind,
        label: event.label.trim(),
        updated_at: at,
      };
      const existing = await single<CalendarEventRow>(
        tbl("calendar_events")
          .select("id, section_id, period, event_date, kind, label")
          .eq("section_id", sectionId)
          .eq("event_date", event.eventDate)
          .maybeSingle(),
        "Could not load the calendar entry.",
      );
      if (existing) {
        await exec(
          tbl("calendar_events").update(payload).eq("id", existing.id),
          "Could not save the calendar entry.",
        );
      } else {
        await exec(tbl("calendar_events").insert(payload), "Could not save the calendar entry.");
      }
      return calendarEventsFor(sectionId);
    },

    async signOut() {
      await supabase.auth.signOut();
    },

    // ── registration by emailed code (Supabase Auth OTP) ────────────────────
    async requestRegistrationCode(email) {
      const address = email.trim().toLowerCase();
      if (!address) throw new ApiError("Email is required.", { field: "email" });
      const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
      const { error } = await supabase.auth.signInWithOtp({
        email: address,
        options: { shouldCreateUser: true, ...(redirectTo ? { emailRedirectTo: redirectTo } : {}) },
      });
      if (error) {
        // Rate limits and SMTP misconfiguration both land here.
        const rateLimited = error.message.toLowerCase().includes("rate");
        throw new ApiError(
          rateLimited
            ? "Email codes are unavailable right now — your college's mail service can only send a few codes per hour. The department head can add your account for you instead (no code needed)."
            : "We could not send the code. Please try again in a moment.",
          { code: "BAD_CREDENTIALS", field: "email" },
        );
      }
    },

    async completeRegistration({ email, code, name, department }) {
      const address = email.trim().toLowerCase();
      const token = code.trim();
      if (!address) throw new ApiError("Email is required.", { field: "email" });
      if (!token) throw new ApiError("Enter the code we emailed you.", { field: "code" });
      if (!name.trim()) throw new ApiError("Name is required.", { field: "name" });
      if (!department.trim()) throw new ApiError("Department is required.", { field: "department" });

      const { data, error } = await supabase.auth.verifyOtp({
        email: address,
        token,
        type: "email",
      });
      if (error || !data.user) {
        throw new ApiError("That code is not valid or has expired.", { code: "BAD_CREDENTIALS", field: "code" });
      }
      const uid = data.user.id;

      // A self-registered professor gets their own profile row (RLS allows a
      // user to insert only their own row). The department head can rename or
      // re-role them later.
      const existing = await fetchProfileRow(uid);
      if (!existing) {
        const { error: insertError } = await tbl("profiles").insert({
          id: uid,
          email: data.user.email ?? address,
          name: name.trim(),
          department: department.trim(),
          bio: "",
          role: "professor",
        });
        if (insertError) throw mapDbError(insertError, "Could not create your faculty profile.");
      }
      const row = await fetchProfileRow(uid);
      if (!row) throw new ApiError("Could not create your faculty profile.", { code: "FORBIDDEN" });
      return mapProfile(row);
    },

    async getSession() {
      // Read the stored session locally first — a network round-trip here can
      // sign the user out when the access token merely needs refreshing.
      let { data } = await supabase.auth.getSession();
      if (!data.session) {
        // Nothing usable in storage: try the refresh token once.
        const refreshed = await supabase.auth.refreshSession();
        data = refreshed.data;
      }
      if (!data.session) return null;
      const row = await fetchProfileRow(data.session.user.id);
      return row ? mapProfile(row) : null;   // stale session → signed out
    },

    async updateProfile(id, patch) {
      const user = await actor();
      if (user.id !== id) throw new ApiError("You can only edit your own profile.", { code: "FORBIDDEN" });
      const payload: Record<string, string> = {};
      if (patch.name !== undefined) {
        if (!patch.name.trim()) throw new ApiError("Name is required.", { field: "name" });
        payload.name = patch.name.trim();
      }
      if (patch.department !== undefined) {
        if (!patch.department.trim()) throw new ApiError("Department is required.", { field: "department" });
        payload.department = patch.department.trim();
      }
      if (patch.bio !== undefined) payload.bio = patch.bio;
      if (Object.keys(payload).length === 0) return user;
      const rows = await list<ProfileRow>(tbl("profiles").update(payload).eq("id", id).select("*"), "Could not update the profile.");
      const row = rows[0];
      if (!row) throw new ApiError("You can only edit your own profile.", { code: "FORBIDDEN" });
      return mapProfile(row);
    },

    // ── reads ────────────────────────────────────────────────────────────────
    async listTerms() {
      await actor();
      const rows = await list<TermRow>(
        tbl("terms").select("id, academic_year, semester").order("academic_year").order("semester"),
        "Could not load terms.",
      );
      return rows.map((r): Term => ({ academicYear: r.academic_year, semester: r.semester === 2 ? 2 : 1 }));
    },

    async listCourses(term) {
      await actor();
      const termRow = await resolveTermRow(term.academicYear, term.semester);
      if (!termRow) return [];
      const termInfo: { academicYear: string; semester: 1 | 2 } = {
        academicYear: termRow.academic_year, semester: termRow.semester === 2 ? 2 : 1,
      };
      const rows = await list<CourseRow>(
        tbl("courses").select("*", { count: "estimated" }).eq("term_id", termRow.id).order("code"),
        "Could not load courses.",
      );
      return rows.map((r) => mapCourseRow(r, termInfo));
    },

    async getCourse(id) {
      await actor();
      const row = await fetchCourseRow(id);
      if (!row) return null;
      return mapCourseRow(row, await termOf(row.term_id));
    },

    async listSections(courseId) {
      const user = await actor();
      const course = await fetchCourseRow(courseId);
      if (!course || !canRead(course, user)) return [];
      const rows = await list<SectionRow>(
        tbl("sections").select("*", { count: "estimated" }).eq("course_id", courseId).order("name"),
        "Could not load sections.",
      );
      return rows.map(mapSection);
    },

    async getSection(id) {
      const user = await actor();
      return readableSection(id, user);
    },

    async listAssessments(sectionId, period) {
      const user = await actor();
      if (!(await readableSection(sectionId, user))) return [];
      const periodRow = await single<{ id: string }>(
        tbl("periods").select("id", { count: "estimated" }).eq("section_id", sectionId).eq("period", period).maybeSingle(),
        "Could not load the period.",
      );
      if (!periodRow) return [];
      const rows = await list<AssessmentRow>(
        tbl("assessments").select("*", { count: "estimated" }).eq("section_id", sectionId).eq("period_id", periodRow.id).order("order"),
        "Could not load assessments.",
      );
      return rows.map((r) => mapAssessment(r, period));
    },

    async listStudents(sectionId) {
      const user = await actor();
      if (!(await readableSection(sectionId, user))) return [];
      const rows = await list<StudentRow>(
        tbl("students").select("*", { count: "estimated" }).eq("section_id", sectionId).order("name"),
        "Could not load students.",
      );
      return rows.map(mapStudent);
    },

    async listGrades(sectionId) {
      const user = await actor();
      if (!(await readableSection(sectionId, user))) return [];
      const rows = await list<GradeRow>(tbl("grades").select("*", { count: "estimated" }).eq("section_id", sectionId), "Could not load grades.");
      return rows.map(mapGrade);
    },

    async listHistory(sectionId, limit) {
      const user = await actor();
      if (!(await readableSection(sectionId, user))) return [];
      let req = tbl("grade_history").select("*", { count: "estimated" }).eq("section_id", sectionId).order("at", { ascending: false });
      if (limit != null) req = req.limit(limit);
      const rows = await list<HistoryRow>(req, "Could not load history.");
      return rows.map(mapHistory);
    },

    async listComments(sectionId) {
      const user = await actor();
      if (!(await readableSection(sectionId, user))) return [];
      const rows = await list<CommentRow>(
        tbl("comments").select("id, section_id, period, author_id, body, at, author:faculty_profiles(name)", { count: "estimated" })
          .eq("section_id", sectionId).order("at", { ascending: false }),
        "Could not load comments.",
      );
      return rows.map((r): Comment => ({
        id: r.id, sectionId: r.section_id, period: asPeriod(r.period),
        authorId: r.author_id, authorName: r.author?.name ?? "—", body: r.body, at: normTs(r.at),
      }));
    },

    async getSectionProgress(sectionId) {
      const user = await actor();
      const section = await readableSection(sectionId, user);
      if (!section) return [];
      const [students, assessmentRows, grades, periodRows] = await Promise.all([
        list<StudentRow>(tbl("students").select("*", { count: "estimated" }).eq("section_id", sectionId), "Could not load students."),
        list<AssessmentRow>(tbl("assessments").select("*", { count: "estimated" }).eq("section_id", sectionId), "Could not load assessments."),
        list<GradeRow>(tbl("grades").select("*", { count: "estimated" }).eq("section_id", sectionId), "Could not load grades."),
        fetchPeriodRows(sectionId),
      ]);
      return buildProgress(students.map(mapStudent), assessmentRows, grades.map(mapGrade), periodRows);
    },

    async getTermOverview(term) {
      await actor();
      const termRow = await resolveTermRow(term.academicYear, term.semester);
      if (!termRow) return [];
      const termInfo: { academicYear: string; semester: 1 | 2 } = {
        academicYear: termRow.academic_year, semester: termRow.semester === 2 ? 2 : 1,
      };
      const courseRows = await list<CourseRow>(
        tbl("courses").select("*", { count: "estimated" }).eq("term_id", termRow.id).order("code"),
        "Could not load courses.",
      );
      if (courseRows.length === 0) return [];
      const profIds = [...new Set(courseRows.map((c) => c.professor_id))];
      const profileRows = await list<{ id: string; name: string }>(
        tbl("profiles").select("id, name", { count: "estimated" }).in("id", profIds), "Could not load profiles.",
      );
      const nameById = new Map(profileRows.map((p) => [p.id, p.name]));
      const sectionRows = await list<SectionRow>(
        tbl("sections").select("*", { count: "estimated" }).in("course_id", courseRows.map((c) => c.id)).order("name"),
        "Could not load sections.",
      );
      const sectionIds = sectionRows.map((s) => s.id);
      let studentsBySection = new Map<string, Student[]>();
      let assessmentsBySection = new Map<string, Assessment[]>();
      let gradesBySection = new Map<string, Grade[]>();
      let periodRowsBySection = new Map<string, PeriodRow[]>();
      if (sectionIds.length > 0) {
        const [studentRows, assessmentRows, gradeRows, periodRows] = await Promise.all([
          list<StudentRow>(tbl("students").select("*", { count: "estimated" }).in("section_id", sectionIds), "Could not load students."),
          list<AssessmentRow>(tbl("assessments").select("*", { count: "estimated" }).in("section_id", sectionIds), "Could not load assessments."),
          list<GradeRow>(tbl("grades").select("*", { count: "estimated" }).in("section_id", sectionIds), "Could not load grades."),
          list<PeriodRow>(
            tbl("periods").select("id, section_id, period, status, submitted_at", { count: "estimated" }).in("section_id", sectionIds),
            "Could not load period states.",
          ),
        ]);
        studentsBySection = groupBy(studentRows.map((r): [string, Student] => [r.section_id, mapStudent(r)]));
        const periodRowById = new Map(periodRows.map((r): [string, PeriodRow] => [r.id, r]));
        assessmentsBySection = groupBy(
          assessmentRows.flatMap((r): [string, Assessment][] => {
            const pRow = periodRowById.get(r.period_id);
            const p = pRow ? asPeriod(pRow.period) : null;
            return p ? [[r.section_id, mapAssessment(r, p)]] : [];
          }),
        );
        gradesBySection = groupBy(gradeRows.map((r): [string, Grade] => [r.section_id, mapGrade(r)]));
        periodRowsBySection = groupBy(
          (periodRows as (PeriodRow & { section_id: string })[]).map((r): [string, PeriodRow] => [r.section_id, r]),
        );
      }
      const overview: SectionOverview[] = [];
      for (const courseRow of courseRows) {
        const course = mapCourseRow(courseRow, termInfo);
        const professorName = nameById.get(courseRow.professor_id) ?? "—";
        for (const secRow of sectionRows.filter((s) => s.course_id === courseRow.id)) {
          const section = mapSection(secRow);
          const students = studentsBySection.get(section.id) ?? [];
          const assessments = assessmentsBySection.get(section.id) ?? [];
          const grades = gradesBySection.get(section.id) ?? [];
          const states = statesFromRows(periodRowsBySection.get(section.id) ?? []);
          const periods = PERIODS.map((p) =>
            buildPeriodProgress({ period: p, students, assessments, grades, state: states[p] }),
          );
          const lastSubmitAt = periods.reduce<string | null>(
            (acc, p) => (p.submittedAt != null && (acc == null || p.submittedAt > acc) ? p.submittedAt : acc),
            null,
          );
          overview.push({
            section, course, professorName, studentCount: students.length, periods,
            classAverage: classAveragePct({ students, assessments, grades, weights: section.periodWeights }),
            lastSubmitAt,
          });
        }
      }
      return overview;
    },

    async getDeleteImpact(kind, id) {
      const user = await actor();
      let sectionIds: string[];
      if (kind === "course") {
        sectionIds = (
          await list<{ id: string }>(tbl("sections").select("id", { count: "estimated" }).eq("course_id", id), "Could not load sections.")
        ).map((s) => s.id);
        if (sectionIds.length === 0) return { sections: 0, students: 0, grades: 0 };
      } else {
        const section = await readableSection(id, user);
        if (!section) throw new ApiError("Not found.", { code: "NOT_FOUND" });
        sectionIds = [id];
      }
      const studentRows = await list<{ id: string }>(
        tbl("students").select("id", { count: "estimated" }).in("section_id", sectionIds), "Could not load students.",
      );
      const studentRowIds = studentRows.map((s) => s.id);
      const gradeRows = await list<{ id: string }>(
        tbl("grades").select("id", { count: "estimated" }).in("section_id", sectionIds), "Could not load grades.",
      );
      const gradeIds = new Set(gradeRows.map((g) => g.id));
      if (studentRowIds.length > 0) {
        const extra = await list<{ id: string }>(
          tbl("grades").select("id", { count: "estimated" }).in("student_id", studentRowIds), "Could not load grades.",
        );
        for (const g of extra) gradeIds.add(g.id);
      }
      return { sections: sectionIds.length, students: studentRows.length, grades: gradeIds.size };
    },

    // ── writes: courses ──────────────────────────────────────────────────────
    async createCourse(input) {
      const user = await actor();
      // Any signed-in account may create a course it owns — the department head
      // can teach too.
      const code = input.code.trim().toUpperCase();
      if (!code) throw new ApiError("Code is required.", { field: "code" });
      if (!input.title.trim()) throw new ApiError("Title is required.", { field: "title" });
      const termRow = await ensureTermRow(input.academicYear, input.semester);
      if (!termRow) throw new ApiError("This term does not exist yet.", { code: "NOT_FOUND" });
      const termInfo: { academicYear: string; semester: 1 | 2 } = {
        academicYear: termRow.academic_year, semester: termRow.semester === 2 ? 2 : 1,
      };
      const { data, error } = await tbl("courses").insert({
        professor_id: user.id, term_id: termRow.id, code, title: input.title.trim(),
      }).select("*").single();
      if (error) {
        if (duplicateCode(error)) {
          throw new ApiError("You already have a course with this code this semester.", { code: "DUPLICATE_CODE", field: "code" });
        }
        throw mapDbError(error, "Could not create the course.");
      }
      return mapCourseRow(data as CourseRow, termInfo);
    },

    async updateCourse(id, patch) {
      const user = await actor();
      const courseRow = await fetchCourseRow(id);
      if (!courseRow) throw new ApiError("Course not found.", { code: "NOT_FOUND" });
      if (!isOwner(courseRow, user)) throw new ApiError("Only the course owner can do that.", { code: "FORBIDDEN" });
      const payload: Record<string, string> = {};
      if (patch.code !== undefined) {
        const code = patch.code.trim().toUpperCase();
        if (!code) throw new ApiError("Code is required.", { field: "code" });
        payload.code = code;
      }
      if (patch.title !== undefined) {
        if (!patch.title.trim()) throw new ApiError("Title is required.", { field: "title" });
        payload.title = patch.title.trim();
      }
      if (Object.keys(payload).length === 0) return mapCourseRow(courseRow, await termOf(courseRow.term_id));
      const { data, error } = await tbl("courses").update(payload).eq("id", id).select("*");
      if (error) {
        if (duplicateCode(error)) {
          throw new ApiError("You already have a course with this code this semester.", { code: "DUPLICATE_CODE", field: "code" });
        }
        throw mapDbError(error, "Could not update the course.");
      }
      const row = firstRow<CourseRow>(data);
      if (!row) throw new ApiError("Course not found.", { code: "NOT_FOUND" });
      return mapCourseRow(row, await termOf(row.term_id));
    },

    async deleteCourse(id) {
      const user = await actor();
      const courseRow = await fetchCourseRow(id);
      if (!courseRow) throw new ApiError("Course not found.", { code: "NOT_FOUND" });
      if (!isOwner(courseRow, user)) throw new ApiError("Only the course owner can do that.", { code: "FORBIDDEN" });
      await exec(tbl("courses").delete().eq("id", id), "Could not delete the course.");   // cascades
    },

    async createSection(courseId, input) {
      const user = await actor();
      const courseRow = await fetchCourseRow(courseId);
      if (!courseRow) throw new ApiError("Course not found.", { code: "NOT_FOUND" });
      if (!isOwner(courseRow, user)) throw new ApiError("Only the course owner can do that.", { code: "FORBIDDEN" });
      const name = input.name.trim();
      if (!name) throw new ApiError("Section name is required.", { field: "name" });

      let source: SectionRow | null = null;
      if (input.copyFromSectionId) {
        source = await fetchSectionRow(input.copyFromSectionId);
        const sourceCourse = source ? await fetchCourseRow(source.course_id) : null;
        if (!source || !sourceCourse || !isOwner(sourceCourse, user)) {
          throw new ApiError("You can only copy from your own sections.", { code: "FORBIDDEN" });
        }
      }
      const src = source ? mapSection(source) : null;
      const { data, error } = await tbl("sections").insert({
        course_id: courseId,
        name,
        schedule: input.schedule.trim(),
        room: (input.room ?? "").trim(),
        display_scale: src?.displayScale ?? "percent-letter",
        scale_table: src ? src.scaleTable : DEFAULT_SCALE_TABLE,
        period_weights: src ? src.periodWeights : { prelim: 25, midterm: 25, semifinals: 25, finals: 25 },
        enforce_order: src ? src.enforceOrder : true,
        unlocked_periods: [],   // a fresh section starts fully in-order
      }).select("*").single();
      if (error) throw mapDbError(error, "Could not create the section.");
      const section = mapSection(data as SectionRow);

      const periodRows = await list<PeriodRow>(
        tbl("periods").insert(PERIODS.map((p) => ({ section_id: section.id, period: p })))
          .select("id, period, status, submitted_at"),
        "Could not create the period rows.",
      );

      if (source) {
        // Copy assessments (new ids, same content incl. the Total-group key)
        // and the roster. No grades, no history — periods start not_started.
        const srcPeriodRows = await fetchPeriodRows(source.id);
        const srcPeriodById = new Map(srcPeriodRows.map((r): [string, PeriodId | null] => [r.id, asPeriod(r.period)]));
        const newPeriodId = (label: PeriodId): string | null => {
          const row = periodRows.find((r) => asPeriod(r.period) === label);
          return row ? row.id : null;
        };
        const srcAssessmentRows = await list<AssessmentRow>(
          tbl("assessments").select("*", { count: "estimated" }).eq("section_id", source.id),
          "Could not load the source assessments.",
        );
        const copyAssessments = srcAssessmentRows.flatMap((r): Record<string, unknown>[] => {
          const p = srcPeriodById.get(r.period_id) ?? null;
          const newPid = p ? newPeriodId(p) : null;
          if (!newPid) return [];
          return [{
            section_id: section.id, period_id: newPid, name: r.name, max_score: num(r.max_score),
            weight: r.weight == null ? null : num(r.weight), group_key: r.group_key ?? null,
            order: r.order == null ? 0 : num(r.order),
          }];
        });
        if (copyAssessments.length > 0) {
          await exec(tbl("assessments").insert(copyAssessments), "Could not copy assessments.");
        }
        const srcStudentRows = await list<StudentRow>(
          tbl("students").select("student_no, name").eq("section_id", source.id),
          "Could not load the source roster.",
        );
        if (srcStudentRows.length > 0) {
          await exec(
            tbl("students").insert(srcStudentRows.map((r) => ({ section_id: section.id, student_no: r.student_no, name: r.name }))),
            "Could not copy the roster.",
          );
        }
      }
      return section;
    },

    async updateSection(id, patch) {
      const user = await actor();
      const secRow = await fetchSectionRow(id);
      const courseRow = secRow ? await fetchCourseRow(secRow.course_id) : null;
      if (!secRow || !courseRow) throw new ApiError("Section not found.", { code: "NOT_FOUND" });
      if (!isOwner(courseRow, user)) {
        throw new ApiError("Only the section's professor can do that.", { code: "FORBIDDEN" });
      }
      const payload: Record<string, unknown> = {};
      if (patch.name !== undefined) {
        if (!patch.name.trim()) throw new ApiError("Section name is required.", { field: "name" });
        payload.name = patch.name.trim();
      }
      if (patch.schedule !== undefined) payload.schedule = patch.schedule.trim();
      if (patch.room !== undefined) payload.room = patch.room.trim();
      if (patch.displayScale !== undefined) payload.display_scale = patch.displayScale;
      if (patch.scaleTable !== undefined) payload.scale_table = patch.scaleTable.map((r) => ({ ...r }));
      if (patch.enforceOrder !== undefined) payload.enforce_order = patch.enforceOrder;
      if (patch.unlockedPeriods !== undefined) {
        payload.unlocked_periods = PERIODS.filter((p) => patch.unlockedPeriods?.includes(p));
      }
      if (Object.keys(payload).length === 0) return mapSection(secRow);
      const { data, error } = await tbl("sections").update(payload).eq("id", id).select("*");
      if (error) throw mapDbError(error, "Could not update the section.");
      const row = firstRow<SectionRow>(data);
      if (!row) throw new ApiError("Only the section's professor can do that.", { code: "FORBIDDEN" });
      return mapSection(row);
    },

    async deleteSection(id) {
      const user = await actor();
      await ownedSection(id, user);
      await exec(tbl("sections").delete().eq("id", id), "Could not delete the section.");   // cascades
    },

    // ── writes: assessments / roster / grades ────────────────────────────────
    async setAssessments(sectionId, period, defs) {
      const user = await actor();
      await ownedSection(sectionId, user);
      for (const def of defs) {
        if (!def.name.trim()) throw new ApiError("Assessment name is required.", { field: "name" });
      }
      const periodRow = await ensurePeriodRow(sectionId, period);
      if (asStatus(periodRow.status) === "submitted") {
        throw new ApiError("This period is submitted — reopen it before editing assessments.", { code: "PERIOD_SUBMITTED" });
      }
      const existingRows = await list<AssessmentRow>(
        tbl("assessments").select("*").eq("section_id", sectionId).eq("period_id", periodRow.id),
        "Could not load assessments.",
      );
      const byId = new Map(existingRows.map((r): [string, AssessmentRow] => [r.id, r]));
      const kept = new Set<string>();
      const at = new Date().toISOString();
      for (const [index, def] of defs.entries()) {
        const name = def.name.trim();
        const target = def.id != null ? byId.get(def.id) : undefined;
        if (target) {
          // D11 — match by id: update in place, grades preserved.
          const prevMax = num(target.max_score);
          const { error } = await tbl("assessments").update({
            name, max_score: def.maxScore, weight: def.weight, group_key: def.group ?? null, order: index,
          }).eq("id", target.id);
          if (error) throw mapDbError(error, "Could not update assessments.");
          kept.add(target.id);
          if (def.maxScore < prevMax) {
            // Lowering a max re-clamps stored scores so percentages stay ≤ 100.
            await exec(
              tbl("grades").update({ score: def.maxScore, updated_at: at })
                .eq("assessment_id", target.id).gt("score", def.maxScore),
              "Could not re-clamp grades.",
            );
          }
        } else {
          const { error } = await tbl("assessments").insert({
            section_id: sectionId, period_id: periodRow.id, name, max_score: def.maxScore,
            weight: def.weight, group_key: def.group ?? null, order: index,
          });
          if (error) throw mapDbError(error, "Could not create assessments.");
        }
      }
      // Existing ids absent from defs are deleted along with their grades (cascade).
      const removedIds = existingRows.filter((r) => !kept.has(r.id)).map((r) => r.id);
      if (removedIds.length > 0) {
        await exec(tbl("assessments").delete().in("id", removedIds), "Could not remove assessments.");
      }
      const rows = await list<AssessmentRow>(
        tbl("assessments").select("*").eq("section_id", sectionId).eq("period_id", periodRow.id).order("order"),
        "Could not load assessments.",
      );
      return rows.map((r) => mapAssessment(r, period));
    },

    async addStudents(sectionId, students) {
      const user = await actor();
      await ownedSection(sectionId, user);
      const existing = await list<StudentRow>(
        tbl("students").select("*").eq("section_id", sectionId), "Could not load students.",
      );
      const seen = new Set(existing.map((s) => s.student_no.trim().toLowerCase()));
      // Students added without an ID mint a section-unique AUTO-#### number,
      // so CSV/ID matching and the uniqueness rule keep working.
      let autoSeq = 1;
      for (const s of existing) {
        const m = /^AUTO-(\d+)$/i.exec(s.student_no.trim());
        if (m) autoSeq = Math.max(autoSeq, Number(m[1]) + 1);
      }
      const duplicates: string[] = [];
      const inserts: { section_id: string; student_no: string; name: string }[] = [];
      let added = 0;
      for (const s of students) {
        const name = s.name.trim();
        let studentNo = (s.studentNo ?? "").trim();
        if (!name) {
          duplicates.push(studentNo || "(blank row)");
          continue;
        }
        if (studentNo === "") {
          while (seen.has(`auto-${String(autoSeq).padStart(4, "0")}`)) autoSeq += 1;
          studentNo = `AUTO-${String(autoSeq).padStart(4, "0")}`;
          autoSeq += 1;
        }
        const key = studentNo.toLowerCase();
        if (seen.has(key)) {
          duplicates.push(studentNo);
          continue;
        }
        seen.add(key);
        inserts.push({ section_id: sectionId, student_no: studentNo, name });
        added += 1;
      }
      if (inserts.length > 0) {
        const { error } = await tbl("students").insert(inserts);
        if (error && duplicateCode(error)) {
          // A concurrent insert raced the batch — retry one-by-one so the
          // returned counts stay truthful.
          let retryAdded = 0;
          for (const row of inserts) {
            const { error: rowError } = await tbl("students").insert(row);
            if (rowError) {
              if (duplicateCode(rowError)) duplicates.push(row.student_no);
              else throw mapDbError(rowError, "Could not add students.");
            } else retryAdded += 1;
          }
          added = retryAdded;
        } else if (error) {
          throw mapDbError(error, "Could not add students.");
        }
      }
      return { added, duplicates };
    },

    async removeStudent(sectionId, studentRowId) {
      const user = await actor();
      await ownedSection(sectionId, user);
      const student = await single<StudentRow>(
        tbl("students").select("id").eq("id", studentRowId).eq("section_id", sectionId).maybeSingle(),
        "Could not load the student.",
      );
      if (!student) throw new ApiError("Student not found.", { code: "NOT_FOUND" });
      await exec(tbl("students").delete().eq("id", studentRowId), "Could not remove the student.");   // grades cascade
    },

    async setGrade(sectionId, assessmentId, studentRowId, score) {
      const user = await actor();
      const section = await ownedSection(sectionId, user);
      const aRow = await single<AssessmentRow>(
        tbl("assessments").select("id, section_id, period_id, name, max_score, weight, group_key, \"order\"", { count: "estimated" })
          .eq("id", assessmentId).eq("section_id", sectionId).maybeSingle(),
        "Could not load the assessment.",
      );
      if (!aRow) throw new ApiError("Assessment not found.", { code: "NOT_FOUND" });
      const student = await single<StudentRow>(
        tbl("students").select("id", { count: "estimated" }).eq("id", studentRowId).eq("section_id", sectionId).maybeSingle(),
        "Could not load the student.",
      );
      if (!student) throw new ApiError("Student not found.", { code: "NOT_FOUND" });
      const periodRows = await fetchPeriodRows(sectionId);
      const pRow = periodRows.find((r) => r.id === aRow.period_id);
      const period = pRow ? asPeriod(pRow.period) : null;
      if (!period) throw new ApiError("Assessment not found.", { code: "NOT_FOUND" });
      assertEditable(section, period, periodRows);
      if (score != null && !Number.isFinite(score)) {
        throw new ApiError("Score must be a number.", { field: "score" });
      }
      const normalized = score == null ? null : clampScore(score, num(aRow.max_score));
      const existing = await single<GradeRow>(
        tbl("grades").select("*", { count: "estimated" }).eq("assessment_id", assessmentId).eq("student_id", studentRowId).maybeSingle(),
        "Could not load the grade.",
      );
      const at = new Date().toISOString();
      if (existing) {
        const oldScore = existing.score == null ? null : num(existing.score);
        if (oldScore === normalized) return mapGrade(existing);   // no-op when unchanged
        const { data, error } = await tbl("grades").update({ score: normalized, updated_at: at })
          .eq("id", existing.id).select("*").single();
        if (error) throw gradeWriteError(error);
        await pushHistory({
          sectionId, kind: "grade", period, assessmentId, studentRowId,
          oldScore, newScore: normalized, at, actorId: user.id,
        });
        return mapGrade(data as GradeRow);
      }
      if (normalized == null) {
        // Clearing a cell that has no row — nothing to persist.
        return { id: "", sectionId, assessmentId, studentRowId, score: null, updatedAt: at };
      }
      const { data, error } = await tbl("grades").insert({
        section_id: sectionId, assessment_id: assessmentId, student_id: studentRowId, score: normalized, updated_at: at,
      }).select("*").single();
      if (error) throw gradeWriteError(error);
      await pushHistory({
        sectionId, kind: "grade", period, assessmentId, studentRowId,
        oldScore: null, newScore: normalized, at, actorId: user.id,
      });
      return mapGrade(data as GradeRow);
    },

    async importCsv(sectionId, period, rows) {
      const user = await actor();
      const section = await ownedSection(sectionId, user);
      const periodRows = await fetchPeriodRows(sectionId);
      assertEditable(section, period, periodRows);
      const periodRow = periodRows.find((r) => asPeriod(r.period) === period);
      if (!periodRow) throw new ApiError("Period not found.", { code: "NOT_FOUND" });
      const assessmentRows = await list<AssessmentRow>(
        tbl("assessments").select("*", { count: "estimated" }).eq("section_id", sectionId).eq("period_id", periodRow.id),
        "Could not load assessments.",
      );
      const assessments = new Map(assessmentRows.map((r) => [r.id, r]));
      const studentRows = await list<StudentRow>(
        tbl("students").select("*", { count: "estimated" }).eq("section_id", sectionId), "Could not load students.",
      );
      const byStudentNo = new Map(studentRows.map((s) => [s.student_no.trim().toLowerCase(), s]));
      const byName = new Map(studentRows.map((s) => [s.name.trim().toLowerCase(), s]));
      const gradeRows = await list<GradeRow>(tbl("grades").select("*", { count: "estimated" }).eq("section_id", sectionId), "Could not load grades.");
      const gradeByCell = new Map(gradeRows.map((g) => [`${g.assessment_id}:${g.student_id}`, g]));
      const at = new Date().toISOString();
      const skippedKeys: string[] = [];
      const writes: { section_id: string; assessment_id: string; student_id: string; score: number | null; updated_at: string }[] = [];
      let applied = 0; // rows where at least one score was actually written
      for (const row of rows) {
        const key = row.studentKey.trim().toLowerCase();
        const student = byStudentNo.get(key) ?? byName.get(key);
        if (!student) {
          skippedKeys.push(row.studentKey.trim());
          continue;
        }
        let wrote = false;
        for (const [assessmentId, raw] of Object.entries(row.scores)) {
          const assessment = assessments.get(assessmentId);
          if (!assessment) continue;   // unknown column → ignored (reported by the UI)
          if (raw != null && !Number.isFinite(raw)) continue;
          const value = raw == null ? null : clampScore(raw, num(assessment.max_score));
          const grade = gradeByCell.get(`${assessmentId}:${student.id}`);
          const current = grade ? (grade.score == null ? null : num(grade.score)) : undefined;   // undefined = no row
          if (grade && current === value) continue;   // D12: only touch changed cells
          if (!grade && value == null) continue;
          writes.push({ section_id: sectionId, assessment_id: assessmentId, student_id: student.id, score: value, updated_at: at });
          wrote = true;
        }
        if (wrote) applied += 1;
      }
      const skipped = skippedKeys.length;   // D12: unmatched rows only
      if (writes.length > 0) {
        const { error } = await tbl("grades").upsert(writes, { onConflict: "assessment_id,student_id" });
        if (error) throw gradeWriteError(error);
      }
      if (applied > 0) {
        await pushHistory({
          sectionId, kind: "import", period, assessmentId: null, studentRowId: null,
          oldScore: null, newScore: null, at, actorId: user.id,
          detail: `CSV import · ${applied} applied, ${skipped} skipped`,
        });
      }
      return { applied, skipped, skippedKeys };
    },

    async submitPeriod(sectionId, period) {
      const user = await actor();
      await ownedSection(sectionId, user);
      const periodRow = await ensurePeriodRow(sectionId, period);
      const state = {
        status: asStatus(periodRow.status),
        submittedAt: periodRow.submitted_at ? normTs(periodRow.submitted_at) : null,
      };
      if (state.status === "submitted") return state;
      // D16 gate: ≥1 assessment, ≥1 student, every cell non-null.
      const [assessmentRows, studentRows, gradeRows] = await Promise.all([
        list<AssessmentRow>(
          tbl("assessments").select("id").eq("section_id", sectionId).eq("period_id", periodRow.id),
          "Could not load assessments.",
        ),
        list<StudentRow>(tbl("students").select("id", { count: "estimated" }).eq("section_id", sectionId), "Could not load students."),
        list<GradeRow>(tbl("grades").select("assessment_id, student_id, score", { count: "estimated" }).eq("section_id", sectionId), "Could not load grades."),
      ]);
      if (assessmentRows.length === 0 || studentRows.length === 0) {
        throw new ApiError("Add at least one assessment and one student before submitting.", { code: "INCOMPLETE" });
      }
      const assessmentIds = new Set(assessmentRows.map((a) => a.id));
      const studentRowIds = new Set(studentRows.map((s) => s.id));
      const graded = gradeRows.filter(
        (g) => g.score != null && assessmentIds.has(g.assessment_id) && studentRowIds.has(g.student_id),
      ).length;
      const total = assessmentRows.length * studentRows.length;
      if (graded < total) {
        throw new ApiError(`Grading is incomplete (${graded} of ${total} cells graded).`, { code: "INCOMPLETE" });
      }
      const at = new Date().toISOString();
      await exec(
        tbl("periods").update({ status: "submitted", submitted_at: at }).eq("id", periodRow.id),
        "Could not submit the period.",
      );
      await pushHistory({
        sectionId, kind: "submit", period, assessmentId: null, studentRowId: null,
        oldScore: null, newScore: null, at, actorId: user.id,
        detail: `${studentRows.length} students · ${assessmentRows.length} assessments`,
      });
      return { status: "submitted", submittedAt: at };
    },

    async reopenPeriod(sectionId, period) {
      const user = await actor();
      await ownedSection(sectionId, user);
      const periodRow = await ensurePeriodRow(sectionId, period);
      const state = {
        status: asStatus(periodRow.status),
        submittedAt: periodRow.submitted_at ? normTs(periodRow.submitted_at) : null,
      };
      if (state.status !== "submitted") return state;
      await exec(
        tbl("periods").update({ status: "draft", submitted_at: null }).eq("id", periodRow.id),
        "Could not reopen the period.",
      );
      await pushHistory({
        sectionId, kind: "reopen", period, assessmentId: null, studentRowId: null,
        oldScore: null, newScore: null, at: new Date().toISOString(), actorId: user.id,
        detail: "Reopened for editing — further changes are recorded in history",
      });
      return { status: "draft", submittedAt: null };
    },

    async setWeights(sectionId, weights) {
      const user = await actor();
      await ownedSection(sectionId, user);
      const next = {} as Record<PeriodId, number>;
      let total = 0;
      for (const p of PERIODS) {
        const w = weights[p];
        if (typeof w !== "number" || !Number.isFinite(w) || w < 0) {
          throw new ApiError("Weights must be numbers between 0 and 100.", { code: "WEIGHTS_NOT_100" });
        }
        next[p] = Math.round(w * 100) / 100;
        total += next[p];
      }
      if (Math.abs(total - 100) > 0.01 + 1e-9) {   // epsilon: float-safe ±0.01 window
        throw new ApiError(`Weights must total 100% (currently ${Math.round(total * 100) / 100}%).`, { code: "WEIGHTS_NOT_100" });
      }
      const { data, error } = await tbl("sections").update({ period_weights: next }).eq("id", sectionId).select("*");
      if (error) throw mapDbError(error, "Could not update the weights.");
      const row = firstRow<SectionRow>(data);
      if (!row) throw new ApiError("Section not found.", { code: "NOT_FOUND" });
      return mapSection(row);   // history-free: weights are section config, not grade data
    },

    async comment(sectionId, input) {
      const user = await actor();
      // Both roles may write here; scoping only gates readability.
      if (!(await readableSection(sectionId, user))) throw new ApiError("Section not found.", { code: "NOT_FOUND" });
      const body = input.body.trim();
      if (!body) throw new ApiError("Comment cannot be empty.", { field: "body" });
      const { data, error } = await tbl("comments").insert({
        section_id: sectionId, period: input.period, author_id: user.id, body,
      }).select("id, section_id, period, author_id, body, at").single();
      if (error) throw mapDbError(error, "Could not post the comment.");
      const row = data as { id: string; section_id: string; period: string | null; author_id: string; body: string; at: string };
      return {
        id: row.id, sectionId: row.section_id, period: asPeriod(row.period),
        authorId: row.author_id, authorName: user.name, body: row.body, at: normTs(row.at),
      };
    },

    async resetDemoData() {
      // Supabase is the live backend — demo reseeding is a local-only concern.
    },
  };

  return api;
}
