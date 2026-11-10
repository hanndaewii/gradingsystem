// TermContext (spec §3.7, D7, D22) — the grading term every page reads.
// The selection persists under the UI-pref key `faculty-portal.term:v1`
// (a non-api key; the db/session keys belong to the api layer alone).
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../api";
import { TERMS } from "../data/seed";
import type { Term } from "../types";

export interface TermContextValue {
  term: Term;
  terms: Term[];
  setTerm(t: Term): void;
}

const TERM_KEY = "faculty-portal.term:v1";

/** D7 default: 1st Sem of AY 2025-2026. */
const DEFAULT_TERM: Term = { academicYear: "2025-2026", semester: 1 };

const TermContext = createContext<TermContextValue | null>(null);

function sameTerm(a: Term, b: Term): boolean {
  return a.academicYear === b.academicYear && a.semester === b.semester;
}

/** The stored term is honoured only while it still exists in `terms`. */
function readStoredTerm(terms: Term[]): Term | null {
  try {
    const raw = window.localStorage.getItem(TERM_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const candidate = parsed as { academicYear?: unknown; semester?: unknown };
    if (typeof candidate.academicYear !== "string") return null;
    if (candidate.semester !== 1 && candidate.semester !== 2) return null;
    const term: Term = { academicYear: candidate.academicYear, semester: candidate.semester };
    return terms.some((t) => sameTerm(t, term)) ? term : null;
  } catch {
    return null;
  }
}

export function TermProvider({ children }: { children: ReactNode }): JSX.Element {
  // Seed the list with the D7 constant so the switcher works before
  // listTerms resolves; the api response (TERMS ∪ terms found in data) replaces it.
  const [terms, setTerms] = useState<Term[]>(TERMS);
  const [term, setTermState] = useState<Term>(() => readStoredTerm(TERMS) ?? DEFAULT_TERM);

  useEffect(() => {
    let cancelled = false;
    api
      .listTerms()
      .then((list) => {
        if (cancelled || list.length === 0) return;
        setTerms(list);
        // Keep the current selection when it survives in the full list.
        setTermState((current) => {
          if (list.some((t) => sameTerm(t, current))) return current;
          return readStoredTerm(list) ?? list[0];
        });
      })
      .catch(() => {
        // Keep the TERMS fallback — the switcher still works offline.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<TermContextValue>(
    () => ({
      term,
      terms,
      setTerm: (next: Term) => {
        setTermState(next);
        try {
          window.localStorage.setItem(TERM_KEY, JSON.stringify(next));
        } catch {
          // ignore: private mode / storage disabled — selection stays in-memory
        }
      },
    }),
    [term, terms],
  );

  return <TermContext.Provider value={value}>{children}</TermContext.Provider>;
}

/** Throws outside <TermProvider> — the provider is mounted by App.tsx. */
export function useTerm(): TermContextValue {
  const ctx = useContext(TermContext);
  if (!ctx) throw new Error("useTerm must be used inside <TermProvider> (mounted by App.tsx).");
  return ctx;
}
