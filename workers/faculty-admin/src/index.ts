// Faculty account management for the Faculty Grading Portal.
//
// Runs as a Cloudflare Worker so the Supabase service-role key NEVER reaches
// the browser. The portal calls it with the signed-in user's access token; the
// Worker verifies that token and only then checks that the caller is an
// admin (faculty_profiles.role = 'admin').
//
// Routes (all require an admin session):
//   GET  /teachers          â†’ list faculty profiles
//   POST /teachers          â†’ create a teacher account {email, password, name, department}
//   POST /reset-password    â†’ set a new password for an existing account {email, password}
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const allowed = (env.ALLOWED_ORIGIN ?? "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    // Browsers always send Origin on cross-origin calls, so the check still
    // blocks them; a request without Origin is a server-to-server call.
    if (origin && allowed.length > 0 && !allowed.includes(origin)) {
      return json({ error: "Origin not allowed." }, 403, origin);
    }
    const echo = origin || allowed[0] || "*";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...CORS_HEADERS, "Access-Control-Allow-Origin": echo } });
    }

    // â”€â”€ authenticate the caller â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const auth = request.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!token) return json({ error: "Missing session token." }, 401, origin);

    const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) return json({ error: "Your session has expired â€” sign in again." }, 401, origin);
    const user = (await userRes.json()) as { id: string; email?: string };

    const meRes = await adminFetch(env, `/rest/v1/faculty_profiles?select=role&id=eq.${user.id}`);
    const me = (await meRes.json()) as { role?: string }[];
    if (!Array.isArray(me) || me.length === 0 || me[0].role !== "admin") {
      return json({ error: "Only the department head can manage faculty accounts." }, 403, origin);
    }

    const url = new URL(request.url);

    // â”€â”€ list faculty â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (request.method === "GET" && url.pathname === "/teachers") {
      const res = await adminFetch(
        env,
        "/rest/v1/faculty_profiles?select=id,email,name,department,role&order=role,email",
      );
      const rows = (await res.json()) as Teacher[];
      return json({ teachers: rows }, 200, origin);
    }

    // â”€â”€ create a teacher account â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (request.method === "POST" && url.pathname === "/teachers") {
      const body = (await request.json()) as Partial<Teacher> & { password?: string };
      const email = (body.email ?? "").trim().toLowerCase();
      const name = (body.name ?? "").trim();
      const department = (body.department ?? "").trim();
      const password = (body.password ?? "").trim() || makePassword();
      if (!email || !email.includes("@")) return json({ error: "A valid email is required." }, 400, origin);
      if (!name) return json({ error: "A name is required." }, 400, origin);
      if (!department) return json({ error: "A department is required." }, 400, origin);
      if (password.length < 8) return json({ error: "Use a password of at least 8 characters." }, 400, origin);

      const createRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          apikey: env.SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, email_confirm: true }),
      });
      const created = (await createRes.json()) as { id?: string; message?: string; email?: string };
      if (!createRes.ok || !created.id) {
        return json({ error: created.message ?? "Could not create that account." }, 400, origin);
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
        return json({ error: err.message ?? "Account created but the profile failed." }, 400, origin);
      }
      return json({ ok: true, id: created.id, email, password }, 200, origin);
    }

    // â”€â”€ reset an existing password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (request.method === "POST" && url.pathname === "/reset-password") {
      const body = (await request.json()) as { email?: string; password?: string };
      const email = (body.email ?? "").trim().toLowerCase();
      const password = (body.password ?? "").trim() || makePassword();
      if (!email) return json({ error: "Email is required." }, 400, origin);
      if (password.length < 8) return json({ error: "Use a password of at least 8 characters." }, 400, origin);

      const listRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users?per_page=200`, {
        headers: {
          apikey: env.SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
        },
      });
      const list = (await listRes.json()) as { users?: { id: string; email?: string }[] };
      const target = list.users?.find((u) => (u.email ?? "").toLowerCase() === email);
      if (!target) return json({ error: "No account with that email." }, 404, origin);

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
        return json({ error: err.message ?? "Could not reset that password." }, 400, origin);
      }
      return json({ ok: true, email, password }, 200, origin);
    }

    return json({ error: "Unknown route." }, 404, origin);
  },
};
