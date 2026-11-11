// ProfileModal (WO-3) â€” "Your profile": read view (name, mono email,
// role pill, department, bio) and an edit form (name/department/bio with
// inline validation) for BOTH roles. The footer also carries the demo-data
// reset behind a ConfirmDialog (D4/D20). Mounted only by the Header.
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import { Button, ConfirmDialog, Field, Input, Modal, StatusPill, Textarea, useToast } from "./ui";
import { useAuth } from "../context/AuthContext";

const BIO_MAX = 400;

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileModal({ open, onClose }: ProfileModalProps): JSX.Element {
  const auth = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [bio, setBio] = useState("");
  const [errors, setErrors] = useState<{ name?: string; department?: string; bio?: string }>({});
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const profile = auth.profile;

  // Re-seed the draft from the live profile each time the modal opens
  // (and after a save replaces the profile).
  useEffect(() => {
    if (!open || !profile) return;
    setName(profile.name);
    setDepartment(profile.department);
    setBio(profile.bio);
    setErrors({});
    setEditing(false);
  }, [open, profile]);

  if (!profile) return <></>;

  function startEdit(): void {
    if (!profile) return;
    setName(profile.name);
    setDepartment(profile.department);
    setBio(profile.bio);
    setErrors({});
    setEditing(true);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const next: typeof errors = {};
    if (name.trim() === "") next.name = "Name is required.";
    if (department.trim() === "") next.department = "Department is required.";
    if (bio.length > BIO_MAX) next.bio = `Bio must be ${BIO_MAX} characters or fewer.`;
    setErrors(next);
    if (next.name !== undefined || next.department !== undefined || next.bio !== undefined) return;

    setSaving(true);
    auth
      .updateProfile({ name: name.trim(), department: department.trim(), bio })
      .then(() => {
        toast.push({ title: "Profile updated", tone: "success" });
        setSaving(false);
        setEditing(false);
      })
      .catch((err: unknown) => {
        toast.push({
          title: "Could not save your profile",
          description: err instanceof Error ? err.message : "Please try again.",
          tone: "danger",
        });
        setSaving(false);
      });
  }

  function handleReset(): void {
    setResetting(true);
    api
      .resetDemoData()
      .then(() => {
        // The api reseeded localStorage; a reload gives every context a clean start.
        location.reload();
      })
      .catch((err: unknown) => {
        setResetting(false);
        setConfirmReset(false);
        toast.push({
          title: "Reset failed",
          description: err instanceof Error ? err.message : "Please try again.",
          tone: "danger",
        });
      });
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Your profile"
        footer={
          editing ? undefined : (
            <div className="sh-footer-spread">
              <Button variant="ghost" disabled={resetting} onClick={() => setConfirmReset(true)}>
                Reset demo data
              </Button>
              <div className="sh-footer-spread__group">
                <Button variant="secondary" onClick={startEdit}>
                  Edit
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )
        }
      >
        {editing ? (
          <form className="sh-profile__form" onSubmit={handleSubmit} noValidate>
            <Field label="Name" htmlFor="sh-profile-name" error={errors.name ?? null}>
              <Input
                id="sh-profile-name"
                value={name}
                invalid={errors.name != null}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Department" htmlFor="sh-profile-department" error={errors.department ?? null}>
              <Input
                id="sh-profile-department"
                value={department}
                invalid={errors.department != null}
                maxLength={120}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </Field>
            <Field
              label="Bio"
              htmlFor="sh-profile-bio"
              error={errors.bio ?? null}
              hint={
                <span className="sh-profile__count">
                  {bio.length}/{BIO_MAX}
                </span>
              }
            >
              <Textarea id="sh-profile-bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
            </Field>
            <div className="sh-footer-spread">
              <Button variant="ghost" disabled={saving} onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={saving} disabled={saving}>
                Save changes
              </Button>
            </div>
          </form>
        ) : (
          <div className="sh-profile__list">
            <div className="sh-profile__row">
              <span className="mono-label">Name</span>
              <span className="sh-profile__name">{profile.name}</span>
            </div>
            <div className="sh-profile__row">
              <span className="mono-label">Email</span>
              <span className="num sh-profile__mono">{profile.email}</span>
            </div>
            <div className="sh-profile__row">
              <span className="mono-label">Role</span>
              <span>
                <StatusPill tone="neutral" label={profile.role === "admin" ? "Admin" : "Professor"} />
              </span>
            </div>
            <div className="sh-profile__row">
              <span className="mono-label">Department</span>
              <span>{profile.department === "" ? <span className="sh-profile__empty">â€”</span> : profile.department}</span>
            </div>
            <div className="sh-profile__row">
              <span className="mono-label">Bio</span>
              <span className="serif-prose sh-profile__bio">
                {profile.bio === "" ? <span className="sh-profile__empty">â€”</span> : profile.bio}
              </span>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmReset}
        title="Reset demo data?"
        tone="danger"
        busy={resetting}
        confirmLabel="Reset demo data"
        onConfirm={handleReset}
        onCancel={() => {
          if (!resetting) setConfirmReset(false);
        }}
        body={
          <>
            <p>
              This wipes every local change â€” courses, sections, grades, history and comments â€” and
              restores the seeded demo data. This cannot be undone.
            </p>
            <p className="sh-profile__reset-note mono-label">faculty-portal.db:v2</p>
          </>
        }
      />
    </>
  );
}
