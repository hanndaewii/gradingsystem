// Verifies the app's own sign-in path for both roles (the Worker → session flow).
//   node --env-file=.env scripts/test-role-signin.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const dir = mkdtempSync(join(tmpdir(), "faculty-signin-"));
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

const email = process.env.HEAD_EMAIL;
const cases = [
  ["admin", "Tetraval!080125"],
  ["professor", "Doleo dolorem"],
];

for (const [role, password] of cases) {
  try {
    const profile = await api.signInWithRole(email, password, role);
    console.log(`PASS  sign in as ${role} → ${profile.name} (role: ${profile.role})`);
    await api.signOut();
  } catch (err) {
    console.log(`FAIL  sign in as ${role} → ${err.message}`);
  }
}

// a wrong password must not get in
try {
  await api.signInWithRole(email, "not-the-password", "admin");
  console.log("FAIL  a wrong password was accepted");
} catch (err) {
  console.log(`PASS  a wrong password is rejected (${err.message})`);
}
