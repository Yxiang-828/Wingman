// ✅ HYBRID ARCHITECTURE: Calendar events now handled by SQLite via DataContext
// This file now only provides type definitions and utilities

// ✅ CalendarEvent interface - matches both Supabase schema and SQLite schema
export interface CalendarEvent {
  id: number;
  title: string;        // ✅ Based on schema - calendar_events.title is "text" type
  event_date: string;   // ✅ Based on schema - calendar_events.event_date is "date" type
  event_time: string;   // ✅ Based on schema - calendar_events.event_time is "time" type
  type: string;         // ✅ Based on schema - calendar_events.type is "text" type
  description: string;  // ✅ Based on schema - calendar_events.description is "text" type
  user_id: string;      // ✅ Based on schema - calendar_events.user_id is "uuid" type
}

// ✅ DEPRECATED NOTICE: All data operations moved to DataContext + SQLite
console.warn('📢 MIGRATION NOTICE: Calendar API operations moved to DataContext + SQLite');
console.info('📅 USE INSTEAD: useDataContext() for createEvent, updateEvent, deleteEvent, fetchDayData');

// ✅ LEGACY API FUNCTIONS - DEPRECATED
// These functions now throw errors to guide migration to DataContext

export const fetchEvents = async (date: string): Promise<CalendarEvent[]> => {
  const errorMsg = `🚨 fetchEvents() is DEPRECATED. Use DataContext.fetchDayData() instead.
  
BEFORE: fetchEvents('${date}')
AFTER:  const { fetchDayData } = useDataContext();
        const { events } = await fetchDayData('${date}');`;
        
  console.error(errorMsg);
  throw new Error('fetchEvents() moved to DataContext.fetchDayData() - check console for migration guide');
};

export const addEvent = async (event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> => {
  const errorMsg = `🚨 addEvent() is DEPRECATED. Use DataContext.createEvent() instead.
  
BEFORE: addEvent(eventData)
AFTER:  const { createEvent } = useDataContext();
        const newEvent = await createEvent(eventData);`;
        
  console.error(errorMsg);
  throw new Error('addEvent() moved to DataContext.createEvent() - check console for migration guide');
};

export const updateEvent = async (event: CalendarEvent): Promise<CalendarEvent> => {
  const errorMsg = `🚨 updateEvent() is DEPRECATED. Use DataContext.updateEvent() instead.
  
BEFORE: updateEvent(eventData)
AFTER:  const { updateEvent } = useDataContext();
        const updatedEvent = await updateEvent(eventData);`;
        
  console.error(errorMsg);
  throw new Error('updateEvent() moved to DataContext.updateEvent() - check console for migration guide');
};

export const deleteEvent = async (id: number): Promise<void> => {
  const errorMsg = `🚨 deleteEvent() is DEPRECATED. Use DataContext.deleteEvent() instead.
  
BEFORE: deleteEvent(${id})
AFTER:  const { deleteEvent } = useDataContext();
        await deleteEvent(${id});`;
        
  console.error(errorMsg);
  throw new Error('deleteEvent() moved to DataContext.deleteEvent() - check console for migration guide');
};

export const fetchMultipleDaysData = async (dates: string[]): Promise<Record<string, any>> => {
  const errorMsg = `🚨 fetchMultipleDaysData() is DEPRECATED. Use DataContext.fetchDayData() for each date instead.
  
BEFORE: fetchMultipleDaysData(['2025-06-01', '2025-06-02'])
AFTER:  const { fetchDayData } = useDataContext();
        const promises = dates.map(date => fetchDayData(date));
        const results = await Promise.all(promises);`;
        
  console.error(errorMsg);
  throw new Error('fetchMultipleDaysData() moved to DataContext.fetchDayData() - check console for migration guide');
};

// ✅ UTILITY FUNCTIONS - Still useful for type checking and validation

/**
 * Validate a calendar event object has required fields
 */
export const validateEvent = (event: Partial<CalendarEvent>): event is CalendarEvent => {
  return !!(
    event.id &&
    event.title &&
    event.event_date &&
    event.type &&
    event.user_id
  );
};

/**
 * Create a default event with current date
 */
export const createDefaultEvent = (overrides: Partial<CalendarEvent> = {}): Omit<CalendarEvent, 'id'> => {
  const today = new Date().toISOString().split('T')[0];
  
  return {
    title: '',
    event_date: today,
    event_time: '',
    type: 'Personal',
    description: '',
    user_id: '',
    ...overrides
  };
};

/**
 * Check if an event is today
 */
export const isEventToday = (event: CalendarEvent): boolean => {
  const today = new Date().toISOString().split('T')[0];
  return event.event_date === today;
};

/**
 * Check if an event is in the past
 */
export const isEventPast = (event: CalendarEvent): boolean => {
  const today = new Date().toISOString().split('T')[0];
  const eventDate = new Date(event.event_date);
  const todayDate = new Date(today);
  
  // If it's the same day, check time
  if (event.event_date === today && event.event_time) {
    const now = new Date();
    const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
    return eventDateTime < now;
  }
  
  return eventDate < todayDate;
};

/**
 * Format event time for display
 */
export const formatEventTime = (event: CalendarEvent): string => {
  if (!event.event_time) return 'All day';
  
  try {
    const time = new Date(`2000-01-01T${event.event_time}`);
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return event.event_time;
  }
};

/**
 * Get event duration if end time is available (future enhancement)
 */
export const getEventDuration = (event: CalendarEvent): string => {
  // Placeholder for future enhancement when we add end_time field
  return 'Duration not set';
};

/**
 * Sort events by time for a given day
 */
export const sortEventsByTime = (events: CalendarEvent[]): CalendarEvent[] => {
  return [...events].sort((a, b) => {
    // Events without time go to the end
    if (!a.event_time) return 1;
    if (!b.event_time) return -1;
    
    return a.event_time.localeCompare(b.event_time);
  });
};

/**
 * Group events by date
 */
export const groupEventsByDate = (events: CalendarEvent[]): Record<string, CalendarEvent[]> => {
  return events.reduce((groups, event) => {
    const date = event.event_date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {} as Record<string, CalendarEvent[]>);
};

/**
 * Get events for a specific date range
 */
export const filterEventsByDateRange = (
  events: CalendarEvent[], 
  startDate: string, 
  endDate: string
): CalendarEvent[] => {
  return events.filter(event => {
    const eventDate = event.event_date;
    return eventDate >= startDate && eventDate <= endDate;
  });
};

/**
 * Get event color by type (for UI consistency)
 */
export const getEventTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    'Personal': '#3b82f6',      // Blue
    'Work': '#ef4444',          // Red
    'Meeting': '#f59e0b',       // Orange
    'Reminder': '#10b981',      // Green
    'Social': '#8b5cf6',        // Purple
    'Health': '#06b6d4',        // Cyan
    'Travel': '#f97316',        // Orange
    'Other': '#6b7280'          // Gray
  };
  
  return colorMap[type] || colorMap['Other'];
};

// ✅ MIGRATION HELPER - Show current usage guide
export const showMigrationGuide = () => {
  console.info(`
🔄 CALENDAR API MIGRATION GUIDE

✅ NEW PATTERN (DataContext + SQLite):
import { useDataContext } from '../context/DataContext';

const CalendarComponent = () => {
  const { 
    createEvent, 
    updateEvent, 
    deleteEvent, 
    fetchDayData 
  } = useDataContext();
  
  // Create event
  const newEvent = await createEvent({
    title: 'Team meeting',
    event_date: '2025-06-01',
    event_time: '14:00',
    type: 'Work',
    description: 'Weekly sync'
  });
  
  // Update event
  const updatedEvent = await updateEvent(existingEvent);
  
  // Delete event
  await deleteEvent(eventId);
  
  // Fetch events for a date
  const { events } = await fetchDayData('2025-06-01');
};

❌ OLD PATTERN (Deprecated):
import { fetchEvents, addEvent } from '../api/Calendar';
// These will throw errors now!
`);
};

// ✅ Export type utilities for other files
export type CalendarEventWithoutId = Omit<CalendarEvent, 'id'>;
export type CalendarEventUpdate = Partial<CalendarEvent>;
export type EventValidation = {
  isValid: boolean;
  errors: string[];
};

export type EventType = 'Personal' | 'Work' | 'Meeting' | 'Reminder' | 'Social' | 'Health' | 'Travel' | 'Other';