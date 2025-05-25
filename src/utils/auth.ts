// Get current user from localStorage
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Get current user ID - Modified to NOT redirect automatically
export const getCurrentUserId = (): string => {
  try {
    const user = getCurrentUser();
    if (!user || !user.id) {
      console.warn("User not authenticated or missing ID");
      // Remove auto-redirect - let React Router handle this
      return "";
    }
    return user.id;
  } catch (error) {
    console.error("Error retrieving user ID:", error);
    return "";
  }
};

// Check if user is logged in
export const isLoggedIn = (): boolean => {
  return !!getCurrentUser();
};

// Log out user
export const logoutUser = () => {
  localStorage.removeItem('user');
  // Redirect to login page if needed
  window.location.href = '/login';
};

// Set user data
export const setCurrentUser = (userData: any) => {
  localStorage.setItem('user', JSON.stringify(userData));
};

// Add this function to check auth state before data operations
export const waitForAuthentication = async (maxWaitTime = 5000): Promise<boolean> => {
  const startTime = Date.now();
  
  // Check every 100ms for up to maxWaitTime
  while (Date.now() - startTime < maxWaitTime) {
    const userId = getCurrentUserId();
    if (userId) return true;
    
    // Wait 100ms before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // If we hit maxWaitTime, return false
  console.warn("Authentication timed out");
  return false;
};