import { useState } from "react";
import Filter from "../Filter";

export default function ViewAllWonItemFilterSection({ onFilterChange }) {
  const [filters, setFilters] = useState({
    hasReview: undefined,
    category: [],
    dateRange: 'all-time',
    sortBy: 'time-desc'
  });

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="space-y-6">
      {/* Review Filter */}
      <Filter 
        type="review" 
        filters={filters} 
        onFilterChange={handleFilterChange} 
      />

      {/* Category Filter */}
      <Filter 
        type="category" 
        filters={filters} 
        onFilterChange={handleFilterChange} 
      />

      {/* Date Range Filter */}
      <Filter 
        type="dateRange" 
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