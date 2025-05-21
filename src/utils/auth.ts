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

// Get current user ID, with fallback for development
export function getCurrentUserId(): UUID {
  const user = getCurrentUser();
  return user?.id || "00000000-0000-0000-0000-000000000000";
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