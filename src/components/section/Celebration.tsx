// Celebration — the gold submission overlay (spec step 14, D21): portal
// overlay, drawn gold tick, serif text, auto-dismiss, click/Escape to skip,
// reduced-motion skips the draw. The chime helpers create the AudioContext
// synchronously inside the submit click handler (autoplay-policy safe, Risk 7)
// and are wrapped in try/catch so blocked audio never blocks the overlay.
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { TickIcon } from "../../components/ui";

export type CelebrationVariant = "period" | "semester";

export interface ChimeHandle {
  /** Schedule the notes and close the context when they finish. */
  play(): void;
  /** Discard without playing (submit failed). */
  dispose(): void;
}

interface WebAudioContext {
  createOscillator(): {
    type: string;
    frequency: { value: number; setValueAtTime(v: number, t: number): void };
    connect(node: unknown): void;
    start(t?: number): void;
    stop(t: number): void;
  };
  createGain(): {
    gain: {
      value: number;
      setValueAtTime(v: number, t: number): void;
      linearRampToValueAtTime(v: number, t: number): void;
      exponentialRampToValueAtTime(v: number, t: number): void;
    };
    connect(node: unknown): void;
  };
  destination: unknown;
  currentTime: number;
  state: string;
  resume(): Promise<void>;
  close(): Promise<void>;
}

const PERIOD_NOTES = [659.25, 880.0]; // E5 → A5, two soft notes
const SEMESTER_NOTES = [523.25, 659.25, 1046.5]; // C5 → E5 → C6, resolving

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Create (don't start) the chime. MUST be called synchronously inside the
 * click handler so the AudioContext is born with user activation. Returns
 * null when WebAudio is unavailable — the celebration still shows.
 */
export function createChime(variant: CelebrationVariant): ChimeHandle | null {
  try {
    const Ctor =
      (window as unknown as { AudioContext?: { new (): WebAudioContext }; webkitAudioContext?: { new (): WebAudioContext } })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: { new (): WebAudioContext } }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    return {
      play() {
        try {
          if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
          const notes = variant === "semester" ? SEMESTER_NOTES : PERIOD_NOTES;
          const gap = variant === "semester" ? 0.16 : 0.18;
          const master = ctx.createGain();
          master.gain.value = 0.14;
          master.connect(ctx.destination);
          notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            const t0 = ctx.currentTime + i * gap;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.linearRampToValueAtTime(1, t0 + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
            osc.connect(gain);
            gain.connect(master);
            osc.start(t0);
            osc.stop(t0 + 0.6);
          });
          window.setTimeout(() => {
            void ctx.close().catch(() => undefined);
          }, notes.length * gap * 1000 + 800);
        } catch {
          void ctx.close().catch(() => undefined);
        }
      },
      dispose() {
        void ctx.close().catch(() => undefined);
      },
    };
  } catch {
    return null; // blocked or unsupported — celebration proceeds silently
  }
}

export interface CelebrationProps {
  variant: CelebrationVariant;
  /** Label for the period variant, e.g. "Prelim" → "Prelim submitted". */
  periodLabel?: string;
  onDone(): void;
}

export function Celebration({ variant, periodLabel, onDone }: CelebrationProps): JSX.Element {
  const durationMs = variant === "semester" ? 2200 : 1200;

  useEffect(() => {
    const timer = window.setTimeout(onDone, durationMs);
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onDone();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [durationMs, onDone]);

  const text = variant === "semester" ? "Semester complete" : `${periodLabel ?? "Period"} submitted`;

  return createPortal(
    <div className="sec-celebration" role="status" onClick={onDone}>
      <div className="sec-celebration__backdrop" aria-hidden="true" />
      <div className="sec-celebration__panel">
        <TickIcon size={64} draw={!prefersReducedMotion()} className="sec-celebration__tick" />
        <p className="sec-celebration__text">{text}</p>
        <p className="sec-celebration__sub mono-label">
          {variant === "semester" ? "Every period is submitted" : "Locked for editing · recorded in history"}
        </p>
      </div>
    </div>,
    document.body,
  );
}
