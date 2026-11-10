// SubmitBar — sticky bottom bar for the active period (spec step 5): status,
// period grade, completeness, the D16-gated Submit button with the blocking
// reason inline, the submit ConfirmDialog, and the reopen flow for submitted
// periods. Admin (readOnly) never sees submit/reopen.
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
}

const pillTone = (status: PeriodStatus): "neutral" | "progress" | "done" =>
  status === "submitted" ? "done" : status === "draft" ? "progress" : "neutral";

const pillLabel = (status: PeriodStatus): string =>
  status === "submitted" ? "Submitted" : status === "draft" ? "Draft" : "Not started";

export function SubmitBar({ section, period, progress, onSubmitted, onReopened, readOnly }: SubmitBarProps): JSX.Element {
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

  async function runSubmit(): Promise<void> {
    setBusy(true);
    try {
      await onSubmitted();
      setConfirming(false);
    } catch {
      // SectionPage already toasted the reason; keep the dialog usable.
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  async function runReopen(): Promise<void> {
    setBusy(true);
    try {
      await onReopened();
      setConfirming(false);
    } catch {
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sec-submitbar">
      {progress.status === "submitted" ? (
        <div className="sec-submitbar__main">
          <StatusPill tone="done" label="Submitted" />
          <span className="sec-submitbar__meta num" title={formatDateTime(progress.submittedAt ?? "")}>
            {formatDateTime(progress.submittedAt ?? "")}
          </span>
          <span className="sec-submitbar__meta num">
            Period grade {progress.periodGrade == null ? "—" : formatPercent(progress.periodGrade)}
          </span>
          {!readOnly ? (
            <Button variant="secondary" size="sm" onClick={() => setConfirming(true)} disabled={busy}>
              Reopen for editing
            </Button>
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

      {progress.status !== "submitted" ? (
        <ConfirmDialog
          open={confirming}
          title={`Submit ${label}?`}
          busy={busy}
          confirmLabel={`Submit ${label}`}
          onConfirm={runSubmit}
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
          onConfirm={runReopen}
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
