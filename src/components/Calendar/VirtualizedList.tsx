import React from 'react';
import { FixedSizeList } from 'react-window';
import type { Task } from '../../api/Task';
import type { CalendarEvent } from '../../api/Calendar';

// Virtualized Event List Component
export const VirtualizedEventList: React.FC<{
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDeleteEvent: (event: CalendarEvent) => void;
  height?: number;
}> = React.memo(({ events, onEventClick, onDeleteEvent, height = 150 }) => {
  if (events.length === 0) {
    return <div className="week-day-empty">No events</div>;
  }

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const event = events[index];
    return (
      <div
        style={style}
        className={`week-event-item ${event.type.toLowerCase()}`}
        onClick={() => onEventClick(event)}
      >
        <div className="week-event-time">
          {event.time || "All day"}
        </div>
        <div className="week-event-title">
          {event.title}
        </div>
        <button
          className="week-item-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteEvent(event);
          }}
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <FixedSizeList
      height={Math.min(height, events.length * 40 + 10)}
      width="100%"
      itemCount={events.length}
      itemSize={40}
      overscanCount={3}
    >
      {Row}
    </FixedSizeList>
  );
});

// Virtualized Task List Component
export const VirtualizedTaskList: React.FC<{
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCompleteTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  height?: number;
}> = React.memo(({ tasks, onTaskClick, onCompleteTask, onDeleteTask, height = 150 }) => {
  if (tasks.length === 0) {
    return <div className="week-day-empty">No tasks</div>;
  }

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const task = tasks[index];
    return (
      <div
        style={style}
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
        <div className="week-task-text">{task.text}</div>
        {task.time && (
          <div className="week-task-time">{task.time}</div>
        )}
        <button
          className="week-item-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteTask(task);
          }}
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <FixedSizeList
      height={Math.min(height, tasks.length * 40 + 10)}
      width="100%"
      itemCount={tasks.length}
      itemSize={40}
      overscanCount={3}
    >
      {Row}
    </FixedSizeList>
  );
});