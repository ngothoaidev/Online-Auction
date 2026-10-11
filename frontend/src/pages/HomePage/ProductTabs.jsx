import { useState, useEffect } from 'react';
import { Clock, Gavel, Star, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuctionCard from '../../components/AuctionCard';
import auctionService from '../../services/auctionService';

export default function ProductTabs() {
  const [activeTab, setActiveTab] = useState('endingSoon');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: 'endingSoon', label: 'Ending Soon', icon: Clock, color: 'var(--danger)' },
    { id: 'mostBids', label: 'Most Active', icon: Gavel, color: 'var(--theme-secondary)' },
    { id: 'highestPrice', label: 'Premium', icon: Star, color: 'var(--accent)' },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);

  useEffect(() => {
    const fetchTabContent = async () => {
        setLoading(true);
        try {
            const data = await auctionService.getTopAuctions({ 
                sortBy: activeTab, 
                limit: 5
            });
            console.log('HOMEPAGE: ', data);
            setProducts(data);
        } catch (error) {
            console.error("Failed to load tab data", error);
        } finally {
            setLoading(false);
        }
    };

    fetchTabContent();
  }, [activeTab]);

  return (
    <section className="container mx-auto px-10">
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 animate-fade-in">
        {products.length > 0 ? (
          products.map((item) => (
            <div key={item.id} className='flex justify-center'>
              <AuctionCard product={item} />
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-10" style={{ color: 'var(--text-muted)' }}>
            No products found
          </div>
        )}
      </div>

      <div className="mt-12 text-center">
        <Link 
          to={`/search?category=${activeTabData.label}`}
          className={`inline-flex items-center gap-2 font-bold uppercase tracking-widest text-md border-b-2 border-transparent hover:border-current pb-1 transition-all`}
          style={{ color: activeTabData.color }}
        >
          View All {activeTabData.label} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
};