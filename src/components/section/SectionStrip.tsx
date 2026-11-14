// SectionStrip — the fast way across a term's sections: a horizontal
// carousel of chips (course code · section name) sitting above the
// section header. ◀ ▶ slide the track one page when it overflows, and
// the track also scrolls natively (wheel / trackpad / drag) with snap.
// Every chip carries the current view and period, so switching keeps
// you mid-grade where you were. Scope comes from api.getTermOverview
// for the selected term, which is already role-scoped: a professor
// sees their own sections, the department head sees every section.
// Hidden entirely while loading, on error, or with fewer than two
// sections — with nothing to switch to the row is only noise.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useAsync } from "../../lib/useAsync";
import { useTerm } from "../../context/TermContext";

export interface SectionStripProps {
  /** The section on screen — its chip is filled emerald. */
  currentSectionId: string;
  /** Raw ?view= param carried over to the target section (null → its default). */
  view: string | null;
  /** Raw ?period= param carried over to the target section (null → its default). */
  period: string | null;
}

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function SectionStrip({ currentSectionId, view, period }: SectionStripProps): JSX.Element | null {
  const { term } = useTerm();
  const overviewQ = useAsync(() => api.getTermOverview(term), [term]);
  // Stable identity — a fresh array here would make the effect below (and
  // with it the whole page) re-render forever.
  const items = useMemo(
    () =>
      (overviewQ.data ?? []).map((o) => ({
        id: o.section.id,
        code: o.course.code,
        name: o.section.name,
      })),
    [overviewQ.data],
  );
  const itemsKey = items.map((s) => s.id).join("|");

  const trackRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLAnchorElement | null>(null);
  const [edges, setEdges] = useState({ left: false, right: false, overflow: false });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const overflow = track.scrollWidth > track.clientWidth + 2;
    const left = overflow && track.scrollLeft > 2;
    const right = overflow && track.scrollLeft < track.scrollWidth - track.clientWidth - 2;
    // Bail when nothing changed — a fresh object here would loop the
    // scroll listener straight back into a re-render.
    setEdges((prev) =>
      prev.overflow === overflow && prev.left === left && prev.right === right
        ? prev
        : { overflow, left, right },
    );
  }, []);

  // Re-measure when the sections arrive, the active chip moves, or the
  // viewport resizes; keep the active chip in view. Runs only on real
  // changes (itemsKey, not the array identity).
  useEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track) return;
    const active = activeRef.current;
    if (active) {
      const target = active.offsetLeft - (track.clientWidth - active.offsetWidth) / 2;
      track.scrollTo({ left: Math.max(0, target), behavior: "auto" });
    }
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(track);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [itemsKey, currentSectionId, measure]);

  // Fewer than two sections → nothing to switch to.
  if (items.length < 2) return null;

  const page = (): number => Math.max(160, (trackRef.current?.clientWidth ?? 320) - 120);
  const slide = (dir: -1 | 1): void => {
    trackRef.current?.scrollBy({ left: dir * page(), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  const query = new URLSearchParams();
  if (view) query.set("view", view);
  if (period) query.set("period", period);
  const qs = query.toString();

  return (
    <div className="sec-strip" role="region" aria-label="Sections this term">
      {edges.overflow ? (
        <button
          type="button"
          className="sec-strip__arrow"
          onClick={() => slide(-1)}
          disabled={!edges.left}
          aria-label="Previous section"
        >
          <span aria-hidden="true">◀</span>
        </button>
      ) : null}
      <div className="sec-strip__track" ref={trackRef} onScroll={measure}>
        {items.map((s) => {
          const active = s.id === currentSectionId;
          return (
            <Link
              key={s.id}
              ref={active ? activeRef : undefined}
              to={qs ? `/sections/${s.id}?${qs}` : `/sections/${s.id}`}
              className={active ? "sec-strip__chip sec-strip__chip--active" : "sec-strip__chip"}
              aria-current={active ? "page" : undefined}
              title={`${s.code} · ${s.name}`}
            >
              <span className="sec-strip__code">{s.code}</span>
              <span aria-hidden="true" className="sec-strip__dot">
                ·
              </span>
              <span className="sec-strip__name">{s.name}</span>
            </Link>
          );
        })}
      </div>
      {edges.overflow ? (
        <button
          type="button"
          className="sec-strip__arrow"
          onClick={() => slide(1)}
          disabled={!edges.right}
          aria-label="Next section"
        >
          <span aria-hidden="true">▶</span>
        </button>
      ) : null}
    </div>
  );
}
