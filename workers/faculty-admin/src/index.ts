// Faculty account management for the Faculty Grading Portal.
//
// Runs as a Cloudflare Worker so the Supabase service-role key NEVER reaches
// the browser. The portal calls it with the signed-in user's access token; the
// Worker verifies that token and only then checks that the caller is an
// admin (faculty_profiles.role = 'admin').
//
// Routes:
//   GET  /teachers        → list faculty profiles
//   POST /teachers        → create a teacher account {email, password, name, department}
//   POST /reset-password  → set a new professor password for an account {email, password}
//   POST /credentials     → set a ROLE-SCOPED password {email, role, password, name?, department?}
//   POST /signin          → verify a role-scoped credential {email, password, role} and
//                           return a one-time token_hash the app exchanges for a session
//
// Secrets: SUPABASE_SECRET_KEY (wrangler secret put). Vars: SUPABASE_URL, ALLOWED_ORIGIN.

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  ALLOWED_ORIGIN: string;
}

interface Teacher {
  id: string;
  email: string;
  name: string;
  department: string;
  role: string;
}

interface AuthUser {
  id: string;
  email?: string;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json; charset=utf-8",
};

function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Access-Control-Allow-Origin": origin },
  });
}

/** A readable, strong password for a freshly created account. */
function makePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return `${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}-Fgp7`;
}

/** Salted SHA-256, stored as "salt:hash". */
async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function newSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = await hashPassword(password, salt);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

async function adminFetch(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${env.SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function listAuthUsers(env: Env): Promise<AuthUser[]> {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users?per_page=200`, {
    headers: {
      apikey: env.SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
    },
  });
  const body = (await res.json()) as { users?: AuthUser[] };
  return body.users ?? [];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const allowed = (env.ALLOWED_ORIGIN ?? "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    // Any of this account's own Cloudflare hostnames (the live site, branch
    // preview URLs, pages.dev) plus localhost. A request without an Origin
    // header is a server-to-server call.
    const host = (() => {
      try {
        return new URL(origin).hostname;
      } catch {
        return "";
      }
    })();
    const ownCloudflareHost =
      host.endsWith(".workers.dev") ||
      host.endsWith(".pages.dev") ||
      host === "localhost" ||
      host === "127.0.0.1";
    if (origin && !ownCloudflareHost && !allowed.includes(origin)) {
      return json({ error: "Origin not allowed." }, 403, origin);
    }
    const echo = origin || allowed[0] || "*";
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { ...CORS_HEADERS, "Access-Control-Allow-Origin": echo },
      });
    }

    const url = new URL(request.url);

    // ── role-scoped sign-in (one email, two roles) ─────────────────────────
    // Runs before the admin gate: it IS the sign-in.
    if (request.method === "POST" && url.pathname === "/signin") {
      const body = (await request.json()) as { email?: string; password?: string; role?: string };
      const email = (body.email ?? "").trim().toLowerCase();
      const password = body.password ?? "";
      const role = body.role === "admin" ? "admin" : "professor";
      if (!email || !password) return json({ error: "Email and password are required." }, 400, echo);

      const credRes = await adminFetch(
        env,
        `/rest/v1/faculty_credentials?select=id,email,role,password_hash&email=eq.${encodeURIComponent(email)}&role=eq.${role}`,
      );
      const creds = (await credRes.json()) as { id: string; password_hash: string }[];
      if (!Array.isArray(creds) || creds.length === 0) {
        return json({ error: "That email has no account for that role." }, 401, echo);
      }
      if (!(await verifyPassword(password, creds[0].password_hash))) {
        return json({ error: "Email or password is incorrect." }, 401, echo);
      }

      // The auth user must exist (a credential can outlive it).
      const users = await listAuthUsers(env);
      let user = users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (!user) {
        const createRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, {
          method: "POST",
          headers: {
            apikey: env.SUPABASE_SECRET_KEY,
            Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password: makePassword(), email_confirm: true }),
        });
        const created = (await createRes.json()) as { id?: string };
        if (!created.id) return json({ error: "Could not create the account." }, 400, echo);
        user = { id: created.id, email };
      }

      // The profile's role follows the role used to sign in, so row-level
      // security matches this session.
      await adminFetch(env, `/rest/v1/faculty_profiles?id=eq.${user.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ role }),
      });

      // Mint a one-time token the app exchanges for a session.
      const linkRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/generate_link`, {
        method: "POST",
        headers: {
          apikey: env.SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "magiclink", email }),
      });
      const link = (await linkRes.json()) as {
        properties?: { hashed_token?: string };
        hashed_token?: string;
        msg?: string;
        message?: string;
      };
      // The REST endpoint returns the link fields flat; the JS SDK nests them
      // under `properties`. Accept both.
      const tokenHash = link.properties?.hashed_token ?? link.hashed_token;
      if (!tokenHash) {
        return json({ error: link.msg ?? link.message ?? "Could not start the session." }, 400, echo);
      }
      return json({ token_hash: tokenHash, email, role }, 200, echo);
    }

    // ── everything below requires an admin session ─────────────────────────
    const auth = request.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!token) return json({ error: "Missing session token." }, 401, echo);

    const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) return json({ error: "Your session has expired — sign in again." }, 401, echo);
    const user = (await userRes.json()) as { id: string; email?: string };

    const meRes = await adminFetch(env, `/rest/v1/faculty_profiles?select=role&id=eq.${user.id}`);
    const me = (await meRes.json()) as { role?: string }[];
    if (!Array.isArray(me) || me.length === 0 || me[0].role !== "admin") {
      return json({ error: "Only the department head can manage faculty accounts." }, 403, echo);
    }

    // ── list faculty ──────────────────────────────────────────────────────
    if (request.method === "GET" && url.pathname === "/teachers") {
      const res = await adminFetch(
        env,
        "/rest/v1/faculty_profiles?select=id,email,name,department,role&order=role,email",
      );
      const rows = (await res.json()) as Teacher[];
      return json({ teachers: rows }, 200, echo);
    }

    // ── create a teacher account (also sets their professor credential) ───
    if (request.method === "POST" && url.pathname === "/teachers") {
      const body = (await request.json()) as Partial<Teacher> & { password?: string };
      const email = (body.email ?? "").trim().toLowerCase();
      const name = (body.name ?? "").trim();
      const department = (body.department ?? "").trim();
      const password = (body.password ?? "").trim() || makePassword();
      if (!email || !email.includes("@")) return json({ error: "A valid email is required." }, 400, echo);
      if (!name) return json({ error: "A name is required." }, 400, echo);
      if (!department) return json({ error: "A department is required." }, 400, echo);
      if (password.length < 8) return json({ error: "Use a password of at least 8 characters." }, 400, echo);

      const createRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          apikey: env.SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, email_confirm: true }),
      });
      const created = (await createRes.json()) as { id?: string; message?: string };
      if (!createRes.ok || !created.id) {
        return json({ error: created.message ?? "Could not create that account." }, 400, echo);
      }

      const profileRes = await adminFetch(env, "/rest/v1/faculty_profiles", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          id: created.id,
          email,
          name,
          department,
          bio: "",
          role: "professor",
        }),
      });
      if (!profileRes.ok) {
        const err = (await profileRes.json()) as { message?: string };
        return json({ error: err.message ?? "Account created but the profile failed." }, 400, echo);
      }

      // Their professor credential (so they can sign in without a code).
      const salt = newSalt();
      await adminFetch(env, "/rest/v1/faculty_credentials", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          email,
          role: "professor",
          password_hash: `${salt}:${await hashPassword(password, salt)}`,
          label: name,
        }),
      });

      return json({ ok: true, id: created.id, email, password }, 200, echo);
    }

    // ── set a role-scoped password ────────────────────────────────────────
    if (request.method === "POST" && url.pathname === "/credentials") {
      const body = (await request.json()) as {
        email?: string;
        role?: string;
        password?: string;
        name?: string;
        department?: string;
      };
      const email = (body.email ?? "").trim().toLowerCase();
      const role = body.role === "admin" ? "admin" : "professor";
      const password = (body.password ?? "").trim() || makePassword();
      if (!email || !email.includes("@")) return json({ error: "A valid email is required." }, 400, echo);
      if (password.length < 8) return json({ error: "Use a password of at least 8 characters." }, 400, echo);

      const salt = newSalt();
      const hash = `${salt}:${await hashPassword(password, salt)}`;

      const existing = await adminFetch(
        env,
        `/rest/v1/faculty_credentials?select=id&email=eq.${encodeURIComponent(email)}&role=eq.${role}`,
      );
      const rows = (await existing.json()) as { id: string }[];
      if (rows.length > 0) {
        await adminFetch(env, `/rest/v1/faculty_credentials?id=eq.${rows[0].id}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ password_hash: hash, updated_at: new Date().toISOString() }),
        });
      } else {
        await adminFetch(env, "/rest/v1/faculty_credentials", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ email, role, password_hash: hash, label: body.name ?? "" }),
        });
      }

      // Keep the auth user's own password in step so the direct Supabase
      // sign-in path keeps working too.
      const users = await listAuthUsers(env);
      const user = users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (user) {
        await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
          method: "PUT",
          headers: {
            apikey: env.SUPABASE_SECRET_KEY,
            Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        });
        if (body.name || body.department) {
          await adminFetch(env, `/rest/v1/faculty_profiles?id=eq.${user.id}`, {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({
              ...(body.name ? { name: body.name } : {}),
              ...(body.department ? { department: body.department } : {}),
            }),
          });
        }
      }
      return json({ ok: true, email, role, password }, 200, echo);
    }

    // ── reset a professor password ────────────────────────────────────────
    if (request.method === "POST" && url.pathname === "/reset-password") {
      const body = (await request.json()) as { email?: string; password?: string };
      const email = (body.email ?? "").trim().toLowerCase();
      const password = (body.password ?? "").trim() || makePassword();
      if (!email) return json({ error: "Email is required." }, 400, echo);
      if (password.length < 8) return json({ error: "Use a password of at least 8 characters." }, 400, echo);

      const users = await listAuthUsers(env);
      const target = users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (!target) return json({ error: "No account with that email." }, 404, echo);

      const updateRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${target.id}`, {
        method: "PUT",
        headers: {
          apikey: env.SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      if (!updateRes.ok) {
        const err = (await updateRes.json()) as { message?: string };
        return json({ error: err.message ?? "Could not reset that password." }, 400, echo);
      }

      // Keep the professor credential in step.
      const salt = newSalt();
      const hash = `${salt}:${await hashPassword(password, salt)}`;
      const credRes = await adminFetch(
        env,
        `/rest/v1/faculty_credentials?select=id&email=eq.${encodeURIComponent(email)}&role=eq.professor`,
      );
      const creds = (await credRes.json()) as { id: string }[];
      if (creds.length > 0) {
        await adminFetch(env, `/rest/v1/faculty_credentials?id=eq.${creds[0].id}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ password_hash: hash, updated_at: new Date().toISOString() }),
        });
      }

      return json({ ok: true, email, password }, 200, echo);
    }

    return json({ error: "Unknown route." }, 404, echo);
  },
};
