import { api } from './apiClient';

// ✅ CORRECTED Interface based on your Supabase schema
export interface CalendarEvent {
  id: number;
  title: string;        // ✅ Based on description.txt - calendar_events.title is "text" type
  event_date: string;   // ✅ Based on description.txt - calendar_events.event_date is "date" type
  event_time: string;   // ✅ Based on description.txt - calendar_events.event_time is "time" type
  type: string;         // ✅ Based on description.txt - calendar_events.type is "text" type
  description: string;  // ✅ Based on description.txt - calendar_events.description is "text" type
  user_id: string;      // ✅ Based on description.txt - calendar_events.user_id is "uuid" type
}

// Keep all your existing API functions but ensure field names match Supabase
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
      event_date: event.event_date, // Map event_date to date
      event_time: event.event_time  // Map event_time to time
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
      event_date: event.event_date,
      event_time: event.event_time || '',
      type: event.type,
      description: event.description
    };
    
    // Use api client instead of raw fetch
    const data = await api.post('/v1/calendar', backendEvent);
    
    // Transform backend response to frontend format
    return {
      ...data,
      id: data.id,
      event_date: data.event_date,
      event_time: data.event_time || ''
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
      event_date: rest.event_date,
      event_time: rest.event_time || '',
      type: rest.type,
      description: rest.description
    };
    
    // Use api client instead of raw fetch
    const result = await api.put(`/v1/calendar/${id}`, backendEvent);
    
    // Map backend fields to frontend
    return {
      ...result,
      id: result.id || id,
      event_date: result.event_date,
      event_time: result.event_time || ''
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