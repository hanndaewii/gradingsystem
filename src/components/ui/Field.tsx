import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "./cx";

export interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  /** Marks the field required with a visible asterisk. */
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/** Mono small-caps label + control + hint (or error, which wins). */
export function Field({ label, htmlFor, hint, error, required = false, children, className }: FieldProps): JSX.Element {
  return (
    <div className={cx("ui-field", className)}>
      <label className="ui-field__label mono-label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="ui-field__req" title="required">
            {" *"}
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <div className="ui-field__error" role="alert">
          {error}
        </div>
      ) : hint != null ? (
        <div className="ui-field__hint">{hint}</div>
      ) : null}
    </div>
  );
}

export function Input({
  invalid = false,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }): JSX.Element {
  return <input {...rest} className={cx("ui-input", invalid && "is-invalid", className)} aria-invalid={invalid || undefined} />;
}

export function Select({
  invalid = false,
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }): JSX.Element {
  return <select {...rest} className={cx("ui-select", invalid && "is-invalid", className)} aria-invalid={invalid || undefined} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>): JSX.Element {
  return <textarea {...rest} className={cx("ui-textarea", className)} />;
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  id?: string;
}): JSX.Element {
  return (
    <label className="ui-checkbox">
      <input
        id={id}
        type="checkbox"
        className="ui-checkbox__input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="ui-checkbox__label">{label}</span>
    </label>
  );
}
