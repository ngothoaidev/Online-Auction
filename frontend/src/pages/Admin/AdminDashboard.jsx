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
  FolderTree,
  ShoppingBag,
  UserPlus,
} from 'lucide-react';
import { useNav } from '../../useNavigate.js';
import OverviewView from './Overview.jsx';
import LiveAuctionsView from './LiveAuctions.jsx';
import CategoryList from './CategoryList.jsx';
import ProductList from './ProductList.jsx';
import UserList from './UserList.jsx';
import UpgradeRequests from './UpgradeRequests.jsx';
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
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'products', label: 'Products', icon: ShoppingBag },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'upgrades', label: 'Upgrade Requests', icon: UserPlus, badge: 3 },
    { id: 'disputes', label: 'Disputes & Reports', icon: AlertCircle },
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
        

        {/* Dashboard Content */}
        <div className="p-8">
            {activeTab === 'overview' && <OverviewView />}
            {activeTab === 'auctions' && <LiveAuctionsView />}
            {activeTab === 'categories' && <CategoryList />}
            {activeTab === 'products' && <ProductList />}
            {activeTab === 'users' && <UserList />}
            {activeTab === 'upgrades' && <UpgradeRequests />}
            {activeTab === 'disputes' && (
              <div className="profile-card rounded-xl p-12 text-center">
                <AlertCircle size={48} className="mx-auto mb-4 text-gray-400" />
                <h2 className="profile-name text-xl font-bold mb-2">Disputes & Reports</h2>
                <p className="profile-text-muted">This feature is coming soon</p>
              </div>
            )}
            {activeTab === 'finance' && (
              <div className="profile-card rounded-xl p-12 text-center">
                <DollarSign size={48} className="mx-auto mb-4 text-gray-400" />
                <h2 className="profile-name text-xl font-bold mb-2">Financial Reports</h2>
                <p className="profile-text-muted">This feature is coming soon</p>
              </div>
            )}
            {activeTab === 'settings' && (
              <div className="profile-card rounded-xl p-12 text-center">
                <Settings size={48} className="mx-auto mb-4 text-gray-400" />
                <h2 className="profile-name text-xl font-bold mb-2">Admin Settings</h2>
                <p className="profile-text-muted">This feature is coming soon</p>
              </div>
            )}
        </div>
      </main>
    </div>
  );
}