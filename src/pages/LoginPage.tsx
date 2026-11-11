// LoginPage (WO-3) — centered paper card. Inline role="alert" form error
// (BAD_CREDENTIALS → a plain honest message), field-level validation and
// `?next=` honouring. A live session redirects to `/`.
import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../types";
import { Button, Field, Input, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage(): JSX.Element {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // While the session is being restored, show the spinner — never a flash
  // of the login form. A live session goes straight to the portal; to use
  // another account, sign out from the header first.
  if (auth.loading) {
    return (
      <div className="sh-fullpage">
        <Spinner label="Checking your session…" />
      </div>
    );
  }
  if (auth.profile) return <Navigate to="/" replace />;

  const nextParam = searchParams.get("next");
  const next = nextParam !== null && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const errors: { email?: string; password?: string } = {};
    const trimmed = email.trim();
    if (trimmed === "") errors.email = "Email is required.";
    else if (!EMAIL_RE.test(trimmed)) errors.email = "Enter a valid email address.";
    if (password === "") errors.password = "Password is required.";
    setFieldErrors(errors);
    setFormError(null);
    if (errors.email !== undefined || errors.password !== undefined) return;

    setSubmitting(true);
    auth
      .signIn(trimmed, password)
      .then(() => {
        navigate(next, { replace: true });
      })
      .catch((err: unknown) => {
        setSubmitting(false);
        if (err instanceof ApiError && err.code === "BAD_CREDENTIALS") {
          setFormError("Email or password is incorrect.");
        } else {
          setFormError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
        }
      });
  }

  return (
    <div className="sh-login">
      <div className="sh-login__card">
        <header className="sh-login__head">
          <h1 className="sh-login__title">Sign in</h1>
          <p className="sh-login__sub">
            Use your university account to submit and review grades.
          </p>
        </header>

        <form className="sh-login__form" onSubmit={handleSubmit} noValidate>
          <Field label="Email" htmlFor="sh-login-email" error={fieldErrors.email ?? null}>
            <Input
              id="sh-login-email"
              type="email"
              autoComplete="email"
              value={email}
              invalid={fieldErrors.email != null}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="sh-login-password" error={fieldErrors.password ?? null}>
            <Input
              id="sh-login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              invalid={fieldErrors.password != null}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {formError !== null ? (
            <div className="sh-login__alert" role="alert">
              {formError}
            </div>
          ) : null}

          <Button type="submit" variant="primary" loading={submitting} disabled={submitting}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
