import { Clock } from 'lucide-react';

export default function FavoriteAuctionCard({product, formatTime}) {
  return (
    <div 
      className="rounded-xl overflow-hidden border hover:shadow-xl transition-all"
      style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}
    >
      <div className="relative">
        <img src={product.image} alt={product.title} className="w-full h-48 object-cover" />
      </div>
      <div className="p-4">
        <h3 className="font-bold mb-2" style={{ color: 'var(--text)' }}>
          {product.title}
        </h3>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Current Price
            </p>
            <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
              ${product.currentBid}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: 'var(--text-muted)' }}>
            <Clock size={14} className="inline mr-1" />
            {formatTime(product.endTime)}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            {product.totalBids} bids
          </span>
        </div>
      </div>
    </div>
  );
}