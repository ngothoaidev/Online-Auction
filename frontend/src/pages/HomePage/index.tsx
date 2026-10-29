import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductTabs from './ProductTabs';
import { useAuth } from '../../contexts/AuthContext';
import auctionService from '../../services/auctionService';
import { formatVnd } from '../../utils/money';
import { formatTimeLeft } from '../../utils/format';
import { searchUrl } from '../../utils/searchUrl';
import { Skeleton } from '../../components/ui';

const STEPS = [
  ['Create an account', 'Register and confirm your email. Selling needs a short approval.'],
  ['Set your maximum', 'Enter the most you would pay. The system raises your bid one step at a time, only as far as needed.'],
  ['Pay and receive', 'The winner is recorded automatically when the auction closes. Payment and delivery are tracked on the order page.'],
];

/** Editorial hero built from a real lot (the one ending soonest); without inventory it is just text. */
function Hero({ lot, user }) {
  return (
    <section className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 md:py-16 lg:grid-cols-12 lg:px-10">
      <div className="lg:col-span-5">
        <p className="text-sm font-semibold uppercase tracking-wider text-(--brand)">Online auction</p>
        <h1 className="tracking-tight mt-3 text-4xl font-semibold leading-tight text-(--ink) md:text-5xl">Collectibles, bid by bid.</h1>
        <p className="mt-4 max-w-md text-lg text-(--muted)">Place a private maximum and let the auction work for you. Every lot closes automatically and the winner is recorded at once.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/search" className="inline-flex min-h-12 items-center rounded-(--radius-control) bg-(--ink) px-6 font-semibold text-(--on-ink) hover:opacity-90">Browse all lots</Link>
          {!user && <Link to="/register" className="inline-flex min-h-12 items-center rounded-(--radius-control) border border-(--input-border) px-6 font-semibold text-(--ink) hover:bg-(--surface-hover)">Create an account</Link>}
        </div>
      </div>
      {lot === undefined && (
        // same box and line heights as the loaded card, so nothing below moves when it arrives (CLS)
        <div aria-hidden="true" className="block overflow-hidden rounded-(--radius-card) border border-(--line) bg-(--surface) lg:col-span-7">
          <Skeleton className="aspect-16/10 rounded-none" />
          <div className="flex flex-wrap items-end justify-between gap-3 p-5">
            <div><p className="text-sm">&nbsp;</p><p className="text-xl">&nbsp;</p></div>
            <div><p className="text-sm">&nbsp;</p><p className="text-lg">&nbsp;</p><p className="text-sm">&nbsp;</p></div>
          </div>
        </div>
      )}
      {lot && (
        <Link to={`/auction/${lot.id}`} className="group block overflow-hidden rounded-(--radius-card) border border-(--line) bg-(--surface) shadow-(--card-shadow) lg:col-span-7">
          <div className="aspect-16/10 bg-(--surface-sunken)">
            {lot.image && <img src={lot.image} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3 p-5">
            <div>
              <p className="text-sm text-(--muted)">Ending soon</p>
              <h2 className="text-xl font-semibold text-(--ink) group-hover:underline">{lot.title}</h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-(--muted)">{lot.bidCount > 0 ? 'Current bid' : 'Starting price'}</p>
              <p className="font-lot text-lg font-semibold text-(--ink)">{formatVnd(lot.bidCount > 0 && lot.bids ? lot.bids.amount : lot.currentPrice)}</p>
              <p className="text-sm text-(--muted)">{formatTimeLeft(lot.endTime).timeLeft}</p>
            </div>
          </div>
        </Link>
      )}
    </section>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [lot, setLot] = useState(undefined); // undefined = loading, null = no lot to feature

  useEffect(() => {
    let cancelled = false;
    auctionService.getTopAuctions({ sortBy: 'endingSoon', limit: 1 })
      .then((rows) => { if (!cancelled) setLot(Array.isArray(rows) ? rows[0] ?? null : null); })
      .catch(() => { if (!cancelled) setLot(null); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="pb-12">
      <Hero lot={lot} user={user} />

      <ProductTabs />

      <section aria-labelledby="how-it-works" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-10">
        <h2 id="how-it-works" className="tracking-tight text-3xl font-semibold text-(--ink)">How bidding works</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="rounded-(--radius-card) border border-(--line) bg-(--surface) p-5">
              <p className="font-lot text-sm font-medium text-(--brand)">Step {i + 1}</p>
              <h3 className="mt-1 text-lg font-semibold text-(--ink)">{title}</h3>
              <p className="mt-1 text-sm text-(--muted)">{text}</p>
            </li>
          ))}
        </ol>
        {user?.role === 'buyer' && (
          <p className="mt-6 text-sm text-(--muted)">Have something to sell? <Link className="font-semibold text-(--brand) underline" to="/become-seller">Apply to become a seller</Link>.</p>
        )}
        {user?.role === 'seller' && (
          <p className="mt-6 text-sm text-(--muted)"><Link className="font-semibold text-(--brand) underline" to="/create-auction">Create a listing</Link> or <Link className="font-semibold text-(--brand) underline" to={searchUrl({ sortBy: 'timeNewlyListed' })}>see what is newly listed</Link>.</p>
        )}
      </section>
    </div>
  );
}
