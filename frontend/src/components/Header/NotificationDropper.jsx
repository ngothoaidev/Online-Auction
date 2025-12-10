import { useState, useRef, useEffect } from "react";
import { Bell, Check, Trophy, HelpCircle, CheckCircle, X } from "lucide-react";
import { mockNotifications } from "../../data/users.js";

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
        className="relative p-2 rounded-full transition-all duration-100 hover:bg-gray-100 dark:hover:bg-gray-800"
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
          className="notification-dropdown absolute right-0 mt-3 w-80 sm:w-96 rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-50"
        >
          {/* Header */}
          <div
            className="notification-header px-4 py-3 border-b flex items-center justify-between"
          >
            <h3
              className="notification-title font-bold text-lg"
            >
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="notification-link text-xs font-medium transition-colors hover:underline"
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
                  className="notification-empty w-16 h-16 rounded-full flex items-center justify-center mb-3"
                >
                  <Bell size={32} className="notification-empty-icon" />
                </div>
                <p
                  className="notification-empty-text text-sm font-medium"
                >
                  No new notifications
                </p>
                <p
                  className="notification-empty-subtext text-xs mt-1"
                >
                  You're all caught up!
                </p>
              </div>
            ) : (
              <div className="notification-divider divide-y">
                {notifications.map((notification, index) => (
                  <div
                    key={index}
                    className="px-4 py-3 transition-colors duration-100 hover:bg-[var(--bg-hover)] group relative"
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
                          className="notification-item-title text-sm leading-relaxed"
                        >
                          {notification.message}
                        </p>
                        <p
                          className="notification-item-desc text-xs mt-1"
                        >
                          {formatTime(notification.time)}
                        </p>
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => handleRemoveNotification(index)}
                        className="notification-time flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--danger-soft)]"
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
              className="notification-footer px-4 py-3 border-t text-center"
            >
              <button
                className="notification-footer-link text-sm font-medium transition-colors hover:underline"
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