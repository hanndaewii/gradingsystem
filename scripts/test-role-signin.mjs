// Checks that signing in needs no role: the password decides the role.
//   node --env-file=.env scripts/test-role-signin.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const dir = mkdtempSync(join(tmpdir(), "faculty-role-"));
const bundle = join(dir, "api.cjs");
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

const email = process.env.HEAD_EMAIL;
const headPassword = process.env.HEAD_PASSWORD;
const professorPassword = process.env.PROF_PASSWORD;

// ── no role is sent: the password decides ─────────────────────────────────
{
  const profile = await api.signIn(email, professorPassword);
  ok(profile.role === "professor", `the professor password signs in as a professor (${profile.role})`);
  await api.signOut();
}
{
  const profile = await api.signIn(email, headPassword);
  ok(profile.role === "admin", `the head password signs in as the department head (${profile.role})`);
  await api.signOut();
}

// ── the same email, the other way round ───────────────────────────────────
{
  const profile = await api.signIn(email, headPassword);
  ok(profile.role === "admin", "the head password still opens the department view");
  await api.signOut();
}
{
  const profile = await api.signIn(email, professorPassword);
  ok(profile.role === "professor", "the professor password still opens the teaching view");
  await api.signOut();
}

// ── a wrong password is rejected, and the message explains the two passwords
{
  let message = "";
  try {
    await api.signIn(email, "not-the-password");
  } catch (err) {
    message = err instanceof Error ? err.message : String(err);
  }
  ok(/incorrect/i.test(message), `a wrong password is rejected ("${message}")`);
  ok(
    /separate password for Professor and for Department head/i.test(message),
    "the message says the email has a password per role",
  );
}

// ── an explicit role still works (the ops scripts) ────────────────────────
{
  const profile = await api.signInWithRole(email, headPassword, "admin");
  ok(profile.role === "admin", "an explicit role still signs in");
  await api.signOut();
}
{
  let failed = false;
  try {
    await api.signInWithRole(email, professorPassword, "admin");
  } catch {
    failed = true;
  }
  ok(failed, "an explicit role that does not match the password is rejected");
}

console.log(failures === 0 ? "\nrole detection verified" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
