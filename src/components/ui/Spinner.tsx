import { cx } from "./cx";

/** Inline loading indicator. `label` is announced to screen readers
 *  and rendered as visible text when provided. */
export function Spinner({ size = "md", label }: { size?: "sm" | "md"; label?: string }): JSX.Element {
  return (
    <span className={cx("ui-spinner", `ui-spinner--${size}`)} role="status" aria-label={label ? undefined : "Loading"}>
      <span className="ui-spinner__circle" aria-hidden="true" />
      {label != null ? <span className="ui-spinner__label">{label}</span> : null}
    </span>
  );
}
