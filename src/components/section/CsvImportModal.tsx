// CsvImportModal — period scores import (spec step 10, D12): file or pasted
// table → parseCsv → column-mapping preview (column 0 = student key, the rest
// auto-matched to the period's assessments by normalised name with a per-column
// remap Select) → import via onImport → applied/skipped report with the first
// five skipped keys.
import { useEffect, useMemo, useState } from "react";
import { Button, Field, Input, Modal, Select, Textarea } from "../../components/ui";
import { PERIOD_LABELS } from "../../types";
import type { Assessment, PeriodId } from "../../types";
import { parseCsv } from "../../lib/csv";
import { clampScore, parseScoreInput } from "../../lib/format";

export interface ImportCsvResult {
  applied: number;
  skipped: number;
  skippedKeys: string[];
}

export interface CsvImportModalProps {
  open: boolean;
  onClose(): void;
  period: PeriodId;
  /** Assessments of the active period — mapping targets. */
  assessments: Assessment[];
  /** Resolves with the api result (result panel); rejects on failure. */
  onImport(rows: { studentKey: string; scores: Record<string, number | null> }[]): Promise<ImportCsvResult>;
}

const MAP_IGNORE = "__ignore__";
const MAP_NONE = "__none__";

const normalise = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, " ");

export function CsvImportModal({ open, onClose, period, assessments, onImport }: CsvImportModalProps): JSX.Element {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [mappedFor, setMappedFor] = useState<string>(""); // header signature the mapping belongs to
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportCsvResult | null>(null);

  const grid = useMemo(() => {
    const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim() !== ""));
    return rows;
  }, [text]);

  const header = grid[0] ?? [];
  const dataRows = useMemo(() => grid.slice(1), [grid]);

  // Auto-match columns when a new table is loaded (header signature changes).
  const headerSignature = open && grid.length > 0 ? text.slice(0, 200) : "";
  useEffect(() => {
    if (headerSignature === "" || mappedFor === headerSignature) return;
    const next: Record<number, string> = {};
    header.forEach((cell, col) => {
      if (col === 0) return; // student key
      const matches = assessments.filter((a) => normalise(a.name) === normalise(cell));
      next[col] = matches.length === 1 ? matches[0].id : MAP_NONE;
    });
    setMapping(next);
    setMappedFor(headerSignature);
    setResult(null);
  }, [headerSignature]);

  const unmatchedColumns = header
    .map((cell, col) => ({ cell, col }))
    .filter(({ col }) => col > 0 && (mapping[col] ?? MAP_NONE) === MAP_NONE);

  function remap(col: number, value: string): void {
    setMapping((prev) => ({ ...prev, [col]: value }));
  }

  async function runImport(): Promise<void> {
    const rows: { studentKey: string; scores: Record<string, number | null> }[] = [];
    for (const row of dataRows) {
      const studentKey = (row[0] ?? "").trim();
      if (studentKey === "") continue;
      const scores: Record<string, number | null> = {};
      for (const [colStr, target] of Object.entries(mapping)) {
        if (target === MAP_IGNORE || target === MAP_NONE) continue;
        const assessment = assessments.find((a) => a.id === target);
        if (!assessment) continue;
        const raw = (row[Number(colStr)] ?? "").trim();
        if (raw === "") continue; // empty cells leave the grade unchanged
        const parsed = parseScoreInput(raw);
        if (parsed == null || parsed === "invalid") continue; // unparseable cells leave it unchanged
        scores[target] = clampScore(parsed, assessment.maxScore);
      }
      rows.push({ studentKey, scores });
    }
    setBusy(true);
    setError(null);
    try {
      const res = await onImport(rows);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The import failed.");
    } finally {
      setBusy(false);
    }
  }

  function close(): void {
    if (busy) return;
    onClose();
    setText("");
    setFileName(null);
    setMapping({});
    setMappedFor("");
    setResult(null);
    setError(null);
  }

  function onFile(file: File | null): void {
    setFileName(file ? file.name : null);
    if (!file) {
      setText("");
      return;
    }
    void file
      .text()
      .then((t) => setText(t))
      .catch(() => setError("Could not read that file."));
  }

  const canImport = grid.length > 1 && !busy && result === null;

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Import scores · ${PERIOD_LABELS[period]}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>
            {result ? "Done" : "Cancel"}
          </Button>
          {result ? null : (
            <Button variant="primary" onClick={() => void runImport()} loading={busy} disabled={!canImport}>
              Import {dataRows.length > 0 ? `(${dataRows.length} rows)` : ""}
            </Button>
          )}
        </>
      }
    >
      <div className="sec-csvimport">
        {result ? (
          <div className="sec-csvimport__result">
            <p className="mono-label">Import result</p>
            <p className="num">
              applied {result.applied} · skipped {result.skipped}
            </p>
            {result.skippedKeys.length > 0 ? (
              <div className="sec-csvimport__skipped" role="note">
                <p className="mono-label">Unmatched student keys (first 5)</p>
                <p className="num">{result.skippedKeys.slice(0, 5).map((k) => (k === "" ? "(blank)" : k)).join(", ")}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div className="sec-csvimport__source">
              <Field label="CSV file" htmlFor="sec-csv-file" hint={fileName ? `Loaded: ${fileName}` : "First row is the header; first column is the Student ID or name."}>
                <Input
                  id="sec-csv-file"
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  onChange={(e) => {
                    onFile(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </Field>
              <Field label="…or paste a table" htmlFor="sec-csv-text" hint='e.g. "Student ID,Quiz 1,Quiz 2"'>
                <Textarea id="sec-csv-text" rows={6} value={text} onChange={(e) => setText(e.target.value)} />
              </Field>
            </div>

            {grid.length > 1 ? (
              <div className="sec-csvimport__preview">
                <table className="sec-table sec-csvimport__table">
                  <thead>
                    <tr>
                      <th scope="col" className="mono-label">Column 0 · key</th>
                      {header.slice(1).map((cell, i) => {
                        const col = i + 1;
                        const value = mapping[col] ?? MAP_NONE;
                        return (
                          <th key={col} scope="col">
                            <span className="sec-csvimport__colname">{cell.trim() === "" ? `Column ${col}` : cell.trim()}</span>
                            <Select
                              aria-label={`Map column ${col + 1}`}
                              value={value}
                              onChange={(e) => remap(col, e.target.value)}
                            >
                              <option value={MAP_NONE}>— unmapped —</option>
                              {assessments.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                              <option value={MAP_IGNORE}>Ignore column</option>
                            </Select>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {dataRows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        <td className="num">{(row[0] ?? "").trim() === "" ? "—" : (row[0] ?? "").trim()}</td>
                        {header.slice(1).map((_, j) => (
                          <td key={j} className="num">
                            {(row[j + 1] ?? "").trim() === "" ? "—" : (row[j + 1] ?? "").trim()}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dataRows.length > 5 ? (
                  <p className="sec-csvimport__more mono-label">…and {dataRows.length - 5} more rows</p>
                ) : null}
                {unmatchedColumns.length > 0 ? (
                  <div className="sec-csvimport__warn" role="alert">
                    <p className="mono-label">Unmapped columns — remap or ignore them</p>
                    <p>{unmatchedColumns.map(({ cell, col }) => cell.trim() || `Column ${col + 1}`).join(", ")}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}

        {error ? (
          <div className="sec-csvimport__error" role="alert">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
