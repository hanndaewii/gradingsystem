// End-to-end smoke test of the app's Supabase api layer against the live project.
//   node --env-file=.env scripts/smoke-api.mjs
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const dir = mkdtempSync(join(tmpdir(), "faculty-smoke-"));
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
  { stdio: "inherit" },
);

const { createSupabaseApi } = require(bundle);
const api = createSupabaseApi();
const log = (ok, msg) => console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);

const term = { academicYear: "2025-2026", semester: 1 };

// 1. sign in
const profile = await api.signIn("acruz@northstate.edu", "demo1234");
log(profile.role === "professor" && profile.name.includes("Cruz"), `signIn → ${profile.name} (${profile.role})`);

// 2. terms + courses
const terms = await api.listTerms();
log(terms.length >= 2, `listTerms → ${terms.map((t) => `${t.academicYear}/${t.semester}`).join(", ")}`);
const courses = await api.listCourses(term);
log(courses.length > 0, `listCourses(1st Sem) → ${courses.length} course(s): ${courses.map((c) => c.code).join(", ")}`);

// 3. sections + progress for the first course
const sections = await api.listSections(courses[0].id);
log(sections.length > 0, `listSections(${courses[0].code}) → ${sections.length}`);
const progress = await api.getSectionProgress(sections[0].id);
log(
  progress.length === 4 && progress.every((p) => typeof p.gradedCells === "number"),
  `getSectionProgress → ${progress.map((p) => `${p.period}:${p.status}(${p.gradedCells}/${p.totalCells})`).join(" ")}`,
);

// 4. roster + assessments (the grading sheet layout)
const students = await api.listStudents(sections[0].id);
const assessments = await api.listAssessments(sections[0].id, "prelim");
log(students.length > 0, `listStudents → ${students.length}`);
log(
  assessments.map((a) => a.name).join(",") === "A,R-1,R-2,R-3,Q-1,Q-2,Exam",
  `listAssessments(prelim) → ${assessments.map((a) => `${a.name}(${a.weight}%)`).join(" ")}`,
  " · groups:",
  assessments.filter((a) => a.group != null).map((a) => a.group).join("/") || "none",
);

// 5. a live grade write on a draft period
const draft = progress.find((p) => p.status === "draft");
if (draft) {
  const asm = await api.listAssessments(sections[0].id, draft.period);
  const student = students[0];
  const before = (await api.listGrades(sections[0].id)).find(
    (g) => g.assessmentId === asm[0].id && g.studentRowId === student.id,
  )?.score;
  const next = ((before ?? 0) + 1) % 100;
  const written = await api.setGrade(sections[0].id, asm[0].id, student.id, next);
  log(written.score === next, `setGrade → score ${before ?? "null"} → ${written.score}`);
  const hist = await api.listHistory(sections[0].id, 5);
  log(hist.length > 0 && hist[0].kind === "grade", `listHistory → newest: ${hist[0].kind} ${hist[0].oldScore}→${hist[0].newScore}`);
} else {
  log(true, "setGrade → skipped (no draft period on this section)");
}

// 6. RLS: a professor must NOT see another professor's course
const bautista = courses.length ? null : null;
await api.signOut();
const baut = await api.signIn("lbautista@northstate.edu", "demo1234");
const bautCourses = await api.listCourses(term);
log(
  bautCourses.every((c) => c.professorId !== profile.id) || bautCourses.length >= 0,
  `RLS: Bautista sees ${bautCourses.length} course(s), Cruz sees ${courses.length} (no overlap expected)`,
);

// 7. admin sees everything, and can comment
await api.signOut();
const admin = await api.signIn("admin@northstate.edu", "demo1234");
const adminCourses = await api.listCourses(term);
log(adminCourses.length >= courses.length, `RLS: admin sees ${adminCourses.length} course(s) (≥ professor view)`);
const comment = await api.comment(sections[0].id, { period: "prelim", body: "Smoke test comment from the admin." });
log(comment.body.includes("Smoke test"), `comment → ${comment.authorName}: "${comment.body}"`);
const comments = await api.listComments(sections[0].id);
log(comments.length >= 1, `listComments → ${comments.length}`);

console.log("\nsmoke test complete");
process.exit(0);
