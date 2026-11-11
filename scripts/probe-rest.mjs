// Probe: does PostgREST serve the `faculty` schema to the app's publishable key?
//   node --env-file=.env scripts/probe-rest.mjs
const url = process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const signIn = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: key, "Content-Type": "application/json" },
  body: JSON.stringify({ email: "acruz@northstate.edu", password: "demo1234" }),
});
const auth = await signIn.json();
console.log("sign-in:", signIn.status, auth.access_token ? "✓ access token" : JSON.stringify(auth).slice(0, 200));
if (!auth.access_token) process.exit(1);

const h = { apikey: key, Authorization: `Bearer ${auth.access_token}` };
for (const path of [
  "faculty.terms?select=academic_year,semester",
  "faculty.courses?select=code,title",
  "faculty.profiles?select=email,role",
  "public.courses?select=code",
]) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: h });
  const body = await res.text();
  console.log(`\n${path}\n  → ${res.status} ${body.slice(0, 220)}`);
}
