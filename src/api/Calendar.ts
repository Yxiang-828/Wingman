// Make sure CalendarEvent interface is properly exported
export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  type: string;
  description: string; // Change from optional to required
}

// Rest of your API functions
export const fetchEvents = async (date: string): Promise<CalendarEvent[]> => {
  try {
    console.log("Fetching events for date:", date);
    const response = await fetch(`/api/v1/calendar?date=${date}`);
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
    // Ensure description is set to empty string if not provided
    const eventWithDescription = {
      ...event,
      description: event.description || ""
    };
    
    const response = await fetch('/api/v1/calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventWithDescription),
    });
    
    if (!response.ok) {
      throw new Error('Failed to add event');
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