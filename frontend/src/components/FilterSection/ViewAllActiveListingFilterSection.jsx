import { useState } from "react";
import Filter from "../Filter";

export default function ViewAllActiveListingFilterSection({ onFilterChange }) {
  const [filters, setFilters] = useState({
    category: [],
    minPrice: undefined,
    maxPrice: undefined,
    timeRemaining: 'any',
    sortBy: 'bids-high'
  });

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <Filter 
        type="category" 
        filters={filters} 
        onFilterChange={handleFilterChange} 
      />

      {/* Price Range Filter */}
      <Filter 
        type="price" 
        filters={filters} 
        onFilterChange={handleFilterChange} 
      />

      {/* Time Remaining Filter */}
      <Filter 
        type="timeRemaining" 
        filters={filters} 
        onFilterChange={handleFilterChange} 
      />

      {/* Sort By Filter */}
      <Filter 
        type="sort" 
        filters={filters} 
        onFilterChange={handleFilterChange} 
      />
    </div>
  );
}