export default function DateRangeFilter({ 
  dateRange, 
  onDateRangeChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange
}) {
  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
        Date Range
      </h4>
      <div className="space-y-2">
        {dateRangeOptions.map(option => (
          <label key={option.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="dateRange"
              value={option.value}
              checked={dateRange === option.value}
              onChange={(e) => onDateRangeChange(e.target.value)}
              className="w-4 h-4 accent-[var(--accent)]"
            />
            <span className="text-sm" style={{ color: 'var(--text)' }}>
              {option.label}
            </span>
          </label>
        ))}
      </div>

      {dateRange === 'custom' && (
        <div className="space-y-2 mt-3">
          <input
            type="date"
            value={startDate || ''}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ 
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          />
          <input
            type="date"
            value={endDate || ''}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ 
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          />
        </div>
      )}
    </div>
  );
}
