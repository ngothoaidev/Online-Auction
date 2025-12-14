import { Clock, Edit, Trash2 } from 'lucide-react';
import { formatTimeLeft } from '../../utils/format'

export default function ActiveListingAuctionCard({product}){
  return (
    <div className="rounded-xl overflow-hidden border hover:shadow-xl transition-all" style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}>
      <div className="relative">
          <img src={product.image} alt={product.title} className="w-full h-48 object-cover" />
          <div className="absolute top-2 right-2 flex gap-2">
              <button className="p-2 rounded-full" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <Edit size={16} style={{ color: 'var(--accent)' }} />
              </button>
              <button className="p-2 rounded-full" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <Trash2 size={16} style={{ color: 'var(--danger)' }} />
              </button>
          </div>
      </div>
      <div className="p-4">
          <h3 className="font-bold mb-2" style={{ color: 'var(--text)' }}>{product.title}</h3>
          <div className="flex items-center justify-between mb-4">
              <div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Current Bid</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>${product.currentBid}</p>
              </div>
              <div className="text-right">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Bids</p>
                  <p className="font-bold" style={{ color: 'var(--text)' }}>{product.totalBids}</p>
              </div>
          </div>
          <div className="flex items-center justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
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