import type { NavigateFunction } from "react-router-dom";
import type { Task } from "../api/Task";
import type { CalendarEvent } from "../api/Calendar";

let navigateInstance: NavigateFunction | null = null;

export const registerNavigate = (navigate: NavigateFunction) => {
  navigateInstance = navigate;
};

export const navigateToDayView = (date: string) => {
  if (navigateInstance) {
    navigateInstance(`/calendar/day?date=${date}`);
  }
};

// ✅ FIXED: Use correct field names
export const navigateToTask = (task: Task) => {
  if (!navigateInstance) return;
  navigateInstance(`/calendar/day?date=${task.task_date}&highlight=task-${task.id}`);
};

export const navigateToEvent = (event: CalendarEvent) => {
  if (!navigateInstance) return;
  navigateInstance(`/calendar/day?date=${event.event_date}&highlight=event-${event.id}`);
};