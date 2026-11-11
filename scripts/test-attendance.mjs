// End-to-end test of the attendance calendar flow against the live database:
// per-day marks, the aggregated Attendance score, blank days, and milestones.
//
// The test works on three days in September that are empty, and it puts back
// exactly what it finds — the professor's own marks are never disturbed.
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

await api.signInWithRole(process.env.HEAD_EMAIL, "Doleo dolorem", "professor");
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
const marksOf = async () =>
  (await api.listAttendance(section.id)).filter(
    (r) => r.studentRowId === student.id && r.period === "prelim",
  );

/**
 * The score the criterion must hold: the average credit over every MARKED
 * day in the period (a blank day is never counted as an absence).
 */
function expectedScore(base, changes, max = 100) {
  const map = new Map(base.map((r) => [r.sessionDate, r.status]));
  for (const [day, status] of changes) {
    if (status === null) map.delete(day);
    else map.set(day, status);
  }
  const list = [...map.values()];
  if (list.length === 0) return null;
  const credit = list.reduce(
    (sum, st) => sum + (st === "p" ? 1 : st === "l" ? 0.75 : 0),
    0,
  );
  return Math.round((credit / list.length) * max * 100) / 100;
}

// The professor's own marks — the snapshot the test always puts back.
const snapshot = await marksOf();
console.log(`   the student has ${snapshot.length} mark(s) of their own`);

const D1 = "2026-09-01";
const D2 = "2026-09-02";
const D3 = "2026-09-03";
for (const d of [D1, D2, D3]) {
  const clash = snapshot.find((r) => r.sessionDate === d);
  if (clash) {
    console.error(`test day ${d} already has a mark — pick another day`);
    process.exit(1);
  }
}

// ── one mark per class date ────────────────────────────────────────────────
const first = await api.setAttendance(section.id, "prelim", student.id, D1, "p");
ok(
  first.rows.some((r) => r.studentRowId === student.id && r.sessionDate === D1 && r.status === "p"),
  "mark 'p' on a class date → stored",
);
ok(
  first.score === expectedScore(snapshot, [[D1, "p"]]),
  `the save returns the new score (${first.score})`,
);
ok(first.assessmentId === criterion.id, "the save returns the Attendance criterion's id");
ok(
  (await scoreOf()) === expectedScore(snapshot, [[D1, "p"]]),
  `one present day → Attendance score ${await scoreOf()}`,
);

// a second date is a separate row, and the score averages both
await api.setAttendance(section.id, "prelim", student.id, D2, "l");
ok((await marksOf()).length === snapshot.length + 2, "two class dates → two more marks");
ok(
  (await scoreOf()) === expectedScore(snapshot, [[D1, "p"], [D2, "l"]]),
  `present + late → Attendance score ${await scoreOf()}`,
);

// a third date, absent
await api.setAttendance(section.id, "prelim", student.id, D3, "a");
ok(
  (await scoreOf()) === expectedScore(snapshot, [[D1, "p"], [D2, "l"], [D3, "a"]]),
  `present + late + absent → Attendance score ${await scoreOf()}`,
);

// ── a BLANK day is not an absence ──────────────────────────────────────────
// September has 30 days; only three are marked. If the blank days counted as
// absences the score would collapse.
const sept = (await api.listAttendance(section.id)).filter(
  (r) => r.studentRowId === student.id && r.sessionDate.startsWith("2026-09"),
);
ok(
  sept.length === 3,
  `only the three marked days have rows (${sept.length}) — 27 blank days are ignored`,
);
const withBlanksAsAbsent = (() => {
  const map = new Map(snapshot.map((r) => [r.sessionDate, r.status]));
  map.set(D1, "p");
  map.set(D2, "l");
  map.set(D3, "a");
  const credit = [...map.values()].reduce(
    (sum, st) => sum + (st === "p" ? 1 : st === "l" ? 0.75 : 0),
    0,
  );
  // 30 days, 27 of them blank and counted as absent
  return Math.round((credit / 30) * 100 * 100) / 100;
})();
ok(
  (await scoreOf()) !== withBlanksAsAbsent,
  `the blank days do not count as absences (score ${await scoreOf()}, not ${withBlanksAsAbsent})`,
);
ok(
  (await scoreOf()) === expectedScore(snapshot, [[D1, "p"], [D2, "l"], [D3, "a"]]),
  "the score is the average over the marked days only",
);

// changing a date replaces its mark instead of adding a row
await api.setAttendance(section.id, "prelim", student.id, D3, "p");
ok(
  (await marksOf()).length === snapshot.length + 3,
  "re-marking a date replaces it (no duplicate row)",
);
ok(
  (await scoreOf()) === expectedScore(snapshot, [[D1, "p"], [D2, "l"], [D3, "p"]]),
  `re-marking re-averages the score (${await scoreOf()})`,
);

// ── clearing ONE day must not touch the others ─────────────────────────────
// (a stray Backspace used to wipe the whole period)
await api.setAttendance(section.id, "prelim", student.id, D3, null);
const afterClear = await marksOf();
ok(
  afterClear.length === snapshot.length + 2 &&
    afterClear.some((r) => r.sessionDate === D1) &&
    afterClear.some((r) => r.sessionDate === D2),
  `clearing one day leaves the others alone (${afterClear.length} marks)`,
);
ok(
  (await scoreOf()) === expectedScore(snapshot, [[D1, "p"], [D2, "l"], [D3, null]]),
  `clearing re-averages the score (${await scoreOf()})`,
);

// ── with no marks at all there is no score (never a silent zero) ───────────
for (const row of await marksOf()) {
  await api.setAttendance(section.id, "prelim", student.id, row.sessionDate, null);
}
ok((await marksOf()).length === 0, "every mark can be cleared");
ok((await scoreOf()) === null, `no marks left → no score at all (${await scoreOf()})`);

// ── put the professor's marks back ─────────────────────────────────────────
for (const row of snapshot) {
  await api.setAttendance(section.id, "prelim", student.id, row.sessionDate, row.status);
}
const restored = await marksOf();
ok(
  restored.length === snapshot.length &&
    snapshot.every((r) =>
      restored.some((x) => x.sessionDate === r.sessionDate && x.status === r.status),
    ),
  `the professor's ${snapshot.length} mark(s) are back exactly (${restored.length})`,
);
ok(
  (await scoreOf()) === expectedScore(snapshot, []),
  `and so is the score (${await scoreOf()})`,
);

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

await api.clearCalendarEvent(section.id, D2);
events = await api.listCalendarEvents(section.id);
ok(!events.some((e) => e.eventDate === D2), "a milestone can be removed");
await api.clearCalendarEvent(section.id, D1);
events = await api.listCalendarEvents(section.id);
ok(events.length === 0, "test milestones cleaned up");

console.log(failures === 0 ? "\nattendance calendar verified" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
