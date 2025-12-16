import { useState } from 'react';
import {
  LayoutDashboard, Users, Settings, FolderTree, ShoppingBag, UserPlus, LogOut, Menu
} from 'lucide-react';
import { useNav } from '../../hooks/useNavigate.js';
import OverviewView from './Overview.jsx';
import CategoryList from './CategoryList.jsx';
import ProductList from './ProductList.jsx';
import UserList from './UserList.jsx';
import UpgradeRequests from './UpgradeRequests.jsx';
import './AdminDashboard.css'

export default function AdminDashboard() {
  const nav = useNav();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'products', label: 'Products', icon: ShoppingBag },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'upgrades', label: 'Upgrade Requests', icon: UserPlus, badge: 3 },
  ];

  return (
    <div className="min-h-screen flex font-sans transition-colors duration-300" style={{ backgroundColor: 'var(--admin-bg)' }}>
      
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 flex flex-col fixed z-20 h-full border-r`}
        style={{ 
            backgroundColor: 'var(--admin-sidebar-bg)', 
            borderColor: 'var(--admin-sidebar-border)' 
        }}
      >
        {/* Brand */}
        <div className="h-16 flex sticky top-0 items-center justify-center border-b" style={{ borderColor: 'var(--admin-sidebar-border)' }}>
          <span className={`font-bold text-xl tracking-wider flex items-center gap-2 ${!isSidebarOpen && 'hidden'}`} style={{ color: 'var(--admin-text-main)' }}>
            BID<span style={{ color: 'var(--admin-sidebar-active-text)' }}>MASTER</span>
          </span>
          {!isSidebarOpen && <span className="font-bold text-xl" style={{ color: 'var(--admin-sidebar-active-text)' }}>B</span>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors relative group"
              style={{
                backgroundColor: activeTab === item.id ? 'var(--admin-sidebar-active-bg)' : 'transparent',
                color: activeTab === item.id ? 'var(--admin-sidebar-active-text)' : 'var(--admin-sidebar-text)'
              }}
              onMouseEnter={(e) => {
                  if(activeTab !== item.id) {
                      e.currentTarget.style.backgroundColor = 'var(--admin-sidebar-hover)';
                      e.currentTarget.style.color = 'var(--admin-text-main)';
                  }
              }}
              onMouseLeave={(e) => {
                  if(activeTab !== item.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--admin-sidebar-text)';
                  }
              }}
            >
              <item.icon size={20} />
              <span className={`font-medium ${!isSidebarOpen && 'hidden'}`}>{item.label}</span>
              
              {/* Badge */}
              {item.badge && isSidebarOpen && (
                <span className="absolute right-3 text-white text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--danger)' }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--admin-sidebar-border)' }}>
            <button 
                onClick={() => nav.login()} 
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors"
                style={{ color: 'var(--admin-sidebar-text)' }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--danger-soft)';
                    e.currentTarget.style.color = 'var(--danger)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--admin-sidebar-text)';
                }}
            >
                <LogOut size={20} />
                <span className={`font-medium ${!isSidebarOpen && 'hidden'}`}>Logout</span>
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <div className="p-8">
            {activeTab === 'overview' && <OverviewView />}
            {activeTab === 'categories' && <CategoryList />}
            {activeTab === 'products' && <ProductList />}
            {activeTab === 'users' && <UserList setActiveTab={setActiveTab} />}
            {activeTab === 'upgrades' && <UpgradeRequests />}
        </div>
      </main>
    </div>
  );
}