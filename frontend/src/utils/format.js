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
 * Format the ending date
 * @param {string|Date} date - The auction end time (ISO string or Date object)
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
};

/**
 * Calculate and format time left - Determine urgency level
 * @param {string|Date} endTime - The auction end time (ISO string or Date object)
 * @returns {Object} Object with timeLeft string and urgencyLevel
 * @returns {string} Object.timeLeft - Formatted time remaining
 * @returns {string} Object.urgencyLevel - One of: 'normal', 'warning', 'critical'
 */
export const formatTimeLeft = (endTime) => {
  const end = new Date(endTime);
  const now = new Date();
  const difference = end - now;

  // 1. Check if Ended
  if (difference <= 0) {
    return { 
      timeLeft: 'Ended', 
      urgencyLevel: 'ended' 
    };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((difference / 1000 / 60) % 60);

  // 2. If > 3 Days: Return specific Date (dd/mm/yyyy)
  if (days > 3) {
    // const d = String(end.getDate()).padStart(2, '0');
    // const m = String(end.getMonth() + 1).padStart(2, '0');
    // const y = end.getFullYear();
    // return {
    //   timeLeft: `${d}/${m}/${y}`,
    //   urgencyLevel: 'normal' // Not urgent yet
    // };
    return {
      timeLeft: formatDate(end), 
      urgencyLevel: 'normal'
    };
  }

  // 3. Determine Urgency (< 3 Days)
  let urgencyLevel = 'normal';
  if (days === 0 && hours < 1) {
    urgencyLevel = 'critical'; // Less than 1 hour
  } else if (days === 0) {
    urgencyLevel = 'warning';  // Less than 24 hours
  }

  // 4. Format the Countdown Text
  let timeLeft = '';
  if (days > 0) {
    timeLeft = `${days}d ${hours}h`;
  } else if (hours > 0) {
    timeLeft = `${hours}h ${minutes}m`;
  } else {
    timeLeft = minutes > 0 ? `${minutes}m` : '< 1m';
  }

  return { timeLeft, urgencyLevel };
};
