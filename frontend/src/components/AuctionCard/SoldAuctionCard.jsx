import { Star, Ban, Calendar } from "lucide-react";
import { formatDate } from "../../utils/format"

export default function SoldAuctionCard({ product, onReview, onCancel }) {
  const isCancelled = product.status === 'cancelled';
  
  return (
    <div className="rounded-xl overflow-hidden border hover:shadow-xl transition-all" style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}>
      <img src={product.image} alt={product.title} className="w-full h-48 object-cover" />
      <div className="p-4">
        <h3 className="font-bold mb-2" style={{ color: 'var(--text)' }}>{product.title}</h3>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Final Sale Price</p>
            <p className="text-xl font-bold" style={{ color: 'var(--success)' }}>${product.soldPrice}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            {formatDate(product.endTime)}
          </span>
          <span>Buyer: {product.buyerName}</span>
        </div>
        {!product.reviewed && !isCancelled ? (
          <div className="space-y-2">
            <button
              onClick={() => onReview(product)}
              className="sold-auction-btn-primary w-full px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
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