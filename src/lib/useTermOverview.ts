// useTermOverview — the term's section overview with a small stale-while-
// revalidate cache. The overview is the heaviest read in the app (every
// section's students/grades/assessments), and three pages need it: the
// professor's home, a course page, and the section strip. Without the cache
// every one of those navigations re-fetches the whole term.
//
// Semantics:
//   • cached data renders instantly (loading stays false), a background
//     refresh follows and updates state when it lands
//   • no cache → a normal loading state
//   • reload() drops the cache entry and refetches (post-mutation refreshes)
//   • concurrent mounts share one in-flight request
import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { SectionOverview, Term } from "../types";

const cache = new Map<string, SectionOverview[]>();
const inFlight = new Map<string, Promise<SectionOverview[]>>();

const keyOf = (term: Term): string => `${term.academicYear}:${term.semester}`;

function fetchOverview(term: Term): Promise<SectionOverview[]> {
  const key = keyOf(term);
  const running = inFlight.get(key);
  if (running) return running;
  const p = api
    .getTermOverview(term)
    .then((data) => {
      cache.set(key, data);
      inFlight.delete(key);
      return data;
    })
    .catch((err: unknown) => {
      inFlight.delete(key);
      throw err;
    });
  inFlight.set(key, p);
  return p;
}

export function useTermOverview(term: Term): {
  data: SectionOverview[] | null;
  loading: boolean;
  error: Error | null;
  reload(): void;
} {
  const key = keyOf(term);
  const termRef = useRef(term);
  termRef.current = term;
  const [data, setData] = useState<SectionOverview[] | null>(() => cache.get(key) ?? null);
  const [loading, setLoading] = useState(() => !cache.has(key));
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const cached = cache.get(key);
    if (cached) {
      // stale-while-revalidate: paint the cache now, refresh behind it
      setData(cached);
      setLoading(false);
    } else {
      setData(null);
      setLoading(true);
    }
    setError(null);
    fetchOverview(termRef.current)
      .then((fresh) => {
        if (cancelled) return;
        setData(fresh);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, tick]);

  return {
    data,
    loading,
    error,
    reload: () => {
      cache.delete(key);
      setTick((t) => t + 1);
    },
  };
}
