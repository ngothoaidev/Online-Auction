import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Field } from '../../components/ui';
import { formatVnd } from '../../utils/money';
import orderService from '../../services/orderService';
import type { ApiError } from '../../services/apiClient';
import type { FormEvent } from 'react';
import type { OrderView, PaymentSummary } from '../../types/api';

const CONFIRM_POLL_MS = 3000;

/**
 * Buyer checkout through Stripe in TEST mode: the buyer is sent to Stripe's hosted page and comes back with
 * ?checkout=done. The order only moves on when Stripe's signed webhook (or reconciliation) confirms the payment.
 */
export default function StripePaymentPanel({ order, payment, onChanged }: { order: OrderView; payment: PaymentSummary | null; onChanged: () => unknown }) {
  const [params] = useSearchParams();
  const returned = params.get('checkout');
  const latest = payment?.attempts?.[0] ?? null;
  const [form, setForm] = useState({ shippingAddress: order.shippingAddress ?? '', buyerPhone: order.buyerPhone ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState('');

  // Back from Stripe: the webhook usually lands within seconds; refresh until the order moves on.
  useEffect(() => {
    if (returned !== 'done') return undefined;
    const timer = setInterval(() => onChanged(), CONFIRM_POLL_MS);
    return () => clearInterval(timer);
  }, [returned, onChanged]);

  const start = async (e: FormEvent) => {
    e.preventDefault();
    const next = {
      shippingAddress: form.shippingAddress.trim() ? '' : 'Enter the delivery address',
      buyerPhone: form.buyerPhone.trim() ? '' : 'Enter a contact phone number',
    };
    setErrors(next);
    if (next.shippingAddress || next.buyerPhone || pending) return;
    setPending(true);
    setStatus('');
    try {
      const r = await orderService.createPaymentAttempt(order.id, { shippingAddress: form.shippingAddress.trim(), buyerPhone: form.buyerPhone.trim() });
      if (!r.checkoutUrl) throw new Error('Stripe did not return a checkout page. Try again.');
      window.location.assign(r.checkoutUrl);
    } catch (err) {
      setStatus((err as ApiError).message || 'Something went wrong. Try again.');
      setPending(false);
    }
  };

  return (
    <section aria-labelledby="stripe-pay-title" className="rounded-(--radius-card) border border-(--line) bg-(--surface) p-6">
      <h2 id="stripe-pay-title" className="text-lg font-semibold text-(--ink)">Pay by card (Stripe test mode)</h2>
      <p className="mt-1 text-sm text-(--muted)">
        Stripe runs in test mode: <strong className="text-(--ink)">no real money moves</strong>. Use card <span className="font-lot text-(--ink)">4242 4242 4242 4242</span>, any future date and any CVC.
        The amount is fixed by the server: <span className="font-lot font-semibold text-(--ink)">{formatVnd(order.finalPrice)}</span>.
      </p>

      {returned === 'done' ? (
        <p role="status" className="mt-4 rounded-(--radius-control) bg-(--surface-sunken) p-3 text-sm text-(--ink)">
          Stripe has your payment. Waiting for its confirmation; this page updates by itself.
        </p>
      ) : (
        <>
          {returned === 'cancelled' && <p className="mt-3 text-sm text-(--warning)">The checkout was cancelled. Nothing was charged.</p>}
          {latest?.status === 'failed' && returned !== 'cancelled' && <p className="mt-3 text-sm text-(--warning)">The last checkout expired or failed. You can start a new one.</p>}
          {latest?.status === 'exception' && <p className="mt-3 text-sm text-(--danger)">A payment needs review. Contact the seller or support before paying again.</p>}
          <form onSubmit={start} noValidate className="mt-4 space-y-3">
            <Field label="Delivery address" error={errors.shippingAddress}>
              <textarea rows={3} value={form.shippingAddress} onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })} className="py-2" />
            </Field>
            <Field label="Contact phone" error={errors.buyerPhone}>
              <input type="tel" autoComplete="tel" value={form.buyerPhone} onChange={(e) => setForm({ ...form, buyerPhone: e.target.value })} />
            </Field>
            <Button type="submit" className="w-full" loading={pending}>Continue to Stripe checkout</Button>
          </form>
          <p role="status" className="mt-3 text-sm text-(--ink)">{status}</p>
        </>
      )}
    </section>
  );
}
