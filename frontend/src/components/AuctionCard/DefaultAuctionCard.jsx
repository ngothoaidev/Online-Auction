import { useState, useEffect } from 'react';
import { Heart, Clock, Gavel, Zap, ArrowRight, Crown } from 'lucide-react';
import { useNav } from '../../hooks/useNavigate.js';
import { formatCurrency, calculateTimeLeft } from '../../utils/format.js';
import './defaultAuctionCard.css';

export default function DefaultAuctionCard({ item }) {
  const nav = useNav();
  const [isLiked, setIsLiked] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('normal');

  useEffect(() => {
    const updateTimeLeft = () => {
      const { timeLeft, urgencyLevel } = calculateTimeLeft(item.endTime);
      setTimeLeft(timeLeft);
      setUrgencyLevel(urgencyLevel);
    };

    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, [item.endTime]);

  const timerStyles = {
    normal: 'bg-black/50 text-white',
    warning: 'bg-yellow-500/90 text-white',
    critical: 'bg-red-600/90 text-white animate-pulse'
  };

  return (
    <div className="group relative w-full max-w-sm rounded-2xl border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-100 overflow-hidden flex flex-col bg-[var(--auction-bg)] border-[var(--auction-border)] color-[var(--auction-text)]">
      
      {/* --- Image Section --- */}
      <div className="auction-card-image-bg relative aspect-4/3 overflow-hidden">
        <img 
          src={item.image} 
          alt={item.title} 
          className="w-full h-full object-cover transition-all duration-100 group-hover:scale-105"
        />
        
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2.5 py-1 backdrop-blur-sm text-xs font-bold rounded-full shadow-sm bg-[rgba(255,255,255,0.95)] color-[var(--auction-text-subtle)]">
            {item.category}
          </span>
        </div>

        <button 
          onClick={() => setIsLiked(!isLiked)}
          className="absolute top-3 right-3 p-2 rounded-full hover:text-rose-500 transition-colors shadow-sm z-10 bg-[rgba(255,255,255,0.8)] color-[var(--auction-text-subtle)]"
        >
          <Heart size={18} className={isLiked ? 'fill-rose-500 text-rose-500' : ''} />
        </button>

        {/* Timer Badge */}
        <div className={`absolute bottom-3 left-3 px-3 py-1.5 rounded-lg backdrop-blur-md text-xs font-bold flex items-center gap-1.5 shadow-sm ${timerStyles[urgencyLevel]}`}>
          <Clock size={14} />
          <span>{timeLeft}</span>
        </div>
      </div>

      {/* --- Content Section --- */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-bold line-clamp-1 mb-4 transition-colors duration-100 color-[var(--auction-text)]">
          {item.title}
        </h3>
        
        {/* --- DUAL PRICE BOX --- */}
        <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden border mb-5 bg-[var(--auction-border)] border-[var(--auction-border)]">
          
          {/* === LEFT: Hover Reveal Logic === */}
          <div className="relative group/bid cursor-help overflow-hidden bg-[var(--auction-price-bg)]">
            
            {/* 1. Default View: The Price */}
            <div className="absolute inset-0 flex flex-col justify-center px-3 transition-all duration-100 transform group-hover/bid:-translate-y-full group-hover/bid:opacity-0">
                <span className="text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1 color-[var(--auction-text-subtle)]">
                    <Gavel size={12} /> Highest Bid
                </span>
                <span className="text-xl font-black color-[var(--auction-text)]">
                    {formatCurrency(item.currentBid)}
                </span>
            </div>

            {/* 2. Hover View: The Person */}
            <div className="absolute inset-0 flex flex-col justify-center items-center transition-all duration-100 transform translate-y-full opacity-0 group-hover/bid:translate-y-0 group-hover/bid:opacity-100 bg-[var(--auction-bid-bg)]">
                 {item.highestBidder ? (
                    <div className="flex flex-col items-center gap-1">
                        <div className="relative">
                            <img 
                                src={item.highestBidder.avatar} 
                                alt={item.highestBidder.name} 
                                className="w-8 h-8 rounded-full border-2 shadow-sm border-[var(--auction-bg)]"
                            />
                            <div className="absolute -top-2 -right-2 text-white p-0.5 rounded-full ring-2 bg-[var(--auction-accent)] ring-[var(--auction-bg)]">
                                <Crown size={8} fill="currentColor" />
                            </div>
                        </div>
                        <span className="text-xs font-bold color-[var(--auction-bid-text)]">
                            {item.highestBidder.name}
                        </span>
                    </div>
                 ) : (
                    <span className="text-xs font-medium color-[var(--auction-text-subtle)]">No Bids Yet</span>
                 )}
            </div>
          </div>

          {/* === RIGHT: Buy Now === */}
          <div className="p-3 flex flex-col justify-center border-l relative hover:bg-[var(--auction-success-bg)] transition-colors cursor-pointer border-[var(--auction-border)]" >
             <div className="h-full flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1 color-[var(--auction-success)]">
                    <Zap size={12} className="fill-current" /> Buy Now
                </span>
                <span className="text-lg font-bold color-[var(--auction-success)]">
                    {item.buyNowPrice ? formatCurrency(item.buyNowPrice) : 'N/A'}
                </span>
             </div>
          </div>
        </div>

        {/* --- Footer --- */}
        <div className="mt-auto flex items-center justify-between border-t pt-3 border-[var(--auction-border)]" >
          <div className="text-xs font-medium color-[var(--auction-text-muted)]">
             Total <span className="font-bold color-[var(--auction-text)]">{item.bidCount}</span> bids placed
          </div>

          <button 
            className="flex items-center gap-2 px-4 py-2 text-white text-sm font-bold rounded-full transition-all duration-100 shadow-md hover:shadow-lg group/btn bg-[var(--auction-accent)] hover:bg-[var(--auction-accent-hover)]" 
            onClick={() => nav.auction(item.id)}>
            Place Bid
            <ArrowRight size={16} className="transition-transform group-hover/btn:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
};