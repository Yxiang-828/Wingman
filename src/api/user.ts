import { api } from './apiClient';
import type { UserLogin } from '../types/user';

/**
 * User Authentication API
 * Handles all user-related operations through hybrid architecture
 * Routes authentication through apiClient to backend, then to Supabase
 */
console.info('User API: Authentication operations route to Supabase via backend');

/**
 * Authenticates user credentials and establishes session
 * @param credentials - User login credentials (email/username and password)
 * @returns Promise with user data and authentication token
 */
export const loginUser = async (credentials: UserLogin) => {
  try {
    console.log('Attempting user login via hybrid architecture...');
    
    // Use centralized apiClient for proper routing and error handling
    const user = await api.post('/api/v1/user/login', credentials);
    
    // Persist user session data
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', user.token || '');
    
    console.log('User login successful:', user.email || user.username);
    return user;
  } catch (error) {
    console.error('Error during login:', error);
    
    // Clean up any stale authentication data on failure
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    throw error;
  }
};

/**
 * Registers new user account and establishes session
 * @param name - User's display name
 * @param password - User's password
 * @param email - User's email address
 * @returns Promise with user data and authentication token
 */
export const registerUser = async (name: string, password: string, email: string) => {
  try {
    console.log('Attempting user registration via hybrid architecture...');
    
    const user = await api.post('/api/v1/user/register', {
      name,
      password,
      email
    });
    
    // Persist user session data
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', user.token || '');
    
    console.log('User registration successful:', user.email || user.username);
    return user;
  } catch (error) {
    console.error('Error during registration:', error);
    
    // Clean up any stale authentication data on failure
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    throw error;
  }
};

/**
 * Clears user session and logs out
 * Removes all authentication data from local storage
 */
export const logoutUser = () => {
  try {
    console.log('Logging out user...');
    
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    console.log('User logged out successfully');
  } catch (error) {
    console.error('Error during logout:', error);
    // Force cleanup even if there's an error
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }
};

/**
 * Retrieves current user profile information
 * @returns Promise with current user profile data
 */
export const getUserProfile = async () => {
  try {
    console.log('Fetching user profile via hybrid architecture...');
    
    const profile = await api.get('/api/v1/user/profile');
    
    // Update local storage with fresh profile data
    localStorage.setItem('user', JSON.stringify(profile));
    
    console.log('User profile fetched successfully');
    return profile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    
    // Clear stale data if authentication has expired
    if (error instanceof Error && error.message.includes('401')) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
    
    throw error;
  }
};

/**
 * Updates user profile information
 * @param updates - Partial user data to update
 * @returns Promise with updated user profile
 */
export const updateUserProfile = async (updates: Partial<{ name: string; email: string; username: string }>) => {
  try {
    console.log('Updating user profile via hybrid architecture...');
    
    const updatedUser = await api.put('/api/v1/user/profile', updates);
    
    // Update local storage with fresh profile data
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    console.log('User profile updated successfully');
    return updatedUser;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Changes user password with current password verification
 * @param currentPassword - User's current password for verification
 * @param newPassword - New password to set
 * @returns Promise with operation result
 */
export const changePassword = async (currentPassword: string, newPassword: string) => {
  try {
    console.log('Changing user password via hybrid architecture...');
    
    const result = await api.post('/api/v1/user/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
    
    console.log('Password changed successfully');
    return result;
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
};

/**
 * Verifies current authentication token validity
 * @returns Promise with verification result
 */
export const verifyToken = async () => {
  try {
    console.log('Verifying authentication token...');
    
    const result = await api.get('/api/v1/user/verify');
    
    console.log('Token verification successful');
    return result;
  } catch (error) {
    console.error('Token verification failed:', error);
    
    // Clear invalid authentication data
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    throw error;
  }
};

/**
 * Retrieves current user from local storage
 * @returns User object or null if not found
 */
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    // Clear corrupted user data
    localStorage.removeItem('user');
    return null;
  }
};

/**
 * Checks if user is currently authenticated
 * @returns Boolean indicating authentication status
 */
export const isAuthenticated = () => {
  const user = getCurrentUser();
  const token = localStorage.getItem('token');
  return !!(user && token);
};

// Type definitions for better TypeScript support
export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  created_at?: string;
  updated_at?: string;
  token?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message?: string;
}

export interface ProfileUpdateData {
  name?: string;
  email?: string;
  username?: string;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
}

// Export API information for external validation
export const userApiInfo = {
  description: 'User authentication API - routes to Supabase via backend',
  architecture: 'Hybrid: Auth in Supabase, Data in SQLite',
  endpoints: {
    login: 'POST /api/v1/user/login',
    register: 'POST /api/v1/user/register',
    profile: 'GET/PUT /api/v1/user/profile',
    changePassword: 'POST /api/v1/user/change-password',
    verify: 'GET /api/v1/user/verify'
  }
};