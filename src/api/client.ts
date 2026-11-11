// The one Supabase client for the whole app.
//
// A single instance matters: every client shares the same localStorage key
// (sb-<ref>-auth-token), so several of them rotating the refresh token
// against each other can invalidate the session and sign the user out on
// the next page load. One client, explicit auth options.
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseUrl = url ?? "";
export const supabaseAnonKey = anonKey ?? "";

/** The shared client (null when the backend is not configured). */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

/** The shared client, or a throw if the backend is missing. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — cannot start the Supabase API.");
  }
  return supabase;
}
