import type { MouseEvent, ReactNode } from "react";
import { cx } from "./cx";
import { Spinner } from "./Spinner";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "link";
  size?: "sm" | "md";
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: (e: MouseEvent) => void;
  children: ReactNode;
  className?: string;
  title?: string;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  onClick,
  children,
  className,
  title,
}: ButtonProps): JSX.Element {
  const inactive = disabled || loading;
  return (
    <button
      type={type}
      className={cx("ui-btn", `ui-btn--${variant}`, `ui-btn--${size}`, loading && "ui-btn--loading", className)}
      onClick={onClick}
      disabled={inactive}
      aria-busy={loading || undefined}
      title={title}
    >
      {loading ? <Spinner size="sm" /> : null}
      <span className="ui-btn__label">{children}</span>
    </button>
  );
}
