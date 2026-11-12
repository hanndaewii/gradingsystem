// FacultyPage — the department head's account desk.
//
// Adds a faculty account (name, department, email, password) or resets an
// existing password, through the faculty-admin Worker. No email codes, no
// rate limits: the head controls who gets in. The generated password is shown
// once so it can be shared out of band.
import { useCallback, useEffect, useState } from "react";
import { createTeacher, listFaculty, resetPassword, setCredential } from "../../api/adminApi";
import type { FacultyMember } from "../../api/adminApi";
import { Button, Field, Input, Menu, Panel, PasswordInput, Spinner, useToast } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import "../../styles/admin.css";

export default function FacultyPage(): JSX.Element {
  const toast = useToast();
  const auth = useAuth();
  const selfEmail = auth.profile?.email ?? null;
  const [members, setMembers] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);
  const [editing, setEditing] = useState<{ email: string; role: "professor" | "admin" } | null>(null);
  const [newPass, setNewPass] = useState("");

  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    listFaculty()
      .then((rows) => {
        setMembers(rows);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setLoading(false);
        setError(err instanceof Error ? err.message : "Could not load the faculty list.");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await createTeacher({
        name: name.trim(),
        department: department.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
      });
      setIssued({ email: created.email, password: created.password });
      setName("");
      setDepartment("");
      setEmail("");
      setPassword("");
      toast.push({ title: `${created.email} can now sign in`, tone: "success" });
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not create that account.";
      setError(message);
      toast.push({ title: "Could not create the account", description: message, tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(member: FacultyMember): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await resetPassword({ email: member.email });
      setIssued({ email: result.email, password: result.password });
      toast.push({ title: `New password for ${result.email}`, tone: "success" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not reset that password.";
      setError(message);
      toast.push({ title: "Could not reset the password", description: message, tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adm-page">
      <header className="adm-mast">
        <h1 className="adm-mast__title">Faculty accounts</h1>
        <span className="adm-mast__term">Add a professor or reset a password — no email codes needed.</span>
      </header>

      {issued !== null ? (
        <div className="adm-issued">
          <p className="mono-label">Share this once — it is not stored anywhere in the portal</p>
          <p className="adm-issued__line num">
            {issued.email} · {issued.password}
          </p>
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
      ) : null}

      <div className="adm-faculty">
        <Panel label="Add a faculty account">
          <form className="adm-faculty__form" onSubmit={(e) => void handleAdd(e)}>
            <Field label="Full name" htmlFor="adm-fac-name">
              <Input id="adm-fac-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Prof. Juan Dela Cruz" />
            </Field>
            <Field label="Department" htmlFor="adm-fac-dept">
              <Input id="adm-fac-dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Department of Computer Science" />
            </Field>
            <Field label="Email" htmlFor="adm-fac-email">
              <Input id="adm-fac-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="faculty@college.edu" />
            </Field>
            <Field label="Password" htmlFor="adm-fac-pass" hint="Leave blank to generate one">
              <PasswordInput
                id="adm-fac-pass"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Button type="submit" variant="primary" loading={busy} disabled={busy}>
              Create account
            </Button>
          </form>
        </Panel>

        <Panel label={`Current faculty (${members.length})`}>
          {loading ? (
            <Spinner label="Loading faculty…" />
          ) : error !== null ? (
            <div className="sh-login__alert" role="alert">
              {error}
            </div>
          ) : members.length === 0 ? (
            <p className="adm-none">No faculty accounts yet.</p>
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
                                setIssued({ email: res.email, password: res.password });
                                toast.push({
                                  title: `${res.role === "admin" ? "Head" : "Professor"} password set for ${res.email}`,
                                  tone: "success",
                                });
                                load();
                              })
                              .catch((err: unknown) => {
                                setBusy(false);
                                const message = err instanceof Error ? err.message : "Could not set that password.";
                                setError(message);
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
                          Professor password
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
    </div>
  );
}
