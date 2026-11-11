// Dev-only assertion page (WO-2 step 10, D19). Served via /seedcheck.html —
// NOT part of `vite build` (which only reads index.html). WO-7 decides whether
// these dev files stay; README documents either way.
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { api } from "../api";
import { buildSeed, TERMS } from "../data/seed";
import { countCompleteness, isPeriodEditable, periodGrade, scaleLookup, semesterGrade } from "../lib/grades";
import { parseCsv, parseRoster } from "../lib/csv";
import { DEFAULT_SCALE_TABLE, isWithinLastDays } from "../lib/format";
import { ApiError, PERIODS } from "../types";
import type { PeriodId, PeriodState, Section } from "../types";

interface CheckResult { name: string; pass: boolean; detail: string }

// ── tiny assertion helpers ───────────────────────────────────────────────────

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function eqJson(got: unknown, want: unknown, label: string): void {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) throw new Error(`${label}: got ${g}, want ${w}`);
}

function near(got: number | null, want: number, eps: number, label: string): void {
  if (got == null || Math.abs(got - want) > eps) throw new Error(`${label}: got ${got}, want ~${want}`);
}

// ── fixtures ─────────────────────────────────────────────────────────────────

function st(status: PeriodState["status"]): PeriodState {
  return { status, submittedAt: status === "submitted" ? "2025-11-01T08:00:00.000Z" : null };
}

function states(...statuses: PeriodState["status"][]): Record<PeriodId, PeriodState> {
  const [prelim, midterm, semifinals, finals] = statuses;
  return { prelim: st(prelim), midterm: st(midterm), semifinals: st(semifinals), finals: st(finals) };
}

function fixtureSection(overrides: Partial<Section>): Section {
  return {
    id: "sec-x", courseId: "crs-x", name: "Section X", schedule: "Mon 9:00", room: "R1",
    displayScale: "percent-letter", scaleTable: DEFAULT_SCALE_TABLE,
    periodWeights: { prelim: 25, midterm: 25, semifinals: 25, finals: 25 },
    enforceOrder: true, unlockedPeriods: [], createdAt: "2025-08-01T00:00:00.000Z",
    ...overrides,
  };
}

// ── checks ───────────────────────────────────────────────────────────────────

const checks: { name: string; run: () => string | Promise<string> }[] = [
  {
    name: "Seed counts — 3 profiles · 6 courses · 9 sections",
    run: () => {
      const s = buildSeed();
      assert(s.profiles.length === 3, `profiles: ${s.profiles.length}`);
      assert(s.courses.length === 6, `courses: ${s.courses.length}`);
      assert(s.sections.length === 9, `sections: ${s.sections.length}`);
      return `profiles ${s.profiles.length} · courses ${s.courses.length} · sections ${s.sections.length} · students ${s.students.length} · grades ${s.grades.length}`;
    },
  },
  {
    name: "Seed terms — 4 terms; AY 2026-2027 has 0 courses (D7)",
    run: () => {
      assert(TERMS.length === 4, `TERMS: ${TERMS.length}`);
      const future = buildSeed().courses.filter((c) => c.academicYear === "2026-2027").length;
      assert(future === 0, `AY 2026-2027 courses: ${future}`);
      return `TERMS ${TERMS.length} · AY 2026-2027 courses 0 — empty-state path reachable`;
    },
  },
  {
    name: "Seed rosters — every section has 8–20 students",
    run: () => {
      const s = buildSeed();
      for (const sec of s.sections) {
        const n = s.students.filter((x) => x.sectionId === sec.id).length;
        assert(n >= 8 && n <= 20, `${sec.id}: ${n} students`);
      }
      return `all ${s.sections.length} sections within 8–20`;
    },
  },
  {
    name: "Seed assessments — 3–5 per section period",
    run: () => {
      const s = buildSeed();
      for (const sec of s.sections) {
        for (const p of PERIODS) {
          const n = s.assessments.filter((a) => a.sectionId === sec.id && a.period === p).length;
          assert(n >= 3 && n <= 5, `${sec.id}/${p}: ${n}`);
        }
      }
      return `all ${s.sections.length * PERIODS.length} section-periods within 3–5`;
    },
  },
  {
    name: "Seed variety — lock cases, scale5, all-submitted, equal-weight period",
    run: () => {
      const s = buildSeed();
      assert(s.sections.some((sec) => sec.enforceOrder === false), "no enforceOrder:false section");
      assert(s.sections.some((sec) => sec.unlockedPeriods.includes("finals")), "no unlockedPeriods:['finals'] section");
      assert(s.sections.some((sec) => sec.displayScale === "scale5"), "no scale5 section");
      const allSubmitted = s.sections.filter((sec) => PERIODS.every((p) => s.periodStates[sec.id][p].status === "submitted")).length;
      assert(allSubmitted >= 1, `all-submitted sections: ${allSubmitted}`);
      for (const sec of s.sections) {
        const equalWeightPeriods = PERIODS.filter((p) => {
          const list = s.assessments.filter((a) => a.sectionId === sec.id && a.period === p);
          return list.length > 0 && list.every((a) => a.weight == null);
        }).length;
        assert(equalWeightPeriods >= 1, `${sec.id}: ${equalWeightPeriods} equal-weight periods`);
      }
      return "enforceOrder:false ✓ · unlocked finals ✓ · scale5 ✓ · all-submitted ✓ · equal-weight period per section ✓";
    },
  },
  {
    name: "Seed history — ≥12 entries incl. grade pair, import, reopen, submit",
    run: () => {
      const s = buildSeed();
      assert(s.history.length >= 12, `history: ${s.history.length}`);
      const kinds = new Set(s.history.map((h) => h.kind));
      for (const k of ["grade", "import", "reopen", "submit"] as const) assert(kinds.has(k), `missing kind "${k}"`);
      const gradeEntries = s.history.filter((h) => h.kind === "grade");
      const hasPair = gradeEntries.some((h, i) =>
        gradeEntries.some(
          (o, j) =>
            i !== j && o.assessmentId === h.assessmentId && o.studentRowId === h.studentRowId &&
            h.oldScore != null && h.newScore != null && h.oldScore !== h.newScore,
        ),
      );
      assert(hasPair, "no grade pair with different old/new scores");
      return `${s.history.length} entries (${gradeEntries.length} grade) · pair ✓ import ✓ reopen ✓ submit ✓`;
    },
  },
  {
    name: "Seed comments — ≥4, ≥1 period-tagged by the admin",
    run: () => {
      const s = buildSeed();
      assert(s.comments.length >= 4, `comments: ${s.comments.length}`);
      const adminTagged = s.comments.filter((c) => {
        const author = s.profiles.find((p) => p.id === c.authorId);
        return author?.role === "admin" && c.period != null;
      }).length;
      assert(adminTagged >= 1, `admin period-tagged: ${adminTagged}`);
      return `${s.comments.length} comments · ${adminTagged} period-tagged by admin`;
    },
  },
  {
    name: "Seed freshness — 2–3 submittedAt inside the last 7 days (D9)",
    run: () => {
      const s = buildSeed();
      let recent = 0;
      for (const perSection of Object.values(s.periodStates)) {
        for (const p of PERIODS) {
          const state = perSection[p];
          if (state.status === "submitted" && isWithinLastDays(state.submittedAt, 7)) recent += 1;
        }
      }
      assert(recent >= 2 && recent <= 3, `recent submissions: ${recent}`);
      return `${recent} submissions anchored inside the current week`;
    },
  },
  {
    name: "Seed grades — every score within [0, maxScore] (D1 naming intact)",
    run: () => {
      const s = buildSeed();
      const maxById = new Map(s.assessments.map((a) => [a.id, a.maxScore]));
      for (const g of s.grades) {
        const max = maxById.get(g.assessmentId);
        assert(max != null && g.score != null && g.score >= 0 && g.score <= max, `grade ${g.id} = ${g.score} vs max ${max}`);
        assert("studentRowId" in g, "grade must reference studentRowId");
      }
      for (const st2 of s.students) assert(!("studentId" in st2), "Student must use studentNo, never studentId");
      return `${s.grades.length} grade rows in range · studentRowId/studentNo naming ✓`;
    },
  },
  {
    name: "periodGrade — weighted mode (D14)",
    run: () => {
      const got = periodGrade([
        { assessmentId: "a", maxScore: 20, weight: 30, score: 18 },
        { assessmentId: "b", maxScore: 50, weight: null, score: 45 },
      ]);
      near(got, 90, 1e-9, "weighted");
      return "18/20·w30 + 45/50·w(null→0) → 90%";
    },
  },
  {
    name: "periodGrade — equal-weight fallback + null/zero cases",
    run: () => {
      near(
        periodGrade([
          { assessmentId: "a", maxScore: 10, weight: null, score: 8 },
          { assessmentId: "b", maxScore: 40, weight: null, score: 30 },
        ]),
        77.5, 1e-9, "equal",
      );
      assert(periodGrade([]) === null, "empty → null");
      assert(periodGrade([{ assessmentId: "a", maxScore: 0, weight: null, score: 5 }]) === null, "maxScore≤0 excluded → null");
      near(periodGrade([{ assessmentId: "a", maxScore: 10, weight: null, score: null }]), 0, 1e-9, "missing score counts 0");
      return "equal 77.5% · []→null · maxScore≤0 excluded · missing score→0";
    },
  },
  {
    name: "semesterGrade — missing period keeps its weight, contributes 0 (D10)",
    run: () => {
      const got = semesterGrade({
        periodGrades: [
          { period: "prelim", pct: 80, hasAssessments: true },
          { period: "midterm", pct: null, hasAssessments: true },
          { period: "semifinals", pct: 90, hasAssessments: true },
          { period: "finals", pct: null, hasAssessments: false },
        ],
        weights: { prelim: 25, midterm: 25, semifinals: 25, finals: 25 },
      });
      near(got.pct, 4250 / 75, 1e-9, "pct");
      assert(got.usedWeight === 75, `usedWeight: ${got.usedWeight}`);
      assert(got.complete === false, "complete must be false");
      return "pct ≈ 56.67 (4250/75) · usedWeight 75 · complete false";
    },
  },
  {
    name: "isPeriodEditable — truth table for the four lock cases (D6)",
    run: () => {
      const ordered = fixtureSection({});
      assert(!isPeriodEditable({ section: ordered, states: states("submitted", "not_started", "not_started", "not_started"), period: "prelim" }), "submitted must be locked");
      const free = fixtureSection({ enforceOrder: false });
      assert(isPeriodEditable({ section: free, states: states("not_started", "not_started", "not_started", "not_started"), period: "finals" }), "enforceOrder:false unlocks all");
      const unlocked = fixtureSection({ unlockedPeriods: ["finals"] });
      assert(isPeriodEditable({ section: unlocked, states: states("draft", "not_started", "not_started", "not_started"), period: "finals" }), "manually unlocked period is editable");
      assert(isPeriodEditable({ section: ordered, states: states("draft", "not_started", "not_started", "not_started"), period: "prelim" }), "first non-submitted is editable");
      assert(!isPeriodEditable({ section: ordered, states: states("draft", "not_started", "not_started", "not_started"), period: "midterm" }), "later non-submitted is locked");
      return "submitted→locked · enforceOrder:false→open · unlocked→open · first-open→editable · later→locked";
    },
  },
  {
    name: "parseCsv — quoted fields, \"\" escapes, CRLF, BOM",
    run: () => {
      eqJson(
        parseCsv('Name,Score,Note\r\n"Reyes, Anna",92,"Said ""great"""\r\nJose,88,plain\r\n'),
        [["Name", "Score", "Note"], ["Reyes, Anna", "92", 'Said "great"'], ["Jose", "88", "plain"]],
        "quoted sample",
      );
      eqJson(parseCsv("\uFEFFa,b\n1,2"), [["a", "b"], ["1", "2"]], "BOM sample");
      return 'quoted comma ✓ · "" escape ✓ · CRLF ✓ · BOM ✓ · trailing newline → no phantom row ✓';
    },
  },
  {
    name: "parseRoster — tab & comma, either ID side, blanks dropped",
    run: () => {
      eqJson(
        parseRoster("Anna Cruz\t2023-10457\n2024-00123,Jose Santos\n\nMaria Reyes\nBob\tAB12\n"),
        [
          { name: "Anna Cruz", studentNo: "2023-10457" },
          { name: "Jose Santos", studentNo: "2024-00123" },
          { name: "Maria Reyes", studentNo: "" },
          { name: "Bob AB12", studentNo: "" },
        ],
        "mixed input",
      );
      return "tab ✓ · comma ✓ · ID-first ✓ · blank line dropped ✓ · name-only rows kept (ID optional) ✓";
    },
  },
  {
    name: "scaleLookup — boundaries on the default table (§3.5)",
    run: () => {
      assert(scaleLookup(DEFAULT_SCALE_TABLE, 100).letter === "A+", "100 → A+");
      assert(scaleLookup(DEFAULT_SCALE_TABLE, 97).letter === "A+", "97 → A+");
      assert(scaleLookup(DEFAULT_SCALE_TABLE, 96.99).letter === "A", "96.99 → A");
      assert(scaleLookup(DEFAULT_SCALE_TABLE, 92).grade5 === 1.5, "92 → 1.50");
      assert(scaleLookup(DEFAULT_SCALE_TABLE, 64.9).letter === "F", "64.9 → F");
      assert(scaleLookup(DEFAULT_SCALE_TABLE, 0).grade5 === 5, "0 → 5.00");
      return "100/97→A+ · 96.99→A · 92→1.50 · 64.9→F · 0→F 5.00";
    },
  },
  {
    name: "countCompleteness — cells, perAssessment, complete flag",
    run: () => {
      const students = [
        { id: "s1", sectionId: "sec-x", studentNo: "2023-00001", name: "A" },
        { id: "s2", sectionId: "sec-x", studentNo: "2023-00002", name: "B" },
      ];
      const assessments = [
        { id: "a1", sectionId: "sec-x", period: "prelim" as const, name: "Q1", maxScore: 10, weight: null, group: null as string | null, order: 0 },
        { id: "a2", sectionId: "sec-x", period: "prelim" as const, name: "Q2", maxScore: 10, weight: null, group: null as string | null, order: 1 },
      ];
      const grades = [
        { id: "g1", sectionId: "sec-x", assessmentId: "a1", studentRowId: "s1", score: 9, updatedAt: "2025-01-01T00:00:00.000Z" },
        { id: "g2", sectionId: "sec-x", assessmentId: "a1", studentRowId: "s2", score: 8, updatedAt: "2025-01-01T00:00:00.000Z" },
        { id: "g3", sectionId: "sec-x", assessmentId: "a2", studentRowId: "s1", score: 7, updatedAt: "2025-01-01T00:00:00.000Z" },
      ];
      const got = countCompleteness({ students, assessments, grades, period: "prelim" });
      assert(got.totalCells === 4 && got.gradedCells === 3 && got.complete === false, JSON.stringify(got));
      eqJson(got.perAssessment, { a1: true, a2: false }, "perAssessment");
      return "4 cells · 3 graded · complete false · a1 ✓ a2 ✗";
    },
  },
  {
    name: "api.getTermOverview(1st Sem 2025-2026) — ≥5 sections × 4 periods",
    run: async () => {
      await api.signIn("admin@northstate.edu", "demo1234");
      const overview = await api.getTermOverview(TERMS[0]);
      assert(overview.length >= 5, `sections: ${overview.length}`); // ≥5 seed sections (may grow if demoed)
      for (const row of overview) {
        assert(row.periods.length === 4, `${row.section.id}: ${row.periods.length} periods`);
        assert(row.professorName.length > 0, "professorName empty");
        assert(row.studentCount >= 8, `studentCount ${row.studentCount}`);
        assert(typeof row.section.periodWeights.prelim === "number", "periodWeights.prelim missing");
      }
      const complete = overview.find((r) => r.periods.every((p) => p.status === "submitted"));
      assert(complete != null, "no all-submitted section in overview");
      await api.signOut();
      return `${overview.length} sections · 4 periods each · all-submitted section present (${complete.course.code} ${complete.section.name})`;
    },
  },
  {
    name: "api.signIn — wrong password rejects with BAD_CREDENTIALS",
    run: async () => {
      let code: string | undefined;
      try {
        await api.signIn("acruz@northstate.edu", "wrong");
      } catch (err) {
        if (err instanceof ApiError) code = err.code;
      }
      assert(code === "BAD_CREDENTIALS", `code: ${code ?? "(no throw)"}`);
      return "rejected with BAD_CREDENTIALS ✓";
    },
  },
  {
    name: "api scoping — foreign course invisible; duplicate code rejected",
    run: async () => {
      await api.signIn("lbautista@northstate.edu", "demo1234");
      const foreign = await api.getCourse("crs-cs101"); // owned by Prof. Cruz
      assert(foreign === null, "professor must not see another professor's course");
      await api.signOut();

      await api.signIn("acruz@northstate.edu", "demo1234");
      let code: string | undefined;
      let field: string | undefined;
      try {
        await api.createCourse({ code: "cs101", title: "Duplicate", academicYear: "2025-2026", semester: 1 });
      } catch (err) {
        if (err instanceof ApiError) {
          code = err.code;
          field = err.field;
        }
      }
      await api.signOut();
      assert(code === "DUPLICATE_CODE", `code: ${code ?? "(no throw)"}`);
      assert(field === "code", `field: ${field ?? "(none)"}`);
      return "foreign course → null ✓ · duplicate code → DUPLICATE_CODE with field 'code' ✓";
    },
  },
];

async function runAll(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  for (const check of checks) {
    try {
      const detail = await check.run();
      results.push({ name: check.name, pass: true, detail });
    } catch (err) {
      results.push({ name: check.name, pass: false, detail: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}

// ── page ─────────────────────────────────────────────────────────────────────

function SeedCheckPage() {
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return; // StrictMode double-effect safe
    startedRef.current = true;
    void runAll().then(setResults);
  }, []);
  const passed = results ? results.filter((r) => r.pass).length : 0;
  const failed = results ? results.length - passed : 0;

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 20px", fontFamily: "ui-monospace, monospace", fontSize: 13, color: "#1c1a16" }}>
      <h1 style={{ fontSize: 20, margin: "0 0 4px" }}>Seed & logic checks</h1>
      <p style={{ margin: "0 0 16px", color: "#7c7566" }}>
        Dev-only page (D19). Auth checks sign in and out, so the session is cleared afterwards.
      </p>
      {results == null ? (
        <p>Running {checks.length} checks…</p>
      ) : (
        <>
          <p style={{ margin: "0 0 12px", fontWeight: 700 }}>
            {failed === 0 ? "ALL PASS" : "FAILURES PRESENT"} — {passed}/{results.length}
          </p>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {results.map((r) => (
              <li
                key={r.name}
                style={{
                  border: `1px solid ${r.pass ? "#cfc3a6" : "#a3321f"}`,
                  background: r.pass ? "transparent" : "#fbeae6",
                  padding: "8px 12px",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  {r.pass ? "PASS" : "FAIL"} — {r.name}
                </div>
                <div style={{ color: r.pass ? "#4a463d" : "#a3321f", whiteSpace: "pre-wrap" }}>{r.detail}</div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<SeedCheckPage />);
}
