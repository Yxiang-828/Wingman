import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { format, addDays, parseISO, startOfWeek, isToday } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import DetailPopup from "../Common/DetailPopup";
import TimeInput from "../Common/TimeInput";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import "./Calendar.css";

// Helper function for date formatting
function formatDateForAPI(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

// Get the week number in semester
function getNthWeekOfSemester(weekStart: Date, semesterStart: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(
    (weekStart.getTime() - semesterStart.getTime()) / msPerDay
  );
  return Math.floor(diffDays / 7) + 1;
}

// Quick Action Types
type QuickActionType = "task" | "event" | null;

type QuickActionState = {
  visible: boolean;
  type: QuickActionType;
  position: { x: number; y: number };
  date: string;
};

type FormState = {
  task: {
    text: string;
    time: string;
  };
  event: {
    title: string;
    time: string;
    type: string;
    description: string;
  };
};

const WeekView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Access DataContext for data operations
  const {
    fetchTasksByDate,
    fetchEventsByDate,
    toggleTask,
    addNewTask,
    addNewEvent,
    deleteExistingTask,
    deleteExistingEvent,
    loading: isLoading,
    error,
    taskCache,
    eventCache,
  } = useData();

  // Access NotificationsContext for popup functionality
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();

  // Local state for week view
  const [weekStartDate, setWeekStartDate] = useState<Date>(() => {
    const today = new Date();
    // Get Sunday of current week
    return startOfWeek(today, { weekStartsOn: 0 });
  });

  // Quick action state for adding tasks/events
  const [quickAction, setQuickAction] = useState<QuickActionState>({
    visible: false,
    type: null,
    position: { x: 0, y: 0 },
    date: "",
  });

  // Form state for quick actions
  const [quickForm, setQuickForm] = useState<FormState>({
    task: { text: "", time: "" },
    event: { title: "", time: "", type: "personal", description: "" },
  });

  // Weekly data state with tasks and events for each day
  const [weeklyData, setWeeklyData] = useState<
    Record<string, { tasks: Task[]; events: CalendarEvent[] }>
  >({});

  // Generate the 7 days of the current week (memoized)
  const days = useMemo(() => {
    const result = [];
    for (let i = 0; i < 7; i++) {
      result.push(addDays(weekStartDate, i));
    }
    return result;
  }, [weekStartDate]);

  // Week navigation handlers
  const handlePrevWeek = () => {
    setWeekStartDate((prev) => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setWeekStartDate((prev) => addDays(prev, 7));
  };

  const handleToday = () => {
    const today = new Date();
    setWeekStartDate(startOfWeek(today, { weekStartsOn: 0 }));
  };

  // Check if a date is today
  const isDateToday = useCallback((date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, []);

  // Fetch data when week changes
  useEffect(() => {
    const fetchAllWeekData = async () => {
      const weekData: Record<
        string,
        { tasks: Task[]; events: CalendarEvent[] }
      > = {};

      for (const day of days) {
        const dateStr = formatDateForAPI(day);

        // Fetch data in parallel using DataContext methods
        try {
          const [tasks, events] = await Promise.all([
            fetchTasksByDate(dateStr),
            fetchEventsByDate(dateStr),
          ]);

          weekData[dateStr] = { tasks, events };
        } catch (err) {
          console.error(`Error fetching data for ${dateStr}:`, err);
          weekData[dateStr] = { tasks: [], events: [] };
        }
      }

      setWeeklyData(weekData);
    };

    fetchAllWeekData();
  }, [days, fetchTasksByDate, fetchEventsByDate]);

  // Quick action handlers
  const handleShowQuickAction = (
    e: React.MouseEvent,
    day: Date,
    type: QuickActionType
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = containerRef.current?.getBoundingClientRect() || {
      left: 0,
      top: 0,
    };
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setQuickAction({
      visible: true,
      type,
      position: { x, y },
      date: formatDateForAPI(day),
    });

    // Reset form based on type
    if (type === "task") {
      setQuickForm((prev) => ({
        ...prev,
        task: { text: "", time: "" },
      }));
    } else if (type === "event") {
      setQuickForm((prev) => ({
        ...prev,
        event: { title: "", time: "", type: "personal", description: "" },
      }));
    }
  };

  const handleHideQuickAction = () => {
    setQuickAction((prev) => ({ ...prev, visible: false }));
  };

  // Save quick action form
  const handleQuickSave = async () => {
    if (quickAction.type === "task") {
      // Validate form
      if (!quickForm.task.text.trim()) {
        return;
      }

      try {
        // Create new task using DataContext
        const newTask = {
          text: quickForm.task.text,
          date: quickAction.date,
          time: quickForm.task.time,
          completed: false,
        };

        await addNewTask(newTask);

        // Hide form & update week data
        handleHideQuickAction();

        // Update local state - tasks will be fetched from cache
        const dateStr = quickAction.date;
        const tasks = await fetchTasksByDate(dateStr);
        setWeeklyData((prev) => ({
          ...prev,
          [dateStr]: {
            ...prev[dateStr],
            tasks,
          },
        }));
      } catch (error) {
        console.error("Error adding task:", error);
      }
    } else if (quickAction.type === "event") {
      // Validate form
      if (!quickForm.event.title.trim() || !quickForm.event.type) {
        return;
      }

      try {
        // Create new event using DataContext
        const newEvent = {
          title: quickForm.event.title,
          date: quickAction.date,
          time: quickForm.event.time,
          type: quickForm.event.type,
          description: quickForm.event.description,
        };

        await addNewEvent(newEvent);

        // Hide form
        handleHideQuickAction();

        // Update local state - events will be fetched from cache
        const dateStr = quickAction.date;
        const events = await fetchEventsByDate(dateStr);
        setWeeklyData((prev) => ({
          ...prev,
          [dateStr]: {
            ...prev[dateStr],
            events,
          },
        }));
      } catch (error) {
        console.error("Error adding event:", error);
      }
    }
  };

  // Task actions
  const handleTaskClick = (task: Task) => {
    showPopupFor(task);
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      const updatedTask = await toggleTask(task);

      // Update local state
      setWeeklyData((prev) => {
        const dateData = prev[task.date];
        if (!dateData) return prev;

        return {
          ...prev,
          [task.date]: {
            ...dateData,
            tasks: dateData.tasks.map((t) =>
              t.id === task.id ? updatedTask : t
            ),
          },
        };
      });
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    try {
      await deleteExistingTask(task.id);

      // Update local state
      setWeeklyData((prev) => {
        const dateData = prev[task.date];
        if (!dateData) return prev;

        return {
          ...prev,
          [task.date]: {
            ...dateData,
            tasks: dateData.tasks.filter((t) => t.id !== task.id),
          },
        };
      });
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  // Event actions
  const handleEventClick = (event: CalendarEvent) => {
    showPopupFor(event);
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    try {
      await deleteExistingEvent(event.id);

      // Update local state
      setWeeklyData((prev) => {
        const dateData = prev[event.date];
        if (!dateData) return prev;

        return {
          ...prev,
          [event.date]: {
            ...dateData,
            events: dateData.events.filter((e) => e.id !== event.id),
          },
        };
      });
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  // Popup action for completing a task
  const completeTask = async (taskId: number) => {
    // Find the task
    for (const dateStr in weeklyData) {
      const matchedTask = weeklyData[dateStr].tasks.find(
        (t) => t.id === taskId
      );
      if (matchedTask) {
        await handleCompleteTask(matchedTask);
        return;
      }
    }
  };

  return (
    <div className="calendar-week-view" ref={containerRef}>
      <div className="week-header">
        <div className="week-title-container">
          <h2 className="week-title">{format(weekStartDate, "MMMM yyyy")}</h2>
          <p className="week-subtitle">
            Week{" "}
            {getNthWeekOfSemester(
              weekStartDate,
              new Date(weekStartDate.getFullYear(), 0, 10)
            )}
          </p>
        </div>
        <div className="week-header-actions">
          <button className="calendar-btn prev-btn" onClick={handlePrevWeek}>
            &larr;
          </button>
          <button className="calendar-btn today-btn" onClick={handleToday}>
            Today
          </button>
          <button className="calendar-btn next-btn" onClick={handleNextWeek}>
            &rarr;
          </button>
        </div>
      </div>

      {isLoading && Object.keys(weeklyData).length === 0 ? (
        <div className="week-loading">
          <div className="loading-spinner">
            <div className="loading-bar"></div>
          </div>
          <p>Loading this week's schedule...</p>
        </div>
      ) : error ? (
        <div className="week-error">
          <p>{error}</p>
        </div>
      ) : (
        <div className="week-days-container">
          <div className="week-days-header">
            {days.map((day) => (
              <div
                key={format(day, "yyyy-MM-dd")}
                className={`week-day-header ${isDateToday(day) ? "today" : ""}`}
              >
                <span className="day-name">{format(day, "EEE")}</span>
                <span className="day-number">{format(day, "d")}</span>
              </div>
            ))}
          </div>
          <div className="week-days-grid">
            {days.map((day) => {
              const dateStr = formatDateForAPI(day);
              const dayData = weeklyData[dateStr] || { tasks: [], events: [] };

              return (
                <div
                  key={dateStr}
                  className={`week-day ${isDateToday(day) ? "today" : ""}`}
                >
                  <div className="week-day-content">
                    <div className="section-title">Events</div>
                    <div className="week-event-list">
                      {dayData.events.length > 0 ? (
                        dayData.events.map((event) => (
                          <div
                            key={`event-${event.id}`}
                            className={`week-event-item ${event.type.toLowerCase()}`}
                            onClick={() => handleEventClick(event)}
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
                                handleDeleteEvent(event);
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="week-day-empty">No events</div>
                      )}
                    </div>

                    <div className="section-title">Tasks</div>
                    <div className="week-task-list">
                      {dayData.tasks.length > 0 ? (
                        dayData.tasks.map((task) => (
                          <div
                            key={`task-${task.id}`}
                            className={`week-task-item ${
                              task.completed ? "completed" : ""
                            }`}
                            onClick={() => handleTaskClick(task)}
                          >
                            <div
                              className="week-task-status"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteTask(task);
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
                                handleDeleteTask(task);
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="week-day-empty">No tasks</div>
                      )}
                    </div>
                  </div>
                  <div className="week-day-quick-actions">
                    <button
                      className="quick-add-task"
                      onClick={(e) => handleShowQuickAction(e, day, "task")}
                    >
                      + Task
                    </button>
                    <button
                      className="quick-add-event"
                      onClick={(e) => handleShowQuickAction(e, day, "event")}
                    >
                      + Event
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {quickAction.visible && (
        <div className="quick-action-overlay" onClick={handleHideQuickAction}>
          <div
            className="quick-action-form"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              left: `${quickAction.position.x}px`,
              top: `${quickAction.position.y}px`,
            }}
          >
            <div className="quick-action-header">
              <h4>{quickAction.type === "task" ? "Add Task" : "Add Event"}</h4>
              <button
                className="quick-close-btn"
                onClick={handleHideQuickAction}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            {quickAction.type === "task" ? (
              <div className="quick-task-form">
                <input
                  type="text"
                  placeholder="Task description"
                  value={quickForm.task.text}
                  onChange={(e) =>
                    setQuickForm((prev) => ({
                      ...prev,
                      task: { ...prev.task, text: e.target.value },
                    }))
                  }
                  autoFocus
                />

                {/* Simple time input instead of complex component */}
                <input
                  type="time"
                  className="quick-form-time-input"
                  value={quickForm.task.time}
                  onChange={(e) =>
                    setQuickForm((prev) => ({
                      ...prev,
                      task: { ...prev.task, time: e.target.value },
                    }))
                  }
                />

                <div className="quick-form-date">
                  For: {format(parseISO(quickAction.date), "EEEE, MMM d")}
                </div>
              </div>
            ) : (
              <div className="quick-event-form">
                <input
                  type="text"
                  placeholder="Event title"
                  value={quickForm.event.title}
                  onChange={(e) =>
                    setQuickForm((prev) => ({
                      ...prev,
                      event: { ...prev.event, title: e.target.value },
                    }))
                  }
                  autoFocus
                />

                <div className="quick-form-row">
                  {/* Native time input instead of custom component */}
                  <input
                    type="time"
                    value={quickForm.event.time}
                    onChange={(e) =>
                      setQuickForm((prev) => ({
                        ...prev,
                        event: { ...prev.event, time: e.target.value },
                      }))
                    }
                  />

                  <select
                    value={quickForm.event.type}
                    onChange={(e) =>
                      setQuickForm((prev) => ({
                        ...prev,
                        event: { ...prev.event, type: e.target.value },
                      }))
                    }
                  >
                    <option value="personal">Personal</option>
                    <option value="meeting">Meeting</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>

                <div
                  className="quick-form-description"
                  contentEditable
                  onInput={(e) => {
                    const target = e.target as HTMLDivElement;
                    setQuickForm((prev) => ({
                      ...prev,
                      event: {
                        ...prev.event,
                        description: target.innerText,
                      },
                    }));
                  }}
                  style={{
                    minHeight: "4em",
                    border: "1px solid #ccc",
                    padding: "8px",
                    borderRadius: "4px",
                    marginBottom: "10px",
                    outline: "none",
                  }}
                ></div>

                <div className="quick-form-date">
                  For: {format(parseISO(quickAction.date), "EEEE, MMM d")}
                </div>
              </div>
            )}

            <div className="quick-form-actions">
              <button className="quick-save-btn" onClick={handleQuickSave}>
                Save
              </button>
              <button
                className="quick-cancel-btn"
                onClick={handleHideQuickAction}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {currentPopupItem && (
        <DetailPopup
          item={currentPopupItem}
          onClose={closePopup}
          onComplete={completeTask}
          container={document.body}
        />
      )}
    </div>
  );
};

export default WeekView;
