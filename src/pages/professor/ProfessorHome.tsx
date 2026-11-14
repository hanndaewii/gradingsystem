// ProfessorHome (WO-4) — the professor's landing page:
//   1. Hero ("continue grading"): the top of a grading QUEUE — periods that
//      actually have something to grade (students + assessments, not
//      submitted, editable), ranked by newest draft activity, then course/
//      section/period order. Sections with no students or no assessments are
//      skipped; the next few candidates are listed under the hero.
//   2. "Submitted this week" — every period submitted within the last
//      7 days (D9) for the selected term.
//   3. Course grid — one card per course of the selected term with
//      per-section ProgressSegments (§3.7 mapping) + StatusPill summary.
// All data via api + useAsync; the term comes from useTerm().
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useTerm } from "../../context/TermContext";
import { isFinalStatus, isPeriodEditable } from "../../lib/grades";
import { formatDateTime, isWithinLastDays, plural, termLabel } from "../../lib/format";
import { useAsync } from "../../lib/useAsync";
import { PERIOD_LABELS } from "../../types";
import type { Course, DeleteImpact, PeriodId, PeriodProgress, PeriodState, PeriodStatus, SectionOverview } from "../../types";
import { Button, ConfirmDialog, EmptyState, Panel, Spinner, useToast } from "../../components/ui";
import CourseCard from "../../components/courses/CourseCard";
import CourseFormModal from "../../components/courses/CourseFormModal";
import SectionFormModal from "../../components/courses/SectionFormModal";
import "../../styles/professor.css";

type QueueItem = {
  sectionId: string;
  period: PeriodId;
  code: string;
  sectionName: string;
  status: PeriodStatus;
  graded: number;
  total: number;
};

type Hero =
  | { kind: "grade"; item: QueueItem }
  | { kind: "done" }
  | { kind: "stuck" };

/** Period states keyed by period — what isPeriodEditable consumes. */
function statesOf(periods: PeriodProgress[]): Record<PeriodId, PeriodState> {
  const out = {} as Record<PeriodId, PeriodState>;
  for (const p of periods) out[p.period] = { status: p.status, submittedAt: p.submittedAt };
  return out;
}

/**
 * The grading queue, most-urgent first. A period only enters the queue when
 * there is something to grade: the section has students (studentCount > 0),
 * the period has assessments (totalCells > 0), it is not submitted and it is
 * editable. Rank: drafts with recent grade activity (lastGradeUpdateAt desc),
 * then the remaining editable periods in course/section/period order.
 */
function computeQueue(rows: SectionOverview[]): QueueItem[] {
  const recent: { item: QueueItem; at: string }[] = [];
  const rest: QueueItem[] = [];
  for (const row of rows) {
    if (row.studentCount === 0) continue; // no roster → nothing to grade
    const states = statesOf(row.periods);
    for (const period of row.periods) {
      if (isFinalStatus(period.status)) continue;  // submitted, or approved by the head
      if (period.totalCells === 0) continue; // no assessments (or no students)
      if (!isPeriodEditable({ section: row.section, states, period: period.period })) continue;
      const item: QueueItem = {
        sectionId: row.section.id,
        period: period.period,
        code: row.course.code,
        sectionName: row.section.name,
        status: period.status,
        graded: period.gradedCells,
        total: period.totalCells,
      };
      if (period.status === "draft" && period.lastGradeUpdateAt !== null) {
        recent.push({ item, at: period.lastGradeUpdateAt });
      } else {
        rest.push(item);
      }
    }
  }
  recent.sort((a, b) => b.at.localeCompare(a.at));
  return [...recent.map((r) => r.item), ...rest];
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

  const queue = useMemo<QueueItem[]>(() => (overviewData === null ? [] : computeQueue(overviewData)), [overviewData]);
  const hero = useMemo<Hero | null>(() => {
    if (overviewData === null) return null;
    if (overviewData.length === 0) return null;
    if (queue.length > 0) return { kind: "grade", item: queue[0] };
    // Nothing gradable: "all submitted" when every period is submitted,
    // otherwise sections exist but have no students/assessments yet.
    const allSubmitted = overviewData.every((row) => row.periods.every((p) => isFinalStatus(p.status)));
    return allSubmitted ? { kind: "done" } : { kind: "stuck" };
  }, [overviewData, queue]);
  // "Also waiting" caps at four rows; "+N more waiting" expands to the rest.
  const [queueExpanded, setQueueExpanded] = useState(false);
  const waiting = useMemo(() => (queueExpanded ? queue.slice(1) : queue.slice(1, 5)), [queue, queueExpanded]);
  const extraWaiting = Math.max(0, queue.length - 5);
  const heroKey = hero !== null && hero.kind === "grade" ? `${hero.item.sectionId}:${hero.item.period}` : "";

  // How many students are fully graded in the hero period (the overview
  // only carries cell counts). Re-runs whenever the overview refreshes.
  const heroDetail = useAsync(async () => {
    if (hero === null || hero.kind !== "grade") return null;
    const [students, assessments, grades] = await Promise.all([
      api.listStudents(hero.item.sectionId),
      api.listAssessments(hero.item.sectionId, hero.item.period),
      api.listGrades(hero.item.sectionId),
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
          <span className="prof-hero__eyebrow mono-label">
            {hero.kind === "grade" ? "Continue grading" : hero.kind === "done" ? "All submitted" : "Up next"}
          </span>
          {hero.kind === "grade" ? (
            <>
              <h1 className="prof-hero__title">
                {hero.item.code} · {hero.item.sectionName}
              </h1>
              <p className="prof-hero__meta num">
                {PERIOD_LABELS[hero.item.period]}
                {heroDetail.data !== null
                  ? ` — ${heroDetail.data.fully} of ${heroDetail.data.total} ${plural(heroDetail.data.total, "student")} graded`
                  : ` — ${hero.item.graded} of ${hero.item.total} entries graded`}
              </p>
              <div className="prof-hero__actions">
                <Button
                  variant="primary"
                  onClick={() => navigate(`/sections/${hero.item.sectionId}?period=${hero.item.period}`)}
                >
                  Continue grading
                </Button>
              </div>
              {waiting.length > 0 ? (
                <div className="prof-hero__waiting">
                  <p className="mono-label">Also waiting</p>
                  {waiting.map((w) => (
                    <Link
                      key={`${w.sectionId}:${w.period}`}
                      className="prof-hero__waitingrow"
                      to={`/sections/${w.sectionId}?period=${w.period}`}
                    >
                      <span className="prof-hero__waitingcourse">
                        {w.code} · {w.sectionName}
                      </span>
                      <span className="mono-label">{PERIOD_LABELS[w.period]}</span>
                      <span className="prof-hero__waitingmeta num">
                        {w.status === "draft" ? "Draft" : "Not started"} · {w.graded}/{w.total}
                      </span>
                    </Link>
                  ))}
                  {extraWaiting > 0 ? (
                    <button
                      type="button"
                      className="prof-hero__more prof-hero__more--toggle num"
                      aria-expanded={queueExpanded}
                      onClick={() => setQueueExpanded((v) => !v)}
                    >
                      {queueExpanded ? "− Show less" : `+${extraWaiting} more waiting`}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : hero.kind === "done" ? (
            <>
              <h1 className="prof-hero__title">All caught up</h1>
              <p className="prof-hero__meta num">Every period for {termLabel(term)} is submitted.</p>
            </>
          ) : (
            <>
              <h1 className="prof-hero__title">Nothing ready to grade</h1>
              <p className="prof-hero__meta">
                Grading opens once a section has students and assessments — add them from a course card below.
              </p>
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
