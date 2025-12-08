import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNav } from '../useNavigate.js';
import { 
  Search, 
  Menu, 
  X, 
  ChevronDown, 
  User, 
  LogOut, 
  Heart, 
  Gavel, 
  ShoppingBag, 
  Bell,
  Sun,
  Moon,
  ArrowRight,
} from 'lucide-react';
import { categories } from '../data/mockData.js';
import { mockNotifications } from '../data/mockData.js';
import NotificationDropper from './NotificationDropper.jsx';
import ProfileDropper from './ProfileDropper.jsx';
/**
 * Header Component - Online Auction Platform
 * Implements "Dark Premium" theme with Gold highlights.
 */

export default function Header({ darkMode, toggleTheme }) {
  const nav = useNav();
  // State for Mobile Menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // State for Mobile Category Accordion
  const [activeMobileCategory, setActiveMobileCategory] = useState(null);

  // State for Notifications Dropper
  const [notifications, setNotifications] = useState(mockNotifications);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);


  // State for User Dropdown (Desktop)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  // Mock Auth State (Toggle this via the UI demo controls below)
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // Toggle scrolling lock when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* MAIN HEADER 
        Colors: 
        - BG: #2A2038 (Secondary Violet)
        - Text: White / Muted
        - Accents: #E0B84C (Gold), #C0341D (Red)
      */}
      <header 
      // className="sticky top-0 z-50 w-full bg-[#2A2038] shadow-2xl border-b border-white/5 font-sans">
      className=" backdrop-blur-md shadow-md sticky top-0 z-50 transition-colors duration-300 border-b"
      style={{ backgroundColor: "var(--bg-soft)", color: "var(--text)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* LEFT: Logo & Categories (Desktop) */}
            <div className="flex items-center gap-8">
              {/* Logo */}
              <div className="shrink-0 cursor-pointer group">
                <Link to="/" className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <span className="text-[var(--theme-secondary)]">AURUM</span> AUCTIONS
                </Link>
                <div className="h-0.5 w-0 group-hover:w-full bg-[var(--theme-secondary)] transition-all duration-300"></div>
              </div>

              {/* Desktop Categories Menu (Mega Menu Hover) */}
              <div className="hidden lg:block relative group">
                <button 
                  style={{
                    color: "var(--text)",
                  }}
                  className="flex items-center gap-1   transition-colors py-6 font-medium text-sm uppercase tracking-wide"
                >
                  Categories
                  <ChevronDown size={16} />
                </button>

                {/* Dropdown Panel */}
                <div
                  style={{
                    backgroundColor: "var(--bg-soft)",
                    borderColor: "var(--border)",
                  }}
                  className="absolute top-full left-0 w-60  border  rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 flex flex-col gap-6 p-6 backdrop-blur-md"
                >
                  {categories.map((cat) => (
                    <div className="group/item relative" key={cat.id}>
                      <Link 
                        // to={`/search?category=${cat.name}`}
                        to="/search"
                        style={{
                          color: "var(--text)",
                        }}
                        className="px-4 py-2 rounded-lg flex justify-between items-center transition-colors hover:bg-[var(--bg-hover)]"
                      >
                          {cat.name}
                          {cat.subcategories.length > 0 && <ArrowRight className="w-3 h-3 text-gray-400" />}
                      </Link>
                      {cat.subcategories.length > 0 && (
                        <div className="hidden group-hover/item:block absolute left-full top-0 w-48 pl-1">
                          <div 
                            style={{
                              backgroundColor: "var(--bg-soft)",
                              borderColor: "var(--border)",
                            }}
                            className="shadow-xl rounded-lg border py-2"
                          >
                            {cat.subcategories.map((sub, sIdx) => (
                              <Link 
                                key={sIdx} 
                                // to={`/search?category=${cat.name}&subcategory=${sub}`}
                                to="/search"
                                className="block px-4 py-2 text-sm transition-colors duration-300 hover:bg-[var(--bg-hover)]"
                                style={{
                                  color: "var(--text)",
                                }}
                                >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CENTER: Search Bar (Desktop) */}
            <div className="max-w-2xl hidden md:flex flex-1 mx-8">
              <div 
                className="relative transition-colors duration-300 w-full border-2 rounded-full py-2.5 px-5 md:flex justify-center items-center gap-4 focus:outline-none focus:border-[var(--theme-secondary)] focus:ring-1 focus:ring-[var(--theme-secondary)] transition-all"
                style={{backgroundColor: "var(--bg-soft)", borderColor: "var(--border)", text: "var(--text)"}}
              >
                <input 
                  type="text" 
                  placeholder="Search for items, artists, or brands..." 
                  className="w-full transition-colors duration-300 outline-none placeholder:text-gray-500 text-sm"
                    style={{backgroundColor: "var(--bg-soft)", color: "var(--text)", }}
                />
                <button 
                  onClick={() => nav.search()}
                  className="p-1.5 rounded-full transition-colors"
                  >
                  <Search className="text-gray-500 group-hover:text-[var(--theme-secondary)] transition-colors" size={18} />
                </button>
              </div>
            </div>

            {/* RIGHT: User Actions */}
            <div className="flex items-center gap-4">
              
              {/* Mobile Search Trigger (Visible only on small screens) */}
              <button
                onClick={() => nav.search()} 
                className="md:hidden text-gray-300 hover:text-[var(--theme-secondary)]">
                <Search size={24} />
              </button>

              {/* Dark Mode Toggle */}
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full"
                style={{
                        backgroundColor: "var(--accent-soft)",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                }}
              >
                {!darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
              </button>

              {isLoggedIn ? (
                /* LOGGED IN STATE */
                <div className="flex items-center gap-4">
                  {/* Notifications */}
                  <NotificationDropper />

                  {/* User Avatar Dropdown */}
                  <div className="relative">
                    <ProfileDropper />
                  </div>
                </div>
              ) : (
                /* GUEST STATE */
                <div className="hidden sm:flex items-center gap-3">
                  <button
                    onClick={() => nav.login()}
                    className="text-white hover:text-[var(--theme-secondary)] font-medium text-sm transition-colors px-3 py-2">
                    Log In
                  </button>
                  <button
                    onClick={() => nav.register()}
                    className="bg-[#B88A20] hover:brightness-110 text-[#1A1225] font-bold text-sm px-5 py-2.5 rounded-full shadow-lg transition-all transform hover:-translate-y-0.5">
                    Register
                  </button>
                </div>
              )}

              {/* Mobile Menu Trigger */}
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden text-white hover:text-[var(--theme-secondary)] transition-colors p-1"
              >
                <Menu size={28} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE MENU OVERLAY
        Full screen slide-over
      */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-60 lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-[80%] max-w-[320px] bg-[#1A1225] border-l border-white/10 shadow-2xl flex flex-col transform transition-transform duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#2A2038]">
              <h2 className="text-xl font-bold text-white">Menu</h2>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X size={24} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Mobile Search */}
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="w-full bg-[#2A2038] text-white border border-white/10 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-[var(--theme-secondary)]"
                />
                <Search className="absolute left-3 top-3.5 text-gray-500" size={18} />
              </div>

              {/* Mobile Categories (Accordion) */}
              <div className="space-y-2">
                <h3 className="text-[var(--theme-secondary)] text-xs font-bold uppercase tracking-wider mb-2">Browse Categories</h3>
                {categories.map((cat) => (
                  <div key={cat.id} className="border-b border-white/5 last:border-0">
                    <button 
                      onClick={() => setActiveMobileCategory(activeMobileCategory === cat.id ? null : cat.id)}
                      className="w-full flex items-center justify-between py-3 text-gray-200 hover:text-white"
                    >
                      <span className="font-medium">{cat.name}</span>
                      <ChevronDown 
                        size={16} 
                        className={`transition-transform duration-300 ${activeMobileCategory === cat.id ? 'rotate-180 text-[var(--theme-secondary)]' : 'text-gray-500'}`} 
                      />
                    </button>
                    
                    {/* Subcategories */}
                    <div className={`overflow-hidden transition-all duration-300 ${activeMobileCategory === cat.id ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <ul className="pl-4 pb-3 space-y-3">
                        {cat.subcategories.map((sub) => (
                          <li key={sub.id}>
                            <a href="#" className="text-gray-400 text-sm hover:text-[var(--theme-secondary)] block">
                              {sub.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-6 space-y-4">
                <a href="#" className="flex items-center gap-3 text-gray-300 hover:text-white">
                  <ShoppingBag size={20} /> About Us
                </a>
                <a href="#" className="flex items-center gap-3 text-gray-300 hover:text-white">
                  <Heart size={20} /> Policies
                </a>
              </div>
            </div>

            {/* Drawer Footer (Auth) */}
            <div className="p-6 bg-[#2A2038] border-t border-white/10">
              {isLoggedIn ? (
                 <button 
                 onClick={() => { setIsLoggedIn(false); setIsMobileMenuOpen(false); nav.home(); }}
                 className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-400 py-3 rounded-lg font-medium hover:bg-red-500/20 transition-colors"
               >
                 <LogOut size={18} /> Logout
                 </button>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => nav.login()} className="text-white border border-white/20 py-3 rounded-lg font-medium hover:bg-white/5 hover:border-white/40 transition-all">
                    Log In
                  </button>
                  <button onClick={() => nav.register()} className="bg-[var(--theme-secondary)] text-[#1A1225] py-3 rounded-lg font-bold hover:brightness-110 shadow-lg transition-all">
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
};