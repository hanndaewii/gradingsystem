import type { ReactNode } from "react";
import { cx } from "./cx";

export interface PanelProps {
  label: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  dense?: boolean;
}

/** Hairline-framed block with a mono small-caps label. */
export function Panel({ label, actions, children, className, dense = false }: PanelProps): JSX.Element {
  return (
    <section className={cx("ui-panel", dense && "ui-panel--dense", className)}>
      <header className="ui-panel__head">
        <span className="ui-panel__label mono-label">{label}</span>
        {actions != null ? <div className="ui-panel__actions">{actions}</div> : null}
      </header>
      <div className="ui-panel__body">{children}</div>
    </section>
  );
}
