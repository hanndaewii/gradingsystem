// SubmitBar — sticky bottom bar for the active period (spec step 5): status,
// period grade, completeness, the D16-gated Submit button with the blocking
// reason inline, the submit ConfirmDialog, and the reopen flow for submitted
// periods.
//
// The department head (headMode) gets the sign-off instead: approve a
// submitted period, or unlock an approved one so the professor can correct it.
import { useState } from "react";
import { Button, ConfirmDialog, StatusPill } from "../../components/ui";
import { PERIOD_LABELS } from "../../types";
import type { PeriodId, PeriodProgress, PeriodStatus, Section } from "../../types";
import { formatDateTime, formatPercent, plural } from "../../lib/format";

export interface SubmitBarProps {
  section: Section;
  period: PeriodId;
  progress: PeriodProgress;
  onSubmitted(): Promise<void>;
  onReopened(): Promise<void>;
  readOnly: boolean;
  /** The department head's hat — shows approve / unlock instead of submit. */
  headMode?: boolean;
  onApproved?(): Promise<void>;
  onUnlocked?(): Promise<void>;
}

const pillTone = (status: PeriodStatus): "neutral" | "progress" | "done" | "approved" =>
  status === "approved" ? "approved" : status === "submitted" ? "done" : status === "draft" ? "progress" : "neutral";

const pillLabel = (status: PeriodStatus): string =>
  status === "approved"
    ? "Approved"
    : status === "submitted"
      ? "Submitted"
      : status === "draft"
        ? "Draft"
        : "Not started";

export function SubmitBar({
  section, period, progress, onSubmitted, onReopened, readOnly, headMode = false,
  onApproved, onUnlocked,
}: SubmitBarProps): JSX.Element {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const label = PERIOD_LABELS[period];
  const ungraded = progress.totalCells - progress.gradedCells;
  // D16 gate: complete ⇒ ≥1 assessment, ≥1 student, every cell non-null.
  const canSubmit = progress.complete;
  const gateReason =
    progress.totalCells === 0
      ? "Add at least one assessment and one student before submitting."
      : `${ungraded} of ${progress.totalCells} cells ungraded`;

  async function run(fn: () => Promise<void>): Promise<void> {
    setBusy(true);
    try {
      await fn();
      setConfirming(false);
    } catch {
      // SectionPage already toasted the reason; keep the dialog usable.
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  /** The head's view: same status line, but approve / unlock instead. */
  if (headMode) {
    return (
      <div className="sec-submitbar">
        <div className="sec-submitbar__main">
          <StatusPill tone={pillTone(progress.status)} label={pillLabel(progress.status)} />
          {progress.approvedAt ? (
            <span className="sec-submitbar__meta num" title={formatDateTime(progress.approvedAt)}>
              Approved {formatDateTime(progress.approvedAt)}
            </span>
          ) : progress.submittedAt ? (
            <span className="sec-submitbar__meta num" title={formatDateTime(progress.submittedAt)}>
              Submitted {formatDateTime(progress.submittedAt)}
            </span>
          ) : null}
          <span className="sec-submitbar__meta num">
            Period grade {progress.periodGrade == null ? "—" : formatPercent(progress.periodGrade)}
          </span>
          <span className="sec-submitbar__meta num">
            Graded {progress.gradedCells}/{progress.totalCells}
          </span>
          {progress.status === "submitted" && onApproved ? (
            <div className="sec-submitbar__submit">
              <Button variant="primary" onClick={() => setConfirming(true)} disabled={busy}>
                Approve {label}
              </Button>
            </div>
          ) : null}
          {progress.status === "approved" && onUnlocked ? (
            <div className="sec-submitbar__submit">
              <Button variant="secondary" size="sm" onClick={() => setConfirming(true)} disabled={busy}>
                Unlock for editing
              </Button>
            </div>
          ) : null}
        </div>

        {progress.status === "submitted" && onApproved ? (
          <ConfirmDialog
            open={confirming}
            title={`Approve ${label}?`}
            busy={busy}
            confirmLabel={`Approve ${label}`}
            onConfirm={() => void run(onApproved)}
            onCancel={() => (busy ? undefined : setConfirming(false))}
            body={
              <>
                <p>
                  Approving signs off {label} for <strong>{section.name}</strong>
                  {" "}({progress.gradedCells} of {progress.totalCells} cells graded ·{" "}
                  {progress.periodGrade == null ? "no average" : `${formatPercent(progress.periodGrade)} average`}).
                </p>
                <p className="sec-submitbar__note">
                  The professor cannot change an approved period. If a correction is needed you can unlock
                  it again, which sends it back to draft and is recorded in history.
                </p>
              </>
            }
          />
        ) : null}

        {progress.status === "approved" && onUnlocked ? (
          <ConfirmDialog
            open={confirming}
            title={`Unlock ${label}?`}
            busy={busy}
            confirmLabel="Unlock for editing"
            tone="danger"
            onConfirm={() => void run(onUnlocked)}
            onCancel={() => (busy ? undefined : setConfirming(false))}
            body={
              <p>
                {label} goes back to draft so the professor can correct it. Its approval is lifted — they
                submit again and you approve again, and both steps are recorded in history.
              </p>
            }
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="sec-submitbar">
      {progress.status === "submitted" || progress.status === "approved" ? (
        <div className="sec-submitbar__main">
          <StatusPill tone={pillTone(progress.status)} label={pillLabel(progress.status)} />
          <span className="sec-submitbar__meta num" title={formatDateTime(progress.submittedAt ?? "")}>
            {formatDateTime(progress.submittedAt ?? "")}
          </span>
          <span className="sec-submitbar__meta num">
            Period grade {progress.periodGrade == null ? "—" : formatPercent(progress.periodGrade)}
          </span>
          {progress.status === "submitted" && !readOnly ? (
            <Button variant="secondary" size="sm" onClick={() => setConfirming(true)} disabled={busy}>
              Reopen for editing
            </Button>
          ) : null}
          {progress.status === "approved" ? (
            <span className="sec-submitbar__meta">
              Signed off by the department head — ask them to unlock it if something needs fixing.
            </span>
          ) : null}
        </div>
      ) : (
        <div className="sec-submitbar__main">
          <StatusPill tone={pillTone(progress.status)} label={pillLabel(progress.status)} />
          <span className="sec-submitbar__meta num">
            Period grade {progress.periodGrade == null ? "—" : formatPercent(progress.periodGrade)}
          </span>
          <span className="sec-submitbar__meta num">
            Graded {progress.gradedCells}/{progress.totalCells}
          </span>
          {!readOnly ? (
            <div className="sec-submitbar__submit">
              {!canSubmit ? <span className="sec-submitbar__reason">{gateReason}</span> : null}
              <Button variant="primary" onClick={() => setConfirming(true)} disabled={!canSubmit}>
                Submit {label}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {progress.status !== "submitted" && progress.status !== "approved" ? (
        <ConfirmDialog
          open={confirming}
          title={`Submit ${label}?`}
          busy={busy}
          confirmLabel={`Submit ${label}`}
          onConfirm={() => void run(onSubmitted)}
          onCancel={() => (busy ? undefined : setConfirming(false))}
          body={
            <>
              <p>
                This locks {label} for editing. The submission is recorded in history
                {" "}({progress.gradedCells} of {progress.totalCells} cells graded ·{" "}
                {progress.periodGrade == null ? "no average" : `${formatPercent(progress.periodGrade)} average`},
                {" "}weights {section.periodWeights[period]}%).
              </p>
              <p className="sec-submitbar__note">
                Reopening later is possible and is also recorded in history.
              </p>
            </>
          }
        />
      ) : null}

      {progress.status === "submitted" && !readOnly ? (
        <ConfirmDialog
          open={confirming}
          title={`Reopen ${label}?`}
          busy={busy}
          confirmLabel="Reopen for editing"
          onConfirm={() => void run(onReopened)}
          onCancel={() => (busy ? undefined : setConfirming(false))}
          body={
            <p>
              Reopening sets {label} back to draft so scores can change again. The reopen and every
              further edit are recorded in history
              {progress.submittedAt ? ` (submitted ${formatDateTime(progress.submittedAt)}, ${plural(progress.totalCells, "cell")} total)` : ""}.
            </p>
          }
        />
      ) : null}
    </div>
  );
}
