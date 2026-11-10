// useAsync — data-fetch hook with stale/cancellation guards (React 18
// StrictMode double-invoke safe). Re-runs when `deps` change or when
// `reload()` is called; a newer run always wins over an older one.
import { useEffect, useRef, useState } from "react";

export interface UseAsyncResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload(): void;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): UseAsyncResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  const depsRef = useRef<unknown[] | null>(null);
  const runIdRef = useRef(0);
  const reload = () => setTick((t) => t + 1);

  useEffect(() => {
    const prev = depsRef.current;
    const depsChanged =
      prev === null || prev.length !== deps.length || deps.some((d, i) => !Object.is(d, prev[i]));
    depsRef.current = deps;

    const runId = ++runIdRef.current;
    let cancelled = false;
    setError(null);
    if (depsChanged) {
      // Fresh inputs → nothing to show yet. A plain reload() keeps the current
      // data on screen and `loading` stays false, so post-mutation refreshes
      // never flash a spinner over optimistic UI.
      setLoading(true);
      setData(null);
    }

    fnRef
      .current()
      .then((result) => {
        if (cancelled || runId !== runIdRef.current) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled || runId !== runIdRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, loading, error, reload };
}
