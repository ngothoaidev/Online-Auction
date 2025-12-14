import { Clock } from 'lucide-react';
import { formatTimeLeft } from '../../utils/format';

export default function ActiveBidsAuctionCard({product}){
  return (
    <div className="rounded-xl overflow-hidden transition-all hover:shadow-lg" style={{ backgroundColor: 'var(--bg-soft)', border: '1px solid var(--border)' }}>
      <div className="relative">
          <img src={product.image} alt={product.title} className="w-full h-48 object-cover" />
          {product.isWinning ? (
              <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'var(--success)', color: 'var(--bg)' }}>
                  Winning
              </div>
          ) : (
              <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'var(--danger)', color: 'var(--bg)' }}>
                  Outbid
              </div>
          )}
      </div>
      <div className="p-4">
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>{product.title}</h3>
          <div className="space-y-2">
              <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Your Bid</span>
                  <span className="font-bold" style={{ color: 'var(--text)' }}>${product.yourBid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Current Price</span>
                  <span className="font-bold" style={{ color: product.isWinning ? 'var(--success)' : 'var(--danger)' }}>
                      ${product.currentPrice.toLocaleString()}
                  </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Clock size={16} />
                      <span className="text-sm">{formatTimeLeft(product.endTime).timeLeft}</span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {product.totalBids} bids
                  </span>
              </div>
          </div>
          <button 
              className="w-full mt-4 px-4 py-2 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
          >
              {product.isWinning ? 'View Auction' : 'Increase Bid'}
          </button>
      </div>
  </div>
  );
}