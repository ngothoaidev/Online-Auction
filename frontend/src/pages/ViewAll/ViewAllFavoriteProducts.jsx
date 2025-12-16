import { useState } from "react";
import { Heart, X, ArrowLeft, Grid, List } from "lucide-react";
import { useNav } from "../../hooks/useNavigate";
import FilterSection from "../../components/FilterSection";
import AuctionCard from "../../components/AuctionCard";
import { useAuth } from "../../contexts/AuthContext";

export default function ViewAllFavoriteProducts() { 
    const { user } = useAuth();
    const nav = useNav();
    const [filters, setFilters] = useState({});
    const [favorites, setFavorites] = useState(user?.favoriteProducts || []);
    
    const handleRemoveFavorite = (productId) => {
        setFavorites(favorites.filter(item => item.id !== productId));
    };
    
    const handleRemoveAll = () => {
        if (window.confirm('Are you sure you want to remove all favorites?')) {
            setFavorites([]);
        }
    };

    // Apply filters
    const filteredFavorites = favorites.filter(item => {
        // Category filter
        if (filters.category && filters.category.length > 0) {
            if (!filters.category.includes(item.category)) {
                return false;
            }
        }

        // Price range filter
        if (filters.minPrice !== undefined && item.currentBid < filters.minPrice) {
            return false;
        }
        if (filters.maxPrice !== undefined && item.currentBid > filters.maxPrice) {
            return false;
        }

        // Status filter
        if (filters.status) {
            const now = new Date();
            const endTime = new Date(item.auctionEndTime);
            const hoursRemaining = (endTime - now) / (1000 * 60 * 60);

            switch (filters.status) {
                case 'active':
                    if (endTime <= now) return false;
                    break;
                case 'ending-soon':
                    if (hoursRemaining > 24 || hoursRemaining <= 0) return false;
                    break;
                case 'ended':
                    if (endTime > now) return false;
                    break;
                case 'all':
                default:
                    break;
            }
        }

        return true;
    });

    // Apply sorting
    const sortedFavorites = [...filteredFavorites].sort((a, b) => {
        switch (filters.sortBy) {
            case 'price-low':
                return a.currentBid - b.currentBid;
            case 'price-high':
                return b.currentBid - a.currentBid;
            case 'ending-soon':
                return new Date(a.auctionEndTime) - new Date(b.auctionEndTime);
            case 'newly-listed':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'most-bids':
                return (b.totalBids || 0) - (a.totalBids || 0);
            case 'newest':
            default:
                return new Date(b.createdAt) - new Date(a.createdAt);
        }
    });

    return (
        <div className="min-h-screen py-8" style={{ backgroundColor: 'var(--bg)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    {/* Back Button */}
                    <button
                        onClick={() => nav.back()}
                        className="flex items-center gap-2 mb-6 transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <ArrowLeft size={20} />
                        <span>Back to Profile</span>
                    </button>

                    {/* Page Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" style={{ color: 'var(--text)' }}>
                                <Heart size={32} style={{ color: 'var(--danger)' }} />
                                Favorite Products
                            </h1>
                            <p style={{ color: 'var(--text-muted)' }}>
                                {favorites.length} {favorites.length === 1 ? 'item' : 'items'} saved
                            </p>
                        </div>
                        
                        {favorites.length > 0 && (
                            <button
                                onClick={handleRemoveAll}
                                className="px-4 py-2 rounded-lg border transition-colors"
                                style={{ 
                                    borderColor: 'var(--border)',
                                    color: 'var(--danger)'
                                }}
                            >
                                Remove All
                            </button>
                        )}
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Filters Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="p-6 rounded-xl sticky top-8" style={{ backgroundColor: 'var(--bg-soft)' }}>
                                <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Filters</h3>
                                <FilterSection type="favoriteProduct" onFilterChange={setFilters} />
                            </div>
                        </div>

                        {/* Favorites Grid */}
                        <div className="lg:col-span-3">
                            {sortedFavorites.length === 0 ? (
                                <div className="text-center py-16 rounded-xl" style={{ backgroundColor: 'var(--bg-soft)' }}>
                                    <Heart size={64} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
                                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>No Favorites Yet</h3>
                                    <p style={{ color: 'var(--text-muted)' }}>Start adding items to your favorites</p>
                                    <button
                                        onClick={() => nav.search('/products')}
                                        className="mt-4 px-6 py-2 rounded-lg font-medium"
                                        style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
                                    >
                                        Browse Products
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {sortedFavorites.map(product => (
                                        <AuctionCard 
                                            key={product.id} 
                                            product={product} 
                                            variant="favorites" 
                                            onRemove={handleRemoveFavorite}
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
