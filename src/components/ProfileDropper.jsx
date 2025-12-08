import { useState, useRef, useEffect } from "react";
import { Bell, Check, Trophy, HelpCircle, CheckCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { current_user } from "../data/mockData";

export default function ProfileDropper() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
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
    const dropdownRef = useRef(null);
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
        <img
          src={current_user.avatar}
          alt="User Avatar"
          className="w-6 h-6 rounded-full object-cover"
        />        
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
          <div className="py-2">
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {current_user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {current_user.email}
                </p>
            </div>
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => { setIsOpen(false); /* Add logout logic here */ }}
            >
                Profile
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => { setIsOpen(false); /* Add logout logic here */ }}
            >
              My bids
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => { setIsOpen(false); /* Add logout logic here */ }}
            >
              Watch list
            </button>

            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => { setIsOpen(false); navigate("/login"); /* Add logout logic here */ }}
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}