// Client for the `faculty-admin` Cloudflare Worker.
//
// The Worker holds the Supabase service-role key; the browser only ever sends
// its own access token, and the Worker checks that the caller is an admin.
import { createClient } from "@supabase/supabase-js";

const ADMIN_API =
  (import.meta.env.VITE_ADMIN_API_URL as string | undefined) ??
  "https://faculty-admin.hanndaaewii.workers.dev";

export interface FacultyMember {
  id: string;
  email: string;
  name: string;
  department: string;
  role: string;
}

async function headers(): Promise<Record<string, string>> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) throw new Error("The backend is not configured.");
  const client = createClient(url, key);
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session has expired — sign in again.");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${ADMIN_API}${path}`, { ...init, headers: await headers() });
  } catch (err) {
    // Almost always a blocked request: the portal's Content-Security-Policy
    // must allow the faculty-admin Worker in connect-src.
    throw new Error(
      `Could not reach the faculty service (${ADMIN_API}). If you are on the deployed site, the Content-Security-Policy must allow that host.`,
    );
  }
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "The faculty service did not respond.");
  return body;
}

export async function listFaculty(): Promise<FacultyMember[]> {
  const body = await call<{ teachers: FacultyMember[] }>("/teachers");
  return body.teachers ?? [];
}

export async function createTeacher(input: {
  email: string;
  name: string;
  department: string;
  password?: string;
}): Promise<{ email: string; password: string }> {
  return call<{ email: string; password: string }>("/teachers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function resetPassword(input: {
  email: string;
  password?: string;
}): Promise<{ email: string; password: string }> {
  return call<{ email: string; password: string }>("/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
