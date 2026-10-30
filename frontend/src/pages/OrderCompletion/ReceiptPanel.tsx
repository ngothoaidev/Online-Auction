import { useState } from 'react';
import { useFeedback } from '../../components/ui/Feedback';
import ProofLink from '../../components/ProofLink';
import orderService from '../../services/orderService';
import { WaitingNote, card, primaryButton } from './parts';
import type { ApiError } from '../../services/apiClient';
import type { OrderView } from '../../types/api';

/** Step 3: the item is on its way; the buyer confirms receipt. */
export default function ReceiptPanel({ order, isBuyer, onOrder }: { order: OrderView; isBuyer: boolean; onOrder: (order: OrderView) => void }) {
  const { confirm, notify } = useFeedback();
  const [submitting, setSubmitting] = useState(false);

  const confirmReceipt = async () => {
    if (submitting) return;
    if (!(await confirm({ title: 'Confirm receipt?', message: 'Confirm only once the item has arrived as described. The seller is then asked to review you.', confirmLabel: 'I received it' }))) return;
    try {
      setSubmitting(true);
      onOrder((await orderService.confirmReceipt(order.id)).order);
    } catch (err) {
      notify((err as ApiError).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={card}>
      <h2 className="text-lg font-semibold text-(--text) mb-4">{isBuyer ? 'Item Shipped' : 'Item in Transit'}</h2>
      <div className="bg-(--surface-sunken) rounded-xl p-4 mb-4">
        <h3 className="font-medium text-(--ink) mb-2">Shipping Information</h3>
        <div className="space-y-2 text-sm">
          <p><span className="text-(--text-muted)">Shipping Invoice:</span>{' '}<ProofLink path={order.shippingProofUrl ?? ''}>View Invoice</ProofLink></p>
          <p><span className="text-(--text-muted)">Tracking Number:</span>{' '}<span className="text-(--text) font-mono">{order.trackingNumber}</span></p>
          {order.shippingNotes && <p><span className="text-(--text-muted)">Notes:</span>{' '}<span className="text-(--text)">{order.shippingNotes}</span></p>}
        </div>
      </div>
      {isBuyer ? (
        <button onClick={confirmReceipt} disabled={submitting} className={primaryButton}>
          {submitting ? 'Confirming...' : 'I Have Received the Item'}
        </button>
      ) : (
        <WaitingNote>Waiting for the buyer to confirm receipt of the item.</WaitingNote>
      )}
    </div>
  );
}
