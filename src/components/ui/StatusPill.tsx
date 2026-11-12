import { cx } from "./cx";
import { TickIcon } from "./TickIcon";

export interface StatusPillProps {
  /** neutral = nothing yet · progress = in progress · done = finished ·
   *  late = past its deadline and not finished. */
  tone: "neutral" | "progress" | "done" | "late";
  label: string;
  title?: string;
}

export function StatusPill({ tone, label, title }: StatusPillProps): JSX.Element {
  return (
    <span className={cx("ui-pill", `ui-pill--${tone}`)} title={title}>
      {tone === "done" ? <TickIcon size={10} /> : null}
      {label}
    </span>
  );
}
