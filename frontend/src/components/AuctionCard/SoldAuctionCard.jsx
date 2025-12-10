import { Star, Ban } from "lucide-react";

export default function SoldAuctionCard({ product, onReview, onCancel }) {
  const isCancelled = product.status === 'cancelled';
  
  return (
    <div 
      className="rounded-xl overflow-hidden border"
      style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}
    >
      <div className="relative">
        <img src={product.image} alt={product.title} className="w-full h-48 object-cover" />
        <div 
          className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold"
          style={{ 
            backgroundColor: isCancelled ? 'var(--danger)' : 'var(--success)', 
            color: 'white' 
          }}
        >
          {isCancelled ? 'Cancelled' : 'Sold'}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold mb-2" style={{ color: 'var(--text)' }}>
          {product.title}
        </h3>
        <div className="mb-3">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Sold Price
          </p>
          <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
            ${product.soldPrice}
          </p>
        </div>
        <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
          Buyer: {product.buyerName}
        </p>
        {!product.reviewed && !isCancelled ? (
          <div className="space-y-2">
            <button
              onClick={() => onReview(product)}
              className="w-full px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
            >
              <Star size={16} />
              Rate Buyer
            </button>
            <button
              onClick={() => onCancel(product.id)}
              className="w-full px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 border"
              style={{ 
                borderColor: 'var(--danger)', 
                color: 'var(--danger)',
                backgroundColor: 'transparent'
              }}
            >
              <Ban size={16} />
              Cancel Transaction
            </button>
          </div>
        ) : (
          <div 
            className="w-full px-4 py-2 rounded-lg text-center text-sm font-medium"
            style={{ 
              backgroundColor: isCancelled ? 'var(--danger-soft)' : 'var(--success-soft)', 
              color: isCancelled ? 'var(--danger)' : 'var(--success)' 
            }}
          >
            {isCancelled ? '✗ Transaction Cancelled' : '✓ Already Reviewed'}
          </div>
        )}
      </div>
    </div>
  );
}