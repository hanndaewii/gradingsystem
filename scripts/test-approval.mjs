// The department head's sign-off, through the app's own API layer against the
// live backend: a submitted period is locked, approval needs the head role,
// approving stamps who/when and writes history, an approved period is locked
// for the professor (and their reopen cannot lift it), and the head's unlock
// puts it back to draft and records that too.
//
// It puts the period and the head's own role back exactly as it found them.
//   node --env-file=.env scripts/test-approval.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const dir = mkdtempSync(join(tmpdir(), "approval-api-"));
const bundle = join(dir, "api.cjs");
execFileSync(
  process.execPath,
  [
    join(process.cwd(), "node_modules/esbuild/bin/esbuild"),
    "src/api/supabase.ts",
    "--bundle", "--format=cjs", "--platform=node",
    `--define:import.meta.env=${JSON.stringify({
      VITE_SUPABASE_URL: process.env.SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
    })}`,
    `--outfile=${bundle}`,
  ],
  { stdio: "ignore" },
);
const { createSupabaseApi } = require(bundle);

const H = {
  apikey: process.env.SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
  "Content-Type": "application/json",
};
const SECTION = "0c5e8324-32b6-4f3c-83c3-d2f5a801f250";   // CS101 · BSBA
const PERIOD = "prelim";
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); console.log(`${c ? "PASS" : "FAIL"}  ${m}`); };

const get = async (path) => (await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, { headers: H })).json();
const patch = async (path, body) => {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH", headers: H, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status} ${await res.text()}`);
};

const periodRow = async () =>
  (await get(`faculty_periods?select=status,submitted_at,approved_at,approved_by&section_id=eq.${SECTION}&period=eq.${PERIOD}`))[0];
const historyTail = async () =>
  (await get(`faculty_grade_history?select=kind,detail&section_id=eq.${SECTION}&order=at.desc&limit=1`))[0];
const setProfileRole = (role) => patch(`faculty_profiles?email=eq.${encodeURIComponent(process.env.HEAD_EMAIL)}`, { role });

async function firstCell() {
  const a = (await get(`faculty_assessments?select=id&section_id=eq.${SECTION}&limit=1`))[0];
  const s = (await get(`faculty_students?select=id&section_id=eq.${SECTION}&limit=1`))[0];
  const g = (await get(`faculty_grades?select=score&assessment_id=eq.${a.id}&student_id=eq.${s.id}&limit=1`))[0];
  return { assessmentId: a.id, studentRowId: s.id, score: g?.score ?? null };
}

const professor = createSupabaseApi();
const head = createSupabaseApi();
let original = null;

try {
  original = await periodRow();
  const cell = await firstCell();

  // something to approve, and the head with a submission on the desk
  await patch(`faculty_periods?section_id=eq.${SECTION}&period=eq.${PERIOD}`, {
    status: "submitted", submitted_at: new Date().toISOString(),
  });
  ok((await periodRow()).status === "submitted", "a submitted period is on the desk");

  await professor.signInWithRole(process.env.HEAD_EMAIL, process.env.PROF_PASSWORD, "professor");
  await head.signInWithRole(process.env.HEAD_EMAIL, process.env.HEAD_PASSWORD, "admin");

  const locked = await professor
    .setGrade(SECTION, cell.assessmentId, cell.studentRowId, 90)
    .then(() => "ok", (e) => e.code);
  ok(locked === "PERIOD_SUBMITTED", `a submitted period is locked for the professor (${locked})`);

  // the head role is what grants approval (the same row row-level security reads)
  await setProfileRole("professor");
  const noApprove = await head.approvePeriod(SECTION, PERIOD).then(() => "ok", (e) => e.code);
  const noUnlock = await head.unlockPeriod(SECTION, PERIOD).then(() => "ok", (e) => e.code);
  ok(noApprove === "FORBIDDEN" && noUnlock === "FORBIDDEN", `without the head role both are refused (${noApprove} / ${noUnlock})`);
  await setProfileRole("admin");

  const approved = await head.approvePeriod(SECTION, PERIOD);
  ok(approved.status === "approved" && approved.approvedAt != null, `the head approves → ${approved.status}`);
  const stamped = await periodRow();
  ok(stamped.approved_at != null && stamped.approved_by != null, "who and when are stamped on the row");
  const h1 = await historyTail();
  ok(h1?.kind === "approve", `history records the approval (${h1?.kind}: ${h1?.detail})`);

  const afterApprove = await professor
    .setGrade(SECTION, cell.assessmentId, cell.studentRowId, 91)
    .then(() => "ok", (e) => `${e.code}`);
  ok(afterApprove.startsWith("PERIOD_APPROVED"), `an approved period is locked for the professor (${afterApprove})`);

  const professorReopen = await professor.reopenPeriod(SECTION, PERIOD).then((r) => r.status, (e) => e.code);
  ok(professorReopen === "approved", `the professor's reopen cannot lift an approval (${professorReopen})`);

  const unlocked = await head.unlockPeriod(SECTION, PERIOD);
  ok(unlocked.status === "draft" && unlocked.approvedAt == null, `the head unlocks → ${unlocked.status}`);
  const h2 = await historyTail();
  ok(h2?.kind === "unlock", `history records the unlock (${h2?.kind}: ${h2?.detail})`);

  const editable = await professor
    .setGrade(SECTION, cell.assessmentId, cell.studentRowId, cell.score ?? null)
    .then(() => "ok", (e) => e.code);
  ok(editable === "ok", `and the professor can edit again (${editable})`);
} catch (err) {
  console.log("ERROR", err?.message ?? err);
  fails.push("threw");
} finally {
  await patch(`faculty_periods?section_id=eq.${SECTION}&period=eq.${PERIOD}`, {
    status: original?.status ?? "not_started",
    submitted_at: original?.submitted_at ?? null,
    approved_at: null,
    approved_by: null,
  });
  await setProfileRole("admin");   // the head's own hat, as the portal left it
  rmSync(dir, { recursive: true, force: true });
  console.log(fails.length === 0 ? "\napproval flow verified" : `\nFAILED: ${fails.join(" | ")}`);
  process.exitCode = fails.length === 0 ? 0 : 1;
}
