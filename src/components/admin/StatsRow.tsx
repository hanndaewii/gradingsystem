// StatsRow (WO-6) — a compact strip of term-level tiles inside ONE Panel
// (never shadowed cards). The numbers carry the meaning: green for what is
// submitted, amber for what is in draft or still waiting, grey for the
// plain counts. "Submitted this week" = D9: submittedAt within 7 days.
import type { SectionOverview } from "../../types";
import { isWithinLastDays } from "../../lib/format";
import { isFinalStatus } from "../../lib/grades";
import { Panel } from "../ui";

export function StatsRow({ rows }: { rows: SectionOverview[] }): JSX.Element {
  const courses = new Set(rows.map((r) => r.course.id)).size;
  const sections = rows.length;
  let submitted = 0;
  let drafts = 0;
  let thisWeek = 0;
  for (const row of rows) {
    for (const p of row.periods) {
      // approved counts as submitted — it is further along, not less.
      if (isFinalStatus(p.status)) {
        submitted += 1;
        if (isWithinLastDays(p.submittedAt, 7)) thisWeek += 1;
      } else if (p.status === "draft") {
        drafts += 1;
      }
    }
  }

  // Sections where nothing has been submitted yet — the actionable one.
  let awaiting = 0;
  for (const row of rows) {
    if (!row.periods.some((p) => isFinalStatus(p.status))) awaiting += 1;
  }

  const cells: { label: string; value: number; tone: "plain" | "done" | "warn" }[] = [
    { label: "Courses", value: courses, tone: "plain" },
    { label: "Sections", value: sections, tone: "plain" },
    { label: "Periods submitted", value: submitted, tone: "done" },
    { label: "Periods in draft", value: drafts, tone: "warn" },
    { label: "Submitted this week", value: thisWeek, tone: "done" },
    { label: "Awaiting a submission", value: awaiting, tone: "warn" },
  ];

  return (
    <Panel label="Term summary" className="adm-stats">
      <div className="adm-stats__row">
        {cells.map((c) => (
          <div
            className={`adm-stats__cell is-${c.tone}${c.value > 0 ? " has-value" : ""}`}
            key={c.label}
          >
            <span className="adm-stats__value">{c.value}</span>
            <span className="mono-label">{c.label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
