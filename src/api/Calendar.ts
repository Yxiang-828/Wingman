import { api } from './apiClient';

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
      throw new Error('User not authenticated');
    }
    
    // Use api client instead of raw fetch
    const events = await api.get(`/v1/calendar?date=${date}&user_id=${user.id}`);
    
    // Map backend fields to frontend
    return events.map((event: any) => ({
      ...event,
      date: event.event_date, // Map event_date to date
      time: event.event_time  // Map event_time to time
    }));
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
      throw new Error('User not authenticated');
    }
    
    // Transform frontend fields to backend fields
    const backendEvent = {
      user_id: user.id,
      title: event.title,
      event_date: event.date,
      event_time: event.time || '',
      type: event.type,
      description: event.description
    };
    
    // Use api client instead of raw fetch
    const data = await api.post('/v1/calendar', backendEvent);
    
    // Transform backend response to frontend format
    return {
      ...data,
      id: data.id,
      date: data.event_date,
      time: data.event_time || ''
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
    
    // Map frontend fields to backend fields
    const backendEvent: Record<string, any> = {
      user_id: event.user_id || JSON.parse(localStorage.getItem('user') || '{}').id,
      title: rest.title,
      event_date: rest.date,
      event_time: rest.time || '',
      type: rest.type,
      description: rest.description
    };
    
    // Use api client instead of raw fetch
    const result = await api.put(`/v1/calendar/${id}`, backendEvent);
    
    // Map backend fields to frontend
    return {
      ...result,
      id: result.id || id,
      date: result.event_date,
      time: result.event_time || ''
    };
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

export const deleteEvent = async (id: number): Promise<void> => {
  try {
    console.log("API: Deleting event:", id);
    // Use api client instead of raw fetch
    await api.delete(`/v1/calendar/${id}`);
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};