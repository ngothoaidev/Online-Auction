import { useState, useRef, useEffect } from "react";
import { 
  User, Gavel, Heart, LogOut, LayoutDashboard, 
  PlusCircle, Settings, ChevronRight 
} from "lucide-react";
import { useNav } from '../../hooks/useNavigate.js';
import { useAuth } from "../../contexts/AuthContext.jsx";
import { mockUserData } from "../../data/users.js"; // Fallback if auth is empty

export default function ProfileDropper() {
  const nav = useNav();
  const { user, logout } = useAuth(); // Assuming logout function exists
  const currentUser = user || mockUserData; // Fallback for UI testing

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleAction = (action) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      
      {/* --- TRIGGER: AVATAR --- */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-0.5 rounded-full transition-all duration-300 ${
          isOpen 
            ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-soft)]" 
            : "hover:ring-2 hover:ring-[var(--border)] hover:ring-offset-1 hover:ring-offset-[var(--bg-soft)]"
        }`}
      >
        <img 
          src={currentUser.avatar} 
          alt="Profile" 
          className="w-9 h-9 rounded-full object-cover border border-[var(--border)]" 
        />
        {/* Online Status Dot */}
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
      </button>

      {/* --- DROPDOWN PANEL --- */}
      {isOpen && (
        <div 
          className="absolute right-0 top-[calc(100%+0.75rem)] w-64 rounded-2xl shadow-2xl border flex flex-col backdrop-blur-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          style={{ 
            backgroundColor: 'var(--card-bg)', 
            borderColor: 'var(--border)',
            boxShadow: 'var(--card-shadow)'
          }}
        >
          {/* Decorative Arrow */}
          <div className="absolute -top-1.5 right-3 w-3 h-3 rotate-45 border-l border-t" 
               style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}></div>

          {/* 1. HEADER: User Info */}
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                {currentUser.name}
              </p>
              <p className="text-xs truncate font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {currentUser.email}
              </p>
              {currentUser.role === 'seller' && (
                <span className="inline-block mt-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[var(--accent)] text-[#1A1205]">
                  Verified Seller
                </span>
              )}
          </div>
          
          {/* 2. MENU ITEMS */}
          <div className="py-2 px-2 flex flex-col gap-1">
            
            {/* Buyer Group */}
            <MenuItem 
                icon={User} 
                label="My Profile" 
                onClick={() => handleAction(() => nav.profile(currentUser.id))} 
            />
            <MenuItem 
                icon={Gavel} 
                label="My Bids" 
                onClick={() => handleAction(nav.activeBids)} 
            />
            <MenuItem 
                icon={Heart} 
                label="Watchlist" 
                onClick={() => handleAction(nav.favouriteProducts)} 
            />

            {/* Seller Group (Conditional) */}
            {currentUser.role === 'seller' && (
                <>
                    <div className="h-px mx-2 my-1" style={{ backgroundColor: 'var(--border)' }}></div>
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-subtle)' }}>Seller Tools</div>
                    
                    <MenuItem 
                        icon={LayoutDashboard} 
                        label="Dashboard" 
                        onClick={() => handleAction(nav.me)} 
                        highlight 
                    />
                    <MenuItem 
                        icon={PlusCircle} 
                        label="Create Auction" 
                        onClick={() => handleAction(nav.create)} 
                    />
                </>
            )}

            {/* Settings Group */}
            <div className="h-px mx-2 my-1" style={{ backgroundColor: 'var(--border)' }}></div>
            <MenuItem 
                icon={Settings} 
                label="Settings" 
                onClick={() => handleAction(() => console.log('Settings'))} 
            />
            
            {/* Logout */}
            <button
                onClick={() => handleAction(logout || (() => console.log('Logout')))}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group"
                style={{ color: 'var(--danger)' }}
            >
                <div className="p-1.5 rounded-md bg-[var(--danger-soft)] group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                    <LogOut size={16} />
                </div>
                <span>Sign Out</span>
            </button>

          </div>
        </div>
      )}
    </div>
  );
}

// --- Reusable Menu Item Component ---
function MenuItem({ icon: Icon, label, onClick, highlight = false }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
            ${highlight 
                ? 'bg-[var(--bg-subtle)] text-[var(--text)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]' 
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]'
            }`}
        >
            <div className="flex items-center gap-3">
                <Icon size={16} className={`transition-colors ${highlight ? 'text-[var(--accent)]' : 'group-hover:text-[var(--accent)]'}`} />
                <span>{label}</span>
            </div>
            {highlight && <ChevronRight size={14} className="opacity-50" />}
        </button>
    );
}