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

export const navigateToTaskDetails = (task: Task) => {
  if (navigateInstance) {
    navigateInstance(`/calendar/day?date=${task.date}&highlight=task-${task.id}`);
  }
};

export const navigateToEventDetails = (event: CalendarEvent) => {
  if (navigateInstance) {
    navigateInstance(`/calendar/day?date=${event.date}&highlight=event-${event.id}`);
  }
};