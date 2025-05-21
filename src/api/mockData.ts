// If this file doesn't exist or is incomplete
import type { Task } from './Task';
import type { CalendarEvent } from './Calendar';

// Toggle this to enable mock mode (should be true for GitHub Pages)
export const MOCK_MODE = true;

// Sample mock tasks
export const mockTasks: Task[] = [
  {
    id: 1,
    text: "Complete Wingman project",
    date: new Date().toISOString().split('T')[0],
    time: "14:00",
    completed: false
  },
  {
    id: 2,
    text: "Deploy to GitHub Pages",
    date: new Date().toISOString().split('T')[0],
    time: "16:30",
    completed: false
  },
  {
    id: 3,
    text: "Review documentation",
    date: new Date().toISOString().split('T')[0],
    time: "10:00",
    completed: true
  }
];

// Sample mock events
export const mockEvents: CalendarEvent[] = [
  {
    id: 1,
    title: "Team Meeting",
    date: new Date().toISOString().split('T')[0],
    time: "09:00",
    type: "meeting",
    description: "Weekly progress review"
  },
  {
    id: 2,
    title: "Project Deadline",
    date: new Date().toISOString().split('T')[0],
    time: "17:00",
    type: "reminder",
    description: "Submit final deliverables"
  }
];

// Mock API response with delay
export const mockApiResponse = async <T>(data: T, delay = 500): Promise<T> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(data), delay);
  });
};