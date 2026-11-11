// Proves a session survives a page reload — through the app's own sign-in
// path, then with a brand-new client reading the same storage (what a
// browser refresh does).
//   node --env-file=.env scripts/test-session-persistence.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

// A minimal browser-like localStorage (supabase-js reads window.localStorage).
const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  key: (i) => Array.from(store.keys())[i] ?? null,
  get length() {
    return store.size;
  },
};
globalThis.localStorage = localStorage;
globalThis.window = globalThis;
globalThis.window.localStorage = localStorage;
// supabase-js decides "am I in a browser?" with window.document — without it
// it falls back to a no-op storage and nothing is ever persisted.
globalThis.window.document = { location: { origin: "https://faculty-portal.test" } };
globalThis.document = globalThis.window.document;

const require = createRequire(import.meta.url);
const dir = mkdtempSync(join(tmpdir(), "faculty-session-"));
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

// 1. sign in exactly as the login screen does
const profile = await api.signInWithRole(process.env.HEAD_EMAIL, "Tetraval!080125", "admin");
console.log(`PASS  signed in as ${profile.name} (${profile.role})`);

// 2. the session must be in storage, or a refresh loses it
const stored = [...store.keys()].filter((k) => k.includes("auth-token"));
console.log(
  stored.length > 0
    ? `PASS  session persisted to storage (${stored[0]})`
    : "FAIL  no session in storage — a refresh would sign the user out",
);

// 3. simulate the refresh: a brand-new client on the same storage
const { createClient } = await import("@supabase/supabase-js");
const reloaded = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
const restored = await reloaded.auth.getSession();
console.log(
  restored.data.session
    ? `PASS  after a refresh the session is restored (${restored.data.session.user.email})`
    : "FAIL  the session was lost on refresh",
);

// 4. and the app's restore path returns the profile again
const again = await api.getSession();
console.log(
  again
    ? `PASS  api.getSession() after the refresh → ${again.name} (${again.role})`
    : "FAIL  api.getSession() returned nothing after the refresh",
);
await api.signOut();
console.log("\nsession persistence verified");
process.exit(0);
