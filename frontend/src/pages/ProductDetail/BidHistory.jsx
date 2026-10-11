import { useState, useEffect } from 'react';
import { TrendingUp, Gavel, Activity, Filter, Ban, Eye, EyeOff, Flame, Zap, Trophy, Clock, User, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import auctionService from '../../services/auctionService';
import { formatBidderName, formatCurrency, formatTimeAgo } from '../../utils/format';

export default function BidHistory({ productId, sellerId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bids, setBids] = useState();
  const [filter, setFilter] = useState('all'); 

  useEffect(() => {
    const fetchBids = async () => {
        if (!productId) return;
        setLoading(true);
        try {
            const data = await auctionService.getBidHistory(productId, filter);
            const formattedBids = data.map(bid => ({
                id: bid.id,
                bidderId: bid.bidderId,
                bidderUsername: bid.bidder?.fullname || bid.bidder?.username || "Anonymous",
                bidder: bid.bidder, 
                amount: bid.amount,
                bidTime: bid.timestamp || bid.bidTime,
                isCurrentUser: user ? (bid.bidderId === user.id) : false
            }));
            setBids(formattedBids);
        } catch (error) {
            console.error("Failed to load bid history", error);
        } finally {
            setLoading(false);
        }
    };
    fetchBids();
  }, [productId, filter, user]);

  const handleIgnoreBid = async (bidId) => {
    if (!window.confirm("Are you sure you want to reject this bid? This action cannot be undone.")) return;

    try {
        // Assuming you have/will implement this endpoint
        await auctionService.rejectBid(productId, bidId); 
        setBids(prev => prev.filter(b => b.id !== bidId));
    } catch (error) {
        console.error("Failed to reject bid", error);
        alert("Failed to reject bid");
    }
  };

  const isSeller = user?.userId === Number(sellerId);
  const totalBids = bids?.length;
  const uniqueBidders = new Set(bids?.map(b => b.bidderId)).size;

  // Logic to separate the leading bid
  const showLeadingBid = filter === 'all' || filter === 'recent' && bids?.length > 0;
  const leadingBid = showLeadingBid && bids ? bids[0] : null;
  const historyBids = showLeadingBid ? bids?.slice(1) : bids;

  if (loading) return <div className="p-12 text-center text-(--text-muted)">Loading bid history...</div>;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto">
        
        {/* 1. CONTROLS HEADER */}
        <div className='mb-6'>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black flex items-center gap-3" style={{ color: 'var(--text)' }}>
              <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--accent-soft)' }}>
                <Activity size={24} style={{ color: 'var(--accent)' }} />
              </div>
              Bid History
            </h2>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}>
              <div className="text-2xl font-black mb-1" style={{ color: 'var(--accent)' }}>{totalBids}</div>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Bids</div>
            </div>
            <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}>
              <div className="text-2xl font-black mb-1" style={{ color: 'var(--theme-secondary)' }}>{uniqueBidders}</div>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Bidders</div>
            </div>
            <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}>
              <div className="text-2xl font-black mb-1" style={{ color: 'var(--success)' }}>{bids?.length}</div>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Your Bids</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            {['all', 'mine', 'recent'].map(f => (
                <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold capitalize transition-all border ${filter === f ? 'shadow-md' : ''}`}
                style={{ 
                    backgroundColor: filter === f ? 'var(--accent)' : 'var(--bg-soft)',
                    color: filter === f ? '#1A1205' : 'var(--text-muted)',
                    borderColor: filter === f ? 'var(--accent)' : 'var(--border)'
                }}>
                {f}
                </button>
            ))}
          </div>
        </div>

        {/* 2. TABLE HEADERS */}
        {/* Fixed col-spans to match content rows (4/4/4) */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 mb-2 rounded-xl font-bold text-xs uppercase tracking-wider"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            <div className="col-span-4 flex items-center gap-2"><Clock size={14} /> Time</div>
            <div className="col-span-4 flex items-center gap-2"><User size={14} /> Bidder</div>
            <div className="col-span-4 text-right flex items-center justify-end gap-2">Amount <DollarSign size={14} /></div>
        </div>

        {/* 3. LEADING BID (High-Vis Row) */}
        {leadingBid && (
          <div className="relative group">
            <div className="grid grid-cols-12 gap-4 px-6 py-4 mb-2 rounded-xl shadow-lg border-4 relative overflow-hidden transition-transform"
              style={{ 
                backgroundColor: 'var(--accent)', 
                borderColor: 'var(--accent-strong)',
                color: '#1A1205'
              }}>
              
              {/* Decorative Trophy Watermark */}
              <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
                <Trophy size={60} />
              </div>

              {/* Time */}
              <div className="col-span-4 flex flex-col justify-center relative z-10">
                <span className="font-bold text-sm">{formatTimeAgo(leadingBid.bidTime)}</span>
                <span className="text-xs opacity-70 flex items-center gap-1">
                  <Gavel size={10} /> Leading Bid
                </span>
              </div>

              {/* Bidder */}
              <div className="col-span-4 flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-full border-2 border-[#1A1205]/20 flex items-center justify-center font-black bg-[#1A1205] text-(--accent)">
                  {leadingBid.isCurrentUser ? 'Y' : leadingBid.bidderUsername[0]}
                </div>
                <div className='font-black text-base'>{formatBidderName(leadingBid.bidderUsername, leadingBid.isCurrentUser)}</div>
              </div>

              {/* Amount */}
              <div className="col-span-4 text-right flex flex-col justify-center relative z-10">
                <span className="font-black text-xl tracking-tight">{formatCurrency(leadingBid.amount)}</span>
              </div>
            </div>

            {isSeller && (
              <button 
                  onClick={() => handleIgnoreBid(leadingBid.id)}
                  className="absolute -right-2 -top-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transform transition-transform hover:scale-110 z-20"
                  title="Reject this bid"
              >
                <Ban size={16} />
              </button>
            )}
          </div>
        )}

        {/* 4. HISTORY LIST */}
        {historyBids?.length === 0 && !leadingBid ? (
            <div className="text-center py-12 rounded-xl border-2 border-dashed mb-4" style={{ borderColor: 'var(--border)' }}>
              <p style={{ color: 'var(--text-muted)' }}>No bids found matching your filter.</p>
            </div>
        ) : (
            <div className="rounded-xl border overflow-hidden mb-4" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
                <div className="divide-y max-h-[500px] overflow-y-auto custom-scrollbar" style={{ borderColor: 'var(--border)' }}>
                    {historyBids?.map((bid, index) => {
                        return (
                          <div key={bid.id} className="relative group">
                            <div 
                              className="grid grid-cols-12 gap-4 px-6 py-3.5 transition-colors hover:bg-(--bg-hover)"
                              style={{ backgroundColor: bid.isCurrentUser ? 'var(--accent-soft)' : 'transparent' }}>
                            
                                {/* Time */}
                                <div className="col-span-4 flex flex-col justify-center">
                                    <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>{formatTimeAgo(bid.bidTime)}</span>
                                </div>

                                {/* Bidder */}
                                <div className="col-span-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs"
                                         style={{ 
                                            backgroundColor: bid.isCurrentUser ? 'var(--accent)' : 'var(--bg-subtle)',
                                            color: bid.isCurrentUser ? '#1A1205' : 'var(--text-muted)',
                                            borderColor: 'var(--border)'
                                         }}>
                                        {bid.isCurrentUser ? 'Y' : bid.bidderUsername[0]}
                                    </div>
                                    <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>
                                        {formatBidderName(bid.bidderUsername, bid.isCurrentUser)}
                                    </span>
                                </div>

                                {/* Amount */}
                                <div className="col-span-4 text-right flex flex-col justify-center">
                                    <span className="font-bold text-base" style={{ color: 'var(--text)' }}>{formatCurrency(bid.amount)}</span>
                                </div>
                            </div>
                          </div>
                        );
                    })}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}