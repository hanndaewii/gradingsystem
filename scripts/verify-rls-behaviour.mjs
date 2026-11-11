// Practical RLS enforcement test: two professors, an admin and an anonymous
// visitor. Creates two throwaway courses, attempts cross-account reads/writes,
// then deletes them so the database is left as it was.
//   node --env-file=.env scripts/verify-rls-behaviour.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const dir = mkdtempSync(join(tmpdir(), "faculty-rls-"));
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
const term = { academicYear: "2025-2026", semester: 1 };

// --- setup: one course per professor ---
await api.signIn("acruz@northstate.edu", "demo1234");
const cruzCourse = await api.createCourse({ code: "RLSTEST1", title: "RLS test A", ...term });
await api.signOut();
await api.signIn("lbautista@northstate.edu", "demo1234");
const bautCourse = await api.createCourse({ code: "RLSTEST2", title: "RLS test B", ...term });
await api.createSection(bautCourse.id, {
  name: "Section A",
  schedule: "Mon/Wed 9:00 AM",
  room: "Room 1",
});
const bautSections = await api.listSections(bautCourse.id);
await api.signOut();

// --- 1. anonymous visitor ---
const anon = createSupabaseApi();
const anonCourses = await anon.listCourses(term).then((r) => r, (e) => e);
ok(
  Array.isArray(anonCourses) ? anonCourses.length === 0 : true,
  `anonymous → ${Array.isArray(anonCourses) ? `${anonCourses.length} courses visible` : `blocked (${anonCourses.code})`}`,
);

// --- 2. professor sees only their own ---
await api.signIn("acruz@northstate.edu", "demo1234");
const cruzView = await api.listCourses(term);
ok(
  cruzView.some((c) => c.id === cruzCourse.id) && !cruzView.some((c) => c.id === bautCourse.id),
  `professor Cruz sees ${cruzView.length} course(s) — only their own`,
);

// --- 3. professor cannot read another professor's course/section ---
const foreignCourse = await api.getCourse(bautCourse.id);
ok(foreignCourse === null, `Cruz reading Bautista's course → ${foreignCourse === null ? "null (hidden)" : "LEAK!"}`);
const foreignSection = await api.getSection(bautSections[0].id);
ok(foreignSection === null, `Cruz reading Bautista's section → ${foreignSection === null ? "null (hidden)" : "LEAK!"}`);

// --- 4. professor cannot WRITE into another professor's section ---
let writeBlocked = false;
try {
  await api.addStudents(bautSections[0].id, [{ name: "Intruder", studentNo: "X-1" }]);
} catch (e) {
  writeBlocked = true;
}
ok(writeBlocked, "Cruz adding a student to Bautista's section → blocked by RLS");

// --- 5. admin reads everything, and cannot grade ---
await api.signOut();
await api.signIn("admin@northstate.edu", "demo1234");
const adminView = await api.listCourses(term);
ok(
  adminView.length >= 2 && adminView.some((c) => c.id === bautCourse.id),
  `admin sees ${adminView.length} course(s) — including both professors'`,
);
const adminSections = await api.listSections(bautCourse.id);
let adminGradeBlocked = false;
try {
  await api.addStudents(adminSections[0].id, [{ name: "Head", studentNo: "H-1" }]);
} catch {
  adminGradeBlocked = true;
}
ok(adminGradeBlocked, "admin adding a student → blocked (the head may only comment)");

// --- cleanup ---
await api.deleteCourse(cruzCourse.id);
await api.signOut();
await api.signIn("lbautista@northstate.edu", "demo1234");
await api.deleteCourse(bautCourse.id);
const left = await api.listCourses(term);
ok(left.length === 0, `cleanup → ${left.length} courses left (database as it was)`);
