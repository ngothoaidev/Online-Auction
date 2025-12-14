import { useState } from "react";
import { CheckCircle, DollarSign, Star, Calendar, ArrowLeft, XCircle } from "lucide-react";
import { useNav } from "../../hooks/useNavigate";
import FilterSection from "../../components/FilterSection";
import { mockUserData } from "../../data/users";
import AuctionCard from "../../components/AuctionCard";

export default function ViewAllSoldItems() {
    const nav = useNav();
    const [filters, setFilters] = useState({});
    const soldItems = mockUserData.soldItems || [];
    
    const totalSales = soldItems.length;
    const totalRevenue = soldItems.reduce((sum, item) => sum + item.soldPrice, 0);
    const pendingReviews = soldItems.filter(item => !item.reviewed).length;
    
    // Apply filters
    const filteredSoldItems = soldItems.filter(item => {
        // Price range filter
        if (filters.minPrice !== undefined && item.soldPrice < filters.minPrice) return false;
        if (filters.maxPrice !== undefined && item.soldPrice > filters.maxPrice) return false;

        // Review type filter
        if (filters.reviewType && filters.reviewType !== 'all') {
            if (filters.reviewType === 'reviewed' && !item.reviewed) return false;
            if (filters.reviewType === 'not-reviewed' && item.reviewed) return false;
        }

        // Date range filter
        if (filters.dateRange && filters.dateRange !== 'all-time') {
            const soldDate = new Date(item.soldDate);
            const now = new Date();
            const daysDiff = (now - soldDate) / (1000 * 60 * 60 * 24);

            switch (filters.dateRange) {
                case 'today':
                    if (daysDiff > 1) return false;
                    break;
                case '7days':
                    if (daysDiff > 7) return false;
                    break;
                case '30days':
                    if (daysDiff > 30) return false;
                    break;
                case 'custom':
                    if (filters.startDate) {
                        const startDate = new Date(filters.startDate);
                        if (soldDate < startDate) return false;
                    }
                    if (filters.endDate) {
                        const endDate = new Date(filters.endDate);
                        if (soldDate > endDate) return false;
                    }
                    break;
            }
        }

        return true;
    });

    // Apply sorting
    const sortedSoldItems = [...filteredSoldItems].sort((a, b) => {
        switch (filters.sortBy) {
            case 'time-desc':
                return new Date(b.soldDate) - new Date(a.soldDate);
            case 'time-asc':
                return new Date(a.soldDate) - new Date(b.soldDate);
            case 'price-high':
                return b.soldPrice - a.soldPrice;
            case 'price-low':
                return a.soldPrice - b.soldPrice;
            default:
                return 0;
        }
    });

    return (
        <div className="min-h-screen py-8" style={{ backgroundColor: 'var(--bg)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <button onClick={() => nav.back()} className="flex items-center gap-2 mb-6 transition-colors" style={{ color: 'var(--text-muted)' }}>
                        <ArrowLeft size={20} />
                        <span>Back to Profile</span>
                    </button>

                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" style={{ color: 'var(--text)' }}>
                            <CheckCircle size={32} style={{ color: 'var(--success)' }} />
                            Sold Items
                        </h1>
                        <p style={{ color: 'var(--text-muted)' }}>Your successful sales history</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--bg-soft)', borderLeft: '4px solid var(--success)' }}>
                            <div className="flex items-center gap-3">
                                <CheckCircle size={24} style={{ color: 'var(--success)' }} />
                                <div>
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Sales</p>
                                    <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{totalSales}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--bg-soft)', borderLeft: '4px solid var(--accent)' }}>
                            <div className="flex items-center gap-3">
                                <DollarSign size={24} style={{ color: 'var(--accent)' }} />
                                <div>
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Revenue</p>
                                    <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>${totalRevenue.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--bg-soft)', borderLeft: '4px solid var(--warning)' }}>
                            <div className="flex items-center gap-3">
                                <Star size={24} style={{ color: 'var(--warning)' }} />
                                <div>
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pending Reviews</p>
                                    <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{pendingReviews}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        <div className="lg:col-span-1">
                            <div className="p-6 rounded-xl sticky top-8" style={{ backgroundColor: 'var(--bg-soft)' }}>
                                <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Filters</h3>
                                <FilterSection type="soldItem" onFilterChange={setFilters} />
                            </div>
                        </div>

                        <div className="lg:col-span-3">
                            {filteredSoldItems.length === 0 ? (
                                <div className="text-center py-16 rounded-xl" style={{ backgroundColor: 'var(--bg-soft)' }}>
                                    <CheckCircle size={64} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
                                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>No Sold Items</h3>
                                    <p style={{ color: 'var(--text-muted)' }}>Your sold items will appear here</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {sortedSoldItems.map(item => (
                                        <AuctionCard 
                                            key={item.id} 
                                            product={item} 
                                            variant="soldItem"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
    );
}
