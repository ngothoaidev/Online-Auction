import { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE = ['a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])', 'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]']
  .map((s) => `${s}:not([tabindex="-1"])`).join(', ');

/**
 * Modal dialog / drawer. Moves focus in, traps Tab, closes on Escape (when `dismissible`), restores focus to the
 * element that opened it (falls back to <body> if that element is gone), locks page scroll.
 * `pending` blocks every way of closing so an in-flight confirm cannot be abandoned or repeated.
 */
export default function Dialog({ open, onClose, title, description, children, dismissible = true, pending = false, variant = 'center', initialFocusRef, className = '' }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  const canClose = dismissible && !pending;

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = panelRef.current;
    const target = initialFocusRef?.current ?? panel.querySelector(FOCUSABLE) ?? panel;
    target.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && canClose) { e.stopPropagation(); onClose?.(); return; }
    if (e.key !== 'Tab') return;
    const items = [...panelRef.current.querySelectorAll(FOCUSABLE)];
    if (items.length === 0) { e.preventDefault(); panelRef.current.focus(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const placement = variant === 'drawer'
    ? 'right-0 top-0 h-full w-[88%] max-w-sm rounded-l-(--radius-dialog)'
    : 'left-1/2 top-1/2 w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-(--radius-dialog)';

  return createPortal(
    <div className="fixed inset-0 z-[60]" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={() => canClose && onClose?.()} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        aria-busy={pending || undefined}
        tabIndex={-1}
        className={`absolute flex max-h-full flex-col overflow-y-auto border border-(--line) bg-(--surface) text-(--ink) shadow-xl ${placement} ${className}`}
      >
        <div className="p-5 pb-0">
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          {description && <p id={descId} className="mt-1 text-sm text-(--muted)">{description}</p>}
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
