// Excel export of the official SUMMARY OF GRADES form.
//
// This does NOT rebuild the form: it loads the college's actual template
// (public/templates/summary-of-grades.xlsx — the SUMMARY OF GRADES file the
// school provided, with its own layout, Georgia fonts, merges, legend and
// sign-off block) and writes the portal's data into its cells.
//
// What gets written:
//   • the metadata lines (program, course code/title, school year, semester,
//     section, meeting schedule) — filled inline where the paper form is
//     completed by hand
//   • student names + the four period grades as values (C:F) — the template's
//     own formulas there reference an EXTERNAL workbook ("[1]PRELIM!Q9"),
//     which would otherwise dangle in a standalone copy
//   • the Equivalent column (H) — the template's formula is broken (a
//     conditional with no false-branch) and points at an external workbook;
//     it is replaced with a live VLOOKUP into a "Grading System Equivalent"
//     sheet generated from the section's own scale table
//   • Average (G) and Remarks (I) keep the template's formulas untouched
//   • "Prepared by:" carries the signed-in professor's name
// Everything else — 80 numbered rows across two pages, legends, sign-offs —
// is the template's own, byte for byte.
import ExcelJS from "exceljs";
import { PERIODS } from "../types";
import type { Assessment, Course, Grade, PeriodId, ScaleRow, Section, Student } from "../types";
import { periodGrade } from "./grades";
import type { AssessmentScore } from "./grades";
import { DEFAULT_SCALE_TABLE } from "./format";

const EQUIV_SHEET = "Grading System Equivalent";
const TEMPLATE_URL = "/templates/summary-of-grades.xlsx";
// The template holds 40 students per page, two pages.
const PAGE_FIRST_ROWS = [11, 76];
const ROWS_PER_PAGE = 40;
const MAX_STUDENTS = PAGE_FIRST_ROWS.length * ROWS_PER_PAGE;

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

/** The section's scale, ascending by minPct — what VLOOKUP(TRUE) requires
 *  (the app stores it descending; scaleLookup scans it that way). */
function ascendingScale(table: ScaleRow[]): ScaleRow[] {
  const rows = (table.length > 0 ? table : DEFAULT_SCALE_TABLE).map((r) => ({ ...r }));
  rows.sort((a, b) => a.minPct - b.minPct);
  return rows;
}

/** The "Grading System Equivalent" sheet the template's Equivalent column
 *  looks up — generated from the section's own editable scale table. */
function addEquivalentSheet(wb: ExcelJS.Workbook, section: Section): void {
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
    for (let c = 1; c <= 3; c++) {
      ws.getRow(r).getCell(c).font = { name: "Georgia", size: 12, color: { argb: "FF000000" } };
    }
  }
}

/** Template row for the n-th student (0-based): page 1 then page 2. */
function rowForStudent(index: number): number {
  const page = Math.floor(index / ROWS_PER_PAGE);
  return PAGE_FIRST_ROWS[page] + (index % ROWS_PER_PAGE);
}

function fillMetadata(wb: ExcelJS.Workbook, input: SummaryExportInput, pageFirstRow: number): void {
  const { course, section } = input;
  const offset = pageFirstRow - 11; // 0 for page 1, 65 for page 2
  const set = (row: number, col: number, value: string | null): void => {
    wsCell(wb, row + offset, col).value = value;
  };
  function wsCell(workbook: ExcelJS.Workbook, row: number, col: number): ExcelJS.Cell {
    return workbook.getWorksheet("Sheet1")!.getRow(row).getCell(col);
  }
  set(4, 1, section.name); // "(Program)" line
  set(5, 1, `Course Code: ${course.code}`);
  set(6, 1, `Course Title: ${course.title}`);
  set(5, 8, section.schedule ?? ""); // Meeting Schedule value
  set(7, 5, course.academicYear); // School Year value
  set(8, 5, course.semester === 1 ? "1st Sem" : "2nd Sem"); // Semester value
  set(8, 8, section.name); // Section value
}

export function fillSummaryWorkbook(wb: ExcelJS.Workbook, input: SummaryExportInput): void {
  const { section, students, assessmentsByPeriod, grades } = input;
  const ws = wb.getWorksheet("Sheet1");
  if (!ws) throw new Error("The summary template is missing its Sheet1.");

  if (students.length > MAX_STUDENTS) {
    throw new Error(
      `The official form holds ${MAX_STUDENTS} students — this section has ${students.length}. Ask the department head to split it.`,
    );
  }

  // metadata on both pages
  fillMetadata(wb, input, 11);
  fillMetadata(wb, input, 76);

  // Per-student, per-period grades — same math as the PG column of the
  // class-record sheets (weighted criteria, missing score counts 0). A
  // period prints only once a score was actually entered for that student
  // in it — an untouched period stays blank, never a provisional zero.
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

  // Student rows — every C:F cell is overwritten (values or blank) so no
  // template formula referencing the external grading workbook survives.
  for (let i = 0; i < MAX_STUDENTS; i++) {
    const r = rowForStudent(i);
    const s = students[i] ?? null;
    ws.getRow(r).getCell(2).value = s?.name ?? null;
    for (let pi = 0; pi < PERIODS.length; pi++) {
      const cell = ws.getRow(r).getCell(3 + pi);
      const pct = s ? periodPct(s, PERIODS[pi]) : null;
      cell.value = pct == null ? null : r2(pct);
      cell.numFmt = "0.00";
    }
    // G (average) and I (remarks) keep the template's formulas.
    // H (equivalent): the template's is broken and external — live VLOOKUP
    // into the sheet this export appends below.
    ws.getRow(r).getCell(8).value = {
      formula: `IF(G${r}="","",VLOOKUP(G${r},'${EQUIV_SHEET}'!A:C,2,TRUE))`,
    };
    ws.getRow(r).getCell(8).numFmt = "0.00";
  }

  // "Prepared by:" — the name line above "Instructor/ Professor", both pages.
  ws.getRow(53).getCell(1).value = input.professorName;
  ws.getRow(118).getCell(1).value = input.professorName;

  // Solid black type, one size up throughout — the template's theme color
  // can render grayish, and the paper form reads better a touch larger.
  // Two passes: cells SHARE style objects in ExcelJS, so reading cell.font
  // while assigning must never interleave (a shared font would accumulate
  // the +1 once per cell that references it). Snapshot first, then set
  // absolute values.
  const fontTargets: Array<{ cell: ExcelJS.Cell; font: Partial<ExcelJS.Font> & { size: number } }> = [];
  ws.eachRow((row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      const size = typeof cell.font?.size === "number" ? cell.font.size : 11;
      fontTargets.push({ cell, font: { ...cell.font, name: cell.font?.name ?? "Georgia", size: size + 1, color: { argb: "FF000000" } } });
    });
  });
  for (const { cell, font } of fontTargets) {
    cell.font = font;
  }

  addEquivalentSheet(wb, section);
}

/** Downloads the filled template as `${code}-${section}-summary-of-grades.xlsx`. */
export async function exportSummaryOfGrades(input: SummaryExportInput): Promise<void> {
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) throw new Error("The summary template could not be loaded from the app bundle.");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await res.arrayBuffer());
  fillSummaryWorkbook(wb, input);
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
