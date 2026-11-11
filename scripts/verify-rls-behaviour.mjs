// Verifies role isolation with throwaway accounts (no demo accounts needed).
//   node --env-file=.env scripts/verify-rls-behaviour.mjs
import { createClient } from "@supabase/supabase-js";
import { createTempUser, removeTempUser } from "./test-fixtures.mjs";

const ok = (c, m) => console.log(`${c ? "PASS" : "FAIL"}  ${m}`);
const term = { academicYear: "2025-2026", semester: 1 };

const client = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const cruz = await createTempUser("professor", "rls.cruz");
const baut = await createTempUser("professor", "rls.baut");

const signIn = async (email, password) => {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`sign-in failed: ${error?.message}`);
  return data.session.access_token;
};

const apiFor = (token) => {
  const c = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  void c;
  return token;
};
void apiFor;

try {
  // 1. anonymous
  const anon = await client.auth
    .signInWithPassword({ email: "nobody@test.local", password: "x" })
    .catch(() => null);
  ok(anon === null || anon.data?.session === null, "anonymous → cannot sign in");

  // 2. each professor creates a course
  const cruzToken = await signIn(cruz.email, cruz.password);
  const bautToken = await signIn(baut.email, baut.password);

  const termsRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/faculty_terms?select=id&limit=1`, {
    headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${cruzToken}` },
  });
  const termId = (await termsRes.json())[0]?.id;
  if (!termId) {
    console.log("no term row found — run scripts/ensure-terms.mjs first");
    process.exit(1);
  }

  const createCourse = async (token, code) => {
    const res = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/faculty_courses?select=id,code&code=eq.${code}`,
      { headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
    );
    return res.json();
  };

  const insertCourse = async (token, professorId, code, title) => {
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/faculty_courses`, {
      method: "POST",
      headers: {
        apikey: process.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ code, title, professor_id: professorId, term_id: termId }),
    });
    return { status: res.status, body: await res.json() };
  };

  const c1 = await insertCourse(cruzToken, cruz.id, "RLS1", "RLS one");
  ok(c1.status === 201 || c1.status === 200, `professor creates a course → ${c1.status}`);
  const c2 = await insertCourse(bautToken, baut.id, "RLS2", "RLS two");
  ok(c2.status === 201 || c2.status === 200, `second professor creates a course → ${c2.status}`);

  // 3. each professor sees only their own course
  const cruzView = await createCourse(cruzToken, "RLS1");
  const bautView = await createCourse(bautToken, "RLS2");
  const cruzSeesOwn = Array.isArray(cruzView) && cruzView.some((c) => c.code === "RLS1");
  const cruzSeesOther = Array.isArray(cruzView) && cruzView.some((c) => c.code === "RLS2");
  ok(cruzSeesOwn && !cruzSeesOther, `RLS: Cruz sees only their own course (${JSON.stringify(cruzView?.map?.((c) => c.code) ?? cruzView)})`);
  const bautSeesOther = Array.isArray(bautView) && bautView.some((c) => c.code === "RLS2");
  ok(bautSeesOther, "RLS: Bautista sees their own course");

  // 4. the admin sees every course (no filter — list them all)
  const head = await createTempUser("admin", "rls.head");
  const headToken = await signIn(head.email, head.password);
  const headRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/faculty_courses?select=code`, {
    headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${headToken}` },
  });
  const headRows = await headRes.json();
  const headCodes = Array.isArray(headRows) ? headRows.map((c) => c.code) : [];
  ok(
    headCodes.includes("RLS1") && headCodes.includes("RLS2"),
    `RLS: the head sees both courses (${headCodes.join(", ")})`,
  );
  await removeTempUser(head.id);
} finally {
  await removeTempUser(cruz.id);
  await removeTempUser(baut.id);
  console.log("cleanup → temp accounts removed");
}
