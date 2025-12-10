import React, { useState } from 'react';
import { 
  Sun, 
  Moon,
  LayoutDashboard, 
  Gavel, 
  Users, 
  AlertCircle, 
  Settings, 
  Search, 
  DollarSign, 
  Bell, 
  Menu, 
  TrendingUp, 
  Package, 
  CheckCircle, 
  XCircle, 
  MoreVertical, 
} from 'lucide-react';
import { useNav } from '../../useNavigate.js';
import OverviewView from './Overview.jsx';
import LiveAuctionsView from './LiveAuctions.jsx';
import NotificationDropper from '../../components/NotificationDropper.jsx';

export default function AdminDashboard() {
  const nav = useNav();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Mock Navigation Items
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'auctions', label: 'Live Auctions', icon: Gavel },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'disputes', label: 'Disputes & Reports', icon: AlertCircle, badge: 3 },
    { id: 'finance', label: 'Financials', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-100 flex flex-col fixed h-full z-20`}>
        <div className="h-16 flex items-center justify-center border-b border-slate-800">
          <span className={`font-bold text-xl tracking-wider ${!isSidebarOpen && 'hidden'}`}>BID<span className="text-indigo-400">MASTER</span></span>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors relative
                ${activeTab === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              `}
            >
              <item.icon size={20} />
              <span className={`font-medium ${!isSidebarOpen && 'hidden'}`}>{item.label}</span>
              {item.badge && isSidebarOpen && (
                <span className="absolute right-3 bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 transition-all duration-100 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-10 px-6 flex items-center justify-between">
          {/* <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
            <Menu size={20} />
          </button> */}

          <div className="max-w-2xl hidden md:flex flex-1 mx-8">
            <div 
              className="admin-card relative transition-colors duration-100 w-full border-2 rounded-full py-2.5 px-5 md:flex justify-center items-center gap-4 focus:outline-none focus:border-[var(--theme-secondary)] focus:ring-1 focus:ring-[var(--theme-secondary)] transition-all"
            >
              <input 
                type="text" 
                placeholder="Search for items, artists, or brands..." 
                className="admin-input w-full transition-colors duration-100 outline-none placeholder:text-gray-500 text-sm"
              />
              <button 
                // onClick={() => nav.search()}
                className="p-1.5 rounded-full transition-colors"
                >
                <Search className="text-gray-500 group-hover:text-[var(--theme-secondary)] transition-colors" size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Mobile Search Trigger (Visible only on small screens) */}
            <button
              // onClick={() => nav.search()} 
              className="md:hidden text-gray-300 hover:text-[var(--theme-secondary)]">
              <Search size={24} />
            </button>

            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleTheme}
              className="header-theme-toggle p-2 rounded-full"
            >
              {!darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>

            {/* ADMIN STATE */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <NotificationDropper />

              {/* Admin Avatar Dropdown */}
              <div className="relative">
                {/* The Avatar acts as the button */}
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm focus:ring-2 ring-indigo-500 transition-all"
                >
                    AD
                </button>

                {/* The Dropdown Menu */}
                {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-50">
                        <div className="px-4 py-2 border-b border-slate-100">
                            <p className="text-sm font-bold text-slate-700">Administrator</p>
                            <p className="text-xs text-slate-400">admin@auction.com</p>
                        </div>
                        <button onClick={() => {setActiveTab('settings')}} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Settings</button>
                        <button onClick={() => nav.home()} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 font-medium">
                            Logout
                        </button>
                    </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8">
            {/* Render different views based on activeTab */}
            {activeTab === 'overview' && <OverviewView />}
            {activeTab === 'auctions' && <LiveAuctionsView />}
        </div>
      </main>
    </div>
  );
}