// CoursePage (WO-4) — course details header (code + title serif, term,
// professor), breadcrumb, Edit/Delete course, and the section list as
// SectionRow rows (progress + per-period pills + class average + per-section
// Menu). Section create/edit/delete lives ONLY here (D17). Unknown or
// foreign course ids → "Course not found". All data via api + useAsync;
// per-section rows come from getTermOverview for the selected term.
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useTerm } from "../../context/TermContext";
import { plural, termLabel } from "../../lib/format";
import { useAsync } from "../../lib/useAsync";
import type { Course, DeleteImpact, Section, SectionOverview } from "../../types";
import { Button, ConfirmDialog, EmptyState, Spinner, useToast } from "../../components/ui";
import CourseFormModal from "../../components/courses/CourseFormModal";
import SectionFormModal from "../../components/courses/SectionFormModal";
import SectionRow from "../../components/courses/SectionRow";
import "../../styles/professor.css";

type DeleteTarget = { kind: "course"; course: Course } | { kind: "section"; row: SectionOverview };

export default function CoursePage(): JSX.Element {
  const { courseId = "" } = useParams<{ courseId: string }>();
  const { term } = useTerm();
  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const courseQ = useAsync(() => api.getCourse(courseId), [courseId]);
  const courseData = courseQ.data;

  // Sections always come from the viewed course's OWN term — a course opened
  // directly from another AY still lists its sections (the header term must
  // not blank the list). Falls back to the header term until the course loads.
  const overviewTerm = courseData ?? term;
  const overviewQ = useAsync(
    () =>
      api.getTermOverview({
        academicYear: overviewTerm.academicYear,
        semester: overviewTerm.semester,
      }),
    [overviewTerm.academicYear, overviewTerm.semester],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [editSection, setEditSection] = useState<Section | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [impact, setImpact] = useState<DeleteImpact | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const impactReqRef = useRef(0);

  const rows = useMemo(
    () => (overviewQ.data ?? []).filter((r) => r.course.id === courseId),
    [overviewQ.data, courseId],
  );

  function askDelete(target: DeleteTarget): void {
    setDeleteTarget(target);
    setImpact(null);
    const req = ++impactReqRef.current;
    api
      .getDeleteImpact(target.kind, target.kind === "course" ? target.course.id : target.row.section.id)
      .then((imp) => {
        if (impactReqRef.current === req) setImpact(imp);
      })
      .catch(() => {
        if (impactReqRef.current === req) setImpact(null);
      });
  }

  async function confirmDelete(): Promise<void> {
    const target = deleteTarget;
    if (target === null) return;
    setDeleteBusy(true);
    try {
      if (target.kind === "course") {
        await api.deleteCourse(target.course.id);
        toast.push({ title: `Deleted ${target.course.code}.`, tone: "success" });
        setDeleteTarget(null);
        navigate("/", { replace: true });
      } else {
        await api.deleteSection(target.row.section.id);
        toast.push({ title: `Deleted ${target.row.section.name}.`, tone: "success" });
        setDeleteTarget(null);
        overviewQ.reload();
      }
    } catch (err: unknown) {
      toast.push({
        title: "Could not delete.",
        description: err instanceof Error ? err.message : undefined,
        tone: "danger",
      });
    } finally {
      setDeleteBusy(false);
      setImpact(null);
    }
  }

  if (courseQ.loading && courseData === null) {
    return (
      <div className="prof-loading">
        <Spinner label="Loading the course…" />
      </div>
    );
  }

  if (courseData === null) {
    return (
      <EmptyState
        title="Course not found"
        body={courseQ.error !== null ? courseQ.error.message : "This course does not exist or belongs to another professor."}
        action={
          <Link className="prof-link" to="/">
            Back to courses
          </Link>
        }
      />
    );
  }

  const confirmTitle =
    deleteTarget === null ? "Delete" : deleteTarget.kind === "course" ? `Delete ${deleteTarget.course.code}?` : `Delete ${deleteTarget.row.section.name}?`;

  return (
    <div className="prof-course">
      <nav className="prof-course__breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Courses</Link>
        <span aria-hidden="true">/</span>
        <span className="num" aria-current="page">
          {courseData.code}
        </span>
      </nav>

      <header className="prof-course__head">
        <div className="prof-course__names">
          <h1 className="prof-course__title">
            <span className="num">{courseData.code}</span> · {courseData.title}
          </h1>
          <p className="prof-course__meta num">
            {termLabel({ academicYear: courseData.academicYear, semester: courseData.semester })} · {auth.profile?.name ?? "—"} ·{" "}
            {plural(rows.length, "section")}
          </p>
        </div>
        <div className="prof-course__actions">
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            Add section
          </Button>
          <Button onClick={() => setEditCourseOpen(true)}>Edit course</Button>
          <Button variant="danger" onClick={() => askDelete({ kind: "course", course: courseData })}>
            Delete course
          </Button>
        </div>
      </header>

      {overviewQ.data === null ? (
        overviewQ.loading ? (
          <div className="prof-loading">
            <Spinner label="Loading sections…" />
          </div>
        ) : (
          <EmptyState title="Could not load the sections." body={overviewQ.error?.message ?? "Please try again."} />
        )
      ) : rows.length === 0 ? (
        <EmptyState
          title="No sections yet"
          body="Add the first section to start grading."
          action={
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              Add section
            </Button>
          }
        />
      ) : (
        <div className="prof-rows">
          {rows.map((row) => (
            <SectionRow
              key={row.section.id}
              overview={row}
              onEdit={() => setEditSection(row.section)}
              onDelete={() => askDelete({ kind: "section", row })}
            />
          ))}
        </div>
      )}

      <SectionFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        course={courseData}
        currentTerm={term}
        onSaved={() => {
          setCreateOpen(false);
          overviewQ.reload();
        }}
      />

      <SectionFormModal
        open={editSection !== null}
        onClose={() => setEditSection(null)}
        section={editSection}
        currentTerm={term}
        onSaved={() => {
          setEditSection(null);
          overviewQ.reload();
        }}
      />

      <CourseFormModal
        open={editCourseOpen}
        onClose={() => setEditCourseOpen(false)}
        course={courseData}
        onSaved={() => {
          setEditCourseOpen(false);
          courseQ.reload();
          overviewQ.reload();
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={confirmTitle}
        tone="danger"
        confirmLabel={deleteTarget !== null && deleteTarget.kind === "course" ? "Delete course" : "Delete section"}
        busy={deleteBusy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          setDeleteTarget(null);
          setImpact(null);
        }}
        body={
          impact === null ? (
            <p className="prof-delete-pending num">Counting what this deletes…</p>
          ) : (
            <p>
              This deletes{" "}
              <span className="prof-counts num">
                {impact.sections} {plural(impact.sections, "section")}, {impact.students} {plural(impact.students, "student")} and{" "}
                {impact.grades} {plural(impact.grades, "grade")}
              </span>
              . This cannot be undone.
            </p>
          )
        }
      />
    </div>
  );
}
