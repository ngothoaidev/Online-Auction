import { Clock, Edit, Trash2 } from 'lucide-react';
import { formatTimeLeft } from '../../utils/format'

export default function ActiveListingAuctionCard({product}){
  return (
    <div className="rounded-xl overflow-hidden border hover:shadow-xl transition-all" 
      style={{ 
        backgroundColor: 'var(--auction-bg)', 
        borderColor: 'var(--auction-border)',
        boxShadow: 'var(--auction-shadow)'
      }}
    >
      <div className="relative">
          <img src={product.image} alt={product.title} className="w-full h-48 object-cover" />
          <div className="absolute top-2 right-2 flex gap-2">
              <button className="p-2 rounded-full hover:scale-110 transition-transform shadow-sm" 
                style={{ backgroundColor: 'var(--auction-bg)', border: '1px solid var(--auction-border)' }}
              >
                  <Edit size={16} style={{ color: 'var(--auction-accent)' }} />
              </button>
              <button className="p-2 rounded-full hover:scale-110 transition-transform shadow-sm" 
                style={{ backgroundColor: 'var(--auction-bg)', border: '1px solid var(--auction-border)' }}
              >
                  <Trash2 size={16} style={{ color: 'var(--auction-danger)' }} />
              </button>
          </div>
      </div>
      <div className="p-4">
          <h3 className="font-bold mb-2" style={{ color: 'var(--auction-text)' }}>{product.title}</h3>
          <div className="flex items-center justify-between mb-4">
              <div>
                  <p className="text-sm" style={{ color: 'var(--auction-text-muted)' }}>Current Bid</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--auction-accent)' }}>${product.currentBid}</p>
              </div>
              <div className="text-right">
                  <p className="text-sm" style={{ color: 'var(--auction-text-muted)' }}>Bids</p>
                  <p className="font-bold" style={{ color: 'var(--auction-text)' }}>{product.totalBids}</p>
              </div>
          </div>
          <div className="flex items-center justify-between text-sm pt-3 border-t" 
            style={{ color: 'var(--auction-text-muted)', borderColor: 'var(--auction-border)' }}
          >
              <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {formatTimeLeft(product.endTime).timeLeft}
              </span>
              <span>Watchers: {product.watchers || 0}</span>
          </div>
      </div>
  </div>
  );
}