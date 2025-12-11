import { Gavel } from 'lucide-react';
import ViewAllButton from '../../../../components/ViewAllButton';
import AuctionCard from '../../../../components/AuctionCard';

export default function SoldItemSection({ products, setReviewModal, handleCancelTransaction }) {
    return (
        <section>
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Gavel size={24} style={{ color: 'var(--accent)' }} />
                Sold Items
            </h2>
            <ViewAllButton page="sold-items" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map(product => (
            <AuctionCard
                key={product.id} 
                product={product}
                type="soldItem"
                onReview={(item) => setReviewModal({ isOpen: true, item, type: 'seller' })}
                onCancel={handleCancelTransaction}
            />
            ))}
        </div>
        </section>
    );
}
