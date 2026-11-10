// ─────────────────────────────────────────────────────────────────────────────
// API facade — the ONLY module the app imports for data access.
// ─────────────────────────────────────────────────────────────────────────────
// Every page talks to the async `api` singleton below — never to localStorage
// and never to `./local` directly (nothing outside `src/api/` imports
// `local.ts`; that rule is what keeps the backend swappable).
//
// Supabase swap recipe (zero UI changes):
//   1. npm i @supabase/supabase-js
//   2. Create `src/api/supabase.ts` implementing the `Api` interface from
//      `src/types.ts` 1:1 — one method per supabase-js call. `supabase/schema.sql`
//      has the tables, RLS policies and the submitted-period trigger that mirror
//      the ApiError codes (PERIOD_SUBMITTED, FORBIDDEN, …).
//   3. Change exactly one line here:
//        export const api: Api = createLocalApi();
//      →  export const api: Api = createSupabaseApi(client);
// ─────────────────────────────────────────────────────────────────────────────
import { createLocalApi } from "./local";
import type { Api } from "../types";

export const api: Api = createLocalApi();

// D20 — dev console hook: exercise data + auth from DevTools without UI.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__dbg = api;
}
