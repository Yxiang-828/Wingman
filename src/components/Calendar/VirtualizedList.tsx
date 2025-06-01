import React from "react";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import "./WeekView.css";

// Helper function to truncate titles to max 10 words
const truncateTitle = (title: string, maxWords: number = 10): string => {
  if (!title) return "";

  const words = title.split(/\s+/);
  if (words.length <= maxWords) return title;

  return words.slice(0, maxWords).join(" ") + "...";
};

// ✅ FIXED: Add scrollable wrapper for virtualized lists
const ScrollableContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="virtualized-scroll-container">
    {children}
  </div>
);

// Virtualized Event List Component
export const VirtualizedEventList: React.FC<{
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDeleteEvent: (event: CalendarEvent) => void;
}> = React.memo(({ events, onEventClick }) => {
  return (
    <ScrollableContainer>
      {events.map((event) => (
        <div
          key={event.id}
          className={`week-event-item ${event.type.toLowerCase()}`}
          onClick={() => onEventClick(event)}
        >
          {event.event_time && <div className="week-event-time">{event.event_time}</div>}
          <div className="week-event-title" title={event.title}>
            {truncateTitle(event.title)}
          </div>
        </div>
      ))}
    </ScrollableContainer>
  );
});

// Virtualized Task List Component
export const VirtualizedTaskList: React.FC<{
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}> = React.memo(({ tasks, onTaskClick, onCompleteTask }) => {
  return (
    <ScrollableContainer>
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`week-task-item ${task.completed ? "completed" : ""}`}
          onClick={() => onTaskClick(task)}
        >
          <div
            className="week-task-status"
            onClick={(e) => {
              e.stopPropagation();
              onCompleteTask(task);
            }}
          >
            {task.completed ? "✓" : "○"}
          </div>
          <div className="week-task-text" title={task.title}>
            {truncateTitle(task.title)}
          </div>
          {task.task_time && <div className="week-task-time">{task.task_time}</div>}
        </div>
      ))}
    </ScrollableContainer>
  );
});
