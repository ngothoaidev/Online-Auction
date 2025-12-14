import { useState } from "react";
import { Trophy, DollarSign, Star, ArrowLeft, Calendar } from "lucide-react";
import { useNav } from "../../hooks/useNavigate.js";
import FilterSection from "../../components/FilterSection";
import { mockUserData } from "../../data/users";
import AuctionCard from "../../components/AuctionCard"

export default function ViewAllWonItems() {
    const nav = useNav();
    const [filters, setFilters] = useState({});
    const [reviewModal, setReviewModal] = useState({ isOpen: false, item: null });
    const wonAuctions = mockUserData.wonAuctions || [];
    
    const totalWon = wonAuctions.length;
    const totalSpent = wonAuctions.reduce((sum, item) => sum + item.winningBid, 0);
    const pendingReviews = wonAuctions.filter(item => !item.reviewed).length;
    
    // Apply filters
    const filteredWonItems = wonAuctions.filter(item => {
        // Category filter
        if (filters.category && filters.category.length > 0) {
            if (!filters.category.includes(item.category)) return false;
        }

        // Review filter
        if (filters.hasReview !== undefined) {
            if (filters.hasReview && !item.reviewed) return false;
            if (!filters.hasReview && item.reviewed) return false;
        }

        // Date range filter
        if (filters.dateRange && filters.dateRange !== 'all-time') {
            const wonDate = new Date(item.wonDate);
            const now = new Date();
            const daysDiff = (now - wonDate) / (1000 * 60 * 60 * 24);

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
                        if (wonDate < startDate) return false;
                    }
                    if (filters.endDate) {
                        const endDate = new Date(filters.endDate);
                        if (wonDate > endDate) return false;
                    }
                    break;
            }
        }

        return true;
    });

    // Apply sorting
    const sortedWonItems = [...filteredWonItems].sort((a, b) => {
        switch (filters.sortBy) {
            case 'time-desc':
                return new Date(b.wonDate) - new Date(a.wonDate);
            case 'time-asc':
                return new Date(a.wonDate) - new Date(b.wonDate);
            case 'price-high':
                return b.winningBid - a.winningBid;
            case 'price-low':
                return a.winningBid - b.winningBid;
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
                        <Trophy size={32} style={{ color: 'var(--accent)' }} />
                        Won Auctions
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>Congratulations on your winning bids!</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--bg-soft)', borderLeft: '4px solid var(--accent)' }}>
                        <div className="flex items-center gap-3">
                            <Trophy size={24} style={{ color: 'var(--accent)' }} />
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Won</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{totalWon}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--bg-soft)', borderLeft: '4px solid var(--success)' }}>
                        <div className="flex items-center gap-3">
                            <DollarSign size={24} style={{ color: 'var(--success)' }} />
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Spent</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>${totalSpent.toLocaleString()}</p>
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
                            <FilterSection type="wonItem" onFilterChange={setFilters} />
                        </div>
                    </div>

                    <div className="lg:col-span-3">
                        {filteredWonItems.length === 0 ? (
                            <div className="text-center py-16 rounded-xl" style={{ backgroundColor: 'var(--bg-soft)' }}>
                                <Trophy size={64} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
                                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>No Won Auctions</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Keep bidding to win amazing items!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {sortedWonItems.map(item => (
                                    <AuctionCard 
                                        key={item.id} 
                                        product={item} 
                                        variant="wonItem"
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
