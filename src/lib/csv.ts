// CSV / roster parsing (spec WO-2 step 5). Both functions are pure and never
// throw: malformed input degrades to whatever can be salvaged.

/**
 * RFC-4180-ish CSV parser: quoted fields with `""` escapes, CRLF/LF/CR row
 * endings, trailing newline produces no phantom row, leading BOM trimmed.
 */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false; // closing quote
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && field === "") {
      inQuotes = true; // opening quote only at field start
      i += 1;
      continue;
    }
    if (ch === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (ch === "\r" || ch === "\n") {
      pushRow();
      i += 1;
      if (ch === "\r" && src[i] === "\n") i += 1; // CRLF
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field !== "" || row.length > 0) pushRow(); // last line without newline
  return rows;
}

const STUDENT_NO_RE = /^[0-9][0-9-]{3,}$/;

/**
 * Roster parser: one student per line, tab- or comma-separated. A Student ID
 * is optional (auto-detected via /^[0-9][0-9-]{3,}$/ on either side); rows
 * without one are kept with an empty studentNo. Blank lines are dropped,
 * order is kept — never throws.
 */
export function parseRoster(text: string): { name: string; studentNo: string }[] {
  const out: { name: string; studentNo: string }[] = [];
  const lines = text.split(/\r\n|\n|\r/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") continue;
    const sep = line.includes("\t") ? "\t" : ",";
    const parts = line.split(sep).map((p) => p.trim());
    let studentNo = "";
    const nameParts: string[] = [];
    for (const part of parts) {
      if (part === "") continue;
      if (studentNo === "" && STUDENT_NO_RE.test(part)) {
        studentNo = part;
        continue;
      }
      nameParts.push(part);
    }
    const name = nameParts.join(" ").trim();
    if (name === "") continue;
    out.push({ name, studentNo });
  }
  return out;
}
