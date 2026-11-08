import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { reviewService } from '../../services/reviewService';
import Pagination from '../../components/Pagination';
import { Button, EmptyState } from '../../components/ui';
import './Reviews.css';
import type { ApiError } from '../../services/apiClient';
import type { ChangeEvent } from 'react';
import type { ReviewFilters } from '../../services/reviewService';
import type { ReviewRow } from '../../types/api';

const Reviews = () => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    reviewerId: '',
    targetId: '',
    auctionId: '',
  });

  const query = useQuery({
    queryKey: ['reviews', 'all', filters, page],
    queryFn: async () => {
      const filterParams: ReviewFilters = { page, limit: 20 };
      if (filters.reviewerId) filterParams.reviewerId = filters.reviewerId;
      if (filters.targetId) filterParams.targetId = filters.targetId;
      if (filters.auctionId) filterParams.auctionId = filters.auctionId;
      const response = await reviewService.getReviews(filterParams);
      if (!response.success) throw new Error('Không thể tải đánh giá');
      return response.data;
    },
    placeholderData: keepPreviousData,
  });
  const reviews: ReviewRow[] = query.data?.reviews ?? [];
  const stats = query.data?.stats ?? { totalReviews: 0, positiveReviews: 0, negativeReviews: 0, positivePercentage: null };
  const pagination = query.data?.pagination ?? { page, limit: 20, total: 0, totalPages: 0 };
  const loading = query.isFetching;
  const error = query.isError ? (query.error as ApiError).message || 'Không thể tải đánh giá' : null;

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      reviewerId: '',
      targetId: '',
      auctionId: '',
    });
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="reviews-page">
        <div className="loading">Đang tải đánh giá...</div>
      </div>
    );
  }

  return (
    <div className="reviews-page">
      <div className="reviews-header">
        <h1>Đánh Giá</h1>
        <p className="reviews-subtitle">Xem tất cả đánh giá từ người dùng</p>
      </div>

      {/* Statistics Section */}
      <div className="reviews-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.totalReviews}</div>
          <div className="stat-label">Tổng Đánh Giá</div>
        </div>
        <div className="stat-card positive">
          <div className="stat-value">{stats.positiveReviews}</div>
          <div className="stat-label">Đánh Giá Tích Cực</div>
        </div>
        <div className="stat-card negative">
          <div className="stat-value">{stats.negativeReviews}</div>
          <div className="stat-label">Đánh Giá Tiêu Cực</div>
        </div>
        <div className="stat-card percentage">
          <div className="stat-value">{stats.positivePercentage == null ? '—' : `${stats.positivePercentage}%`}</div>
          <div className="stat-label">Tỷ Lệ Tích Cực</div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="reviews-filters">
        <h3>Bộ Lọc</h3>
        <div className="filter-inputs">
          <input
            type="number"
            name="reviewerId"
            placeholder="ID người đánh giá"
            value={filters.reviewerId}
            onChange={handleFilterChange}
          />
          <input
            type="number"
            name="targetId"
            placeholder="ID người được đánh giá"
            value={filters.targetId}
            onChange={handleFilterChange}
          />
          <input
            type="number"
            name="auctionId"
            placeholder="ID đấu giá"
            value={filters.auctionId}
            onChange={handleFilterChange}
          />
          <button onClick={clearFilters} className="btn-clear">
            Xóa Bộ Lọc
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && <EmptyState title={error} action={<Button onClick={() => query.refetch()}>Thử lại</Button>} />}

      {/* Reviews List */}
      <div className="reviews-list">
        {error ? null : reviews.length === 0 ? (
          <div className="no-reviews">
            <p>Không có đánh giá nào.</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className={`review-card ${review.isGoodRating ? 'positive' : 'negative'}`}>
              <div className="review-header">
                <div className="reviewer-info">
                  {review.reviewerAvatarUrl && <img src={review.reviewerAvatarUrl} alt="" className="reviewer-avatar" />}
                  <div className="reviewer-details">
                    <h4>{review.reviewerFullName || review.reviewerUsername}</h4>
                    <p className="username">@{review.reviewerUsername}</p>
                  </div>
                </div>
                <div className="rating-badge">
                  {review.isGoodRating ? (
                    <span className="positive-badge">👍 Tích Cực</span>
                  ) : (
                    <span className="negative-badge">👎 Tiêu Cực</span>
                  )}
                </div>
              </div>

              <div className="review-body">
                <p className="review-comment">{review.comment || 'Không có bình luận'}</p>
                
                <div className="review-meta">
                  <div className="meta-item">
                    <strong>Đánh giá cho:</strong>
                    <span>{review.targetFullName || review.targetUsername}</span>
                  </div>
                  {review.auctionTitle && (
                    <div className="meta-item">
                      <strong>Đấu giá:</strong>
                      <span>{review.auctionTitle}</span>
                    </div>
                  )}
                  <div className="meta-item">
                    <strong>Ngày:</strong>
                    <span>{formatDate(review.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
};

export default Reviews;
