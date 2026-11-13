// Live test of the faculty-admin Worker: sign in as the head, list faculty
// (with hasAccess), check that a professor is blocked but that the head keeps
// the desk even when wearing their professor hat, create an account, reset a
// password, remove and restore access — then clean up. Every account it
// makes is deleted.
//   node --env-file=.env scripts/test-admin-worker.mjs
import { createClient } from "@supabase/supabase-js";
import { createTempUser, headCredentials, removeTempUser } from "./test-fixtures.mjs";

const WORKER = "https://faculty-admin.hanndaaewii.workers.dev";
const ok = (c, m) => console.log(`${c ? "PASS" : "FAIL"}  ${m}`);

const head = headCredentials();
const client = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await client.auth.signInWithPassword(head);
if (error || !data.session) {
  console.log("could not sign in as the head:", error?.message);
  process.exit(1);
}
const headers = { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" };

// 1. list
const listRes = await fetch(`${WORKER}/teachers`, { headers });
const listBody = await listRes.json();
ok(listRes.ok, `GET /teachers → ${listRes.status} (${listBody.teachers?.length ?? 0} faculty)`);
const hasAccessShape = (listBody.teachers ?? []).every((t) => typeof t.hasAccess === "boolean");
ok(hasAccessShape, "GET /teachers → every entry carries hasAccess");

// 2. no token → rejected
const anon = await fetch(`${WORKER}/teachers`);
ok(anon.status === 401, `GET /teachers without a token → ${anon.status}`);

// 2b. the submission notice: signed-in only, own section only, and honest
//     about whether an email provider is configured
const notifyAnon = await fetch(`${WORKER}/notify-submission`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sectionId: "0c5e8324-32b6-4f3c-83c3-d2f5a801f250", period: "prelim" }),
});
ok(notifyAnon.status === 401, `POST /notify-submission without a token → ${notifyAnon.status}`);

const notifyRes = await fetch(`${WORKER}/notify-submission`, {
  method: "POST",
  headers,
  body: JSON.stringify({ sectionId: "0c5e8324-32b6-4f3c-83c3-d2f5a801f250", period: "prelim", periodLabel: "Prelim" }),
});
const notifyBody = await notifyRes.json();
ok(notifyRes.ok && notifyBody.ok === true, `POST /notify-submission → ${notifyRes.status} (${JSON.stringify(notifyBody)})`);
ok(
  notifyBody.skipped === true || typeof notifyBody.sent === "number",
  "and it reports either a send count or that email is off",
);

const notifyUnknown = await fetch(`${WORKER}/notify-submission`, {
  method: "POST",
  headers,
  body: JSON.stringify({ sectionId: "11111111-2222-3333-4444-555555555555", period: "prelim" }),
});
ok(notifyUnknown.status === 404, `an unknown section → ${notifyUnknown.status}`);

// 3. a professor must not be allowed
const prof = await createTempUser("professor", "rls");
const profClient = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const pSign = await profClient.auth.signInWithPassword({ email: prof.email, password: prof.password });
if (pSign.data?.session) {
  const profRes = await fetch(`${WORKER}/teachers`, {
    headers: { Authorization: `Bearer ${pSign.data.session.access_token}` },
  });
  ok(profRes.status === 403, `GET /teachers as a professor → ${profRes.status} (403 = blocked)`);
}

// 3b. the head wearing their professor hat keeps the desk
// (the profile's role follows the role used to sign in, so the desk must be
// judged by the admin credential, never by the last sign-in)
const hatToken = await (async () => {
  const signIn = await fetch(`${WORKER}/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: head.email, password: process.env.PROF_PASSWORD, role: "professor" }),
  });
  const body = await signIn.json();
  if (!body.token_hash) return null;
  const hatClient = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const otp = await hatClient.auth.verifyOtp({ token_hash: body.token_hash, type: "magiclink" });
  return otp.data?.session?.access_token ?? null;
})();
if (hatToken) {
  const hatRes = await fetch(`${WORKER}/teachers`, { headers: { Authorization: `Bearer ${hatToken}` } });
  ok(hatRes.status === 200, `GET /teachers with the head's professor password → ${hatRes.status} (200 = the desk stays open)`);
} else {
  ok(false, "GET /teachers with the head's professor password (could not make a professor-hat session)");
}

// 4. create a throwaway teacher
const email = `smoke.${Date.now()}@test.local`;
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

// 6b. the head cannot lock themselves out of their own desk
const selfRevoke = await fetch(`${WORKER}/revoke-access`, {
  method: "POST",
  headers,
  body: JSON.stringify({ email: head.email }),
});
ok(selfRevoke.status === 400, `POST /revoke-access for the head → ${selfRevoke.status} (400 = refused)`);

// 6c. remove sign-in access: the account stays, the door does not
const revokeRes = await fetch(`${WORKER}/revoke-access`, {
  method: "POST",
  headers,
  body: JSON.stringify({ email }),
});
const revoked = await revokeRes.json();
ok(revokeRes.ok && revoked.ok === true, `POST /revoke-access → ${revokeRes.status}`);

const blocked = await fetch(`${WORKER}/signin`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password: reset.password }),
});
const blockedBody = await blocked.json();
ok(
  blocked.status === 401,
  `a revoked account cannot sign in → ${blocked.status} (${blockedBody.error ?? "no error"})`,
);

const afterList = await fetch(`${WORKER}/teachers`, { headers });
const afterBody = await afterList.json();
const entry = (afterBody.teachers ?? []).find((t) => t.email === email);
ok(
  entry != null && entry.hasAccess === false,
  `but it stays on the list, marked no access (hasAccess: ${entry?.hasAccess})`,
);

// 6d. setting a password brings it straight back
const restoreRes = await fetch(`${WORKER}/credentials`, {
  method: "POST",
  headers,
  body: JSON.stringify({ email, role: "professor", name: "Smoke Test", department: "Testing" }),
});
const restored = await restoreRes.json();
ok(restoreRes.ok && restored.password, `POST /credentials restores access → ${restoreRes.status}`);

const backList = await fetch(`${WORKER}/teachers`, { headers });
const backBody = await backList.json();
const backEntry = (backBody.teachers ?? []).find((t) => t.email === email);
ok(backEntry?.hasAccess === true, `and hasAccess is true again (${backEntry?.hasAccess})`);

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
await admin.from("faculty_credentials").delete().eq("email", email);
const left = await admin.from("faculty_credentials").select("id").eq("email", email);
ok(victim != null, "cleanup → the test account was removed");
ok((left.data ?? []).length === 0, "cleanup → its credentials were removed too");
await removeTempUser(prof.id);
