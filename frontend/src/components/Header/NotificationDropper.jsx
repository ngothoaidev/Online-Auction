import { useState, useRef, useEffect } from "react";
import { Bell, Trophy, HelpCircle, CheckCircle, X } from "lucide-react";
import { mockNotifications } from "../../data/users.js";

export default function NotificationDropper() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
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

  const getIcon = (iconType) => {
    const iconMap = { bell: Bell, trophy: Trophy, question: HelpCircle, "check-circle": CheckCircle };
    const IconComponent = iconMap[iconType] || Bell;
    return <IconComponent size={18} />;
  };

  const formatTime = (timestamp) => {
    const diff = (new Date() - timestamp) / 60000; // minutes
    if (diff < 1) return "Just now";
    if (diff < 60) return `${Math.floor(diff)}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    return `${Math.floor(diff/1440)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full transition-all duration-100 hover:bg-[var(--bg-hover)]"
        style={{
          backgroundColor: isOpen ? "var(--accent-soft)" : "transparent",
          color: isOpen ? "var(--accent)" : "var(--text)",
        }}
      >
        <Bell size={20} />
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
                style={{ backgroundColor: 'var(--danger)' }}>
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-50"
             style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
            <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Notifications</h3>
            {notifications.length > 0 && (
              <button onClick={() => setNotifications([])} className="text-xs font-medium hover:underline" style={{ color: 'var(--accent)' }}>
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                  <Bell size={32} style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>No new notifications</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {notifications.map((n, idx) => (
                  <div key={idx} className="px-4 py-3 hover:bg-[var(--bg-hover)] group relative transition-colors">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                           style={{
                             backgroundColor: n.icon === "trophy" ? "var(--success-soft)" : "var(--info-soft)",
                             color: n.icon === "trophy" ? "var(--success)" : "var(--info)"
                           }}>
                        {getIcon(n.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{n.message}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{formatTime(n.time)}</p>
                      </div>
                      <button onClick={() => setNotifications(p => p.filter((_, i) => i !== idx))} 
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--danger-soft)] transition-opacity"
                              style={{ color: 'var(--text-muted)' }}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t text-center" style={{ borderColor: 'var(--border)' }}>
            <button className="text-xs font-medium hover:underline" style={{ color: 'var(--accent)' }}>View all</button>
          </div>
        </div>
      )}
    </div>
  );
}