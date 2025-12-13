import { Clock, MapPin, Gavel } from 'lucide-react';
import { formatCurrency } from '../../utils/format.js';

export default function BiddingSection({ product, bidAmount, onBidAmountChange, onBid, timeLeft }) {
  if (!product) return null;

  return (
    <div className="rounded-2xl p-6 border" style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}>
      <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text)' }}>
        {product.title}
      </h1>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
            Current Price
          </label>
          <div className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>
            {formatCurrency(product.currentPrice)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Time Remaining
            </label>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <span 
                className={`font-semibold ${
                  timeLeft?.urgencyLevel === 'critical' ? 'text-red-600' :
                  timeLeft?.urgencyLevel === 'warning' ? 'text-yellow-600' :
                  'text-green-600'
                }`}
              >
                {timeLeft?.timeLeft || 'Loading...'}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Location
            </label>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text)' }}>Ho Chi Minh City</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
            Bid Adjustment
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => onBidAmountChange(e.target.value)}
              min={product.currentPrice + product.biddingStep}
              step={product.biddingStep}
              className="flex-1 px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{ 
                backgroundColor: 'var(--bg)', 
                borderColor: 'var(--border)', 
                color: 'var(--text)' 
              }}
              placeholder={`Min: ${formatCurrency(product.currentPrice + product.biddingStep)}`}
            />
            <button
              onClick={onBid}
              className="px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Gavel className="w-5 h-5" />
              Place Bid
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Minimum bid: {formatCurrency(product.currentPrice + product.biddingStep)}
          </p>
        </div>
      </div>
    </div>
  );
}
