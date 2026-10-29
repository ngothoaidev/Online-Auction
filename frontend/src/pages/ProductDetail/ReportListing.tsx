import { useState } from 'react';
import { Flag } from 'lucide-react';
import { apiFetch } from '../../services/apiClient';
import { Button, Dialog, Field } from '../../components/ui';
import type { ApiError } from '../../services/apiClient';
import type { FormEvent } from 'react';

const REASONS = [
  ['counterfeit', 'Counterfeit or replica'],
  ['prohibited', 'Prohibited item'],
  ['misleading', 'Misleading description or photos'],
  ['offensive', 'Offensive content'],
  ['other', 'Something else'],
];

/** Signed-in, non-owner users can flag a lot for the moderators. One open report per person per lot (server-enforced). */
export default function ReportListing({ auctionId }: { auctionId: number | string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState('');

  const close = () => { if (!pending) { setOpen(false); setError(''); } };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason) return setError('Choose a reason');
    if (reason === 'other' && !details.trim()) return setError('Describe the problem');
    setPending(true);
    setError('');
    try {
      await apiFetch(`/auction/${auctionId}/reports`, { method: 'POST', auth: 'required', body: { reason, details: details.trim() || undefined } });
      setDone('Thanks. An admin will review this listing.');
      setOpen(false);
    } catch (err) {
      if ((err as ApiError).code === 'ALREADY_REPORTED') { setDone('You already reported this listing. An admin will review it.'); setOpen(false); }
      else setError((err as ApiError).message || 'The report could not be sent. Try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-(--muted) underline hover:text-(--ink)">
        <Flag size={16} aria-hidden="true" /> Report this listing
      </button>
      <p role="status" className="text-sm text-(--ink)">{done}</p>
      <Dialog open={open} onClose={close} pending={pending} title="Report this listing" description="Tell the moderators what is wrong. The seller does not see who reported it.">
        <form onSubmit={submit} noValidate className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-(--ink)">Reason</legend>
            <div className="space-y-1">
              {REASONS.map(([value, label]) => (
                <label key={value} className="flex min-h-11 items-center gap-3 rounded-(--radius-control) px-2 text-sm text-(--ink) hover:bg-(--surface-hover)">
                  <input type="radio" name="report-reason" value={value} checked={reason === value} onChange={() => setReason(value)} className="h-4 w-4" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label={reason === 'other' ? 'Details' : 'Details (optional)'} hint="Up to 1000 characters.">
            <textarea rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} className="py-2" />
          </Field>
          {error && <p role="alert" className="text-sm font-medium text-(--danger)">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={close} disabled={pending}>Cancel</Button>
            <Button type="submit" variant="danger" loading={pending}>Send report</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
