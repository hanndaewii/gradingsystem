import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { cx } from "./cx";

export interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

function EyeIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.9 5.2A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.2 3.2M6.6 6.6A18.3 18.3 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.3-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  );
}

/** A password field with a show / hide eye toggle. */
export function PasswordInput({
  invalid = false,
  className,
  ...rest
}: PasswordInputProps): JSX.Element {
  const [visible, setVisible] = useState(false);
  return (
    <span className="ui-password">
      <input
        {...rest}
        type={visible ? "text" : "password"}
        className={cx("ui-input", "ui-password__input", invalid && "is-invalid", className)}
        aria-invalid={invalid || undefined}
      />
      <button
        type="button"
        className="ui-password__toggle"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </span>
  );
}
