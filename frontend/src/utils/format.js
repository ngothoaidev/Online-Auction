/**
 * Time Formatting Utilities for Auction Cards
 * Plugin for formatting time values in various formats
 */

/**
 * Format currency amount using Vietnamese Dong format
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

/**
 * Format time duration in seconds to readable string
 * @param {number} seconds - Number of seconds
 * @returns {string} Formatted time string (e.g., "2d 5h", "3h 45m", "30m 15s")
 */
export const formatTime = (seconds) => {
  if (seconds <= 0) return "Ended";
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
};

/**
 * Calculate time left from end date and determine urgency level
 * @param {string|Date} endTime - The auction end time (ISO string or Date object)
 * @returns {Object} Object with timeLeft string and urgencyLevel
 * @returns {string} Object.timeLeft - Formatted time remaining
 * @returns {string} Object.urgencyLevel - One of: 'normal', 'warning', 'critical'
 * @returns {number} Object.difference - Raw milliseconds difference
 */
export const calculateTimeLeft = (endTime) => {
  const difference = new Date(endTime) - new Date();
  
  if (difference <= 0) {
    return {
      timeLeft: 'Ended',
      urgencyLevel: 'ended',
      difference: 0,
    };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((difference / 1000 / 60) % 60);

  let urgencyLevel = 'normal';
  if (days === 0 && hours < 1) {
    urgencyLevel = 'critical';
  } else if (days === 0) {
    urgencyLevel = 'warning';
  }

  const timeLeft = days > 0 ? `${days}d ${hours}h left` : `${hours}h ${minutes}m left`;

  return {
    timeLeft,
    urgencyLevel,
    difference,
  };
};
