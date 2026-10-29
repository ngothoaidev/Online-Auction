import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWatchlist } from '../../contexts/WatchlistContext';
import { formatTimeLeft, formatDeadline } from '../../utils/format';
import { formatVnd, compareAmounts } from '../../utils/money';
import { validateBid, REASON_TEXT } from '../../utils/bid';
import auctionService from '../../services/auctionService';
import { Button, Field, StatusBadge } from '../../components/ui';
import ReviewDialog from '../../components/ui/ReviewDialog';

const OUTCOME = {
  success: { tone: 'success', title: 'You are the highest bidder', message: (r) => `Your maximum is recorded. The current price is ${formatVnd(r.currentPrice)}.` },
  updated: { tone: 'info', title: 'Maximum updated', message: (r) => `Your new maximum is recorded. The price stays at ${formatVnd(r.currentPrice)}.` },
  // Accepted, but another bidder's maximum is higher: this must never read like a win.
  outbid: { tone: 'warning', title: 'You were outbid', message: (r) => `Your bid was accepted, but a higher maximum was already in place. The price is now ${formatVnd(r.currentPrice)}. You can bid again with a higher maximum.` },
};

/** Local clock corrected to the server's, ticking every second (countdown and the deadline switch). */
function useServerNow(offsetMs) {
  const [now, setNow] = useState(() => Date.now() + offsetMs);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offsetMs), 1000); // a new offset shows within a second
    return () => clearInterval(t);
  }, [offsetMs]);
  return now;
}

const CONNECTION_TEXT = {
  stale: 'Live updates paused, reconnecting. The price is re-checked every 10 seconds.',
  offline: 'You are offline. The price shown may be out of date.',
};

/**
 * What a closed lot says, by who is looking. Before settlement `winnerId` is only the last leader, so nobody is told
 * they won until `settledAt` is set (the order page itself waits for settlement and checks who may open it).
 */
function ClosedResult({ product, me }) {
  const price = formatVnd(product.currentPrice);
  const settled = Boolean(product.settledAt) || product.status === 'sold';
  const box = (title, body, action) => (
    <div className="mt-4 rounded-(--radius-control) border border-(--line) p-4">
      <p className="font-semibold text-(--ink)">{title}</p>
      {body && <p className="mt-1 text-sm text-(--muted)">{body}</p>}
      {action}
    </div>
  );
  const orderLink = (label) => (
    <Link to={`/order/${product.id}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-(--radius-control) bg-(--ink) px-4 font-semibold text-(--on-ink) hover:opacity-90">{label}</Link>
  );

  if (product.status === 'cancelled') return box('This listing was cancelled', 'No sale took place.');
  if (!settled) return box('Bidding has closed', 'The result is being finalised. This usually takes a few seconds.');
  if (!product.winnerId) return box('Ended without a sale', product.bidCount ? 'No eligible bid remained when the auction closed.' : 'Nobody bid on this lot.');
  const how = product.closeReason === 'buy_now' ? 'Bought now' : 'Sold';
  if (me !== undefined && me === product.winnerId) return box(`You won this lot for ${price}`, 'Pay and arrange delivery on the order page.', orderLink('View order and pay'));
  if (me !== undefined && me === product.sellerId) return box(`${how} to @${product.winnerName ?? 'the winner'} for ${price}`, 'Follow payment and shipping on the order page.', orderLink('View order'));
  return box(`${how} for ${price}`);
}

export default function BiddingSection({ product, ended = false, onChanged, clockOffset = 0, connection = 'live' }) {
  const { user } = useAuth() ?? {};
  const navigate = useNavigate();
  const watchlist = useWatchlist();
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const [review, setReview] = useState(null); // { kind:'bid'|'buyNow', amount? }
  const [announce, setAnnounce] = useState('');

  const caps = product.capabilities ?? { canBid: false, canBuyNow: false, reasons: {} };
  const me = product.viewer; // private: { status, yourMaximum, minimumBid } for the signed-in requester, else null
  const leading = me?.status === 'leading';
  const min = me?.minimumBid ?? product.minimumNextBid; // a leader's floor is above their own maximum, not current + step
  const hasBids = (product.bidCount ?? 0) > 0;
  const now = useServerNow(clockOffset);
  const closed = ended || product.status !== 'active' || Date.parse(product.endTime) <= now;
  const check = useMemo(() => validateBid(text, min), [text, min]);

  // keep the field empty-or-valid when the server floor moves under the person
  useEffect(() => { if (touched && text && !validateBid(text, min).ok) setAnnounce(`The minimum bid is now ${formatVnd(min)}.`); }, [min]); // eslint-disable-line react-hooks/exhaustive-deps

  const saved = user ? watchlist.has(product.id) : false;
  const time = formatTimeLeft(product.endTime, now, { seconds: true });
  // Deadline moved since this lot was opened (anti-sniping extension arrives with the live snapshot): say so, once per change.
  const [opened] = useState(() => ({ id: product.id, endTime: product.endTime }));
  const extended = !closed && opened.id === product.id && Date.parse(product.endTime) > Date.parse(opened.endTime);
  // A leader whose private maximum is above Buy Now: buying ends the auction at the Buy Now price, below that maximum.
  const buyNowBelowMyMax = me?.status === 'leading' && product.buyNowPrice && compareAmounts(String(product.buyNowPrice), me.yourMaximum) < 0;
  const rating = product.seller?.rating;

  const startReview = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!check.ok) return;
    setReview({ kind: 'bid', amount: check.amount });
  };

  const confirmBid = async (key) => {
    const r = await auctionService.placeBid(product.id, review.amount, key);
    const o = OUTCOME[r.outcome] ?? OUTCOME.success;
    onChanged?.(r);
    setText('');
    setTouched(false);
    return { tone: o.tone, title: o.title, message: o.message(r) };
  };

  const confirmBuyNow = async (key) => {
    const r = await auctionService.buyNow(product.id, key);
    onChanged?.(r);
    setTimeout(() => navigate(`/order/${r.auctionId ?? product.id}`), 600);
    return { tone: 'success', title: 'Order created', message: `The lot is yours for ${formatVnd(r.finalPrice)}. Nothing has been paid yet: payment and delivery are arranged on the order page. Taking you there now.` };
  };

  const onSettled = (result, error) => {
    if (result) setAnnounce(result.title);
    if (error) onChanged?.(null); // refused: pull the canonical state so the page shows why
  };

  const reason = !caps.canBid ? REASON_TEXT[caps.reasons?.bid] : '';

  return (
    <section aria-labelledby="bid-panel-title" className="rounded-(--radius-card) border border-(--line) bg-(--surface) p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <StatusBadge tone={closed ? 'neutral' : 'success'}>{closed ? 'Closed' : 'Open for bidding'}</StatusBadge>
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? 'Remove from watchlist' : 'Save to watchlist'}
          onClick={() => (user ? watchlist.toggle(product.id).catch(() => setAnnounce('Could not update your watchlist')) : setAnnounce('Sign in to save lots'))}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-(--line) hover:bg-(--surface-hover)"
        >
          <Heart size={20} aria-hidden="true" className={saved ? 'fill-(--danger) text-(--danger)' : ''} />
        </button>
      </div>

      <h1 id="bid-panel-title" className="mt-3 text-2xl font-semibold leading-tight text-(--ink)">{product.title}</h1>
      <p className="mt-2 text-sm text-(--muted)">
        Seller <Link to={`/profile/${product.sellerName}`} className="font-semibold text-(--ink) underline">@{product.sellerName}</Link>
        {' · '}
        {rating === null || rating === undefined ? 'No reviews yet' : `${rating}% positive (${product.seller?.ratingCount ?? 0})`}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-4 rounded-(--radius-control) bg-(--surface-sunken) p-4">
        <div className="col-span-2">
          <dt className="text-sm text-(--muted)">{hasBids ? 'Current bid' : 'Starting price'}</dt>
          <dd className="font-lot text-3xl font-semibold text-(--ink)">{formatVnd(product.currentPrice)}</dd>
          <dd className="text-sm text-(--muted)">{product.bidCount ?? 0} {product.bidCount === 1 ? 'bid' : 'bids'}</dd>
        </div>
        <div>
          <dt className="text-sm text-(--muted)">{leading ? 'To raise your maximum' : 'Minimum next bid'}</dt>
          <dd className="font-lot text-sm font-semibold text-(--ink)">{closed ? '—' : formatVnd(min)}</dd>
        </div>
        <div>
          <dt className="text-sm text-(--muted)">Bid step</dt>
          <dd className="font-lot text-sm font-semibold text-(--ink)">{formatVnd(product.stepPrice)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-sm text-(--muted)">{closed ? 'Closed' : 'Time left'}</dt>
          <dd className="font-lot text-sm font-semibold text-(--ink)">{closed ? (product.closeReason === 'buy_now' ? 'Bought now' : 'Bidding closed') : time.timeLeft}</dd>
          {!closed && <dd className="mt-0.5 text-sm text-(--muted)">Ends {formatDeadline(product.endTime)}</dd>}
          {!closed && product.autoExtend && <dd className="mt-0.5 text-sm text-(--muted)">A bid that changes the price in the last 5 minutes adds 5 minutes to the deadline.</dd>}
        </div>
      </dl>
      <p role="status" className="mt-2 text-sm text-(--warning)">{closed ? '' : CONNECTION_TEXT[connection] ?? ''}</p>
      <p role="status" className="text-sm font-semibold text-(--warning)">{extended ? `Deadline extended to ${formatDeadline(product.endTime)}.` : ''}</p>

      {closed && <ClosedResult product={product} me={user?.userId ?? user?.id} />}

      {!closed && (me?.status === 'leading' || me?.status === 'outbid') && (
        // live region: when a live update moves this bidder from leading to outbid, the change is announced
        <div role="status" className={`mt-3 rounded-(--radius-control) p-3 text-sm ${leading ? 'bg-(--success-soft)' : 'bg-(--warning-soft)'}`}>
          <p className={`font-semibold ${leading ? 'text-(--success)' : 'text-(--warning)'}`}>{leading ? 'You are the highest bidder' : 'You have been outbid'}</p>
          <p className="mt-0.5 text-(--ink)">
            Your maximum: <span className="font-lot font-semibold">{formatVnd(me.yourMaximum)}</span>
            <span className="text-(--muted)"> · only you can see this</span>
          </p>
        </div>
      )}

      {!closed && (
        <form onSubmit={startReview} noValidate className="mt-5 space-y-3">
          <Field
            label={leading ? 'New maximum bid (₫)' : 'Your maximum bid (₫)'}
            hint={leading
              ? `You are already winning. Enter more than your current maximum (${formatVnd(me.yourMaximum)}) to raise it; the price will not change.`
              : 'The most you would pay. We raise your bid one step at a time, only as far as needed; others never see this amount.'}
            error={touched && !check.ok ? check.error : ''}
          >
            <input inputMode="numeric" autoComplete="off" value={text} disabled={!caps.canBid} onChange={(e) => setText(e.target.value)} placeholder={min ? formatVnd(min).replace(' ₫', '') : ''} className="font-lot text-lg" />
          </Field>
          {reason && <p className="text-sm text-(--muted)">{reason}{!user && <> <Link to="/login" className="font-semibold text-(--brand) underline">Log in</Link></>}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={!caps.canBid}>Review bid</Button>
        </form>
      )}

      {product.buyNowPrice && !closed && (
        <div className="mt-4 border-t border-(--line) pt-4">
          <Button variant="secondary" size="lg" className="w-full" disabled={!caps.canBuyNow} onClick={() => setReview({ kind: 'buyNow' })}>
            <ShoppingCart size={18} aria-hidden="true" /> Buy now for {formatVnd(product.buyNowPrice)}
          </Button>
          {!caps.canBuyNow && REASON_TEXT[caps.reasons?.buyNow] && caps.reasons?.buyNow !== caps.reasons?.bid && <p className="mt-2 text-sm text-(--muted)">{REASON_TEXT[caps.reasons.buyNow]}</p>}
        </div>
      )}

      <p role="status" aria-live="polite" className="sr-only">{announce}</p>

      <ReviewDialog
        open={Boolean(review)}
        onClose={() => setReview(null)}
        onSettled={onSettled}
        title={review?.kind === 'buyNow' ? 'Review purchase' : 'Review your bid'}
        description={review?.kind === 'buyNow' ? 'This ends the auction immediately and commits you to buy at this price.' : 'You are committing to pay up to this amount for the item if you win.'}
        rows={review?.kind === 'buyNow'
          ? [['Lot', product.title], ['Item price', formatVnd(product.buyNowPrice)], ['Shipping', 'Not included, arranged with the seller']]
          : [['Lot', product.title], ['Current price', formatVnd(product.currentPrice)], ['Your maximum (item price)', formatVnd(review?.amount)], ['Shipping', 'Not included, arranged with the seller']]}
        note={review?.kind === 'buyNow'
          ? `${buyNowBelowMyMax ? `You are already the highest bidder. Buying now ends the auction at ${formatVnd(product.buyNowPrice)}, below your maximum of ${formatVnd(me.yourMaximum)}. ` : ''}You pay the seller directly on the order page; this site does not hold money.`
          : 'Your maximum stays private. You only pay what is needed to stay ahead, never more than this. If you win, you pay the seller directly on the order page; this site does not hold money.'}
        confirmLabel={review?.kind === 'buyNow' ? 'Buy now' : 'Place bid'}
        onConfirm={review?.kind === 'buyNow' ? confirmBuyNow : confirmBid}
      />
    </section>
  );
}
