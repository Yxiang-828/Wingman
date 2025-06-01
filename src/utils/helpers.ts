/**
 * Debounces a function call with a specified delay
 * @param func The function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return function(...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

/**
 * Truncates text to a specified length and adds ellipsis
 * @param text Text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Get current user ID from localStorage
 * @returns {string | null} User ID or null if not authenticated
 */
export const getCurrentUserId = (): string | null => {
  try {
    const user = localStorage.getItem('user');
    if (!user) return null;
    
    const userData = JSON.parse(user);
    return userData.id || userData.user_id || null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
};

/**
 * Check if user is currently authenticated
 * @returns {boolean} True if authenticated
 */
export const isUserAuthenticated = (): boolean => {
  const userId = getCurrentUserId();
  const token = localStorage.getItem('token');
  return !!(userId && token);
};

/**
 * Get current user data from localStorage
 * @returns {any | null} User data or null if not authenticated
 */
export const getCurrentUser = (): any | null => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};