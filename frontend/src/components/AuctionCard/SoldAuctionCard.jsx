import { Star, Ban, Calendar } from "lucide-react";
import { formatDate } from "../../utils/format"

export default function SoldAuctionCard({ product, onReview, onCancel }) {
  const isCancelled = product.status === 'cancelled';
  
  return (
    <div className="rounded-xl overflow-hidden border hover:shadow-xl transition-all" 
      style={{ 
        backgroundColor: 'var(--auction-bg)', 
        borderColor: 'var(--auction-border)',
        boxShadow: 'var(--auction-shadow)'
      }}
    >
      <img src={product.image} alt={product.title} className="w-full h-48 object-cover" />
      <div className="p-4">
        <h3 className="font-bold mb-2" style={{ color: 'var(--auction-text)' }}>{product.title}</h3>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm" style={{ color: 'var(--auction-text-muted)' }}>Final Sale Price</p>
            <p className="text-xl font-bold" style={{ color: 'var(--auction-success)' }}>${product.soldPrice}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm mb-4 pt-3 border-t" style={{ color: 'var(--auction-text-muted)', borderColor: 'var(--auction-border)' }}>
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
              className="sold-auction-btn-primary w-full px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 hover:brightness-110"
              style={{ backgroundColor: 'var(--auction-accent)', color: 'var(--auction-accent-fg)' }}
            >
              <Star size={16} />
              Rate Buyer
            </button>
            <button
              onClick={() => onCancel(product.id)}
              className="w-full px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 border hover:bg-[var(--auction-danger-bg)]"
              style={{ 
                borderColor: 'var(--auction-danger)', 
                color: 'var(--auction-danger)',
                backgroundColor: 'transparent'
              }}
            >
              <Ban size={16} />
              Cancel Transaction
            </button>
          </div>
        ) : (
          <div 
            className="w-full px-4 py-2 rounded-lg text-center text-sm font-medium border"
            style={{ 
              backgroundColor: isCancelled ? 'var(--auction-danger-bg)' : 'var(--auction-success-bg)', 
              color: isCancelled ? 'var(--auction-danger)' : 'var(--auction-success)',
              borderColor: isCancelled ? 'var(--auction-danger)' : 'var(--auction-success)'
            }}
          >
            {isCancelled ? '✗ Transaction Cancelled' : '✓ Already Reviewed'}
          </div>
        )}
      </div>
    </div>
  );
}