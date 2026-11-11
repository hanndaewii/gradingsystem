// End-to-end test of the attendance flow against the live database:
// mark p / a / l and check the Attendance criterion's score follows.
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
const ok = (c, m) => console.log(`${c ? "PASS" : "FAIL"}  ${m}`);

const profile = await api.signInWithRole(process.env.HEAD_EMAIL, "Doleo dolorem", "professor");
const term = { academicYear: "2025-2026", semester: 1 };
const courses = await api.listCourses(term);
const course = courses[0];
const sections = await api.listSections(course.id);
const section = sections[0];
console.log(`section: ${course.code} · ${section.name}`);

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

// present → full credit
await api.setAttendance(section.id, "prelim", student.id, "p");
let rows = await api.listAttendance(section.id);
ok(
  rows.some((r) => r.studentRowId === student.id && r.period === "prelim" && r.status === "p"),
  "mark 'p' → stored",
);
ok((await scoreOf()) === 100, `mark 'p' → Attendance score ${await scoreOf()} (max ${criterion.maxScore})`);

// late → 75%
await api.setAttendance(section.id, "prelim", student.id, "l");
ok((await scoreOf()) === 75, `mark 'l' → Attendance score ${await scoreOf()}`);

// absent → 0
await api.setAttendance(section.id, "prelim", student.id, "a");
ok((await scoreOf()) === 0, `mark 'a' → Attendance score ${await scoreOf()}`);

// other periods are independent
rows = await api.listAttendance(section.id);
ok(
  rows.filter((r) => r.studentRowId === student.id).length === 1,
  "the mark applies to one period only",
);

// clearing removes the mark and the score
await api.setAttendance(section.id, "prelim", student.id, null);
rows = await api.listAttendance(section.id);
ok(
  !rows.some((r) => r.studentRowId === student.id && r.period === "prelim"),
  "clearing removes the mark",
);
ok((await scoreOf()) === null, `clearing clears the Attendance score (${await scoreOf()})`);

// leave the sheet as we found it
await api.signOut();
await api.signInWithRole(process.env.HEAD_EMAIL, "Tetraval!080125", "admin");
console.log("\nattendance flow verified");
process.exit(0);
