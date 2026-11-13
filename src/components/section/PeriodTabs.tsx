// PeriodTabs — the four grading periods as the proposal's four-step
// pipeline strip: name + status on top, a completion bar, and a mono
// meta line (graded cells + period weight). A gold tick only when a
// period is complete AND submitted, and disabled+reason for
// order-locked periods. Presentation only — same keys, same onChange.
import { Tabs } from "../../components/ui";
import type { TabItem } from "../../components/ui";
import { PERIODS, PERIOD_LABELS } from "../../types";
import type { PeriodId, PeriodProgress, PeriodStatus, Section } from "../../types";
import { isFinalStatus, isPeriodEditable } from "../../lib/grades";
import { periodLockReason } from "./LockNotice";
import { statesFromProgress } from "./useSectionData";

const STATUS_TEXT: Record<PeriodStatus, string> = {
  not_started: "Not started",
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
};

export interface PeriodTabsProps {
  section: Section;
  progress: PeriodProgress[];
  period: PeriodId;
  onChange(period: PeriodId): void;
}

export function PeriodTabs({ section, progress, period, onChange }: PeriodTabsProps): JSX.Element {
  const states = statesFromProgress(progress);
  const items: TabItem[] = PERIODS.map((p) => {
    const prog = progress.find((x) => x.period === p);
    const status = prog?.status ?? "not_started";
    const graded = prog?.gradedCells ?? 0;
    const total = prog?.totalCells ?? 0;
    const tick = isFinalStatus(status) && (prog?.complete ?? false);
    const locked = !isPeriodEditable({ section, states, period: p }) && !isFinalStatus(status);
    const done = isFinalStatus(status);
    return {
      key: p,
      label: PERIOD_LABELS[p],
      tick,
      status: STATUS_TEXT[status],
      statusTone: done ? ("done" as const) : status === "draft" ? ("draft" as const) : undefined,
      bar: total > 0 ? Math.round((graded / total) * 100) : 0,
      badge:
        total > 0 ? (
          <>
            <span>
              {graded}/{total} graded
            </span>
            <span>{section.periodWeights[p]}% wt</span>
          </>
        ) : undefined,
      disabled: locked,
      disabledReason: locked ? (periodLockReason(states, p, section) ?? "Locked by the grading order.") : undefined,
    };
  });
  return (
    <Tabs
      items={items}
      value={period}
      onChange={(key) => onChange(key as PeriodId)}
      variant="strip"
      ariaLabel="Grading periods"
    />
  );
}
