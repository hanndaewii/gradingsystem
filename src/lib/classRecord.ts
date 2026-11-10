// classRecord — Excel export of one period's class record, mirroring the
// on-screen ledger: NAME | <assessment> | <weight %> … | PG | PG <w>%, plus
// an averages row. Values are computed here (not formulas) so the file always
// agrees with the app; the layout mirrors the professor's Excel sheet.
import * as XLSX from "xlsx";
import { PERIOD_LABELS } from "../types";
import type { Assessment, Course, Grade, PeriodId, Section, Student } from "../types";
import { periodGrade } from "./grades";
import type { AssessmentScore } from "./grades";

const r2 = (v: number): number => Number(v.toFixed(2));

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
  const entriesFor = (s: Student): AssessmentScore[] =>
    assessments.map((a) => ({
      assessmentId: a.id,
      maxScore: a.maxScore,
      weight: a.weight,
      score: scoreOf(a, s),
    }));

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
  for (const a of assessments) header.push(`${a.name} (max ${a.maxScore})`, weightLabel(a));
  header.push("PG", `PG ${semWeight}%`);
  rows.push(header);

  for (const s of students) {
    const row: (string | number)[] = [s.name];
    for (const a of assessments) {
      const score = scoreOf(a, s);
      row.push(score ?? "");
      row.push(
        score == null || a.maxScore <= 0
          ? ""
          : r2((score / a.maxScore) * weightOf(a) * norm),
      );
    }
    const pg = periodGrade(entriesFor(s));
    row.push(pg == null ? "" : r2(pg));
    row.push(pg == null ? "" : r2((pg * semWeight) / 100));
    rows.push(row);
  }

  const avgRow: (string | number)[] = ["AVERAGES"];
  for (const a of assessments) {
    const scored = students
      .map((s) => scoreOf(a, s))
      .filter((v): v is number => v != null);
    const avg =
      scored.length > 0 ? scored.reduce((acc, v) => acc + v, 0) / scored.length : null;
    avgRow.push(avg == null ? "" : r2(avg));
    avgRow.push("");
  }
  const pgs = students
    .map((s) => periodGrade(entriesFor(s)))
    .filter((v): v is number => v != null);
  const pgAvg = pgs.length > 0 ? pgs.reduce((acc, v) => acc + v, 0) / pgs.length : null;
  avgRow.push(pgAvg == null ? "" : r2(pgAvg));
  avgRow.push(pgAvg == null ? "" : r2((pgAvg * semWeight) / 100));
  rows.push(avgRow);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 30 },
    ...Array.from({ length: assessments.length * 2 + 2 }, () => ({ wch: 11 })),
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${PERIOD_LABELS[period]} record`);
  const base = `${course.code}-${section.name}-${PERIOD_LABELS[period]}-class-record`
    .replace(/[^a-z0-9.-]+/gi, "-")
    .replace(/-+/g, "-");
  XLSX.writeFile(wb, `${base}.xlsx`);
}
