import { Trophy, Star, Calendar } from "lucide-react";
import { formatDate } from "../../utils/format"

export default function WonAuctionCard({ product, onReview }) {
  return (
    <div key={product.id} className="rounded-xl overflow-hidden border hover:shadow-xl transition-all" 
      style={{ 
        backgroundColor: 'var(--auction-bg)', 
        borderColor: 'var(--auction-border)',
        boxShadow: 'var(--auction-shadow)'
      }}
    >
      <div className="relative">
        <img src={product.image} alt={product.title} className="w-full h-48 object-cover" />
        <div 
          className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm"
          style={{ backgroundColor: 'var(--auction-success)', color: 'white' }}
        >
          <Trophy size={14} />
          Won
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold mb-2" style={{ color: 'var(--auction-text)' }}>{product.title}</h3>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm" style={{ color: 'var(--auction-text-muted)' }}>Winning Bid</p>
            <p className="text-xl font-bold" style={{ color: 'var(--auction-accent)' }}>${product.winningBid}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm mb-4 pt-3 border-t" style={{ color: 'var(--auction-text-muted)', borderColor: 'var(--auction-border)' }}>
          <span className="flex items-center gap-1">
            <Calendar size={14} />
            {formatDate(product.endTime)}
          </span>
          <span>Seller: {product.sellerName}</span>
        </div>
        
        {!product.reviewed ? (
          <button
            onClick={() => onReview(product)}
            className="w-full px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 hover:brightness-110"
            style={{ backgroundColor: 'var(--auction-accent)', color: 'var(--auction-accent-fg)' }}
          >
            <Star size={16} />
            Rate Seller
          </button>
        ) : (
          <div 
            className="w-full px-4 py-2 rounded-lg text-center text-sm font-medium border"
            style={{ 
              backgroundColor: 'var(--auction-success-bg)', 
              color: 'var(--auction-success)',
              borderColor: 'var(--auction-success)'
            }}
          >
            ✓ Already Reviewed
          </div>
        )}
      </div>
    </div>
  );
}