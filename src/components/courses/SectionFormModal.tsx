// SectionFormModal (WO-4) — create/edit section. Create: name, schedule,
// room + an optional "Copy from" pair of selects (source term = the current
// term or the previous one; source section grouped by course code, default
// "Don't copy") feeding api.createSection's copyFromSectionId. A successful
// copy pushes an info toast reporting the copied assessment/student counts.
// Edit mode (name/schedule/room only) reuses the form via api.updateSection.
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../api";
import { standardCriteriaDefs } from "../../lib/standardCriteria";
import { prevTerm, plural, termLabel } from "../../lib/format";
import { useAsync } from "../../lib/useAsync";
import { PERIODS } from "../../types";
import { ApiError } from "../../types";
import type { Course, Section, Term } from "../../types";
import { Button, Field, Input, Modal, Select, useToast } from "../ui";

const NONE = "__none__";

interface FieldErrors {
  name?: string;
  schedule?: string;
}

function termKey(t: Term): string {
  return `${t.academicYear}:${t.semester}`;
}

export interface SectionFormModalProps {
  open: boolean;
  onClose(): void;
  /** Create mode: the course the section is added to. */
  course?: Course | null;
  /** Present → edit mode (name/schedule/room only). */
  section?: Section | null;
  /** The term selected in the header — anchors the source-term options. */
  currentTerm: Term;
  onSaved(section: Section): void;
}

export default function SectionFormModal({ open, onClose, course = null, section = null, currentTerm, onSaved }: SectionFormModalProps): JSX.Element {
  const toast = useToast();
  const isEdit = section !== null;

  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState("");
  const [room, setRoom] = useState("");
  const [sourceTerm, setSourceTerm] = useState<Term>(currentTerm);
  const [sourceSectionId, setSourceSectionId] = useState(NONE);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Re-seed each time the dialog opens (never while typing).
  useEffect(() => {
    if (!open) return;
    setName(section?.name ?? "");
    setSchedule(section?.schedule ?? "");
    setRoom(section?.room ?? "");
    setSourceTerm(currentTerm);
    setSourceSectionId(NONE);
    setErrors({});
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // prevTerm(currentTerm) is always a different term than currentTerm
  // (sem 1 → previous AY sem 2; sem 2 → same AY sem 1), so exactly two options.
  const sourceTermOptions = [currentTerm, prevTerm(currentTerm)];

  // Own courses + their sections for the chosen source term. The api scopes
  // both reads to the signed-in professor (foreign rows come back empty).
  const sourceKey = open ? termKey(sourceTerm) : "";
  const sourceGroups = useAsync(async () => {
    if (!open) return [];
    const courses = await api.listCourses(sourceTerm);
    const groups = await Promise.all(
      courses.map(async (c) => ({ course: c, sections: await api.listSections(c.id) })),
    );
    return groups.filter((g) => g.sections.length > 0);
  }, [sourceKey]);
  const groups = sourceGroups.data ?? [];

  async function submit(): Promise<void> {
    const nextErrors: FieldErrors = {};
    const nameValue = name.trim();
    const scheduleValue = schedule.trim();
    if (nameValue === "") nextErrors.name = "Section name is required.";
    if (scheduleValue === "") nextErrors.schedule = "Schedule is required.";
    setErrors(nextErrors);
    if (nextErrors.name !== undefined || nextErrors.schedule !== undefined) return;

    setSubmitting(true);
    try {
      if (isEdit) {
        const updated = await api.updateSection(section.id, {
          name: nameValue,
          schedule: scheduleValue,
          room: room.trim(),
        });
        toast.push({ title: `Updated ${updated.name}.`, tone: "success" });
        onSaved(updated);
        return;
      }
      if (!course) return;
      const copying = sourceSectionId !== NONE;
      const created = await api.createSection(course.id, {
        name: nameValue,
        schedule: scheduleValue,
        room: room.trim(),
        copyFromSectionId: copying ? sourceSectionId : null,
      });
      if (copying) {
        // Report exactly what landed in the new section (assessments + roster).
        const perPeriod = await Promise.all(PERIODS.map((p) => api.listAssessments(created.id, p)));
        const students = await api.listStudents(created.id);
        const assessmentCount = perPeriod.reduce((acc, list) => acc + list.length, 0);
        toast.push({
          title: `Created ${created.name} with ${assessmentCount} ${plural(assessmentCount, "assessment")} and ${students.length} ${plural(
            students.length,
            "student",
          )} copied.`,
          tone: "info",
        });
      } else {
        // A fresh section starts with the standard class-record criteria
        // (A | R-1..R-3 → Total | Q-1 | Q-2 | Exam) so the grading grid is
        // usable straight away instead of empty.
        for (const p of PERIODS) {
          await api.setAssessments(created.id, p, standardCriteriaDefs());
        }
        toast.push({
          title: `Created ${created.name} with the standard grading criteria.`,
          tone: "success",
        });
      }
      onSaved(created);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.field === "name") {
        setErrors({ name: err.message });
        return;
      }
      toast.push({
        title: isEdit ? "Could not update the section." : "Could not create the section.",
        description: err instanceof Error ? err.message : undefined,
        tone: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    void submit();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit section · ${section.name}` : `Add section · ${course?.code ?? ""}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={submitting} disabled={submitting}>
            {isEdit ? "Save changes" : "Create section"}
          </Button>
        </>
      }
    >
      <form className="prof-form" onSubmit={handleSubmit} noValidate>
        <Field label="Section name" htmlFor="prof-section-name" error={errors.name ?? null} hint="e.g. Section A.">
          <Input
            id="prof-section-name"
            value={name}
            invalid={errors.name != null}
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="prof-form__row">
          <Field label="Schedule" htmlFor="prof-section-schedule" error={errors.schedule ?? null} hint="e.g. Mon/Wed 9:00 AM.">
            <Input
              id="prof-section-schedule"
              value={schedule}
              invalid={errors.schedule != null}
              autoComplete="off"
              onChange={(e) => setSchedule(e.target.value)}
            />
          </Field>
          <Field label="Room (optional)" htmlFor="prof-section-room">
            <Input id="prof-section-room" value={room} autoComplete="off" onChange={(e) => setRoom(e.target.value)} />
          </Field>
        </div>

        {!isEdit ? (
          <div className="prof-copy">
            <span className="mono-label">Copy from</span>
            <div className="prof-copy__row">
              <Field label="Source term" htmlFor="prof-section-sourceterm">
                <Select
                  id="prof-section-sourceterm"
                  value={termKey(sourceTerm)}
                  onChange={(e) => {
                    const [ay, sem] = e.target.value.split(":");
                    setSourceTerm({ academicYear: ay, semester: sem === "2" ? 2 : 1 });
                    setSourceSectionId(NONE); // a new term invalidates the picked section
                  }}
                >
                  {sourceTermOptions.map((t) => (
                    <option key={termKey(t)} value={termKey(t)}>
                      {termLabel(t)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Source section" htmlFor="prof-section-source">
                <Select
                  id="prof-section-source"
                  value={sourceSectionId}
                  onChange={(e) => setSourceSectionId(e.target.value)}
                >
                  <option value={NONE}>Don't copy</option>
                  {sourceGroups.loading ? <option disabled>Loading sections…</option> : null}
                  {!sourceGroups.loading && groups.length === 0 ? <option disabled>No sections in this term</option> : null}
                  {groups.map((g) => (
                    <optgroup key={g.course.id} label={`${g.course.code} · ${g.course.title}`}>
                      {g.sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {s.schedule}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              </Field>
            </div>
            <p className="prof-copy__hint">Copying brings the assessments and the roster — never the grades.</p>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
