import { Trophy } from 'lucide-react';
import ViewAllButton from '../../../../components/ViewAllButton';
import AuctionCard from '../../../../components/AuctionCard';


export default function WonSection({products, setReviewModal}) {
    return (
        <section>
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Trophy size={24} style={{ color: 'var(--accent)' }} />
                Won Auctions
            </h2>
            <ViewAllButton page="won-auctions" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map(product => (
            <AuctionCard 
                key={product.id} 
                product={product} 
                variant="wonItem"
                onReview={(item) => setReviewModal({ isOpen: true, item, type: 'buyer' })}
            />
            ))}
        </div>
        </section>
    );
}