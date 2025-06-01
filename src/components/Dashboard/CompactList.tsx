import React, { useState, useCallback, useMemo } from "react";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import "./CompactList.css";

/**
 * Helper function for smart title truncation
 * Your Wingman ensures text fits perfectly in compact spaces
 */
const truncateTitle = (title: string, maxWords: number = 8): string => {
  if (!title) return "";
  const words = title.split(/\s+/);
  if (words.length <= maxWords) return title;
  return words.slice(0, maxWords).join(" ") + "...";
};

interface CompactTaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
  maxDisplay?: number;
}

/**
 * CompactTaskList Component - Your Wingman's Efficient Task Display
 * Optimized for space-constrained contexts with smart loading
 * Maintains full dashboard functionality in compact form
 */
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

  /**
   * Handles task completion with event propagation control
   * Your Wingman prevents accidental clicks on parent elements
   */
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
        <div className="compact-empty-icon">📋</div>
        <p className="compact-empty-text">No pending missions, boss</p>
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
            Show {remainingCount} more missions
          </button>
        </div>
      )}
    </div>
  );
};

interface CompactEventListProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  maxDisplay?: number;
}

/**
 * CompactEventList Component - Your Wingman's Schedule Overview
 * Displays events efficiently with type indicators and smart pagination
 * Maintains visual consistency with task display patterns
 */
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

  /**
   * Maps event types to appropriate visual indicators
   * Your Wingman understands different event contexts
   */
  const getEventIcon = (type: string) => {
    const icons = {
      meeting: "👥",
      personal: "🏠",
      reminder: "⏰",
      work: "💼",
    };
    return icons[type as keyof typeof icons] || "📅";
  };

  if (events.length === 0) {
    return (
      <div className="compact-empty-state">
        <div className="compact-empty-icon">📅</div>
        <p className="compact-empty-text">No events scheduled, boss</p>
      </div>
    );
  }

  return (
    <div className="compact-list-container">
      <div className="compact-event-list">
        {visibleEvents.map((event) => (
          <div
            key={event.id}
            className={`compact-event-item event-type-${
              event.type?.toLowerCase() || "default"
            }`}
            onClick={() => onEventClick(event)}
          >
            <div className="compact-event-row">
              <div className="compact-event-type-indicator">
                {getEventIcon(event.type)}
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

interface CompactListProps {
  tasks?: Task[];
  events?: CalendarEvent[];
  type: "tasks" | "events";
  onItemClick?: (item: Task | CalendarEvent) => void;
}

/**
 * CompactList Component - Your Wingman's Condensed View
 * Space-efficient display for tasks and events in limited contexts
 * Perfect for sidebar or modal displays where space is precious
 */
const CompactList: React.FC<CompactListProps> = ({
  tasks = [],
  events = [],
  type,
  onItemClick,
}) => {
  const items = type === "tasks" ? tasks : events;

  /**
   * Handles item click with proper type casting
   * Your Wingman ensures smooth navigation between different views
   */
  const handleItemClick = (item: Task | CalendarEvent) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  if (items.length === 0) {
    return (
      <div className="compact-list-container">
        <div className="compact-empty">
          <p>
            {type === "tasks"
              ? "No missions to display, boss"
              : "No events to show, boss"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="compact-list-container">
      {type === "tasks" ? (
        <div className="compact-task-list">
          {(items as Task[]).map((task) => (
            <div
              key={task.id}
              className="compact-task-item"
              onClick={() => handleItemClick(task)}
            >
              <div className="compact-status">{task.completed ? "✓" : "○"}</div>
              <div className="compact-content">
                <div className="compact-title">{task.title}</div>
                {task.task_time && (
                  <div className="compact-meta">{task.task_time}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="compact-event-list">
          {(items as CalendarEvent[]).map((event) => (
            <div
              key={event.id}
              className="compact-event-item"
              onClick={() => handleItemClick(event)}
            >
              <div className="compact-content">
                <div className="compact-title">{event.title}</div>
                <div className="compact-meta">
                  {event.event_time && <span>{event.event_time}</span>}
                  {event.type && <span> • {event.type}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompactList;
