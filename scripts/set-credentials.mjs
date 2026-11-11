// Sets the role-scoped credentials for an account (one password per role).
//   node --env-file=.env scripts/set-credentials.mjs [email] [adminPass] [professorPass]
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const email = (process.argv[2] ?? process.env.HEAD_EMAIL ?? "").trim().toLowerCase();
const adminPass = process.argv[3] ?? process.env.HEAD_PASSWORD ?? "";
const professorPass = process.argv[4] ?? "";
if (!email || !adminPass || !professorPass) {
  console.error("usage: set-credentials.mjs <email> <adminPassword> <professorPassword>");
  process.exit(1);
}

function hashPassword(password, salt) {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

for (const [role, password] of [["admin", adminPass], ["professor", professorPass]]) {
  const salt = randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  const { rows } = await client.query(
    "select id from public.faculty_credentials where email = $1 and role = $2",
    [email, role],
  );
  if (rows.length > 0) {
    await client.query(
      "update public.faculty_credentials set password_hash = $1, updated_at = now() where id = $2",
      [`${salt}:${hash}`, rows[0].id],
    );
  } else {
    await client.query(
      "insert into public.faculty_credentials (email, role, password_hash) values ($1, $2, $3)",
      [email, role, `${salt}:${hash}`],
    );
  }
  console.log(`credential set: ${email} · ${role}`);
}
await client.end();

// ── verify: the Worker accepts both role-scoped passwords ────────────────
const anon = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
for (const [role, password] of [["admin", adminPass], ["professor", professorPass]]) {
  const res = await fetch("https://faculty-admin.hanndaaewii.workers.dev/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role }),
  });
  const body = await res.json();
  if (!res.ok || !body.token_hash) {
    console.log(`  ${role} sign-in → FAILED (${res.status} ${body.error ?? ""})`);
    continue;
  }
  const { data, error } = await anon.auth.verifyOtp({ token_hash: body.token_hash, type: "magiclink" });
  if (error || !data.session) {
    console.log(`  ${role} sign-in → token rejected (${error?.message})`);
    continue;
  }
  const profile = await anon
    .from("faculty_profiles")
    .select("role,name")
    .eq("id", data.user.id)
    .maybeSingle();
  console.log(`  ${role} sign-in → OK (session role: ${profile?.role})`);
}
