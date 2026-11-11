// Reproduces the post-verification profile insert for a real registered
// user, using the admin API to mint a session (so no mailbox is needed).
//   node --env-file=.env scripts/repro-profile-insert.mjs [email]
import { createClient } from "@supabase/supabase-js";

const email = (process.argv[2] ?? "kristian.pasco30@gmail.com").trim().toLowerCase();
const url = process.env.SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email,
});
if (linkErr) {
  console.log("generateLink failed:", linkErr.message);
  process.exit(1);
}
console.log("minting a session for", email, "…");

const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: session, error: verifyErr } = await client.auth.verifyOtp({
  token_hash: link.properties.hashed_token,
  type: "magiclink",
});
if (verifyErr) {
  console.log("verifyOtp failed:", verifyErr.message);
  process.exit(1);
}
console.log("session ok for uid:", session.user.id);

const { data: existing } = await client.from("faculty_profiles").select("*").eq("id", session.user.id).maybeSingle();
console.log("profile row now:", existing ?? "(none)");

if (!existing) {
  const { error: insertErr } = await client.from("faculty_profiles").insert({
    id: session.user.id,
    email: session.user.email,
    name: "Kristian Pasco",
    department: "Department of Computer Science",
    bio: "",
    role: "professor",
  });
  console.log("insert result:", insertErr ? `✗ ${insertErr.message} (code ${insertErr.code})` : "✓ profile created");
} else {
  console.log("insert skipped — the row already exists");
}
