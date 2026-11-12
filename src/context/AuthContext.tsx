// AuthContext (spec §3.7) — session state for the whole app.
// This context never touches localStorage itself: every read and write
// goes through the `api` layer; this file only mirrors results into state.
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, onSessionExpired } from "../api";
import type { Profile } from "../types";

export interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  /** Signs in and returns the profile. The role is detected from the
   *  password — the user never picks one. */
  signIn(email: string, password: string): Promise<Profile>;
  signOut(): Promise<void>;
  updateProfile(patch: Partial<Pick<Profile, "name" | "department" | "bio">>): Promise<Profile>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session once on mount. While this runs, App renders a
  // full-page spinner instead of the login form (no login flash).
  useEffect(() => {
    let cancelled = false;
    api
      .getSession()
      .then((session) => {
        if (cancelled) return;
        setProfile(session);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setProfile(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A 401 (or a token that is already gone) clears the profile here, and
  // RequireAuth turns that into /login?next=<the page you were on> — so an
  // expired session never leaves a signed-in shell with dead cards in it.
  useEffect(() => onSessionExpired(() => setProfile(null)), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      loading,
      signIn: async (email, password) => {
        const signedIn = await api.signIn(email, password);
        setProfile(signedIn);
        return signedIn;
      },
      signOut: async () => {
        try {
          await api.signOut();
        } finally {
          // Always clear local profile so the UI treats the user as signed out
          // even if the Supabase call timed-out or errored.
          setProfile(null);
        }
      },
      updateProfile: async (patch) => {
        if (!profile) throw new Error("Cannot update the profile without a session.");
        const updated = await api.updateProfile(profile.id, patch);
        setProfile(updated);
        return updated;
      },
    }),
    [profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Throws outside <AuthProvider> — the provider is mounted by App.tsx. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider> (mounted by App.tsx).");
  return ctx;
}
