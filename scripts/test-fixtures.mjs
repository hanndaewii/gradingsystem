// Test fixtures — throwaway accounts for the verification scripts.
//   node --env-file=.env scripts/test-fixtures.mjs   (not run directly)
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function createTempUser(
  role,
  label = "tmp",
) {
  const stamp = Date.now().toString(36);
  const email = `${label}.${stamp}@test.local`;
  const password = `Tmp-${crypto.randomUUID().slice(0, 8)}-9x`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`could not create ${email}: ${error?.message}`);
  await admin.from("faculty_profiles").insert({
    id: data.user.id,
    email,
    name: `Temp ${role}`,
    department: "Testing",
    bio: "",
    role,
  });
  return { id: data.user.id, email, password };
}

export async function removeTempUser(id) {
  await admin.auth.admin.deleteUser(id);
  await admin.from("faculty_profiles").delete().eq("id", id);
}

/** The production head account (HEAD_EMAIL / HEAD_PASSWORD in .env). */
export function headCredentials() {
  const email = process.env.HEAD_EMAIL;
  const password = process.env.HEAD_PASSWORD;
  if (!email || !password) throw new Error("HEAD_EMAIL / HEAD_PASSWORD missing from .env");
  return { email, password };
}

export { admin };
