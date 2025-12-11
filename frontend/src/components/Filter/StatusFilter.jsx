export default function StatusFilter({ selectedStatus, onStatusChange }) {
  const statuses = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'ending-soon', label: 'Ending Soon' },
    { value: 'ended', label: 'Ended' }
  ];

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
        Status
      </h4>
      <div className="space-y-2">
        {statuses.map(status => (
          <label key={status.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="status"
              value={status.value}
              checked={selectedStatus === status.value}
              onChange={(e) => onStatusChange(e.target.value)}
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
