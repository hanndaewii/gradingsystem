// StatsRow (WO-6) — five term-level stat cells in a hairline row inside
// ONE Panel (never shadowed cards). All values are mono; labels are the
// mono small-caps utility. "Submitted this week" = D9: submittedAt
// within the last 7 days.
import type { SectionOverview } from "../../types";
import { isWithinLastDays } from "../../lib/format";
import { Panel } from "../ui";

export function StatsRow({ rows }: { rows: SectionOverview[] }): JSX.Element {
  const courses = new Set(rows.map((r) => r.course.id)).size;
  const sections = rows.length;
  let submitted = 0;
  let drafts = 0;
  let thisWeek = 0;
  for (const row of rows) {
    for (const p of row.periods) {
      if (p.status === "submitted") {
        submitted += 1;
        if (isWithinLastDays(p.submittedAt, 7)) thisWeek += 1;
      } else if (p.status === "draft") {
        drafts += 1;
      }
    }
  }

  const cells: { label: string; value: number }[] = [
    { label: "Courses", value: courses },
    { label: "Sections", value: sections },
    { label: "Periods submitted", value: submitted },
    { label: "Periods in draft", value: drafts },
    { label: "Submitted this week", value: thisWeek },
  ];

  return (
    <Panel label="Term summary" className="adm-stats">
      <div className="adm-stats__row">
        {cells.map((c) => (
          <div className="adm-stats__cell" key={c.label}>
            <span className="adm-stats__value">{c.value}</span>
            <span className="mono-label">{c.label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
