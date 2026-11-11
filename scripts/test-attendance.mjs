// End-to-end test of the attendance calendar flow against the live database:
// per-day marks, the aggregated Attendance score, and calendar milestones.
//   node --env-file=.env scripts/test-attendance.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const dir = mkdtempSync(join(tmpdir(), "faculty-att-"));
const bundle = join(dir, "api.cjs");
const env = JSON.stringify({
  VITE_SUPABASE_URL: process.env.SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
});
execFileSync(
  process.execPath,
  [
    "node_modules/esbuild/bin/esbuild",
    "src/api/supabase.ts",
    "--bundle",
    "--format=cjs",
    "--platform=node",
    `--define:import.meta.env=${env}`,
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

const profile = await api.signInWithRole(process.env.HEAD_EMAIL, "Doleo dolorem", "professor");
const term = { academicYear: "2025-2026", semester: 1 };
const courses = await api.listCourses(term);
const course = courses[0];
const sections = await api.listSections(course.id);
const section = sections[0];
console.log(`section: ${course.code} · ${section.name}\n`);

const students = await api.listStudents(section.id);
const student = students[0];
const assessments = await api.listAssessments(section.id, "prelim");
const criterion = assessments.find((a) => a.name.trim().toLowerCase() === "attendance");
ok(criterion != null, `the Attendance criterion exists (${criterion?.name})`);
if (!criterion) process.exit(1);

const scoreOf = async () => {
  const grades = await api.listGrades(section.id);
  const g = grades.find((x) => x.assessmentId === criterion.id && x.studentRowId === student.id);
  return g ? g.score : null;
};

const D1 = "2026-09-01";
const D2 = "2026-09-02";
const D3 = "2026-09-03";

// ── one mark per class date ────────────────────────────────────────────────
await api.setAttendance(section.id, "prelim", student.id, D1, "p");
let rows = await api.listAttendance(section.id);
ok(
  rows.some((r) => r.studentRowId === student.id && r.sessionDate === D1 && r.status === "p"),
  "mark 'p' on a class date → stored",
);
ok((await scoreOf()) === 100, `one present day → Attendance score ${await scoreOf()} (max ${criterion.maxScore})`);

// a second date is a separate row, and the score averages both
await api.setAttendance(section.id, "prelim", student.id, D2, "l");
rows = await api.listAttendance(section.id);
const mine = rows.filter((r) => r.studentRowId === student.id);
ok(mine.length === 2, `two class dates → two marks (${mine.length})`);
ok((await scoreOf()) === 87.5, `present + late → Attendance score ${await scoreOf()} (expected 87.5)`);

// a third date, absent
await api.setAttendance(section.id, "prelim", student.id, D3, "a");
ok((await scoreOf()) === 58.33, `present + late + absent → Attendance score ${await scoreOf()} (expected 58.33)`);

// other periods are independent
rows = await api.listAttendance(section.id);
ok(
  rows.filter((r) => r.studentRowId === student.id && r.period === "prelim").length === 3,
  "the marks belong to one period only",
);

// changing a date replaces its mark instead of adding a row
await api.setAttendance(section.id, "prelim", student.id, D3, "p");
rows = await api.listAttendance(section.id);
ok(
  rows.filter((r) => r.studentRowId === student.id && r.period === "prelim").length === 3,
  "re-marking a date replaces it (no duplicate row)",
);
ok((await scoreOf()) === 91.67, `present + late + present → Attendance score ${await scoreOf()} (expected 91.67)`);

// clearing removes the mark and re-averages the score
await api.setAttendance(section.id, "prelim", student.id, D3, null);
rows = await api.listAttendance(section.id);
ok(
  !rows.some((r) => r.studentRowId === student.id && r.sessionDate === D3),
  "clearing removes the mark",
);
ok((await scoreOf()) === 87.5, `clearing re-averages the score (${await scoreOf()})`);

// ── calendar milestones ────────────────────────────────────────────────────
await api.setCalendarEvent(section.id, {
  period: "prelim",
  eventDate: D1,
  kind: "start",
  label: "Classes started",
});
let events = await api.listCalendarEvents(section.id);
ok(
  events.some((e) => e.eventDate === D1 && e.kind === "start" && e.label === "Classes started"),
  "a milestone ('classes started') is saved",
);

await api.setCalendarEvent(section.id, {
  period: "prelim",
  eventDate: D2,
  kind: "exam",
  label: "Prelim exam",
});
events = await api.listCalendarEvents(section.id);
ok(
  events.some((e) => e.eventDate === D2 && e.kind === "exam"),
  "a second milestone ('exam') is saved",
);
ok(events.length === 2, `two milestones on the calendar (${events.length})`);

await api.clearCalendarEvent(section.id, D2);
events = await api.listCalendarEvents(section.id);
ok(
  !events.some((e) => e.eventDate === D2),
  "a milestone can be removed",
);

// ── leave the sheet as we found it ─────────────────────────────────────────
await api.setAttendance(section.id, "prelim", student.id, D1, null);
await api.setAttendance(section.id, "prelim", student.id, D2, null);
await api.clearCalendarEvent(section.id, D1);
rows = await api.listAttendance(section.id);
events = await api.listCalendarEvents(section.id);
ok(
  !rows.some((r) => r.studentRowId === student.id),
  "test marks cleaned up",
);
ok(events.length === 0, "test milestones cleaned up");
ok((await scoreOf()) === null, `the Attendance score is cleared again (${await scoreOf()})`);

console.log(failures === 0 ? "\nattendance calendar verified" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
