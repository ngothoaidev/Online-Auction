import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWatchlist } from '../../contexts/WatchlistContext.jsx';
import { formatTimeLeft } from '../../utils/format';
import { formatVnd } from '../../utils/money.js';
import { validateBid, REASON_TEXT } from '../../utils/bid.js';
import auctionService from '../../services/auctionService';
import { Button, Field, StatusBadge } from '../../components/ui';
import ReviewDialog from '../../components/ui/ReviewDialog.jsx';

const OUTCOME = {
  success: { tone: 'success', title: 'You are the highest bidder', message: (r) => `Your maximum is recorded. The current price is ${formatVnd(r.currentPrice)}.` },
  updated: { tone: 'info', title: 'Maximum updated', message: (r) => `Your new maximum is recorded. The price stays at ${formatVnd(r.currentPrice)}.` },
  // Accepted, but another bidder's maximum is higher: this must never read like a win.
  outbid: { tone: 'warning', title: 'You were outbid', message: (r) => `Your bid was accepted, but a higher maximum was already in place. The price is now ${formatVnd(r.currentPrice)}. You can bid again with a higher maximum.` },
};

export default function BiddingSection({ product, ended = false, onChanged }) {
  const { user } = useAuth() ?? {};
  const navigate = useNavigate();
  const watchlist = useWatchlist();
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const [review, setReview] = useState(null); // { kind:'bid'|'buyNow', amount? }
  const [announce, setAnnounce] = useState('');

  const caps = product.capabilities ?? { canBid: false, canBuyNow: false, reasons: {} };
  const min = product.minimumNextBid;
  const hasBids = (product.bidCount ?? 0) > 0;
  const closed = ended || product.status !== 'active';
  const check = useMemo(() => validateBid(text, min), [text, min]);

  // keep the field empty-or-valid when the server floor moves under the person
  useEffect(() => { if (touched && text && !validateBid(text, min).ok) setAnnounce(`The minimum bid is now ${formatVnd(min)}.`); }, [min]); // eslint-disable-line react-hooks/exhaustive-deps

  const saved = user ? watchlist.has(product.id) : false;
  const time = formatTimeLeft(product.endTime);
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
    return { tone: 'success', title: 'Purchase complete', message: `The lot is yours for ${formatVnd(r.finalPrice)}. Taking you to the order page.` };
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
          <dt className="text-sm text-(--muted)">Minimum next bid</dt>
          <dd className="font-lot text-sm font-semibold text-(--ink)">{closed ? '—' : formatVnd(min)}</dd>
        </div>
        <div>
          <dt className="text-sm text-(--muted)">Bid step</dt>
          <dd className="font-lot text-sm font-semibold text-(--ink)">{formatVnd(product.stepPrice)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-sm text-(--muted)">{closed ? 'Closed' : 'Time left'}</dt>
          <dd className="font-lot text-sm font-semibold text-(--ink)">{closed ? (product.closeReason === 'buy_now' ? 'Bought now' : 'Bidding closed') : time.timeLeft}</dd>
        </div>
      </dl>

      {!closed && (
        <form onSubmit={startReview} noValidate className="mt-5 space-y-3">
          <Field
            label="Your maximum bid (₫)"
            hint="The most you would pay. We raise your bid one step at a time, only as far as needed; others never see this amount."
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
        description={review?.kind === 'buyNow' ? 'This ends the auction immediately.' : 'You are committing to pay up to this amount if you win.'}
        rows={review?.kind === 'buyNow'
          ? [['Lot', product.title], ['Buy now price', formatVnd(product.buyNowPrice)]]
          : [['Lot', product.title], ['Current price', formatVnd(product.currentPrice)], ['Your maximum', formatVnd(review?.amount)]]}
        note={review?.kind === 'buyNow' ? 'Payment and delivery are arranged on the order page.' : 'Your maximum stays private. You only pay what is needed to stay ahead, never more than this.'}
        confirmLabel={review?.kind === 'buyNow' ? 'Buy now' : 'Place bid'}
        onConfirm={review?.kind === 'buyNow' ? confirmBuyNow : confirmBid}
      />
    </section>
  );
}
