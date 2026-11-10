// WeightsEditor — four period-weight inputs with a live sum readout (spec
// step 11). Save is disabled unless the total is 100 ± 0.01 (epsilon-safe,
// matching api.setWeights); the exact inline error names the current total.
import { useEffect, useState } from "react";
import { Button, Field, Input } from "../../components/ui";
import { api } from "../../api";
import { PERIODS, PERIOD_LABELS } from "../../types";
import type { PeriodId, Section } from "../../types";
import { errMessage } from "./useSectionData";
import { useToast } from "../../components/ui";

export interface WeightsEditorProps {
  section: Section;
  readOnly: boolean;
  onSectionChange(section: Section): void;
}

const toDraft = (weights: Record<PeriodId, number>): Record<PeriodId, string> => ({
  prelim: String(weights.prelim ?? ""),
  midterm: String(weights.midterm ?? ""),
  semifinals: String(weights.semifinals ?? ""),
  finals: String(weights.finals ?? ""),
});

const parseDraft = (draft: Record<PeriodId, string>): Record<PeriodId, number> | null => {
  const out = {} as Record<PeriodId, number>;
  for (const p of PERIODS) {
    const raw = draft[p].trim();
    if (raw === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 100) return null;
    out[p] = n;
  }
  return out;
};

const sameWeights = (a: Record<PeriodId, number>, b: Record<PeriodId, number>): boolean =>
  PERIODS.every((p) => Math.abs((a[p] ?? 0) - (b[p] ?? 0)) < 1e-9);

export function WeightsEditor({ section, readOnly, onSectionChange }: WeightsEditorProps): JSX.Element {
  const toast = useToast();
  const [draft, setDraft] = useState<Record<PeriodId, string>>(() => toDraft(section.periodWeights));
  const [busy, setBusy] = useState(false);

  // Re-sync from the section, but never clobber an in-flight identical edit.
  useEffect(() => {
    setDraft((prev) => {
      const parsed = parseDraft(prev);
      return parsed && sameWeights(parsed, section.periodWeights) ? prev : toDraft(section.periodWeights);
    });
  }, [section]);

  const parsed = parseDraft(draft);
  const sum = parsed ? PERIODS.reduce((acc, p) => acc + parsed[p], 0) : null;
  const sumLabel = sum == null ? "—" : `${Math.round(sum * 100) / 100}%`;
  const totalOk = sum != null && Math.abs(sum - 100) <= 0.01;
  const unchanged = parsed != null && sameWeights(parsed, section.periodWeights);
  const error =
    parsed == null
      ? "Weights must be numbers between 0 and 100."
      : !totalOk
        ? `Weights must total 100% (currently ${Math.round((sum ?? 0) * 100) / 100}%)`
        : null;

  async function save(): Promise<void> {
    if (!parsed || !totalOk) return;
    setBusy(true);
    try {
      const updated = await api.setWeights(section.id, parsed);
      onSectionChange(updated);
      toast.push({ tone: "success", title: "Weights saved", description: "The semester grade now uses the new period weights." });
    } catch (err) {
      toast.push({ tone: "danger", title: "Could not save weights", description: errMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sec-weights">
      <div className="sec-weights__grid">
        {PERIODS.map((p) => (
          <Field key={p} label={PERIOD_LABELS[p]} htmlFor={`sec-weight-${p}`}>
            <Input
              id={`sec-weight-${p}`}
              className="num"
              inputMode="decimal"
              value={draft[p]}
              disabled={readOnly || busy}
              onChange={(e) => setDraft((prev) => ({ ...prev, [p]: e.target.value }))}
            />
          </Field>
        ))}
      </div>
      <p className="sec-weights__sum num">
        Total <span className={totalOk ? "sec-weights__ok" : "sec-weights__bad"}>{sumLabel}</span> / 100%
      </p>
      {error && !readOnly ? (
        <p className="sec-weights__error" role="alert">
          {error}
        </p>
      ) : null}
      {!readOnly ? (
        <Button variant="secondary" onClick={() => void save()} loading={busy} disabled={busy || !totalOk || unchanged}>
          Save weights
        </Button>
      ) : (
        <p className="sec-weights__hint mono-label">Read-only review</p>
      )}
    </div>
  );
}
