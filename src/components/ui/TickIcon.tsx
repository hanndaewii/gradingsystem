import { cx } from "./cx";

/** Gold check mark. `draw` animates the stroke over --dur-slow
 *  (reduced motion lands on the final frame instantly, D21). */
export function TickIcon({ size = 16, draw = false, className }: { size?: number; draw?: boolean; className?: string }): JSX.Element {
  return (
    <svg
      className={cx("ui-tick", draw && "ui-tick--draw", className)}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="ui-tick__path"
        d="M3 8.6 6.4 12 13 4.6"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
    </svg>
  );
}
