export default function BidStatusFilter({ selectedBidStatus, onBidStatusChange }) {
  const bidStatuses = [
    { value: 'all', label: 'All Bids' },
    { value: 'winning', label: 'Winning' },
    { value: 'outbid', label: 'Outbid' }
  ];

  const handleStatusToggle = (value) => {
    if (!selectedBidStatus || selectedBidStatus.length === 0) {
      onBidStatusChange([value]);
      return;
    }

    if (selectedBidStatus.includes(value)) {
      onBidStatusChange(selectedBidStatus.filter(s => s !== value));
    } else {
      onBidStatusChange([...selectedBidStatus, value]);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
        Bid Status
      </h4>
      <div className="space-y-2">
        {bidStatuses.map(status => (
          <label key={status.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedBidStatus?.includes(status.value) || false}
              onChange={() => handleStatusToggle(status.value)}
              className="w-4 h-4 accent-[var(--accent)]"
            />
            <span className="text-sm" style={{ color: 'var(--text)' }}>
              {status.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
