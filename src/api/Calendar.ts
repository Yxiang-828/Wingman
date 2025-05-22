import { API_BASE_URL } from '../config/api';

// Make sure CalendarEvent interface is properly exported
export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  date: string;
  start_time: string;
  end_time: string;
  location?: string;
  color?: string;
  user_id: string;
}

// Update to use API_BASE_URL
export const fetchEvents = async (date: string): Promise<CalendarEvent[]> => {
  try {
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.id) {
      console.error('No user ID found for event fetch');
      return [];
    }
    
    console.log("Fetching events for date:", date);
    const response = await fetch(`${API_BASE_URL}/calendar?date=${date}&user_id=${user.id}`);
    
    if (!response.ok) {
      console.error(`Error fetching events: ${response.status} ${response.statusText}`);
      return [];
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
};

export const addEvent = async (event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> => {
  try {
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.id) {
      throw new Error('You must be logged in to create events');
    }
    
    console.log("Adding event with user ID:", user.id);
    
    // Ensure date is properly formatted and user_id is included
    const formattedEvent = {
      ...event,
      user_id: user.id,
      date: typeof event.date === 'object' ? event.date.toISOString().split('T')[0] : event.date
    };
    
    const response = await fetch(`${API_BASE_URL}/calendar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedEvent),
    });
    
    if (response.status === 404 && response.statusText.includes("User")) {
      // Special handling for user not found - suggest logging in again
      alert("Your user session is invalid. Please log out and log in again.");
      
      // Auto-redirect to login
      window.location.href = '/login';
      throw new Error('User session expired. Please log in again.');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Server error response:", errorText);
      throw new Error(`Failed to add event: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding event:', error);
    throw error;
  }
};

export const updateEvent = async (event: CalendarEvent): Promise<CalendarEvent> => {
  try {
    console.log("API: Updating event:", event);
    
    // Create a copy and remove the id field to prevent Supabase identity column error
    const { id, ...eventData } = event;
    
    // Make sure we're including the user ID
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      eventData.user_id = user.id;
    }
    
    const response = await fetch(`${API_BASE_URL}/calendar/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Server error response:", errorText);
      throw new Error(`Failed to update event: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Handle the special case where we got a success message but not the full event
    if (result.message && !result.title) {
      // Return the original event with any updates applied
      return { ...event, ...result };
    }
    
    return result;
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

export const deleteEvent = async (id: number): Promise<void> => {
  try {
    console.log("API: Deleting event:", id);
    const response = await fetch(`${API_BASE_URL}/calendar/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Server error response:", errorText);
      throw new Error(`Failed to delete event: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};