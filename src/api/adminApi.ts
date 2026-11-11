// Client for the `faculty-admin` Cloudflare Worker.
//
// The Worker holds the Supabase service-role key; the browser only ever sends
// its own access token, and the Worker checks that the caller is an admin.
import { supabase } from "./client";

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
  if (!supabase) throw new Error("The backend is not configured.");
  // The shared client — never create a second one for the same storage key.
  const { data } = await supabase.auth.getSession();
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

/** Sets a role-scoped password (an email can hold one per role). */
export async function setCredential(input: {
  email: string;
  role: "professor" | "admin";
  password?: string;
  name?: string;
  department?: string;
}): Promise<{ email: string; role: string; password: string }> {
  return call<{ email: string; role: string; password: string }>("/credentials", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Verifies a credential and returns a one-time session token. The Worker works
 * out the role from the password, so the sign-in screen has nothing to ask —
 * `role` is only an optional hint for the ops scripts.
 */
export async function verifyCredential(input: {
  email: string;
  password: string;
  role?: "professor" | "admin";
}): Promise<{ token_hash: string; email: string; role: string }> {
  const res = await fetch(`${ADMIN_API}/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await res.json().catch(() => ({}))) as {
    token_hash?: string;
    email?: string;
    role?: string;
    error?: string;
    available_roles?: string[];
  };
  if (!res.ok || !body.token_hash) {
    const roles = body.available_roles ?? [];
    // Two roles means two passwords — say so instead of leaving them guessing.
    const hint =
      roles.length > 1
        ? " This email has a separate password for Professor and for Department head."
        : "";
    const err = new Error(`${body.error ?? "The faculty service did not respond."}${hint}`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return {
    token_hash: body.token_hash,
    email: body.email ?? input.email,
    role: body.role ?? input.role ?? "professor",
  };
}
