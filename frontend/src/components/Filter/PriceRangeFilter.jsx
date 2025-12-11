import { useState } from "react";

export default function PriceRangeFilter({ minPrice, maxPrice, onMinChange, onMaxChange }) {
  const [localMin, setLocalMin] = useState(minPrice || '');
  const [localMax, setLocalMax] = useState(maxPrice || '');

  const handleMinChange = (e) => {
    const value = e.target.value;
    setLocalMin(value);
    onMinChange(value ? parseFloat(value) : undefined);
  };

  const handleMaxChange = (e) => {
    const value = e.target.value;
    setLocalMax(value);
    onMaxChange(value ? parseFloat(value) : undefined);
  };

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
        Price Range
      </h4>
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="Min"
          value={localMin}
          onChange={handleMinChange}
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{ 
            backgroundColor: 'var(--bg)',
            borderColor: 'var(--border)',
            color: 'var(--text)'
          }}
        />
        <span style={{ color: 'var(--text-muted)' }}>-</span>
        <input
          type="number"
          placeholder="Max"
          value={localMax}
          onChange={handleMaxChange}
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{ 
            backgroundColor: 'var(--bg)',
            borderColor: 'var(--border)',
            color: 'var(--text)'
          }}
        />
      </div>
    </div>
  );
}
