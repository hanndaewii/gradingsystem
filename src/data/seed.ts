// Demo seed data (WO-2 step 7). Fully deterministic: a local mulberry32 PRNG
// with a fixed seed — NO Math.random anywhere. Only the 2–3 "submitted this
// week" anchors (D9) and the session-independent profile ids are stable by
// design; all other timestamps are fixed ISO strings.
import { PERIODS } from "../types";
import type {
  Assessment, AttendanceRow, CalendarEvent, Comment, Course, DisplayScale, Grade, HistoryEntry,
  PeriodId, PeriodState, Profile, Role, Section, Student, Term,
} from "../types";
import { DEFAULT_SCALE_TABLE, daysAgoISO, todayISO } from "../lib/format";

export interface DbShape {
  profiles: Profile[];
  courses: Course[];
  sections: Section[];
  assessments: Assessment[];
  students: Student[];
  grades: Grade[];
  periodStates: Record<string /* sectionId */, Record<PeriodId, PeriodState>>;
  history: HistoryEntry[];
  comments: Comment[];
  attendance: AttendanceRow[];
  calendarEvents: CalendarEvent[];
}

/** D8 — pinned demo accounts (WO-3 quick-fill chips import this). */
/** The one-time code the demo backend accepts for self-registration (the
 *  Supabase backend emails a real code instead). */
export const DEMO_REGISTRATION_CODE = "123456";

export const DEMO_ACCOUNTS: { label: string; email: string; password: string; role: Role }[] = [
  { label: "Dr. Marisol Reyes · Admin", email: "admin@northstate.edu", password: "demo1234", role: "admin" },
  { label: "Prof. Antonio Cruz", email: "acruz@northstate.edu", password: "demo1234", role: "professor" },
  { label: "Prof. Liza Bautista", email: "lbautista@northstate.edu", password: "demo1234", role: "professor" },
];

/** D7 — fixed terms; AY 2026-2027 stays empty so the empty state is reachable. */
export const TERMS: Term[] = [
  { academicYear: "2025-2026", semester: 1 },
  { academicYear: "2025-2026", semester: 2 },
  { academicYear: "2026-2027", semester: 1 },
  { academicYear: "2026-2027", semester: 2 },
];

// ── deterministic PRNG ───────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "Anna", "Jose", "Maria", "Juan", "Carla", "Miguel", "Andrea", "Paolo", "Kristine", "Ramon",
  "Sofia", "Diego", "Lorna", "Marco", "Elena", "Jomar", "Grace", "Dennis", "Hazel", "Ferdinand",
  "Nina", "Oscar", "Patricia", "Rico", "Selena", "Tomas", "Ulrika", "Victor", "Wendy", "Xander",
];
const LAST_NAMES = [
  "Cruz", "Santos", "Reyes", "Bautista", "Garcia", "Mendoza", "Villanueva", "Torres", "Castillo",
  "Ramos", "Navarro", "Domingo", "Salazar", "Perez", "Dela Rosa", "Gonzales", "Fernandez",
  "Lopez", "Rivera", "Morales",
];

// The class-record layout used by EVERY section and EVERY period — the
// professor's Excel sheet: A | R-1 R-2 R-3 (one Total group) | Q-1 | Q-2 |
// Exam, weights 10/30/10/10/40, all max 100.
const SHEET_DEFS: { name: string; maxScore: number; weight: number; group: string | null }[] = [
  { name: "A", maxScore: 100, weight: 10, group: null },
  { name: "R-1", maxScore: 100, weight: 10, group: "recitation" },
  { name: "R-2", maxScore: 100, weight: 10, group: "recitation" },
  { name: "R-3", maxScore: 100, weight: 10, group: "recitation" },
  { name: "Q-1", maxScore: 100, weight: 10, group: null },
  { name: "Q-2", maxScore: 100, weight: 10, group: null },
  { name: "Exam", maxScore: 100, weight: 40, group: null },
];

// Fixed grade-row timestamps cycled through the seed (Risk 9: fixed ISOs).
const STAMPS: string[] = [
  "2025-09-12T10:15:00.000Z", "2025-09-18T14:40:00.000Z", "2025-09-25T09:05:00.000Z",
  "2025-10-02T16:20:00.000Z", "2025-10-09T11:45:00.000Z", "2025-10-16T13:30:00.000Z",
  "2025-10-23T15:10:00.000Z", "2025-10-30T10:50:00.000Z", "2025-11-06T09:25:00.000Z",
  "2025-11-13T14:05:00.000Z", "2026-01-22T10:30:00.000Z", "2026-01-29T15:15:00.000Z",
  "2026-02-05T09:40:00.000Z", "2026-02-12T13:55:00.000Z", "2026-02-19T11:20:00.000Z",
  "2026-02-26T16:35:00.000Z", "2026-03-05T10:10:00.000Z", "2026-03-12T14:25:00.000Z",
  "2026-03-19T09:45:00.000Z", "2026-03-26T15:00:00.000Z",
];

/** UTC ISO helper for fixed seed timestamps. */
function iso(y: number, m: number, d: number, h = 9, min = 0): string {
  return new Date(Date.UTC(y, m - 1, d, h, min)).toISOString();
}

type PeriodPlan =
  | { kind: "submitted"; at: string }
  | { kind: "draft"; fill: number }   // fill: 0..1 share of graded cells (1 = submit-ready)
  | { kind: "empty" };                // not started

interface SectionPlan {
  key: string;
  courseId: string;
  name: string;
  schedule: string;
  room: string;
  roster: number;                                   // 8–20 students
  periods: Record<PeriodId, PeriodPlan>;
  displayScale?: DisplayScale;
  weights?: Record<PeriodId, number>;
  enforceOrder?: boolean;
  unlocked?: PeriodId[];
}

const AY = "2025-2026";

export function buildSeed(): DbShape {
  const rand = mulberry32(0x51c2e5);
  const pickFrom = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

  const profiles: Profile[] = [
    {
      id: "prof-admin", email: DEMO_ACCOUNTS[0].email, password: DEMO_ACCOUNTS[0].password,
      name: "Dr. Marisol Reyes", department: "College of Computer Studies",
      bio: "Department head. Reviews grading progress across every section and leaves notes for the faculty.",
      role: "admin",
    },
    {
      id: "prof-cruz", email: DEMO_ACCOUNTS[1].email, password: DEMO_ACCOUNTS[1].password,
      name: "Prof. Antonio Cruz", department: "Department of Computer Science",
      bio: "Teaches programming and web systems. Keeps the gradebook current week by week.",
      role: "professor",
    },
    {
      id: "prof-bautista", email: DEMO_ACCOUNTS[2].email, password: DEMO_ACCOUNTS[2].password,
      name: "Prof. Liza Bautista", department: "Department of Information Technology",
      bio: "Teaches discrete mathematics and database systems. Fond of detailed rubrics.",
      role: "professor",
    },
  ];

  // 6 courses across the two professors: 3 in 1st Sem, 3 in 2nd Sem (GE105 has
  // no sections yet — exercises the empty-course path).
  const courses: Course[] = [
    { id: "crs-cs101", professorId: "prof-cruz", academicYear: AY, semester: 1, code: "CS101", title: "Intro to Programming", createdAt: iso(2025, 8, 4, 9, 0) },
    { id: "crs-cs102", professorId: "prof-cruz", academicYear: AY, semester: 1, code: "CS102", title: "Data Structures & Algorithms", createdAt: iso(2025, 8, 4, 9, 5) },
    { id: "crs-cs201", professorId: "prof-bautista", academicYear: AY, semester: 1, code: "CS201", title: "Discrete Mathematics", createdAt: iso(2025, 8, 4, 9, 10) },
    { id: "crs-it210", professorId: "prof-cruz", academicYear: AY, semester: 2, code: "IT210", title: "Web Systems", createdAt: iso(2025, 12, 15, 9, 0) },
    { id: "crs-it220", professorId: "prof-bautista", academicYear: AY, semester: 2, code: "IT220", title: "Database Systems", createdAt: iso(2025, 12, 15, 9, 5) },
    { id: "crs-ge105", professorId: "prof-bautista", academicYear: AY, semester: 2, code: "GE105", title: "Technical Writing", createdAt: iso(2025, 12, 15, 9, 10) },
  ];

  // 9 sections covering every state the UI must demo:
  //   cs101-a: prelim+midterm submitted, semifinals draft COMPLETE (submit-ready)
  //   cs101-b: all not started            cs102-a: prelim submitted, midterm draft partial
  //   cs102-b: enforceOrder:false, prelim submitted + reopened story
  //   cs201-a: unlockedPeriods ["finals"] it210-a: ALL FOUR submitted (semester complete)
  //   it210-b: displayScale "scale5"      it220-a: all not started (fresh)
  //   it220-b: prelim+midterm submitted, semifinals draft partial
  // D9 anchors (within the last 7 days): cs101-a midterm, cs102-a prelim,
  // cs102-b prelim (resubmitted today).
  const plans: SectionPlan[] = [
    {
      key: "cs101-a", courseId: "crs-cs101", name: "Section A", schedule: "Mon/Wed 9:00 AM", room: "Room 204", roster: 20,
      periods: {
        prelim: { kind: "submitted", at: iso(2025, 9, 26, 8, 5) },
        midterm: { kind: "submitted", at: daysAgoISO(2) },
        semifinals: { kind: "draft", fill: 1 },
        finals: { kind: "empty" },
      },
    },
    {
      key: "cs101-b", courseId: "crs-cs101", name: "Section B", schedule: "Tue/Thu 12:00 PM", room: "Room 204", roster: 8,
      periods: { prelim: { kind: "empty" }, midterm: { kind: "empty" }, semifinals: { kind: "empty" }, finals: { kind: "empty" } },
    },
    {
      key: "cs102-a", courseId: "crs-cs102", name: "Section A", schedule: "Mon/Wed 1:30 PM", room: "Lab 3", roster: 18,
      periods: {
        prelim: { kind: "submitted", at: daysAgoISO(4) },
        midterm: { kind: "draft", fill: 0.7 },
        semifinals: { kind: "empty" },
        finals: { kind: "empty" },
      },
    },
    {
      key: "cs102-b", courseId: "crs-cs102", name: "Section B", schedule: "Fri 8:00 AM", room: "Room 112", roster: 12,
      enforceOrder: false,
      periods: {
        prelim: { kind: "submitted", at: todayISO() },
        midterm: { kind: "draft", fill: 0.5 },
        semifinals: { kind: "draft", fill: 0.4 },
        finals: { kind: "empty" },
      },
    },
    {
      key: "cs201-a", courseId: "crs-cs201", name: "Section A", schedule: "Tue/Thu 3:00 PM", room: "Room 310", roster: 15,
      unlocked: ["finals"],
      periods: {
        prelim: { kind: "draft", fill: 0.6 },
        midterm: { kind: "empty" },
        semifinals: { kind: "empty" },
        finals: { kind: "draft", fill: 0.3 },
      },
    },
    {
      key: "it210-a", courseId: "crs-it210", name: "Section A", schedule: "Mon/Thu 10:00 AM", room: "Lab 2", roster: 16,
      weights: { prelim: 30, midterm: 20, semifinals: 25, finals: 25 },
      periods: {
        prelim: { kind: "submitted", at: iso(2026, 1, 16, 17, 30) },
        midterm: { kind: "submitted", at: iso(2026, 2, 20, 16, 45) },
        semifinals: { kind: "submitted", at: iso(2026, 3, 27, 18, 10) },
        finals: { kind: "submitted", at: iso(2026, 4, 24, 17, 5) },
      },
    },
    {
      key: "it210-b", courseId: "crs-it210", name: "Section B", schedule: "Wed/Fri 2:30 PM", room: "Lab 2", roster: 14,
      displayScale: "scale5",
      periods: {
        prelim: { kind: "submitted", at: iso(2026, 2, 6, 17, 15) },
        midterm: { kind: "draft", fill: 0.75 },
        semifinals: { kind: "empty" },
        finals: { kind: "empty" },
      },
    },
    {
      key: "it220-a", courseId: "crs-it220", name: "Section A", schedule: "Tue/Fri 9:00 AM", room: "Room 305", roster: 9,
      periods: { prelim: { kind: "empty" }, midterm: { kind: "empty" }, semifinals: { kind: "empty" }, finals: { kind: "empty" } },
    },
    {
      key: "it220-b", courseId: "crs-it220", name: "Section B", schedule: "Mon/Wed 4:00 PM", room: "Room 305", roster: 11,
      periods: {
        prelim: { kind: "submitted", at: iso(2026, 3, 6, 16, 40) },
        midterm: { kind: "submitted", at: iso(2026, 4, 10, 15, 55) },
        semifinals: { kind: "draft", fill: 0.8 },
        finals: { kind: "empty" },
      },
    },
  ];

  const sections: Section[] = [];
  const assessments: Assessment[] = [];
  const students: Student[] = [];
  const grades: Grade[] = [];
  const periodStates: DbShape["periodStates"] = {};
  let stampIdx = 0;

  for (let planIdx = 0; planIdx < plans.length; planIdx++) {
    const plan = plans[planIdx];
    const sectionId = `sec-${plan.key}`;
    sections.push({
      id: sectionId,
      courseId: plan.courseId,
      name: plan.name,
      schedule: plan.schedule,
      room: plan.room,
      displayScale: plan.displayScale ?? "percent-letter",
      scaleTable: DEFAULT_SCALE_TABLE.map((r) => ({ ...r })),
      periodWeights: plan.weights ? { ...plan.weights } : { prelim: 25, midterm: 25, semifinals: 25, finals: 25 },
      enforceOrder: plan.enforceOrder ?? true,
      unlockedPeriods: plan.unlocked ? [...plan.unlocked] : [],
      createdAt: iso(2025, 8, 12, 10, 0),
    });

    // Roster: plausible names + "2023-10457"-style institutional numbers,
    // unique per section (planIdx × 100 offset).
    const roster: Student[] = [];
    for (let i = 0; i < plan.roster; i++) {
      const year = pickFrom([2022, 2023, 2024] as const);
      roster.push({
        id: `stu-${plan.key}-${i}`,
        sectionId,
        studentNo: `${year}-${String(10000 + planIdx * 100 + i).padStart(5, "0")}`,
        name: `${pickFrom(FIRST_NAMES)} ${pickFrom(LAST_NAMES)}`,
      });
    }
    students.push(...roster);

    const states: Record<PeriodId, PeriodState> = {} as Record<PeriodId, PeriodState>;

    for (let pIdx = 0; pIdx < PERIODS.length; pIdx++) {
      const period = PERIODS[pIdx];
      const pp = plan.periods[period];

      // Every section and period uses the professor's Excel class-record
      // layout — identical from Prelim to Finals.
      const periodAssessments: Assessment[] = SHEET_DEFS.map((d, i) => ({
        id: `as-${plan.key}-${period}-${i}`,
        sectionId,
        period,
        name: d.name,
        maxScore: d.maxScore,
        weight: d.weight,
        group: d.group,
        order: i,
      }));
      assessments.push(...periodAssessments);

      if (pp.kind !== "empty") {
        const fill = pp.kind === "submitted" ? 1 : pp.fill;
        for (const a of periodAssessments) {
          for (let si = 0; si < roster.length; si++) {
            if (rand() >= fill) continue;
            const t = rand();
            const frac = t < 0.12 ? 0.45 + 0.25 * rand() : 0.62 + 0.38 * rand();
            grades.push({
              id: `gr-${plan.key}-${period}-${a.order}-${si}`,
              sectionId,
              assessmentId: a.id,
              studentRowId: roster[si].id,
              score: Math.min(a.maxScore, Math.round(a.maxScore * frac)),
              updatedAt: STAMPS[stampIdx++ % STAMPS.length],
            });
          }
        }
      }

      states[period] =
        pp.kind === "submitted"
          ? { status: "submitted", submittedAt: pp.at }
          : pp.kind === "draft"
            ? { status: "draft", submittedAt: null }
            : { status: "not_started", submittedAt: null };
    }
    periodStates[sectionId] = states;
  }

  const professorOf = (courseId: string): string => courses.find((c) => c.id === courseId)?.professorId ?? "prof-admin";

  // ── history ────────────────────────────────────────────────────────────────
  const history: HistoryEntry[] = [];
  const pushH = (h: Omit<HistoryEntry, "id">) => {
    history.push({ id: `hist-${history.length + 1}`, ...h });
  };

  // One "submit" entry per submitted period (consistent with periodStates).
  for (const plan of plans) {
    const sectionId = `sec-${plan.key}`;
    const actorId = professorOf(plan.courseId);
    const countFor = (p: PeriodId) => assessments.filter((a) => a.sectionId === sectionId && a.period === p).length;
    for (const p of PERIODS) {
      const pp = plan.periods[p];
      if (pp.kind === "submitted") {
        pushH({
          sectionId, kind: "submit", period: p, assessmentId: null, studentRowId: null,
          oldScore: null, newScore: null, at: pp.at, actorId,
          detail: `${plan.roster} ${plan.roster === 1 ? "student" : "students"} · ${countFor(p)} assessments`,
        });
      }
    }
  }

  // CSV-import story on cs102-a prelim (D12: one aggregate entry, no per-cell).
  pushH({
    sectionId: "sec-cs102-a", kind: "import", period: "prelim", assessmentId: null, studentRowId: null,
    oldScore: null, newScore: null, at: iso(2025, 9, 24, 16, 0), actorId: "prof-cruz",
    detail: "CSV import · 18 rows · 17 applied, 1 skipped",
  });

  // Reopen story on cs102-b prelim: submitted 6d ago → reopened 5d ago →
  // resubmitted today (matches the submittedAt anchor above).
  pushH({
    sectionId: "sec-cs102-b", kind: "submit", period: "prelim", assessmentId: null, studentRowId: null,
    oldScore: null, newScore: null, at: daysAgoISO(6), actorId: "prof-cruz",
    detail: "12 students · 4 assessments",
  });
  pushH({
    sectionId: "sec-cs102-b", kind: "reopen", period: "prelim", assessmentId: null, studentRowId: null,
    oldScore: null, newScore: null, at: daysAgoISO(5), actorId: "prof-cruz",
    detail: "Reopened to correct one late-encoded score",
  });

  // Grade-cell stories (each chain ends at the cell's current score so history
  // tracing shows "85 → 92"-style transitions that match the live data).
  interface CellStory {
    planKey: string; period: PeriodId; aIdx: number; sIdx: number; finalScore: number;
    steps: { old: number | null; new: number | null; at: string }[];
  }
  const cellStories: CellStory[] = [
    { planKey: "cs101-a", period: "semifinals", aIdx: 0, sIdx: 2, finalScore: 92, steps: [{ old: null, new: 85, at: iso(2025, 11, 18, 9, 10) }, { old: 85, new: 92, at: iso(2025, 11, 19, 14, 25) }] },
    { planKey: "cs102-a", period: "midterm", aIdx: 1, sIdx: 4, finalScore: 78, steps: [{ old: null, new: 72, at: iso(2025, 10, 14, 10, 0) }, { old: 72, new: 78, at: iso(2025, 10, 15, 16, 30) }] },
    { planKey: "cs201-a", period: "finals", aIdx: 0, sIdx: 1, finalScore: 88, steps: [{ old: null, new: 88, at: iso(2025, 11, 5, 15, 20) }] },
    { planKey: "it210-a", period: "finals", aIdx: 0, sIdx: 0, finalScore: 90, steps: [{ old: null, new: 85, at: iso(2026, 4, 14, 9, 30) }, { old: 85, new: 90, at: iso(2026, 4, 16, 11, 45) }] },
    { planKey: "it220-b", period: "semifinals", aIdx: 0, sIdx: 3, finalScore: 70, steps: [{ old: null, new: 70, at: iso(2026, 4, 20, 13, 10) }] },
    { planKey: "cs101-a", period: "prelim", aIdx: 0, sIdx: 5, finalScore: 90, steps: [{ old: null, new: 90, at: iso(2025, 9, 22, 10, 40) }] },
    { planKey: "cs102-b", period: "midterm", aIdx: 0, sIdx: 2, finalScore: 74, steps: [{ old: null, new: 65, at: iso(2025, 10, 20, 9, 15) }, { old: 65, new: 74, at: iso(2025, 10, 21, 14, 5) }] },
  ];
  for (const story of cellStories) {
    const plan = plans.find((p) => p.key === story.planKey);
    if (!plan) continue;
    const gradeId = `gr-${story.planKey}-${story.period}-${story.aIdx}-${story.sIdx}`;
    const last = story.steps[story.steps.length - 1];
    for (const step of story.steps) {
      pushH({
        sectionId: `sec-${story.planKey}`, kind: "grade", period: story.period,
        assessmentId: `as-${story.planKey}-${story.period}-${story.aIdx}`,
        studentRowId: `stu-${story.planKey}-${story.sIdx}`,
        oldScore: step.old, newScore: step.new, at: step.at,
        actorId: professorOf(plan.courseId),
      });
    }
    const existing = grades.find((g) => g.id === gradeId);
    if (existing) {
      existing.score = story.finalScore;
      existing.updatedAt = last.at;
    } else {
      grades.push({
        id: gradeId, sectionId: `sec-${story.planKey}`,
        assessmentId: `as-${story.planKey}-${story.period}-${story.aIdx}`,
        studentRowId: `stu-${story.planKey}-${story.sIdx}`,
        score: story.finalScore, updatedAt: last.at,
      });
    }
  }

  // ── comments (≥1 period-tagged, authored by the admin) ─────────────────────
  const comments: Comment[] = [
    {
      id: "cmt-1", sectionId: "sec-cs101-a", period: "midterm", authorId: "prof-admin", authorName: "Dr. Marisol Reyes",
      body: "Midterm results track the prelim distribution closely. Please double-check the two absentees before you submit semifinals.",
      at: iso(2025, 11, 12, 10, 20),
    },
    {
      id: "cmt-2", sectionId: "sec-cs101-a", period: null, authorId: "prof-cruz", authorName: "Prof. Antonio Cruz",
      body: "Noted — both are taking the make-up exam this week; I will encode their scores as soon as it is done.",
      at: daysAgoISO(1),
    },
    {
      id: "cmt-3", sectionId: "sec-cs102-a", period: null, authorId: "prof-admin", authorName: "Dr. Marisol Reyes",
      body: "Department review is on Friday — please have prelim grades submitted by Thursday noon.",
      at: daysAgoISO(3),
    },
    {
      id: "cmt-4", sectionId: "sec-it210-a", period: "finals", authorId: "prof-admin", authorName: "Dr. Marisol Reyes",
      body: "Finals for this section are complete and the weighted average checks out. Great work.",
      at: iso(2026, 4, 28, 9, 0),
    },
    {
      id: "cmt-5", sectionId: "sec-it210-a", period: null, authorId: "prof-bautista", authorName: "Prof. Liza Bautista",
      body: "Thank you — the summary sheet is with the college office already.",
      at: iso(2026, 4, 29, 10, 15),
    },
  ];

  return {
    profiles, courses, sections, assessments, students, grades, periodStates, history, comments,
    attendance: [] as AttendanceRow[],
    calendarEvents: [] as CalendarEvent[],
  };
}
