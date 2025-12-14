import { X, Clock } from 'lucide-react';
import { formatTimeLeft } from '../../utils/format';

export default function FavoriteAuctionCard({product, onRemove}) {
  return (
    <div className="relative group">
      {/* Remove Button */}
      <button
          onClick={() => onRemove(product.id)}
          className="absolute top-4 right-4 z-10 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
          style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
      >
          <X size={16} style={{ color: 'var(--danger)' }} />
      </button>
      
      <div className="rounded-xl overflow-hidden border hover:shadow-xl transition-all"
            style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}>
          <img src={product.image} alt={product.title} className="w-full h-48 object-cover" />
          <div className="p-4">
              <h3 className="font-bold mb-2" style={{ color: 'var(--text)' }}>
                  {product.title}
              </h3>
              
              <div className="flex items-center justify-between mb-4">
                  <div>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Current Price</p>
                      <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
                          ${product.currentBid}
                      </p>
                  </div>
              </div>
              
              <div className="flex items-center justify-between text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                  <span>{formatTimeLeft(product.endTime).timeLeft}</span>
                  <span>{product.totalBids} bids</span>
              </div>
              
              <button
                  className="w-full py-2 rounded-lg font-medium transition-all"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
              >
                  Bid Now
              </button>
          </div>
      </div>
  </div>
  );
}