// ProfessorHome (WO-4) — the professor's landing page:
//   1. Hero ("continue grading"): a draft period with the newest
//      lastGradeUpdateAt, else the first editable non-submitted period
//      (sections ordered by course code then section name), else an
//      all-submitted state.
//   2. "Submitted this week" — every period submitted within the last
//      7 days (D9) for the selected term.
//   3. Course grid — one card per course of the selected term with
//      per-section ProgressSegments (§3.7 mapping) + StatusPill summary.
// All data via api + useAsync; the term comes from useTerm().
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useTerm } from "../../context/TermContext";
import { isPeriodEditable } from "../../lib/grades";
import { formatDateTime, isWithinLastDays, plural, termLabel } from "../../lib/format";
import { useAsync } from "../../lib/useAsync";
import { PERIOD_LABELS } from "../../types";
import type { Course, DeleteImpact, PeriodId, PeriodProgress, PeriodState, SectionOverview } from "../../types";
import { Button, ConfirmDialog, EmptyState, Panel, Spinner, useToast } from "../../components/ui";
import CourseCard from "../../components/courses/CourseCard";
import CourseFormModal from "../../components/courses/CourseFormModal";
import SectionFormModal from "../../components/courses/SectionFormModal";
import "../../styles/professor.css";

type Hero = { kind: "grade"; sectionId: string; period: PeriodId; code: string; sectionName: string } | { kind: "done" };

/** Period states keyed by period — what isPeriodEditable consumes. */
function statesOf(periods: PeriodProgress[]): Record<PeriodId, PeriodState> {
  const out = {} as Record<PeriodId, PeriodState>;
  for (const p of periods) out[p.period] = { status: p.status, submittedAt: p.submittedAt };
  return out;
}

/** D-hero rule: (1) newest draft by lastGradeUpdateAt; (2) else the first
 *  editable non-submitted period (rows arrive ordered by course code then
 *  section name); (3) else everything is submitted. Null = no sections. */
function computeHero(rows: SectionOverview[]): Hero | null {
  let best: { row: SectionOverview; period: PeriodProgress } | null = null;
  for (const row of rows) {
    for (const period of row.periods) {
      if (period.status !== "draft") continue;
      if (best === null || (period.lastGradeUpdateAt ?? "") > (best.period.lastGradeUpdateAt ?? "")) {
        best = { row, period };
      }
    }
  }
  if (best !== null) {
    return {
      kind: "grade",
      sectionId: best.row.section.id,
      period: best.period.period,
      code: best.row.course.code,
      sectionName: best.row.section.name,
    };
  }
  for (const row of rows) {
    const states = statesOf(row.periods);
    for (const period of row.periods) {
      if (period.status === "submitted") continue;
      if (isPeriodEditable({ section: row.section, states, period: period.period })) {
        return {
          kind: "grade",
          sectionId: row.section.id,
          period: period.period,
          code: row.course.code,
          sectionName: row.section.name,
        };
      }
    }
  }
  return rows.length > 0 ? { kind: "done" } : null;
}

export default function ProfessorHome(): JSX.Element {
  const { term } = useTerm();
  const toast = useToast();
  const navigate = useNavigate();

  const coursesQ = useAsync(() => api.listCourses(term), [term.academicYear, term.semester]);
  const overviewQ = useAsync(() => api.getTermOverview(term), [term.academicYear, term.semester]);

  const [courseModal, setCourseModal] = useState<{ mode: "create" } | { mode: "edit"; course: Course } | null>(null);
  const [sectionCourse, setSectionCourse] = useState<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [impact, setImpact] = useState<DeleteImpact | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const impactReqRef = useRef(0);

  const coursesData = coursesQ.data;
  const overviewData = overviewQ.data;

  const hero = useMemo<Hero | null>(() => (overviewData === null ? null : computeHero(overviewData)), [overviewData]);
  const heroKey = hero !== null && hero.kind === "grade" ? `${hero.sectionId}:${hero.period}` : "";

  // How many students are fully graded in the hero period (the overview
  // only carries cell counts). Re-runs whenever the overview refreshes.
  const heroDetail = useAsync(async () => {
    if (hero === null || hero.kind !== "grade") return null;
    const [students, assessments, grades] = await Promise.all([
      api.listStudents(hero.sectionId),
      api.listAssessments(hero.sectionId, hero.period),
      api.listGrades(hero.sectionId),
    ]);
    const assessmentIds = assessments.map((a) => a.id);
    const idSet = new Set(assessmentIds);
    const gradedByStudent = new Map<string, Set<string>>();
    for (const g of grades) {
      if (g.score == null || !idSet.has(g.assessmentId)) continue;
      let seen = gradedByStudent.get(g.studentRowId);
      if (!seen) {
        seen = new Set<string>();
        gradedByStudent.set(g.studentRowId, seen);
      }
      seen.add(g.assessmentId);
    }
    let fully = 0;
    for (const s of students) {
      const seen = gradedByStudent.get(s.id);
      if (seen !== undefined && assessmentIds.every((id) => seen.has(id))) fully += 1;
    }
    return { fully, total: students.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroKey, overviewData]);

  const weekRows = useMemo(() => {
    const rows: { key: string; sectionId: string; code: string; sectionName: string; period: PeriodId; submittedAt: string }[] = [];
    for (const row of overviewData ?? []) {
      for (const p of row.periods) {
        if (p.submittedAt !== null && isWithinLastDays(p.submittedAt, 7)) {
          rows.push({
            key: `${row.section.id}:${p.period}`,
            sectionId: row.section.id,
            code: row.course.code,
            sectionName: row.section.name,
            period: p.period,
            submittedAt: p.submittedAt,
          });
        }
      }
    }
    return rows.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [overviewData]);

  const byCourse = useMemo(() => {
    const map = new Map<string, SectionOverview[]>();
    for (const row of overviewData ?? []) {
      const list = map.get(row.course.id);
      if (list !== undefined) list.push(row);
      else map.set(row.course.id, [row]);
    }
    return map;
  }, [overviewData]);

  function askDeleteCourse(course: Course): void {
    setDeleteTarget(course);
    setImpact(null);
    const req = ++impactReqRef.current;
    api
      .getDeleteImpact("course", course.id)
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
      await api.deleteCourse(target.id);
      toast.push({ title: `Deleted ${target.code}.`, tone: "success" });
      setDeleteTarget(null);
      coursesQ.reload();
      overviewQ.reload();
    } catch (err: unknown) {
      toast.push({
        title: "Could not delete the course.",
        description: err instanceof Error ? err.message : undefined,
        tone: "danger",
      });
    } finally {
      setDeleteBusy(false);
      setImpact(null);
    }
  }

  function reloadAll(): void {
    coursesQ.reload();
    overviewQ.reload();
  }

  if (coursesData === null || overviewData === null) {
    const err = coursesQ.error ?? overviewQ.error;
    if (!coursesQ.loading && !overviewQ.loading && err !== null) {
      return <EmptyState title="Could not load your courses." body={err.message} />;
    }
    return (
      <div className="prof-loading">
        <Spinner label="Loading your courses…" />
      </div>
    );
  }

  return (
    <div className="prof-home">
      {hero !== null ? (
        <section className="prof-hero">
          <span className="prof-hero__eyebrow mono-label">{hero.kind === "done" ? "All submitted" : "Continue grading"}</span>
          {hero.kind === "done" ? (
            <>
              <h1 className="prof-hero__title">All caught up</h1>
              <p className="prof-hero__meta num">Every period for {termLabel(term)} is submitted.</p>
            </>
          ) : (
            <>
              <h1 className="prof-hero__title">
                {hero.code} · {hero.sectionName}
              </h1>
              <p className="prof-hero__meta num">
                {PERIOD_LABELS[hero.period]}
                {heroDetail.data !== null
                  ? heroDetail.data.total === 0
                    ? " — no students yet"
                    : ` — ${heroDetail.data.fully} of ${heroDetail.data.total} ${plural(heroDetail.data.total, "student")} graded`
                  : " — …"}
              </p>
              <div className="prof-hero__actions">
                <Button
                  variant="primary"
                  onClick={() => navigate(`/sections/${hero.sectionId}?period=${hero.period}`)}
                >
                  Continue grading
                </Button>
              </div>
            </>
          )}
        </section>
      ) : null}

      {overviewData.length > 0 ? (
        <Panel label="Submitted this week">
          {weekRows.length === 0 ? (
            <p className="prof-week__empty num">Nothing submitted in the last 7 days.</p>
          ) : (
            <div className="prof-week">
              {weekRows.map((row) => (
                <Link key={row.key} className="prof-week__row" to={`/sections/${row.sectionId}?period=${row.period}`}>
                  <span className="prof-week__course">
                    {row.code} · {row.sectionName}
                  </span>
                  <span className="mono-label">{PERIOD_LABELS[row.period]}</span>
                  <span className="prof-week__time num">{formatDateTime(row.submittedAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      ) : null}

      {coursesData.length === 0 ? (
        <EmptyState
          title="No courses this semester"
          body={`Nothing yet for ${termLabel(term)}.`}
          action={
            <Button variant="primary" onClick={() => setCourseModal({ mode: "create" })}>
              Add your first course
            </Button>
          }
        />
      ) : (
        <Panel
          label={`Courses · ${termLabel(term)}`}
          actions={
            <Button size="sm" onClick={() => setCourseModal({ mode: "create" })}>
              Add course
            </Button>
          }
        >
          <div className="prof-grid">
            {coursesData.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                sections={byCourse.get(course.id) ?? []}
                onAddSection={() => setSectionCourse(course)}
                onEditCourse={() => setCourseModal({ mode: "edit", course })}
                onDeleteCourse={() => askDeleteCourse(course)}
              />
            ))}
          </div>
        </Panel>
      )}

      <CourseFormModal
        open={courseModal !== null}
        onClose={() => setCourseModal(null)}
        course={courseModal !== null && courseModal.mode === "edit" ? courseModal.course : null}
        defaultTerm={term}
        onSaved={() => {
          setCourseModal(null);
          reloadAll();
        }}
      />

      <SectionFormModal
        open={sectionCourse !== null}
        onClose={() => setSectionCourse(null)}
        course={sectionCourse}
        currentTerm={term}
        onSaved={() => {
          setSectionCourse(null);
          overviewQ.reload();
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget !== null ? `Delete ${deleteTarget.code}?` : "Delete course?"}
        tone="danger"
        confirmLabel="Delete course"
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
