import { Clock } from 'lucide-react';
import ViewAllButton from "../../../../components/ViewAllButton";
import AuctionCard from "../../../../components/AuctionCard";

export default function ActiveListingSection({products, formatTime}) {
    return (
        <section>
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Clock size={24} style={{ color: 'var(--accent)' }} />
                Active Listings
            </h2>
            <ViewAllButton page="active-listings" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map(product => (
            <AuctionCard 
                key={product.id} 
                product={product} 
                type="activeListings"
                formatTime={formatTime} 
            />
            ))}
        </div>
        </section>
    );
}