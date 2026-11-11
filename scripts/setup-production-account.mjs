// Production account setup:
//   • ensures a real head (admin) account exists for the given email
//   • removes the demo accounts (admin@/acruz@/lbautista@northstate.edu)
//   • writes the head credentials into .env for the ops/test scripts
//   node --env-file=.env scripts/setup-production-account.mjs [email] [name]
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";

const email = (process.argv[2] ?? "kristian.pasco30@gmail.com").trim().toLowerCase();
const name = (process.argv[3] ?? "Kristian").trim();
const department = "College of Computer Studies";
const DEMO_EMAILS = ["admin@northstate.edu", "acruz@northstate.edu", "lbautista@northstate.edu"];

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 1. the real head account
const password = "Head-" + crypto.randomUUID().slice(0, 8) + "-7Kd";
const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
if (listErr) {
  console.log("could not list users:", listErr.message);
  process.exit(1);
}
let head = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
if (head) {
  await admin.auth.admin.updateUserById(head.id, { password, email_confirm: true });
  console.log(`updated the existing account ${email}`);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    console.log("could not create the account:", error?.message);
    process.exit(1);
  }
  head = data.user;
  console.log(`created ${email}`);
}

// the profile row (role = admin)
const { data: existingProfile } = await admin
  .from("faculty_profiles")
  .select("*")
  .eq("id", head.id)
  .maybeSingle();
if (existingProfile) {
  await admin.from("faculty_profiles").update({ name, department, role: "admin" }).eq("id", head.id);
} else {
  await admin.from("faculty_profiles").insert({
    id: head.id,
    email,
    name,
    department,
    bio: "",
    role: "admin",
  });
}
console.log("profile row: admin");

// 2. remove the demo accounts
for (const demo of DEMO_EMAILS) {
  const user = list.users.find((u) => (u.email ?? "").toLowerCase() === demo);
  if (!user) continue;
  await admin.auth.admin.deleteUser(user.id);
  await admin.from("faculty_profiles").delete().eq("id", user.id);
  console.log(`removed demo account ${demo}`);
}

// 3. keep the ops scripts working with the real head credentials
const envPath = new URL("../.env", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
let env = readFileSync(envPath, "utf8");
const upsert = (key, value) => {
  const line = `${key}=${value}`;
  env = new RegExp(`^${key}=.*$`, "m").test(env)
    ? env.replace(new RegExp(`^${key}=.*$`, "m"), line)
    : `${env.trimEnd()}\n${line}\n`;
};
upsert("HEAD_EMAIL", email);
upsert("HEAD_PASSWORD", password);
writeFileSync(envPath, env);

console.log("\n── production head account ──");
console.log(`email:    ${email}`);
console.log(`password: ${password}`);
console.log("(stored in .env for the ops scripts — change it from Profile → Change password)");
