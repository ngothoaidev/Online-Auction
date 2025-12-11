import { useState } from "react";
import Filter from "../Filter";

export default function ViewAllFavoriteProductFilterSection({ onFilterChange }) {
  const [filters, setFilters] = useState({
    status: [],
    category: [],
    minPrice: undefined,
    maxPrice: undefined,
    sortBy: 'newest'
  });

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="space-y-6">
      {/* Status Filter */}
      <Filter 
        type="status" 
        filters={filters} 
        onFilterChange={handleFilterChange} 
      />

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

      {/* Sort By Filter */}
      <Filter 
        type="sort" 
        filters={filters} 
        onFilterChange={handleFilterChange} 
      />
    </div>
  );
}