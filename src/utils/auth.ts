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

// Get current user ID
export const getCurrentUserId = (): string => {
  const user = getCurrentUser();
  return user?.id || '';
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