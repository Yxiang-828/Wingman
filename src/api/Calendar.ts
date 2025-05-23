// Update the export to ensure TypeScript properly recognizes it
export interface CalendarEvent {
  id: number;
  title: string;
  date: string;       // Frontend field
  event_date?: string; // DB field
  time: string;       // Frontend field
  event_time?: string; // DB field
  type: string;
  description: string;
  user_id?: string | number;
}

// Keep your existing API functions below
export const fetchEvents = async (date: string): Promise<CalendarEvent[]> => {
  try {
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.id) {
      console.error('No user ID found for event fetch');
      return [];
    }
    
    console.log("Fetching events for date:", date);
    const response = await fetch(`/api/v1/calendar?date=${date}&user_id=${user.id}`);
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

// Ensure we're transforming fields correctly both ways
export const addEvent = async (event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> => {
  try {
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.id) {
      throw new Error('You must be logged in to create events');
    }
    
    console.log("Adding event with user ID:", user.id);
    
    // Transform frontend fields to backend fields
    const backendEvent = {
      user_id: user.id,
      title: event.title,
      event_date: event.date,         // Map date to event_date
      event_time: event.time || '',   // Map time to event_time 
      type: event.type,
      description: event.description
    };
    
    const response = await fetch('/api/v1/calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendEvent),
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
    
    // Handle response...
    const data = await response.json();
    
    // Transform backend response to frontend format
    return {
      id: data.id,
      title: data.title,
      date: data.event_date,        // Map event_date to date
      time: data.event_time || '',  // Map event_time to time 
      type: data.type,
      description: data.description
    };
  } catch (error) {
    console.error('Error adding event:', error);
    throw error;
  }
};

export const updateEvent = async (event: CalendarEvent): Promise<CalendarEvent> => {
  try {
    console.log("API: Updating event:", event);
    
    // Create a copy and remove the id field to prevent Supabase identity column error
    const { id, ...rest } = event;
    // Update the type to match our modified interface
    const eventData: Omit<CalendarEvent, 'id'> & { user_id?: string | number } = { ...rest };
    
    // Make sure we're including the user ID
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      eventData.user_id = user.id;
    }
    
    const response = await fetch(`/api/v1/calendar/${id}`, {
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
    const response = await fetch(`/api/v1/calendar/${id}`, {
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