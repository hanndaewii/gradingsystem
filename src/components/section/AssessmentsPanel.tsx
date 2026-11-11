// AssessmentsPanel — assessment setup for the active period (spec step 8,
// D11/D14): add/rename/reorder/remove through full-list `onSave(defs)` calls
// (ids keep existing rows, absent ids are deleted with their grades). A
// submitted period is read-only with a reopen note; an order-locked period
// stays editable but shows the lock reason and an unlock shortcut.
import { useState } from "react";
import { Button, Checkbox, Field, Input, Menu } from "../../components/ui";
import { PERIOD_LABELS } from "../../types";
import type { Assessment, PeriodId, Section } from "../../types";

/** Same shape the api's setAssessments expects (id on existing rows only). */
export interface AssessmentDef {
  id?: string;
  name: string;
  maxScore: number;
  weight: number | null;
  /** Total-group key — consecutive assessments sharing one key collapse into a single "Total" column. */
  group?: string | null;
}

export interface AssessmentsPanelProps {
  section: Section;
  period: PeriodId;
  assessments: Assessment[];
  readOnly: boolean;
  /** Submitted-period lock — the whole panel goes read-only. */
  locked: boolean;
  onSave(defs: AssessmentDef[]): Promise<void>;
  /** Remove request — SectionPage confirms with the grade count. */
  onRemove(assessment: Assessment): void;
  /** Order-lock unlock shortcut (LockNotice's action, panel-side). */
  onToggleUnlock(): void;
  /** Non-null when the period is locked by grading order (not submitted). */
  orderLockReason: string | null;
}

const toDefs = (list: Assessment[]): AssessmentDef[] =>
  list.map((a) => ({ id: a.id, name: a.name, maxScore: a.maxScore, weight: a.weight, group: a.group }));

export function AssessmentsPanel({
  section, period, assessments, readOnly, locked, onSave, onRemove, onToggleUnlock, orderLockReason,
}: AssessmentsPanelProps): JSX.Element {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Add form: name + max (default 100) + optional weight (default 25%).
  const [name, setName] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [weight, setWeight] = useState("25");
  const [withPrev, setWithPrev] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const canEdit = !readOnly && !locked;
  const weighted = assessments.some((a) => a.weight != null && a.weight > 0);
  const modeHint = weighted
    ? "Weighted — each assessment contributes (score ÷ max) × weight; missing scores count 0."
    : "Equal weight — every assessment contributes its score ÷ max, averaged.";

  async function save(defs: AssessmentDef[]): Promise<void> {
    setBusy(true);
    try {
      await onSave(defs);
    } catch {
      // failure toasts come from SectionPage; keep the panel usable
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, delta: -1 | 1): void {
    const target = index + delta;
    if (target < 0 || target >= assessments.length) return;
    const next = [...assessments];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    void save(toDefs(next));
  }

  function startRename(a: Assessment): void {
    setRenamingId(a.id);
    setRenameValue(a.name);
    setRenameError(null);
  }

  async function commitRename(): Promise<void> {
    if (renamingId == null) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError("Assessment name is required.");
      return;
    }
    const defs = toDefs(assessments).map((d) => (d.id === renamingId ? { ...d, name: trimmed } : d));
    setRenamingId(null);
    setRenameError(null);
    await save(defs);
  }

  function addAssessment(): void {
    const trimmed = name.trim();
    const max = Number(maxScore);
    if (!trimmed) {
      setAddError("Assessment name is required.");
      return;
    }
    if (!Number.isFinite(max) || max <= 0) {
      setAddError("Max score must be a positive number.");
      return;
    }
    const wRaw = weight.trim();
    const w = wRaw === "" ? null : Number(wRaw);
    if (w != null && (!Number.isFinite(w) || w < 0)) {
      setAddError("Weight must be a non-negative number, or blank for equal weight.");
      return;
    }
    setAddError(null);
    setName("");
    setMaxScore("100");
    setWeight("25");
    // "Total with previous" chains this assessment onto the previous one's
    // Total group (like R-1 / R-2 / R-3 collapsing into Total | 30%).
    const prev = assessments[assessments.length - 1];
    const group = withPrev && prev ? (prev.group ?? prev.id) : null;
    setWithPrev(false);
    void save([...toDefs(assessments), { name: trimmed, maxScore: max, weight: w, group }]);
  }

  return (
    <div className="sec-assess">
      {locked ? (
        <p className="sec-assess__locknote mono-label" role="note">
          Locked — reopen the period to edit
        </p>
      ) : null}
      {!locked && orderLockReason != null && !readOnly ? (
        <div className="sec-assess__orderlock">
          <span className="sec-assess__locknote mono-label">{orderLockReason}</span>
          <Button size="sm" variant="ghost" onClick={onToggleUnlock}>
            Unlock this period
          </Button>
        </div>
      ) : null}

      {assessments.length === 0 ? (
        <p className="sec-assess__empty">
          No assessments for {PERIOD_LABELS[period]} yet
          {canEdit ? " — add the first one below." : "."}
        </p>
      ) : (
        <ul className="sec-assess__list">
          {assessments.map((a, i) => (
            <li key={a.id} id={`sec-assess-${a.id}`} className="sec-assess__row">
              <span className="sec-assess__order num">{i + 1}</span>
              {renamingId === a.id && canEdit ? (
                <span className="sec-assess__rename">
                  <Input
                    value={renameValue}
                    autoFocus
                    aria-label="Assessment name"
                    invalid={renameError != null}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void commitRename();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setRenamingId(null);
                        setRenameError(null);
                      }
                    }}
                  />
                  <Button size="sm" variant="primary" onClick={() => void commitRename()} disabled={busy}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setRenamingId(null);
                      setRenameError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  {renameError ? <span className="sec-assess__error" role="alert">{renameError}</span> : null}
                </span>
              ) : (
                <>
                  <span className="sec-assess__name">{a.name}</span>
                  <span className="sec-assess__meta num">
                    max {a.maxScore} · {a.weight != null ? `${a.weight}%` : "equal"}
                    {a.group != null ? " · in Total group" : ""}
                  </span>
                  {canEdit ? (
                    <span className="sec-assess__tools">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Move up"
                        aria-label={`Move ${a.name} up`}
                        disabled={busy || i === 0}
                        onClick={() => move(i, -1)}
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Move down"
                        aria-label={`Move ${a.name} down`}
                        disabled={busy || i === assessments.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        ↓
                      </Button>
                      <Menu
                        ariaLabel={`Actions for ${a.name}`}
                        items={[
                          { key: "rename", label: "Rename", onSelect: () => startRename(a) },
                          {
                            key: "remove",
                            label: "Remove",
                            tone: "danger",
                            disabled: busy,
                            onSelect: () => onRemove(a),
                          },
                        ]}
                      />
                    </span>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="sec-assess__hint mono-label">{modeHint}</p>
      <p className="sec-assess__hint mono-label">
        {section.enforceOrder ? "In-order entry is on — unlock a period to grade it early." : "In-order entry is off — every period is open."}
      </p>

      {canEdit ? (
        <div className="sec-assess__add">
          <Field label="Name" htmlFor="sec-assess-add-name" error={addError}>
            <Input
              id="sec-assess-add-name"
              value={name}
              placeholder="Quiz 3"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAssessment();
                }
              }}
            />
          </Field>
          <Field label="Max score" htmlFor="sec-assess-add-max">
            <Input
              id="sec-assess-add-max"
              className="num"
              inputMode="numeric"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
            />
          </Field>
          <Field label="Weight %" htmlFor="sec-assess-add-weight" hint="Blank = equal weight">
            <Input
              id="sec-assess-add-weight"
              className="num"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </Field>
          <Field
            label="Total group"
            htmlFor="sec-assess-add-group"
            hint="Tick to merge into one Total column with the previous assessments (like R-1 / R-2 / R-3)"
          >
            <Checkbox
              id="sec-assess-add-group"
              checked={withPrev}
              onChange={setWithPrev}
              label="Total with previous"
              disabled={!canEdit || assessments.length === 0}
            />
          </Field>
          <Button variant="secondary" onClick={addAssessment} disabled={busy}>
            Add assessment
          </Button>
        </div>
      ) : null}

      {readOnly && !locked ? (
        <p className="sec-assess__hint mono-label">Read-only review</p>
      ) : null}
    </div>
  );
}
