import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, X, ChevronDown, LogOut } from "lucide-react"
import { useNav } from "../../hooks/useNavigate.js";
import { categories } from '../../data/constants.js';

export default function MobileMenu({ user, setIsMobileMenuOpen }) {
    const nav = useNav();
    const [activeMobileCategory, setActiveMobileCategory] = useState(null);
    const [searchQuery, setSearchQuery] = useState(""); // Track mobile search

    const handleMobileSearch = () => {
        setIsMobileMenuOpen(false); // Close menu
        nav.search(searchQuery);
    };
    
    return (
        <div className="fixed inset-0 z-60 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
          
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-[320px] shadow-2xl flex flex-col transform transition-transform duration-300 ease-out"
               style={{ backgroundColor: 'var(--bg)', borderLeft: '1px solid var(--border)' }}>
            
            {/* Mobile Header */}
            <div className="flex items-center justify-between px-6 py-2 bg-[var(--bg-soft)] border-b border-[var(--border)]">
                <button onClick={() => {nav.me(); setIsMobileMenuOpen(false)}} className="p-2 rounded-full hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-muted)' }}>
                    <img 
                        src={user.avatar} 
                        alt="Profile" 
                        className="w-10 h-10 rounded-full object-cover border border-[var(--border)]" 
                    />
                </button>
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..." 
                  className="w-full rounded-xl py-3 pl-11 pr-4 outline-none border focus:ring-2 transition-all"
                  style={{ 
                      backgroundColor: 'var(--input-bg)', 
                      borderColor: 'var(--input-border)',
                      color: 'var(--text)',
                      '--tw-ring-color': 'var(--accent)'
                  }}
                />
                <button onClick={handleMobileSearch} className="absolute left-4 top-3.5 text-[var(--text-muted)]">
                   <Search size={18} />
                </button>
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
                            <Link to={`/search/p=${sub.name}`} onClick={() => setIsMobileMenuOpen(false)} className="text-sm block hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text-muted)' }}>
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
    );
}