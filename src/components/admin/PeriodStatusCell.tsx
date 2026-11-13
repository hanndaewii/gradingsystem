// PeriodStatusCell (WO-6) — one admin table cell per grading period.
// StatusPill tone per spec §3.7 mapping (submitted → done, draft →
// progress, not_started → neutral); drafts add a mono graded/total
// count, submitted periods add a relative-day line. The pill's built-in
// gold tick is the only gold in the table. `title` carries full detail.
import { StatusPill } from "../ui";
import type { PeriodProgress, PeriodStatus } from "../../types";
import { PERIOD_LABELS } from "../../types";
import { formatPercent, formatDateTime, relativeDay } from "../../lib/format";

const PILL_LABEL: Record<PeriodStatus, string> = {
  approved: "Approved",
  submitted: "Submitted",
  draft: "Draft",
  not_started: "Not started",
};

function toneFor(status: PeriodStatus): "neutral" | "progress" | "done" | "approved" {
  if (status === "approved") return "approved";
  return status === "submitted" ? "done" : status === "draft" ? "progress" : "neutral";
}

/** The date a period's window closes — a period past it is overdue. */
function windowEnd(progress: PeriodProgress): string | null {
  return progress.overdue === true ? progress.endedAt ?? null : null;
}

export function PeriodStatusCell({ progress }: { progress: PeriodProgress }): JSX.Element {
  const { period, status, submittedAt, gradedCells, totalCells, periodGrade } = progress;
  const overdue = progress.overdue === true;
  const pillLabel = overdue ? "Overdue" : PILL_LABEL[status];
  const tone = overdue ? "late" : toneFor(status);
  const label = `${PERIOD_LABELS[period]} — ${pillLabel}`;

  let title = label;
  let detail: string | null = null;
  if (overdue) {
    const ended = windowEnd(progress);
    title = ended
      ? `${label} · the term ended on ${ended} and this period has not been submitted`
      : `${label} · the term has ended and this period has not been submitted`;
    detail = status === "draft" ? `${gradedCells}/${totalCells}` : null;
  } else if (status === "approved" && progress.approvedAt != null) {
    title = `${label} · signed off ${formatDateTime(progress.approvedAt)}`;
    if (submittedAt != null) title += ` · submitted ${formatDateTime(submittedAt)}`;
    if (periodGrade != null) title += ` · period grade ${formatPercent(periodGrade)}`;
    detail = relativeDay(progress.approvedAt);
  } else if (status === "submitted" && submittedAt != null) {
    title = `${label} · ${formatDateTime(submittedAt)}`;
    if (periodGrade != null) title += ` · period grade ${formatPercent(periodGrade)}`;
    detail = relativeDay(submittedAt);
  } else if (status === "draft") {
    title = `${label} · ${gradedCells} of ${totalCells} cells graded`;
    if (periodGrade != null) title += ` · period grade ${formatPercent(periodGrade)}`;
    detail = `${gradedCells}/${totalCells}`;
  }

  return (
    <div className="adm-period">
      <StatusPill tone={tone} label={pillLabel} title={title} />
      {detail != null ? <span className="adm-period__detail">{detail}</span> : null}
    </div>
  );
}
