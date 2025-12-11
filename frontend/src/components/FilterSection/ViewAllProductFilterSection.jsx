import { useState } from "react";
import Filter from "../Filter";

export default function ViewAllProductFilterSection({ onFilterChange }) {
  const [filters, setFilters] = useState({
    category: [],
    status: [],
    minPrice: undefined,
    maxPrice: undefined,
    timeRemaining: 'any',
    sortBy: 'ending-soon'
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

      {/* Status Filter */}
      <Filter 
        type="status" 
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