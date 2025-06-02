import React from "react";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import "./VirtualizedList.css";

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
  onDeleteEvent?: (event: CalendarEvent) => void;
}> = React.memo(({ events, onEventClick }) => {
  return (
    <ScrollableContainer>
      {events.map((event) => (
        <div
          key={event.id}
          className={`week-event-item ${event.type?.toLowerCase() || ''}`}
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

// ✅ FIXED: Virtualized Task List Component with proper onCompleteTask handling
export const VirtualizedTaskList: React.FC<{
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
}> = React.memo(({ tasks, onTaskClick, onCompleteTask }) => {
  
  // ✅ FIXED: Handle task completion with proper error handling
  const handleTaskComplete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    
    // ✅ VALIDATION: Check if onCompleteTask is actually a function
    if (typeof onCompleteTask !== 'function') {
      console.error('❌ VirtualizedTaskList: onCompleteTask is not a function', typeof onCompleteTask);
      return;
    }
    
    try {
      onCompleteTask(task);
    } catch (error) {
      console.error('❌ VirtualizedTaskList: Error in onCompleteTask:', error);
    }
  };

  return (
    <ScrollableContainer>
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`week-task-item ${task.completed ? "completed" : ""}`}
          onClick={() => onTaskClick(task)}
        >
          <div
            className="task-status"
            onClick={(e) => handleTaskComplete(e, task)}
            title={task.completed ? "Mark as incomplete" : "Mark as completed"}
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

VirtualizedTaskList.displayName = "VirtualizedTaskList";
VirtualizedEventList.displayName = "VirtualizedEventList";
