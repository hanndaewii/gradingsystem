// FacultyPage — the department head's account desk.
//
// Adds a faculty account (name, department, email, password) or resets an
// existing password, through the faculty-admin Worker. No email codes, no
// rate limits: the head controls who gets in. The generated password is shown
// once — right after it is created — so it can be shared out of band, and is
// never stored or shown again.
//
// An expired session sends the head back to sign in (the router keeps ?next=
// so they land here again); the list never shows a count it has not earned.
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createTeacher, listFaculty, resetPassword, revokeAccess, setCredential } from "../../api/adminApi";
import type { FacultyMember } from "../../api/adminApi";
import { ApiError } from "../../types";
import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  Menu,
  Panel,
  PasswordInput,
  StatusPill,
  useToast,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import "../../styles/admin.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormValues {
  name: string;
  department: string;
  email: string;
}

type FieldName = keyof FormValues;
type Touched = Partial<Record<FieldName, boolean>>;

/** Everything the form needs before it may submit — checked on blur and submit. */
function validate(v: FormValues): { name?: string; department?: string; email?: string } {
  const errs: { name?: string; department?: string; email?: string } = {};
  if (v.name.trim() === "") errs.name = "Full name is required.";
  if (v.department.trim() === "") errs.department = "Department is required.";
  const email = v.email.trim();
  if (email === "") errs.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) errs.email = "Enter a valid email address.";
  return errs;
}

export default function FacultyPage(): JSX.Element {
  const toast = useToast();
  const auth = useAuth();
  const navigate = useNavigate();
  const selfEmail = auth.profile?.email ?? null;

  const [members, setMembers] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(true);
  // The count is only real once a request has actually come back.
  const [loaded, setLoaded] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [sessionGone, setSessionGone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ title: string; email: string; password: string } | null>(null);
  const [editing, setEditing] = useState<{ email: string; role: "professor" | "admin" } | null>(null);
  const [newPass, setNewPass] = useState("");
  const [revoking, setRevoking] = useState<FacultyMember | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);

  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<Touched>({});

  const errors = validate({ name, department, email });
  /** Only shown once the field has been left — never scold mid-typing. */
  const show = (field: FieldName): string | undefined => (touched[field] === true ? errors[field] : undefined);

  const load = useCallback(() => {
    setLoading(true);
    setListError(null);
    listFaculty()
      .then((rows) => {
        setMembers(rows);
        setLoaded(true);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setLoading(false);
        // A 401 clears the profile in AuthContext and the router keeps the
        // URL; the Sign in button is the fallback if that redirect cannot run.
        const expired = err instanceof ApiError && err.code === "SESSION_EXPIRED";
        setSessionGone(expired);
        setListError(
          expired
            ? "Your session has expired — sign in again."
            : err instanceof Error
              ? err.message
              : "Could not load the faculty list.",
        );
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Clears the session and returns to sign-in, keeping this page as next. */
  async function handleSignIn(): Promise<void> {
    try {
      await auth.signOut();
    } catch {
      // Already gone — the redirect below is what matters.
    }
    navigate("/login?next=/faculty", { replace: true });
  }

  async function handleAdd(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setTouched({ name: true, department: true, email: true });
    const errs = validate({ name, department, email });
    if (errs.name !== undefined || errs.department !== undefined || errs.email !== undefined) {
      // Inline messages are already on screen — no request, no server echo.
      setFormError(null);
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const created = await createTeacher({
        name: name.trim(),
        department: department.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
      });
      // The form is done with: clear it, surface the password once, refetch.
      setName("");
      setDepartment("");
      setEmail("");
      setPassword("");
      setTouched({});
      setIssued({
        title:
          password.trim() === ""
            ? `Account created for ${created.email} — we generated the password`
            : `${created.email} can now sign in`,
        email: created.email,
        password: created.password,
      });
      toast.push({ title: `${created.email} can now sign in`, tone: "success" });
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not create that account.";
      setFormError(message);
      toast.push({ title: "Could not create the account", description: message, tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(member: FacultyMember): Promise<void> {
    setBusy(true);
    setFormError(null);
    try {
      const result = await resetPassword({ email: member.email });
      setIssued({ title: `New password for ${result.email}`, email: result.email, password: result.password });
      toast.push({ title: `New password for ${result.email}`, tone: "success" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not reset that password.";
      toast.push({ title: "Could not reset the password", description: message, tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  /** Removes sign-in only — courses, grades and the list entry stay put. */
  async function handleRevoke(): Promise<void> {
    if (revoking == null) return;
    setRevokeBusy(true);
    try {
      const email = revoking.email;
      await revokeAccess({ email });
      setRevoking(null);
      toast.push({
        title: `${email} can no longer sign in`,
        description: "Everything they teach is untouched — restore access any time by setting a new password.",
        tone: "success",
      });
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not remove access.";
      toast.push({ title: "Could not remove access", description: message, tone: "danger" });
    } finally {
      setRevokeBusy(false);
    }
  }

  return (
    <div className="adm-page">
      <header className="adm-mast">
        <div className="adm-mast__head">
          <h1 className="adm-mast__title">Faculty accounts</h1>
          <p className="adm-mast__sub">Add a professor or reset a password — no email codes needed.</p>
        </div>
      </header>

      {issued !== null ? (
        <div className="adm-issued" role="status">
          <div className="adm-issued__head">
            <p className="adm-issued__title">{issued.title}</p>
            <p className="adm-issued__note">Copy it now — this password won't be shown again.</p>
          </div>
          <p className="adm-issued__line num">
            {issued.email} · {issued.password}
          </p>
          <div className="adm-issued__actions">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void navigator.clipboard?.writeText(`${issued.email} / ${issued.password}`);
                toast.push({ title: "Copied to the clipboard" });
              }}
            >
              Copy
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIssued(null)}>
              Done
            </Button>
          </div>
        </div>
      ) : null}

      <div className="adm-faculty">
        <Panel label="Add a faculty account">
          <form className="adm-faculty__form" onSubmit={(e) => void handleAdd(e)} noValidate>
            <Field label="Full name" htmlFor="adm-fac-name" required error={show("name")}>
              <Input
                id="adm-fac-name"
                required
                autoComplete="name"
                value={name}
                placeholder="Prof. Juan Dela Cruz"
                invalid={show("name") != null}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              />
            </Field>
            <Field label="Department" htmlFor="adm-fac-dept" required error={show("department")}>
              <Input
                id="adm-fac-dept"
                required
                value={department}
                placeholder="Department of Computer Science"
                invalid={show("department") != null}
                onChange={(e) => setDepartment(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, department: true }))}
              />
            </Field>
            <Field label="Email" htmlFor="adm-fac-email" required error={show("email")}>
              <Input
                id="adm-fac-email"
                type="email"
                required
                value={email}
                placeholder="faculty@college.edu"
                invalid={show("email") != null}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              />
            </Field>
            <Field label="Password (optional)" htmlFor="adm-fac-pass" hint="Leave blank and we generate one">
              <PasswordInput
                id="adm-fac-pass"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {formError !== null ? (
              <div className="sh-login__alert" role="alert">
                {formError}
              </div>
            ) : null}
            <Button type="submit" variant="primary" loading={busy} disabled={busy}>
              Create account
            </Button>
          </form>
        </Panel>

        {/* No "(0)" while loading or after a failure — the count is earned. */}
        <Panel label={loaded ? `Current faculty (${members.length})` : "Current faculty"}>
          {loading && !loaded ? (
            <div className="adm-skeleton" role="status" aria-label="Loading the faculty list…">
              <span className="adm-skeleton__row" />
              <span className="adm-skeleton__row" />
              <span className="adm-skeleton__row" />
            </div>
          ) : listError !== null ? (
            <div className="sh-login__alert" role="alert">
              {listError}
              <div className="adm-faculty__recovery">
                {sessionGone ? (
                  <Button size="sm" variant="primary" onClick={() => void handleSignIn()}>
                    Sign in
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={load}>
                    Try again
                  </Button>
                )}
              </div>
            </div>
          ) : members.length === 0 ? (
            <div className="adm-empty">
              <svg
                className="adm-empty__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M19 8v6M22 11h-6" />
              </svg>
              <p className="adm-empty__title">No faculty accounts yet.</p>
              <p className="adm-empty__body">Add your first professor using the form.</p>
            </div>
          ) : (
            <ul className="adm-faclist">
              {members.map((m) => {
                const isEditing = editing !== null && editing.email === m.email;
                const isSelf = m.email.toLowerCase() === (selfEmail ?? "").toLowerCase();
                return (
                  <li key={m.id} className="adm-faclist__row">
                    <span className="adm-faclist__name">{m.name}</span>
                    <span className="adm-faclist__email num">{m.email}</span>
                    <span className="adm-faclist__dept">{m.department}</span>
                    <span className={`adm-faclist__role adm-faclist__role--${m.role}`}>{m.role}</span>
                    {m.hasAccess ? null : (
                      <StatusPill
                        tone="neutral"
                        label="No access"
                        title="This account cannot sign in. Restore access by setting a new password."
                      />
                    )}
                    {isEditing ? (
                      <span className="adm-faclist__set">
                        <PasswordInput
                          className="num"
                          autoComplete="new-password"
                          placeholder="new password"
                          value={newPass}
                          onChange={(e) => setNewPass(e.target.value)}
                        />
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={busy}
                          onClick={() => {
                            setBusy(true);
                            setCredential({
                              email: m.email,
                              role: editing.role,
                              password: newPass.trim() || undefined,
                              name: m.name,
                              department: m.department,
                            })
                              .then((res) => {
                                setBusy(false);
                                setEditing(null);
                                setNewPass("");
                                setIssued({
                                  title: `${res.role === "admin" ? "Head" : "Professor"} password set for ${res.email}`,
                                  email: res.email,
                                  password: res.password,
                                });
                                toast.push({
                                  title: `${res.role === "admin" ? "Head" : "Professor"} password set for ${res.email}`,
                                  tone: "success",
                                });
                                load();
                              })
                              .catch((err: unknown) => {
                                setBusy(false);
                                const message = err instanceof Error ? err.message : "Could not set that password.";
                                toast.push({
                                  title: "Could not set the password",
                                  description: message,
                                  tone: "danger",
                                });
                              });
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(null);
                            setNewPass("");
                          }}
                        >
                          Cancel
                        </Button>
                      </span>
                    ) : (
                      <span className="adm-faclist__set">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            setEditing({ email: m.email, role: "professor" });
                            setNewPass("");
                          }}
                        >
                          {m.hasAccess ? "Professor password" : "Restore access"}
                        </Button>
                        {isSelf ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => {
                              setEditing({ email: m.email, role: "admin" });
                              setNewPass("");
                            }}
                          >
                            Head password
                          </Button>
                        ) : (
                          <Menu
                            ariaLabel={`More actions for ${m.name}`}
                            items={[
                              {
                                key: "head",
                                label: "Grant head access",
                                onSelect: () => {
                                  setEditing({ email: m.email, role: "admin" });
                                  setNewPass("");
                                },
                              },
                              // Only for someone else, and only while they can
                              // still sign in — the head is never offered a
                              // way to lock themselves out.
                              ...(m.hasAccess
                                ? [
                                    {
                                      key: "revoke",
                                      label: "Remove access",
                                      tone: "danger" as const,
                                      onSelect: () => setRevoking(m),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        )}
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => void handleReset(m)}>
                          Reset
                        </Button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <ConfirmDialog
        open={revoking != null}
        title="Remove sign-in access?"
        body={
          <>
            <p>
              <strong>{revoking?.email}</strong> will no longer be able to sign in to the portal.
            </p>
            <p>
              Nothing else changes — their courses, grades, attendance and this list entry all stay exactly as they
              are. You can restore access at any time by setting a new password.
            </p>
          </>
        }
        confirmLabel="Remove access"
        tone="danger"
        busy={revokeBusy}
        onConfirm={() => void handleRevoke()}
        onCancel={() => (revokeBusy ? undefined : setRevoking(null))}
      />
    </div>
  );
}
