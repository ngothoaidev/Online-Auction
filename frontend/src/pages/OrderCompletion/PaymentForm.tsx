import { useState } from 'react';
import { useFeedback } from '../../components/ui/Feedback';
import orderService from '../../services/orderService';
import { paymentFormSchema } from '../../schemas/order.schemas';
import { validateForm } from '../../utils/validation';
import ProofField from './ProofField';
import { card, fieldLabel, input, primaryButton } from './parts';
import type { FormEvent } from 'react';
import type { ApiError } from '../../services/apiClient';
import type { OrderView } from '../../types/api';
import type { Proof } from './ProofField';

/** Buyer, manual channel: receipt + shipping address + phone. */
export default function PaymentForm({ order, onChanged }: { order: OrderView; onChanged: () => void }) {
  const { notify } = useFeedback();
  const [proof, setProof] = useState<Proof>({ assetId: '', preview: '' });
  const [form, setForm] = useState({ shippingAddress: '', buyerPhone: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const validation = validateForm(paymentFormSchema, { ...form, paymentProofAssetId: proof.assetId });
    if (!validation.success) {
      notify(validation.message, 'error');
      return;
    }
    try {
      setSubmitting(true);
      await orderService.submitPayment(order.id, validation.data);
      onChanged();
    } catch (err) {
      notify((err as ApiError).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={card}>
      <h2 className="text-lg font-semibold text-(--text) mb-4">Submit Payment Details</h2>
      <form onSubmit={submit} className="space-y-4">
        <ProofField orderId={order.id} purpose="payment" label="Payment Proof (Receipt/Screenshot)" value={proof} onChange={setProof} />
        <div>
          <label className={fieldLabel}>Shipping Address</label>
          <textarea
            value={form.shippingAddress}
            onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
            className={input}
            rows={3}
            placeholder="Enter your full shipping address..."
            required
          />
        </div>
        <div>
          <label className={fieldLabel}>Contact Phone</label>
          <input
            type="tel"
            value={form.buyerPhone}
            onChange={(e) => setForm({ ...form, buyerPhone: e.target.value })}
            className={input}
            placeholder="+84 xxx xxx xxx"
            required
          />
        </div>
        <div>
          <label className={fieldLabel}>Additional Notes (Optional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={input}
            rows={2}
            placeholder="Any special delivery instructions..."
          />
        </div>
        <button type="submit" disabled={submitting} className={primaryButton}>
          {submitting ? 'Submitting...' : 'Submit Payment Details'}
        </button>
      </form>
    </div>
  );
}
