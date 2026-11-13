import type { KeyboardEvent, ReactNode } from "react";
import { useRef } from "react";
import { cx } from "./cx";
import { TickIcon } from "./TickIcon";

export interface TabItem {
  key: string;
  label: string;
  badge?: ReactNode;
  tick?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  /** strip variant only: the step's status line (e.g. "Draft"). */
  status?: ReactNode;
  /** strip variant only: tone for the status line. */
  statusTone?: "done" | "draft";
  /** strip variant only: completion0–100 for the step's progress bar. */
  bar?: number;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  variant?: "underline" | "segmented" | "strip";
  ariaLabel: string;
}

/** ARIA tabs with roving tabindex: Arrow/Home/End move focus AND
 *  selection across enabled tabs (wrapping). Disabled tabs carry
 *  their `disabledReason` as a tooltip. */
export function Tabs({ items, value, onChange, variant = "underline", ariaLabel }: TabsProps): JSX.Element {
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const enabled = items.map((it, i) => ({ it, i })).filter((x) => !x.it.disabled);
    if (enabled.length === 0) return;
    const pos = enabled.findIndex((x) => x.i === index);
    let target: { it: TabItem; i: number } | undefined;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        target = enabled[(pos + 1 + enabled.length) % enabled.length];
        break;
      case "ArrowLeft":
      case "ArrowUp":
        target = enabled[(pos - 1 + enabled.length) % enabled.length];
        break;
      case "Home":
        target = enabled[0];
        break;
      case "End":
        target = enabled[enabled.length - 1];
        break;
      default:
        return;
    }
    e.preventDefault();
    if (target) {
      btnRefs.current[target.i]?.focus();
      onChange(target.it.key);
    }
  }

  return (
    <div className={cx("ui-tabs", `ui-tabs--${variant}`)} role="tablist" aria-label={ariaLabel}>
      {items.map((it, i) => {
        const selected = it.key === value;
        return (
          <button
            key={it.key}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={it.disabled}
            title={it.disabled ? it.disabledReason : undefined}
            className="ui-tab"
            onClick={() => {
              if (!it.disabled) onChange(it.key);
            }}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {variant === "strip" ? (
              <>
                <span className="ui-tab__top">
                  {it.tick ? <TickIcon size={11} /> : null}
                  <span className="ui-tab__label">{it.label}</span>
                  {it.status != null ? (
                    <span
                      className={cx(
                        "ui-tab__status",
                        it.statusTone === "done" && "ui-tab__status--done",
                        it.statusTone === "draft" && "ui-tab__status--draft",
                      )}
                    >
                      {it.status}
                    </span>
                  ) : null}
                </span>
                <span className="ui-tab__bar" aria-hidden="true">
                  <span
                    className="ui-tab__barfill"
                    style={{ width: `${Math.max(0, Math.min(100, it.bar ?? 0))}%` }}
                  />
                </span>
                {it.badge != null ? <span className="ui-tab__badge num">{it.badge}</span> : null}
              </>
            ) : (
              <>
                {it.tick ? <TickIcon size={11} /> : null}
                <span className="ui-tab__label">{it.label}</span>
                {it.badge != null ? <span className="ui-tab__badge num">{it.badge}</span> : null}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
