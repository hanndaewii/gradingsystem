// The term windows, the no-class days and the move warning, end to end.
//   node --env-file=.env scripts/test-term-dates.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const bundle = join(mkdtempSync(join(tmpdir(), "faculty-term-")), "api.cjs");
execFileSync(
  process.execPath,
  [
    "node_modules/esbuild/bin/esbuild",
    "src/api/supabase.ts",
    "--bundle",
    "--format=cjs",
    "--platform=node",
    `--define:import.meta.env=${JSON.stringify({
      VITE_SUPABASE_URL: process.env.SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
    })}`,
    `--outfile=${bundle}`,
  ],
  { stdio: "ignore" },
);
const { createSupabaseApi } = require(bundle);
const api = createSupabaseApi();
let failures = 0;
const ok = (c, m) => {
  if (!c) failures += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${m}`);
};

await api.signInWithRole(process.env.HEAD_EMAIL, process.env.PROF_PASSWORD, "professor");
const courses = await api.listCourses({ academicYear: "2025-2026", semester: 1 });
const section = (await api.listSections(courses[0].id))[0];
const student = (await api.listStudents(section.id))[0];

const marks = async () =>
  (await api.listAttendance(section.id)).filter((r) => r.studentRowId === student.id);
const scoreOf = async (period) => {
  const list = await api.listAssessments(section.id, period);
  const crit = list.find((a) => a.name.toLowerCase() === "attendance");
  if (!crit) return null;
  const grades = await api.listGrades(section.id);
  const g = grades.find((x) => x.assessmentId === crit.id && x.studentRowId === student.id);
  return g ? g.score : null;
};

// Scratch days of our own — the professor's marks are never touched.
const SCRATCH_A = "2026-12-15";
const SCRATCH_B = "2026-12-16";
const before = await marks();
const beforeScore = await scoreOf("prelim");
console.log(`   the professor has ${before.length} mark(s), Attendance ${beforeScore}`);

try {
  // ── 1 · the windows are read and written ─────────────────────────────────
  const dates = await api.listTermDates(section.id);
  ok(
    dates.prelim != null && dates.midterm != null && dates.semifinals != null && dates.finals != null,
    "every term has a window",
  );

  await api.setTermDates(section.id, "prelim", "2026-11-01", "2026-11-30");
  ok(
    (await api.listTermDates(section.id)).prelim.startDate === "2026-11-01",
    "the Prelim window was saved",
  );
  ok(
    (await marks()).every((r) => r.period === "prelim"),
    "the professor's marks did not move — November is inside the Prelim window",
  );

  // ── 2 · a "no class" day is left out of the score ────────────────────────
  await api.setAttendance(section.id, "prelim", student.id, SCRATCH_B, "a");
  const withAbsent = await scoreOf("prelim");
  ok(withAbsent < beforeScore, `an absence lowers the score (${beforeScore} → ${withAbsent})`);
  await api.setCalendarEvent(section.id, {
    period: "prelim",
    eventDate: SCRATCH_B,
    kind: "holiday",
    label: "No class",
  });
  const withoutAbsent = await scoreOf("prelim");
  ok(
    withoutAbsent === beforeScore,
    `a "no class" day is left out of the score (${withAbsent} → ${withoutAbsent})`,
  );
  await api.clearCalendarEvent(section.id, SCRATCH_B);
  ok(
    (await scoreOf("prelim")) === withAbsent,
    "removing the no-class marker brings the absence back",
  );
  await api.setAttendance(section.id, "prelim", student.id, SCRATCH_B, null);

  // ── 3 · the preview says what would move ─────────────────────────────────
  await api.setAttendance(section.id, "prelim", student.id, SCRATCH_A, "p");
  const preview = await api.previewTermDates(section.id, "midterm", "2026-12-01", "2026-12-31");
  ok(
    preview.some((m) => m.from === "prelim" && m.to === "midterm" && m.count === 1),
    `the preview names the marks that would move (${JSON.stringify(preview)})`,
  );
  ok(
    !preview.some((m) => m.count > 1),
    "the professor's own November marks are not affected",
  );

  // ── 4 · applying moves them ──────────────────────────────────────────────
  await api.setTermDates(section.id, "midterm", "2026-12-01", "2026-12-31");
  const moved = await marks();
  ok(
    moved.some((r) => r.sessionDate === SCRATCH_A && r.period === "midterm"),
    "the scratch mark moved to Midterm",
  );
  ok(
    moved.filter((r) => r.sessionDate !== SCRATCH_A).every((r) => r.period === "prelim"),
    "the professor's marks stayed in Prelim",
  );

  // ── 5 · everything is put back ───────────────────────────────────────────
  await api.setTermDates(section.id, "prelim", "2026-11-01", "2026-12-31");
  ok(
    (await marks()).some((r) => r.sessionDate === SCRATCH_A && r.period === "prelim"),
    "the scratch mark moved back to Prelim",
  );
  await api.setAttendance(section.id, "prelim", student.id, SCRATCH_A, null);
  await api.setTermDates(section.id, "prelim", null, null);
  await api.setTermDates(section.id, "midterm", null, null);

  const restored = await marks();
  ok(
    restored.length === before.length &&
      before.every((r) =>
        restored.some(
          (x) => x.sessionDate === r.sessionDate && x.status === r.status && x.period === r.period,
        ),
      ),
    `the professor's ${before.length} mark(s) are back exactly`,
  );
  ok((await scoreOf("prelim")) === beforeScore, `the Attendance score is back to ${beforeScore}`);
  ok((await api.listTermDates(section.id)).prelim.startDate === null, "the windows are empty again");
} catch (err) {
  failures += 1;
  console.error("crashed:", err);
} finally {
  // Safety net: always clear our scratch marks and the windows.
  try {
    await api.setTermDates(section.id, "prelim", "2026-11-01", "2026-12-31");
    await api.setAttendance(section.id, "prelim", student.id, SCRATCH_A, null);
    await api.setAttendance(section.id, "prelim", student.id, SCRATCH_B, null);
    await api.clearCalendarEvent(section.id, SCRATCH_B);
    await api.setTermDates(section.id, "prelim", null, null);
    await api.setTermDates(section.id, "midterm", null, null);
    const left = (await api.listAttendance(section.id)).filter((r) => r.studentRowId === student.id);
    console.log(`   marks left: ${left.length} (Attendance ${await scoreOf("prelim")})`);
  } catch (err) {
    console.error("could not clean up:", err);
  }
}

console.log(failures === 0 ? "\nterm dates verified" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
