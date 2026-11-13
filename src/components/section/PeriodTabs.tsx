// PeriodTabs — the four grading periods as Tabs (spec step 4): a gold tick
// only when a period is complete AND submitted, a mono gradedCells/totalCells
// badge for drafts, and disabled+reason for order-locked periods.
import { Tabs } from "../../components/ui";
import type { TabItem } from "../../components/ui";
import { PERIODS, PERIOD_LABELS } from "../../types";
import type { PeriodId, PeriodProgress, Section } from "../../types";
import { isFinalStatus, isPeriodEditable } from "../../lib/grades";
import { periodLockReason } from "./LockNotice";
import { statesFromProgress } from "./useSectionData";

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
    return {
      key: p,
      label: PERIOD_LABELS[p],
      tick,
      badge: !tick && total > 0 ? `${graded}/${total}` : undefined,
      disabled: locked,
      disabledReason: locked ? (periodLockReason(states, p, section) ?? "Locked by the grading order.") : undefined,
    };
  });
  return (
    <Tabs
      items={items}
      value={period}
      onChange={(key) => onChange(key as PeriodId)}
      variant="segmented"
      ariaLabel="Grading periods"
    />
  );
}
