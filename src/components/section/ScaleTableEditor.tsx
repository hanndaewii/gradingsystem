// ScaleTableEditor — section grading settings (spec step 11): the display
// scale Select, the editable conversion table (minPct/letter/grade5 with
// add/remove/reorder + descending/0–100/unique validation + live preview),
// the enforceOrder Checkbox, and the manual-unlock list for in-order entry.
// Admin sees everything read-only. Saving uses api.updateSection.
import { useEffect, useState } from "react";
import { Button, Checkbox, Field, Input, Select } from "../../components/ui";
import { api } from "../../api";
import { PERIODS, PERIOD_LABELS } from "../../types";
import type { DisplayScale, PeriodId, PeriodProgress, ScaleRow, Section } from "../../types";
import { isFinalStatus, scaleLookup } from "../../lib/grades";
import { errMessage } from "./useSectionData";
import { useToast } from "../../components/ui";

export interface ScaleTableEditorProps {
  section: Section;
  progress: PeriodProgress[];
  readOnly: boolean;
  onSectionChange(section: Section): void;
}

interface DraftRow {
  minPct: string;
  letter: string;
  grade5: string;
}

const toDraftRows = (rows: ScaleRow[]): DraftRow[] =>
  rows.map((r) => ({ minPct: String(r.minPct), letter: r.letter, grade5: String(r.grade5) }));

const parseDraftRows = (rows: DraftRow[]): ScaleRow[] | null => {
  const out: ScaleRow[] = [];
  for (const r of rows) {
    const minPct = Number(r.minPct.trim());
    const grade5 = Number(r.grade5.trim());
    const letter = r.letter.trim();
    if (!Number.isFinite(minPct) || minPct < 0 || minPct > 100) return null;
    if (!Number.isFinite(grade5) || grade5 < 1 || grade5 > 5) return null;
    if (letter === "") return null;
    out.push({ minPct, letter, grade5 });
  }
  for (let i = 1; i < out.length; i++) {
    if (out[i].minPct >= out[i - 1].minPct) return null; // must be strictly descending (unique)
  }
  return out;
};

const SAMPLE_PCTS = [95, 85, 75, 65, 50];

export function ScaleTableEditor({ section, progress, readOnly, onSectionChange }: ScaleTableEditorProps): JSX.Element {
  const toast = useToast();
  const [scale, setScale] = useState<DisplayScale>(section.displayScale);
  const [rows, setRows] = useState<DraftRow[]>(() => toDraftRows(section.scaleTable));
  const [busy, setBusy] = useState(false);

  // Re-sync when the section changes, unless the draft already matches.
  useEffect(() => {
    setScale(section.displayScale);
    setRows((prev) => {
      const parsed = parseDraftRows(prev);
      const current = section.scaleTable;
      if (
        parsed &&
        parsed.length === current.length &&
        parsed.every((r, i) => r.minPct === current[i].minPct && r.letter === current[i].letter && r.grade5 === current[i].grade5)
      ) {
        return prev;
      }
      return toDraftRows(current);
    });
  }, [section]);

  const parsedRows = parseDraftRows(rows);
  const previewTable = parsedRows ?? section.scaleTable;
  const rowsChanged =
    parsedRows == null ||
    parsedRows.length !== section.scaleTable.length ||
    !parsedRows.every(
      (r, i) =>
        r.minPct === section.scaleTable[i].minPct && r.letter === section.scaleTable[i].letter && r.grade5 === section.scaleTable[i].grade5,
    );
  const scaleChanged = scale !== section.displayScale;

  async function patch(update: Partial<Pick<Section, "displayScale" | "scaleTable" | "enforceOrder" | "unlockedPeriods">>, title: string): Promise<void> {
    setBusy(true);
    try {
      const updated = await api.updateSection(section.id, update);
      onSectionChange(updated);
      toast.push({ tone: "success", title });
    } catch (err) {
      toast.push({ tone: "danger", title: "Could not update the section", description: errMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  function saveScale(): void {
    if (!parsedRows) return;
    void patch({ displayScale: scale, scaleTable: parsedRows }, "Grading scale saved");
  }

  function setRow(index: number, patchRow: Partial<DraftRow>): void {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patchRow } : r)));
  }

  function addRow(): void {
    setRows((prev) => [...prev, { minPct: "0", letter: "", grade5: "5.00" }]);
  }

  function removeRow(index: number): void {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function moveRow(index: number, delta: -1 | 1): void {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    setRows((prev) => {
      const next = [...prev];
      const [row] = next.splice(index, 1);
      next.splice(target, 0, row);
      return next;
    });
  }

  function toggleEnforce(next: boolean): void {
    void patch({ enforceOrder: next }, next ? "In-order entry turned on" : "In-order entry turned off");
  }

  function toggleUnlock(period: PeriodId, unlocked: boolean): void {
    const next = unlocked
      ? Array.from(new Set([...section.unlockedPeriods, period]))
      : section.unlockedPeriods.filter((p) => p !== period);
    void patch(
      { unlockedPeriods: next },
      unlocked ? `${PERIOD_LABELS[period]} unlocked — you can grade it now.` : `${PERIOD_LABELS[period]} re-locked to the grading order.`,
    );
  }

  return (
    <div className="sec-scale">
      <div className="sec-scale__toprow">
        <Field label="Display scale" htmlFor="sec-scale-display" hint={readOnly ? "Read-only review" : "Applies to every grade shown for this section."}>
          <Select
            id="sec-scale-display"
            value={scale}
            disabled={readOnly || busy}
            onChange={(e) => setScale(e.target.value as DisplayScale)}
          >
            <option value="percent-letter">Percent + letter (87.5% · B+)</option>
            <option value="scale5">1.00–5.00 scale (1.75)</option>
          </Select>
        </Field>
      </div>

      <div className="sec-scale__tablewrap">
        <table className="sec-table sec-scale__table">
          <thead>
            <tr>
              <th scope="col" className="mono-label">Min %</th>
              <th scope="col" className="mono-label">Letter</th>
              <th scope="col" className="mono-label">5.00</th>
              <th scope="col" className="mono-label">Preview</th>
              {!readOnly ? <th scope="col" className="mono-label">Order</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>
                  <Input
                    className="num sec-scale__cellinput"
                    aria-label={`Row ${i + 1} minimum percent`}
                    inputMode="decimal"
                    value={row.minPct}
                    disabled={readOnly || busy}
                    onChange={(e) => setRow(i, { minPct: e.target.value })}
                  />
                </td>
                <td>
                  <Input
                    className="sec-scale__cellinput"
                    aria-label={`Row ${i + 1} letter`}
                    value={row.letter}
                    disabled={readOnly || busy}
                    onChange={(e) => setRow(i, { letter: e.target.value })}
                  />
                </td>
                <td>
                  <Input
                    className="num sec-scale__cellinput"
                    aria-label={`Row ${i + 1} grade on the 5.00 scale`}
                    inputMode="decimal"
                    value={row.grade5}
                    disabled={readOnly || busy}
                    onChange={(e) => setRow(i, { grade5: e.target.value })}
                  />
                </td>
                <td className="num">
                  {SAMPLE_PCTS.map((pct) => {
                    const hit = scaleLookup(previewTable, pct);
                    return (
                      <span key={pct} className="sec-scale__sample">
                        {pct}→{section.displayScale === "scale5" || scale === "scale5" ? hit.grade5.toFixed(2) : hit.letter}
                      </span>
                    );
                  })}
                </td>
                {!readOnly ? (
                  <td className="sec-scale__order">
                    <Button size="sm" variant="ghost" aria-label={`Move row ${i + 1} up`} disabled={busy || i === 0} onClick={() => moveRow(i, -1)}>
                      ↑
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={`Move row ${i + 1} down`} disabled={busy || i === rows.length - 1} onClick={() => moveRow(i, 1)}>
                      ↓
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={`Remove row ${i + 1}`} disabled={busy || rows.length <= 1} onClick={() => removeRow(i)}>
                      ×
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {parsedRows == null ? (
        <p className="sec-scale__error" role="alert">
          Rows need a min % (0–100, strictly descending), a letter, and a 5.00-scale grade (1–5).
        </p>
      ) : null}

      {!readOnly ? (
        <div className="sec-scale__actions">
          <Button size="sm" variant="ghost" onClick={addRow} disabled={busy}>
            Add row
          </Button>
          <Button
            variant="secondary"
            onClick={saveScale}
            loading={busy}
            disabled={busy || parsedRows == null || (!rowsChanged && !scaleChanged)}
          >
            Save grading scale
          </Button>
        </div>
      ) : null}

      <div className="sec-scale__orderblock">
        <Checkbox
          id="sec-scale-enforce"
          checked={section.enforceOrder}
          disabled={readOnly || busy}
          onChange={toggleEnforce}
          label="Enforce in-order entry"
        />
        <p className="sec-scale__helper mono-label">
          Each period opens when the previous one is submitted. Turn off to grade any period at any time.
        </p>

        {section.enforceOrder ? (
          <ul className="sec-scale__unlocks">
            {PERIODS.map((p) => {
              const status = progress.find((x) => x.period === p)?.status ?? "not_started";
              const manuallyUnlocked = section.unlockedPeriods.includes(p);
              return (
                <li key={p} className="sec-scale__unlockrow">
                  <span>{PERIOD_LABELS[p]}</span>
                  <span className="mono-label">
                    {status === "approved"
                      ? "approved"
                      : status === "submitted"
                        ? "submitted"
                        : status === "draft"
                          ? "draft"
                          : "not started"}
                  </span>
                  <Checkbox
                    id={`sec-unlock-${p}`}
                    checked={manuallyUnlocked}
                    disabled={readOnly || busy || isFinalStatus(status)}
                    onChange={(v) => toggleUnlock(p, v)}
                    label="Unlocked"
                  />
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
