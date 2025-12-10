import { useState } from 'react';
import { Clock, Gavel, Star, ArrowRight } from 'lucide-react';
import AuctionCard from '../../components/AuctionCard';
import { products } from '../../data/index.js';

export default function ProductTabs({ nav }) {
  const [activeTab, setActiveTab] = useState('endingSoon');

  const tabs = [
    { id: 'endingSoon', label: 'Ending Soon', icon: Clock, color: '#F5004F' },
    { id: 'mostBids', label: 'Most Active', icon: Gavel, color: '#7C00FE' },
    { id: 'highestPrice', label: 'Premium', icon: Star, color: '#F9E400' },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);

  // Filter products based on active tab
  const getFilteredProducts = () => {
    if (!products.length) return [];
    
    switch (activeTab) {
      case 'endingSoon':
        return products.filter(p => p.status === 'active').slice(0, 10);
      case 'mostBids':
        return products.filter(p => p.status === 'active').slice(0, 10);
      case 'highestPrice':
        return [...products].sort((a, b) => parseFloat(b.price) - parseFloat(a.price)).slice(0, 10);
      default:
        return products.slice(0, 10);
    }
  };

  const displayProducts = getFilteredProducts();

  return (
    <section className="py-16 container mx-auto px-4">
      <div className="flex flex-wrap justify-center gap-4 mb-10">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wide transition-all duration-300 transform hover:scale-105 ${
                isActive 
                  ? `text-white shadow-lg shadow-${tab.color}/20 scale-105` 
                  : 'bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'
              }`}
              style={{ 
                backgroundColor: isActive ? tab.color : undefined,
                color: isActive && tab.id === 'highestPrice' ? 'black' : undefined 
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mx-10 animate-fade-in">
        {displayProducts.length > 0 ? (
          displayProducts.map((item) => (
            <div key={item.id} className="transform transition-all duration-500 hover:-translate-y-1">
              <AuctionCard product={item} />
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-10 text-gray-500">
            {!loading && products.length === 0 ? 'No products found' : 'Loading...'}
          </div>
        )}
      </div>

      <div className="mt-12 text-center">
        <button 
          onClick={() => nav.search()}
          className="inline-flex items-center gap-2 font-bold uppercase tracking-widest text-xs border-b-2 border-transparent hover:border-current pb-1 transition-all"
          style={{ color: activeTabData.color }}
        >
          View All {activeTabData.label} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};