import { useEffect, useRef, useState } from "react";
import { cx } from "./cx";

export interface MenuItem {
  key: string;
  label: string;
  tone?: "default" | "danger";
  disabled?: boolean;
  onSelect: () => void;
}

/** "⋯" trigger + popover list. Closes on outside click and Escape
 *  (Escape also returns focus to the trigger and — when nested in a
 *  Modal — is consumed in the capture phase so only the menu closes). */
export function Menu({ items, ariaLabel, align = "end" }: { items: MenuItem[]; ariaLabel: string; align?: "start" | "end" }): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent): void {
      if (rootRef.current && e.target instanceof Node && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDocMouseDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    const first = listRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)");
    first?.focus();
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cx("ui-menu", `ui-menu--${align}`)}>
      <button
        ref={triggerRef}
        type="button"
        className="ui-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>
      {open ? (
        <div ref={listRef} className="ui-menu__list" role="menu" aria-label={ariaLabel}>
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              className={cx("ui-menu__item", it.tone === "danger" && "ui-menu__item--danger")}
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
