// SectionPage — WO-5's page (spec steps 1–4, 15): query-state routing
// (?period=&view=, replace on change), admin readOnly, the optimistic
// useSectionData loader, the header block, and the Gradebook / Summary /
// History / Discussion views wired to the section components. All mutations
// run here (toasts + optimistic applies + reload) except the Summary editors,
// which call api and report back via onSectionChange.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Button, ConfirmDialog, EmptyState, Menu, Panel, Spinner, StatusPill, useToast,
} from "../../components/ui";
import { api } from "../../api";
import { PERIODS, PERIOD_LABELS } from "../../types";
import type { Assessment, HistoryEntry, PeriodId, Section, Student } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../lib/useAsync";
import { termLabel } from "../../lib/format";
import { exportClassRecord } from "../../lib/classRecord";
import { useSectionData, statesFromProgress, errMessage } from "../../components/section/useSectionData";
import type { SectionView } from "../../components/section/useSectionData";
import { PeriodTabs } from "../../components/section/PeriodTabs";
import { LockNotice, periodLockReason } from "../../components/section/LockNotice";
import { SubmitBar } from "../../components/section/SubmitBar";
import { SideNav } from "../../components/section/SideNav";
import { RosterTable } from "../../components/section/RosterTable";
import type { FlashTarget } from "../../components/section/RosterTable";
import { AssessmentsPanel } from "../../components/section/AssessmentsPanel";
import type { AssessmentDef } from "../../components/section/AssessmentsPanel";
import { RosterAddModal } from "../../components/section/RosterAddModal";
import { CsvImportModal } from "../../components/section/CsvImportModal";
import { SummaryPanel } from "../../components/section/SummaryPanel";
import { HistoryWidget } from "../../components/section/HistoryWidget";
import { CommentsThread } from "../../components/section/CommentsThread";
import { Celebration, createChime } from "../../components/section/Celebration";
import type { CelebrationVariant } from "../../components/section/Celebration";
import { uid } from "../../lib/id";
import "../../styles/section.css";

function parseView(raw: string | null): SectionView {
  return raw === "summary" || raw === "history" || raw === "discussion" ? raw : "gradebook";
}

function parsePeriod(raw: string | null): PeriodId | null {
  return raw === "prelim" || raw === "midterm" || raw === "semifinals" || raw === "finals" ? raw : null;
}

/** D2 default: the first non-submitted period, else prelim. */
function defaultPeriod(progress: { period: PeriodId; status: string }[]): PeriodId {
  const open = progress.find((p) => p.status !== "submitted");
  return open?.period ?? "prelim";
}

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function SectionPage(): JSX.Element {
  const { sectionId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const toast = useToast();
  const readOnly = auth.profile?.role === "admin";

  const data = useSectionData(sectionId);
  const {
    section, course, students, assessmentsByPeriod, grades, progress, history, comments,
    gradesByCell, loading, error, notFound, reload, applyGradeLocal, applySectionLocal,
    applyHistoryLocal, applyCommentLocal,
  } = data;

  const view = parseView(searchParams.get("view"));
  const period = parsePeriod(searchParams.get("period")) ?? defaultPeriod(progress);
  const states = useMemo(() => statesFromProgress(progress), [progress]);
  const periodAssessments = assessmentsByPeriod[period] ?? [];
  const activeProgress = progress.find((p) => p.period === period) ?? null;

  // Per-assessment checklist counts for the SideNav (assessmentId → students
  // with a score). Recomputed from local grades so it updates optimistically.
  const checklistCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const studentIds = new Set(students.map((s) => s.id));
    for (const g of grades) {
      if (g.score == null || !studentIds.has(g.studentRowId)) continue;
      counts[g.assessmentId] = (counts[g.assessmentId] ?? 0) + 1;
    }
    return counts;
  }, [grades, students]);

  // ── query-state routing (replace so back doesn't thrash) ──────────────────
  const updateQuery = useCallback(
    (patch: { view?: SectionView; period?: PeriodId }) => {
      const next = new URLSearchParams(searchParams);
      if (patch.view) next.set("view", patch.view);
      if (patch.period) next.set("period", patch.period);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // ── flash (history trace) ─────────────────────────────────────────────────
  const [flash, setFlash] = useState<FlashTarget | null>(null);
  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 1800);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const scrollToCell = useCallback((target: FlashTarget) => {
    window.setTimeout(() => {
      document
        .getElementById(`sec-cell-${target.assessmentId}-${target.studentRowId}`)
        ?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }, 120);
  }, []);

  const handleTrace = useCallback(
    (entry: HistoryEntry) => {
      if (entry.assessmentId == null || entry.studentRowId == null) return;
      const target: FlashTarget = {
        assessmentId: entry.assessmentId,
        studentRowId: entry.studentRowId,
        oldScore: entry.oldScore,
        newScore: entry.newScore,
      };
      setFlash(target);
      updateQuery({ view: "gradebook", period: entry.period ?? period });
      scrollToCell(target);
    },
    [updateQuery, period, scrollToCell],
  );

  const handleNavigate = useCallback(
    (target: { view: SectionView; anchor?: string | null }) => {
      updateQuery({ view: target.view });
      const anchor = target.anchor;
      if (anchor) {
        window.setTimeout(() => {
          document
            .getElementById(anchor)
            ?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
        }, 120);
      }
    },
    [updateQuery],
  );

  // ── mutation handlers (toast + optimistic apply + reload) ─────────────────
  // Autocommit: no per-cell success toast (a column of 20 entries would stack
  // 20 toasts). The optimistic apply + live footers are the feedback; failures
  // still toast and revert. WO-7 decision, recorded in the README.
  const handleCommit = useCallback(
    async (studentRowId: string, assessmentId: string, score: number | null) => {
      try {
        const grade = await api.setGrade(sectionId, assessmentId, studentRowId, score);
        applyGradeLocal(grade);
        reload();
      } catch (err) {
        toast.push({ tone: "danger", title: "Could not save the score", description: errMessage(err) });
        throw err; // RosterTable reverts the pending display
      }
    },
    [sectionId, applyGradeLocal, toast, reload],
  );

  const [removingStudent, setRemovingStudent] = useState<Student | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  async function confirmRemoveStudent(): Promise<void> {
    if (!removingStudent) return;
    setRemoveBusy(true);
    try {
      await api.removeStudent(sectionId, removingStudent.id);
      toast.push({ tone: "success", title: `${removingStudent.name} removed`, description: "Their grades were deleted." });
      setRemovingStudent(null);
      reload();
    } catch (err) {
      toast.push({ tone: "danger", title: "Could not remove the student", description: errMessage(err) });
    } finally {
      setRemoveBusy(false);
    }
  }

  const handleSaveAssessments = useCallback(
    async (defs: AssessmentDef[]) => {
      try {
        await api.setAssessments(sectionId, period, defs);
        toast.push({ tone: "success", title: "Assessments updated" });
        reload();
      } catch (err) {
        toast.push({ tone: "danger", title: "Could not update assessments", description: errMessage(err) });
        throw err;
      }
    },
    [sectionId, period, toast, reload],
  );

  const [removingAssessment, setRemovingAssessment] = useState<Assessment | null>(null);

  const removingAssessmentGradeCount = useMemo(() => {
    if (!removingAssessment) return 0;
    return grades.filter((g) => g.assessmentId === removingAssessment.id && g.score != null).length;
  }, [removingAssessment, grades]);

  async function confirmRemoveAssessment(): Promise<void> {
    if (!section || !removingAssessment) return;
    const defs = periodAssessments
      .filter((a) => a.id !== removingAssessment.id)
      .map((a) => ({ id: a.id, name: a.name, maxScore: a.maxScore, weight: a.weight }));
    try {
      await api.setAssessments(section.id, period, defs);
      toast.push({
        tone: "success",
        title: `${removingAssessment.name} removed`,
        description: `${removingAssessmentGradeCount} grades deleted with it.`,
      });
      setRemovingAssessment(null);
      reload();
    } catch (err) {
      toast.push({ tone: "danger", title: "Could not remove the assessment", description: errMessage(err) });
      setRemovingAssessment(null);
    }
  }

  const [unlocking, setUnlocking] = useState(false);
  const handleUnlock = useCallback(async () => {
    if (!section) return;
    setUnlocking(true);
    try {
      const updated = await api.updateSection(section.id, {
        unlockedPeriods: Array.from(new Set([...section.unlockedPeriods, period])),
      });
      applySectionLocal(updated);
      toast.push({ tone: "success", title: `${PERIOD_LABELS[period]} unlocked`, description: "You can grade it now." });
      reload();
    } catch (err) {
      toast.push({ tone: "danger", title: "Could not unlock the period", description: errMessage(err) });
    } finally {
      setUnlocking(false);
    }
  }, [section, period, applySectionLocal, toast, reload]);

  // ── submit / reopen (D16 gate + celebration, spec step 15) ────────────────
  const [celebration, setCelebration] = useState<{ variant: CelebrationVariant; periodLabel: string } | null>(null);

  const handleSubmitted = useCallback(async () => {
    if (!section || !auth.profile) return;
    // Predict the variant from current state so the chime's AudioContext can
    // be created synchronously inside the click handler (autoplay-safe).
    const othersSubmitted = PERIODS.every((p) => p === period || states[p]?.status === "submitted");
    const variant: CelebrationVariant = period === "finals" || othersSubmitted ? "semester" : "period";
    const chime = createChime(variant);
    try {
      await api.submitPeriod(section.id, period);
      chime?.play();
      applyHistoryLocal({
        id: uid("hist"),
        sectionId: section.id,
        kind: "submit",
        period,
        assessmentId: null,
        studentRowId: null,
        oldScore: null,
        newScore: null,
        at: new Date().toISOString(),
        actorId: auth.profile.id,
        detail: "Submitted from the section page",
      });
      toast.push({ tone: "success", title: `${PERIOD_LABELS[period]} submitted · locked for editing` });
      setCelebration({ variant, periodLabel: PERIOD_LABELS[period] });
      reload();
    } catch (err) {
      chime?.dispose();
      toast.push({ tone: "danger", title: `Could not submit ${PERIOD_LABELS[period]}`, description: errMessage(err) });
      throw err;
    }
  }, [section, auth.profile, period, states, applyHistoryLocal, toast, reload]);

  const handleReopened = useCallback(async () => {
    if (!section || !auth.profile) return;
    try {
      await api.reopenPeriod(section.id, period);
      applyHistoryLocal({
        id: uid("hist"),
        sectionId: section.id,
        kind: "reopen",
        period,
        assessmentId: null,
        studentRowId: null,
        oldScore: null,
        newScore: null,
        at: new Date().toISOString(),
        actorId: auth.profile.id,
        detail: "Reopened for editing",
      });
      toast.push({ tone: "info", title: `${PERIOD_LABELS[period]} reopened — grade edits are recorded in history` });
      reload();
    } catch (err) {
      toast.push({ tone: "danger", title: `Could not reopen ${PERIOD_LABELS[period]}`, description: errMessage(err) });
      throw err;
    }
  }, [section, auth.profile, period, applyHistoryLocal, toast, reload]);

  const handlePostComment = useCallback(
    async (input: { period: PeriodId | null; body: string }) => {
      const comment = await api.comment(sectionId, input);
      applyCommentLocal(comment);
      toast.push({ tone: "success", title: "Comment posted" });
      reload();
    },
    [sectionId, applyCommentLocal, toast, reload],
  );

  // ── roster/CSV modals ──────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  const handleAddStudents = useCallback(
    async (rows: { name: string; studentNo?: string }[]) => {
      try {
        const res = await api.addStudents(sectionId, rows);
        toast.push({
          tone: "success",
          title: `${res.added} ${res.added === 1 ? "student" : "students"} added`,
          description:
            res.duplicates.length > 0 ? `Skipped: ${res.duplicates.slice(0, 5).join(", ")}${res.duplicates.length > 5 ? "…" : ""}` : undefined,
        });
        reload();
      } catch (err) {
        toast.push({ tone: "danger", title: "Could not add the students", description: errMessage(err) });
        throw err;
      }
    },
    [sectionId, toast, reload],
  );

  const handleImport = useCallback(
    async (rows: { studentKey: string; scores: Record<string, number | null> }[]) => {
      try {
        const res = await api.importCsv(sectionId, period, rows);
        toast.push({
          tone: res.skipped > 0 ? "info" : "success",
          title: `Imported · ${res.applied} applied, ${res.skipped} skipped`,
        });
        reload();
        return res;
      } catch (err) {
        toast.push({ tone: "danger", title: "The import failed", description: errMessage(err) });
        throw err;
      }
    },
    [sectionId, period, toast, reload],
  );

  // ── admin: professor name via the term overview ───────────────────────────
  const courseTermKey = course ? `${course.academicYear}:${course.semester}` : "";
  const professorNameAsync = useAsync(
    async () => {
      if (!readOnly || !course) return null;
      const overview = await api.getTermOverview({ academicYear: course.academicYear, semester: course.semester });
      return overview.find((o) => o.section.id === sectionId)?.professorName ?? null;
    },
    [readOnly, courseTermKey, sectionId],
  );

  // ── loading / error / not-found ────────────────────────────────────────────
  if (error) {
    return (
      <div className="sec-page">
        <EmptyState
          title="Could not load this section"
          body={errMessage(error)}
          action={
            <Button variant="primary" onClick={reload}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  function handleExportClassRecord(): void {
    if (course === null || section === null) return;
    exportClassRecord({
      course,
      section,
      period,
      students,
      assessments: periodAssessments,
      grades,
    });
  }

  if (notFound) {
    return (
      <div className="sec-page">
        <EmptyState
          title={readOnly ? "Section not found" : "Not your section"}
          body={
            readOnly
              ? "This section does not exist (or was removed)."
              : "This section does not exist, or it belongs to another professor."
          }
          action={
            <Link to="/" className="sec-link num">
              Back home
            </Link>
          }
        />
      </div>
    );
  }

  if (loading || !section || !course || !auth.profile) {
    return (
      <div className="sec-page sec-page--loading">
        <Spinner label="Loading the section…" />
      </div>
    );
  }

  // ── lock notice (safe here: section data confirmed) ────────────────────────
  const submitted = states[period]?.status === "submitted";
  const orderReason = periodLockReason(states, period, section);
  const lockMessage = submitted
    ? `${PERIOD_LABELS[period]} is submitted — locked for editing.`
    : orderReason;
  const csvDisabledReason = submitted
    ? "Reopen the period to import scores."
    : orderReason;

  const scaleLabel = section.displayScale === "scale5" ? "1.00–5.00 scale" : "percent + letter";
  const semesterComplete = progress.length === PERIODS.length && progress.every((p) => p.status === "submitted");

  return (
    <div className="sec-page">
      <header className="sec-header">
        <div className="sec-header__main">
          <div>
            <Link
              className="sec-header__crumb sec-header__crumb--link mono-label"
              to={readOnly ? "/" : `/courses/${course.id}`}
              title={readOnly ? "Back to department review" : `Back to ${course.code}`}
            >
              {readOnly ? (
                <>← Department review · {termLabel({ academicYear: course.academicYear, semester: course.semester })}</>
              ) : (
                <>{course.code} · {course.title} · {termLabel({ academicYear: course.academicYear, semester: course.semester })}</>
              )}
            </Link>
            <h1 className="sec-header__title">
              {course.code} · {section.name}
            </h1>
            <p className="sec-header__meta num">
              {section.schedule}
              {section.room ? ` · ${section.room}` : ""} · {scaleLabel} · {students.length}{" "}
              {students.length === 1 ? "student" : "students"}
              {readOnly && professorNameAsync.data ? ` · ${professorNameAsync.data}` : ""}
            </p>
          </div>
          <div className="sec-header__end">
            {semesterComplete ? (
              <StatusPill tone="done" label="Semester complete" />
            ) : null}
            {!readOnly ? (
              <Menu
                ariaLabel="Section actions"
                items={[
                  {
                    key: "edit",
                    label: "Edit details",
                    onSelect: () => navigate(`/courses/${course.id}`),
                  },
                ]}
              />
            ) : null}
          </div>
        </div>
      </header>

      <div className="sec-layout">
        <SideNav
          view={view}
          period={period}
          assessments={periodAssessments}
          progress={progress}
          onNavigate={handleNavigate}
          gradedCounts={checklistCounts}
          studentCount={students.length}
        />

        <div className="sec-content">
          {view === "gradebook" ? (
            <>
              <PeriodTabs section={section} progress={progress} period={period} onChange={(p) => updateQuery({ period: p })} />
              {lockMessage ? (
                <LockNotice
                  message={lockMessage}
                  action={
                    !readOnly && !submitted && orderReason != null ? (
                      <Button size="sm" variant="secondary" loading={unlocking} disabled={unlocking} onClick={() => void handleUnlock()}>
                        Unlock this period
                      </Button>
                    ) : undefined
                  }
                />
              ) : null}

              <div id="sec-roster" className="sec-anchor">
                <Panel
                  label="Roster"
                  actions={
                    <span className="sec-panelactions">
                      <Button size="sm" variant="secondary" onClick={handleExportClassRecord}>
                        Export .xlsx
                      </Button>
                      {!readOnly ? (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
                            Add students
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setCsvOpen(true)}
                            disabled={csvDisabledReason != null}
                            title={csvDisabledReason ?? `Import scores for ${PERIOD_LABELS[period]}`}
                          >
                            Import CSV
                          </Button>
                        </>
                      ) : null}
                    </span>
                  }
                >
                  <RosterTable
                    students={students}
                    assessments={periodAssessments}
                    gradesByCell={gradesByCell}
                    readOnly={readOnly}
                    flash={flash}
                    onCommit={handleCommit}
                    onRemove={setRemovingStudent}
                    onAddStudents={() => setAddOpen(true)}
                    section={section}
                    period={period}
                    assessmentsByPeriod={assessmentsByPeriod}
                    states={states}
                  />
                </Panel>
              </div>

              <div id="sec-assessments" className="sec-anchor">
                <Panel label={`Assessments · ${PERIOD_LABELS[period]}`}>
                  <AssessmentsPanel
                    section={section}
                    period={period}
                    assessments={periodAssessments}
                    readOnly={readOnly}
                    locked={submitted}
                    onSave={handleSaveAssessments}
                    onRemove={setRemovingAssessment}
                    onToggleUnlock={() => void handleUnlock()}
                    orderLockReason={submitted ? null : orderReason}
                  />
                </Panel>
              </div>

              {activeProgress ? (
                <SubmitBar
                  section={section}
                  period={period}
                  progress={activeProgress}
                  onSubmitted={handleSubmitted}
                  onReopened={handleReopened}
                  readOnly={readOnly}
                />
              ) : null}
            </>
          ) : null}

          {view === "summary" ? (
            <SummaryPanel
              section={section}
              students={students}
              assessmentsByPeriod={assessmentsByPeriod}
              grades={grades}
              progress={progress}
              readOnly={readOnly}
              onSectionChange={(updated: Section) => {
                applySectionLocal(updated);
                reload();
              }}
            />
          ) : null}

          {view === "history" ? (
            <HistoryWidget
              entries={history}
              onTrace={handleTrace}
              cellExists={(e) => {
                const aid = e.assessmentId;
                const sid = e.studentRowId;
                const assessmentOk =
                  aid != null && PERIODS.some((p) => (assessmentsByPeriod[p] ?? []).some((a) => a.id === aid));
                const studentOk = sid != null && students.some((s) => s.id === sid);
                return assessmentOk && studentOk;
              }}
            />
          ) : null}


          {view === "discussion" ? (
            <CommentsThread
              comments={comments}
              readOnly={readOnly}
              currentUser={auth.profile}
              onPost={handlePostComment}
            />
          ) : null}
        </div>
      </div>

      <RosterAddModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        existing={students}
        onSubmit={handleAddStudents}
      />

      <CsvImportModal
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        period={period}
        assessments={periodAssessments}
        onImport={handleImport}
      />

      <ConfirmDialog
        open={removingStudent != null}
        title="Remove student?"
        tone="danger"
        busy={removeBusy}
        confirmLabel="Remove student"
        onConfirm={() => void confirmRemoveStudent()}
        onCancel={() => (removeBusy ? undefined : setRemovingStudent(null))}
        body={
          removingStudent ? (
            <p>
              Remove <strong>{removingStudent.name}</strong> ({removingStudent.studentNo})? Their{" "}
              {grades.filter((g) => g.studentRowId === removingStudent.id && g.score != null).length} recorded grades are
              deleted. This cannot be undone.
            </p>
          ) : null
        }
      />

      <ConfirmDialog
        open={removingAssessment != null}
        title="Remove assessment?"
        tone="danger"
        confirmLabel="Remove assessment"
        onConfirm={() => void confirmRemoveAssessment()}
        onCancel={() => setRemovingAssessment(null)}
        body={
          removingAssessment ? (
            <p>
              This assessment has {removingAssessmentGradeCount} grades. Removing it deletes them.
            </p>
          ) : null
        }
      />

      {celebration ? (
        <Celebration variant={celebration.variant} periodLabel={celebration.periodLabel} onDone={() => setCelebration(null)} />
      ) : null}
    </div>
  );
}
