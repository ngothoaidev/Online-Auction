import { useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Clock, ArrowLeft } from "lucide-react";
import { useNav } from "../../hooks/useNavigate";
import FilterSection from "../../components/FilterSection";
import { mockUserData } from "../../data/users";
import AuctionCard from "../../components/AuctionCard";

export default function ViewAllActiveBid() {
    const nav = useNav();
    const [filters, setFilters] = useState({});
    const activeBids = mockUserData.activeBids || [];
    
    const totalBids = activeBids.length;
    const totalAmount = activeBids.reduce((sum, bid) => sum + bid.yourBid, 0);
    const winningCount = activeBids.filter(bid => bid.isWinning).length;
    
    // Apply filters
    const filteredBids = activeBids.filter(item => {
        // Bid status filter
        if (filters.bidStatus && filters.bidStatus.length > 0) {
            if (filters.bidStatus.includes('winning') && !item.isWinning) return false;
            if (filters.bidStatus.includes('outbid') && item.isWinning) return false;
        }

        // Category filter
        if (filters.category && filters.category.length > 0) {
            if (!filters.category.includes(item.category)) return false;
        }

        // Price range filter
        if (filters.minPrice !== undefined && item.currentPrice < filters.minPrice) return false;
        if (filters.maxPrice !== undefined && item.currentPrice > filters.maxPrice) return false;

        // Time remaining filter
        if (filters.timeRemaining && filters.timeRemaining !== 'any') {
            const now = new Date();
            const endTime = new Date(item.endTime);
            const hoursRemaining = (endTime - now) / (1000 * 60 * 60);

            switch (filters.timeRemaining) {
                case '1h':
                    if (hoursRemaining > 1 || hoursRemaining <= 0) return false;
                    break;
                case '24h':
                    if (hoursRemaining > 24 || hoursRemaining <= 0) return false;
                    break;
                case '3d':
                    if (hoursRemaining > 72 || hoursRemaining <= 0) return false;
                    break;
                case '7d':
                    if (hoursRemaining > 168 || hoursRemaining <= 0) return false;
                    break;
            }
        }

        return true;
    });

    // Apply sorting
    const sortedBids = [...filteredBids].sort((a, b) => {
        switch (filters.sortBy) {
            case 'ending-soon':
                return new Date(a.endTime) - new Date(b.endTime);
            case 'price-low':
                return a.currentPrice - b.currentPrice;
            case 'price-high':
                return b.currentPrice - a.currentPrice;
            case 'bid-amount-high':
                return b.yourBid - a.yourBid;
            case 'bid-amount-low':
                return a.yourBid - b.yourBid;
            default:
                return 0;
        }
    });

    return (
        <div className="min-h-screen py-8" style={{ backgroundColor: 'var(--bg)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Back Button */}
                <button onClick={() => nav.back()} className="flex items-center gap-2 mb-6 transition-colors" style={{ color: 'var(--text-muted)' }}>
                    <ArrowLeft size={20} />
                    <span>Back to Profile</span>
                </button>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" style={{ color: 'var(--text)' }}>
                        <TrendingUp size={32} style={{ color: 'var(--accent)' }} />
                        My Active Bids
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>Track your ongoing auction bids</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--bg-soft)', borderLeft: '4px solid var(--accent)' }}>
                        <div className="flex items-center gap-3">
                            <TrendingUp size={24} style={{ color: 'var(--accent)' }} />
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Bids</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{totalBids}</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--bg-soft)', borderLeft: '4px solid var(--success)' }}>
                        <div className="flex items-center gap-3">
                            <DollarSign size={24} style={{ color: 'var(--success)' }} />
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Amount</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>${totalAmount.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--bg-soft)', borderLeft: '4px solid var(--warning)' }}>
                        <div className="flex items-center gap-3">
                            <TrendingUp size={24} style={{ color: 'var(--warning)' }} />
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Winning</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{winningCount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Filters */}
                    <div className="lg:col-span-1">
                        <div className="p-6 rounded-xl sticky top-8" style={{ backgroundColor: 'var(--bg-soft)' }}>
                            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Filters</h3>
                            <FilterSection type="activeBid" onFilterChange={setFilters} />
                        </div>
                    </div>

                    {/* Bids Grid */}
                    <div className="lg:col-span-3">
                        {sortedBids.length === 0 ? (
                            <div className="text-center py-16 rounded-xl" style={{ backgroundColor: 'var(--bg-soft)' }}>
                                <TrendingUp size={64} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
                                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>No Active Bids</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Start bidding on auctions to see them here</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {sortedBids.map(bid => (
                                    <AuctionCard
                                        key={bid.id} 
                                        product={bid} 
                                        variant="activeBids"
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