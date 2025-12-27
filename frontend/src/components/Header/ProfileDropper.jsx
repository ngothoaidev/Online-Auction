import { useState, useRef, useEffect } from "react";
import { User, Gavel, Heart, LogOut, LayoutDashboard, PlusCircle, Settings, ChevronRight } from "lucide-react";
import { useNav } from '../../hooks/useNavigate';
import { useAuth } from "../../contexts/AuthContext";
import { mockUserData } from "../../data/users.js";

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
    <div className="relative hidden lg:block" ref={dropdownRef}>
      
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
          className="absolute right-0 top-[calc(100%+0.75rem)] w-64 rounded-2xl shadow-2xl border flex flex-col backdrop-blur-xl z-50 overflow-visible animate-in fade-in zoom-in-95 duration-200"
          style={{ 
            backgroundColor: 'var(--card-bg)', 
            borderColor: 'var(--border)',
            boxShadow: 'var(--card-shadow)'
          }}
        >
          {/* Decorative Arrow */}
          <div className="absolute -top-1.5 right-3.5 w-3 h-3 rotate-45 bg-[var(--card-bg)] border-l border-t border-[var(--border)]" />

          {/* 1. HEADER: User Info */}
          <div className="px-5 py-4 border-b border-[var(--border)]">
              <p className="text-md font-bold text-[var(--text)] truncate flex items-center gap-2">
                {currentUser.name}
                {currentUser.role === 'seller' && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[var(--accent)] text-[#1A1205]">
                    Seller
                  </span>
                )}
              </p>
              <p className="text-xs truncate font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {currentUser.email}
              </p>
          </div>
          
          {/* 2. MENU ITEMS */}
          <div className="py-2 px-2 flex flex-col gap-1">
            
            {/* Buyer Group */}
            <button
              onClick={() => handleAction(() => nav.profile(currentUser.id))}
              className="w-full flex items-center gap-4 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
            >
                <User size={16} className="transition-colors group-hover:text-[var(--accent)]" />
                <span>My Profile</span>
            </button>
            
            {/* Logout */}
            <button
                onClick={() => handleAction(logout || (() => console.log('Logout')))}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                style={{ color: 'var(--danger)' }}
            >
                <div className="p-1.5 rounded-md bg-[var(--danger-soft)]">
                    <LogOut size={16} />
                </div>
                <span>Log out</span>
            </button>

          </div>
        </div>
      )}
    </div>
  );
}