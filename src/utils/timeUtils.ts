/**
 * Time utilities to standardize date handling across the application
 */

/**
 * Get today's date in YYYY-MM-DD format using device's local time
 */
export const getTodayDateString = (): string => {
  const now = new Date();
  return formatDateToString(now);
};

/**
 * Format a Date object to YYYY-MM-DD string using device's local time
 */
export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse a date string to a Date object (preserving local time)
 */
export const parseLocalDateString = (dateStr: string): Date => {
  // Split by the dash to get year, month, day
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Format time in 24h format (HH:MM)
 */
export const formatTimeString = (timeStr: string): string => {
  if (!timeStr) return '';
  
  // If already in correct format, return as-is
  if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
  
  // Handle AM/PM format
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm|AM|PM))?$/);
  if (match) {
    const [_, hours, minutes, period] = match;
    let hoursNum = parseInt(hours, 10);
    
    // Convert to 24h format
    if (period?.toLowerCase() === 'pm' && hoursNum < 12) {
      hoursNum += 12;
    } else if (period?.toLowerCase() === 'am' && hoursNum === 12) {
      hoursNum = 0;
    }
    
    return `${String(hoursNum).padStart(2, '0')}:${minutes}`;
  }
  
  return timeStr;
};

/**
 * Get current time in HH:MM format
 */
export const getCurrentTimeString = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Validate if a time string is in the future today
 */
export const isTimeInFuture = (timeStr: string): boolean => {
  if (!timeStr) return false;
  
  const currentTime = getCurrentTimeString();
  return timeStr > currentTime;
};

/**
 * Get next available time slot (current time + 30 minutes)
 */
export const getNextAvailableTime = (): string => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};