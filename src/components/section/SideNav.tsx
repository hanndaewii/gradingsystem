// SideNav — sticky vertical nav (spec step 6): view items, Gradebook
// sub-items (Roster/Assessments) highlighted by an IntersectionObserver
// scroll-spy, and the active period's assessment checklist with auto-checks
// and anchor links. All items are buttons (keyboard reachable, aria-current).
import { useEffect, useState } from "react";
import { TickIcon } from "../../components/ui";
import { PERIOD_LABELS } from "../../types";
import type { Assessment, PeriodId, PeriodProgress } from "../../types";
import type { SectionView } from "./useSectionData";
import { cx } from "./cx";

export interface SideNavTarget {
  view: SectionView;
  anchor?: string | null;
}

export interface SideNavProps {
  view: SectionView;
  period: PeriodId;
  assessments: Assessment[];
  progress: PeriodProgress[];
  onNavigate(target: SideNavTarget): void;
  /** assessmentId → students with a score (per-assessment "n of m").
   *  Additive seam prop — WO-7; computed by SectionPage from its grades. */
  gradedCounts?: Record<string, number>;
  /** Roster size — the "m" of each checklist row's n-of-m count. */
  studentCount?: number;
}

const VIEW_ITEMS: Array<{ key: SectionView; label: string }> = [
  { key: "gradebook", label: "Gradebook" },
  { key: "summary", label: "Summary" },
  { key: "history", label: "History" },
  { key: "discussion", label: "Discussion" },
];

const PANEL_IDS = ["sec-roster", "sec-attendance", "sec-assessments"] as const;

export function SideNav({ view, period, assessments, progress, onNavigate, gradedCounts, studentCount }: SideNavProps): JSX.Element {
  const [subActive, setSubActive] = useState<string | null>(null);

  // Scroll-spy: highlight Roster vs Assessments while the user scrolls the
  // gradebook. `progress` is a dep so the observer re-attaches once the
  // panels actually mount (data arrives after the first gradebook render).
  useEffect(() => {
    if (view !== "gradebook") {
      setSubActive(null);
      return;
    }
    const els = PANEL_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el != null,
    );
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target.id) setSubActive(entry.target.id);
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.1, 0.5] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [view, progress]);

  const active = progress.find((p) => p.period === period);

  return (
    <nav className="sec-sidenav" aria-label="Section navigation">
      <div className="sec-sidenav__group">
        <span className="sec-sidenav__label mono-label">Views</span>
        {VIEW_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={cx("sec-sidenav__item", view === item.key && "is-active")}
            aria-current={view === item.key ? "true" : undefined}
            onClick={() => onNavigate({ view: item.key })}
          >
            {item.label}
          </button>
        ))}
      </div>

      {view === "gradebook" ? (
        <div className="sec-sidenav__group">
          <span className="sec-sidenav__label mono-label">Gradebook</span>
          <button
            type="button"
            className={cx("sec-sidenav__item sec-sidenav__item--sub", subActive === "sec-roster" && "is-active")}
            aria-current={subActive === "sec-roster" ? "true" : undefined}
            onClick={() => onNavigate({ view: "gradebook", anchor: "sec-roster" })}
          >
            Roster
          </button>
          <button
            type="button"
            className={cx("sec-sidenav__item sec-sidenav__item--sub", subActive === "sec-attendance" && "is-active")}
            aria-current={subActive === "sec-attendance" ? "true" : undefined}
            onClick={() => onNavigate({ view: "gradebook", anchor: "sec-attendance" })}
          >
            Attendance
          </button>
          <button
            type="button"
            className={cx("sec-sidenav__item sec-sidenav__item--sub", subActive === "sec-assessments" && "is-active")}
            aria-current={subActive === "sec-assessments" ? "true" : undefined}
            onClick={() => onNavigate({ view: "gradebook", anchor: "sec-assessments" })}
          >
            Assessments
          </button>
        </div>
      ) : null}

      <div className="sec-sidenav__group sec-sidenav__checklist">
        <span className="sec-sidenav__label mono-label">{PERIOD_LABELS[period]} checklist</span>
        {active ? (
          <span className="sec-sidenav__count num">
            {active.gradedCells} of {active.totalCells} graded
          </span>
        ) : null}
        {assessments.length === 0 ? (
          <span className="sec-sidenav__empty">No assessments yet</span>
        ) : (
          assessments.map((a) => {
            const done = active?.perAssessment[a.id] ?? false;
            const count = gradedCounts?.[a.id] ?? 0;
            return (
              <button
                key={a.id}
                type="button"
                className="sec-sidenav__check"
                title={`Go to ${a.name}`}
                onClick={() => onNavigate({ view: "gradebook", anchor: `sec-assess-${a.id}` })}
              >
                {done ? (
                  <TickIcon size={12} className="sec-sidenav__tick" />
                ) : (
                  <span className="sec-sidenav__box" aria-hidden="true" />
                )}
                <span className="sec-sidenav__checkname">{a.name}</span>
                {studentCount != null && studentCount > 0 ? (
                  <span className="sec-sidenav__checkcount num" title={`${count} of ${studentCount} students graded`}>
                    {count}/{studentCount}
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </nav>
  );
}
