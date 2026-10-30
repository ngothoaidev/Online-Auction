import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useProfile } from '../../services/queries';
import { useParams, Link } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, MessageCircle, Calendar, User } from 'lucide-react';
import { reviewService } from '../../services/reviewService';
import Pagination from '../../components/Pagination';
import { Button, EmptyState } from '../../components/ui';
import type { ApiError } from '../../services/apiClient';
import type { ReviewFilters } from '../../services/reviewService';
import type { ReviewRow, UserProfile } from '../../types/api';

function Avatar({ src, size }: { src: string | null | undefined; size: string }) {
  return src
    ? <img src={src} alt="" className={`${size} rounded-full border-2 border-(--border) object-cover`} />
    : <span aria-hidden="true" className={`${size} inline-flex shrink-0 items-center justify-center rounded-full border-2 border-(--border) bg-(--surface-sunken) text-(--muted)`}><User size={20} /></span>;
}

export default function UserReviews() {
  const { username } = useParams();
  const [activeTab, setActiveTab] = useState('received'); // 'received' or 'given'
  const [page, setPage] = useState(1);
  const profile = useProfile(username);
  const userData: UserProfile | null = profile.data ?? null;
  const profileStatus = profile.data ? 'ready'
    : profile.isError && !profile.isFetching ? ((profile.error as ApiError).status === 404 ? 'missing' : 'error') : 'loading';

  const reviewsQuery = useQuery({
    queryKey: ['reviews', activeTab, userData?.id, page],
    queryFn: async () => {
      const filterParams: ReviewFilters = { page, limit: 10 };
      if (activeTab === 'received') filterParams.targetId = userData?.id;
      else filterParams.reviewerId = userData?.id;
      const response = await reviewService.getReviews(filterParams);
      if (!response.success) throw new Error('Failed to load reviews');
      return response.data;
    },
    enabled: Boolean(userData?.id),
    placeholderData: keepPreviousData,
  });
  const reviews: ReviewRow[] = reviewsQuery.data?.reviews ?? [];
  const stats = reviewsQuery.data?.stats ?? { totalReviews: 0, positiveReviews: 0, negativeReviews: 0, positivePercentage: null };
  const pagination = reviewsQuery.data?.pagination ?? { page, limit: 10, total: 0, totalPages: 0 };
  const loading = reviewsQuery.isFetching;
  const error = reviewsQuery.isError ? (reviewsQuery.error as ApiError).message || 'Failed to load reviews' : null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (profileStatus !== 'ready') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        {profileStatus === 'loading' && <div className="text-center text-(--text-muted)" role="status">Loading user...</div>}
        {profileStatus === 'missing' && (
          <EmptyState title="User not found" action={<Link to="/search" className="font-semibold underline">Browse auctions</Link>}>
            There is no user named @{username}.
          </EmptyState>
        )}
        {profileStatus === 'error' && (
          <EmptyState title="This profile could not be loaded" action={<Button onClick={() => profile.refetch()}>Try again</Button>} />
        )}
      </div>
    );
  }

  if (!userData) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Avatar src={userData.avatar} size="w-16 h-16" />
          <div>
            <h1 className="text-3xl font-bold text-(--text)">{userData.name || userData.username}'s Reviews</h1>
            <p className="text-(--text-muted)">@{userData.username}</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-6 rounded-xl bg-(--card-bg) border border-(--border) text-center">
          <div className="text-3xl font-bold text-(--text) mb-2">{stats.totalReviews}</div>
          <div className="text-sm text-(--text-muted) uppercase tracking-wide">Total Reviews</div>
        </div>
        <div className="p-6 rounded-xl bg-(--success-soft) border border-(--success) text-center">
          <div className="text-3xl font-bold text-(--success) mb-2">{stats.positiveReviews}</div>
          <div className="text-sm text-(--text-muted) uppercase tracking-wide">Positive</div>
        </div>
        <div className="p-6 rounded-xl bg-(--danger-soft) border border-(--danger) text-center">
          <div className="text-3xl font-bold text-(--danger) mb-2">{stats.negativeReviews}</div>
          <div className="text-sm text-(--text-muted) uppercase tracking-wide">Negative</div>
        </div>
        <div className="p-6 rounded-xl bg-(--accent)/10 border border-(--accent)/20 text-center">
          <div className="text-3xl font-bold text-(--accent) mb-2">{stats.positivePercentage == null ? '—' : `${stats.positivePercentage}%`}</div>
          <div className="text-sm text-(--text-muted) uppercase tracking-wide">Positive Rate</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-(--border) mb-8">
        <button
          onClick={() => {
            setActiveTab('received');
            setPage(1);
          }}
          className={`pb-4 px-6 font-bold transition-colors relative ${
            activeTab === 'received'
              ? 'text-(--text)'
              : 'text-(--text-muted) hover:text-(--text)'
          }`}
        >
          Reviews Received
          {activeTab === 'received' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-(--accent)" />
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab('given');
            setPage(1);
          }}
          className={`pb-4 px-6 font-bold transition-colors relative ${
            activeTab === 'given'
              ? 'text-(--text)'
              : 'text-(--text-muted) hover:text-(--text)'
          }`}
        >
          Reviews Given
          {activeTab === 'given' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-(--accent)" />
          )}
        </button>
      </div>

      {/* Loading State */}
      {loading && reviews.length === 0 ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-(--text-muted)">Loading reviews...</div>
        </div>
      ) : error ? (
        <EmptyState title="Reviews could not be loaded" action={<Button onClick={() => reviewsQuery.refetch()}>Try again</Button>}>{error}</EmptyState>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle size={48} className="mx-auto mb-4 text-(--text-muted) opacity-50" />
          <p className="text-(--text-muted)">No reviews {activeTab === 'received' ? 'received' : 'given'} yet.</p>
        </div>
      ) : (
        <>
          {/* Reviews List */}
          <div className="space-y-4 mb-8">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="p-6 rounded-xl bg-(--card-bg) border border-(--border) hover:border-(--accent)/30 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Avatar size="w-12 h-12" src={activeTab === 'received' ? review.reviewerAvatarUrl : review.targetAvatarUrl} />
                    <div>
                      <h3 className="font-bold text-(--text)">
                        {activeTab === 'received'
                          ? review.reviewerFullName || review.reviewerUsername
                          : review.targetFullName || review.targetUsername}
                      </h3>
                      <p className="text-sm text-(--text-muted)">
                        @{activeTab === 'received' ? review.reviewerUsername : review.targetUsername}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold ${
                      review.isGoodRating
                        ? 'bg-(--success-soft) text-(--success)'
                        : 'bg-(--danger-soft) text-(--danger)'
                    }`}
                  >
                    {review.isGoodRating ? (
                      <>
                        <ThumbsUp size={16} />
                        <span>Positive</span>
                      </>
                    ) : (
                      <>
                        <ThumbsDown size={16} />
                        <span>Negative</span>
                      </>
                    )}
                  </div>
                </div>

                {review.comment && (
                  <p className="text-(--text) mb-4 pl-16">{review.comment}</p>
                )}

                <div className="flex items-center gap-6 text-sm text-(--text-muted) pl-16">
                  {review.auctionTitle && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Auction:</span>
                      <Link to={`/auction/${review.auctionId}`} className="underline">{review.auctionTitle}</Link>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
