import { useState, useRef, useEffect } from "react";
import { useNav } from '../../hooks/useNavigate.js';
import { mockUserData } from "../../data/users.js";

export default function ProfileDropper() {
  const nav = useNav();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1 rounded-full border-2 transition-all duration-200"
        style={{
          borderColor: isOpen ? "var(--accent)" : "transparent",
          backgroundColor: isOpen ? "var(--accent-soft)" : "transparent",
        }}
      >
        <img src={mockUserData.avatar} alt="User Avatar" className="w-8 h-8 rounded-full object-cover" />        
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-56 rounded-xl shadow-xl border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
             style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{mockUserData.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{mockUserData.email}</p>
          </div>
          
          <div className="py-1">
            {[
              { label: "My Profile", action: () => nav.profile(mockUserData.id) },
              { label: "My Bids", action: () => nav.activeBids() }, // Assuming method exists
              { label: "Watchlist", action: () => nav.favouriteProducts() }, // Assuming method exists
              { label: "Logout", action: () => console.log("Logout"), isDanger: true }
            ].map((item, idx) => (
              <button
                key={idx}
                className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-hover)]"
                style={{ color: item.isDanger ? 'var(--danger)' : 'var(--text)' }}
                onClick={() => { setIsOpen(false); item.action(); }}
              >
                  {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}