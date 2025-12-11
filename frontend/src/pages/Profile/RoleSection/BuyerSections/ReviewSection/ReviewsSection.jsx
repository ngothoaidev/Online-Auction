import { Star, ThumbsUp, ThumbsDown, ArrowRight } from "lucide-react";
import ViewAllButton from "../../../../../components/ViewAllButton";

export default function ReviewsSection({ reviews }) {
  reviews = reviews.slice(0, 3); // Show only 3 reviews in the section

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Star size={24} style={{ color: 'var(--accent)' }} />
          Reviews & Ratings
        </h2>
        <ViewAllButton page="reviews" />
      </div>
      
      <div className="space-y-4">
        {reviews.map(review => (
          <div 
            key={review.id}
            className="p-6 rounded-xl border"
            style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {review.type === 'positive' ? (
                  <ThumbsUp size={20} style={{ color: 'var(--success)' }} />
                ) : (
                  <ThumbsDown size={20} style={{ color: 'var(--danger)' }} />
                )}
                <div>
                  <p className="font-bold color-[var(--text)]">
                    {review.from}
                  </p>
                  <p className="text-sm color-[var(--text-muted)]">
                    {review.productTitle}
                  </p>
                </div>
              </div>
              <span className="text-sm color-[var(--text-muted)]">
                {review.date.toLocaleDateString()}
              </span>
            </div>
            <p style={{ color: 'var(--text)' }}>
              {review.comment}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
