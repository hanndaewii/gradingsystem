// RosterAddModal — three roster entry modes on Tabs (spec step 9): one at a
// time, paste (parseRoster with live count), CSV file (parseCsv). Duplicates
// are flagged live against the existing roster AND within the batch; the
// submit response's added/duplicates counts are toasted by SectionPage.
import { useMemo, useState } from "react";
import { Button, Field, Input, Modal, Tabs, Textarea } from "../../components/ui";
import type { TabItem } from "../../components/ui";
import type { Student } from "../../types";
import { parseCsv, parseRoster } from "../../lib/csv";
import { plural } from "../../lib/format";

export interface RosterAddModalProps {
  open: boolean;
  onClose(): void;
  existing: Student[];
  /** Resolves on success (modal closes); rejects on failure (stays open). */
  onSubmit(rows: { name: string; studentNo?: string }[]): Promise<void>;
}

type Mode = "one" | "paste" | "csv";

const ID_RE = /^[0-9][0-9-]{3,}$/;

/** Roster CSV: header-skipping, ID-side auto-detection per row. */
function rosterFromCsv(text: string): { name: string; studentNo: string }[] {
  const grid = parseCsv(text);
  if (grid.length === 0) return [];
  const first = grid[0].map((c) => c.trim().toLowerCase());
  const headerish = first.some((c) => c === "name" || c.includes("name") || c.includes("id") || c.includes("student"));
  const body = headerish && !grid[0].some((c) => ID_RE.test(c.trim())) ? grid.slice(1) : grid;
  const out: { name: string; studentNo: string }[] = [];
  for (const row of body) {
    const cells = row.map((c) => c.trim()).filter((c) => c !== "");
    let studentNo = "";
    const names: string[] = [];
    for (const cell of cells) {
      if (studentNo === "" && ID_RE.test(cell)) {
        studentNo = cell;
        continue;
      }
      names.push(cell);
    }
    const name = names.join(" ").trim();
    if (name !== "") out.push({ name, studentNo });
  }
  return out;
}

export function RosterAddModal({ open, onClose, existing, onSubmit }: RosterAddModalProps): JSX.Element {
  const [mode, setMode] = useState<Mode>("one");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

   // one-at-a-time batch (Student ID is optional — the api mints AUTO-####)
   const [batch, setBatch] = useState<{ name: string; studentNo: string }[]>([]);
   const [name, setName] = useState("");
  // paste
  const [pasted, setPasted] = useState("");
  // csv
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  const parsed: { name: string; studentNo: string }[] = useMemo(() => {
    if (mode === "one") return batch;
    if (mode === "paste") return parseRoster(pasted);
    return rosterFromCsv(csvText);
  }, [mode, batch, pasted, csvText]);

  const duplicates: string[] = useMemo(() => {
    const seen = new Set(existing.map((s) => s.studentNo.trim().toLowerCase()));
    const offenders = new Set<string>();
    for (const row of parsed) {
      const key = row.studentNo.trim().toLowerCase();
      if (seen.has(key)) offenders.add(row.studentNo.trim());
      seen.add(key);
    }
    return Array.from(offenders);
  }, [parsed, existing]);

  const items: TabItem[] = [
    { key: "one", label: "One at a time" },
    { key: "paste", label: "Paste" },
    { key: "csv", label: "CSV" },
  ];

  function addToBatch(): void {
    const n = name.trim();
    if (!n) {
      setError("A name is required.");
      return;
    }
    setError(null);
    setBatch((prev) => [...prev, { name: n, studentNo: "" }]);
    setName("");
  }

  async function submit(): Promise<void> {
    if (parsed.length === 0) {
      setError("Nothing to add yet.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(parsed);
      setBatch([]);
      setName("");
      setPasted("");
      setCsvText("");
      setFileName(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the students.");
    } finally {
      setBusy(false);
    }
  }

  function onFile(file: File | null): void {
    setFileName(file ? file.name : null);
    if (!file) {
      setCsvText("");
      return;
    }
    void file
      .text()
      .then((text) => setCsvText(text))
      .catch(() => setError("Could not read that file."));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add students"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={busy} disabled={busy || parsed.length === 0}>
            Add {parsed.length > 0 ? plural(parsed.length, "student") : "students"}
          </Button>
        </>
      }
    >
      <div className="sec-rosteradd">
        <Tabs items={items} value={mode} onChange={(k) => setMode(k as Mode)} variant="segmented" ariaLabel="Roster entry mode" />

        {mode === "one" ? (
          <div className="sec-rosteradd__one">
            <div className="sec-rosteradd__pair">
              <Field label="Name" htmlFor="sec-roster-name">
                <Input
                  id="sec-roster-name"
                  value={name}
                  placeholder="Anna Cruz"
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addToBatch();
                    }
                  }}
                />
              </Field>
              <Button variant="secondary" onClick={addToBatch}>
                Add another
              </Button>
            </div>
            {batch.length > 0 ? (
              <ul className="sec-rosteradd__batch">
                {batch.map((row, i) => (
                  <li key={`${row.studentNo}-${i}`} className="sec-rosteradd__batchrow">
                    <span>{row.name}</span>
                    {row.studentNo ? <span className="num">{row.studentNo}</span> : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${row.name} from the batch`}
                      onClick={() => setBatch((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      ×
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {mode === "paste" ? (
          <Field
            label="Paste a roster"
            htmlFor="sec-roster-paste"
            hint="One student per line — just a name; a Student ID is optional (tab or comma, either order)."
          >
            <Textarea
              id="sec-roster-paste"
              rows={7}
              value={pasted}
              placeholder={"Anna Cruz, 2023-10457\n2023-10458\tBen Tan\nMaria Reyes"}
              onChange={(e) => setPasted(e.target.value)}
            />
          </Field>
        ) : null}

        {mode === "csv" ? (
          <div className="sec-rosteradd__csv">
            <Field label="CSV file" htmlFor="sec-roster-file" hint={fileName ? `Loaded: ${fileName}` : "Expect a name column; a Student ID column is optional."}>
              <Input
                id="sec-roster-file"
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={(e) => {
                  onFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </Field>
            <Field label="…or paste CSV text" htmlFor="sec-roster-csvtext">
              <Textarea
                id="sec-roster-csvtext"
                rows={5}
                value={csvText}
                placeholder={"Name,Student ID\nAnna Cruz,2023-10457"}
                onChange={(e) => setCsvText(e.target.value)}
              />
            </Field>
          </div>
        ) : null}

        <p className="sec-rosteradd__count mono-label">
          {parsed.length > 0 ? `${plural(parsed.length, "student", "students")} ready to add` : "No rows parsed yet"}
        </p>

        {duplicates.length > 0 ? (
          <div className="sec-rosteradd__warn" role="alert">
            <p className="mono-label">Duplicate student IDs — these rows will be skipped</p>
            <p className="num">{duplicates.join(", ")}</p>
          </div>
        ) : null}

        {error ? (
          <div className="sec-rosteradd__error" role="alert">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
