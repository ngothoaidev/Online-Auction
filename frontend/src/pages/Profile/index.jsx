import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

import ProfileSidebar from "./ProfileSidebar";
import ProductGrid from "../../components/ProductGrid"; 
import FilterBar from "../../components/Filter/FilterBar";
import Pagination from "../../components/Pagination";
import { mockUserData } from "../../data/users.js";

export default function Profile() {
  const { user } = useAuth();
  const [userData] = useState(mockUserData);
  const [activeTab, setActiveTab] = useState('active-bids');

  // --- TAB CONFIGURATION ---
  const tabs = [
    { 
      id: 'active-bids', 
      label: 'Active Bids', 
      count: userData.activeBids?.length || 0,
      variant: 'bidding' // Passed to ProductGrid
    },
    { 
      id: 'won-auctions', 
      label: 'Wins', 
      count: userData.wonAuctions?.length || 0,
      variant: 'won'
    },
    { 
      id: 'favorites', 
      label: 'Saved', 
      count: userData.favoriteProducts?.length || 0,
      variant: 'favorite'
    },
  ];

  if (userData.role === 'seller') {
      // Insert at the beginning so they see their business first
      tabs.unshift(
          { 
              id: 'my-listings', 
              label: 'My Listings', 
              count: userData.activeListings?.length || 0,
              variant: 'default' // Standard view for their own items
          },
          { 
              id: 'sold-items', 
              label: 'Sold', 
              count: userData.soldItems?.length || 0,
              variant: 'won' // Reusing 'won' style to show success state
          }
      );
  }

  // Helper to get current data list based on tab
  const getCurrentData = () => {
      switch(activeTab) {
          case 'active-bids': return userData.activeBids;
          case 'won-auctions': return userData.wonAuctions;
          case 'favorites': return userData.favoriteProducts;
          case 'my-listings': return userData.activeListings;
          case 'sold-items': return userData.soldItems;
          default: return [];
      }
  };

  const currentTabInfo = tabs.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-[var(--bg)] transition-colors duration-300">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-20 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          
          <div className="lg:w-[350px] shrink-0">
            <ProfileSidebar userData={userData} isOwnProfile={true} />
          </div>

          <div className="flex-1 mt-4 lg:mt-0 pt-32 lg:pt-0">
             
             <div className="flex items-center gap-8 border-b border-[var(--border)] mb-8 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                group relative pb-4 text-sm font-bold tracking-wide transition-colors whitespace-nowrap flex items-center gap-2
                                ${isActive ? 'text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}
                            `}
                        >
                            {tab.label}
                            {/* Counter Pill */}
                            {/* <span className={`
                                px-2 py-0.5 rounded-full text-[10px] transition-colors
                                ${isActive ? 'bg-[var(--text)] text-[var(--bg)]' : 'bg-[var(--bg-soft)] text-[var(--text-muted)] group-hover:bg-[var(--border)]'}
                            `}>
                                {tab.count}
                            </span> */}

                            {/* Active Line Indicator */}
                            {isActive && (
                                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--accent)] rounded-t-full" />
                            )}
                        </button>
                    );
                })}
             </div>

             <FilterBar />

             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[400px]">
                 {/* Using the grid component to display content */}
                 <ProductGrid 
                    items={getCurrentData()} 
                    cardVariant={currentTabInfo?.variant} 
                    columns="grid-cols-1 md:grid-cols-2 xl:grid-cols-3" // Adjusted for 2/3 layout width
                 />
             </div>

          </div>
        </div>
      </div>
    </div>
  );
}