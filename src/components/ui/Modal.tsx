import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "./cx";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  labelledBy?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Module-level stack of open modals: Escape only closes the top-most
 *  one, so a ConfirmDialog layered over a Modal closes by itself. */
const openModalStack: symbol[] = [];

/** Portal to document.body. Escape closes (top-most only), Tab is
 *  trapped inside, backdrop click closes, body scroll is locked, and
 *  focus returns to the previously focused element on close. */
export function Modal({ open, onClose, title, children, footer, size = "md", labelledBy }: ModalProps): JSX.Element {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const generatedTitleId = useId();
  const titleId = labelledBy ?? generatedTitleId;

  useEffect(() => {
    if (!open) return;
    const token = Symbol("modal");
    openModalStack.push(token);
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const panel = panelRef.current;
    panel?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        if (openModalStack[openModalStack.length - 1] === token) {
          e.preventDefault();
          onCloseRef.current();
        }
        return;
      }
      if (e.key !== "Tab") return;
      const currentPanel = panelRef.current;
      if (!currentPanel) return;
      const targets = Array.from(currentPanel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (targets.length === 0) {
        e.preventDefault();
        currentPanel.focus();
        return;
      }
      const first = targets[0];
      const last = targets[targets.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && currentPanel.contains(active);
      if (e.shiftKey) {
        if (!inside || active === first || active === currentPanel) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const i = openModalStack.indexOf(token);
      if (i >= 0) openModalStack.splice(i, 1);
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return <></>;

  return createPortal(
    <div className="ui-modal">
      <div className="ui-modal__backdrop" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        className={cx("ui-modal__panel", `ui-modal__panel--${size}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="ui-modal__head">
          <h2 className="ui-modal__title" id={titleId}>
            {title}
          </h2>
          <button type="button" className="ui-modal__close" aria-label="Close dialog" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="ui-modal__body">{children}</div>
        {footer ? <footer className="ui-modal__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
