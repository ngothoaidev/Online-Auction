import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Dialog from './Dialog';
import Button from './Button';

const newKey = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`);

/**
 * Review -> confirm flow for commitments (bids, Buy Now).
 *  - Opening creates ONE Idempotency-Key for this intent; cancelling sends nothing; reopening creates a new key.
 *  - Confirm is disabled while pending (no double submit). A lost response or 5xx keeps the key and offers "Retry"
 *    (the server replays the stored result instead of acting twice).
 *  - A refusal (4xx) is final for this intent: show the reason, the caller refreshes the canonical state.
 * `onConfirm(key)` resolves to { tone: 'success'|'info'|'warning', title, message } or throws (ApiError | network error).
 */
export type ReviewOutcome = { tone: 'success' | 'info' | 'warning'; title: string; message: ReactNode };
type Phase =
  | { name: 'review' | 'pending' }
  | ({ name: 'done' } & ReviewOutcome)
  | { name: 'failed'; retryable: boolean; message: string };
type Props = {
  open: boolean; onClose: () => void; onSettled?: (result: ReviewOutcome | null, error: unknown) => void;
  title: string; description?: ReactNode; rows?: [string, ReactNode][]; note?: ReactNode; confirmLabel?: string;
  onConfirm: (key: string) => Promise<ReviewOutcome>;
};

export default function ReviewDialog({ open, onClose, onSettled, title, description, rows = [], note, confirmLabel = 'Confirm', onConfirm }: Props) {
  const keyRef = useRef<string>('');
  const [phase, setPhase] = useState<Phase>({ name: 'review' });

  useEffect(() => {
    if (open) { keyRef.current = newKey(); setPhase({ name: 'review' }); }
  }, [open]);

  const submit = async () => {
    setPhase({ name: 'pending' });
    try {
      const result = await onConfirm(keyRef.current);
      setPhase({ name: 'done', ...result });
      onSettled?.(result, null);
    } catch (err) {
      const error = err as { status?: number | null; message?: string } | null;
      const status = error?.status;
      const retryable = status === undefined || status === null || status >= 500 || status === 429 || status === 408;
      setPhase({ name: 'failed', retryable, message: error?.message || 'Something went wrong' });
      if (!retryable) onSettled?.(null, error);
    }
  };

  const pending = phase.name === 'pending';
  const closed = phase.name === 'done' || (phase.name === 'failed' && !phase.retryable);

  return (
    <Dialog open={open} onClose={onClose} title={phase.name === 'done' ? phase.title : title} description={phase.name === 'review' || pending ? description : undefined} pending={pending}>
      {(phase.name === 'review' || pending) && (
        <>
          <dl className="divide-y divide-(--line) rounded-(--radius-control) border border-(--line)">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4 px-3 py-2.5">
                <dt className="text-sm text-(--muted)">{label}</dt>
                <dd className="font-lot text-right text-sm font-semibold text-(--ink)">{value}</dd>
              </div>
            ))}
          </dl>
          {note && <p className="mt-3 text-sm text-(--muted)">{note}</p>}
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button onClick={submit} loading={pending}>{pending ? 'Sending…' : confirmLabel}</Button>
          </div>
        </>
      )}
      {phase.name === 'failed' && (
        <div role="alert">
          <p className="text-sm text-(--danger)">{phase.message}</p>
          {phase.retryable && <p className="mt-2 text-sm text-(--muted)">Your request may or may not have reached us. Retrying is safe: it will not place the order twice.</p>}
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>{closed ? 'Close' : 'Cancel'}</Button>
            {phase.retryable && <Button onClick={submit}>Retry</Button>}
          </div>
        </div>
      )}
      {phase.name === 'done' && (
        <div role="status">
          <p className="text-sm text-(--ink)">{phase.message}</p>
          <div className="mt-5 flex justify-end"><Button onClick={onClose}>Done</Button></div>
        </div>
      )}
    </Dialog>
  );
}
