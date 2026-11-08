import { useState } from 'react';
import { useFeedback } from '../../components/ui/Feedback';
import ProofLink from '../../components/ProofLink';
import orderService from '../../services/orderService';
import { confirmPaymentSchema } from '../../schemas/order.schemas';
import { validateForm } from '../../utils/validation';
import ProofField from './ProofField';
import { card, fieldLabel, input, primaryButton } from './parts';
import type { FormEvent } from 'react';
import type { ApiError } from '../../services/apiClient';
import type { OrderView } from '../../types/api';
import type { Proof } from './ProofField';

/**
 * Seller, step 2: check the buyer's payment and ship. pending_confirmation = confirm a manual payment and ship;
 * pending_delivery = the gateway already recorded the payment, so only ship.
 */
export default function ShippingForm({ order, onOrder, reload }: { order: OrderView; onOrder: (order: OrderView) => void; reload: () => void }) {
  const { notify } = useFeedback();
  const [proof, setProof] = useState<Proof>({ assetId: '', preview: '' });
  const [form, setForm] = useState({ trackingNumber: '', shippingNotes: '' });
  const [submitting, setSubmitting] = useState(false);
  const shipOnly = order.status === 'pending_delivery';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const validation = validateForm(confirmPaymentSchema, { ...form, shippingProofAssetId: proof.assetId });
    if (!validation.success) {
      notify(validation.message, 'error');
      return;
    }
    try {
      setSubmitting(true);
      const result = shipOnly
        ? await orderService.submitShipping(order.id, validation.data)
        : await orderService.confirmPayment(order.id, validation.data);
      onOrder(result.order);
      reload();
    } catch (err) {
      notify((err as ApiError).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={card}>
      <h2 className="text-lg font-semibold text-(--text) mb-4">{shipOnly ? 'Payment Recorded: Ship the Item' : 'Confirm Payment & Ship'}</h2>

      <div className="bg-(--surface-sunken) rounded-xl p-4 mb-6">
        <h3 className="font-medium text-(--ink) mb-2">Buyer's Payment Info</h3>
        <div className="space-y-2 text-sm">
          {shipOnly ? (
            <p><span className="text-(--text-muted)">Payment:</span>{' '}
              <span className="text-(--text)">recorded by the {order.paymentMode === 'mock' ? 'mock gateway (demo, no real money)' : 'payment gateway'}{order.paymentConfirmedAt ? ` on ${new Date(order.paymentConfirmedAt).toLocaleString()}` : ''}</span>
            </p>
          ) : (
            <p><span className="text-(--text-muted)">Payment Proof:</span>{' '}
              <ProofLink path={order.paymentProofUrl ?? ''}>View Receipt</ProofLink>
            </p>
          )}
          <p><span className="text-(--text-muted)">Shipping Address:</span>{' '}<span className="text-(--text)">{order.shippingAddress}</span></p>
          <p><span className="text-(--text-muted)">Contact Phone:</span>{' '}<span className="text-(--text)">{order.buyerPhone}</span></p>
          {order.buyerNotes && <p><span className="text-(--text-muted)">Notes:</span>{' '}<span className="text-(--text)">{order.buyerNotes}</span></p>}
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <ProofField orderId={order.id} purpose="shipping" label="Shipping Invoice" value={proof} onChange={setProof} />
        <div>
          <label className={fieldLabel}>Tracking Number</label>
          <input
            type="text"
            value={form.trackingNumber}
            onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })}
            className={input}
            placeholder="Enter tracking number..."
            required
          />
        </div>
        <div>
          <label className={fieldLabel}>Shipping Notes (Optional)</label>
          <textarea
            value={form.shippingNotes}
            onChange={(e) => setForm({ ...form, shippingNotes: e.target.value })}
            className={input}
            rows={2}
            placeholder="Estimated delivery time, carrier info..."
          />
        </div>
        <button type="submit" disabled={submitting} className={primaryButton}>
          {submitting ? 'Confirming...' : shipOnly ? 'Send Shipping Info' : 'Confirm Payment & Send Shipping Info'}
        </button>
      </form>
    </div>
  );
}
