// CourseFormModal (WO-4) — create/edit course. Code is uppercase-normalised
// and required, title required (inline field errors, never a toast for field
// errors), academic year chosen from the known AYs or entered free-form
// (validated YYYY-YYYY), semester defaults to the term selected in the
// header. DUPLICATE_CODE → inline "You already have a course with this code
// this semester." Edit mode reuses the form via api.updateCourse
// (code/title only — a course's term is immutable).
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../api";
import { useTerm } from "../../context/TermContext";
import { ApiError } from "../../types";
import type { Course, Term } from "../../types";
import { Button, Field, Input, Modal, Select, useToast } from "../ui";

const NEW_AY = "__new__";
const AY_RE = /^\d{4}-\d{4}$/;
const DUPLICATE_MSG = "You already have a course with this code this semester.";

interface FieldErrors {
  code?: string;
  title?: string;
  ay?: string;
}

export interface CourseFormModalProps {
  open: boolean;
  onClose(): void;
  /** Present → edit mode (code + title only). */
  course?: Course | null;
  /** Create-mode defaults: the term currently selected in the header. */
  defaultTerm?: Term;
  onSaved(course: Course): void;
}

export default function CourseFormModal({ open, onClose, course = null, defaultTerm, onSaved }: CourseFormModalProps): JSX.Element {
  const { terms } = useTerm();
  const toast = useToast();
  const isEdit = course !== null;

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [ayChoice, setAyChoice] = useState("");
  const [newAy, setNewAy] = useState("");
  const [semester, setSemester] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Re-seed the fields each time the dialog opens (never while typing).
  useEffect(() => {
    if (!open) return;
    setCode(course?.code ?? "");
    setTitle(course?.title ?? "");
    setAyChoice(course?.academicYear ?? defaultTerm?.academicYear ?? terms[0]?.academicYear ?? "");
    setNewAy("");
    setSemester(course?.semester ?? defaultTerm?.semester ?? 1);
    setErrors({});
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const academicYears = Array.from(new Set(terms.map((t) => t.academicYear))).sort();

  function submit(): void {
    const nextErrors: FieldErrors = {};
    const codeValue = code.trim().toUpperCase();
    const titleValue = title.trim();
    let ayValue = ayChoice;
    if (codeValue === "") nextErrors.code = "Code is required.";
    if (titleValue === "") nextErrors.title = "Title is required.";
    if (!isEdit) {
      if (ayChoice === NEW_AY) {
        ayValue = newAy.trim();
        if (!AY_RE.test(ayValue)) nextErrors.ay = "Enter an academic year like 2026-2027.";
      } else if (ayValue === "") {
        nextErrors.ay = "Academic year is required.";
      }
    }
    setErrors(nextErrors);
    if (nextErrors.code !== undefined || nextErrors.title !== undefined || nextErrors.ay !== undefined) return;

    setSubmitting(true);
    const run = isEdit
      ? api.updateCourse(course.id, { code: codeValue, title: titleValue })
      : api.createCourse({ code: codeValue, title: titleValue, academicYear: ayValue, semester });
    run
      .then((saved) => {
        setSubmitting(false);
        toast.push({
          title: isEdit ? `Updated ${saved.code}.` : `Created ${saved.code} — ${saved.title}.`,
          tone: "success",
        });
        onSaved(saved);
      })
      .catch((err: unknown) => {
        setSubmitting(false);
        if (err instanceof ApiError && (err.code === "DUPLICATE_CODE" || err.field === "code")) {
          setErrors({ code: DUPLICATE_MSG });
          return;
        }
        if (err instanceof ApiError && err.field === "title") {
          setErrors({ title: err.message });
          return;
        }
        toast.push({
          title: "Could not save the course.",
          description: err instanceof Error ? err.message : undefined,
          tone: "danger",
        });
      });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    submit();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit course · ${course.code}` : "Add course"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={submitting} disabled={submitting}>
            {isEdit ? "Save changes" : "Create course"}
          </Button>
        </>
      }
    >
      <form className="prof-form" onSubmit={handleSubmit} noValidate>
        <Field label="Code" htmlFor="prof-course-code" error={errors.code ?? null} hint="e.g. CS101 — unique per semester.">
          <Input
            id="prof-course-code"
            className="prof-mono-input"
            value={code}
            invalid={errors.code != null}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </Field>
        <Field label="Title" htmlFor="prof-course-title" error={errors.title ?? null} hint="e.g. Intro to Programming.">
          <Input
            id="prof-course-title"
            value={title}
            invalid={errors.title != null}
            autoComplete="off"
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        {!isEdit ? (
          <>
            <Field
              label="Academic year"
              htmlFor="prof-course-ay"
              error={errors.ay ?? null}
              hint={ayChoice === NEW_AY ? "Four digits, a dash, four digits." : undefined}
            >
              <Select
                id="prof-course-ay"
                value={ayChoice}
                onChange={(e) => {
                  setAyChoice(e.target.value);
                  setErrors((prev) => ({ ...prev, ay: undefined }));
                }}
              >
                {academicYears.map((ay) => (
                  <option key={ay} value={ay}>
                    {ay}
                  </option>
                ))}
                <option value={NEW_AY}>New academic year…</option>
              </Select>
            </Field>
            {ayChoice === NEW_AY ? (
              <Field label="New academic year" htmlFor="prof-course-ay-new">
                <Input
                  id="prof-course-ay-new"
                  className="prof-mono-input"
                  placeholder="2026-2027"
                  value={newAy}
                  invalid={errors.ay != null}
                  autoComplete="off"
                  onChange={(e) => setNewAy(e.target.value)}
                />
              </Field>
            ) : null}
            <Field label="Semester" htmlFor="prof-course-sem">
              <Select id="prof-course-sem" value={String(semester)} onChange={(e) => setSemester(e.target.value === "2" ? 2 : 1)}>
                <option value="1">1st Sem</option>
                <option value="2">2nd Sem</option>
              </Select>
            </Field>
          </>
        ) : null}
      </form>
    </Modal>
  );
}
