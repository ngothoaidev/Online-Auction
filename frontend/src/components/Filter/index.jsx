import CategoryFilter from "./CategoryFilter";
import PriceRangeFilter from "./PriceRangeFilter";
import StatusFilter from "./StatusFilter";
import TimeRemainingFilter from "./TimeRemainingFilter";
import SortByFilter from "./SortByFilter";
import BidStatusFilter from "./BidStatusFilter";
import ReviewFilter from "./ReviewFilter";
import DateRangeFilter from "./DateRangeFilter";

export default function Filter({
    type,
    products,
    filters,
    onFilterChange
}) {
    switch (type) {
        case 'category':
            return (
                <CategoryFilter 
                    selectedCategories={filters?.category}
                    onCategoryChange={(categories) => onFilterChange({ ...filters, category: categories })}
                />
            );
        
        case 'price':
            return (
                <PriceRangeFilter 
                    minPrice={filters?.minPrice}
                    maxPrice={filters?.maxPrice}
                    onMinChange={(min) => onFilterChange({ ...filters, minPrice: min })}
                    onMaxChange={(max) => onFilterChange({ ...filters, maxPrice: max })}
                />
            );
        
        case 'status':
            return (
                <StatusFilter 
                    selectedStatus={filters?.status}
                    onStatusChange={(status) => onFilterChange({ ...filters, status })}
                />
            );
        
        case 'timeRemaining':
            return (
                <TimeRemainingFilter 
                    selectedTime={filters?.timeRemaining}
                    onTimeChange={(time) => onFilterChange({ ...filters, timeRemaining: time })}
                />
            );
        
        case 'sort':
            return (
                <SortByFilter 
                    sortBy={filters?.sortBy}
                    onSortChange={(sort) => onFilterChange({ ...filters, sortBy: sort })}
                />
            );
        
        case 'bidStatus':
            return (
                <BidStatusFilter 
                    selectedBidStatus={filters?.bidStatus}
                    onBidStatusChange={(bidStatus) => onFilterChange({ ...filters, bidStatus })}
                />
            );
        
        case 'review':
            return (
                <ReviewFilter 
                    selectedRatings={filters?.reviewRating}
                    onRatingChange={(ratings) => onFilterChange({ ...filters, reviewRating: ratings })}
                    reviewType={filters?.reviewType}
                    onReviewTypeChange={(type) => onFilterChange({ ...filters, reviewType: type })}
                    hasReview={filters?.hasReview}
                    onHasReviewChange={(has) => onFilterChange({ ...filters, hasReview: has })}
                />
            );
        
        case 'dateRange':
            return (
                <DateRangeFilter 
                    dateRange={filters?.dateRange}
                    onDateRangeChange={(range) => onFilterChange({ ...filters, dateRange: range })}
                    startDate={filters?.startDate}
                    endDate={filters?.endDate}
                    onStartDateChange={(date) => onFilterChange({ ...filters, startDate: date })}
                    onEndDateChange={(date) => onFilterChange({ ...filters, endDate: date })}
                />
            );
        
        default:
            return null;
    }
}

// Export all filter components for direct use
export {
    CategoryFilter,
    PriceRangeFilter,
    StatusFilter,
    TimeRemainingFilter,
    SortByFilter,
    BidStatusFilter,
    ReviewFilter,
    DateRangeFilter
};