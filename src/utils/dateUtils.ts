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

/**
 * Formats a Date object to YYYY-MM-DD string
 */
export const formatToDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Parses a YYYY-MM-DD string to a Date object
 */
export const parseFromDateString = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Gets the start of the week (Sunday) for a given date
 */
export const getWeekStart = (date: Date): Date => {
  const dayOfWeek = date.getDay();
  const result = new Date(date);
  result.setDate(date.getDate() - dayOfWeek);
  return result;
};

/**
 * Add days to a date and return a new Date
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(date.getDate() + days);
  return result;
};

/**
 * Checks if two dates represent the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Safely formats a date string or Date object with fallback handling
 */
export function formatSafeDate(
  dateInput: string | Date | undefined,
  format: 'full' | 'date' | 'time' | 'datetime' = 'full'
): string {
  try {
    if (!dateInput) return "No date";
    
    // Try to parse the date
    let date: Date;
    if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else {
      date = dateInput;
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date: ${dateInput}`);
      return "Invalid date";
    }
    
    const options: Intl.DateTimeFormatOptions = {};
    
    switch (format) {
      case 'date':
        options.year = 'numeric';
        options.month = 'long';
        options.day = 'numeric';
        break;
      case 'time':
        options.hour = '2-digit';
        options.minute = '2-digit';
        break;
      case 'datetime':
        options.year = 'numeric';
        options.month = 'long';
        options.day = 'numeric';
        options.hour = '2-digit';
        options.minute = '2-digit';
        break;
      case 'full':
      default:
        options.weekday = 'long';
        options.year = 'numeric';
        options.month = 'long';
        options.day = 'numeric';
        options.hour = '2-digit';
        options.minute = '2-digit';
        break;
    }
    
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Date error";
  }
}

/**
 * Converts a string date to a consistent ISO format for storage
 */
export function normalizeDate(dateInput: string | Date): string {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateInput}`);
    }
    
    return date.toISOString();
  } catch (error) {
    console.error("Error normalizing date:", error);
    return new Date().toISOString(); // Return current date as fallback
  }
}