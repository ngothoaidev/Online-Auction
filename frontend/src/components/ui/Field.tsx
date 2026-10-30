import { useId, cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';

/** Label + control + hint + error wired with ids (aria-describedby / aria-invalid). Pass a single <input|select|textarea> child. */
export default function Field({ label, hint, error, children, className = '' }: {
  label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string;
}) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  const control = isValidElement<{ className?: string }>(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        className: `min-h-12 w-full rounded-(--radius-control) border bg-(--input-bg) px-3 text-(--ink) placeholder:text-(--muted) ${error ? 'border-(--danger)' : 'border-(--input-border)'} ${children.props.className ?? ''}`,
      })
    : children;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-(--ink)">{label}</label>
      {control}
      {hint && <p id={`${id}-hint`} className="mt-1.5 text-sm text-(--muted)">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm font-medium text-(--danger)">{error}</p>}
    </div>
  );
}
