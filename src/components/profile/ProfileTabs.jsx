import { ShoppingBag, Package } from "lucide-react";

export default function ProfileTabs({ activeTab, setActiveTab, isSeller }) {
  return (
    <div 
      className="flex gap-2 mb-8 border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      <button
        onClick={() => setActiveTab('buyer')}
        className="px-6 py-3 font-medium transition-all relative"
        style={{ 
          color: activeTab === 'buyer' ? 'var(--accent)' : 'var(--text-muted)',
        }}
      >
        <div className="flex items-center gap-2">
          <ShoppingBag size={20} />
          Buyer Profile
        </div>
        {activeTab === 'buyer' && (
          <div 
            className="absolute bottom-0 left-0 right-0 h-1 rounded-t"
            style={{ backgroundColor: 'var(--accent)' }}
          />
        )}
      </button>

      <button
        onClick={() => isSeller && setActiveTab('seller')}
        disabled={!isSeller}
        className="px-6 py-3 font-medium transition-all relative"
        style={{ 
          color: activeTab === 'seller' ? 'var(--accent)' : 'var(--text-muted)',
          opacity: isSeller ? 1 : 0.5,
          cursor: isSeller ? 'pointer' : 'not-allowed'
        }}
      >
        <div className="flex items-center gap-2">
          <Package size={20} />
          Seller Profile
        </div>
        {activeTab === 'seller' && (
          <div 
            className="absolute bottom-0 left-0 right-0 h-1 rounded-t"
            style={{ backgroundColor: 'var(--accent)' }}
          />
        )}
      </button>
    </div>
  );
}
