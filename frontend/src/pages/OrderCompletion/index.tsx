import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import orderService from '../../services/orderService';
import { formatDeadline } from '../../utils/format';
import { formatVnd } from '../../utils/money';
import MockPaymentPanel from './MockPaymentPanel';
import PaymentForm from './PaymentForm';
import ShippingForm from './ShippingForm';
import ReceiptPanel from './ReceiptPanel';
import ReviewPanel from './ReviewPanel';
import OrderChat from './OrderChat';
import CancelOrderDialog from './CancelOrderDialog';
import ProgressSteps from './ProgressSteps';
import { CheckIcon, ItemPhoto, WaitingNote, card } from './parts';
import { nextStep } from './nextStep';
import type { ApiError } from '../../services/apiClient';
import type { OrderView, PaymentSummary } from '../../types/api';

const MAX_SETTLEMENT_POLLS = 24;

export default function OrderCompletion() {
  const { auctionId } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [auction, setAuction] = useState<OrderView['auction'] | null>(null);
  const [payment, setPayment] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Settlement runs in the background worker: while it has not produced an order the API answers 202 and we poll.
  const [settlement, setSettlement] = useState<{ attempts: number; retryAfter?: number } | null>(null);
  const [channelChoice, setChannelChoice] = useState<string | null>(null); // buyer's pick while the server has not locked a payment mode
  const [showCancel, setShowCancel] = useState(false);

  const isSeller = user?.userId === order?.sellerId;
  const isBuyer = user?.userId === order?.buyerId;
  const step = order ? nextStep(order, isSeller ? 'seller' : 'buyer') : { yourTurn: false, title: '', detail: '' };
  const ended = order?.status === 'cancelled' || order?.status === 'payment_expired';
  const channels = payment?.available ?? ['manual'];
  // paymentMode starts as 'manual' (the default, not a choice); it becomes the gateway's name once a checkout starts,
  // and from then on the server refuses the other channel.
  const lockedMode = payment?.mode && payment.mode !== 'manual' ? payment.mode : null;
  const channel = lockedMode ?? (channels.length === 1 ? channels[0] : channelChoice);

  const loadData = async ({ attempts = 0, silent = attempts > 0 }: { attempts?: number; silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      const data = await orderService.getByAuctionId(auctionId);
      if (data.status === 'settlement_pending') {
        setSettlement({ attempts, retryAfter: data.retryAfter });
        return;
      }
      setSettlement(null);
      // The API nests { order, auction, buyer, seller, ...ReviewSubmitted } under `order`; the page keeps one flat order.
      if (data.order) {
        setOrder({
          ...data.order.order,
          auction: data.order.auction,
          buyer: data.order.buyer,
          seller: data.order.seller,
          buyerReviewSubmitted: data.order.buyerReviewSubmitted,
          sellerReviewSubmitted: data.order.sellerReviewSubmitted,
        });
        setAuction(data.order.auction);
        setPayment(data.payment ?? null);
      }
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  };
  const reloadQuietly = () => loadData({ silent: true });

  useEffect(() => { loadData(); }, [auctionId]);

  useEffect(() => {
    if (!settlement || settlement.attempts >= MAX_SETTLEMENT_POLLS) return undefined;
    const timer = setTimeout(() => loadData({ attempts: settlement.attempts + 1 }), Math.max(1, settlement.retryAfter || 5) * 1000);
    return () => clearTimeout(timer);
  }, [settlement]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-(--brand) border-t-transparent"></div>
      </div>
    );
  }

  if (settlement) {
    const slow = settlement.attempts >= MAX_SETTLEMENT_POLLS;
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }} role="status" aria-live="polite">
        <div className="text-center max-w-md px-4">
          {!slow && <div className="animate-spin rounded-full h-10 w-10 border-4 border-(--brand) border-t-transparent mx-auto mb-4"></div>}
          <h1 className="text-xl font-semibold text-(--text) mb-2">{slow ? 'Settlement is taking longer than usual' : 'Finalising the auction'}</h1>
          <p className="text-(--text-muted) mb-4">
            {slow ? 'The result has not been recorded yet. Your bid is safe; you can check again in a moment.' : 'The auction has closed and the result is being recorded. This page updates automatically.'}
          </p>
          {slow && <button onClick={() => { setSettlement(null); loadData(); }} className="px-5 py-2 rounded-xl bg-(--ink) text-(--on-ink) hover:opacity-90">Check again</button>}
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          {error && <p className="text-(--danger) mb-4">{error}</p>}
          <Link to="/" className="text-(--brand) hover:underline">Go back to home</Link>
        </div>
      </div>
    );
  }

  if (!isSeller && !isBuyer) {
    return (
      <div className="min-h-screen py-8" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-(--surface) rounded-(--radius-card) border border-(--line) p-8 text-center">
            <h1 className="text-2xl font-bold text-(--text) mb-4">Auction Ended</h1>
            <p className="text-(--text-muted) mb-6">This auction has ended. Only the seller and winner can view the order details.</p>
            {auction && (
              <div className="border border-(--border) rounded-xl p-6 mb-6">
                <ItemPhoto src={auction.image} alt={auction.title} className="w-48 h-48 rounded-lg mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-(--text)">{auction.title}</h2>
                <p className="text-(--text-muted) mt-2">Final Price: <span className="text-(--success) font-bold">{formatVnd(auction.currentPrice)}</span></p>
              </div>
            )}
            <Link to="/" className="inline-block px-6 py-3 bg-(--ink) text-(--on-ink) rounded-xl hover:opacity-90 transition">Browse Other Auctions</Link>
          </div>
        </div>
      </div>
    );
  }

  const status = order.status;
  return (
    <div className="min-h-screen py-8" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto px-4">
        {/* Header: what this person does next, the exact amount and the deadline, before anything else */}
        <div className={`${card} mb-6`}>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-(--muted)">
                Order #{order.id} · You are the {isSeller ? 'seller' : 'buyer'}
                {step.yourTurn && <> · <span className="font-semibold text-(--ink)">Your turn</span></>}
              </p>
              <h1 className={`mt-1 text-2xl font-semibold ${ended ? 'text-(--danger)' : 'text-(--ink)'}`}>{step.title}</h1>
              {step.detail && <p className="mt-1 text-(--muted)">{step.detail}</p>}
              <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
                <div>
                  <dt className="text-sm text-(--muted)">Item price</dt>
                  <dd className="font-lot text-xl font-semibold text-(--ink)">{formatVnd(order.finalPrice)}</dd>
                  <dd className="text-sm text-(--muted)">Shipping is arranged with the seller and not included.</dd>
                </div>
                {status === 'pending_payment' && order.paymentDueAt && (
                  <div>
                    <dt className="text-sm text-(--muted)">Pay before</dt>
                    <dd className="text-base font-semibold text-(--ink)">{formatDeadline(order.paymentDueAt)}</dd>
                    <dd className="text-sm text-(--muted)">Unpaid orders expire automatically.</dd>
                  </div>
                )}
              </dl>
            </div>
            {status === 'pending_payment' && isSeller && (
              <button onClick={() => setShowCancel(true)} className="px-4 py-2 bg-(--danger-soft) text-(--danger) font-semibold rounded-lg hover:opacity-90 transition">
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {/* Payment mode + deadline: this site never holds money */}
        {status === 'pending_payment' && (
          <div role="note" className="mb-6 rounded-2xl border border-(--line) bg-(--surface-sunken) p-4 text-sm text-(--ink)">
            {lockedMode === 'mock'
              ? <p><strong>Mock gateway (demo).</strong> This order is paid through a simulated gateway. No real money moves.</p>
              : <p>Payment goes directly from the buyer to the seller. This site does not process or hold payments.</p>}
          </div>
        )}

        {!ended && <ProgressSteps status={status} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className={card}>
              <h2 className="text-lg font-semibold text-(--text) mb-4">Auction Details</h2>
              {auction && (
                <div className="flex gap-4">
                  <ItemPhoto src={auction.image} alt={auction.title} className="w-24 h-24 rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-(--text) truncate">{auction.title}</h3>
                    <p className="text-(--text-muted) text-sm mt-1">Final Price: <span className="text-(--success) font-bold">{formatVnd(order.finalPrice)}</span></p>
                    <p className="text-(--text-muted) text-sm mt-1">Order ID: <span className="font-mono">{order.id}</span></p>
                  </div>
                </div>
              )}
            </div>

            {/* Step 1: Payment (buyer). One channel at a time: the server locks the mode once payment starts. */}
            {status === 'pending_payment' && isBuyer && !lockedMode && channels.length > 1 && (
              <fieldset className={card}>
                <legend className="sr-only">How will you pay?</legend>
                <h2 aria-hidden="true" className="text-lg font-semibold text-(--ink)">How will you pay?</h2>
                <p className="mt-1 text-sm text-(--muted)">An order is paid one way only. You can switch until you submit.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[['manual', 'Pay the seller directly', 'Bank transfer or cash, then upload your receipt here.'],
                    ['mock', 'Mock gateway (demo)', 'A simulated checkout. No real money moves.']].filter(([id]) => channels.includes(id)).map(([id, label, hint]) => (
                    <label key={id} className={`flex cursor-pointer gap-3 rounded-(--radius-control) border p-4 ${channel === id ? 'border-(--ink) bg-(--surface-sunken)' : 'border-(--input-border)'}`}>
                      <input type="radio" name="pay-channel" value={id} checked={channel === id} onChange={() => setChannelChoice(id)} className="mt-1" />
                      <span><span className="block font-semibold text-(--ink)">{label}</span><span className="block text-sm text-(--muted)">{hint}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {status === 'pending_payment' && isBuyer && channel === 'mock' && <MockPaymentPanel order={order} payment={payment} onChanged={reloadQuietly} />}
            {status === 'pending_payment' && isBuyer && channel === 'manual' && <PaymentForm order={order} onOrder={setOrder} />}
            {status === 'pending_payment' && isSeller && (
              <div className={card}>
                <h2 className="text-lg font-semibold text-(--text) mb-4">Waiting for Payment</h2>
                <WaitingNote>{payment?.mode === 'mock' ? 'The buyer is paying through the mock gateway (demo, no real money).' : 'Waiting for the buyer to submit payment details and shipping address.'}</WaitingNote>
              </div>
            )}

            {/* Step 2: Shipping */}
            {(status === 'pending_confirmation' || status === 'pending_delivery') && isSeller && <ShippingForm order={order} onOrder={setOrder} reload={reloadQuietly} />}
            {status === 'pending_confirmation' && isBuyer && (
              <div className={card}>
                <h2 className="text-lg font-semibold text-(--text) mb-4">Payment Submitted</h2>
                <div className="bg-(--success-soft) rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3 text-(--success)">
                    <CheckIcon />
                    <p>Your payment details have been submitted successfully!</p>
                  </div>
                </div>
                <WaitingNote>Waiting for the seller to confirm payment and provide shipping information.</WaitingNote>
              </div>
            )}
            {status === 'pending_delivery' && isBuyer && (
              <div className={card}>
                <h2 className="text-lg font-semibold text-(--text) mb-2">Payment Recorded</h2>
                <p className="text-(--text)">{order.paymentMode === 'mock' ? 'The mock gateway confirmed your payment (demo, no real money).' : 'Your payment was confirmed.'} Waiting for the seller to ship.</p>
              </div>
            )}

            {/* Step 3: Receipt */}
            {status === 'pending_receipt' && <ReceiptPanel order={order} isBuyer={isBuyer} onOrder={setOrder} />}

            {/* Step 4: Reviews */}
            {(status === 'pending_review' || status === 'completed') && <ReviewPanel order={order} isBuyer={isBuyer} reload={loadData} />}
          </div>

          <div className="lg:col-span-1">
            <OrderChat orderId={order.id} userId={user?.userId} title={`Chat with ${isSeller ? 'Buyer' : 'Seller'}`} />
          </div>
        </div>
      </div>

      <CancelOrderDialog order={order} open={showCancel} onClose={() => setShowCancel(false)} onOrder={setOrder} />
    </div>
  );
}
