import { useState } from "react";
import Filter from "../Filter";

export default function ViewAllSoldItemFilterSection({ onFilterChange }) {
  const [filters, setFilters] = useState({
    dateRange: 'all-time',
    minPrice: undefined,
    maxPrice: undefined,
    reviewType: 'all',
    sortBy: 'time-desc'
  });

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Filter 
        type="dateRange" 
        filters={filters} 
        onFilterChange={handleFilterChange} 
      />

      {/* Price Range Filter */}
      <Filter 
        type="price" 
        filters={filters} 
        onFilterChange={handleFilterChange} 
      />

      {/* Review Filter */}
      <Filter 
        type="review" 
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