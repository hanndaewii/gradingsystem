// Excel export of the section's class record with live Excel formulas,
// mirroring the institution's official ledger template (GRADING-SHEET):
//   GRADING CRITERIA
//   No. | Student # | NAME | Attendance | 10% | R-1 | R-2 | Total | 30% | … | PG | PG 30%
// Formulas are written directly to cells (=SUM(...), =AVERAGE(...)) so that
// editing values in Excel recalculates the entire ledger dynamically.
import ExcelJS from "exceljs";
import { PERIODS, PERIOD_LABELS } from "../types";
import type { Assessment, Course, Grade, PeriodId, Section, Student } from "../types";
import { periodGrade } from "./grades";
import type { AssessmentScore } from "./grades";
import { buildSheetColumns } from "./sheetColumns";

const r2 = (v: number): number => Number(v.toFixed(2));

function getColumnLetter(colIndex: number): string {
  let letter = "";
  let temp = colIndex;
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

const PERIOD_SHEET_NAMES: Record<PeriodId, string> = {
  prelim: "PRELIM",
  midterm: "MIDTERM",
  semifinals: "PRE-FINAL",
  finals: "FINAL",
};

export interface ClassRecordExportInput {
  course: Course;
  section: Section;
  period: PeriodId;
  students: Student[];
  assessments: Assessment[];
  assessmentsByPeriod?: Record<PeriodId, Assessment[]>;
  grades: Grade[];
}

export async function exportClassRecord(input: ClassRecordExportInput): Promise<void> {
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

interface PeriodSheetResult {
  sheetName: string;
  pgColLetter: string;
}

function buildSinglePeriodSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
  course: Course,
  section: Section,
  period: PeriodId,
  students: Student[],
  assessments: Assessment[],
  grades: Grade[],
): PeriodSheetResult {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  const semWeight = section.periodWeights[period] ?? 30;
  const eqW = assessments.length > 0 ? 100 / assessments.length : 0;
  const weightOf = (a: Assessment): number => (a.weight ?? eqW);
  const weightLabel = (a: Assessment): string => {
    const w = weightOf(a);
    return `${Number.isInteger(w) ? w : Number(w.toFixed(2))}%`;
  };
  const sumW = assessments.reduce((acc, a) => (a.maxScore > 0 ? acc + weightOf(a) : acc), 0);
  const norm = sumW > 0 ? 100 / sumW : 0;

  const byCell = new Map<string, number | null>();
  for (const g of grades) {
    byCell.set(`${g.assessmentId}:${g.studentRowId}`, g.score);
  }
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

  // Map out column positions:
  // Col 1 = No., Col 2 = Student #, Col 3 = NAME
  let currentCol = 4;
  const rawColMap = new Map<string, string>(); // assessmentId -> colLetter
  const groupMembersMap: Record<string, string[]> = {}; // groupKey -> colLetters
  const groupTotalColMap = new Map<string, string>(); // groupKey -> colLetter
  const weightContribCols: string[] = [];

  const headers: (string | number)[] = ["No.", "Student #", "NAME"];

  for (const col of cols) {
    const colLetter = getColumnLetter(currentCol);
    if (col.kind === "raw") {
      headers.push(col.assessment.name);
      rawColMap.set(col.assessment.id, colLetter);
      if (col.assessment.group) {
        if (!groupMembersMap[col.assessment.group]) {
          groupMembersMap[col.assessment.group] = [];
        }
        groupMembersMap[col.assessment.group].push(colLetter);
      }
    } else if (col.kind === "weight") {
      headers.push(weightLabel(col.assessment));
      weightContribCols.push(colLetter);
    } else if (col.kind === "grouptotal") {
      headers.push("Total");
      const groupKey = col.members[0]?.group ?? "";
      groupTotalColMap.set(groupKey, colLetter);
    } else if (col.kind === "groupweight") {
      headers.push(`${col.weight}%`);
      weightContribCols.push(colLetter);
    }
    currentCol++;
  }

  const pgColIdx = currentCol;
  const pgColLetter = getColumnLetter(pgColIdx);
  headers.push("PG");
  currentCol++;

  const pgWeightColIdx = currentCol;
  const pgWeightColLetter = getColumnLetter(pgWeightColIdx);
  headers.push(`PG ${semWeight}%`);

  const totalCols = currentCol;

  // Title & Subtitle
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

  const headRow = ws.getRow(3);
  headRow.values = headers;
  headRow.font = { bold: true };
  headRow.alignment = { horizontal: "center" };
  headRow.getCell(3).alignment = { horizontal: "left" };

  // Fill student rows
  for (let idx = 0; idx < students.length; idx++) {
    const s = students[idx];
    const rowNum = 4 + idx;
    const row = ws.getRow(rowNum);

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = s.studentNo || "";
    row.getCell(3).value = s.name;

    let cIdx = 4;
    for (const col of cols) {
      const cell = row.getCell(cIdx);
      if (col.kind === "raw") {
        const rawScore = scoreOf(col.assessment, s);
        cell.value = rawScore;
      } else if (col.kind === "weight") {
        const a = col.assessment;
        const rawLetter = rawColMap.get(a.id) ?? "D";
        const w = weightOf(a);
        const score = scoreOf(a, s) ?? 0;
        const precalc = a.maxScore <= 0 ? 0 : r2((score / a.maxScore) * w * norm);
        const formula =
          a.maxScore === 100
            ? `SUM(${rawLetter}${rowNum}*${w}%)/100`
            : `SUM((${rawLetter}${rowNum}/${a.maxScore})*${w}%)/100`;
        cell.value = { formula, result: precalc / 100 };
        cell.numFmt = "0.00%";
      } else if (col.kind === "grouptotal") {
        const groupKey = col.members[0]?.group ?? "";
        const mCols = groupMembersMap[groupKey] ?? [];
        const firstLetter = mCols[0] ?? "D";
        const lastLetter = mCols[mCols.length - 1] ?? firstLetter;
        const count = col.members.length || 1;
        const precalc = r2(periodGrade(entriesFor(col.members, s)) ?? 0);
        const formula = `SUM(${firstLetter}${rowNum}:${lastLetter}${rowNum})/${count}`;
        cell.value = { formula, result: precalc };
        cell.numFmt = "0.00";
      } else if (col.kind === "groupweight") {
        const groupKey = col.members[0]?.group ?? "";
        const totLetter = groupTotalColMap.get(groupKey) ?? "D";
        const w = col.weight;
        const total = periodGrade(entriesFor(col.members, s)) ?? 0;
        const precalc = r2((total * (w / 100)) * norm);
        const formula = `SUM(${totLetter}${rowNum}*${w}%)/100`;
        cell.value = { formula, result: precalc / 100 };
        cell.numFmt = "0.00%";
      }
      cIdx++;
    }

    // PG
    const pgCell = row.getCell(pgColIdx);
    const pg = periodGrade(entriesFor(assessments, s));
    const precalcPg = pg == null ? 0 : Math.round(pg);
    const pgFormula =
      weightContribCols.length > 0
        ? `SUM(${weightContribCols.map((c) => `${c}${rowNum}`).join(",")})/0.01`
        : "0";
    pgCell.value = { formula: pgFormula, result: precalcPg };
    pgCell.numFmt = "0.00";

    // PG %
    const pgWeightCell = row.getCell(pgWeightColIdx);
    const precalcPgWeight = pg == null ? 0 : r2((pg * semWeight) / 100);
    const pgWeightFormula = `SUM(${pgColLetter}${rowNum}*${semWeight}%)/100`;
    pgWeightCell.value = { formula: pgWeightFormula, result: precalcPgWeight / 100 };
    pgWeightCell.numFmt = "0.00%";
  }

  // Averages row
  const avgRowIdx = 4 + students.length;
  const avgRow = ws.getRow(avgRowIdx);
  avgRow.font = { bold: true };

  avgRow.getCell(1).value = "AVERAGES";
  ws.mergeCells(avgRowIdx, 1, avgRowIdx, 3);
  avgRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  if (students.length > 0) {
    let cIdx = 4;
    for (const col of cols) {
      const cLetter = getColumnLetter(cIdx);
      const cell = avgRow.getCell(cIdx);
      if (col.kind === "raw") {
        const scored = students.map((s) => scoreOf(col.assessment, s)).filter((v): v is number => v != null);
        const avg = scored.length > 0 ? scored.reduce((acc, v) => acc + v, 0) / scored.length : 0;
        cell.value = {
          formula: `AVERAGE(${cLetter}4:${cLetter}${avgRowIdx - 1})`,
          result: r2(avg),
        };
        cell.numFmt = "0.00";
      } else if (col.kind === "grouptotal") {
        const pgs = students
          .map((s) => periodGrade(entriesFor(col.members, s)))
          .filter((v): v is number => v != null);
        const avg = pgs.length > 0 ? pgs.reduce((acc, v) => acc + v, 0) / pgs.length : 0;
        cell.value = {
          formula: `AVERAGE(${cLetter}4:${cLetter}${avgRowIdx - 1})`,
          result: r2(avg),
        };
        cell.numFmt = "0.00";
      } else {
        cell.value = "";
      }
      cIdx++;
    }

    const pgs = students
      .map((s) => periodGrade(entriesFor(assessments, s)))
      .filter((v): v is number => v != null);
    const pgAvg = pgs.length > 0 ? pgs.reduce((acc, v) => acc + v, 0) / pgs.length : 0;

    avgRow.getCell(pgColIdx).value = {
      formula: `AVERAGE(${pgColLetter}4:${pgColLetter}${avgRowIdx - 1})`,
      result: Math.round(pgAvg),
    };
    avgRow.getCell(pgColIdx).numFmt = "0.00";

    avgRow.getCell(pgWeightColIdx).value = {
      formula: `AVERAGE(${pgWeightColLetter}4:${pgWeightColLetter}${avgRowIdx - 1})`,
      result: (pgAvg * semWeight) / 10000,
    };
    avgRow.getCell(pgWeightColIdx).numFmt = "0.00%";
  }

  // Column widths
  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 32;
  for (let c = 4; c <= totalCols; c++) {
    ws.getColumn(c).width = 11;
  }

  // Border styling
  const thin = { style: "thin" as const, color: { argb: "FFB9D8B2" } };
  for (let r = 3; r <= avgRowIdx; r++) {
    for (let c = 1; c <= totalCols; c++) {
      ws.getCell(r, c).border = { top: thin, left: thin, bottom: thin, right: thin };
    }
  }
  for (let r = 4; r <= avgRowIdx; r++) {
    for (let c = 1; c <= totalCols; c++) {
      if (c === 3 && r < avgRowIdx) {
        ws.getCell(r, c).alignment = { horizontal: "left", vertical: "middle" };
      } else {
        ws.getCell(r, c).alignment = { horizontal: "center", vertical: "middle" };
      }
    }
  }

  return { sheetName, pgColLetter };
}

function buildFinalReportSheet(
  wb: ExcelJS.Workbook,
  course: Course,
  section: Section,
  students: Student[],
  periodResults: Record<PeriodId, PeriodSheetResult>,
): void {
  const ws = wb.addWorksheet("FINAL REPORT", {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  const totalCols = 14;

  ws.mergeCells(1, 1, 1, totalCols);
  const title = ws.getCell(1, 1);
  title.value = "CAVITE WEST POINT COLLEGE";
  title.font = { bold: true, size: 14 };
  title.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 24;

  ws.mergeCells(2, 1, 2, totalCols);
  const sub = ws.getCell(2, 1);
  sub.value = `${course.code} · ${course.title} — ${section.name} · FINAL REPORT OF RATING`;
  sub.font = { size: 10 };
  sub.alignment = { horizontal: "center" };

  const wPrelim = section.periodWeights.prelim ?? 20;
  const wMidterm = section.periodWeights.midterm ?? 20;
  const wSemifinals = section.periodWeights.semifinals ?? 20;
  const wFinals = section.periodWeights.finals ?? 40;

  const headers = [
    "No.",
    "Student #",
    "NAME OF STUDENT",
    "PRELIM",
    `PRELIM ${wPrelim}%`,
    "MIDTERM",
    `MIDTERM ${wMidterm}%`,
    "PRE-FINAL",
    `PRE-FINAL ${wSemifinals}%`,
    "FINAL",
    `FINAL ${wFinals}%`,
    "FINAL GRADE",
    "EQUIV.",
    "REMARKS",
  ];

  const headRow = ws.getRow(3);
  headRow.values = headers;
  headRow.font = { bold: true };
  headRow.alignment = { horizontal: "center" };
  headRow.getCell(3).alignment = { horizontal: "left" };

  const prelimPg = periodResults.prelim?.pgColLetter ?? "Q";
  const midtermPg = periodResults.midterm?.pgColLetter ?? "Q";
  const semiPg = periodResults.semifinals?.pgColLetter ?? "Q";
  const finalPg = periodResults.finals?.pgColLetter ?? "Q";

  for (let idx = 0; idx < students.length; idx++) {
    const s = students[idx];
    const rowNum = 4 + idx;
    const row = ws.getRow(rowNum);

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = { formula: `PRELIM!B${rowNum}`, result: s.studentNo || "" };
    row.getCell(3).value = { formula: `PRELIM!C${rowNum}`, result: s.name };

    // Prelim
    row.getCell(4).value = { formula: `PRELIM!${prelimPg}${rowNum}` };
    row.getCell(4).numFmt = "0.00";
    row.getCell(5).value = { formula: `SUM(D${rowNum}*${wPrelim}%)/100` };
    row.getCell(5).numFmt = "0.00%";

    // Midterm
    row.getCell(6).value = { formula: `MIDTERM!${midtermPg}${rowNum}` };
    row.getCell(6).numFmt = "0.00";
    row.getCell(7).value = { formula: `SUM(F${rowNum}*${wMidterm}%)/100` };
    row.getCell(7).numFmt = "0.00%";

    // Pre-Final
    row.getCell(8).value = { formula: `'PRE-FINAL'!${semiPg}${rowNum}` };
    row.getCell(8).numFmt = "0.00";
    row.getCell(9).value = { formula: `SUM(H${rowNum}*${wSemifinals}%)/100` };
    row.getCell(9).numFmt = "0.00%";

    // Final
    row.getCell(10).value = { formula: `FINAL!${finalPg}${rowNum}` };
    row.getCell(10).numFmt = "0.00";
    row.getCell(11).value = { formula: `SUM(J${rowNum}*${wFinals}%)/100` };
    row.getCell(11).numFmt = "0.00%";

    // Final Grade (Total)
    row.getCell(12).value = {
      formula: `SUM(E${rowNum},G${rowNum},I${rowNum},K${rowNum})/0.01`,
    };
    row.getCell(12).numFmt = "0.00";

    // Equivalent Scale
    if (section.displayScale === "scale5") {
      row.getCell(13).value = {
        formula: `IF(L${rowNum}>=97.5,1,IF(L${rowNum}>=94.5,1.25,IF(L${rowNum}>=91.5,1.5,IF(L${rowNum}>=88.5,1.75,IF(L${rowNum}>=85.5,2,IF(L${rowNum}>=82.5,2.25,IF(L${rowNum}>=79.5,2.5,IF(L${rowNum}>=76.5,2.75,IF(L${rowNum}>=74.5,3,5)))))))))`,
      };
      row.getCell(13).numFmt = "0.00";
    } else {
      row.getCell(13).value = {
        formula: `IF(L${rowNum}>=95,"A",IF(L${rowNum}>=90,"A-",IF(L${rowNum}>=85,"B+",IF(L${rowNum}>=80,"B",IF(L${rowNum}>=75,"C","F")))))`,
      };
    }

    // Remarks
    row.getCell(14).value = {
      formula: `IF(L${rowNum}<74.5,"FAILED","PASSED")`,
    };
  }

  // Averages row
  const avgRowIdx = 4 + students.length;
  const avgRow = ws.getRow(avgRowIdx);
  avgRow.font = { bold: true };

  avgRow.getCell(1).value = "AVERAGES";
  ws.mergeCells(avgRowIdx, 1, avgRowIdx, 3);
  avgRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  if (students.length > 0) {
    for (let c = 4; c <= 12; c++) {
      const cLetter = getColumnLetter(c);
      const cell = avgRow.getCell(c);
      cell.value = {
        formula: `AVERAGE(${cLetter}4:${cLetter}${avgRowIdx - 1})`,
      };
      cell.numFmt = c % 2 === 1 && c <= 11 ? "0.00%" : "0.00";
    }
  }

  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 32;
  for (let c = 4; c <= totalCols; c++) {
    ws.getColumn(c).width = 12;
  }

  const thin = { style: "thin" as const, color: { argb: "FFB9D8B2" } };
  for (let r = 3; r <= avgRowIdx; r++) {
    for (let c = 1; c <= totalCols; c++) {
      ws.getCell(r, c).border = { top: thin, left: thin, bottom: thin, right: thin };
    }
  }
  for (let r = 4; r <= avgRowIdx; r++) {
    for (let c = 1; c <= totalCols; c++) {
      if (c === 3 && r < avgRowIdx) {
        ws.getCell(r, c).alignment = { horizontal: "left", vertical: "middle" };
      } else {
        ws.getCell(r, c).alignment = { horizontal: "center", vertical: "middle" };
      }
    }
  }
}

/** Builds the class-record workbook with live formulas (testable without DOM). */
export function buildClassRecordWorkbook(input: ClassRecordExportInput): ExcelJS.Workbook {
  const { course, section, period, students, assessments, assessmentsByPeriod, grades } = input;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Faculty Grading Portal";
  wb.created = new Date();

  if (assessmentsByPeriod) {
    // Generate all period sheets + FINAL REPORT
    const periodResults = {} as Record<PeriodId, PeriodSheetResult>;
    for (const p of PERIODS) {
      const pAssessments = assessmentsByPeriod[p] ?? (p === period ? assessments : []);
      const sheetName = PERIOD_SHEET_NAMES[p];
      periodResults[p] = buildSinglePeriodSheet(
        wb,
        sheetName,
        course,
        section,
        p,
        students,
        pAssessments,
        grades,
      );
    }

    buildFinalReportSheet(wb, course, section, students, periodResults);

    // Set active tab to the period the user is currently viewing
    const activeIndex = PERIODS.indexOf(period);
    if (activeIndex >= 0) {
      wb.views = [{ activeTab: activeIndex, x: 0, y: 0, width: 17142, height: 10542, firstSheet: 0, visibility: "visible" }];
    }
  } else {
    // Single period fallback
    const sheetName = `${PERIOD_LABELS[period]} record`;
    buildSinglePeriodSheet(wb, sheetName, course, section, period, students, assessments, grades);
  }

  return wb;
}
