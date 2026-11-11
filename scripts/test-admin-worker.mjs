// End-to-end test of the faculty-admin Worker: sign in as the head, list
// faculty, create an account, reset a password, then clean up.
//   node --env-file=.env scripts/test-admin-worker.mjs
import { createClient } from "@supabase/supabase-js";

const WORKER = "https://faculty-admin.hanndaaewii.workers.dev";
const ok = (c, m) => console.log(`${c ? "PASS" : "FAIL"}  ${m}`);

const client = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await client.auth.signInWithPassword({
  email: "admin@northstate.edu",
  password: "demo1234",
});
if (error || !data.session) {
  console.log("could not sign in as the head:", error?.message);
  process.exit(1);
}
const token = data.session.access_token;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

// 1. list
const listRes = await fetch(`${WORKER}/teachers`, { headers });
const listBody = await listRes.json();
ok(listRes.ok, `GET /teachers → ${listRes.status} (${listBody.teachers?.length ?? 0} faculty)`);

// 2. no token → rejected
const anon = await fetch(`${WORKER}/teachers`);
ok(anon.status === 401, `GET /teachers without a token → ${anon.status}`);

// 3. a professor must not be allowed
const prof = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const pSign = await prof.auth.signInWithPassword({ email: "acruz@northstate.edu", password: "demo1234" });
if (pSign.data?.session) {
  const profRes = await fetch(`${WORKER}/teachers`, {
    headers: { Authorization: `Bearer ${pSign.data.session.access_token}` },
  });
  ok(profRes.status === 403, `GET /teachers as a professor → ${profRes.status} (403 = blocked)`);
}

// 4. create a throwaway teacher
const email = `smoke.${Date.now()}@college.edu`;
const createRes = await fetch(`${WORKER}/teachers`, {
  method: "POST",
  headers,
  body: JSON.stringify({ email, name: "Smoke Test", department: "Testing" }),
});
const created = await createRes.json();
ok(createRes.ok, `POST /teachers → ${createRes.status} (password issued: ${created.password ? "yes" : "no"})`);

// 5. the new account can actually sign in
const fresh = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const signIn = await fresh.auth.signInWithPassword({ email, password: created.password });
ok(signIn.data?.session != null, `new account signs in → ${signIn.error?.message ?? "ok"}`);

// 6. reset the password
const resetRes = await fetch(`${WORKER}/reset-password`, {
  method: "POST",
  headers,
  body: JSON.stringify({ email }),
});
const reset = await resetRes.json();
ok(resetRes.ok && reset.password, `POST /reset-password → ${resetRes.status} (new password issued)`);

// 7. cleanup
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: list2 } = await admin.auth.admin.listUsers({ perPage: 200 });
const victim = list2?.users.find((u) => u.email === email);
if (victim) {
  await admin.auth.admin.deleteUser(victim.id);
  await admin.from("faculty_profiles").delete().eq("id", victim.id);
}
ok(victim != null, "cleanup → the test account was removed");
