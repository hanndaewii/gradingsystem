/* WO-1 dev-only gallery: every §3.6 primitive in every state/variant,
   plus the light/dim toggle and the four ProgressSegments combos.
   Self-contained (styles inlined below) and domain-free: no imports
   from src/types.ts, src/lib/* (except useTheme), src/api/*, src/data/*. */

import { useState } from "react";
import {
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Menu,
  Modal,
  Panel,
  ProgressSegments,
  Select,
  Spinner,
  StatusPill,
  Tabs,
  Textarea,
  TickIcon,
  ToastProvider,
  useToast,
} from "../components/ui";
import type { MenuItem, ProgressSegment, TabItem } from "../components/ui";
import { useTheme } from "../lib/useTheme";

const GALLERY_CSS = `
.gal { max-width: 1120px; margin: 0 auto; padding: var(--space-6) var(--space-5) var(--space-8); }
.gal-header { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--space-4);
  padding-bottom: var(--space-4); border-bottom: 1px solid var(--rule-strong); margin-bottom: var(--space-5); }
.gal-title { font-size: var(--text-2xl); font-weight: 600; line-height: var(--leading-tight); }
.gal-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: var(--space-4); }
.gal-span { grid-column: 1 / -1; }
.gal-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.gal-col { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-2); }
.gal-col--wide { align-self: stretch; width: 100%; }
.gal-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-3); align-items: start; }
.gal-note { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--ink-3); }
`;

function seg(key: string, label: string, ratio: number, state: ProgressSegment["state"]): ProgressSegment {
  return { key, label, ratio, state };
}

const SEGS_ALL_NOT_STARTED: ProgressSegment[] = [
  seg("prelim", "Prelim", 0, "not_started"),
  seg("midterm", "Mid", 0, "not_started"),
  seg("semifinals", "Semi", 0, "not_started"),
  seg("finals", "Finals", 0, "not_started"),
];

const SEGS_DRAFT_IN_PROGRESS: ProgressSegment[] = [
  seg("prelim", "Prelim", 1, "submitted"),
  seg("midterm", "Mid", 0.55, "draft"),
  seg("semifinals", "Semi", 0, "not_started"),
  seg("finals", "Finals", 0, "not_started"),
];

const SEGS_MIXED: ProgressSegment[] = [
  seg("prelim", "Prelim", 1, "submitted"),
  seg("midterm", "Mid", 0.9, "draft"),
  seg("semifinals", "Semi", 0.3, "draft"),
  seg("finals", "Finals", 0, "not_started"),
];

const SEGS_ALL_SUBMITTED: ProgressSegment[] = [
  seg("prelim", "Prelim", 1, "submitted"),
  seg("midterm", "Mid", 1, "submitted"),
  seg("semifinals", "Semi", 1, "submitted"),
  seg("finals", "Finals", 1, "submitted"),
];

const PERIOD_TABS: TabItem[] = [
  { key: "prelim", label: "Prelim", tick: true },
  { key: "midterm", label: "Midterm", badge: "12/20" },
  { key: "semifinals", label: "Semi-finals" },
  { key: "finals", label: "Finals", disabled: true, disabledReason: "Prelim must be submitted before Finals opens." },
];

const VIEW_TABS: TabItem[] = [
  { key: "gradebook", label: "Gradebook" },
  { key: "summary", label: "Summary" },
  { key: "history", label: "History" },
  { key: "discussion", label: "Discussion" },
];

function Gallery(): JSX.Element {
  const toast = useToast();
  const { theme, toggle } = useTheme();

  const [underlineTab, setUnderlineTab] = useState("midterm");
  const [segmentedTab, setSegmentedTab] = useState("gradebook");
  const [checked, setChecked] = useState(true);
  const [modalSize, setModalSize] = useState<"sm" | "md" | "lg" | null>(null);
  const [confirmTone, setConfirmTone] = useState<"default" | "danger" | null>(null);

  const menuItems: MenuItem[] = [
    { key: "edit", label: "Edit details", onSelect: () => toast.push({ title: "Menu · Edit details", tone: "info" }) },
    { key: "copy", label: "Duplicate", onSelect: () => toast.push({ title: "Menu · Duplicate", tone: "info" }) },
    { key: "off", label: "Unavailable action", disabled: true, onSelect: () => undefined },
    {
      key: "delete",
      label: "Delete…",
      tone: "danger",
      onSelect: () => toast.push({ title: "Menu · Delete", tone: "danger", description: "Danger items render in the danger tone." }),
    },
  ];

  function pushTone(tone: "info" | "success" | "warn" | "danger"): void {
    const copy = {
      info: { title: "Saved", description: "Section details updated." },
      success: { title: "Prelim submitted", description: "Locked for editing · 20 of 20 graded." },
      warn: { title: "Reverted", description: "\u201c12a\u201d is not a number — previous value restored." },
      danger: { title: "Delete failed", description: "The section still has submitted periods." },
    }[tone];
    toast.push({ ...copy, tone });
  }

  return (
    <div className="gal">
      <style>{GALLERY_CSS}</style>

      <header className="gal-header">
        <div>
          <h1 className="gal-title">UI kit preview</h1>
          <p className="mono-label">Faculty grading portal · WO-1 · academic ledger</p>
        </div>
        <div className="gal-row">
          <span className="gal-note">theme: {theme} · persisted in localStorage</span>
          <Button variant="secondary" onClick={toggle}>
            {theme === "light" ? "☾ Dim mode" : "☀ Light mode"}
          </Button>
        </div>
      </header>

      <div className="gal-grid">
        <Panel label="Buttons" actions={<span className="gal-note">5 variants × 2 sizes</span>}>
          <div className="gal-col">
            <div className="gal-row">
              <Button variant="primary">Submit period</Button>
              <Button variant="secondary">Add section</Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="danger">Delete course</Button>
              <Button variant="link">Open section</Button>
            </div>
            <div className="gal-row">
              <Button variant="primary" size="sm">sm primary</Button>
              <Button variant="secondary" size="sm">sm secondary</Button>
              <Button variant="ghost" size="sm">sm ghost</Button>
              <Button variant="danger" size="sm">sm danger</Button>
              <Button variant="link" size="sm">sm link</Button>
            </div>
            <div className="gal-row">
              <Button variant="primary" loading>Committing…</Button>
              <Button variant="secondary" size="sm" loading>Importing…</Button>
              <Button variant="primary" disabled>Disabled</Button>
              <Button variant="ghost" disabled>Disabled ghost</Button>
              <Button variant="secondary" title="Title attribute demo">Title</Button>
            </div>
            <span className="gal-note">primary = ink fill / paper text · no blue, no gold, no shadows</span>
          </div>
        </Panel>

        <Panel label="Status pills">
          <div className="gal-col">
            <div className="gal-row">
              <StatusPill tone="neutral" label="Not started" />
              <StatusPill tone="progress" label="Draft · 12/20" />
              <StatusPill tone="done" label="Submitted" title="Submitted Mar 10, 2026 · 09:14" />
              <StatusPill tone="neutral" label="Neutral + title" title="Neutral pill title attribute" />
            </div>
            <span className="gal-note">gold appears only on the done pill (and ticks / focus)</span>
          </div>
        </Panel>

        <Panel label="Spinner & tick">
          <div className="gal-col">
            <div className="gal-row">
              <Spinner size="sm" label="Loading section" />
              <Spinner size="md" label="Loading roster" />
              <Spinner size="sm" />
            </div>
            <div className="gal-row">
              <TickIcon size={14} />
              <TickIcon size={20} />
              <TickIcon size={24} draw />
            </div>
            <span className="gal-note">the drawn tick replays on remount · reduced motion shows it instantly</span>
          </div>
        </Panel>

        <Panel label="Menu" actions={<span className="gal-note">outside click / Escape closes</span>}>
          <div className="gal-row">
            <Menu items={menuItems} ariaLabel="Course actions" />
            <Menu items={menuItems} ariaLabel="Course actions (align start)" align="start" />
          </div>
        </Panel>

        <Panel label="Toasts" actions={<span className="gal-note">auto-dismiss 4s · deduped within 500ms</span>}>
          <div className="gal-col">
            <div className="gal-row">
              <Button size="sm" onClick={() => pushTone("info")}>Info</Button>
              <Button size="sm" onClick={() => pushTone("success")}>Success</Button>
              <Button size="sm" onClick={() => pushTone("warn")}>Warn</Button>
              <Button size="sm" onClick={() => pushTone("danger")}>Danger</Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const t: Parameters<ReturnType<typeof useToast>["push"]>[0] = {
                    title: "Duplicate probe",
                    description: "Pushed twice back-to-back.",
                    tone: "info",
                  };
                  toast.push(t);
                  toast.push(t);
                }}
              >
                Push duplicate pair
              </Button>
            </div>
            <span className="gal-note">toasts stack above an open modal (z-toast 60 beats z-modal 50)</span>
          </div>
        </Panel>

        <Panel label="Modal & confirm" className="gal-span">
          <div className="gal-col">
            <div className="gal-row">
              <Button onClick={() => setModalSize("sm")}>Modal sm</Button>
              <Button onClick={() => setModalSize("md")}>Modal md</Button>
              <Button onClick={() => setModalSize("lg")}>Modal lg</Button>
              <Button variant="secondary" onClick={() => setConfirmTone("default")}>Confirm</Button>
              <Button variant="danger" onClick={() => setConfirmTone("danger")}>Confirm danger</Button>
            </div>
            <span className="gal-note">Escape closes top-most only · Tab is trapped · backdrop click closes · focus returns on close</span>
          </div>

          <Modal
            open={modalSize !== null}
            onClose={() => setModalSize(null)}
            title="Add assessment"
            size={modalSize ?? "md"}
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalSize(null)}>Cancel</Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setModalSize(null);
                    toast.push({ title: "Assessment saved", tone: "success" });
                  }}
                >
                  Save assessment
                </Button>
              </>
            }
          >
            <div className="gal-form-grid">
              <Field label="Name" htmlFor="gal-modal-name">
                <Input id="gal-modal-name" defaultValue="Quiz 1" />
              </Field>
              <Field label="Max score" htmlFor="gal-modal-max" hint="Scores clamp to this value.">
                <Input id="gal-modal-max" defaultValue="20" inputMode="numeric" className="num" />
              </Field>
            </div>
          </Modal>

          <ConfirmDialog
            open={confirmTone !== null}
            tone={confirmTone ?? "default"}
            title={confirmTone === "danger" ? "Delete section?" : "Submit Prelim?"}
            body={
              confirmTone === "danger"
                ? "This deletes 18 students and 312 grades. This cannot be undone."
                : "20 of 20 cells graded. Submitting locks the period until reopened."
            }
            confirmLabel={confirmTone === "danger" ? "Delete section" : "Submit Prelim"}
            onConfirm={() => {
              const danger = confirmTone === "danger";
              setConfirmTone(null);
              toast.push({ title: danger ? "Section deleted" : "Prelim submitted", tone: danger ? "danger" : "success" });
            }}
            onCancel={() => setConfirmTone(null)}
          />
        </Panel>

        <Panel label="Progress segments" actions={<span className="gal-note">hatch = draft · gold = submitted</span>} className="gal-span">
          <div className="gal-col gal-col--wide">
            <ProgressSegments segments={SEGS_ALL_NOT_STARTED} showLabels activeKey="midterm" />
            <ProgressSegments segments={SEGS_DRAFT_IN_PROGRESS} showLabels />
            <ProgressSegments segments={SEGS_MIXED} showLabels size="sm" activeKey="midterm" />
            <ProgressSegments segments={SEGS_ALL_SUBMITTED} showLabels />
            <ProgressSegments segments={SEGS_MIXED} />
            <span className="gal-note">top→bottom: all not_started (active Mid) · draft in progress · mixed sm · all submitted · mixed without labels</span>
          </div>
        </Panel>

        <Panel label="Tabs" className="gal-span">
          <div className="gal-col gal-col--wide">
            <Tabs items={PERIOD_TABS} value={underlineTab} onChange={setUnderlineTab} variant="underline" ariaLabel="Grading periods (underline)" />
            <Tabs items={VIEW_TABS} value={segmentedTab} onChange={setSegmentedTab} variant="segmented" ariaLabel="Section views (segmented)" />
            <span className="gal-note">
              roving tabindex · Arrow/Home/End · disabled tab carries its reason tooltip · selected: {underlineTab} / {segmentedTab}
            </span>
          </div>
        </Panel>

        <Panel label="Fields & controls" className="gal-span">
          <div className="gal-form-grid">
            <Field label="Course code" htmlFor="gal-code" hint="Shown to students and admin.">
              <Input id="gal-code" placeholder="CS101" />
            </Field>
            <Field label="Max score" htmlFor="gal-max" error="Max score must be a positive number.">
              <Input id="gal-max" defaultValue="abc" invalid />
            </Field>
            <Field label="Display scale" htmlFor="gal-scale">
              <Select id="gal-scale" defaultValue="percent-letter">
                <option value="percent-letter">Percent + letter</option>
                <option value="scale5">1.00 – 5.00</option>
              </Select>
            </Field>
            <Field label="Notes" htmlFor="gal-notes" hint="Visible in the discussion thread.">
              <Textarea id="gal-notes" rows={3} placeholder="Serif prose…" />
            </Field>
          </div>
          <div className="gal-row" style={{ marginTop: "var(--space-3)" }}>
            <Checkbox checked={checked} onChange={setChecked} label="Enforce period order" id="gal-order" />
            <Checkbox checked={false} onChange={() => undefined} disabled label="Locked by submission" id="gal-locked" />
          </div>
        </Panel>

        <Panel label="Empty state">
          <EmptyState
            title="No courses this semester"
            body="The selected term has no courses yet. Create your first course to start setting up assessments."
            action={<Button variant="primary">Add your first course</Button>}
          />
        </Panel>
      </div>
    </div>
  );
}

/** ToastProvider is mounted here ONLY to demo useToast — in the real
 *  app WO-3 mounts it in App.tsx above all routes; never in a page. */
export default function UiGallery(): JSX.Element {
  return (
    <ToastProvider>
      <Gallery />
    </ToastProvider>
  );
}
