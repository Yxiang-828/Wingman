import type { UUID } from '../types/database';

// Get the current authenticated user
export function getCurrentUser(): { id: UUID; name: string; email: string } | null {
  const userData = localStorage.getItem('user');
  if (!userData) return null;
  
  try {
    return JSON.parse(userData);
  } catch (e) {
    console.error('Failed to parse user data from localStorage');
    return null;
  }
}

// Get current user ID, with NO fallback
export function getCurrentUserId(): UUID {
  const user = getCurrentUser();
  if (!user?.id) {
    // Redirect to login if no user ID
    window.location.href = '/login';
    throw new Error('User not authenticated');
  }
  return user.id;
}

// Check if data belongs to current user
export function isCurrentUserData(data: { user_id: UUID }): boolean {
  const currentUserId = getCurrentUserId();
  return data.user_id === currentUserId;
}

// Filter array to only include current user's data
export function filterToCurrentUser<T extends { user_id: UUID }>(items: T[]): T[] {
  const currentUserId = getCurrentUserId();
  return items.filter(item => item.user_id === currentUserId);
}