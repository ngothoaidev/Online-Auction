import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

/**
 * Header Component - Online Auction Platform
 * Implements "Dark Premium" theme with Gold highlights.
 */

export default function Header({ darkMode, toggleTheme }) {
  // State for Mobile Menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // State for Mobile Category Accordion
  const [activeMobileCategory, setActiveMobileCategory] = useState(null);

  // State for User Dropdown (Desktop)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  // Mock Auth State (Toggle this via the UI demo controls below)
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  const navigate = useNavigate();

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
      <header className="sticky top-0 z-50 w-full bg-[#2A2038] shadow-2xl border-b border-white/5 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* LEFT: Logo & Categories (Desktop) */}
            <div className="flex items-center gap-8">
              {/* Logo */}
              <div className="shrink-0 cursor-pointer group">
                <Link to="/" className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span className="text-[#E0B84C]">AURUM</span> AUCTIONS
                </Link>
                <div className="h-0.5 w-0 group-hover:w-full bg-[#E0B84C] transition-all duration-300"></div>
              </div>

              {/* Desktop Categories Menu (Mega Menu Hover) */}
              <div className="hidden lg:block relative group">
                <button className="flex items-center gap-1 text-gray-300 hover:text-[#E0B84C] transition-colors py-6 font-medium text-sm uppercase tracking-wide">
                  Categories
                  <ChevronDown size={16} />
                </button>

                {/* Dropdown Panel */}
                <div className="absolute top-full left-0 w-60 bg-[#2A2038] border border-white/10 rounded-b-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 overflow-visible">
                  <div className="flex flex-col gap-6 p-6">
                    {categories.map((cat) => (
                      <div className="group/item relative" key={cat.id}>
                        <Link 
                          // to={`/search?category=${cat.name}`}
                          to="/search"
                          className="px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex justify-between items-center transition-colors">
                            {cat.name}
                            {cat.subcategories.length > 0 && <ArrowRight className="w-3 h-3 text-gray-400" />}
                        </Link>
                        {cat.subcategories.length > 0 && (
                          <div className="hidden group-hover/item:block absolute left-full top-0 w-48 pl-1">
                            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-100 dark:border-gray-700 py-2">
                              {cat.subcategories.map((sub, sIdx) => (
                                <Link 
                                  key={sIdx} 
                                  // to={`/search?category=${cat.name}&subcategory=${sub}`}
                                  to="/search"
                                  className="block px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm transition-colors">
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
            </div>

            {/* CENTER: Search Bar (Desktop) */}
            <div className="flex-1 max-w-2xl hidden md:flex">
              <div className="relative w-full bg-[#1A1225] border border-white/10 rounded-full py-2.5 px-5 md:flex justify-center items-center gap-4 focus:outline-none focus:border-[#E0B84C] focus:ring-1 focus:ring-[#E0B84C] transition-all">
                <input 
                  type="text" 
                  placeholder="Search for items, artists, or brands..." 
                  className="w-full text-gray-200 outline-none placeholder-gray-500 text-sm"
                />
                <button 
                  onClick={() => navigate('/search')}
                  className="p-1.5 rounded-full transition-colors"
                >
                  <Search className="text-gray-500 group-hover:text-[#E0B84C] transition-colors" size={18} />
                </button>
              </div>
            </div>

            {/* RIGHT: User Actions */}
            <div className="flex items-center gap-4">
              
              {/* Mobile Search Trigger (Visible only on small screens) */}
              <button
                onClick={() => navigate('/search')} 
                className="md:hidden text-gray-300 hover:text-[#E0B84C]">
                <Search size={24} />
              </button>

              {/* Dark Mode Toggle */}
              <button 
                onClick={toggleTheme}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                {!darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
              </button>

              {isLoggedIn ? (
                /* LOGGED IN STATE */
                <div className="flex items-center gap-4">
                  {/* Notifications */}
                  <button className="relative text-gray-300 hover:text-[#E0B84C] transition-colors hidden sm:block">
                    <Bell size={22} />
                    <span className="absolute -top-1 -right-1 bg-[#C0341D] text-[10px] font-bold text-white w-4 h-4 rounded-full flex items-center justify-center">
                      3
                    </span>
                  </button>

                  {/* User Avatar Dropdown */}
                  <div className="relative">
                    <button 
                      onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                      className="flex items-center gap-2 focus:outline-none"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E0B84C] to-[#B88A20] p-0.5">
                        <div className="w-full h-full rounded-full bg-[#2A2038] flex items-center justify-center overflow-hidden">
                          <img 
                            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
                            alt="User" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      </div>
                    </button>

                    {/* Dropdown Menu */}
                    {isUserDropdownOpen && (
                      <div className="absolute right-0 mt-3 w-56 bg-[#2A2038] border border-white/10 rounded-xl shadow-2xl py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-4 py-3 border-b border-white/5">
                          <p className="text-sm text-white font-medium">John Doe</p>
                          <p className="text-xs text-gray-400 truncate">john.doe@example.com</p>
                        </div>
                        <Link to="\" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-[#E0B84C] transition-colors">
                          <User size={16} /> Profile
                        </Link>
                        <Link to="\" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-[#E0B84C] transition-colors">
                          <Gavel size={16} /> My Bids
                        </Link>
                        <Link to="\" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-[#E0B84C] transition-colors">
                          <Heart size={16} /> Watchlist
                        </Link>
                        <div className="border-t border-white/5 mt-1 pt-1">
                          <button 
                            onClick={() => {setIsLoggedIn(false); setIsUserDropdownOpen(false); navigate('/');}}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#C0341D] hover:bg-white/5 transition-colors text-left"
                          >
                            <LogOut size={16} /> Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* GUEST STATE */
                <div className="hidden sm:flex items-center gap-3">
                  <button
                    onClick={() => navigate("\login")}
                    className="text-white hover:text-[#E0B84C] font-medium text-sm transition-colors px-3 py-2">
                    Log In
                  </button>
                  <button
                    onClick={() => navigate("\login")}
                    className="bg-gradient-to-r from-[#E0B84C] to-[#B88A20] hover:brightness-110 text-[#1A1225] font-bold text-sm px-5 py-2.5 rounded-full shadow-lg transition-all transform hover:-translate-y-0.5">
                    Register
                  </button>
                </div>
              )}

              {/* Mobile Menu Trigger */}
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden text-white hover:text-[#E0B84C] transition-colors p-1"
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
                  className="w-full bg-[#2A2038] text-white border border-white/10 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-[#E0B84C]"
                />
                <Search className="absolute left-3 top-3.5 text-gray-500" size={18} />
              </div>

              {/* Mobile Categories (Accordion) */}
              <div className="space-y-2">
                <h3 className="text-[#E0B84C] text-xs font-bold uppercase tracking-wider mb-2">Browse Categories</h3>
                {categories.map((cat) => (
                  <div key={cat.id} className="border-b border-white/5 last:border-0">
                    <button 
                      onClick={() => setActiveMobileCategory(activeMobileCategory === cat.id ? null : cat.id)}
                      className="w-full flex items-center justify-between py-3 text-gray-200 hover:text-white"
                    >
                      <span className="font-medium">{cat.name}</span>
                      <ChevronDown 
                        size={16} 
                        className={`transition-transform duration-300 ${activeMobileCategory === cat.id ? 'rotate-180 text-[#E0B84C]' : 'text-gray-500'}`} 
                      />
                    </button>
                    
                    {/* Subcategories */}
                    <div className={`overflow-hidden transition-all duration-300 ${activeMobileCategory === cat.id ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <ul className="pl-4 pb-3 space-y-3">
                        {cat.subcategories.map((sub) => (
                          <li key={sub.id}>
                            <a href="#" className="text-gray-400 text-sm hover:text-[#E0B84C] block">
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
                 onClick={() => { setIsLoggedIn(false); setIsMobileMenuOpen(false); }}
                 className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-400 py-3 rounded-lg font-medium hover:bg-red-500/20 transition-colors"
               >
                 <LogOut size={18} /> Logout
                 </button>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <button className="text-white border border-white/20 py-3 rounded-lg font-medium hover:bg-white/5 hover:border-white/40 transition-all">
                    Log In
                  </button>
                  <button className="bg-[#E0B84C] text-[#1A1225] py-3 rounded-lg font-bold hover:brightness-110 shadow-lg transition-all">
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