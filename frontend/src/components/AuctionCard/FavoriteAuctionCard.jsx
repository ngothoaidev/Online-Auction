import { X } from 'lucide-react';
import { formatTimeLeft } from '../../utils/format';

export default function FavoriteAuctionCard({product, onRemove}) {
  return (
    <div className="relative group">
      {/* Remove Button */}
      <button
          onClick={() => onRemove(product.id)}
          className="absolute top-4 right-4 z-10 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-md hover:scale-110"
          style={{ backgroundColor: 'var(--auction-bg)', border: '1px solid var(--auction-border)' }}
      >
          <X size={16} style={{ color: 'var(--auction-danger)' }} />
      </button>
      
      <div className="rounded-xl overflow-hidden border hover:shadow-xl transition-all"
            style={{ 
              backgroundColor: 'var(--auction-bg)', 
              borderColor: 'var(--auction-border)',
              boxShadow: 'var(--auction-shadow)'
            }}>
          <img src={product.image} alt={product.title} className="w-full h-48 object-cover" />
          <div className="p-4">
              <h3 className="font-bold mb-2 truncate" style={{ color: 'var(--auction-text)' }}>
                  {product.title}
              </h3>
              
              <div className="flex items-center justify-between mb-4">
                  <div>
                      <p className="text-sm" style={{ color: 'var(--auction-text-muted)' }}>Current Price</p>
                      <p className="text-xl font-bold" style={{ color: 'var(--auction-accent)' }}>
                          ${product.currentBid}
                      </p>
                  </div>
              </div>
              
              <div className="flex items-center justify-between text-sm mb-4" style={{ color: 'var(--auction-text-muted)' }}>
                  <span>{formatTimeLeft(product.endTime).timeLeft}</span>
                  <span>{product.totalBids} bids</span>
              </div>
              
              <button
                  className="w-full py-2 rounded-lg font-medium transition-all hover:brightness-110"
                  style={{ backgroundColor: 'var(--auction-accent)', color: 'var(--auction-accent-fg)' }}
              >
                  Bid Now
              </button>
          </div>
      </div>
  </div>
  );
}