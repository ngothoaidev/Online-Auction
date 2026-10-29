import { useParams, Link } from 'react-router-dom';
import { useAuction } from '../../hooks/useAuction';
import { useAuth } from '../../contexts/AuthContext';
import ImageGallery from './ImageGallery';
import BiddingSection from './BiddingSection';
import Description from './Description';
import CommentsSection from './CommentsSection';
import BidHistory from './BidHistory';
import ReportListing from './ReportListing';
import { EmptyState, Skeleton, Button } from '../../components/ui';
import type { AuctionPatch } from '../../types/api';

export default function ProductDetail() {
  const { user } = useAuth();
  const { id = '' } = useParams();
  const { status, data: product, refresh, applyCommandResult, clockOffset, connection } = useAuction(id);

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10" aria-busy="true">
        <Skeleton className="mb-6 h-5 w-72 max-w-full" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-x-12">
          <div className="space-y-3 lg:col-span-7"><Skeleton className="aspect-square w-full" /><Skeleton className="h-[72px] w-64" /></div>
          <Skeleton className="h-[640px] lg:col-span-5" />
        </div>
        <span className="sr-only" role="status">Loading lot</span>
      </div>
    );
  }
  if (status === 'missing') return <div className="mx-auto max-w-2xl px-4 py-16"><EmptyState title="Lot not found" action={<Link className="font-semibold text-(--brand) underline" to="/search">Browse lots</Link>}>This lot does not exist or was removed.</EmptyState></div>;
  if (status === 'error') return <div className="mx-auto max-w-2xl px-4 py-16"><EmptyState title="The lot could not be loaded" action={<Button onClick={() => refresh({ silent: false })}>Try again</Button>}>Check your connection and try again.</EmptyState></div>;
  if (!product) return null; // 'ready' always carries a snapshot

  const ended = product.status !== 'active' || Boolean(product.serverTime && new Date(product.endTime) <= new Date(product.serverTime));
  const categoryName = product.category?.name || product.categoryName || 'Category';
  const me = user?.userId ?? user?.id;
  // a command that changed canonical state (or a refusal) -> bump the history table too
  const refreshKey = `${product.version}`;

  const onChanged = (result?: AuctionPatch | null) => (result ? applyCommandResult(result) : refresh());

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-(--muted)">
        <Link to="/search" className="hover:underline">Lots</Link> <span aria-hidden="true">/</span> <span>{categoryName}</span> <span aria-hidden="true">/</span> <span aria-current="page" className="text-(--ink)">{product.title}</span>
      </nav>

      {/* DOM/mobile order: photos -> price & bid -> history -> description -> Q&A. Desktop: two columns, bid panel sticky on the right. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-10">
        <div className="lg:col-span-7 lg:row-start-1">
          <ImageGallery productId={id} title={product.title} />
        </div>

        <div className="lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1">
          <div className="lg:sticky lg:top-24 space-y-6">
            <BiddingSection product={product} ended={ended} onChanged={onChanged} clockOffset={clockOffset} connection={connection} />
            <BidHistory productId={id} sellerId={product.sellerId} refreshKey={refreshKey} active={!ended} onChanged={() => refresh()} />
            {user && me !== product.sellerId && <ReportListing auctionId={product.id} />}
          </div>
        </div>

        <div className="space-y-8 lg:col-span-7 lg:row-start-2">
          <Description productId={id} isOwner={me !== undefined && me === product.sellerId} />
          <CommentsSection productId={id} />
        </div>
      </div>
    </div>
  );
}
