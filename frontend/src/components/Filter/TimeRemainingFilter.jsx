export default function TimeRemainingFilter({ selectedTime, onTimeChange }) {
  const timeOptions = [
    { value: 'any', label: 'Any Time' },
    { value: '1h', label: 'Less than 1 hour' },
    { value: '24h', label: 'Less than 24 hours' },
    { value: '3d', label: 'Less than 3 days' },
    { value: '7d', label: 'Less than 7 days' }
  ];

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
        Time Remaining
      </h4>
      <div className="space-y-2">
        {timeOptions.map(option => (
          <label key={option.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="timeRemaining"
              value={option.value}
              checked={selectedTime === option.value}
              onChange={(e) => onTimeChange(e.target.value)}
              className="w-4 h-4 accent-[var(--accent)]"
            />
            <span className="text-sm" style={{ color: 'var(--text)' }}>
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
