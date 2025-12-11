export default function ReviewFilter({ 
  selectedRatings, 
  onRatingChange,
  reviewType,
  onReviewTypeChange,
  hasReview,
  onHasReviewChange
}) {
  const ratingOptions = [
    { value: 'positive', label: 'Positive' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'negative', label: 'Negative' }
  ];

  const reviewTypes = [
    { value: 'all', label: 'All Reviews' },
    { value: 'buyer', label: 'As Buyer' },
    { value: 'seller', label: 'As Seller' }
  ];

  const handleRatingToggle = (value) => {
    if (!selectedRatings || selectedRatings.length === 0) {
      onRatingChange([value]);
      return;
    }

    if (selectedRatings.includes(value)) {
      onRatingChange(selectedRatings.filter(r => r !== value));
    } else {
      onRatingChange([...selectedRatings, value]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h4 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
          Review Type
        </h4>
        <div className="space-y-2">
          {reviewTypes.map(type => (
            <label key={type.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="reviewType"
                value={type.value}
                checked={reviewType === type.value}
                onChange={(e) => onReviewTypeChange(e.target.value)}
                className="w-4 h-4 accent-[var(--accent)]"
              />
              <span className="text-sm" style={{ color: 'var(--text)' }}>
                {type.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
          Rating
        </h4>
        <div className="space-y-2">
          {ratingOptions.map(rating => (
            <label key={rating.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedRatings?.includes(rating.value) || false}
                onChange={() => handleRatingToggle(rating.value)}
                className="w-4 h-4 accent-[var(--accent)]"
              />
              <span className="text-sm" style={{ color: 'var(--text)' }}>
                {rating.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
