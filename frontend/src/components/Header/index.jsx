import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNav } from '../../hooks/useNavigate.js';
import { 
  Search, Menu, X, ChevronDown, LogOut, ArrowRight, Plus, LayoutDashboard 
} from 'lucide-react';

import { categories } from '../../data/constants.js';
import CategoryDropper from './CategoryDropper.jsx';
import NotificationDropper from './NotificationDropper.jsx';
import ProfileDropper from './ProfileDropper.jsx';
import ThemeToggle from '../ThemeToggle.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import './Header.css'

export default function Header() {
  const nav = useNav();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMobileCategory, setActiveMobileCategory] = useState(null);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'unset';
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* --- MAIN HEADER --- */}
      <header 
        className="sticky top-0 z-50 w-full backdrop-blur-md transition-colors duration-300 border-b"
        style={{ 
          backgroundColor: 'var(--header-bg)', 
          borderColor: 'var(--header-border)' 
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* LEFT: Logo & Categories */}
            <div className="flex items-center gap-8">
              {/* Logo */}
              <div className="shrink-0 cursor-pointer group">
                <Link to="/" className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--header-text)' }}>
                  <span style={{ color: 'var(--theme-secondary)' }}>AURUM</span> AUCTIONS
                </Link>
                {/* Animated Underline */}
                <div className="h-0.5 w-0 group-hover:w-full transition-all duration-300 ease-out" style={{ backgroundColor: 'var(--theme-secondary)' }}></div>
              </div>

              {/* Desktop Categories */}
              <CategoryDropper />
            </div>

            {/* CENTER: Search Bar (Themed) */}
            <div className="max-w-2xl hidden md:flex flex-1 mx-8">
              <div 
                className="group relative w-full border rounded-full py-2.5 px-5 md:flex justify-center items-center gap-4 transition-all duration-300 focus-within:ring-2 focus-within:ring-offset-1 focus-within:ring-offset-transparent"
                style={{ 
                    backgroundColor: 'var(--header-input-bg)',
                    borderColor: 'var(--header-input-border)',
                    '--tw-ring-color': 'var(--header-input-focus)'
                }}
              >
                <input 
                  type="text" 
                  placeholder="Search for items, artists, or brands..." 
                  className="w-full bg-transparent outline-none text-sm transition-colors"
                  style={{ 
                    color: 'var(--header-text)',
                    '::placeholder': { color: 'var(--header-text-muted)' }
                  }}
                />
                <button onClick={() => nav.search()} className="p-1.5 rounded-full transition-transform group-focus-within:scale-110">
                  <Search size={18} style={{ color: 'var(--header-text-muted)' }} />
                </button>
              </div>
            </div>

            {/* RIGHT: Actions */}
            <div className="flex items-center gap-4">
              <button onClick={() => nav.search()} className="md:hidden p-2 hover:bg-[var(--header-hover)] rounded-full transition-colors" style={{ color: 'var(--header-text)' }}>
                <Search size={24} />
              </button>

              <ThemeToggle />

              {user ? (
                <div className="flex items-center gap-4">
                  
                  {/* DYNAMIC ACTION BUTTONS */}
                  <Link
                    to={user.role === 'admin' ? "/admin" : (user.role === 'seller') ? "/create-auction" : "/become-seller"}
                    className="hidden sm:flex items-center gap-2 font-bold py-2 px-4 rounded-lg transition text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    style={{ 
                      backgroundColor: user.role === 'admin' ? 'var(--text)' : (user.role === 'seller') ? 'var(--theme-secondary)' : 'var(--accent)', 
                      color: user.role === 'admin' ? 'var(--bg)' : (user.role === 'seller') ? '#fff' : '#1A1205'
                    }}
                  >
                    {user.role === 'admin' ? <LayoutDashboard size={18} /> : (user.role === 'seller') ? <Plus size={18} /> : <ArrowRight size={18} />}
                    <span className="hidden md:inline">
                      {user.role === 'admin' ? "Dashboard" : (user.role === 'seller') ? "Create" : "Start Selling"}
                    </span>
                  </Link>

                  <NotificationDropper />
                  <ProfileDropper />
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-3">
                  <button onClick={() => nav.login()} 
                    className="font-medium text-sm transition-colors px-4 py-2 rounded-lg hover:bg-[var(--header-hover)]" 
                    style={{ color: 'var(--header-text)' }}
                  >
                    Log In
                  </button>
                  <button onClick={() => nav.register()} 
                    className="font-bold text-sm px-6 py-2.5 rounded-full shadow-lg transition-all transform hover:-translate-y-0.5 hover:brightness-110"
                    style={{ backgroundColor: 'var(--accent)', color: '#1A1205' }}
                  >
                    Register
                  </button>
                </div>
              )}

              {/* Mobile Menu Trigger */}
              <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-[var(--header-hover)] transition-colors" style={{ color: 'var(--header-text)' }}>
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- MOBILE MENU OVERLAY --- */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-60 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
          
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-[320px] shadow-2xl flex flex-col transform transition-transform duration-300 ease-out"
               style={{ backgroundColor: 'var(--bg)', borderLeft: '1px solid var(--border)' }}>
            
            {/* Mobile Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Menu</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-full hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>

            {/* Mobile Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Mobile Search */}
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="w-full rounded-xl py-3 pl-11 pr-4 outline-none border focus:ring-2 transition-all"
                  style={{ 
                      backgroundColor: 'var(--input-bg)', 
                      borderColor: 'var(--input-border)',
                      color: 'var(--text)',
                      '--tw-ring-color': 'var(--accent)'
                  }}
                />
                <Search className="absolute left-4 top-3.5" size={18} style={{ color: 'var(--text-muted)' }} />
              </div>

              {/* Mobile Categories Accordion */}
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-widest mb-4 ml-1" style={{ color: 'var(--theme-secondary)' }}>Browse Categories</h3>
                {categories.map((cat) => (
                  <div key={cat.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
                    <button 
                      onClick={() => setActiveMobileCategory(activeMobileCategory === cat.id ? null : cat.id)}
                      className="w-full flex items-center justify-between py-4 hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--text)' }}
                    >
                      <span className="font-semibold">{cat.name}</span>
                      <ChevronDown size={16} className={`transition-transform duration-200 ${activeMobileCategory === cat.id ? 'rotate-180' : ''}`} style={{ color: activeMobileCategory === cat.id ? 'var(--accent)' : 'var(--text-muted)' }} />
                    </button>
                    
                    <div className={`overflow-hidden transition-all duration-200 ease-in-out ${activeMobileCategory === cat.id ? 'max-h-96 opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                      <ul className="pl-4 space-y-3 border-l-2 ml-2" style={{ borderColor: 'var(--border)' }}>
                        {cat.subcategories.map((sub) => (
                          <li key={sub.id}>
                            <Link to="/search" onClick={() => setIsMobileMenuOpen(false)} className="text-sm block hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text-muted)' }}>
                              {sub.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Footer */}
            <div className="p-6 border-t" style={{ backgroundColor: 'var(--bg-soft)', borderColor: 'var(--border)' }}>
              {user ? (
                 <button onClick={() => { setIsMobileMenuOpen(false); nav.home(); }} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-colors shadow-sm"
                 style={{ backgroundColor: 'var(--danger-soft)', color: 'var(--danger)' }}>
                   <LogOut size={18} /> Logout
                 </button>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => { setIsMobileMenuOpen(false); nav.login(); }} className="py-3.5 rounded-xl font-semibold border transition-all hover:bg-[var(--bg-hover)]"
                    style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
                    Log In
                  </button>
                  <button onClick={() => { setIsMobileMenuOpen(false); nav.register(); }} className="py-3.5 rounded-xl font-bold shadow-lg transition-all hover:brightness-110"
                    style={{ backgroundColor: 'var(--accent)', color: '#1A1205' }}>
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}