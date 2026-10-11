import { useParams, Link } from 'react-router-dom';
import { useAuction } from '../../hooks/useAuction.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import ImageGallery from './ImageGallery';
import BiddingSection from './BiddingSection';
import Description from './Description';
import CommentsSection from './CommentsSection';
import BidHistory from './BidHistory';
import { EmptyState, Skeleton, Button } from '../../components/ui';

export default function ProductDetail() {
  const { user } = useAuth() ?? {};
  const { id } = useParams();
  const { status, data: product, refresh, applyCommandResult } = useAuction(id);

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10" aria-busy="true">
        <div className="grid gap-8 lg:grid-cols-12"><Skeleton className="h-96 lg:col-span-7" /><Skeleton className="h-96 lg:col-span-5" /></div>
        <span className="sr-only" role="status">Loading lot</span>
      </div>
    );
  }
  if (status === 'missing') return <div className="mx-auto max-w-2xl px-4 py-16"><EmptyState title="Lot not found" action={<Link className="font-semibold text-(--brand) underline" to="/search">Browse lots</Link>}>This lot does not exist or was removed.</EmptyState></div>;
  if (status === 'error') return <div className="mx-auto max-w-2xl px-4 py-16"><EmptyState title="The lot could not be loaded" action={<Button onClick={() => refresh({ silent: false })}>Try again</Button>}>Check your connection and try again.</EmptyState></div>;

  const ended = product.status !== 'active' || Boolean(product.serverTime && new Date(product.endTime) <= new Date(product.serverTime));
  const categoryName = product.category?.name || product.categoryName || 'Category';
  const me = user?.userId ?? user?.id;
  // a command that changed canonical state (or a refusal) -> bump the history table too
  const refreshKey = `${product.version}`;

  const onChanged = (result) => (result ? applyCommandResult(result) : refresh());

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-(--muted)">
        <Link to="/search" className="hover:underline">Lots</Link> <span aria-hidden="true">/</span> <span>{categoryName}</span> <span aria-hidden="true">/</span> <span aria-current="page" className="text-(--ink)">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="space-y-10 lg:col-span-7">
          <ImageGallery productId={id} title={product.title} />
          <div className="space-y-8">
            <Description productId={id} isOwner={me !== undefined && me === product.sellerId} />
            <CommentsSection productId={id} />
          </div>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <div className="lg:sticky lg:top-24 space-y-6">
            <BiddingSection product={product} ended={ended} onChanged={onChanged} />
            <BidHistory productId={id} sellerId={product.sellerId} refreshKey={refreshKey} active={!ended} onChanged={() => refresh()} />
          </div>
        </div>
      </div>
    </div>
  );
}
