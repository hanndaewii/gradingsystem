// ─────────────────────────────────────────────────────────────────────────────
// API facade — the ONLY module the app imports for data access.
// ─────────────────────────────────────────────────────────────────────────────
// Every page talks to the async `api` singleton below — never to localStorage
// and never to `./local` or `./supabase` directly (nothing outside `src/api/`
// imports them; that rule is what keeps the backend swappable).
//
// Backend switch (zero UI changes — the swap recipe from v1, now automatic):
//   • VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY both set → Supabase
//     (`src/api/supabase.ts`: the `faculty` schema, RLS + the
//     submitted-period trigger act as the bouncer).
//   • either variable missing → the localStorage demo (`src/api/local.ts`),
//     so the app still runs without a backend.
// Only the publishable anon key may ship to browsers — the secret key belongs
// to scripts/ and Cloudflare server-side settings only (see .env.example).
// ─────────────────────────────────────────────────────────────────────────────
import { createLocalApi } from "./local";
import { createSupabaseApi } from "./supabase";
import type { Api } from "../types";

export type { Api };

const env = import.meta.env as Record<string, string | undefined>;

/** Which backend is live — the UI uses it to explain the demo-only bits. */
export const API_MODE: "supabase" | "demo" =
  env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY ? "supabase" : "demo";

export const api: Api = API_MODE === "supabase" ? createSupabaseApi() : createLocalApi();

// D20 — dev console hook: exercise data + auth from DevTools without UI.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__dbg = api;
}
