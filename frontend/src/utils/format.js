/**
 * Format the ending date
 * @param {string|Date} date - The auction end time (ISO string or Date object)
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
export const formatDate = (date, includeTime = false) => {
  if (!date) return 'Unknown';
  const options = { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    ...(includeTime && { hour: '2-digit', minute: '2-digit' })
  };
  return new Date(date).toLocaleDateString('en-US', options);
};

/**
 * Calculate and format time left - Determine urgency level
 * @param {string|Date} endTime - The auction end time (ISO string or Date object)
 * @returns {Object} Object with timeLeft string and urgencyLevel
 * @returns {string} Object.timeLeft - Formatted time remaining
 * @returns {string} Object.urgencyLevel - One of: 'normal', 'warning', 'critical'
 */
/** `now` (ms) lets callers pass a server-corrected clock. `seconds`: show seconds in the final 5 minutes (only for a 1s tick). */
export const formatTimeLeft = (endTime, now = Date.now(), { seconds = false } = {}) => {
  const end = new Date(endTime);
  const difference = end - now;

  // Check if Ended
  if (difference <= 0) {
    return { 
      timeLeft: 'Ended', 
      urgencyLevel: 'ended' 
    };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((difference / 1000 / 60) % 60);

  // If > 3 Days: Return specific Date (dd/mm/yyyy)
  if (days > 3) {
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
  } else if (seconds && minutes < 5) {
    const s = Math.floor((difference / 1000) % 60);
    timeLeft = minutes > 0 ? `${minutes}m ${s}s` : `${s}s`;
  } else {
    timeLeft = minutes > 0 ? `${minutes}m` : '< 1m';
  }

  return { timeLeft, urgencyLevel };
};

/** Absolute deadline with the viewer's time zone, e.g. "23 Oct 2026, 21:35 GMT+7". */
export const formatDeadline = (date) => new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
}).format(new Date(date));

export function formatTimeAgo(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diff = now - time;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

export function formatBidderName(username, isCurrentUser) {
  if (isCurrentUser) return "You";
  if (!username) return "Unknown";
  
  if (username.length <= 3) return username[0] + "**";
  
  const firstChar = username[0];
  const lastChar = username[username.length - 1];
  const maskedLength = Math.min(username.length - 2, 5);
  const masked = '*'.repeat(maskedLength);
  
  return `${firstChar}${masked}${lastChar}`;
}