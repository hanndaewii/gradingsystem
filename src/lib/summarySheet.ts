// Excel export of the official SUMMARY OF GRADES form (the college's
// template): college header, course metadata block, one row per student with
// the four period grades, then Average → Equivalent → Remarks, the grading
// legend and the sign-off block. Georgia throughout, like the paper form.
//
// The template's own formulas pull each period grade from an external
// workbook ("[1]PRELIM!Q9") and its Equivalent column has a broken
// conditional (no false-branch). This export keeps the layout faithful but
// fixes both: the period grades come from the portal as values, and
// Equivalent is a live VLOOKUP into a "Grading System Equivalent" sheet
// generated from the section's own editable scale table. Average and
// Remarks stay exactly the template's formulas, so a professor can still
// tweak a period grade in Excel and everything recomputes.
import ExcelJS from "exceljs";
import { PERIODS } from "../types";
import type { Assessment, Course, Grade, PeriodId, ScaleRow, Section, Student } from "../types";
import { periodGrade } from "./grades";
import type { AssessmentScore } from "./grades";
import { DEFAULT_SCALE_TABLE } from "./format";

const FONT = "Georgia";
const SHEET_NAME = "SUMMARY OF GRADES";
const EQUIV_SHEET = "Grading System Equivalent";
const COLLEGE = "CAVITE WEST POINT COLLEGE";
const ADDRESS = "Juanito R. Remulla Sr. Road, Ternate, Cavite";

export interface SummaryExportInput {
  course: Course;
  section: Section;
  students: Student[];
  assessmentsByPeriod: Record<PeriodId, Assessment[]>;
  grades: Grade[];
  /** The signed-in professor — "Prepared by:" on the form. */
  professorName: string;
}

const r2 = (v: number): number => Number(v.toFixed(2));

/** The template's footer: legend + sign-off block, verbatim. */
const LEGEND: Array<{ col: number; text: string }> = [
  { col: 4, text: "1.00 | 98- 100%" },
  { col: 6, text: "2.00 | 87-89%" },
  { col: 8, text: "3.00 | 75-79%" },
  { col: 9, text: "3.00 | 75-79%" },
];

function georgia(cell: ExcelJS.Cell, opts: { bold?: boolean; size?: number } = {}): ExcelJS.Cell {
  cell.font = { name: FONT, size: opts.size ?? 11, bold: opts.bold ?? false };
  return cell;
}

function center(cell: ExcelJS.Cell): ExcelJS.Cell {
  cell.alignment = { horizontal: "center", vertical: "middle" };
  return cell;
}

/** The section's scale, ascending by minPct — what VLOOKUP(TRUE) requires
 *  (the app stores it descending; scaleLookup scans it that way). */
function ascendingScale(table: ScaleRow[]): ScaleRow[] {
  const rows = (table.length > 0 ? table : DEFAULT_SCALE_TABLE).map((r) => ({ ...r }));
  rows.sort((a, b) => a.minPct - b.minPct);
  return rows;
}

function buildEquivalentSheet(wb: ExcelJS.Workbook, section: Section): void {
  const ws = wb.addWorksheet(EQUIV_SHEET);
  ws.getColumn(1).width = 10;
  ws.getColumn(2).width = 10;
  ws.getColumn(3).width = 16;
  const rows = ascendingScale(section.scaleTable);
  for (let i = 0; i < rows.length; i++) {
    const r = i + 1;
    const upper = i + 1 < rows.length ? rows[i + 1].minPct - 1 : 100;
    ws.getRow(r).getCell(1).value = rows[i].minPct;
    ws.getRow(r).getCell(2).value = rows[i].grade5;
    ws.getRow(r).getCell(2).numFmt = "0.00";
    ws.getRow(r).getCell(3).value = `${rows[i].minPct}-${upper}%`;
  }
}

function headerBlock(ws: ExcelJS.Worksheet, input: SummaryExportInput): void {
  const { course, section } = input;
  // College banner
  ws.mergeCells(1, 1, 1, 9);
  center(georgia(ws.getCell(1, 1), { bold: true, size: 14 })).value = COLLEGE;
  ws.getRow(1).height = 20;
  ws.mergeCells(2, 1, 2, 9);
  center(georgia(ws.getCell(2, 1))).value = ADDRESS;
  ws.mergeCells(3, 1, 3, 9);
  center(georgia(ws.getCell(3, 1), { bold: true, size: 12 })).value = SHEET_NAME;
  ws.mergeCells(4, 1, 4, 9);
  center(georgia(ws.getCell(4, 1))).value = section.name;

  // Course metadata — labels with the values filled inline where the paper
  // form would carry handwriting. Credit unit / meeting hours / year level
  // have no data in the portal: left blank for the professor to type.
  ws.mergeCells(5, 1, 5, 2);
  georgia(ws.getCell(5, 1)).value = `Course Code: ${course.code}`;
  ws.mergeCells(5, 3, 6, 4);
  georgia(ws.getCell(5, 3)).value = "Credit Unit:";
  ws.mergeCells(5, 5, 6, 5);
  ws.mergeCells(5, 6, 5, 7);
  georgia(ws.getCell(5, 6)).value = "Meeting Schedule:";
  ws.mergeCells(5, 8, 5, 9);
  georgia(ws.getCell(5, 8)).value = section.schedule ?? "";
  ws.mergeCells(6, 1, 6, 2);
  georgia(ws.getCell(6, 1)).value = `Course Title: ${course.title}`;
  ws.mergeCells(6, 6, 6, 7);
  georgia(ws.getCell(6, 6)).value = "Meeting Hours:";
  ws.mergeCells(6, 8, 6, 9);
  ws.mergeCells(7, 1, 8, 2);
  ws.mergeCells(7, 3, 7, 4);
  georgia(ws.getCell(7, 3)).value = "School Year:";
  ws.getCell(7, 5).value = course.academicYear;
  ws.mergeCells(7, 6, 7, 7);
  georgia(ws.getCell(7, 6)).value = "Year Level:";
  ws.mergeCells(7, 8, 7, 9);
  ws.mergeCells(8, 3, 8, 4);
  georgia(ws.getCell(8, 3)).value = "Semester:";
  ws.getCell(8, 5).value = course.semester === 1 ? "1st Sem" : "2nd Sem";
  ws.mergeCells(8, 6, 8, 7);
  georgia(ws.getCell(8, 6)).value = "Section:";
  ws.mergeCells(8, 8, 8, 9);
  georgia(ws.getCell(8, 8)).value = section.name;
  ws.mergeCells(9, 1, 9, 9); // spacer band, as in the template

  // The table header
  const head = ws.getRow(10);
  head.values = [
    "No.", "Name of Students", "Prelim", "Midterm", "Pre-finals", "Finals",
    "Average", "Equivalent", "Remarks",
  ];
  for (let c = 1; c <= 9; c++) {
    center(georgia(head.getCell(c)));
  }
}

function footerBlock(ws: ExcelJS.Worksheet, firstFooterRow: number, professorName: string): void {
  const at = (offset: number): number => firstFooterRow + offset;
  const f = (row: number, col: number): ExcelJS.Cell => georgia(ws.getCell(row, col));

  // Prepared by / Grading System legend
  f(at(0), 1).value = "Prepared by:";
  f(at(0), 3).value = "Grading System:";
  ws.mergeCells(at(1), 8, at(1), 9);
  ws.mergeCells(at(2), 1, at(2), 2);
  ws.mergeCells(at(2), 8, at(2), 9);
  ws.mergeCells(at(3), 1, at(3), 2);
  ws.mergeCells(at(3), 8, at(3), 9);
  for (const item of LEGEND) {
    f(at(1), item.col).value = item.text;
    f(at(1), item.col);
  }
  ws.getCell(at(1), 8).value = LEGEND[2].text; // H and I both carry it in the template
  f(at(2), 4).value = "1.25 | 96-97%";
  f(at(2), 6).value = "2.25 | 85-86%";
  ws.getCell(at(2), 8).value = "5.00 | Failed";
  f(at(3), 4).value = "1.50 | 93- 95%";
  f(at(3), 6).value = "2.50 | 83-84%";
  ws.getCell(at(3), 8).value = "W | Withdrawn";
  f(at(4), 4).value = "1.75 | 90-92%";
  f(at(4), 6).value = "2.75 | 80-82%";
  f(at(4), 8).value = "INC | Incomplete";

  // The professor signs above the "Instructor/ Professor" line.
  f(at(2), 1).value = professorName;
  f(at(3), 1).value = "Instructor/ Professor";

  // Checked & evaluated + legends
  f(at(5), 1).value = "Checked & Evaluated by:";
  ws.mergeCells(at(5), 3, at(5), 4);
  f(at(5), 3).value = "Legends:";
  f(at(5), 5).value = "Transferee";
  ws.mergeCells(at(5), 6, at(5), 7);
  f(at(5), 6).value = "Failed/ Dropped";
  f(at(5), 8).value = "Irregular";
  f(at(5), 9).value = "Inc.";

  // Program head
  ws.mergeCells(at(6), 1, at(6), 2);
  ws.mergeCells(at(7), 1, at(7), 2);
  f(at(7), 1).value = "_________________";
  f(at(7), 3).value = "Noted by:";
  f(at(8), 1).value = "Program Head";
  ws.mergeCells(at(9), 3, at(9), 6);
  f(at(9), 3).value = "Leni D. Mariñas, MBA, Ph. D";

  // Registrar + vice president
  ws.mergeCells(at(10), 1, at(10), 2);
  f(at(10), 1).value = "Received by:";
  ws.mergeCells(at(10), 3, at(10), 9);
  f(at(10), 3).value = "                     Vice- President";
  ws.mergeCells(at(11), 1, at(11), 2);
  ws.mergeCells(at(11), 3, at(11), 9);
  ws.mergeCells(at(12), 1, at(12), 2);
  f(at(12), 1).value = "Krystal Joy D. Velasco, MBA, LPT.";
  ws.mergeCells(at(12), 3, at(12), 9);
  f(at(12), 3).value = "Rommel N. Mojica, MBA, Ph. D.";
  ws.mergeCells(at(13), 1, at(13), 2);
  f(at(13), 1).value = "Registrar";
  ws.mergeCells(at(13), 3, at(13), 9);
  f(at(13), 3).value = "                                             ";
  ws.mergeCells(at(14), 1, at(14), 2);
  ws.mergeCells(at(14), 6, at(14), 9);
}

/** Builds the summary workbook (testable without a DOM). */
export function buildSummaryWorkbook(input: SummaryExportInput): ExcelJS.Workbook {
  const { section, students, assessmentsByPeriod, grades } = input;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Faculty Grading Portal";
  wb.created = new Date();

  const ws = wb.addWorksheet(SHEET_NAME, {
    pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "10:10" },
  });
  const widths = [6.57, 36.43, 7.86, 9.14, 11.29, 9.14, 9.14, 11.43, 9.14];
  for (let c = 1; c <= 9; c++) ws.getColumn(c).width = widths[c - 1];

  headerBlock(ws, input);

  // Per-student, per-period grades — same math as the PG column of the
  // class-record sheets (weighted criteria, missing score counts 0).
  // A period only prints once the professor has actually entered at least
  // one score for that student in it — an untouched period stays blank on
  // the form, never a provisional zero.
  const byCell = new Map<string, number | null>();
  for (const g of grades) byCell.set(`${g.assessmentId}:${g.studentRowId}`, g.score);
  const entriesFor = (list: Assessment[], s: Student): AssessmentScore[] =>
    list.map((a) => ({
      assessmentId: a.id,
      maxScore: a.maxScore,
      weight: a.weight,
      score: byCell.get(`${a.id}:${s.id}`) ?? null,
    }));
  const periodPct = (s: Student, p: PeriodId): number | null => {
    const list = assessmentsByPeriod[p] ?? [];
    const ids = new Set(list.map((a) => a.id));
    const touched = grades.some(
      (g) => g.studentRowId === s.id && g.score != null && ids.has(g.assessmentId),
    );
    if (!touched) return null;
    return periodGrade(entriesFor(list, s));
  };

  const thin = { style: "thin" as const };
  const firstRow = 11;
  for (let idx = 0; idx < students.length; idx++) {
    const s = students[idx];
    const r = firstRow + idx;
    const row = ws.getRow(r);
    georgia(row.getCell(1)).value = idx + 1;
    georgia(row.getCell(2)).value = s.name;
    for (let pi = 0; pi < PERIODS.length; pi++) {
      const pct = periodPct(s, PERIODS[pi]);
      const cell = row.getCell(3 + pi);
      cell.value = pct == null ? null : r2(pct);
      cell.numFmt = "0.00";
    }
    georgia(row.getCell(7)).value = { formula: `IF(COUNT(C${r}:F${r})<4,"",SUM(C${r}:F${r})/4)` };
    row.getCell(7).numFmt = "0.00";
    georgia(row.getCell(8)).value = {
      formula: `IF(G${r}="","",VLOOKUP(G${r},'${EQUIV_SHEET}'!A:C,2,TRUE))`,
    };
    row.getCell(8).numFmt = "0.00";
    georgia(row.getCell(9)).value = { formula: `IF(H${r}="","",IF(H${r}<4,"PASSED","FAILED"))` };
    for (let c = 1; c <= 9; c++) {
      const cell = row.getCell(c);
      cell.border = { top: thin, left: thin, bottom: thin, right: thin };
      if (c === 2) cell.alignment = { horizontal: "left", vertical: "middle" };
      else center(cell);
    }
  }

  footerBlock(ws, firstRow + students.length, input.professorName);
  buildEquivalentSheet(wb, section);
  return wb;
}

/** Downloads the summary as `${code}-${section}-summary-of-grades.xlsx`. */
export async function exportSummaryOfGrades(input: SummaryExportInput): Promise<void> {
  const wb = buildSummaryWorkbook(input);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${input.course.code}-${input.section.name}-summary-of-grades.xlsx`
    .replace(/[^a-z0-9.-]+/gi, "-")
    .replace(/-+/g, "-");
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
