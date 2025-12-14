import { useState, useEffect } from 'react';
import { Heart, Clock, Gavel, Zap, ArrowRight, Crown } from 'lucide-react';
import { useNav } from '../../hooks/useNavigate.js';
import { formatCurrency, formatTimeLeft } from '../../utils/format.js';

export default function DefaultAuctionCard({ product }) {
  const nav = useNav();
  const [isLiked, setIsLiked] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('normal');

  useEffect(() => {
    const updateTimeLeft = () => {
      const { timeLeft, urgencyLevel } = formatTimeLeft(product.endTime);
      setTimeLeft(timeLeft);
      setUrgencyLevel(urgencyLevel);
    };
    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, [product.endTime]);

  const timerStyles = {
    normal: 'bg-black/50 text-white',
    warning: 'bg-yellow-500/90 text-white',
    critical: 'bg-red-600/90 text-white animate-pulse'
  };

  return (
    <div className="group relative w-full max-w-sm rounded-2xl border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col"
      style={{ 
        backgroundColor: 'var(--auction-bg)', 
        borderColor: 'var(--auction-border)',
        boxShadow: 'var(--auction-shadow)'
      }}
    >
      
      {/* --- Image Section --- */}
      <div className="relative aspect-4/3 overflow-hidden" style={{ backgroundColor: 'var(--auction-badge-bg)' }}>
        <img 
          src={product.image} 
          alt={product.title} 
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
        />
        
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2.5 py-1 backdrop-blur-sm text-xs font-bold rounded-full shadow-sm bg-white/90" style={{ color: 'var(--auction-text-muted)' }}>
            {product.category}
          </span>
        </div>

        <button 
          onClick={() => setIsLiked(!isLiked)}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-white transition-colors shadow-sm z-10 bg-white/80"
          style={{ color: isLiked ? '#f43f5e' : 'var(--auction-text-subtle)' }}
        >
          <Heart size={18} className={isLiked ? 'fill-current' : ''} />
        </button>

        {/* Timer Badge */}
        <div className={`absolute bottom-3 left-3 px-3 py-1.5 rounded-lg backdrop-blur-md text-xs font-bold flex items-center gap-1.5 shadow-sm ${timerStyles[urgencyLevel]}`}>
          <Clock size={14} />
          <span>{timeLeft}</span>
        </div>
      </div>

      {/* --- Content Section --- */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-bold line-clamp-1 mb-4 transition-colors duration-100" style={{ color: 'var(--auction-text)' }}>
          {product.title}
        </h3>
        
        {/* --- DUAL PRICE BOX --- */}
        <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden border mb-5" style={{ backgroundColor: 'var(--auction-border)', borderColor: 'var(--auction-border)' }}>
          
          {/* === LEFT: Highest Bid === */}
          <div className="relative group/bid cursor-help overflow-hidden" style={{ backgroundColor: 'var(--auction-price-bg)' }}>
            <div className="absolute inset-0 flex flex-col justify-center px-3 transition-all duration-200 transform group-hover/bid:-translate-y-full group-hover/bid:opacity-0">
                <span className="text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1" style={{ color: 'var(--auction-text-subtle)' }}>
                    <Gavel size={12} /> Highest Bid
                </span>
                <span className="text-xl font-black" style={{ color: 'var(--auction-text)' }}>
                    {formatCurrency(product.currentBid)}
                </span>
            </div>

            {/* Hover View: The Person */}
            <div className="absolute inset-0 flex flex-col justify-center items-center transition-all duration-200 transform translate-y-full opacity-0 group-hover/bid:translate-y-0 group-hover/bid:opacity-100" style={{ backgroundColor: 'var(--auction-bid-bg)' }}>
                 {product.highestBidder ? (
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold" style={{ color: 'var(--auction-bid-text)' }}>
                            {product.highestBidder.name}
                        </span>
                    </div>
                 ) : (
                    <span className="text-xs font-medium" style={{ color: 'var(--auction-text-subtle)' }}>No Bids Yet</span>
                 )}
            </div>
          </div>

          {/* === RIGHT: Buy Now === */}
          <div className="p-3 flex flex-col justify-center border-l relative hover:opacity-90 transition-colors cursor-pointer" 
            style={{ 
               backgroundColor: 'var(--auction-price-bg)', 
               borderColor: 'var(--auction-border)' 
            }}
          >
             <div className="h-full flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1" style={{ color: 'var(--auction-success)' }}>
                    <Zap size={12} className="fill-current" /> Buy Now
                </span>
                <span className="text-lg font-bold" style={{ color: 'var(--auction-success)' }}>
                    {product.buyNowPrice ? formatCurrency(product.buyNowPrice) : 'N/A'}
                </span>
             </div>
          </div>
        </div>

        {/* --- Footer --- */}
        <div className="mt-auto flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--auction-border)' }}>
          <div className="text-xs font-medium" style={{ color: 'var(--auction-text-muted)' }}>
             <span className="font-bold" style={{ color: 'var(--auction-text)' }}>{product.bidCount || 0}</span> bids
          </div>

          <button 
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full transition-all duration-200 shadow-md hover:shadow-lg group/btn hover:scale-105" 
            style={{ 
              backgroundColor: 'var(--auction-accent)', 
              color: 'var(--auction-accent-fg)' 
            }}
            onClick={() => nav.auction(product.id)}>
            Place Bid
            <ArrowRight size={16} className="transition-transform group-hover/btn:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
};