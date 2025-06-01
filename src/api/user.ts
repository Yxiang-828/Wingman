import { api } from './apiClient';
import type { UserLogin } from '../types/user';

// ✅ HYBRID ARCHITECTURE: User operations remain in Supabase via apiClient
console.info('🔐 User API: Authentication operations route to Supabase via backend');

/**
 * ✅ LOGIN USER - Routes through apiClient to backend to Supabase
 */
export const loginUser = async (credentials: UserLogin) => {
  try {
    console.log('🔐 Attempting user login via hybrid architecture...');
    
    // ✅ Use centralized apiClient for proper routing and error handling
    const user = await api.post('/api/v1/user/login', credentials);
    
    // Update localStorage with current user info
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', user.token || ''); // Store auth token if provided
    
    console.log('✅ User login successful:', user.email || user.username);
    return user;
  } catch (error) {
    console.error('❌ Error during login:', error);
    
    // Clear any stale auth data on login failure
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    throw error;
  }
};

/**
 * ✅ REGISTER USER - Routes through apiClient to backend to Supabase
 */
export const registerUser = async (name: string, password: string, email: string) => {
  try {
    console.log('🔐 Attempting user registration via hybrid architecture...');
    
    // ✅ Use centralized apiClient for proper routing and error handling
    const user = await api.post('/api/v1/user/register', {
      name,
      password,
      email
    });
    
    // Update localStorage with current user info
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', user.token || ''); // Store auth token if provided
    
    console.log('✅ User registration successful:', user.email || user.username);
    return user;
  } catch (error) {
    console.error('❌ Error during registration:', error);
    
    // Clear any stale auth data on registration failure
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    throw error;
  }
};

/**
 * ✅ LOGOUT USER - Clear local auth data
 */
export const logoutUser = () => {
  try {
    console.log('🔐 Logging out user...');
    
    // Clear user data from localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    console.log('✅ User logged out successfully');
  } catch (error) {
    console.error('❌ Error during logout:', error);
    // Still try to clear data even if there's an error
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }
};

/**
 * ✅ GET USER PROFILE - Routes through apiClient to backend to Supabase
 */
export const getUserProfile = async () => {
  try {
    console.log('🔐 Fetching user profile via hybrid architecture...');
    
    // ✅ Use centralized apiClient for proper routing and auth token handling
    const profile = await api.get('/api/v1/user/profile');
    
    // Update localStorage with fresh user info
    localStorage.setItem('user', JSON.stringify(profile));
    
    console.log('✅ User profile fetched successfully');
    return profile;
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    
    // If profile fetch fails due to auth, clear stale data
    if (error instanceof Error && error.message.includes('401')) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
    
    throw error;
  }
};

/**
 * ✅ UPDATE USER PROFILE - Routes through apiClient to backend to Supabase
 */
export const updateUserProfile = async (updates: Partial<{ name: string; email: string; username: string }>) => {
  try {
    console.log('🔐 Updating user profile via hybrid architecture...');
    
    // ✅ Use centralized apiClient for proper routing and auth token handling
    const updatedUser = await api.put('/api/v1/user/profile', updates);
    
    // Update localStorage with fresh user info
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    console.log('✅ User profile updated successfully');
    return updatedUser;
  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    throw error;
  }
};

/**
 * ✅ CHANGE PASSWORD - Routes through apiClient to backend to Supabase
 */
export const changePassword = async (currentPassword: string, newPassword: string) => {
  try {
    console.log('🔐 Changing user password via hybrid architecture...');
    
    // ✅ Use centralized apiClient for proper routing and auth token handling
    const result = await api.post('/api/v1/user/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
    
    console.log('✅ Password changed successfully');
    return result;
  } catch (error) {
    console.error('❌ Error changing password:', error);
    throw error;
  }
};

/**
 * ✅ VERIFY TOKEN - Check if current token is still valid
 */
export const verifyToken = async () => {
  try {
    console.log('🔐 Verifying auth token...');
    
    // ✅ Use centralized apiClient for proper routing and auth token handling
    const result = await api.get('/api/v1/user/verify');
    
    console.log('✅ Token verification successful');
    return result;
  } catch (error) {
    console.error('❌ Token verification failed:', error);
    
    // Clear invalid token
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    throw error;
  }
};

/**
 * ✅ HELPER: Get current user from localStorage
 */
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('❌ Error parsing user from localStorage:', error);
    // Clear corrupted user data
    localStorage.removeItem('user');
    return null;
  }
};

/**
 * ✅ HELPER: Check if user is authenticated
 */
export const isAuthenticated = () => {
  const user = getCurrentUser();
  const token = localStorage.getItem('token');
  return !!(user && token);
};

/**
 * ✅ MIGRATION HELPER - Show hybrid architecture status
 */
export const showAuthArchitecture = () => {
  console.info(`
🏗️ HYBRID AUTHENTICATION ARCHITECTURE

✅ AUTHENTICATION FLOW:
user.ts → apiClient.ts → backend → Supabase

✅ BENEFITS:
- Centralized error handling and retry logic
- Proper URL resolution and backend startup handling  
- Authentication token management via apiClient
- Consistent routing validation

✅ ENDPOINTS (All route to Supabase):
- POST /api/v1/user/login
- POST /api/v1/user/register  
- GET  /api/v1/user/profile
- PUT  /api/v1/user/profile
- POST /api/v1/user/change-password
- GET  /api/v1/user/verify

✅ LOCAL STORAGE:
- 'user': User profile data
- 'token': Authentication token

✅ DATA SEPARATION:
- Auth data: Supabase (cloud)
- App data: SQLite (local)
`);
};

// ✅ TYPE DEFINITIONS for better TypeScript support
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

// ✅ Export for external usage validation
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