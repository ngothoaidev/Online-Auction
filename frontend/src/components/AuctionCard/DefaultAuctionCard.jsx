import { useState, useEffect } from 'react';
import { Heart, Clock, Gavel, Zap, ArrowRight, User, Calendar, Sparkles } from 'lucide-react';
import { useNav } from '../../hooks/useNavigate.js';
import { formatCurrency, formatTimeLeft } from '../../utils/format.js';

export default function DefaultAuctionCard({ product }) {
  const nav = useNav();
  const [isLiked, setIsLiked] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('normal');

  const isNew = (new Date() - new Date(product.createdAt) < 96 * 60 * 60 * 1000);

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

  // Format Date (e.g., "Oct 24, 2023")
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div 
      className={`group relative w-full max-w-sm rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-2xl
        ${isNew ? 'ring-2 ring-offset-2 ring-[var(--auction-accent)]' : 'shadow-sm'}
      `}
      style={{ 
        backgroundColor: 'var(--auction-bg)', 
        borderColor: isNew ? 'var(--auction-accent)' : 'var(--auction-border)',
        boxShadow: isNew ? '0 0 15px -3px var(--auction-accent)' : 'var(--auction-shadow)'
      }}
    >
      
      {/* --- Image Section --- */}
      <div className="relative aspect-4/3 overflow-hidden" style={{ backgroundColor: 'var(--auction-badge-bg)' }}>
        <img 
          src={product.image} 
          alt={product.title} 
          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
        />
        
        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
           {/* Category Badge */}
          <span className="px-2.5 py-1 backdrop-blur-md text-[10px] uppercase tracking-wider font-bold rounded-full shadow-sm bg-white/90" style={{ color: 'var(--auction-text-muted)' }}>
            {product.category}
          </span>

          {/* NEW ARRIVAL BADGE (Only for new items) */}
          {isNew && (
            <span className="px-3 py-1 flex items-center gap-1 backdrop-blur-md text-xs font-bold rounded-full shadow-lg animate-pulse" 
              style={{ backgroundColor: 'var(--auction-accent)', color: 'var(--auction-accent-fg)' }}>
              <Sparkles size={12} className="fill-current" /> NEW
            </span>
          )}
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
      <div className="p-5 flex flex-col flex-grow relative">
        
        {/* Title */}
        <h3 className="text-lg font-bold line-clamp-1 mb-2 transition-colors duration-100" style={{ color: 'var(--auction-text)' }}>
          {product.title}
        </h3>

        {/* --- Seller & Date Info --- */}
        <div className="flex items-center justify-between gap-4 text-xs font-medium mb-4 pb-4 border-b border-dashed" style={{ borderColor: 'var(--auction-border)', color: 'var(--auction-text-muted)' }}>
            <div className="flex items-center gap-1.5">
                <User size={14} />
                <span className="truncate max-w-[100px]">{product.seller?.name || "Unknown"}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                <span>{formatDate(product.createdAt)}</span>
            </div>
        </div>
        
        {/* --- DUAL PRICE BOX --- */}
        <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden border mb-5" style={{ backgroundColor: 'var(--auction-border)', borderColor: 'var(--auction-border)' }}>
          
          {/* === LEFT: Highest Bid === */}
          <div className="relative group/bid cursor-help overflow-hidden" style={{ backgroundColor: 'var(--auction-price-bg)' }}>
            <div className="absolute inset-0 flex flex-col justify-center px-3 transition-all duration-200 transform group-hover/bid:-translate-y-full group-hover/bid:opacity-0">
                <span className="min-w-30 text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1" style={{ color: 'var(--auction-text-subtle)' }}>
                    <Gavel size={12} /> Highest Bid
                </span>
                <span className="text-xl font-black" style={{ color: 'var(--auction-text)' }}>
                    {formatCurrency(product.currentBid)}
                </span>
            </div>

            {/* Hover View: The Bidder */}
            <div className="absolute inset-0 flex flex-col justify-center items-center transition-all duration-200 transform translate-y-full opacity-0 group-hover/bid:translate-y-0 group-hover/bid:opacity-100" style={{ backgroundColor: 'var(--auction-bid-bg)' }}>
                 {product.highestBidder ? (
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold" style={{ color: 'var(--auction-bid-text)' }}>
                            {product.highestBidder.name}
                        </span>
                        <span className="text-[10px] opacity-75" style={{ color: 'var(--auction-bid-text)' }}>Top Bidder</span>
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
                <span className="min-w-30 text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1" style={{ color: 'var(--auction-success)' }}>
                    <Zap size={12} className="fill-current" /> Buy Now
                </span>
                <span className="text-lg font-bold" style={{ color: 'var(--auction-success)' }}>
                    {product.buyNowPrice ? formatCurrency(product.buyNowPrice) : 'N/A'}
                </span>
             </div>
          </div>
        </div>

        {/* --- Footer --- */}
        <div className="mt-auto flex items-center justify-between">
          <div className="text-xs font-medium" style={{ color: 'var(--auction-text-muted)' }}>
             <span className="font-bold" style={{ color: 'var(--auction-text)' }}>{product.bidCount || 0}</span> bids
          </div>

          <button 
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full transition-all duration-200 shadow-md hover:shadow-lg group/btn hover:scale-105" 
            style={{ 
              backgroundColor: isNew ? 'var(--auction-accent)' : 'var(--auction-text)', 
              color: isNew ? 'var(--auction-accent-fg)' : 'var(--auction-bg)' 
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