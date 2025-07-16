/**
 * Calendar types and utilities for events
 */

/**
 * Calendar event types
 */
export interface CalendarEvent {
  id: number;
  title: string;
  event_date: string; // (YYYY-MM-DD format)
  event_time: string;
  type: string;
  description: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

// Helper functions for working with calendar events

/**
 * Make sure an event has all the required fields
 */
export const validateEvent = (
  event: Partial<CalendarEvent>,
): event is CalendarEvent => {
  return !!(
    event.id &&
    event.title &&
    event.event_date &&
    event.type &&
    event.user_id
  );
};

/**
 * Create a default event with today's date
 */
export const createDefaultEvent = (
  overrides: Partial<CalendarEvent> = {},
): Omit<CalendarEvent, "id"> => {
  const today = new Date().toISOString().split("T")[0];

  return {
    title: "",
    event_date: today,
    event_time: "",
    type: "Personal",
    description: "",
    user_id: "",
    ...overrides,
  };
};

/**
 * Check if an event is happening today
 */
export const isEventToday = (event: CalendarEvent): boolean => {
  const today = new Date().toISOString().split("T")[0];
  return event.event_date === today;
};

/**
 * Check if an event already happened
 */
export const isEventPast = (event: CalendarEvent): boolean => {
  const today = new Date().toISOString().split("T")[0];
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
  if (!event.event_time) return "All day";

  // Return the time in standardized HH:MM format
  if (/^\d{2}:\d{2}$/.test(event.event_time)) {
    return event.event_time;
  }

  try {
    const time = new Date(`2000-01-01T${event.event_time}`);
    const hours = String(time.getHours()).padStart(2, "0");
    const minutes = String(time.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch {
    return event.event_time;
  }
};

/**
 * Get event duration if end time is available
 */
export const getEventDuration = (_event: CalendarEvent): string => {
  return "";
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
export const groupEventsByDate = (
  events: CalendarEvent[],
): Record<string, CalendarEvent[]> => {
  return events.reduce(
    (groups, event) => {
      const date = event.event_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
      return groups;
    },
    {} as Record<string, CalendarEvent[]>,
  );
};

/**
 * Get events for a specific date range
 */
export const filterEventsByDateRange = (
  events: CalendarEvent[],
  startDate: string,
  endDate: string,
): CalendarEvent[] => {
  return events.filter((event) => {
    const eventDate = event.event_date;
    return eventDate >= startDate && eventDate <= endDate;
  });
};

/**
 * colour mapping for event types (NOTE: some types may not be used, just listing here in case need to use)
 */
export const getEventTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    Personal: "#3b82f6", // Blue
    Work: "#ef4444", // Red
    Meeting: "#f59e0b", // Orange
    Reminder: "#10b981", // Green
    Social: "#8b5cf6", // Purple
    Health: "#06b6d4", // Cyan
    Travel: "#f97316", // Orange
    Other: "#6b7280", // Gray
  };

  return colorMap[type] || colorMap["Other"];
};

// Export type utilities for other files
export type CalendarEventWithoutId = Omit<CalendarEvent, "id">;
export type CalendarEventUpdate = Partial<CalendarEvent>;
export type EventValidation = {
  isValid: boolean;
  errors: string[];
};

export type EventType =
  | "Personal"
  | "Work"
  | "Meeting"
  | "Reminder"
  | "Social"
  | "Health"
  | "Travel"
  | "Other";
// some types may not be used in the future, but included for consistency
