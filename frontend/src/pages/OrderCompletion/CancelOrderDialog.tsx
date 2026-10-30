import { useState } from 'react';
import { Dialog } from '../../components/ui';
import { useFeedback } from '../../components/ui/Feedback';
import orderService from '../../services/orderService';
import { cancelOrderSchema } from '../../schemas/order.schemas';
import { validateForm } from '../../utils/validation';
import { input } from './parts';
import type { FormEvent } from 'react';
import type { ApiError } from '../../services/apiClient';
import type { OrderView } from '../../types/api';

/** Seller cancels an unpaid order, with a reason. */
export default function CancelOrderDialog({ order, open, onClose, onOrder }: {
  order: OrderView; open: boolean; onClose: () => void; onOrder: (order: OrderView) => void;
}) {
  const { notify } = useFeedback();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const validation = validateForm(cancelOrderSchema, { reason });
    if (!validation.success) {
      notify(validation.message, 'error');
      return;
    }
    try {
      setSubmitting(true);
      onOrder((await orderService.cancelOrder(order.id, validation.data)).order);
      onClose();
    } catch (err) {
      notify((err as ApiError).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Cancel order" pending={submitting}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="cancel-reason" className="block text-sm font-medium text-(--text) mb-2">Reason for Cancellation</label>
          <textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={input}
            rows={3}
            placeholder="Explain why you are cancelling..."
            required
          />
        </div>
        <p className="text-sm text-(--text-muted)">Cancelling does not leave a review for the buyer.</p>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-3 border border-(--border) text-(--text) rounded-xl font-semibold hover:bg-(--surface-hover) transition disabled:opacity-50"
          >
            Keep Order
          </button>
          <button type="submit" disabled={submitting} className="flex-1 py-3 bg-(--danger) text-(--on-ink) rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50">
            {submitting ? 'Cancelling...' : 'Cancel Order'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
