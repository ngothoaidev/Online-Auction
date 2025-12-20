import { useState, useEffect } from 'react';
import { ArrowUpRight, Clock, Trophy, AlertCircle, Calendar, TrendingUp } from "lucide-react";
import { formatTimeLeft } from '../../utils/format.js'; // Assuming you have this utility

export default function BiddingAuctionCard({ product, onClick }) {
    const [timeLeft, setTimeLeft] = useState('');
    const [urgencyLevel, setUrgencyLevel] = useState('normal');

    const isWinning = product.isWinning;
    const bidDate = product.bidDate ? new Date(product.bidDate).toLocaleDateString() : new Date().toLocaleDateString();

    // --- Timer Logic for Urgency Colors ---
    useEffect(() => {
        const updateTimeLeft = () => {
            // Calculate time left (Mocking logic if utility isn't available)
            if (typeof formatTimeLeft === 'function') {
                const { timeLeft, urgencyLevel } = formatTimeLeft(product.endTime);
                setTimeLeft(timeLeft);
                setUrgencyLevel(urgencyLevel);
            } else {
                // Fallback basic logic
                setTimeLeft("2d 4h"); 
                setUrgencyLevel("normal");
            }
        };
        updateTimeLeft();
        const timer = setInterval(updateTimeLeft, 60000);
        return () => clearInterval(timer);
    }, [product.endTime]);

    // Dynamic Colors based on Urgency
    const timerStyles = {
        normal: 'bg-[var(--bg-soft)] text-[var(--text-muted)] border-[var(--border)]',
        warning: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
        critical: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 animate-pulse'
    };

    return (
        <div 
            onClick={onClick}
            className={`group w-full p-3 rounded-3xl border bg-[var(--card-bg)] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer flex flex-col gap-4
            ${isWinning ? 'hover:border-green-500/50' : 'hover:border-red-500/50'}`}
            style={{ borderColor: 'var(--border)' }}
        >
            {/* 1. LARGE CENTERED IMAGE */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-sm">
                 <img 
                    src={product.image} 
                    alt={product.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                />
                
                {/* Status Badge Overlay */}
                <div className="absolute top-3 left-3">
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg backdrop-blur-md ${
                        isWinning 
                        ? 'bg-green-600/90 text-white' 
                        : 'bg-red-600/90 text-white'
                    }`}>
                        {isWinning ? <Trophy size={12} strokeWidth={3} /> : <AlertCircle size={12} strokeWidth={3} />}
                        {isWinning ? 'Winning' : 'Outbid'}
                    </span>
                </div>
            </div>

            {/* Title Section */}
            <div className="text-center px-2">
                <h3 className="font-bold text-[var(--text)] text-lg truncate group-hover:text-[var(--accent)] transition-colors">
                    {product.title}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                    by {product.seller?.name || "Official Seller"}
                </p>
            </div>

            {/* 2. STATS ROW: Placed Time & Your Bid */}
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-soft)] rounded-xl border border-[var(--border-subtle)]">
                {/* Left: Placed Time */}
                <div className="flex flex-col items-start gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] opacity-70">
                        Placed
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text)]">
                        <Calendar size={14} className="text-[var(--text-muted)]" />
                        {bidDate}
                    </div>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-[var(--border)]"></div>

                {/* Right: Your Bid */}
                <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] opacity-70">
                        {isWinning ? 'Your Bid' : 'Highest Bid'}
                    </span>
                    <div className={`flex items-center gap-1 text-base font-black ${isWinning ? 'text-green-600' : 'text-[var(--text)]'}`}>
                        ${product.yourBid?.toLocaleString()}
                        {isWinning && <TrendingUp size={14} />}
                    </div>
                </div>
            </div>

            {/* 3. FOOTER: Urgency Timer & Action */}
            <div className="flex items-center justify-between pt-1 px-1">
                {/* Urgency Timer */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${timerStyles[urgencyLevel]}`}>
                    <Clock size={14} />
                    <span>{timeLeft}</span>
                </div>

                {/* Action Button */}
                <button 
                    className={`
                        flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full transition-all duration-200 shadow-md hover:shadow-lg group/btn hover:scale-105
                        ${isWinning 
                            ? 'bg-[var(--auction-bg)] border border-[var(--auction-border)] text-[var(--auction-text)]' 
                            : 'bg-[var(--auction-accent)] text-[var(--auction-accent-fg)]'
                        }
                    `}
                    onClick={() => nav.auction(product.id)}>
                    {isWinning ? 'View' : 'Bid Higher'}
                    <ArrowUpRight size={16} className="transition-transform group-hover/btn:translate-x-1" />
                </button>
            </div>
        </div>
    );
}