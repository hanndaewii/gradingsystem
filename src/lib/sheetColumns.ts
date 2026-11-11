// Column model of the class record (the professor's Excel sheet).
//   NAME | A | 10% | R-1 | R-2 | R-3 | Total | 30% | Q-1 | 10% | Q-2 | 10% | Exam | 40% | PG | PG 30%
// Consecutive assessments sharing a non-null `group` key collapse into raw
// columns + one "Total" column (weighted average of the members) + one weight
// column (Σ member weights); everything else is a raw column followed by its
// own weight column.
import type { Assessment } from "../types";

export type SheetColumn =
  | { kind: "raw"; key: string; assessment: Assessment }
  | { kind: "weight"; key: string; assessment: Assessment; weight: number }
  | { kind: "grouptotal"; key: string; members: Assessment[]; weight: number }
  | { kind: "groupweight"; key: string; members: Assessment[]; weight: number };

export function buildSheetColumns(assessments: Assessment[]): SheetColumn[] {
  const eqW = assessments.length > 0 ? 100 / assessments.length : 0;
  const weightOf = (a: Assessment): number => (a.weight ?? eqW);
  const cols: SheetColumn[] = [];
  let i = 0;
  while (i < assessments.length) {
    const a = assessments[i];
    if (a.group != null) {
      let j = i + 1;
      while (j < assessments.length && assessments[j].group === a.group) j++;
      const members = assessments.slice(i, j);
      if (members.length >= 2) {
        const weight = Number(members.reduce((acc, m) => acc + weightOf(m), 0).toFixed(2));
        for (const m of members) cols.push({ kind: "raw", key: `raw:${m.id}`, assessment: m });
        cols.push({ kind: "grouptotal", key: `gt:${a.id}`, members, weight });
        cols.push({ kind: "groupweight", key: `gw:${a.id}`, members, weight });
        i = j;
        continue;
      }
    }
    cols.push({ kind: "raw", key: `raw:${a.id}`, assessment: a });
    cols.push({ kind: "weight", key: `w:${a.id}`, assessment: a, weight: Number(weightOf(a).toFixed(2)) });
    i++;
  }
  return cols;
}
