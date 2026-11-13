// LockNotice — mono explanation of a locked period + optional unlock action
// (spec step 4). Also exports `periodLockReason`, the shared wording used by
// PeriodTabs' disabled reasons and AssessmentsPanel's order-lock note.
import type { ReactNode } from "react";
import { PERIODS, PERIOD_LABELS } from "../../types";
import type { PeriodId, PeriodState, Section } from "../../types";
import { isFinalStatus } from "../../lib/grades";

/**
 * Why `period` cannot be edited yet (order lock only — submitted periods are
 * reported by their own message). Null when the period is editable or
 * already submitted.
 */
export function periodLockReason(
  states: Record<PeriodId, PeriodState>,
  period: PeriodId,
  section?: Pick<Section, "enforceOrder" | "unlockedPeriods"> | null,
): string | null {
  const state = states[period];
  if (!state || isFinalStatus(state.status)) return null;
  // Manual unlock or enforceOrder off → the period is open regardless of order.
  if (section && (!section.enforceOrder || section.unlockedPeriods.includes(period))) return null;
  const at = PERIODS.indexOf(period);
  for (let i = 0; i < at; i++) {
    const earlier = states[PERIODS[i]];
    if (earlier && !isFinalStatus(earlier.status)) {
      return `${PERIOD_LABELS[PERIODS[i]]} must be submitted before ${PERIOD_LABELS[period]} opens.`;
    }
  }
  return null;
}

/** Hairline notice strip: mono explanation + optional action button. */
export function LockNotice({ message, action }: { message: string; action?: ReactNode }): JSX.Element {
  return (
    <div className="sec-locknotice" role="note">
      <span className="sec-locknotice__text">{message}</span>
      {action != null ? <span className="sec-locknotice__action">{action}</span> : null}
    </div>
  );
}
