// What this participant should do now, from the order state machine (backend/domain/orderTransitions.ts).
// Manual:  pending_payment -> (buyer sends proof) pending_confirmation -> (seller confirms + ships) pending_receipt
// Gateway: pending_payment -> (payment recorded)  pending_delivery     -> (seller ships)            pending_receipt
// Then:    pending_receipt -> (buyer confirms receipt) pending_review -> (both reviewed) completed
// `yourTurn` marks the steps that wait on THIS person, so the page can lead with them.
type StepOrder = { status: string; buyerReviewSubmitted?: boolean; sellerReviewSubmitted?: boolean; cancelReason?: string | null };

export function nextStep(order: StepOrder, role: 'buyer' | 'seller' | string) {
  const buyer = role === 'buyer';
  const reviewed = buyer ? order.buyerReviewSubmitted : order.sellerReviewSubmitted;
  switch (order.status) {
    case 'pending_payment':
      return buyer
        ? { yourTurn: true, title: 'Pay the seller', detail: 'Choose how you pay below. Your order expires if no payment is recorded before the deadline.' }
        : { yourTurn: false, title: 'Waiting for the buyer to pay', detail: 'You can cancel the order while it is unpaid.' };
    case 'pending_confirmation':
      return buyer
        ? { yourTurn: false, title: 'Waiting for the seller', detail: 'The seller checks your payment proof, then ships the item.' }
        : { yourTurn: true, title: 'Check the payment and ship', detail: "Open the buyer's proof, confirm the money arrived, then add the shipping details." };
    case 'pending_delivery':
      return buyer
        ? { yourTurn: false, title: 'Paid. Waiting for the seller to ship', detail: 'You will see the tracking details here once the item is on its way.' }
        : { yourTurn: true, title: 'Payment received. Ship the item', detail: 'Add the shipping proof and tracking number below.' };
    case 'pending_receipt':
      return buyer
        ? { yourTurn: true, title: 'Confirm you received the item', detail: 'Only confirm once the item is in your hands.' }
        : { yourTurn: false, title: 'Shipped. Waiting for the buyer', detail: 'The buyer confirms receipt when the item arrives.' };
    case 'pending_review':
      return reviewed
        ? { yourTurn: false, title: 'Waiting for the other review', detail: 'The order completes when both of you have left a review.' }
        : { yourTurn: true, title: buyer ? 'Review the seller' : 'Review the buyer', detail: 'Your review completes your side of the order.' };
    case 'completed':
      return { yourTurn: false, title: 'Order complete', detail: 'Payment, delivery and both reviews are done.' };
    case 'cancelled':
      return { yourTurn: false, title: 'Order cancelled', detail: order.cancelReason ? `Reason: ${order.cancelReason}` : 'This order will not continue.' };
    case 'payment_expired':
      return { yourTurn: false, title: 'Payment window closed', detail: 'No payment was recorded before the deadline, so this order expired.' };
    default:
      return { yourTurn: false, title: 'Order', detail: '' };
  }
}
