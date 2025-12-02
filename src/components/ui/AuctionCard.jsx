import { useState, useEffect } from 'react';
import { Bookmark, Heart, Flame, Clock, Gavel, Star, User } from 'lucide-react';

// --- Helpers ---

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatTimeLeft = (seconds) => {
  if (seconds <= 0) return "Ended";
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
};

export default function AuctionCard({ item }) {
  // Use a state to handle the live countdown locally
  const calculateTimeLeftInSeconds = () => {
    const now = new Date();
    const end = new Date(item.endDate);
    const diff = Math.floor((end - now) / 1000);
    return diff > 0 ? diff : 0;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeftInSeconds());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeftInSeconds());
    }, 1000);
    return () => clearInterval(timer);
  }, [item.endDate]);

  const isUrgent = timeLeft < 3600 && timeLeft > 0;
  const isEnded = timeLeft <= 0;

  // Badge mapping
  const renderBadge = (badge) => {
    switch (badge) {
      case 'hot':
        return (
          <div key={badge} className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
            <Flame className="w-3 h-3 fill-current" />
            HOT
          </div>
        );
      case 'ending-soon':
        return (
          <div key={badge} className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
            <Clock className="w-3 h-3" /> ENDING
          </div>
        );
      case 'high-bids':
        return (
          <div key={badge} className="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
            <Gavel className="w-3 h-3" /> POPULAR
          </div>
        );
      case 'premium':
        return (
          <div key={badge} className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" /> RARE
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div key={item.id} className="bg-[#2A2038] rounded-xl overflow-hidden border border-white/5 hover:border-[#E0B84C]/50 transition-all group hover:-translate-y-1 shadow-lg">
      {/* Image Area */}
      <div className="relative aspect-4/3 overflow-hidden bg-gray-100 dark:bg-gray-700">
        <img 
          src={item.images?.[0]} 
          alt={item.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {/* Watch Button */}
        <div className="flex flex-row gap-2 absolute top-3 right-3">
          <button className="p-2 bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm rounded-full text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-gray-900 transition-colors z-10 shadow-sm">
            <Heart className="w-4 h-4" />
          </button>
          <button className="p-2 bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm rounded-full text-gray-400 hover:text-yellow-500 hover:bg-white dark:hover:bg-gray-900 transition-colors z-10 shadow-sm">
            <Bookmark className="w-4 h-4" />
          </button>
        </div>

        {/* Badges Container */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {item.badges?.map(badge => renderBadge(badge))}
        </div>

        {/* Masked Bidder Overlay (Shows on Hover) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-white text-xs font-medium">Highest Bidder:</p>
          <div className="flex items-center gap-2">
            <User className="w-3 h-3 text-blue-400" />
            <span className="text-white font-bold text-sm tracking-wide">{item.highestBidderName || 'No bids'}</span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-white group-hover:text-[#E0B84C] transition-colors truncate pr-2">{item.title}</h4>
        </div>
        <p className="text-gray-400 text-xs mb-4">{item.sellerName}</p>
        <div className="flex justify-between items-end mb-1">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Current Bid</p>
              <p className="text-white font-bold text-lg">${formatCurrency(item.currentPrice)}</p>
            </div>
            {item.buyNowPrice && (
              <span className="text-[10px] text-green-600 font-medium bg-green-900/20 px-1.5 py-0.5 rounded">
                Buy Now: {formatCurrency(item.buyNowPrice)}
              </span>
            )}
        </div>
        
        {/* Action Button */}
        <button 
          disabled={isEnded}
          className={`w-full px-3 py-2.5 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
            isEnded 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
              : 'text-[#E0B84C] hover:text-white border border-[#E0B84C] hover:bg-[#E0B84C] shadow-md hover:shadow-lg'
          }`}
        >
          {isEnded ? 'Auction Ended' : 'Place Bid'}
        </button>
        {/* Timer */}
        <div className={`flex items-center gap-2 text-sm font-medium rounded-lg p-2 ${
          isEnded 
            ? 'bg-gray-100 text-gray-500' 
            : isUrgent 
              ? 'bg-red-50 text-red-600' 
              : 'bg-green-900/20 text-green-600'
        }`}>
          <Clock className={`w-4 h-4 ${isUrgent && !isEnded ? 'animate-pulse' : ''}`} />
          <span>{formatTimeLeft(timeLeft)} {isEnded ? '' : 'left'}</span>
        </div>
      </div>
    </div>
  );
};