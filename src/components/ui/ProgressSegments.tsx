import { cx } from "./cx";
import { TickIcon } from "./TickIcon";

export interface ProgressSegment {
  key: string;
  label: string;
  ratio: number;
  state: "not_started" | "draft" | "submitted" | "approved";
}

export interface ProgressSegmentsProps {
  segments: ProgressSegment[];
  size?: "sm" | "md";
  showLabels?: boolean;
  activeKey?: string | null;
  className?: string;
}

/** One hairline segment per entry (callers pass the four periods):
 *  outline = not_started · hatched fill by ratio (--draft) = draft ·
 *  solid --accent + paper TickIcon = submitted · filled brand green with the
 *  tick = approved by the department head. */
export function ProgressSegments({
  segments,
  size = "md",
  showLabels = false,
  activeKey = null,
  className,
}: ProgressSegmentsProps): JSX.Element {
  const summary = segments.map((s) => `${s.label}: ${s.state.replace("_", " ")}`).join(", ");
  return (
    <div className={cx("ui-segs", className)} role="img" aria-label={summary}>
      {segments.map((s) => {
        const ratio = Math.max(0, Math.min(1, s.ratio));
        const active = activeKey === s.key;
        return (
          <div key={s.key} className="ui-seg-cell">
            <div
              className={cx("ui-seg", `ui-seg--${s.state}`, `ui-seg--${size}`, active && "ui-seg--active")}
              title={`${s.label}: ${s.state}`}
              aria-current={active ? "true" : undefined}
            >
              {s.state === "draft" ? (
                <span className="ui-seg__fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
              ) : null}
              {s.state === "submitted" || s.state === "approved" ? (
                <TickIcon size={size === "sm" ? 8 : 12} />
              ) : null}
            </div>
            {showLabels ? (
              <span className="ui-seg__label mono-label">{s.label}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
