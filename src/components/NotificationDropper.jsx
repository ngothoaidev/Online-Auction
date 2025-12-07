import { useState, useRef, useEffect } from "react";
import { Bell, Check, Trophy, HelpCircle, CheckCircle, X } from "lucide-react";
import { mockNotifications } from "../data/mockData";

export default function NotificationDropper() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Get icon component based on notification type
  const getIcon = (iconType) => {
    const iconMap = {
      bell: Bell,
      trophy: Trophy,
      question: HelpCircle,
      "check-circle": CheckCircle,
    };
    const IconComponent = iconMap[iconType] || Bell; // Default to Bell if not found
    return <IconComponent size={18} />;
  };

  // Format time difference
  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Mark all as read
  const handleMarkAllRead = () => {
    setNotifications([]);
  };

  // Remove individual notification
  const handleRemoveNotification = (index) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  };

  const unreadCount = notifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        style={{
          backgroundColor: isOpen ? "var(--accent-soft)" : "transparent",
          color: "var(--text)",
        }}
      >
        <Bell size={20} className={isOpen ? "text-[var(--accent)]" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[var(--danger)] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-3 w-80 sm:w-96 rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50"
          style={{
            backgroundColor: "var(--bg-soft)",
            borderColor: "var(--border)",
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "var(--border)" }}
          >
            <h3
              className="font-bold text-lg"
              style={{ color: "var(--text)" }}
            >
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium transition-colors hover:underline"
                style={{ color: "var(--accent)" }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: "var(--bg-subtle)" }}
                >
                  <Bell size={32} style={{ color: "var(--text-muted)" }} />
                </div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  No new notifications
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-subtle)" }}
                >
                  You're all caught up!
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {notifications.map((notification, index) => (
                  <div
                    key={index}
                    className="px-4 py-3 transition-colors duration-200 hover:bg-[var(--bg-hover)] group relative"
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div
                        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor:
                            notification.icon === "trophy"
                              ? "var(--success-soft)"
                              : notification.icon === "check-circle"
                              ? "var(--info-soft)"
                              : "var(--accent-soft)",
                          color:
                            notification.icon === "trophy"
                              ? "var(--success)"
                              : notification.icon === "check-circle"
                              ? "var(--info)"
                              : "var(--accent)",
                        }}
                      >
                        {getIcon(notification.icon)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "var(--text)" }}
                        >
                          {notification.message}
                        </p>
                        <p
                          className="text-xs mt-1"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {formatTime(notification.time)}
                        </p>
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => handleRemoveNotification(index)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--danger-soft)]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className="px-4 py-3 border-t text-center"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                className="text-sm font-medium transition-colors hover:underline"
                style={{ color: "var(--accent)" }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}