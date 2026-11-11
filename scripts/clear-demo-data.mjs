// Clears the demo dataset from the live Supabase project.
//   node --env-file=.env scripts/clear-demo-data.mjs            → wipes data, keeps the 3 logins
//   node --env-file=.env scripts/clear-demo-data.mjs --users    → also deletes the demo auth users
//
// Deleting the demo courses cascades: sections → periods/assessments/students/grades/history/comments.
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const withUsers = process.argv.includes("--users");
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const DEMO_EMAILS = ["admin@northstate.edu", "acruz@northstate.edu", "lbautista@northstate.edu"];

async function count(label, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return `${label}: ${rows[0].n}`;
}

console.log("before →");
for (const [label, sql] of [
  ["courses", "select count(*)::int as n from public.faculty_courses"],
  ["sections", "select count(*)::int as n from public.faculty_sections"],
  ["assessments", "select count(*)::int as n from public.faculty_assessments"],
  ["students", "select count(*)::int as n from public.faculty_students"],
  ["grades", "select count(*)::int as n from public.faculty_grades"],
  ["history", "select count(*)::int as n from public.faculty_grade_history"],
  ["comments", "select count(*)::int as n from public.faculty_comments"],
  ["terms", "select count(*)::int as n from public.faculty_terms"],
  ["profiles", "select count(*)::int as n from public.faculty_profiles"],
]) {
  console.log("  " + (await count(label, sql)));
}

// 1. data — deleting courses cascades to every section-scoped table.
await client.query("delete from public.faculty_courses");
// 2. any history/comments rows orphaned from earlier deletions
await client.query(
  "delete from public.faculty_grade_history gh where not exists (select 1 from public.faculty_sections s where s.id = gh.section_id)",
);
await client.query(
  "delete from public.faculty_comments c where not exists (select 1 from public.faculty_sections s where s.id = c.section_id)",
);
// 3. terms that no course uses
await client.query(
  "delete from public.faculty_terms t where not exists (select 1 from public.faculty_courses c where c.term_id = t.id)",
);

console.log("\nafter →");
for (const [label, sql] of [
  ["courses", "select count(*)::int as n from public.faculty_courses"],
  ["sections", "select count(*)::int as n from public.faculty_sections"],
  ["assessments", "select count(*)::int as n from public.faculty_assessments"],
  ["students", "select count(*)::int as n from public.faculty_students"],
  ["grades", "select count(*)::int as n from public.faculty_grades"],
  ["history", "select count(*)::int as n from public.faculty_grade_history"],
  ["comments", "select count(*)::int as n from public.faculty_comments"],
  ["terms", "select count(*)::int as n from public.faculty_terms"],
  ["profiles", "select count(*)::int as n from public.faculty_profiles"],
]) {
  console.log("  " + (await count(label, sql)));
}

if (withUsers) {
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  for (const email of DEMO_EMAILS) {
    const user = list?.users.find((u) => u.email === email);
    if (!user) continue;
    await admin.auth.admin.deleteUser(user.id);
    await client.query("delete from public.faculty_profiles where id = $1", [user.id]);
    console.log(`  deleted auth user ${email}`);
  }
  console.log("\nlogin accounts removed — create real ones before deploying (see README).");
} else {
  console.log("\nlogin accounts kept (the portal has no sign-up flow).");
  console.log("  admin@northstate.edu / acruz@northstate.edu / lbautista@northstate.edu  (password demo1234)");
  console.log("  → rename them to real faculty from Profile → Edit, or run with --users to remove them.");
}

await client.end();
console.log("\nDEMO DATA CLEARED");
