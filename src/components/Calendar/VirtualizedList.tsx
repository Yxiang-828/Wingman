import React from "react";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import "./VirtualizedList.css";

/**
 * Utility function to truncate long titles for better UI readability
 * Prevents layout issues with excessively long task or event names
 */
const truncateTitle = (title: string, maxWords: number = 10): string => {
  if (!title) return "";

  const words = title.split(/\s+/);
  if (words.length <= maxWords) return title;

  return words.slice(0, maxWords).join(" ") + "...";
};

/**
 * Reusable scrollable container component
 * Provides consistent scrolling behavior across all virtualized lists
 * Includes performance optimizations for smooth scrolling
 */
const ScrollableContainer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div className="virtualized-scroll-container">{children}</div>;

/**
 * VirtualizedEventList Component
 * High-performance event list with optimized rendering
 * Handles click interactions and displays event metadata
 */
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
          className={`week-event-item ${event.type?.toLowerCase() || ""}`}
          onClick={() => onEventClick(event)}
          role="button"
          tabIndex={0}
          aria-label={`Event: ${event.title} at ${
            event.event_time || "no time set"
          }`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onEventClick(event);
            }
          }}
        >
          {event.event_time && (
            <div className="week-event-time" aria-label="Event time">
              {event.event_time}
            </div>
          )}
          <div className="week-event-title" title={event.title}>
            {truncateTitle(event.title)}
          </div>
        </div>
      ))}
    </ScrollableContainer>
  );
});

/**
 * VirtualizedTaskList Component
 * High-performance task list with completion state management
 * Includes error handling for task completion operations
 */
export const VirtualizedTaskList: React.FC<{
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
}> = React.memo(({ tasks, onTaskClick, onCompleteTask }) => {
  /**
   * Handles task completion with comprehensive error handling
   * Validates function availability and prevents event bubbling
   */
  const handleTaskComplete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();

    // Validate callback function existence
    if (typeof onCompleteTask !== "function") {
      console.error(
        "VirtualizedTaskList: onCompleteTask is not a function",
        typeof onCompleteTask
      );
      return;
    }

    try {
      onCompleteTask(task);
    } catch (error) {
      console.error("VirtualizedTaskList: Error in onCompleteTask:", error);
    }
  };

  return (
    <ScrollableContainer>
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`week-task-item ${task.completed ? "completed" : ""}`}
          onClick={() => onTaskClick(task)}
          role="button"
          tabIndex={0}
          aria-label={`Task: ${task.title}${
            task.completed ? " (completed)" : ""
          }`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onTaskClick(task);
            }
          }}
        >
          <div
            className="task-status"
            onClick={(e) => handleTaskComplete(e, task)}
            title={task.completed ? "Mark as incomplete" : "Mark as completed"}
            role="checkbox"
            aria-checked={task.completed}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleTaskComplete(e, task);
              }
            }}
          >
            {task.completed ? "✓" : "○"}
          </div>
          <div className="week-task-text" title={task.title}>
            {truncateTitle(task.title)}
          </div>
          {task.task_time && (
            <div className="week-task-time" aria-label="Task time">
              {task.task_time}
            </div>
          )}
        </div>
      ))}
    </ScrollableContainer>
  );
});

VirtualizedTaskList.displayName = "VirtualizedTaskList";
VirtualizedEventList.displayName = "VirtualizedEventList";
