import { useState } from 'react';
import { Clock, Gavel, Star, ArrowRight } from 'lucide-react';
import AuctionCard from '../../components/AuctionCard';
import { products } from '../../data/index.js';

export default function ProductTabs() {
  const [activeTab, setActiveTab] = useState('endingSoon');

  const tabs = [
    { id: 'endingSoon', label: 'Ending Soon', icon: Clock, color: 'var(--danger)' },
    { id: 'mostBids', label: 'Most Active', icon: Gavel, color: 'var(--theme-secondary)' },
    { id: 'highestPrice', label: 'Premium', icon: Star, color: 'var(--accent)' },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);

  const getFilteredProducts = () => {
    if (!products.length) return [];
    switch (activeTab) {
      case 'endingSoon': return products.filter(p => p.status === 'active').slice(0, 5);
      case 'mostBids': return products.filter(p => p.status === 'active').slice(0, 5);
      case 'highestPrice': return [...products].sort((a, b) => parseFloat(b.price) - parseFloat(a.price)).slice(0, 5);
      default: return products.slice(0, 5);
    }
  };
  const displayProducts = getFilteredProducts();

  return (
    <section className="container mx-auto px-4">
      {/* Tab Navigation */}
      <div className="flex flex-wrap justify-center gap-4 mb-10">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wide transition-all duration-300 transform hover:scale-105 ${isActive ? 'shadow-lg scale-105' : 'hover:opacity-80'}`}
              style={{ 
                backgroundColor: isActive ? tab.color : 'var(--card-bg)',
                color: isActive ? '#fff' : 'var(--text-muted)',
                border: isActive ? 'none' : '1px solid var(--border)'
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 animate-fade-in">
        {displayProducts.length > 0 ? (
          displayProducts.map((item) => (
            <div key={item.id} className="transform transition-all duration-500 hover:-translate-y-1">
              <AuctionCard product={item} variant="default"/>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-10" style={{ color: 'var(--text-muted)' }}>
            No products found
          </div>
        )}
      </div>

      <div className="mt-12 text-center">
        <button className="inline-flex items-center gap-2 font-bold uppercase tracking-widest text-xs border-b-2 border-transparent hover:border-current pb-1 transition-all"
          style={{ color: activeTabData.color }}
        >
          View All {activeTabData.label} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};