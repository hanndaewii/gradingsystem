// Excel export of one period's class record, mirroring the professor's sheet:
//   GRADING CRITERIA
//   NAME | A | 10% | R-1 | R-2 | R-3 | Total | 30% | Q-1 | 10% | … | PG | PG 30%
// Values are computed here (not formulas) so the file always agrees with the
// app. Written with ExcelJS (actively maintained) and lazy-loaded so the
// spreadsheet library never lands in the main bundle.
import ExcelJS from "exceljs";
import { PERIOD_LABELS } from "../types";
import type { Assessment, Course, Grade, PeriodId, Section, Student } from "../types";
import { periodGrade } from "./grades";
import type { AssessmentScore } from "./grades";
import { buildSheetColumns } from "./sheetColumns";

const r2 = (v: number): number => Number(v.toFixed(2));

export async function exportClassRecord(input: {
  course: Course;
  section: Section;
  period: PeriodId;
  students: Student[];
  assessments: Assessment[];
  grades: Grade[];
}): Promise<void> {
  const wb = buildClassRecordWorkbook(input);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${input.course.code}-${input.section.name}-${PERIOD_LABELS[input.period]}-class-record.xlsx`
    .replace(/[^a-z0-9.-]+/gi, "-")
    .replace(/-+/g, "-");
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Builds the class-record workbook (no DOM involved — testable anywhere). */
export function buildClassRecordWorkbook(input: {
  course: Course;
  section: Section;
  period: PeriodId;
  students: Student[];
  assessments: Assessment[];
  grades: Grade[];
}): ExcelJS.Workbook {
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
  const totalCols = cols.length + 3; // NAME + columns + PG + PG %

  // ── rows ───────────────────────────────────────────────────────────────────
  const body: (string | number)[][] = [];
  for (const s of students) {
    const row: (string | number)[] = [s.name];
    for (const col of cols) {
      if (col.kind === "raw") {
        row.push(scoreOf(col.assessment, s) ?? "");
      } else if (col.kind === "weight") {
        // The sheet always shows a value — missing scores count 0 (D14).
        const a = col.assessment;
        const score = scoreOf(a, s) ?? 0;
        row.push(a.maxScore <= 0 ? 0 : r2((score / a.maxScore) * weightOf(a) * norm));
      } else if (col.kind === "grouptotal") {
        const total = periodGrade(entriesFor(col.members, s)) ?? 0;
        row.push(r2(total));
      } else {
        let contrib = 0;
        for (const m of col.members) {
          const score = scoreOf(m, s) ?? 0;
          if (m.maxScore <= 0) continue;
          contrib += (score / m.maxScore) * weightOf(m) * norm;
        }
        row.push(r2(contrib));
      }
    }
    const pg = periodGrade(entriesFor(assessments, s));
    row.push(pg == null ? 0 : Math.round(pg));
    row.push(pg == null ? 0 : r2((pg * semWeight) / 100));
    body.push(row);
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
  avgRow.push(pgAvg == null ? 0 : Math.round(pgAvg));
  avgRow.push(pgAvg == null ? 0 : r2((pgAvg * semWeight) / 100));

  // ── workbook ───────────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "Faculty Grading Portal";
  wb.created = new Date();
  const ws = wb.addWorksheet(`${PERIOD_LABELS[period]} record`, {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  ws.mergeCells(1, 1, 1, totalCols);
  const title = ws.getCell(1, 1);
  title.value = "GRADING CRITERIA";
  title.font = { bold: true, size: 14 };
  title.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 24;

  ws.mergeCells(2, 1, 2, totalCols);
  const sub = ws.getCell(2, 1);
  sub.value = `${course.code} · ${course.title} — ${section.name} · ${PERIOD_LABELS[period]} (period weight ${semWeight}%)`;
  sub.font = { size: 10 };
  sub.alignment = { horizontal: "center" };

  const header: (string | number)[] = ["NAME"];
  for (const col of cols) {
    if (col.kind === "raw") header.push(col.assessment.name);
    else if (col.kind === "weight") header.push(weightLabel(col.assessment));
    else if (col.kind === "grouptotal") header.push("Total");
    else header.push(`${col.weight}%`);
  }
  header.push("PG", `PG ${semWeight}%`);
  const headRow = ws.getRow(3);
  headRow.values = header;
  headRow.font = { bold: true };
  headRow.alignment = { horizontal: "center" };
  headRow.getCell(1).alignment = { horizontal: "left" };

  for (const [i, row] of body.entries()) ws.getRow(4 + i).values = row;
  const avgRowIdx = 4 + body.length;
  ws.getRow(avgRowIdx).values = avgRow;
  ws.getRow(avgRowIdx).font = { bold: true };

  // number formats per column
  ws.getColumn(1).width = 30;
  for (const [i, col] of cols.entries()) {
    const idx = i + 2;
    ws.getColumn(idx).width = 11;
    if (col.kind === "weight" || col.kind === "groupweight") {
      ws.getColumn(idx).numFmt = '0.00"%"';
    } else if (col.kind === "grouptotal") {
      ws.getColumn(idx).numFmt = "0.00";
    }
  }
  ws.getColumn(cols.length + 2).width = 9;
  ws.getColumn(cols.length + 2).numFmt = "0";
  ws.getColumn(cols.length + 3).width = 11;
  ws.getColumn(cols.length + 3).numFmt = '0.00"%"';

  // thin borders like the printed sheet
  const thin = { style: "thin" as const, color: { argb: "FFB9D8B2" } };
  for (let r = 3; r <= avgRowIdx; r++) {
    for (let c = 1; c <= totalCols; c++) {
      ws.getCell(r, c).border = { top: thin, left: thin, bottom: thin, right: thin };
    }
  }
  for (let r = 4; r <= avgRowIdx; r++) {
    for (let c = 2; c <= totalCols; c++) {
      ws.getCell(r, c).alignment = { horizontal: "center" };
    }
  }

  return wb;
}
