/**
 * Always get the current, actual date (not a fixed value)
 */
export function getCurrentDate(): Date {
  return new Date();
}

/**
 * Formats a date string into a human-readable format
 * @param dateStr ISO date string (YYYY-MM-DD)
 * @returns Formatted date string
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr; // Return the original string if parsing fails
  }
}

/**
 * Formats a time string into a 24-hour format
 * @param timeStr Time string (HH:MM:SS or HH:MM)
 * @returns Formatted time string in 24-hour format (HH:MM)
 */
export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  
  try {
    // Handle both full datetime strings and time-only strings
    let time;
    if (timeStr.includes('T')) {
      // It's a full datetime string
      time = new Date(timeStr);
    } else {
      // It's just a time string, create a dummy date to parse it
      time = new Date(`2000-01-01T${timeStr}`);
    }
    
    // Use 24-hour format (no AM/PM)
    return time.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false // Force 24-hour format
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeStr; // Return the original string if parsing fails
  }
}

/**
 * Returns a friendly date display like "Today", "Yesterday", or the formatted date
 * Always uses the actual current date, not a fixed one
 */
export function formatDateDisplay(dateStr: string): string {
  const today = getCurrentDate();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  
  if (date.getTime() === today.getTime()) {
    return 'Today';
  } else if (date.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return formatDate(dateStr);
  }
}

/**
 * Format for "Today" uses the actual current date
 */
export function getTodayDateString(): string {
  const today = getCurrentDate();
  return today.toISOString().split('T')[0];
}