// Make sure CalendarEvent interface is properly exported
export interface CalendarEvent {
  id: number;
  title: string;
  date: string;       // Frontend field
  event_date?: string; // DB field
  time: string;       // Frontend field
  event_time?: string; // DB field
  type: string;
  description: string;
}

// Rest of your API functions
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

export const addEvent = async (event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> => {
  try {
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!user.id) {
      throw new Error('No user ID found for event creation');
    }
    
    console.log("Adding event:", event);
    
    // Ensure date is properly formatted and user_id is included
    const formattedEvent = {
      ...event,
      user_id: user.id,
      date: typeof event.date === 'object' ? event.date.toISOString().split('T')[0] : event.date
    };
    
    const response = await fetch('/api/v1/calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedEvent),
    });
    
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

export const deleteEvent = async (id: number): Promise<void> => {
  try {
    const response = await fetch(`/api/v1/calendar/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete event');
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

// Make sure this function exists and is properly exported
export const updateEvent = async (event: CalendarEvent): Promise<CalendarEvent> => {
  try {
    const response = await fetch(`/api/v1/calendar/${event.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update event');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};