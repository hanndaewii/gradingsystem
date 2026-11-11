// classRecord — Excel export of one period's class record, mirroring the
// professor's sheet: NAME | A | 10% | R-1 | R-2 | R-3 | Total | 30% | … |
// PG | PG w%, plus an averages row. Values are computed here (not formulas)
// so the file always agrees with the app.
import * as XLSX from "xlsx";
import { PERIOD_LABELS } from "../types";
import type { Assessment, Course, Grade, PeriodId, Section, Student } from "../types";
import { periodGrade } from "./grades";
import type { AssessmentScore } from "./grades";

const r2 = (v: number): number => Number(v.toFixed(2));

export type SheetColumn =
  | { kind: "raw"; key: string; assessment: Assessment }
  | { kind: "weight"; key: string; assessment: Assessment; weight: number }
  | { kind: "grouptotal"; key: string; members: Assessment[]; weight: number }
  | { kind: "groupweight"; key: string; members: Assessment[]; weight: number };

/**
 * Column model of the class record. Consecutive assessments sharing a
 * non-null `group` key collapse into raw columns + one "Total" column
 * (weighted average of the members) + one weight column (Σ member weights);
 * everything else is a raw column followed by its own weight column.
 */
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
        const weight = r2(members.reduce((acc, m) => acc + weightOf(m), 0));
        for (const m of members) cols.push({ kind: "raw", key: `raw:${m.id}`, assessment: m });
        cols.push({ kind: "grouptotal", key: `gt:${a.id}`, members, weight });
        cols.push({ kind: "groupweight", key: `gw:${a.id}`, members, weight });
        i = j;
        continue;
      }
    }
    cols.push({ kind: "raw", key: `raw:${a.id}`, assessment: a });
    cols.push({ kind: "weight", key: `w:${a.id}`, assessment: a, weight: r2(weightOf(a)) });
    i++;
  }
  return cols;
}

export function exportClassRecord(input: {
  course: Course;
  section: Section;
  period: PeriodId;
  students: Student[];
  assessments: Assessment[];
  grades: Grade[];
}): void {
  const { course, section, period, students, assessments, grades } = input;
  const semWeight = section.periodWeights[period];
  const eqW = assessments.length > 0 ? 100 / assessments.length : 0;
  const weightOf = (a: Assessment): number => (a.weight ?? eqW);
  const weightLabel = (a: Assessment): string => {
    const w = weightOf(a);
    return `${Number.isInteger(w) ? w : Number(w.toFixed(2))}%`;
  };
  // Normalise so the contribution columns always sum to the PG (D14).
  const sumW = assessments.reduce((acc, a) => (a.maxScore > 0 ? acc + weightOf(a) : acc), 0);
  const norm = sumW > 0 ? 100 / sumW : 0;

  const byCell = new Map<string, number | null>();
  for (const g of grades) byCell.set(`${g.assessmentId}:${g.studentRowId}`, g.score);
  const scoreOf = (a: Assessment, s: Student): number | null =>
    byCell.get(`${a.id}:${s.id}`) ?? null;
  const entriesFor = (list: Assessment[], s: Student): AssessmentScore[] =>
    list.map((a) => ({
      assessmentId: a.id,
      maxScore: a.maxScore,
      weight: a.weight,
      score: scoreOf(a, s),
    }));

  const cols = buildSheetColumns(assessments);

  const rows: (string | number)[][] = [];
  rows.push([
    `${course.code} · ${course.title} — ${section.name}`,
    "",
    `${PERIOD_LABELS[period]} class record`,
    "",
    "",
    `Period weight: ${semWeight}%`,
  ]);
  rows.push([]);

  const header: (string | number)[] = ["NAME"];
  for (const col of cols) {
    if (col.kind === "raw") header.push(`${col.assessment.name} (max ${col.assessment.maxScore})`);
    else if (col.kind === "weight") header.push(weightLabel(col.assessment));
    else if (col.kind === "grouptotal") header.push("Total");
    else header.push(`${col.weight}%`);
  }
  header.push("PG", `PG ${semWeight}%`);
  rows.push(header);

  for (const s of students) {
    const row: (string | number)[] = [s.name];
    for (const col of cols) {
      if (col.kind === "raw") {
        row.push(scoreOf(col.assessment, s) ?? "");
      } else if (col.kind === "weight") {
        const a = col.assessment;
        const score = scoreOf(a, s);
        row.push(
          score == null || a.maxScore <= 0 ? "" : r2((score / a.maxScore) * weightOf(a) * norm),
        );
      } else {
        // Total = weighted average of the members; group weight column =
        // Σ member contributions (they always sum to the PG with the rest).
        const total = periodGrade(entriesFor(col.members, s));
        if (col.kind === "grouptotal") {
          row.push(total == null ? "" : r2(total));
        } else {
          let contrib = 0;
          let any = false;
          for (const m of col.members) {
            const score = scoreOf(m, s);
            if (score == null || m.maxScore <= 0) continue;
            contrib += (score / m.maxScore) * weightOf(m) * norm;
            any = true;
          }
          row.push(any ? r2(contrib) : "");
        }
      }
    }
    const pg = periodGrade(entriesFor(assessments, s));
    row.push(pg == null ? "" : r2(pg));
    row.push(pg == null ? "" : r2((pg * semWeight) / 100));
    rows.push(row);
  }

  const avgRow: (string | number)[] = ["AVERAGES"];
  for (const col of cols) {
    if (col.kind === "raw") {
      const a = col.assessment;
      const scored = students.map((s) => scoreOf(a, s)).filter((v): v is number => v != null);
      const avg = scored.length > 0 ? scored.reduce((acc, v) => acc + v, 0) / scored.length : null;
      avgRow.push(avg == null ? "" : r2(avg));
    } else if (col.kind === "grouptotal") {
      const pgs = students
        .map((s) => periodGrade(entriesFor(col.members, s)))
        .filter((v): v is number => v != null);
      const avg = pgs.length > 0 ? pgs.reduce((acc, v) => acc + v, 0) / pgs.length : null;
      avgRow.push(avg == null ? "" : r2(avg));
    } else {
      avgRow.push("");
    }
  }
  const pgs = students
    .map((s) => periodGrade(entriesFor(assessments, s)))
    .filter((v): v is number => v != null);
  const pgAvg = pgs.length > 0 ? pgs.reduce((acc, v) => acc + v, 0) / pgs.length : null;
  avgRow.push(pgAvg == null ? "" : r2(pgAvg));
  avgRow.push(pgAvg == null ? "" : r2((pgAvg * semWeight) / 100));
  rows.push(avgRow);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 30 },
    ...Array.from({ length: cols.length + 2 }, () => ({ wch: 11 })),
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${PERIOD_LABELS[period]} record`);
  const base = `${course.code}-${section.name}-${PERIOD_LABELS[period]}-class-record`
    .replace(/[^a-z0-9.-]+/gi, "-")
    .replace(/-+/g, "-");
  XLSX.writeFile(wb, `${base}.xlsx`);
}
