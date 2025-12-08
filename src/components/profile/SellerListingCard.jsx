import { Clock } from "lucide-react";

export default function SellerListingCard({ product, formatTime }) {
  return (
    <div 
      className="rounded-xl overflow-hidden border"
      style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}
    >
      <div className="relative">
        <img src={product.image} alt={product.title} className="w-full h-48 object-cover" />
        <div 
          className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold"
          style={{ backgroundColor: 'var(--info)', color: 'white' }}
        >
          Active
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold mb-2" style={{ color: 'var(--text)' }}>
          {product.title}
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Starting Price
            </p>
            <p className="font-bold" style={{ color: 'var(--text)' }}>
              ${product.startingPrice}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Current Bid
            </p>
            <p className="font-bold" style={{ color: 'var(--accent)' }}>
              ${product.currentPrice}
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
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          Leading: {product.highestBidder}
        </p>
      </div>
    </div>
  );
}
