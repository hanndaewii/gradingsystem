// createLocalApi — the localStorage-backed implementation of the `Api`
// interface (spec §3.2). Everything the UI will one day do against Supabase
// lives here: role scoping, ApiError codes, write-through persistence and the
// demo reseed behaviour. Nothing outside `src/api/` may import this module.
import { ApiError, PERIODS } from "../types";
import type {
  Api, Assessment, Comment, Course, Grade, HistoryEntry, PeriodId,
  PeriodProgress, PeriodState, Profile, Section, SectionOverview, Term,
} from "../types";
import { buildSeed, DEMO_REGISTRATION_CODE, TERMS } from "../data/seed";
import type { DbShape } from "../data/seed";
import { buildPeriodProgress, classAveragePct, isPeriodEditable } from "../lib/grades";
import { clampScore, DEFAULT_SCALE_TABLE } from "../lib/format";
import { uid } from "../lib/id";

// v3: reseeds automatically for anyone whose tab still holds an older
// assessment seed. The sheet layout (A | R-1 R-2 R-3 → Total | 30% | Q-1 |
// Q-2 | Exam) exists in EVERY section and EVERY period — Prelim to Finals.
const DB_KEY = "faculty-portal.db:v3";
const SESSION_KEY = "faculty-portal.session:v1";
const LATENCY_MS = 60;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultStates(): Record<PeriodId, PeriodState> {
  return {
    prelim: { status: "not_started", submittedAt: null },
    midterm: { status: "not_started", submittedAt: null },
    semifinals: { status: "not_started", submittedAt: null },
    finals: { status: "not_started", submittedAt: null },
  };
}

export function createLocalApi(): Api {
  // ── persistence ────────────────────────────────────────────────────────────
  const looksValid = (d: unknown): d is DbShape => {
    if (d == null || typeof d !== "object") return false;
    const o = d as Record<string, unknown>;
    return (
      Array.isArray(o.profiles) && Array.isArray(o.courses) && Array.isArray(o.sections) &&
      Array.isArray(o.assessments) && Array.isArray(o.students) && Array.isArray(o.grades) &&
      Array.isArray(o.history) && Array.isArray(o.comments) &&
      o.periodStates != null && typeof o.periodStates === "object"
    );
  };

  const loadDb = (): DbShape => {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) throw new Error("missing");
      const parsed: unknown = JSON.parse(raw);
      if (!looksValid(parsed)) throw new Error("corrupt or legacy");
      return parsed;
    } catch {
      const fresh = buildSeed(); // corrupt / missing / legacy → reseed (Risk 4)
      try {
        localStorage.setItem(DB_KEY, JSON.stringify(fresh));
      } catch {
        /* storage full or unavailable — run in-memory */
      }
      return fresh;
    }
  };

  let db: DbShape = loadDb();
  const persist = () => {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch {
      /* keep working in-memory */
    }
  };

  const readSessionId = (): string | null => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const id: unknown = JSON.parse(raw);
      return typeof id === "string" ? id : null;
    } catch {
      return null;
    }
  };
  const writeSessionId = (id: string | null) => {
    try {
      if (id == null) localStorage.removeItem(SESSION_KEY);
      else localStorage.setItem(SESSION_KEY, JSON.stringify(id));
    } catch {
      /* ignore */
    }
  };
  let sessionId: string | null = readSessionId();

  // ── scoping helpers ────────────────────────────────────────────────────────
  const actor = (): Profile | null => (sessionId ? db.profiles.find((p) => p.id === sessionId) ?? null : null);

  const requireActor = (): Profile => {
    const user = actor();
    if (!user) throw new ApiError("You are not signed in.", { code: "FORBIDDEN" });
    return user;
  };

  // Ownership is by course owner id — the department head may also teach.
  const isOwner = (professorId: string, user: Profile): boolean => user.id === professorId;
  const canRead = (professorId: string, user: Profile): boolean => user.role === "admin" || isOwner(professorId, user);

  const courseOf = (section: Section): Course | undefined => db.courses.find((c) => c.id === section.courseId);

  /** Resolve a section the actor may READ; null when foreign or unknown. */
  const readableSection = (sectionId: string): { section: Section; course: Course } | null => {
    const user = requireActor();
    const section = db.sections.find((s) => s.id === sectionId);
    const course = section ? courseOf(section) : undefined;
    if (!section || !course) return null;
    return canRead(course.professorId, user) ? { section, course } : null;
  };

  /** Resolve a section the actor may WRITE (professor + owner) or throw. */
  const ownedSection = (sectionId: string, user: Profile): { section: Section; course: Course } => {
    const section = db.sections.find((s) => s.id === sectionId);
    const course = section ? courseOf(section) : undefined;
    if (!section || !course) throw new ApiError("Section not found.", { code: "NOT_FOUND" });
    if (!isOwner(course.professorId, user)) {
      throw new ApiError("Only the section's professor can do that.", { code: "FORBIDDEN" });
    }
    return { section, course };
  };

  const statesFor = (sectionId: string): Record<PeriodId, PeriodState> => db.periodStates[sectionId] ?? defaultStates();

  const periodStateOf = (sectionId: string, period: PeriodId): PeriodState => {
    const st = statesFor(sectionId)[period];
    if (!st) throw new ApiError("Period not found.", { code: "NOT_FOUND" });
    return st;
  };

  /** Risk 5 — submitted/locked enforcement lives in the api, not only the UI. */
  const assertEditable = (section: Section, period: PeriodId): void => {
    const state = periodStateOf(section.id, period);
    if (state.status === "submitted") {
      throw new ApiError("This period is submitted — reopen it before making changes.", { code: "PERIOD_SUBMITTED" });
    }
    if (!isPeriodEditable({ section, states: statesFor(section.id), period })) {
      throw new ApiError(
        `${period.charAt(0).toUpperCase()}${period.slice(1)} is locked — submit earlier periods first or unlock it manually.`,
        { code: "PERIOD_LOCKED" },
      );
    }
  };

  const buildProgress = (section: Section): PeriodProgress[] => {
    const students = db.students.filter((s) => s.sectionId === section.id);
    const assessments = db.assessments.filter((a) => a.sectionId === section.id);
    const grades = db.grades.filter((g) => g.sectionId === section.id);
    const states = statesFor(section.id);
    return PERIODS.map((period) =>
      buildPeriodProgress({ period, students, assessments, grades, state: states[period] ?? defaultStates()[period] }),
    );
  };

  const nowISO = () => new Date().toISOString();
  const pushHistory = (entry: Omit<HistoryEntry, "id">) => db.history.push({ id: uid("hist"), ...entry });

  const api: Api = {
    // ── auth / session ───────────────────────────────────────────────────────
    async signIn(email, password) {
      await delay(LATENCY_MS);
      const normalized = email.trim().toLowerCase();
      const profile = db.profiles.find((p) => p.email.toLowerCase() === normalized);
      if (!profile || profile.password !== password) {
        throw new ApiError("Email or password is incorrect.", { code: "BAD_CREDENTIALS" });
      }
      sessionId = profile.id;
      writeSessionId(sessionId);
      return profile;
    },

    async setPassword(password) {
      await delay(LATENCY_MS);
      const user = requireActor();
      if (password.length < 8) {
        throw new ApiError("Use a password of at least 8 characters.", { field: "password" });
      }
      user.password = password;
      persist();
    },

    async signInWithRole(email, password, role) {
      await delay(LATENCY_MS);
      const normalized = email.trim().toLowerCase();
      const profile = db.profiles.find((p) => p.email.toLowerCase() === normalized);
      if (!profile || profile.password !== password) {
        throw new ApiError("Email or password is incorrect.", { code: "BAD_CREDENTIALS" });
      }
      // The demo backend keeps one role per account; the head may also teach.
      void role;
      sessionId = profile.id;
      writeSessionId(sessionId);
      return profile;
    },

    async signOut() {
      await delay(LATENCY_MS);
      sessionId = null;
      writeSessionId(null);
    },

    // ── registration (demo backend: the code is shown in the UI) ─────────────
    async requestRegistrationCode(email) {
      await delay(LATENCY_MS);
      if (!email.trim()) throw new ApiError("Email is required.", { field: "email" });
      // The demo backend has no mailer — the login screen tells the user the
      // code. The Supabase backend really sends an email.
    },

    async completeRegistration({ email, code, name, department }) {
      await delay(LATENCY_MS);
      const normalized = email.trim().toLowerCase();
      if (code.trim() !== DEMO_REGISTRATION_CODE) {
        throw new ApiError("That code is not valid or has expired.", { code: "BAD_CREDENTIALS" });
      }
      if (!name.trim()) throw new ApiError("Name is required.", { field: "name" });
      if (!department.trim()) throw new ApiError("Department is required.", { field: "department" });
      const existing = db.profiles.find((p) => p.email.toLowerCase() === normalized);
      const profile: Profile = existing ?? {
        id: uid("prof"),
        email: normalized,
        password: "",
        name: name.trim(),
        department: department.trim(),
        bio: "",
        role: "professor",
      };
      if (!existing) {
        db.profiles.push(profile);
        persist();
      }
      sessionId = profile.id;
      writeSessionId(sessionId);
      return profile;
    },

    async getSession() {
      await delay(LATENCY_MS);
      const user = actor();
      if (!user && sessionId != null) {
        sessionId = null; // stale session (e.g. profile replaced by reseed)
        writeSessionId(null);
      }
      return user;
    },

    async updateProfile(id, patch) {
      await delay(LATENCY_MS);
      const user = requireActor();
      if (user.id !== id) throw new ApiError("You can only edit your own profile.", { code: "FORBIDDEN" });
      if (patch.name !== undefined) {
        if (!patch.name.trim()) throw new ApiError("Name is required.", { field: "name" });
        user.name = patch.name.trim();
      }
      if (patch.department !== undefined) {
        if (!patch.department.trim()) throw new ApiError("Department is required.", { field: "department" });
        user.department = patch.department.trim();
      }
      if (patch.bio !== undefined) user.bio = patch.bio;
      persist();
      return user;
    },

    // ── reads ────────────────────────────────────────────────────────────────
    async listTerms() {
      await delay(LATENCY_MS);
      requireActor();
      // D7 — fixed TERMS unioned with any term found in the data.
      const seen = new Set(TERMS.map((t) => `${t.academicYear}:${t.semester}`));
      const extras: Term[] = [];
      for (const c of db.courses) {
        const key = `${c.academicYear}:${c.semester}`;
        if (!seen.has(key)) {
          seen.add(key);
          extras.push({ academicYear: c.academicYear, semester: c.semester });
        }
      }
      const all = [...TERMS.map((t) => ({ ...t })), ...extras];
      all.sort((a, b) => a.academicYear.localeCompare(b.academicYear) || a.semester - b.semester);
      return all;
    },

    async listCourses(term) {
      await delay(LATENCY_MS);
      const user = requireActor();
      return db.courses
        .filter((c) => c.academicYear === term.academicYear && c.semester === term.semester && canRead(c.professorId, user))
        .sort((a, b) => a.code.localeCompare(b.code));
    },

    async getCourse(id) {
      await delay(LATENCY_MS);
      const user = requireActor();
      const course = db.courses.find((c) => c.id === id);
      return course && canRead(course.professorId, user) ? course : null;
    },

    async listSections(courseId) {
      await delay(LATENCY_MS);
      const user = requireActor();
      const course = db.courses.find((c) => c.id === courseId);
      if (!course || !canRead(course.professorId, user)) return [];
      return db.sections.filter((s) => s.courseId === courseId).sort((a, b) => a.name.localeCompare(b.name));
    },

    async getSection(id) {
      await delay(LATENCY_MS);
      const found = readableSection(id);
      return found ? found.section : null;
    },

    async listAssessments(sectionId, period) {
      await delay(LATENCY_MS);
      if (!readableSection(sectionId)) return [];
      return db.assessments
        .filter((a) => a.sectionId === sectionId && a.period === period)
        .sort((a, b) => a.order - b.order);
    },

    async listStudents(sectionId) {
      await delay(LATENCY_MS);
      if (!readableSection(sectionId)) return [];
      return db.students.filter((s) => s.sectionId === sectionId);
    },

    async listGrades(sectionId) {
      await delay(LATENCY_MS);
      if (!readableSection(sectionId)) return [];
      return db.grades.filter((g) => g.sectionId === sectionId);
    },

    async listHistory(sectionId, limit) {
      await delay(LATENCY_MS);
      if (!readableSection(sectionId)) return [];
      const sorted = db.history
        .filter((h) => h.sectionId === sectionId)
        .sort((a, b) => b.at.localeCompare(a.at));
      return limit != null ? sorted.slice(0, limit) : sorted;
    },

    async listComments(sectionId) {
      await delay(LATENCY_MS);
      if (!readableSection(sectionId)) return [];
      return db.comments.filter((c) => c.sectionId === sectionId).sort((a, b) => b.at.localeCompare(a.at));
    },

    async getSectionProgress(sectionId) {
      await delay(LATENCY_MS);
      const found = readableSection(sectionId);
      return found ? buildProgress(found.section) : [];
    },

    async getTermOverview(term) {
      await delay(LATENCY_MS);
      const user = requireActor();
      const overview: SectionOverview[] = [];
      const termCourses = db.courses
        .filter((c) => c.academicYear === term.academicYear && c.semester === term.semester && canRead(c.professorId, user))
        .sort((a, b) => a.code.localeCompare(b.code));
      for (const course of termCourses) {
        const professorName = db.profiles.find((p) => p.id === course.professorId)?.name ?? "—";
        const sections = db.sections.filter((s) => s.courseId === course.id).sort((a, b) => a.name.localeCompare(b.name));
        for (const section of sections) {
          const students = db.students.filter((s) => s.sectionId === section.id);
          const assessments = db.assessments.filter((a) => a.sectionId === section.id);
          const grades = db.grades.filter((g) => g.sectionId === section.id);
          const states = statesFor(section.id);
          const periods = PERIODS.map((period) =>
            buildPeriodProgress({ period, students, assessments, grades, state: states[period] ?? defaultStates()[period] }),
          );
          const lastSubmitAt = periods.reduce<string | null>(
            (acc, p) => (p.submittedAt != null && (acc == null || p.submittedAt > acc) ? p.submittedAt : acc),
            null,
          );
          overview.push({
            section,
            course,
            professorName,
            studentCount: students.length,
            periods,
            classAverage: classAveragePct({ students, assessments, grades, weights: section.periodWeights }),
            lastSubmitAt,
          });
        }
      }
      return overview;
    },

    async getDeleteImpact(kind, id) {
      await delay(LATENCY_MS);
      const user = requireActor();
      const sectionIds = new Set<string>(
        kind === "course" ? db.sections.filter((s) => s.courseId === id).map((s) => s.id) : [id],
      );
      for (const sid of sectionIds) {
        const section = db.sections.find((s) => s.id === sid);
        const course = section ? courseOf(section) : undefined;
        if (!section || !course || !canRead(course.professorId, user)) {
          throw new ApiError("Not found.", { code: "NOT_FOUND" });
        }
      }
      const impactedStudents = db.students.filter((s) => sectionIds.has(s.sectionId));
      const studentRowIds = new Set(impactedStudents.map((s) => s.id));
      const impactedGrades = db.grades.filter((g) => sectionIds.has(g.sectionId) || studentRowIds.has(g.studentRowId));
      return {
        sections: sectionIds.size,
        students: impactedStudents.length,
        grades: impactedGrades.length,
      };
    },

    // ── writes: courses ──────────────────────────────────────────────────────
    async createCourse(input) {
      await delay(LATENCY_MS);
      const user = requireActor();
      // Any signed-in account may create a course it owns — the head can teach too.
      const code = input.code.trim().toUpperCase();
      if (!code) throw new ApiError("Code is required.", { field: "code" });
      if (!input.title.trim()) throw new ApiError("Title is required.", { field: "title" });
      const duplicate = db.courses.some(
        (c) => c.professorId === user.id && c.academicYear === input.academicYear && c.semester === input.semester && c.code.toUpperCase() === code,
      );
      if (duplicate) {
        throw new ApiError("You already have a course with this code this semester.", { code: "DUPLICATE_CODE", field: "code" });
      }
      const course: Course = {
        id: uid("crs"),
        professorId: user.id,
        academicYear: input.academicYear,
        semester: input.semester,
        code,
        title: input.title.trim(),
        createdAt: nowISO(),
      };
      db.courses.push(course);
      persist();
      return course;
    },

    async updateCourse(id, patch) {
      await delay(LATENCY_MS);
      const user = requireActor();
      const course = db.courses.find((c) => c.id === id);
      if (!course) throw new ApiError("Course not found.", { code: "NOT_FOUND" });
      if (!isOwner(course.professorId, user)) throw new ApiError("Only the course owner can do that.", { code: "FORBIDDEN" });
      if (patch.code !== undefined) {
        const code = patch.code.trim().toUpperCase();
        if (!code) throw new ApiError("Code is required.", { field: "code" });
        const duplicate = db.courses.some(
          (c) => c.id !== id && c.professorId === user.id && c.academicYear === course.academicYear && c.semester === course.semester && c.code.toUpperCase() === code,
        );
        if (duplicate) {
          throw new ApiError("You already have a course with this code this semester.", { code: "DUPLICATE_CODE", field: "code" });
        }
        course.code = code;
      }
      if (patch.title !== undefined) {
        if (!patch.title.trim()) throw new ApiError("Title is required.", { field: "title" });
        course.title = patch.title.trim();
      }
      persist();
      return course;
    },

    async deleteCourse(id) {
      await delay(LATENCY_MS);
      const user = requireActor();
      const course = db.courses.find((c) => c.id === id);
      if (!course) throw new ApiError("Course not found.", { code: "NOT_FOUND" });
      if (!isOwner(course.professorId, user)) throw new ApiError("Only the course owner can do that.", { code: "FORBIDDEN" });
      const sectionIds = new Set(db.sections.filter((s) => s.courseId === id).map((s) => s.id));
      db.grades = db.grades.filter((g) => !sectionIds.has(g.sectionId));
      db.students = db.students.filter((s) => !sectionIds.has(s.sectionId));
      db.assessments = db.assessments.filter((a) => !sectionIds.has(a.sectionId));
      db.history = db.history.filter((h) => !sectionIds.has(h.sectionId));
      db.comments = db.comments.filter((c) => !sectionIds.has(c.sectionId));
      for (const sid of sectionIds) delete db.periodStates[sid];
      db.sections = db.sections.filter((s) => s.courseId !== id);
      db.courses = db.courses.filter((c) => c.id !== id);
      persist();
    },

    async createSection(courseId, input) {
      await delay(LATENCY_MS);
      const user = requireActor();
      const course = db.courses.find((c) => c.id === courseId);
      if (!course) throw new ApiError("Course not found.", { code: "NOT_FOUND" });
      if (!isOwner(course.professorId, user)) throw new ApiError("Only the course owner can do that.", { code: "FORBIDDEN" });
      if (!input.name.trim()) throw new ApiError("Section name is required.", { field: "name" });

      let source: Section | undefined;
      if (input.copyFromSectionId) {
        source = db.sections.find((s) => s.id === input.copyFromSectionId);
        const sourceCourse = source ? courseOf(source) : undefined;
        if (!source || !sourceCourse || !isOwner(sourceCourse.professorId, user)) {
          throw new ApiError("You can only copy from your own sections.", { code: "FORBIDDEN" });
        }
      }

      const section: Section = {
        id: uid("sec"),
        courseId,
        name: input.name.trim(),
        schedule: input.schedule.trim(),
        room: (input.room ?? "").trim(),
        displayScale: source?.displayScale ?? "percent-letter",
        scaleTable: source ? source.scaleTable.map((r) => ({ ...r })) : DEFAULT_SCALE_TABLE.map((r) => ({ ...r })),
        periodWeights: source ? { ...source.periodWeights } : { prelim: 25, midterm: 25, semifinals: 25, finals: 25 },
        enforceOrder: source?.enforceOrder ?? true,
        unlockedPeriods: [], // a fresh section starts fully in-order
        createdAt: nowISO(),
      };
      db.sections.push(section);
      db.periodStates[section.id] = defaultStates();
      if (source) {
        // Copy assessments (new ids, same content) + roster. No grades, no
        // history — period states reset to not_started (WO-2 step 8).
        for (const a of db.assessments.filter((x) => x.sectionId === source.id)) {
          db.assessments.push({ id: uid("as"), sectionId: section.id, period: a.period, name: a.name, maxScore: a.maxScore, weight: a.weight, group: a.group, order: a.order });
        }
        for (const st of db.students.filter((x) => x.sectionId === source.id)) {
          db.students.push({ id: uid("stu"), sectionId: section.id, studentNo: st.studentNo, name: st.name });
        }
      }
      persist();
      return section;
    },

    async updateSection(id, patch) {
      await delay(LATENCY_MS);
      const user = requireActor();
      const { section } = ownedSection(id, user);
      if (patch.name !== undefined) {
        if (!patch.name.trim()) throw new ApiError("Section name is required.", { field: "name" });
        section.name = patch.name.trim();
      }
      if (patch.schedule !== undefined) section.schedule = patch.schedule.trim();
      if (patch.room !== undefined) section.room = patch.room.trim();
      if (patch.displayScale !== undefined) section.displayScale = patch.displayScale;
      if (patch.scaleTable !== undefined) section.scaleTable = patch.scaleTable.map((r) => ({ ...r }));
      if (patch.enforceOrder !== undefined) section.enforceOrder = patch.enforceOrder;
      if (patch.unlockedPeriods !== undefined) {
        section.unlockedPeriods = PERIODS.filter((p) => patch.unlockedPeriods?.includes(p));
      }
      persist();
      return section;
    },

    async deleteSection(id) {
      await delay(LATENCY_MS);
      const user = requireActor();
      ownedSection(id, user);
      db.grades = db.grades.filter((g) => g.sectionId !== id);
      db.students = db.students.filter((s) => s.sectionId !== id);
      db.assessments = db.assessments.filter((a) => a.sectionId !== id);
      db.history = db.history.filter((h) => h.sectionId !== id);
      db.comments = db.comments.filter((c) => c.sectionId !== id);
      delete db.periodStates[id];
      db.sections = db.sections.filter((s) => s.id !== id);
      persist();
    },

    // ── writes: assessments / roster / grades ────────────────────────────────
    async setAssessments(sectionId, period, defs) {
      await delay(LATENCY_MS);
      const user = requireActor();
      ownedSection(sectionId, user);
      const state = periodStateOf(sectionId, period);
      if (state.status === "submitted") {
        throw new ApiError("This period is submitted — reopen it before editing assessments.", { code: "PERIOD_SUBMITTED" });
      }
      const existing = db.assessments.filter((a) => a.sectionId === sectionId && a.period === period);
      const byId = new Map(existing.map((a) => [a.id, a]));
      const kept = new Set<string>();
      const result: Assessment[] = [];
      defs.forEach((def, index) => {
        const name = def.name.trim();
        if (!name) throw new ApiError("Assessment name is required.", { field: "name" });
        const target = def.id != null ? byId.get(def.id) : undefined;
        if (target) {
          // D11 — match by id: update in place, grades preserved.
          const prevMax = target.maxScore;
          target.name = name;
          target.maxScore = def.maxScore;
          target.weight = def.weight;
          target.group = def.group ?? null;
          target.order = index;
          if (def.maxScore < prevMax) {
            // Lowering a max re-clamps stored scores so percentages stay ≤ 100.
            for (const g of db.grades) {
              if (g.assessmentId === target.id && g.score != null && g.score > def.maxScore) {
                g.score = def.maxScore;
                g.updatedAt = nowISO();
              }
            }
          }
          kept.add(target.id);
          result.push(target);
        } else {
          const created: Assessment = { id: uid("as"), sectionId, period, name, maxScore: def.maxScore, weight: def.weight, group: def.group ?? null, order: index };
          db.assessments.push(created);
          result.push(created);
        }
      });
      // Existing ids absent from defs are deleted along with their grades.
      const removedIds = new Set(existing.filter((a) => !kept.has(a.id)).map((a) => a.id));
      if (removedIds.size > 0) {
        db.assessments = db.assessments.filter((a) => !removedIds.has(a.id));
        db.grades = db.grades.filter((g) => !removedIds.has(g.assessmentId));
      }
      persist();
      return result;
    },

    async addStudents(sectionId, students) {
      await delay(LATENCY_MS);
      const user = requireActor();
      ownedSection(sectionId, user);
      const seen = new Set(
        db.students.filter((s) => s.sectionId === sectionId).map((s) => s.studentNo.trim().toLowerCase()),
      );
      // Students added without an ID mint a section-unique AUTO-#### number,
      // so CSV/ID matching and the uniqueness rule keep working.
      let autoSeq = 1;
      for (const s of db.students) {
        if (s.sectionId !== sectionId) continue;
        const m = /^AUTO-(\d+)$/i.exec(s.studentNo.trim());
        if (m) autoSeq = Math.max(autoSeq, Number(m[1]) + 1);
      }
      const duplicates: string[] = [];
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
        db.students.push({ id: uid("stu"), sectionId, studentNo, name });
        added += 1;
      }
      persist();
      return { added, duplicates };
    },

    async removeStudent(sectionId, studentRowId) {
      await delay(LATENCY_MS);
      const user = requireActor();
      ownedSection(sectionId, user);
      const student = db.students.find((s) => s.id === studentRowId && s.sectionId === sectionId);
      if (!student) throw new ApiError("Student not found.", { code: "NOT_FOUND" });
      db.students = db.students.filter((s) => s.id !== studentRowId);
      db.grades = db.grades.filter((g) => g.studentRowId !== studentRowId);
      persist();
    },

    async setGrade(sectionId, assessmentId, studentRowId, score) {
      await delay(LATENCY_MS);
      const user = requireActor();
      const { section } = ownedSection(sectionId, user);
      const assessment = db.assessments.find((a) => a.id === assessmentId && a.sectionId === sectionId);
      if (!assessment) throw new ApiError("Assessment not found.", { code: "NOT_FOUND" });
      const student = db.students.find((s) => s.id === studentRowId && s.sectionId === sectionId);
      if (!student) throw new ApiError("Student not found.", { code: "NOT_FOUND" });
      assertEditable(section, assessment.period);
      if (score != null && !Number.isFinite(score)) {
        throw new ApiError("Score must be a number.", { field: "score" });
      }
      const normalized = score == null ? null : clampScore(score, assessment.maxScore);
      const existing = db.grades.find((g) => g.assessmentId === assessmentId && g.studentRowId === studentRowId);
      if (existing && existing.score === normalized) return existing; // no-op when unchanged
      const at = nowISO();
      const oldScore = existing ? existing.score : null;
      let grade: Grade;
      if (existing) {
        existing.score = normalized;
        existing.updatedAt = at;
        grade = existing;
      } else {
        if (normalized == null) {
          // Clearing a cell that has no row — nothing to persist.
          return { id: "", sectionId, assessmentId, studentRowId, score: null, updatedAt: at };
        }
        grade = { id: uid("gr"), sectionId, assessmentId, studentRowId, score: normalized, updatedAt: at };
        db.grades.push(grade);
      }
      pushHistory({
        sectionId, kind: "grade", period: assessment.period, assessmentId, studentRowId,
        oldScore, newScore: normalized, at, actorId: user.id,
      });
      persist();
      return grade;
    },

    async importCsv(sectionId, period, rows) {
      await delay(LATENCY_MS);
      const user = requireActor();
      const { section } = ownedSection(sectionId, user);
      assertEditable(section, period);
      const assessments = new Map(
        db.assessments.filter((a) => a.sectionId === sectionId && a.period === period).map((a) => [a.id, a]),
      );
      const students = db.students.filter((s) => s.sectionId === sectionId);
      const byStudentNo = new Map(students.map((s) => [s.studentNo.trim().toLowerCase(), s]));
      const byName = new Map(students.map((s) => [s.name.trim().toLowerCase(), s]));
      const at = nowISO();
      const skippedKeys: string[] = [];
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
          if (!assessment) continue; // unknown column → ignored (reported by the UI)
          if (raw != null && !Number.isFinite(raw)) continue;
          const value = raw == null ? null : clampScore(raw, assessment.maxScore);
          const grade = db.grades.find((g) => g.assessmentId === assessmentId && g.studentRowId === student.id);
          if (grade) {
            if (grade.score !== value) {
              grade.score = value;
              grade.updatedAt = at; // D12: touched cells get updatedAt, no per-cell history
              wrote = true;
            }
          } else if (value != null) {
            db.grades.push({ id: uid("gr"), sectionId, assessmentId, studentRowId: student.id, score: value, updatedAt: at });
            wrote = true;
          }
        }
        if (wrote) applied += 1;
      }
      const skipped = skippedKeys.length; // D12: unmatched rows only
      if (applied > 0) {
        pushHistory({
          sectionId, kind: "import", period, assessmentId: null, studentRowId: null,
          oldScore: null, newScore: null, at, actorId: user.id,
          detail: `CSV import · ${applied} applied, ${skipped} skipped`,
        });
      }
      persist();
      return { applied, skipped, skippedKeys };
    },

    async submitPeriod(sectionId, period) {
      await delay(LATENCY_MS);
      const user = requireActor();
      ownedSection(sectionId, user);
      const state = periodStateOf(sectionId, period);
      if (state.status === "submitted") return { ...state };
      // D16 gate: ≥1 assessment, ≥1 student, every cell non-null.
      const assessments = db.assessments.filter((a) => a.sectionId === sectionId && a.period === period);
      const students = db.students.filter((s) => s.sectionId === sectionId);
      if (assessments.length === 0 || students.length === 0) {
        throw new ApiError("Add at least one assessment and one student before submitting.", { code: "INCOMPLETE" });
      }
      const assessmentIds = new Set(assessments.map((a) => a.id));
      const studentRowIds = new Set(students.map((s) => s.id));
      const graded = db.grades.filter(
        (g) => g.sectionId === sectionId && g.score != null && assessmentIds.has(g.assessmentId) && studentRowIds.has(g.studentRowId),
      ).length;
      const total = assessments.length * students.length;
      if (graded < total) {
        throw new ApiError(`Grading is incomplete (${graded} of ${total} cells graded).`, { code: "INCOMPLETE" });
      }
      const at = nowISO();
      state.status = "submitted";
      state.submittedAt = at;
      pushHistory({
        sectionId, kind: "submit", period, assessmentId: null, studentRowId: null,
        oldScore: null, newScore: null, at, actorId: user.id,
        detail: `${students.length} students · ${assessments.length} assessments`,
      });
      persist();
      return { ...state };
    },

    async reopenPeriod(sectionId, period) {
      await delay(LATENCY_MS);
      const user = requireActor();
      ownedSection(sectionId, user);
      const state = periodStateOf(sectionId, period);
      if (state.status !== "submitted") return { ...state };
      const at = nowISO();
      state.status = "draft";
      state.submittedAt = null;
      pushHistory({
        sectionId, kind: "reopen", period, assessmentId: null, studentRowId: null,
        oldScore: null, newScore: null, at, actorId: user.id,
        detail: "Reopened for editing — further changes are recorded in history",
      });
      persist();
      return { ...state };
    },

    async setWeights(sectionId, weights) {
      await delay(LATENCY_MS);
      const user = requireActor();
      const { section } = ownedSection(sectionId, user);
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
      if (Math.abs(total - 100) > 0.01 + 1e-9) { // epsilon: float-safe ±0.01 window
        throw new ApiError(`Weights must total 100% (currently ${Math.round(total * 100) / 100}%).`, { code: "WEIGHTS_NOT_100" });
      }
      section.periodWeights = next;
      persist(); // history-free: weights are section config, not grade data
      return section;
    },

    async comment(sectionId, input) {
      await delay(LATENCY_MS);
      const user = requireActor();
      // Both roles may write here; scoping only gates readability.
      if (!readableSection(sectionId)) throw new ApiError("Section not found.", { code: "NOT_FOUND" });
      const body = input.body.trim();
      if (!body) throw new ApiError("Comment cannot be empty.", { field: "body" });
      const comment: Comment = {
        id: uid("cmt"),
        sectionId,
        period: input.period,
        authorId: user.id,
        authorName: user.name,
        body,
        at: nowISO(),
      };
      db.comments.push(comment);
      persist();
      return comment;
    },

    async resetDemoData() {
      await delay(LATENCY_MS);
      const previous = sessionId;
      db = buildSeed();
      persist();
      // Keep the session only if the profile still exists after the reseed
      // (fixed demo profile ids survive; unknown ids log out cleanly).
      sessionId = previous != null && db.profiles.some((p) => p.id === previous) ? previous : null;
      writeSessionId(sessionId);
    },
  };

  return api;
}
