import { Trophy, Star } from "lucide-react";

export default function WonAuctionCard({ product, onReview }) {
  return (
    <div 
      className="rounded-xl overflow-hidden border"
      style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}
    >
      <div className="relative">
        <img src={product.image} alt={product.title} className="w-full h-48 object-cover" />
        <div 
          className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
          style={{ backgroundColor: 'var(--success)', color: 'white' }}
        >
          <Trophy size={14} />
          Won
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold mb-2" style={{ color: 'var(--text)' }}>
          {product.title}
        </h3>
        <div className="mb-3">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Winning Bid
          </p>
          <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
            ${product.winningBid}
          </p>
        </div>
        <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
          Seller: {product.sellerName}
        </p>
        {!product.reviewed ? (
          <button
            onClick={() => onReview(product)}
            className="w-full px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
          >
            <Star size={16} />
            Rate Seller
          </button>
        ) : (
          <div 
            className="w-full px-4 py-2 rounded-lg text-center text-sm font-medium"
            style={{ backgroundColor: 'var(--success-soft)', color: 'var(--success)' }}
          >
            ✓ Already Reviewed
          </div>
        )}
      </div>
    </div>
  );
}
