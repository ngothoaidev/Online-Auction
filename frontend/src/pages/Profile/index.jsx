import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

import ProfileSidebar from "./ProfileSidebar";
import ProductGrid from "../../components/ProductGrid"; 
import FilterBar from "../../components/Filter/FilterBar";
import userService from "../../services/userService";
import auctionService  from "../../services/auctionService";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Profile() {
  const { user: authUser, logout } = useAuth();
  const { username } = useParams();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "active-bids";
  const category = searchParams.get("category") || "All Categories";

  const isOwnProfile = (authUser && authUser.username === username);
  const [userData, setUserData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [tabData, setTabData] = useState([]);
  const [loadingTab, setLoadingTab] = useState(false);

  useEffect(() => {
    const viewingOwnProfile = authUser && authUser.username === username;

    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const response = await fetch(`${API_URL}/users/profile?username=${username}`);

        if (!response) return;

        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        } else if (response.status === 401 && viewingOwnProfile) {
          // If the token is invalid while viewing own profile, log out
          logout();
        } else {
          console.error("Failed to fetch profile");
          setUserData(null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setUserData(null);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [username]);

  useEffect(() => {
    if (!userData || !userData.id) return;

    const fetchTabData = async () => {
      setLoadingTab(true);
      try {
        
        const response = await auctionService.getTabAuctions({
          username,
          status: activeTab,
          category,
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("Tab data: ", data);
            setTabData(Array.isArray(data) ? data : (data.data || []));
        } else {
            console.error(`Failed to fetch data for tab: ${activeTab}`);
            setTabData([]);
        }
      } catch (error) {
        console.error("Error fetching tab data:", error);
        setTabData([]);
      } finally {
        setLoadingTab(false);
      }
    };

    fetchTabData();
  }, [activeTab, category, userData]);

  const handleTabChange = (newTabId) => {
    setSearchParams(prev => {
        prev.set("tab", newTabId);
        return prev;
    });
  };

  const getCount = (key) => userData?.counts?.[key] || 0;

  // --- TAB CONFIGURATION ---
  const tabs = [
    { id: 'active-bids', label: 'Active Bids', count: getCount('totalActiveBids'), variant: 'bidding' },
    { id: 'won-auctions', label: 'Wins', count: getCount('totalWonAuctions'), variant: 'won' },
    { id: 'favorites', label: 'Saved', count: getCount('totalFavoriteProducts'), variant: 'favorite' },
  ];

  if (userData?.role === 'seller') {
      tabs.unshift(
          { id: 'my-listings', label: 'My Listings', count: getCount('totalActiveListings'), variant: 'default' },
          { id: 'sold-items', label: 'Sold', count: getCount('totalSoldItems'), variant: 'won' }
      );
  }

  const currentTabInfo = tabs.find(t => t.id === activeTab);

  if (!loadingProfile && !userData) {
      return (
        <div className="max-w-7xl mx-auto px-4 mt-8 text-(--danger)">
          User not found.
        </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-20 relative z-10 transition-colors duration-500">
      <div className="flex flex-col lg:flex-row gap-8">

        <div className="lg:w-[350px] shrink-0">
          {loadingProfile ? (
            <div className="max-w-7xl mx-auto px-4 mt-8 text-(--text-muted) animate-pulse">
              Loading profile...
            </div>
          ) : (
            <ProfileSidebar userData={userData} isOwnProfile={isOwnProfile} />
          )}
        </div>

        <div className="flex-1 mt-4 lg:mt-0">
            
            <div className="flex items-center gap-8 border-b border-(--border) mb-8 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                      <button
                          key={tab.id}
                          onClick={() => handleTabChange(tab.id)}
                          className={`
                              group relative pb-4 text-sm font-bold tracking-wide transition-colors whitespace-nowrap flex items-center gap-2
                              ${isActive ? 'text-(--text)' : 'text-(--text-muted) hover:text-(--text)'}
                          `}
                      >
                          {tab.label}

                          {tab.count > 0 && (
                             <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-(--accent)/10 text-(--accent)' : 'bg-(--surface) text-(--text-muted)'}`}>
                               {tab.count}
                             </span>
                          )}

                          {/* Active Line Indicator */}
                          {isActive && (
                              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-(--accent) rounded-t-full" />
                          )}
                      </button>
                  );
              })}
            </div>

            <FilterBar setSearchParams={setSearchParams}/>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[400px]">
                {loadingTab ? (
                    // Simple loading skeleton for grid
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[1,2,3].map(i => (
                            <div key={i} className="h-64 bg-(--surface) rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <ProductGrid 
                      items={tabData} 
                      cardVariant={currentTabInfo?.variant} 
                      columns="grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                    />
                  </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
}