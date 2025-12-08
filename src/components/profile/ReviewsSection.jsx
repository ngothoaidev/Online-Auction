import { Star, ThumbsUp, ThumbsDown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ReviewsSection({ reviews }) {
  const navigate = useNavigate();

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Star size={24} style={{ color: 'var(--accent)' }} />
          Reviews & Ratings
        </h2>
        <button
          onClick={() => navigate('/reviews')}
          className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 hover:shadow-md"
          style={{ 
            backgroundColor: 'var(--bg-subtle)', 
            color: 'var(--accent)',
            border: '1px solid var(--border)'
          }}
        >
          View All
          <ArrowRight size={16} />
        </button>
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
                  <p className="font-bold" style={{ color: 'var(--text)' }}>
                    {review.from}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {review.productTitle}
                  </p>
                </div>
              </div>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
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
