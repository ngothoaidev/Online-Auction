import { useState, useEffect, useRef } from 'react';
import { useFeedback } from '../../components/ui/Feedback.jsx';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import orderService from '../../services/orderService';
import { formatTimeAgo, formatDeadline } from '../../utils/format';
import { formatVnd } from '../../utils/money.js';
import ImageUploadModal from '../../components/ImageUploadModal';
import ProofLink from '../../components/ProofLink';
import auctionService from '../../services/auctionService';
import { paymentFormSchema, confirmPaymentSchema, reviewFormSchema, cancelOrderSchema, chatMessageSchema } from '../../schemas/order.schemas';
import { validateForm } from '../../utils/validation';
import MockPaymentPanel from './MockPaymentPanel.jsx';
import { Dialog } from '../../components/ui';
import { nextStep } from './nextStep.js';

// Status -> step. Step 2 is the seller's turn in both payment paths: confirm a manual payment and ship
// (pending_confirmation), or ship after the gateway recorded the payment (pending_delivery).
const STATUS_STEPS = {
  pending_payment: 1,
  pending_confirmation: 2,
  pending_delivery: 2,
  pending_receipt: 3,
  pending_review: 4,
  completed: 5,
  cancelled: -1,
  payment_expired: -1,
};

const STEP_LABELS = ['Payment', 'Shipping', 'Receipt', 'Reviews'];

const ItemPhoto = ({ src, alt, className }) => (src
  ? <img src={src} alt={alt} className={`object-cover ${className}`} />
  : <div role="img" aria-label={`${alt}: no photo`} className={`flex items-center justify-center bg-(--surface-sunken) text-xs text-(--muted) ${className}`}>No photo</div>);

const ChatAvatar = ({ user }) => (user?.avatarUrl
  ? <img src={user.avatarUrl} alt="" className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />
  : <span aria-hidden="true" className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-(--surface-sunken) text-xs font-semibold text-(--muted)">{(user?.username ?? '?')[0].toUpperCase()}</span>);

export default function OrderCompletion() {
  const { confirm, notify } = useFeedback();
  const { auctionId } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [auction, setAuction] = useState(null);
  const [payment, setPayment] = useState(null); // { mode, available, attempts }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Settlement runs in the background worker: while it has not produced an order the API answers 202 and we poll.
  const [settlement, setSettlement] = useState(null); // { attempts, retryAfter }
  const MAX_SETTLEMENT_POLLS = 24;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatRef = useRef(null);
  const [channelChoice, setChannelChoice] = useState(null); // buyer's pick while the server has not locked a payment mode

  // Form states
  const [paymentForm, setPaymentForm] = useState({
    paymentProofAssetId: '',
    paymentProofPreview: '', // local blob preview of the selected file only
    shippingAddress: '',
    buyerPhone: '',
    notes: '',
  });
  const [confirmForm, setConfirmForm] = useState({
    shippingProofAssetId: '',
    shippingProofPreview: '',
    trackingNumber: '',
    shippingNotes: '',
  });
  const [reviewForm, setReviewForm] = useState({
    rating: 1,
    comment: '',
  });
  const [cancelForm, setCancelForm] = useState({
    reason: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUploadType, setImageUploadType] = useState(null); // 'payment' or 'shipping'

  // Determine user role
  const isSeller = user?.userId === order?.sellerId;
  const isBuyer = user?.userId === order?.buyerId;
  const isParticipant = isSeller || isBuyer;
  const step = order ? nextStep(order, isSeller ? 'seller' : 'buyer') : { yourTurn: false, title: '', detail: '' };
  const ended = order?.status === 'cancelled' || order?.status === 'payment_expired';
  const channels = payment?.available ?? ['manual'];
  // paymentMode starts as 'manual' (the default, not a choice); it becomes the gateway's name once a checkout starts,
  // and from then on the server refuses the other channel.
  const lockedMode = payment?.mode && payment.mode !== 'manual' ? payment.mode : null;
  const channel = lockedMode ?? (channels.length === 1 ? channels[0] : channelChoice);
  useEffect(() => {
    loadData();
  }, [auctionId]);

  useEffect(() => {
    if (!settlement || settlement.attempts >= MAX_SETTLEMENT_POLLS) return undefined;
    const timer = setTimeout(() => loadData({ attempts: settlement.attempts + 1 }), Math.max(1, settlement.retryAfter || 5) * 1000);
    return () => clearTimeout(timer);
  }, [settlement]);

  useEffect(() => {
    if (order?.id) {
      loadMessages();
    }
  }, [order?.id]);

  useEffect(() => {
    const box = chatRef.current;
    if (box) box.scrollTop = box.scrollHeight; // newest message in view, inside the chat box only
  }, [messages]);

  const loadData = async ({ attempts = 0, silent = attempts > 0 } = {}) => {
    try {
      if (!silent) setLoading(true);
      const orderData = await orderService.getByAuctionId(auctionId);
      if (orderData.status === 'settlement_pending') {
        setSettlement({ attempts, retryAfter: orderData.retryAfter });
        return;
      }
      setSettlement(null);
      // The backend returns order with nested structure from getOrderWithDetails
      // It spreads { order: {...}, auction: {...}, buyer: {...}, seller: {...} }
      if (orderData.order) {
        // Need to flatten the structure properly
        const flattenedOrder = {
          ...orderData.order.order, // The actual order data
          auction: orderData.order.auction,
          buyer: orderData.order.buyer,
          seller: orderData.order.seller,
          buyerReviewSubmitted: orderData.order.buyerReviewSubmitted,
          sellerReviewSubmitted: orderData.order.sellerReviewSubmitted,
        };
        setOrder(flattenedOrder);
        setAuction(orderData.order.auction);
        setPayment(orderData.payment ?? null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const data = await orderService.getMessages(order.id);
      setMessages(data.messages || []);
      orderService.markMessagesRead(order.id).catch(() => {});
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (sendingMessage) return;

    // Validate message
    const validation = validateForm(chatMessageSchema, { message: newMessage });
    if (!validation.success) {
      notify(validation.message, 'error');
      return;
    }

    try {
      setSendingMessage(true);
      await orderService.sendMessage(order.id, validation.data.message);
      setNewMessage('');
      await loadMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      notify(err.message || 'Failed to send message', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // Validate payment form
    const validation = validateForm(paymentFormSchema, paymentForm);
    if (!validation.success) {
      notify(validation.message, 'error');
      return;
    }

    try {
      setSubmitting(true);
      const result = await orderService.submitPayment(order.id, validation.data);
      setOrder(result.order);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // Validate confirm payment form
    const validation = validateForm(confirmPaymentSchema, confirmForm);
    if (!validation.success) {
      notify(validation.message, 'error');
      return;
    }

    try {
      setSubmitting(true);
      // pending_delivery: the payment was already recorded by the gateway, so the seller only ships
      const result = order.status === 'pending_delivery'
        ? await orderService.submitShipping(order.id, validation.data)
        : await orderService.confirmPayment(order.id, validation.data);
      setOrder(result.order);
      loadData({ silent: true });
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (submitting) return;

    if (!(await confirm({ title: 'Confirm receipt?', message: 'Confirm only once the item has arrived as described. The seller is then asked to review you.', confirmLabel: 'I received it' }))) return;

    try {
      setSubmitting(true);
      const result = await orderService.confirmReceipt(order.id);
      setOrder(result.order);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // Validate review form
    const validation = validateForm(reviewFormSchema, reviewForm);
    if (!validation.success) {
      notify(validation.message, 'error');
      return;
    }

    try {
      setSubmitting(true);
      const result = await orderService.submitReview(order.id, validation.data);
      
      // Reload the full order data to get updated status
      await loadData();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (file) => {
    try {
      // Private upload bound to this order and purpose; only the returned asset id is ever sent back to the API.
      const uploaded = await orderService.uploadProof(order.id, imageUploadType, file);
      const preview = URL.createObjectURL(file);

      if (imageUploadType === 'payment') {
        setPaymentForm((f) => ({ ...f, paymentProofAssetId: uploaded.assetId, paymentProofPreview: preview })); // keep what was typed during the upload
      } else if (imageUploadType === 'shipping') {
        setConfirmForm((f) => ({ ...f, shippingProofAssetId: uploaded.assetId, shippingProofPreview: preview }));
      }
    } catch (error) {
      console.error('Image upload error:', error);
      notify('Failed to upload image: ' + error.message, 'error');
      throw error;
    }
  };

  const openImageUpload = (type) => {
    setImageUploadType(type);
    setShowImageModal(true);
  };

  const handleCancelOrder = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // Validate cancel form
    const validation = validateForm(cancelOrderSchema, cancelForm);
    if (!validation.success) {
      notify(validation.message, 'error');
      return;
    }

    try {
      setSubmitting(true);
      const result = await orderService.cancelOrder(order.id, validation.data);
      setOrder(result.order);
      setShowCancelModal(false);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getCurrentStep = () => {
    return STATUS_STEPS[order?.status] || 1;
  };

  const canUserReview = () => {
    if (order?.status !== 'pending_review' && order?.status !== 'completed') return false;
    if (isBuyer && !order?.buyerReviewSubmitted) return true;
    if (isSeller && !order?.sellerReviewSubmitted) return true;
    return false;
  };

  const hasUserReviewed = () => {
    if (isBuyer) return order?.buyerReviewSubmitted;
    if (isSeller) return order?.sellerReviewSubmitted;
    return false;
  };

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <p className="text-(--danger) mb-4">{error}</p>
          <Link to="/" className="text-(--brand) hover:underline">Go back to home</Link>
        </div>
      </div>
    );
  }

  if (!loading && !isParticipant && order) {
    return (
      <div className="min-h-screen py-8" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-(--surface) rounded-(--radius-card) border border-(--line) p-8 text-center">
            <h1 className="text-2xl font-bold text-(--text) mb-4">Auction Ended</h1>
            <p className="text-(--text-muted) mb-6">
              This auction has ended. Only the seller and winner can view the order details.
            </p>
            {auction && (
              <div className="border border-(--border) rounded-xl p-6 mb-6">
                <ItemPhoto src={auction.image} alt={auction.title} className="w-48 h-48 rounded-lg mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-(--text)">{auction.title}</h2>
                <p className="text-(--text-muted) mt-2">
                  Final Price: <span className="text-(--success) font-bold">{formatVnd(auction.currentPrice)}</span>
                </p>
              </div>
            )}
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-(--ink) text-(--on-ink) rounded-xl hover:opacity-90 transition"
            >
              Browse Other Auctions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto px-4">
        {/* Header: what this person does next, the exact amount and the deadline, before anything else */}
        <div className="bg-(--surface) rounded-(--radius-card) border border-(--line) p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-(--muted)">
                Order #{order?.id} · You are the {isSeller ? 'seller' : 'buyer'}
                {step.yourTurn && <> · <span className="font-semibold text-(--ink)">Your turn</span></>}
              </p>
              <h1 className={`mt-1 text-2xl font-semibold ${ended ? 'text-(--danger)' : 'text-(--ink)'}`}>{step.title}</h1>
              {step.detail && <p className="mt-1 text-(--muted)">{step.detail}</p>}
              <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
                <div>
                  <dt className="text-sm text-(--muted)">Item price</dt>
                  <dd className="font-lot text-xl font-semibold text-(--ink)">{formatVnd(order?.finalPrice)}</dd>
                  <dd className="text-sm text-(--muted)">Shipping is arranged with the seller and not included.</dd>
                </div>
                {order?.status === 'pending_payment' && order?.paymentDueAt && (
                  <div>
                    <dt className="text-sm text-(--muted)">Pay before</dt>
                    <dd className="text-base font-semibold text-(--ink)">{formatDeadline(order.paymentDueAt)}</dd>
                    <dd className="text-sm text-(--muted)">Unpaid orders expire automatically.</dd>
                  </div>
                )}
              </dl>
            </div>
            {order?.status === 'pending_payment' && isSeller && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2 bg-(--danger-soft) text-(--danger) font-semibold rounded-lg hover:opacity-90 transition"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {/* Payment mode + deadline: this site never holds money */}
        {order?.status === 'pending_payment' && (
          <div role="note" className="mb-6 rounded-2xl border border-(--line) bg-(--surface-sunken) p-4 text-sm text-(--ink)">
            {lockedMode === 'mock' ? (
              <p><strong>Mock gateway (demo).</strong> This order is paid through a simulated gateway. No real money moves.</p>
            ) : (
              <p>Payment goes directly from the buyer to the seller. This site does not process or hold payments.</p>
            )}
          </div>
        )}

        {/* Progress Steps */}
        {order?.status !== 'cancelled' && order?.status !== 'payment_expired' && (
          <div className="bg-(--surface) rounded-(--radius-card) border border-(--line) p-6 mb-6">
            <div className="flex items-center justify-between">
              {STEP_LABELS.map((label, index) => {
                const stepNum = index + 1;
                const currentStep = getCurrentStep();
                const isCompleted = stepNum < currentStep;
                const isCurrent = stepNum === currentStep;

                return (
                  <div key={label} className="flex-1 relative">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 z-20 rounded-full flex items-center justify-center font-semibold transition-colors ${
                          isCompleted
                            ? 'bg-(--success) text-(--on-ink)'
                            : isCurrent
                            ? 'bg-(--ink) text-(--on-ink)'
                            : 'bg-(--surface-sunken) text-(--muted)'
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-5 h-5 z-20" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          stepNum
                        )}
                      </div>
                      <span className={`mt-2 text-sm font-medium ${isCurrent ? 'text-(--brand)' : 'text-(--text-muted)'}`}>
                        {label}
                      </span>
                    </div>
                    {index < STEP_LABELS.length - 1 && (
                      <div
                        className={`absolute top-5 left-1/2 w-full h-0.5 z-10 ${
                          stepNum < currentStep ? 'bg-(--success)' : 'bg-(--surface-sunken)'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Auction Info */}
            <div className="bg-(--surface) rounded-(--radius-card) border border-(--line) p-6">
              <h2 className="text-lg font-semibold text-(--text) mb-4">Auction Details</h2>
              {auction && (
                <div className="flex gap-4">
                  <ItemPhoto src={auction.image} alt={auction.title} className="w-24 h-24 rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-(--text) truncate">{auction.title}</h3>
                    <p className="text-(--text-muted) text-sm mt-1">
                      Final Price: <span className="text-(--success) font-bold">{formatVnd(order?.finalPrice)}</span>
                    </p>
                    <p className="text-(--text-muted) text-sm mt-1">
                      Order ID: <span className="font-mono">{order?.id}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Step 1: Payment (Buyer). One channel at a time: the server locks the mode once payment starts. */}
            {order?.status === 'pending_payment' && isBuyer && !lockedMode && channels.length > 1 && (
              <fieldset className="bg-(--surface) rounded-(--radius-card) border border-(--line) p-6">
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

            {order?.status === 'pending_payment' && isBuyer && channel === 'mock' && (
              <MockPaymentPanel order={order} payment={payment} onChanged={() => loadData({ silent: true })} />
            )}

            {order?.status === 'pending_payment' && isBuyer && channel === 'manual' && (
              <div className="bg-(--surface) rounded-(--radius-card) border border-(--line) p-6">
                <h2 className="text-lg font-semibold text-(--text) mb-4">Submit Payment Details</h2>
                <form onSubmit={handleSubmitPayment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-(--text) mb-2">
                      Payment Proof (Receipt/Screenshot)
                    </label>
                    {paymentForm.paymentProofPreview ? (
                      <div className="space-y-2">
                        <div className="relative rounded-xl overflow-hidden border border-(--border)">
                          <img src={paymentForm.paymentProofPreview} alt="Payment proof" className="w-full h-48 object-cover" />
                          <button
                            type="button"
                            onClick={() => setPaymentForm({ ...paymentForm, paymentProofAssetId: '', paymentProofPreview: '' })}
                            className="absolute top-2 right-2 p-1.5 bg-(--danger) text-(--on-ink) rounded-full hover:opacity-90 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => openImageUpload('payment')}
                          className="w-full px-4 py-2 border border-(--border) text-(--text) rounded-xl hover:bg-(--surface-hover) transition"
                        >
                          Change Image
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openImageUpload('payment')}
                        className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-(--border) text-(--text-muted) hover:border-(--accent) hover:bg-(--accent)/5 transition flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Upload Payment Proof
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--text) mb-2">
                      Shipping Address
                    </label>
                    <textarea
                      value={paymentForm.shippingAddress}
                      onChange={(e) => setPaymentForm({ ...paymentForm, shippingAddress: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-(--border) bg-(--input-bg) text-(--text) focus:ring-2 focus:ring-(--focus) focus:border-transparent"
                      rows={3}
                      placeholder="Enter your full shipping address..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--text) mb-2">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={paymentForm.buyerPhone}
                      onChange={(e) => setPaymentForm({ ...paymentForm, buyerPhone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-(--border) bg-(--input-bg) text-(--text) focus:ring-2 focus:ring-(--focus) focus:border-transparent"
                      placeholder="+84 xxx xxx xxx"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--text) mb-2">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-(--border) bg-(--input-bg) text-(--text) focus:ring-2 focus:ring-(--focus) focus:border-transparent"
                      rows={2}
                      placeholder="Any special delivery instructions..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-(--ink) text-(--on-ink) rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Payment Details'}
                  </button>
                </form>
              </div>
            )}

            {/* Step 1: Waiting for Payment (Seller) */}
            {order?.status === 'pending_payment' && isSeller && (
              <div className="bg-(--surface) rounded-(--radius-card) border border-(--line) p-6">
                <h2 className="text-lg font-semibold text-(--text) mb-4">Waiting for Payment</h2>
                <div className="flex items-center gap-3 text-(--warning)">
                  <svg className="w-6 h-6 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <p>{payment?.mode === 'mock' ? 'The buyer is paying through the mock gateway (demo, no real money).' : 'Waiting for the buyer to submit payment details and shipping address.'}</p>
                </div>
              </div>
            )}

            {/* Step 2: Confirm Payment (Seller) */}
            {(order?.status === 'pending_confirmation' || order?.status === 'pending_delivery') && isSeller && (
              <div className="bg-(--surface) rounded-(--radius-card) border border-(--line) p-6">
                <h2 className="text-lg font-semibold text-(--text) mb-4">{order.status === 'pending_delivery' ? 'Payment Recorded: Ship the Item' : 'Confirm Payment & Ship'}</h2>
                
                {/* Show buyer's payment info */}
                <div className="bg-(--surface-sunken) rounded-xl p-4 mb-6">
                  <h3 className="font-medium text-(--ink) mb-2">Buyer's Payment Info</h3>
                  <div className="space-y-2 text-sm">
                    {order.status === 'pending_delivery' ? (
                      <p><span className="text-(--text-muted)">Payment:</span>{' '}
                        <span className="text-(--text)">recorded by the {order.paymentMode === 'mock' ? 'mock gateway (demo, no real money)' : 'payment gateway'}{order.paymentConfirmedAt ? ` on ${new Date(order.paymentConfirmedAt).toLocaleString()}` : ''}</span>
                      </p>
                    ) : (
                      <p><span className="text-(--text-muted)">Payment Proof:</span>{' '}
                        <ProofLink path={order?.paymentProofUrl}>View Receipt</ProofLink>
                      </p>
                    )}
                    <p><span className="text-(--text-muted)">Shipping Address:</span>{' '}
                      <span className="text-(--text)">{order?.shippingAddress}</span>
                    </p>
                    <p><span className="text-(--text-muted)">Contact Phone:</span>{' '}
                      <span className="text-(--text)">{order?.buyerPhone}</span>
                    </p>
                    {order?.buyerNotes && (
                      <p><span className="text-(--text-muted)">Notes:</span>{' '}
                        <span className="text-(--text)">{order?.buyerNotes}</span>
                      </p>
                    )}
                  </div>
                </div>

                <form onSubmit={handleConfirmPayment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-(--text) mb-2">
                      Shipping Invoice
                    </label>
                    {confirmForm.shippingProofPreview ? (
                      <div className="space-y-2">
                        <div className="relative rounded-xl overflow-hidden border border-(--border)">
                          <img src={confirmForm.shippingProofPreview} alt="Shipping proof" className="w-full h-48 object-cover" />
                          <button
                            type="button"
                            onClick={() => setConfirmForm({ ...confirmForm, shippingProofAssetId: '', shippingProofPreview: '' })}
                            className="absolute top-2 right-2 p-1.5 bg-(--danger) text-(--on-ink) rounded-full hover:opacity-90 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => openImageUpload('shipping')}
                          className="w-full px-4 py-2 border border-(--border) text-(--text) rounded-xl hover:bg-(--surface-hover) transition"
                        >
                          Change Image
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openImageUpload('shipping')}
                        className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-(--border) text-(--text-muted) hover:border-(--accent) hover:bg-(--accent)/5 transition flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Upload Shipping Invoice
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--text) mb-2">
                      Tracking Number
                    </label>
                    <input
                      type="text"
                      value={confirmForm.trackingNumber}
                      onChange={(e) => setConfirmForm({ ...confirmForm, trackingNumber: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-(--border) bg-(--input-bg) text-(--text) focus:ring-2 focus:ring-(--focus) focus:border-transparent"
                      placeholder="Enter tracking number..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-(--text) mb-2">
                      Shipping Notes (Optional)
                    </label>
                    <textarea
                      value={confirmForm.shippingNotes}
                      onChange={(e) => setConfirmForm({ ...confirmForm, shippingNotes: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-(--border) bg-(--input-bg) text-(--text) focus:ring-2 focus:ring-(--focus) focus:border-transparent"
                      rows={2}
                      placeholder="Estimated delivery time, carrier info..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-(--ink) text-(--on-ink) rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {submitting ? 'Confirming...' : order.status === 'pending_delivery' ? 'Send Shipping Info' : 'Confirm Payment & Send Shipping Info'}
                  </button>
                </form>
              </div>
            )}

            {/* Step 2: Waiting for Confirmation (Buyer) */}
            {order?.status === 'pending_confirmation' && isBuyer && (
              <div className="bg-(--surface) rounded-(--radius-card) border border-(--line) p-6">
                <h2 className="text-lg font-semibold text-(--text) mb-4">Payment Submitted</h2>
                <div className="bg-(--success-soft) rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3 text-(--success)">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p>Your payment details have been submitted successfully!</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-(--warning)">
                  <svg className="w-6 h-6 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <p>Waiting for the seller to confirm payment and provide shipping information.</p>
                </div>
              </div>
            )}

            {order?.status === 'pending_delivery' && isBuyer && (
              <div className="bg-(--surface) rounded-(--radius-card) border border-(--line) p-6">
                <h2 className="text-lg font-semibold text-(--text) mb-2">Payment Recorded</h2>
                <p className="text-(--text)">{order.paymentMode === 'mock' ? 'The mock gateway confirmed your payment (demo, no real money).' : 'Your payment was confirmed.'} Waiting for the seller to ship.</p>
              </div>
            )}

            {/* Step 3: Waiting for Delivery/Receipt */}
            {order?.status === 'pending_receipt' && (
              <div className="bg-(--surface) rounded-(--radius-card) border border-(--line) p-6">
                <h2 className="text-lg font-semibold text-(--text) mb-4">
                  {isBuyer ? 'Item Shipped' : 'Item in Transit'}
                </h2>
                
                {/* Shipping info */}
                <div className="bg-(--surface-sunken) rounded-xl p-4 mb-4">
                  <h3 className="font-medium text-(--ink) mb-2">Shipping Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-(--text-muted)">Shipping Invoice:</span>{' '}
                      <ProofLink path={order?.shippingProofUrl}>View Invoice</ProofLink>
                    </p>
                    <p><span className="text-(--text-muted)">Tracking Number:</span>{' '}
                      <span className="text-(--text) font-mono">{order?.trackingNumber}</span>
                    </p>
                    {order?.shippingNotes && (
                      <p><span className="text-(--text-muted)">Notes:</span>{' '}
                        <span className="text-(--text)">{order?.shippingNotes}</span>
                      </p>
                    )}
                  </div>
                </div>

                {isBuyer && (
                  <button
                    onClick={handleConfirmReceipt}
                    disabled={submitting}
                    className="w-full py-3 bg-(--ink) text-(--on-ink) rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {submitting ? 'Confirming...' : 'I Have Received the Item'}
                  </button>
                )}

                {isSeller && (
                  <div className="flex items-center gap-3 text-(--warning)">
                    <svg className="w-6 h-6 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <p>Waiting for the buyer to confirm receipt of the item.</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Review */}
            {(order?.status === 'pending_review' || order?.status === 'completed') && (
              <div className="bg-(--surface) rounded-(--radius-card) border border-(--line) p-6">
                <h2 className="text-lg font-semibold text-(--text) mb-4">
                  {order?.status === 'completed' ? 'Transaction Completed' : 'Leave a Review'}
                </h2>

                {order?.status === 'completed' ? (
                  <div className="text-center py-8">
                    <div className="bg-(--success-soft) rounded-xl p-6 mb-6">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-(--success) rounded-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-(--on-ink)" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-(--success) mb-2">
                            Order Completed!
                          </h3>
                          <p className="text-(--success)">
                            This transaction has been completed successfully!
                          </p>
                          <p className="text-sm text-(--text-muted) mt-2">
                            Both parties have submitted their reviews.
                          </p>
                        </div>
                      </div>
                    </div>
                    <Link
                      to="/"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-(--ink) text-(--on-ink) rounded-xl font-semibold hover:opacity-90 transition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Go to Homepage
                    </Link>
                  </div>
                ) : canUserReview() ? (
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div>
                      <p id="review-rating-label" className="block text-sm font-medium text-(--text) mb-3">
                        Rate the {isBuyer ? 'seller' : 'buyer'}
                      </p>
                      <div role="group" aria-labelledby="review-rating-label" className="flex gap-4">
                        <button
                          type="button"
                          aria-pressed={reviewForm.rating === 1}
                          onClick={() => setReviewForm({ ...reviewForm, rating: 1 })}
                          className={`flex-1 py-4 rounded-xl border-2 transition ${
                            reviewForm.rating === 1
                              ? 'border-(--success) bg-(--success-soft)'
                              : 'border-(--border) hover:border-(--success)'
                          }`}
                        >
                          <span aria-hidden="true" className="text-3xl">👍</span>
                          <p className="text-sm font-medium text-(--text) mt-1">Positive</p>
                        </button>
                        <button
                          type="button"
                          aria-pressed={reviewForm.rating === -1}
                          onClick={() => setReviewForm({ ...reviewForm, rating: -1 })}
                          className={`flex-1 py-4 rounded-xl border-2 transition ${
                            reviewForm.rating === -1
                              ? 'border-(--danger) bg-(--danger-soft)'
                              : 'border-(--border) hover:border-(--danger)'
                          }`}
                        >
                          <span aria-hidden="true" className="text-3xl">👎</span>
                          <p className="text-sm font-medium text-(--text) mt-1">Negative</p>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="review-comment" className="block text-sm font-medium text-(--text) mb-2">
                        Comment (Optional)
                      </label>
                      <textarea
                        id="review-comment"
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-(--border) bg-(--input-bg) text-(--text) focus:ring-2 focus:ring-(--focus) focus:border-transparent"
                        rows={3}
                        placeholder="Share your experience..."
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-(--ink) text-(--on-ink) rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : hasUserReviewed() ? 'Update Review' : 'Submit Review'}
                    </button>
                  </form>
                ) : hasUserReviewed() ? (
                  <div className="bg-(--surface-sunken) rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-(--success)" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="font-medium text-(--text)">
                        You have submitted your review
                      </p>
                    </div>
                    <p className="text-(--text-muted) text-sm">
                      {order?.status === 'pending_review' 
                        ? 'Waiting for the other party to complete their review.'
                        : 'Thank you for your feedback!'}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-(--warning)">
                    <svg className="w-6 h-6 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <p>Waiting for the other party to complete their review.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-(--surface) rounded-(--radius-card) border border-(--line) overflow-hidden sticky top-24">
              <div className="p-4 border-b border-(--border)">
                <h2 className="font-semibold text-(--text)">Chat with {isSeller ? 'Buyer' : 'Seller'}</h2>
              </div>
              
              {/* Messages */}
              <div ref={chatRef} role="log" aria-label="Messages" className="h-80 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-(--text-muted) text-sm py-8">
                    No messages yet. Start a conversation!
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isCurrentUser = msg.senderId === user?.userId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {/* Avatar for other user (left side) */}
                        {!isCurrentUser && <ChatAvatar user={msg.sender} />}
                        
                        <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
                          {/* Username */}
                          <span className="text-xs text-(--text-muted) mb-1 px-1">
                            {msg.sender?.username || 'Unknown'}
                          </span>
                          
                          {/* Message bubble */}
                          <div
                            className={`rounded-2xl px-4 py-2 ${
                              isCurrentUser
                                ? 'bg-(--ink) text-(--on-ink) rounded-br-sm'
                                : 'bg-(--surface-sunken) text-(--text) rounded-bl-sm'
                            }`}
                          >
                            <p className="text-sm break-words">{msg.message}</p>
                            <p className={`text-xs mt-1 ${isCurrentUser ? 'text-(--on-ink) opacity-80' : 'text-(--text-muted)'}`}>
                              {formatTimeAgo(msg.createdAt)}
                            </p>
                          </div>
                        </div>

                        {/* Avatar for current user (right side) */}
                        {isCurrentUser && <ChatAvatar user={msg.sender} />}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-(--border)">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl border border-(--border) bg-(--input-bg) text-(--text) focus:ring-2 focus:ring-(--focus) focus:border-transparent"
                    placeholder="Type a message..."
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !newMessage.trim()}
                    aria-label="Send message"
                    className="px-4 py-2 bg-(--ink) text-(--on-ink) rounded-xl hover:opacity-90 transition disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      <Dialog open={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancel order" pending={submitting}>
            <form onSubmit={handleCancelOrder} className="space-y-4">
              <div>
                <label htmlFor="cancel-reason" className="block text-sm font-medium text-(--text) mb-2">
                  Reason for Cancellation
                </label>
                <textarea
                  id="cancel-reason"
                  value={cancelForm.reason}
                  onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-(--border) bg-(--input-bg) text-(--text) focus:ring-2 focus:ring-(--focus) focus:border-transparent"
                  rows={3}
                  placeholder="Explain why you are cancelling..."
                  required
                />
              </div>
              <p className="text-sm text-(--text-muted)">Cancelling does not leave a review for the buyer.</p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={submitting}
                  className="flex-1 py-3 border border-(--border) text-(--text) rounded-xl font-semibold hover:bg-(--surface-hover) transition disabled:opacity-50"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-(--danger) text-(--on-ink) rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {submitting ? 'Cancelling...' : 'Cancel Order'}
                </button>
              </div>
            </form>
      </Dialog>

      {/* Image Upload Modal */}
      <ImageUploadModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onUpload={handleImageUpload}
        title={imageUploadType === 'payment' ? 'Upload Payment Proof' : 'Upload Shipping Invoice'}
      />
    </div>
  );
}
