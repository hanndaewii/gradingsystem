// Reproduces "add a student" end to end against the live database.
//   node --env-file=.env scripts/repro-add-student.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const dir = mkdtempSync(join(tmpdir(), "faculty-addstu-"));
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
const step = async (label, fn) => {
  try {
    const out = await fn();
    console.log(`PASS  ${label}${out ? ` → ${out}` : ""}`);
    return out;
  } catch (err) {
    console.log(`FAIL  ${label} → ${err.message}`);
    throw err;
  }
};

let courseId = null;
try {
  // sign in with the professor credential (the head's own teaching login)
  await step("sign in as professor", async () => {
    const p = await api.signInWithRole(process.env.HEAD_EMAIL, "Doleo dolorem", "professor");
    return `${p.name} (${p.role})`;
  });

  const course = await step("create course", () =>
    api.createCourse({ code: `TMP${Date.now().toString().slice(-6)}`, title: "Temp course", academicYear: "2025-2026", semester: 1 }),
  );
  courseId = course.id;

  const section = await step("create section", () =>
    api.createSection(course.id, { name: "Section A", schedule: "Mon/Wed 9:00 AM", room: "204" }),
  );

  await step("add one student (no ID — the Add-students modal sends a name only)", async () => {
    const res = await api.addStudents(section.id, [{ name: "Test Student One", studentNo: "" }]);
    return `added=${res.added} duplicates=${res.duplicates.length}`;
  });

  await step("add a second student", async () => {
    const res = await api.addStudents(section.id, [{ name: "Test Student Two", studentNo: "" }]);
    return `added=${res.added} duplicates=${res.duplicates.length}`;
  });

  await step("read students back", async () => {
    const students = await api.listStudents(section.id);
    return students.map((s) => `${s.name}(${s.studentNo})`).join(", ");
  });

  await step("section progress (what the page renders)", async () => {
    const p = await api.getSectionProgress(section.id);
    return p.map((x) => `${x.period}:${x.gradedCells}/${x.totalCells}`).join(" ");
  });

  await step("grades read", async () => {
    const g = await api.listGrades(section.id);
    return `${g.length} rows`;
  });
} catch {
  /* reported above */
} finally {
  if (courseId) {
    try {
      await api.deleteCourse(courseId);
      console.log("cleanup → temp course deleted");
    } catch (err) {
      console.log("cleanup failed:", err.message);
    }
  }
  await api.signOut();
  // restore the head's admin role for the next sign-in
  await api.signInWithRole(process.env.HEAD_EMAIL, "Tetraval!080125", "admin").catch(() => undefined);
}
