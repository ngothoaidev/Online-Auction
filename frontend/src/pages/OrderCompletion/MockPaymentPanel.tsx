import { useState } from 'react';
import { Button, Field } from '../../components/ui';
import { formatVnd } from '../../utils/money';
import orderService from '../../services/orderService';
import type { ApiError } from '../../services/apiClient';
import type { FormEvent } from 'react';
import type { OrderView, PaymentSummary } from '../../types/api';

const EXCEPTION_TEXT: Record<string, string> = {
  amount_mismatch: 'the amount reported by the gateway did not match this order',
  success_after_failure: 'the gateway reported a payment after the attempt had failed',
};

/**
 * Buyer checkout through the MOCK gateway (demo): no real money moves. The order amount comes from the server.
 * The simulate buttons stand in for what a real provider would do (success, failure, or a confirmation that never arrives).
 */
export default function MockPaymentPanel({ order, payment, onChanged }: { order: OrderView; payment: PaymentSummary | null; onChanged: () => unknown }) {
  const latest = payment?.attempts?.[0] ?? null;
  const open = latest?.status === 'created' ? latest : null;
  const [form, setForm] = useState({ shippingAddress: order.shippingAddress ?? '', buyerPhone: order.buyerPhone ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const run = async (label: string, fn: () => Promise<string>) => {
    if (pending) return;
    setPending(label);
    setStatus('');
    try {
      setStatus(await fn());
      await onChanged();
    } catch (err) {
      setStatus((err as ApiError).message || 'Something went wrong. Try again.');
      await onChanged();
    } finally {
      setPending(null);
    }
  };

  const start = (e: FormEvent) => {
    e.preventDefault();
    const next = {
      shippingAddress: form.shippingAddress.trim() ? '' : 'Enter the delivery address',
      buyerPhone: form.buyerPhone.trim() ? '' : 'Enter a contact phone number',
    };
    setErrors(next);
    if (next.shippingAddress || next.buyerPhone) return;
    run('start', async () => {
      await orderService.createPaymentAttempt(order.id, { shippingAddress: form.shippingAddress.trim(), buyerPhone: form.buyerPhone.trim() });
      return 'Mock checkout opened.';
    });
  };

  const simulate = (outcome: 'succeeded' | 'failed', deliver = true) => {
    if (!open) return; // the buttons only show while an attempt is open
    return run(`${outcome}-${deliver}`, async () => {
      const r = await orderService.simulateMockPayment(open.reference, outcome, deliver);
      if (!r.delivered) return 'The gateway took the payment but its confirmation was lost. The background reconciliation will record it within a minute or two.';
      if (r.outcome === 'applied') return 'Payment recorded. The seller can now ship.';
      if (r.outcome === 'failed_recorded') return 'The payment failed. Nothing was charged; you can try again.';
      return `The gateway answered "${r.outcome}". This payment needs a manual review.`;
    });
  };

  return (
    <section aria-labelledby="mock-pay-title" className="rounded-(--radius-card) border border-(--line) bg-(--surface) p-6">
      <h2 id="mock-pay-title" className="text-lg font-semibold text-(--ink)">Pay with the mock gateway</h2>
      <p className="mt-1 text-sm text-(--muted)">
        Demo mode: <strong className="text-(--ink)">no real money moves</strong>. The amount is fixed by the server: <span className="font-lot font-semibold text-(--ink)">{formatVnd(order.finalPrice)}</span>.
      </p>

      {latest?.status === 'failed' && !open && <p className="mt-3 text-sm text-(--warning)">The last attempt failed. You can start a new one.</p>}
      {latest?.status === 'exception' && (
        <p className="mt-3 text-sm text-(--danger)">
          A payment needs review: {EXCEPTION_TEXT[latest.exceptionReason ?? ''] ?? latest.exceptionReason?.replace(/_/g, ' ')}. Contact the seller or support before paying again.
        </p>
      )}

      {open ? (
        <div className="mt-4 space-y-3">
          <dl className="grid grid-cols-2 gap-2 rounded-(--radius-control) bg-(--surface-sunken) p-3 text-sm">
            <dt className="text-(--muted)">Reference</dt><dd className="font-lot break-all text-(--ink)">{open.reference}</dd>
            <dt className="text-(--muted)">Amount</dt><dd className="font-lot text-(--ink)">{formatVnd(open.amount)}</dd>
          </dl>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button loading={pending === 'succeeded-true'} disabled={Boolean(pending)} onClick={() => simulate('succeeded')}>Simulate successful payment</Button>
            <Button variant="secondary" loading={pending === 'failed-true'} disabled={Boolean(pending)} onClick={() => simulate('failed')}>Simulate failed payment</Button>
          </div>
          <Button variant="ghost" size="sm" disabled={Boolean(pending)} onClick={() => simulate('succeeded', false)}>Simulate a lost confirmation</Button>
        </div>
      ) : (
        <form onSubmit={start} noValidate className="mt-4 space-y-3">
          <Field label="Delivery address" error={errors.shippingAddress}>
            <textarea rows={3} value={form.shippingAddress} onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })} className="py-2" />
          </Field>
          <Field label="Contact phone" error={errors.buyerPhone}>
            <input type="tel" autoComplete="tel" value={form.buyerPhone} onChange={(e) => setForm({ ...form, buyerPhone: e.target.value })} />
          </Field>
          <Button type="submit" className="w-full" loading={pending === 'start'} disabled={Boolean(pending)}>Start mock payment</Button>
        </form>
      )}
      <p role="status" className="mt-3 text-sm text-(--ink)">{status}</p>
    </section>
  );
}
