import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWatchlist } from '../../contexts/WatchlistContext';
import { formatTimeLeft } from '../../utils/format';
import { formatVnd } from '../../utils/money';
import { StatusBadge } from '../ui';
import type { Tone } from '../ui/StatusBadge';
import type { CatalogAuction } from '../../types/api';

const URGENCY_TONE: Record<string, Tone> = { critical: 'danger', warning: 'warning', normal: 'neutral', ended: 'neutral' };

/**
 * Lot card. Semantics: <article> with a real link on the image and the title (one tab stop each) and a sibling
 * favourite button; nothing is hover-only and the whole card is NOT a clickable div.
 */
/** variant 'won' (profile Wins / Sold tabs): the lot is settled and the viewer is a participant, so the card links to its order. */
export default function AuctionCard({ product, variant }: { product: CatalogAuction; variant?: 'won' }) {
  const { user } = useAuth() ?? {};
  const watchlist = useWatchlist();
  const [time, setTime] = useState(() => formatTimeLeft(product.endTime));
  const [error, setError] = useState('');

  useEffect(() => {
    const tick = () => setTime(formatTimeLeft(product.endTime));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [product.endTime]);

  const href = `/auction/${product.id}`;
  const saved = user ? watchlist.has(product.id) : false;
  const hasBids = (product.bidCount ?? 0) > 0 && product.bids;
  const price = hasBids && product.bids ? product.bids.amount : product.currentPrice;
  const rating = product.seller?.rating;

  const onHeart = async () => {
    setError('');
    if (!user) { setError('Sign in to save lots'); return; }
    try { await watchlist.toggle(product.id); } catch { setError('Could not update your watchlist'); }
  };

  return (
    <article className="group relative flex h-full w-full flex-col overflow-hidden rounded-(--radius-card) border border-(--line) bg-(--surface) shadow-(--card-shadow)">
      <div className="relative aspect-4/3 overflow-hidden bg-(--surface-sunken)">
        <Link to={href} tabIndex={-1} aria-hidden="true">
          {product.image
            ? <img src={product.image} alt="" loading="lazy" className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center text-sm text-(--muted)">No image</div>}
        </Link>
        <div className="absolute left-2 top-2"><StatusBadge tone="neutral">{product.category}</StatusBadge></div>
        <button
          type="button"
          onClick={onHeart}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${product.title} from watchlist` : `Save ${product.title} to watchlist`}
          disabled={watchlist.pending(product.id)}
          className="absolute right-1 top-1 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-(--surface)/90 text-(--ink) hover:bg-(--surface) disabled:opacity-60"
        >
          <Heart size={20} aria-hidden="true" className={saved ? 'fill-(--danger) text-(--danger)' : ''} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 min-h-12 text-base font-semibold leading-snug text-(--ink)">
          <Link to={href} className="after:absolute after:inset-0 after:content-[''] hover:underline">{product.title}</Link>
        </h3>

        <p className="text-sm text-(--muted)">
          {product.seller?.username}
          {' · '}
          {rating === null || rating === undefined ? 'No reviews yet' : `${rating}% positive`}
        </p>

        <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-(--line) pt-3">
          <div>
            <dt className="text-xs text-(--muted)">{hasBids ? 'Current bid' : 'Starting price'}</dt>
            <dd className="font-lot whitespace-nowrap text-sm font-semibold text-(--ink)">{formatVnd(price)}</dd>
          </div>
          <div>
            <dt className="text-xs text-(--muted)">Buy now</dt>
            <dd className="font-lot whitespace-nowrap text-sm font-semibold text-(--ink)">{product.buyNowPrice ? formatVnd(product.buyNowPrice) : 'Not offered'}</dd>
          </div>
        </dl>

        <div className="flex items-center justify-between text-sm">
          <StatusBadge tone={URGENCY_TONE[time.urgencyLevel] ?? 'neutral'}>{time.urgencyLevel === 'ended' ? 'Ended' : `Ends ${time.timeLeft}`}</StatusBadge>
          <span className="text-(--muted)">{product.bidCount || 0} {product.bidCount === 1 ? 'bid' : 'bids'}</span>
        </div>
        {variant === 'won' && (
          <Link to={`/order/${product.id}`} className="relative z-10 inline-flex min-h-11 items-center justify-center rounded-(--radius-control) border border-(--input-border) px-4 text-sm font-semibold text-(--ink) hover:bg-(--surface-hover)">
            View order{' '}<span className="sr-only">for {product.title}</span>
          </Link>
        )}
        {error && <p role="status" className="relative z-10 text-sm text-(--danger)">{error}</p>}
      </div>
    </article>
  );
}
