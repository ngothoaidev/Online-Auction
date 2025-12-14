import { Heart } from "lucide-react";
import ViewAllButton from "../../../../components/ViewAllButton";
import AuctionCard from "../../../../components/AuctionCard";

export default function FavoriteSection({products, formatTime}) {
    return (
        <section>
            <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <Heart size={24} style={{ color: 'var(--danger)' }} />
                Favorite Products
            </h2>
            <ViewAllButton page="favorites-products" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map(product => (
                <AuctionCard 
                key={product.id} 
                product={product} 
                variant="favorites" 
                />
            ))}
            </div>
        </section>
    );
}