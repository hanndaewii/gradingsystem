// LoginPage (WO-3) — centered paper card. Inline role="alert" form error
// (BAD_CREDENTIALS → a plain honest message), field-level validation and
// `?next=` honouring. A live session redirects to `/`.
//
// Two modes:
//   • Sign in   — email + password (Supabase Auth).
//   • Register  — the professor's name, department and email; we email them a
//     one-time code, which is exchanged for a session and a faculty profile.
import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../types";
import { Button, Field, Input, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api, API_MODE } from "../api";
import { DEMO_REGISTRATION_CODE } from "../data/seed";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = "signin" | "register";

export default function LoginPage(): JSX.Element {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; name?: string; department?: string; code?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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

  function resetMessages(): void {
    setFormError(null);
    setNotice(null);
    setFieldErrors({});
  }

  function switchMode(target: Mode): void {
    setMode(target);
    resetMessages();
    setCodeSent(false);
    setCode("");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const errors: { email?: string; password?: string; name?: string; department?: string; code?: string } = {};
    const trimmed = email.trim();
    if (mode === "signin") {
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
      return;
    }

    // ── registration ────────────────────────────────────────────────────────
    if (!codeSent) {
      if (name.trim() === "") errors.name = "Your name is required.";
      if (department.trim() === "") errors.department = "Your department is required.";
      if (trimmed === "") errors.email = "Email is required.";
      else if (!EMAIL_RE.test(trimmed)) errors.email = "Enter a valid email address.";
      setFieldErrors(errors);
      setFormError(null);
      if (Object.keys(errors).length > 0) return;

      setSubmitting(true);
      api
        .requestRegistrationCode(trimmed)
        .then(() => {
          setSubmitting(false);
          setCodeSent(true);
          setNotice(
            `We sent a 6-digit code to ${trimmed}. Enter it below to finish setting up your account.`,
          );
        })
        .catch((err: unknown) => {
          setSubmitting(false);
          setFormError(err instanceof Error ? err.message : "We could not send the code. Please try again.");
        });
      return;
    }

    // ── verify the emailed code ─────────────────────────────────────────────
    if (code.trim() === "") errors.code = "Enter the code we emailed you.";
    setFieldErrors(errors);
    setFormError(null);
    if (errors.code !== undefined) return;

    setSubmitting(true);
    api
      .completeRegistration({
        email: trimmed,
        code: code.trim(),
        name: name.trim(),
        department: department.trim(),
      })
      .then(() => {
        // The backend has established the session (Supabase Auth stores it);
        // reloading lets the auth context pick it up and enter the portal.
        navigate(next, { replace: true });
        window.location.reload();
      })
      .catch((err: unknown) => {
        setSubmitting(false);
        if (err instanceof ApiError && err.field === "code") {
          setFieldErrors({ code: err.message });
        } else {
          setFormError(err instanceof Error ? err.message : "That code is not valid or has expired.");
        }
      });
  }

  return (
    <div className="sh-login">
      <div className="sh-login__card">
        <header className="sh-login__head">
          <h1 className="sh-login__title">{mode === "signin" ? "Sign in" : "Register"}</h1>
          <p className="sh-login__sub">
            {mode === "signin"
              ? "Use your university account to submit and review grades."
              : "Create a faculty account — we email you a one-time code to verify your address."}
          </p>
        </header>

        <div className="sh-login__modes" role="tablist" aria-label="Sign in or register">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={`sh-login__mode${mode === "signin" ? " is-active" : ""}`}
            onClick={() => switchMode("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            className={`sh-login__mode${mode === "register" ? " is-active" : ""}`}
            onClick={() => switchMode("register")}
          >
            Register
          </button>
        </div>

        <form className="sh-login__form" onSubmit={handleSubmit} noValidate>
          {mode === "register" && !codeSent ? (
            <>
              <Field label="Full name" htmlFor="sh-reg-name" error={fieldErrors.name ?? null}>
                <Input
                  id="sh-reg-name"
                  autoComplete="name"
                  placeholder="Prof. Juan Dela Cruz"
                  value={name}
                  invalid={fieldErrors.name != null}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="Department" htmlFor="sh-reg-dept" error={fieldErrors.department ?? null}>
                <Input
                  id="sh-reg-dept"
                  placeholder="Department of Computer Science"
                  value={department}
                  invalid={fieldErrors.department != null}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </Field>
            </>
          ) : null}

          <Field label="Email" htmlFor="sh-login-email" error={fieldErrors.email ?? null}>
            <Input
              id="sh-login-email"
              type="email"
              autoComplete="email"
              placeholder="you@college.edu"
              value={email}
              invalid={fieldErrors.email != null}
              disabled={mode === "register" && codeSent}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          {mode === "signin" ? (
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
          ) : null}

          {mode === "register" && codeSent ? (
            <Field label="6-digit code" htmlFor="sh-reg-code" error={fieldErrors.code ?? null}>
              <Input
                id="sh-reg-code"
                className="num"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={code}
                invalid={fieldErrors.code != null}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </Field>
          ) : null}

          {notice !== null ? (
            <div className="sh-login__notice" role="status">
              {notice}
              <span className="sh-login__notefine">
                If it does not arrive, check your spam folder — your college’s mail service must be allowed to send
                from our address.
              </span>
            </div>
          ) : null}

          {formError !== null ? (
            <div className="sh-login__alert" role="alert">
              {formError}
            </div>
          ) : null}

          <Button type="submit" variant="primary" loading={submitting} disabled={submitting}>
            {mode === "signin"
              ? "Sign in"
              : codeSent
                ? "Verify code and finish"
                : "Email me a code"}
          </Button>

          {mode === "register" && codeSent ? (
            <div className="sh-login__actions">
              <button
                type="button"
                className="sh-login__link"
                onClick={() => {
                  setCodeSent(false);
                  setCode("");
                  resetMessages();
                }}
              >
                Use a different email
              </button>
              <button
                type="button"
                className="sh-login__link"
                disabled={resending}
                onClick={() => {
                  setResending(true);
                  setNotice(null);
                  api
                    .requestRegistrationCode(email.trim())
                    .then(() => {
                      setResending(false);
                      setNotice(`We sent a new code to ${email.trim()}. It expires in 60 minutes.`);
                    })
                    .catch((err: unknown) => {
                      setResending(false);
                      setFormError(
                        err instanceof Error ? err.message : "We could not resend the code. Please try again.",
                      );
                    });
                }}
              >
                {resending ? "Sending…" : "Resend code"}
              </button>
            </div>
          ) : null}

          {mode === "register" && !codeSent ? (
            <p className="sh-login__hint">
              {API_MODE === "demo" ? (
                <>
                  Demo backend — the code is <span className="num">{DEMO_REGISTRATION_CODE}</span>.
                </>
              ) : (
                "We will email you a 6-digit code. It expires in 60 minutes."
              )}{" "}
              Already registered?{" "}
              <button type="button" className="sh-login__link" onClick={() => switchMode("signin")}>
                Sign in instead
              </button>
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
