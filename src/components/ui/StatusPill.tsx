import { cx } from "./cx";
import { TickIcon } from "./TickIcon";

export interface StatusPillProps {
  tone: "neutral" | "progress" | "done";
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
