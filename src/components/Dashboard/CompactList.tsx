import React, { useState, useCallback, useMemo } from "react";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import "./CompactList.css";

// Helper: Truncate titles
const truncateTitle = (title: string, maxWords: number = 8): string => {
  if (!title) return "";
  const words = title.split(/\s+/);
  if (words.length <= maxWords) return title;
  return words.slice(0, maxWords).join(" ") + "...";
};

// COMPACT TASK LIST
interface CompactTaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
  maxDisplay?: number;
}

export const CompactTaskList: React.FC<CompactTaskListProps> = ({
  tasks,
  onTaskClick,
  onCompleteTask,
  maxDisplay = 10,
}) => {
  const [displayCount, setDisplayCount] = useState(maxDisplay);
  const visibleTasks = useMemo(
    () => tasks.slice(0, displayCount),
    [tasks, displayCount]
  );
  const remainingCount = Math.max(0, tasks.length - displayCount);

  const handleStatusClick = useCallback(
    (e: React.MouseEvent, task: Task) => {
      e.stopPropagation();
      onCompleteTask(task);
    },
    [onCompleteTask]
  );

  const handleLoadMore = useCallback(() => {
    setDisplayCount((prev) => Math.min(prev + 5, tasks.length));
  }, [tasks.length]);

  if (tasks.length === 0) {
    return (
      <div className="compact-empty-state">
        <div className="compact-empty-icon">📝</div>
        <p className="compact-empty-text">No tasks for today</p>
      </div>
    );
  }

  return (
    <div className="compact-list-container">
      <div className="compact-task-list">
        {visibleTasks.map((task) => (
          <div
            key={task.id}
            className={`compact-task-item ${task.completed ? "completed" : ""}`}
            onClick={() => onTaskClick(task)}
          >
            <div className="compact-task-row">
              <div
                className="compact-task-status"
                onClick={(e) => handleStatusClick(e, task)}
              >
                {task.completed ? "✓" : "○"}
              </div>

              <div className="compact-task-content">
                <div className="compact-task-title">
                  {truncateTitle(task.title)}
                </div>
                <div className="compact-task-meta">
                  {task.task_time && (
                    <span className="compact-task-time">{task.task_time}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {remainingCount > 0 && (
        <div className="compact-load-more">
          <button className="load-more-btn" onClick={handleLoadMore}>
            Show {remainingCount} more tasks
          </button>
        </div>
      )}
    </div>
  );
};

// COMPACT EVENT LIST
interface CompactEventListProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  maxDisplay?: number;
}

export const CompactEventList: React.FC<CompactEventListProps> = ({
  events,
  onEventClick,
  maxDisplay = 10,
}) => {
  const [displayCount, setDisplayCount] = useState(maxDisplay);
  const visibleEvents = useMemo(
    () => events.slice(0, displayCount),
    [events, displayCount]
  );
  const remainingCount = Math.max(0, events.length - displayCount);

  const handleLoadMore = useCallback(() => {
    setDisplayCount((prev) => Math.min(prev + 5, events.length));
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="compact-empty-state">
        <div className="compact-empty-icon">📅</div>
        <p className="compact-empty-text">No events for today</p>
      </div>
    );
  }

  return (
    <div className="compact-list-container">
      <div className="compact-event-list">
        {visibleEvents.map((event) => (
          <div
            key={event.id}
            className={`compact-event-item event-type-${event.type.toLowerCase()}`}
            onClick={() => onEventClick(event)}
          >
            <div className="compact-event-row">
              <div className="compact-event-type-indicator">
                {event.type === "meeting" && "👥"}
                {event.type === "personal" && "🏠"}
                {event.type === "reminder" && "⏰"}
                {event.type === "work" && "💼"}
              </div>

              <div className="compact-event-content">
                <div className="compact-event-title">
                  {truncateTitle(event.title)}
                </div>
                <div className="compact-event-meta">
                  {event.event_time && (
                    <span className="compact-event-time">
                      {event.event_time}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {remainingCount > 0 && (
        <div className="compact-load-more">
          <button className="load-more-btn" onClick={handleLoadMore}>
            Show {remainingCount} more events
          </button>
        </div>
      )}
    </div>
  );
};
