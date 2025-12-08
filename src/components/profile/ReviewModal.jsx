import { ThumbsUp, ThumbsDown, MessageSquare, X, Send } from "lucide-react";

export default function ReviewModal({ 
  isOpen, 
  reviewModal, 
  reviewForm, 
  setReviewForm, 
  onSubmit, 
  onClose 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{ backgroundColor: 'var(--bg-soft)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            Rate {reviewModal.type === 'buyer' ? 'Seller' : 'Buyer'}
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-subtle)' }}>
          <p className="font-medium" style={{ color: 'var(--text)' }}>
            {reviewModal.item?.title}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {reviewModal.type === 'buyer' 
              ? `Seller: ${reviewModal.item?.sellerName}` 
              : `Buyer: ${reviewModal.item?.buyerName}`}
          </p>
        </div>

        {/* Rating Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>
            Your Rating
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setReviewForm(prev => ({ ...prev, rating: 'positive' }))}
              className="flex-1 p-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2"
              style={{
                borderColor: reviewForm.rating === 'positive' ? 'var(--success)' : 'var(--border)',
                backgroundColor: reviewForm.rating === 'positive' ? 'var(--success-soft)' : 'transparent',
                color: reviewForm.rating === 'positive' ? 'var(--success)' : 'var(--text)'
              }}
            >
              <ThumbsUp size={24} />
              Positive
            </button>
            <button
              onClick={() => setReviewForm(prev => ({ ...prev, rating: 'negative' }))}
              className="flex-1 p-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2"
              style={{
                borderColor: reviewForm.rating === 'negative' ? 'var(--danger)' : 'var(--border)',
                backgroundColor: reviewForm.rating === 'negative' ? 'var(--danger-soft)' : 'transparent',
                color: reviewForm.rating === 'negative' ? 'var(--danger)' : 'var(--text)'
              }}
            >
              <ThumbsDown size={24} />
              Negative
            </button>
          </div>
        </div>

        {/* Comment */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
            <MessageSquare size={16} className="inline mr-2" />
            Comment
          </label>
          <textarea
            value={reviewForm.comment}
            onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
            placeholder="Share your experience..."
            rows={4}
            className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 resize-none"
            style={{ 
              backgroundColor: 'var(--input-bg)', 
              borderColor: 'var(--input-border)',
              color: 'var(--text)'
            }}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={onSubmit}
          className="w-full px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
        >
          <Send size={18} />
          Submit Review
        </button>
      </div>
    </div>
  );
}
