import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { TickIcon } from "./TickIcon";

export interface ToastInput {
  title: string;
  description?: string;
  tone?: "info" | "success" | "warn" | "danger";
  durationMs?: number;
}

export interface ToastApi {
  push(t: ToastInput): string;
  dismiss(id: string): void;
}

interface ToastRecord extends ToastInput {
  id: string;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Must be called inside <ToastProvider> (WO-3 mounts it above all
 *  routes). Throws a clear error when used outside. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error("useToast must be used inside <ToastProvider>. Mount ToastProvider above all routes (App.tsx, WO-3) — never inside a page.");
  }
  return api;
}

let nextToastSeq = 0;

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());
  const lastRef = useRef<{ key: string; id: string; at: number } | null>(null);

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (input: ToastInput): string => {
      // Dedupe identical title+description within 500ms — StrictMode
      // double-fires effects that push toasts.
      const key = `${input.title}\u0000${input.description ?? ""}`;
      const now = Date.now();
      const last = lastRef.current;
      if (last && last.key === key && now - last.at < 500) {
        return last.id;
      }
      nextToastSeq += 1;
      const id = `toast-${nextToastSeq}`;
      lastRef.current = { key, id, at: now };
      const record: ToastRecord = { ...input, id };
      setToasts((ts) => [...ts, record]);
      const durationMs = input.durationMs ?? 4000;
      timersRef.current.set(
        id,
        window.setTimeout(() => dismiss(id), durationMs),
      );
      return id;
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/** Bottom-right stack above modals (--z-toast 60 > --z-modal 50).
 *  Already rendered by ToastProvider — do not mount separately. */
export function ToastViewport({ toasts, onDismiss }: { toasts: ToastRecord[]; onDismiss: (id: string) => void }): JSX.Element {
  return (
    <div className="ui-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} role="status" className={cx("ui-toast", `ui-toast--${t.tone ?? "info"}`)}>
          {t.tone === "success" ? <TickIcon size={14} /> : null}
          <div className="ui-toast__content">
            <div className="ui-toast__title">{t.title}</div>
            {t.description ? <div className="ui-toast__desc">{t.description}</div> : null}
          </div>
          <button type="button" className="ui-toast__close" aria-label="Dismiss notification" onClick={() => onDismiss(t.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
