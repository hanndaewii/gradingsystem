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
  submitted: "Submitted",
  draft: "Draft",
  not_started: "Not started",
};

function toneFor(status: PeriodStatus): "neutral" | "progress" | "done" {
  return status === "submitted" ? "done" : status === "draft" ? "progress" : "neutral";
}

export function PeriodStatusCell({ progress }: { progress: PeriodProgress }): JSX.Element {
  const { period, status, submittedAt, gradedCells, totalCells, periodGrade } = progress;
  const label = `${PERIOD_LABELS[period]} — ${PILL_LABEL[status]}`;

  let title = label;
  let detail: string | null = null;
  if (status === "submitted" && submittedAt != null) {
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
      <StatusPill tone={toneFor(status)} label={PILL_LABEL[status]} title={title} />
      {detail != null ? <span className="adm-period__detail">{detail}</span> : null}
    </div>
  );
}
