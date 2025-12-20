import { Star, Share2, CheckCircle, User, Calendar } from 'lucide-react';
import { useNav } from '../../hooks/useNavigate.js';
import { formatCurrency, formatDate } from '../../utils/format.js';

export default function WonAuctionCard({ product, onRate }) {
  const nav = useNav();

  return (
    <div 
      className="group relative w-full max-w-sm rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-2xl shadow-sm"
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
            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
            />
            
            {/* Top Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
                {/* Category Badge */}
                <span className="px-2.5 py-1 backdrop-blur-md text-[10px] uppercase tracking-wider font-bold rounded-full shadow-sm bg-white/90" style={{ color: 'var(--auction-text-muted)' }}>
                    {product.category}
                </span>
            </div>

            {/* Overlay: Price Tag (Bottom Left) */}
            <div className="absolute bottom-4 left-4">
                <div className="px-4 py-2 bg-black/70 backdrop-blur-md rounded-lg text-white border border-white/10 shadow-lg">
                    <p className="text-[10px] uppercase font-bold text-gray-300 mb-0.5">Winning Bid</p>
                    <p className="text-xl font-black text-[var(--accent)]">{formatCurrency(product.winningBid || product.currentPrice)}</p>
                </div>
            </div>
        </div>

        <div className="px-4 py-3 border-b border-[var(--border)] flex flex-col bg-[var(--bg-soft)]/30">
            {/* Title */}
            <h3 className="text-lg font-bold line-clamp-1 mb-2 transition-colors duration-100" style={{ color: 'var(--auction-text)' }}>
                {product.title}
            </h3>

            {/* --- Seller & Date Info --- */}
            <div className="flex items-center justify-between gap-4 text-xs font-medium" style={{ borderColor: 'var(--auction-border)', color: 'var(--auction-text-muted)' }}>
                <div className="flex items-center gap-1.5">
                    <User size={14} />
                    <span className="truncate max-w-[100px]">{product.seller?.name || "Unknown"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>{formatDate(product.wonDate || product.endTime)}</span>
                </div>
            </div>
        </div>

        {/* 5. FOOTER ACTIONS */}
        <div className="px-2 py-1 flex items-center justify-between">
            <div className="flex-1 flex gap-1">
                {/* Secondary Action */}
                <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-soft)] transition-colors text-sm font-medium">
                    <Share2 size={18} />
                    <span className="hidden sm:inline">Share</span>
                </button>
            </div>

            {/* Primary Action: Rate Seller */}
            <div className="px-2">
                {!product.reviewed ? (
                    <button 
                        onClick={() => onRate && onRate(product)}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg)] font-bold text-sm hover:brightness-110 transition-all shadow-sm active:scale-95"
                    >
                        <Star size={16} className="fill-current" />
                        Rate
                    </button>
                ) : (
                    <button disabled className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[var(--bg-soft)] text-[var(--text-muted)] font-medium text-sm cursor-default">
                        <CheckCircle size={16} />
                        Rated
                    </button>
                )}
            </div>
        </div>
    </div>
  );
}