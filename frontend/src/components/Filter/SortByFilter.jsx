export default function SortByFilter({ sortBy, onSortChange }) {
  const sortOptions = [
    { value: 'ending-soon', label: 'Ending Soon' },
    { value: 'newly-listed', label: 'Newly Listed' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'most-bids', label: 'Most Bids' }
  ];

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
        Sort By
      </h4>
      <select
        value={sortBy || 'ending-soon'}
        onChange={(e) => onSortChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border text-sm"
        style={{ 
          backgroundColor: 'var(--bg)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}
      >
        {sortOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
