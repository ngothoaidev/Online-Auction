import { Clock } from 'lucide-react';
import { formatTimeLeft } from '../../utils/format';

export default function ActiveBidsAuctionCard({product}){
  return (
    <div className="rounded-xl overflow-hidden transition-all hover:shadow-lg border" 
      style={{ 
        backgroundColor: 'var(--auction-bg)', 
        borderColor: 'var(--auction-border)',
        boxShadow: 'var(--auction-shadow)'
      }}
    >
      <div className="relative">
          <img src={product.image} alt={product.title} className="w-full h-48 object-cover" />
          {product.isWinning ? (
              <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm" style={{ backgroundColor: 'var(--auction-success)', color: '#fff' }}>
                  Winning
              </div>
          ) : (
              <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm" style={{ backgroundColor: 'var(--auction-danger)', color: '#fff' }}>
                  Outbid
              </div>
          )}
      </div>
      <div className="p-4">
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--auction-text)' }}>{product.title}</h3>
          <div className="space-y-3">
              <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--auction-text-muted)' }}>Your Bid</span>
                  <span className="font-bold" style={{ color: 'var(--auction-text)' }}>${product.yourBid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--auction-text-muted)' }}>Current Price</span>
                  <span className="font-bold" style={{ color: product.isWinning ? 'var(--auction-success)' : 'var(--auction-danger)' }}>
                      ${product.currentPrice.toLocaleString()}
                  </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: 'var(--auction-border)' }}>
                  <div className="flex items-center gap-1" style={{ color: 'var(--auction-text-muted)' }}>
                      <Clock size={16} />
                      <span className="text-sm">{formatTimeLeft(product.endTime).timeLeft}</span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--auction-text-subtle)' }}>
                      {product.totalBids} bids
                  </span>
              </div>
          </div>
          <button 
              className="w-full mt-4 px-4 py-2 rounded-lg font-medium transition-colors hover:brightness-110"
              style={{ backgroundColor: 'var(--auction-accent)', color: 'var(--auction-accent-fg)' }}
          >
              {product.isWinning ? 'View Auction' : 'Increase Bid'}
          </button>
      </div>
  </div>
  );
}