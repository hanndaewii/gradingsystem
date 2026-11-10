import { useSyncExternalStore } from "react";

/** UI theme (D22): light warm paper (default) or warm charcoal dim.
 *  Persisted under the non-api localStorage key
 *  `faculty-portal.theme:v1` and applied to <html> as
 *  data-theme + color-scheme. All consumers stay in sync via an
 *  external store, so the header toggle and any page widget agree. */

export type Theme = "light" | "dim";

const THEME_KEY = "faculty-portal.theme:v1";

type Listener = () => void;
const listeners = new Set<Listener>();
let current: Theme | null = null;

function readStoredTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_KEY) === "dim" ? "dim" : "light";
  } catch {
    return "light"; // storage unavailable — in-memory only
  }
}

function applyToDocument(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme === "dim" ? "dark" : "light";
}

function getTheme(): Theme {
  if (current === null) {
    current = readStoredTheme();
    applyToDocument(current);
  }
  return current;
}

function setTheme(theme: Theme): void {
  current = theme;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore: private mode / storage disabled
  }
  applyToDocument(theme);
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTheme(): { theme: Theme; setTheme(t: Theme): void; toggle(): void } {
  const theme = useSyncExternalStore(subscribe, getTheme);
  return {
    theme,
    setTheme: setTheme,
    toggle: () => setTheme(theme === "dim" ? "light" : "dim"),
  };
}
