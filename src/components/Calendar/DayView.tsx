import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import { getCurrentUserId } from "../../utils/auth";
import { formatDateToString, parseLocalDateString } from "../../utils/timeUtils";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import DetailPopup from "../Common/DetailPopup";
import TimeInput from "../Common/TimeInput";
import "./Calendar.css";

const DayView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ REMOVED: useCalendarCache - go direct to DataContext
  const {
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useData();
  
  const { showPopupFor, currentPopupItem, closePopup, completeTask } = useNotifications();

  // ✅ Local UI state only
  const [date, setDate] = useState<Date | null>(null);
  const [newTask, setNewTask] = useState({ title: "", task_time: "" });
  const [newEvent, setNewEvent] = useState({
    title: "",
    event_time: "",
    type: "",
    description: "",
  });
  const [activeTab, setActiveTab] = useState<"events" | "tasks">("events");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editTaskForm, setEditTaskForm] = useState({
    title: "",
    task_time: "",
  });
  const [editEventForm, setEditEventForm] = useState({
    title: "",
    event_time: "",
    type: "",
    description: "",
  });

  // ✅ NEW: Direct SQLite data state
  const [currentDateTasks, setCurrentDateTasks] = useState<Task[]>([]);
  const [currentDateEvents, setCurrentDateEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ NEW: Real database counts
  const [realCounts, setRealCounts] = useState({
    tasks: 0,
    events: 0,
  });

  // ✅ FIXED: Parse date from URL and set it immediately
  useEffect(() => {
    try {
      const query = new URLSearchParams(location.search);
      const dateStr = query.get("date");
      const highlight = query.get("highlight");

      if (highlight) {
        setHighlightId(highlight);
        setTimeout(() => setHighlightId(null), 3000);
      }

      let targetDate: Date;
      if (dateStr) {
        targetDate = parseLocalDateString(dateStr);
        if (isNaN(targetDate.getTime())) {
          console.warn("Invalid date from URL, using today");
          targetDate = new Date();
        }
      } else {
        targetDate = new Date();
      }

      console.log(`📅 DayView: Setting date to ${formatDateToString(targetDate)}`);
      setDate(targetDate);
    } catch (err) {
      console.error("Error parsing date:", err);
      const today = new Date();
      setDate(today);
    }
  }, [location.search]);

  // ✅ NEW: Direct SQLite data fetching
  useEffect(() => {
    if (!date) {
      console.log("📅 DayView: No date set, skipping fetch");
      return;
    }

    const fetchData = async () => {
      const userId = getCurrentUserId();
      if (!userId) {
        console.log("📅 DayView: No user ID, skipping fetch");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const dateStr = formatDateToString(date);
        console.log(`📅 DayView: Direct SQLite fetch for ${dateStr}`);

        // ✅ Direct SQLite calls - no cache layer
        const [tasks, events] = await Promise.all([
          window.electronAPI.db.getTasks(userId, dateStr),
          window.electronAPI.db.getEvents(userId, dateStr),
        ]);

        setCurrentDateTasks(tasks || []);
        setCurrentDateEvents(events || []);
        
        // Update real counts
        setRealCounts({
          tasks: tasks?.length || 0,
          events: events?.length || 0,
        });

        console.log(`✅ DayView: Loaded ${tasks?.length || 0} tasks, ${events?.length || 0} events`);
      } catch (error) {
        console.error("📅 DayView: Error loading data:", error);
        setError("Failed to load data");
        setCurrentDateTasks([]);
        setCurrentDateEvents([]);
        setRealCounts({ tasks: 0, events: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [date]); // ✅ Only depend on date

  // ✅ Set active tab from URL
  useEffect(() => {
    try {
      const query = new URLSearchParams(location.search);
      const tabParam = query.get("tab");

      if (tabParam === "tasks" || tabParam === "events") {
        setActiveTab(tabParam);
      }
    } catch (err) {
      console.error("Error parsing tab parameter:", err);
    }
  }, [location.search]);

  // ✅ Navigation handlers (unchanged)
  const handlePrevDay = useCallback(() => {
    if (!date) return;
    try {
      const prevDay = new Date(date);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDayStr = formatDateToString(prevDay);
      navigate(`/calendar/day?date=${prevDayStr}`);
    } catch (error) {
      console.error("Navigation error:", error);
    }
  }, [date, navigate]);

  const handleNextDay = useCallback(() => {
    if (!date) return;
    try {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = formatDateToString(nextDay);
      navigate(`/calendar/day?date=${nextDayStr}`);
    } catch (error) {
      console.error("Navigation error:", error);
    }
  }, [date, navigate]);

  // ✅ UPDATED: Task submission with immediate UI update
  const handleTaskSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    isEditing: boolean
  ) => {
    e.preventDefault();
    if (!date) return;

    const task_date = formatDateToString(date);
    const taskData = isEditing ? editTaskForm : newTask;

    if (!taskData.title.trim()) {
      alert("Please enter a task title");
      return;
    }

    try {
      if (isEditing && editingTask) {
        const taskToUpdate = {
          ...editingTask,
          title: taskData.title,
          task_time: taskData.task_time,
          task_date,
        };

        await updateTask(taskToUpdate);
        setEditingTask(null);
        setEditTaskForm({ title: "", task_time: "" });
      } else {
        const newTaskData = {
          title: taskData.title,
          task_date,
          task_time: taskData.task_time,
          completed: false,
          user_id: getCurrentUserId(),
        };

        await createTask(newTaskData);
        setNewTask({ title: "", task_time: "" });
      }

      // ✅ IMMEDIATE: Refresh data after operation
      const userId = getCurrentUserId();
      if (userId) {
        const [updatedTasks, updatedEvents] = await Promise.all([
          window.electronAPI.db.getTasks(userId, task_date),
          window.electronAPI.db.getEvents(userId, task_date),
        ]);
        setCurrentDateTasks(updatedTasks || []);
        setCurrentDateEvents(updatedEvents || []);
        setRealCounts({
          tasks: updatedTasks?.length || 0,
          events: updatedEvents?.length || 0,
        });
      }
    } catch (error) {
      console.error("Error submitting task:", error);
      alert("Failed to save task. Please try again.");
    }
  };

  // ✅ UPDATED: Event submission with immediate UI update
  const handleEventSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    isEditing: boolean
  ) => {
    e.preventDefault();
    if (!date) return;

    const event_date = formatDateToString(date);
    const eventData = isEditing ? editEventForm : newEvent;

    if (!eventData.title.trim() || !eventData.event_time || !eventData.type) {
      alert("Please fill all required fields");
      return;
    }

    try {
      if (isEditing && editingEvent) {
        const updatedEvent = await updateEvent({
          ...editingEvent,
          title: eventData.title.trim(),
          event_time: eventData.event_time,
          type: eventData.type,
          description: eventData.description.trim(),
        });

        setEditingEvent(null);
        setEditEventForm({
          title: "",
          event_time: "",
          type: "",
          description: "",
        });
      } else {
        const newEventData = {
          title: eventData.title.trim(),
          event_date,
          event_time: eventData.event_time,
          type: eventData.type,
          description: eventData.description.trim(),
          user_id: getCurrentUserId(),
        };

        await createEvent(newEventData);
        setNewEvent({ title: "", event_time: "", type: "", description: "" });
      }

      // ✅ IMMEDIATE: Refresh data after operation
      const userId = getCurrentUserId();
      if (userId) {
        const [updatedTasks, updatedEvents] = await Promise.all([
          window.electronAPI.db.getTasks(userId, event_date),
          window.electronAPI.db.getEvents(userId, event_date),
        ]);
        setCurrentDateTasks(updatedTasks || []);
        setCurrentDateEvents(updatedEvents || []);
        setRealCounts({
          tasks: updatedTasks?.length || 0,
          events: updatedEvents?.length || 0,
        });
      }
    } catch (error) {
      console.error("Event operation failed:", error);
      alert("Failed to save event. Please try again.");
    }
  };

  // ✅ UPDATED: Toggle task with immediate UI update
  const handleToggleTask = async (task: Task) => {
    try {
      await toggleTask(task);
      
      // ✅ IMMEDIATE: Refresh data after operation
      const userId = getCurrentUserId();
      const dateStr = formatDateToString(date!);
      if (userId) {
        const updatedTasks = await window.electronAPI.db.getTasks(userId, dateStr);
        setCurrentDateTasks(updatedTasks || []);
        setRealCounts(prev => ({
          ...prev,
          tasks: updatedTasks?.length || 0,
        }));
      }
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  // ✅ UPDATED: Delete task with immediate UI update
  const handleDeleteTask = async (id: number) => {
    try {
      if (!confirm("Are you sure you want to delete this task?")) {
        return;
      }

      await deleteTask(id);
      
      // ✅ IMMEDIATE: Refresh data after operation
      const userId = getCurrentUserId();
      const dateStr = formatDateToString(date!);
      if (userId) {
        const updatedTasks = await window.electronAPI.db.getTasks(userId, dateStr);
        setCurrentDateTasks(updatedTasks || []);
        setRealCounts(prev => ({
          ...prev,
          tasks: updatedTasks?.length || 0,
        }));
      }
      
      if (currentPopupItem && currentPopupItem.id === id) {
        closePopup();
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  // ✅ UPDATED: Delete event with immediate UI update
  const handleDeleteEvent = async (id: number) => {
    try {
      if (!confirm("Are you sure you want to delete this event?")) {
        return;
      }

      await deleteEvent(id);
      
      // ✅ IMMEDIATE: Refresh data after operation
      const userId = getCurrentUserId();
      const dateStr = formatDateToString(date!);
      if (userId) {
        const updatedEvents = await window.electronAPI.db.getEvents(userId, dateStr);
        setCurrentDateEvents(updatedEvents || []);
        setRealCounts(prev => ({
          ...prev,
          events: updatedEvents?.length || 0,
        }));
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert("Could not delete event. Please try again.");
    }
  };

  // ✅ Keep all other helper functions unchanged
  const formatTime = (time: string) => {
    if (!time) return "";
    const match = time.match(/^(\d{1,2}):(\d{2})(\s*(am|pm|AM|PM))?$/);
    if (match) {
      const hour = parseInt(match[1], 10);
      const minute = match[2];
      const ampm = match[3] ? match[3].toLowerCase() : "";
      return ampm ? `${hour}:${minute} ${ampm}` : `${hour}:${minute}`;
    }
    return time;
  };

  const getStats = () => {
    const completedTasks = currentDateTasks.filter(
      (task) => task.completed
    ).length;
    const pendingTasks = currentDateTasks.length - completedTasks;
    return {
      events: realCounts.events,
      completedTasks,
      pendingTasks,
    };
  };

  const handleTaskDetails = (task: Task) => {
    showPopupFor(task);
  };

  const handleEventDetails = (event: CalendarEvent) => {
    showPopupFor(event);
  };

  const handleEditTask = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    e.preventDefault();

    setEditingTask(task);
    setEditTaskForm({
      title: task.title,
      task_time: task.task_time || "",
    });
    setActiveTab("tasks");
    document.querySelector(".day-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleEditEvent = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    e.preventDefault();

    setEditingEvent(event);
    setEditEventForm({
      title: event.title,
      event_time: event.event_time || "",
      type: event.type || "",
      description: event.description || "",
    });
    setActiveTab("events");
    document.querySelector(".day-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const navigateToNotificationsTasks = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    navigate("/notifications?filter=pending-tasks");
  };

  const navigateToNotificationsEvents = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    navigate("/notifications?filter=events");
  };

  const navigateToCompletedTasks = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    navigate("/notifications?filter=completed-tasks");
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setEditingEvent(null);
    setEditTaskForm({ title: "", task_time: "" });
    setEditEventForm({ title: "", event_time: "", type: "", description: "" });
  };

  // ✅ Show loading state
  if (loading) {
    return (
      <div className="day-view-container">
        <div className="day-loading">
          <div className="loading-spinner"></div>
          <p>Loading day data...</p>
        </div>
      </div>
    );
  }

  // ✅ Show error state
  if (error) {
    return (
      <div className="day-view-container">
        <div className="day-error">
          <p>Error loading data: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (!date) {
    return (
      <div className="day-view-container">
        <div className="day-error">
          <p>No date selected</p>
        </div>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="day-view-container">
      {/* ✅ Keep existing JSX structure exactly the same */}
      <div className="day-view-header">
        <h1 className="day-view-date">
          {date.toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </h1>

        <div className="day-view-navigation">
          <button className="day-nav-btn" onClick={handlePrevDay}>
            ← Previous
          </button>
          <button
            className="day-nav-btn"
            onClick={() => navigate("/calendar/day")}
          >
            Today
          </button>
          <button className="day-nav-btn" onClick={handleNextDay}>
            Next →
          </button>
        </div>
      </div>

      <div className="day-view-stats">
        <div className="day-stat-card" onClick={navigateToNotificationsEvents}>
          <div className="day-stat-icon">📅</div>
          <div className="day-stat-content">
            <span className="day-stat-value">{stats.events}</span>
            <span className="day-stat-label">Events</span>
          </div>
        </div>

        <div className="day-stat-card" onClick={navigateToCompletedTasks}>
          <div className="day-stat-icon">✅</div>
          <div className="day-stat-content">
            <span className="day-stat-value">{stats.completedTasks}</span>
            <span className="day-stat-label">Completed</span>
          </div>
        </div>

        <div className="day-stat-card" onClick={navigateToNotificationsTasks}>
          <div className="day-stat-icon">📝</div>
          <div className="day-stat-content">
            <span className="day-stat-value">{stats.pendingTasks}</span>
            <span className="day-stat-label">Pending</span>
          </div>
        </div>
      </div>

      <div className="day-view-tabs">
        <button
          className={`day-view-tab ${activeTab === "events" ? "active" : ""}`}
          onClick={() => setActiveTab("events")}
        >
          Events ({realCounts.events})
        </button>
        <button
          className={`day-view-tab ${activeTab === "tasks" ? "active" : ""}`}
          onClick={() => setActiveTab("tasks")}
        >
          Tasks ({realCounts.tasks})
        </button>
      </div>

      <div className="day-view-content">
        {activeTab === "events" && (
          <div className="day-view-section">
            <form
              className="day-form"
              onSubmit={(e) => handleEventSubmit(e, !!editingEvent)}
            >
              <div className="day-form-grid">
                <div className="day-form-group">
                  <input
                    type="text"
                    className="day-form-input"
                    placeholder="Event title..."
                    value={editingEvent ? editEventForm.title : newEvent.title}
                    onChange={(e) => {
                      if (editingEvent) {
                        setEditEventForm(prev => ({ ...prev, title: e.target.value }));
                      } else {
                        setNewEvent(prev => ({ ...prev, title: e.target.value }));
                      }
                    }}
                    required
                  />
                </div>

                <div className="day-form-group">
                  <TimeInput
                    value={editingEvent ? editEventForm.event_time : newEvent.event_time}
                    onChange={(time) => {
                      if (editingEvent) {
                        setEditEventForm(prev => ({ ...prev, event_time: time }));
                      } else {
                        setNewEvent(prev => ({ ...prev, event_time: time }));
                      }
                    }}
                    placeholder="Select time"
                  />
                </div>

                <div className="day-form-group">
                  <select
                    className="day-form-select"
                    value={editingEvent ? editEventForm.type : newEvent.type}
                    onChange={(e) => {
                      if (editingEvent) {
                        setEditEventForm(prev => ({ ...prev, type: e.target.value }));
                      } else {
                        setNewEvent(prev => ({ ...prev, type: e.target.value }));
                      }
                    }}
                    required
                  >
                    <option value="">Select type</option>
                    <option value="meeting">Meeting</option>
                    <option value="personal">Personal</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>
              </div>

              <div className="day-form-group">
                <input
                  type="text"
                  className="day-form-input"
                  placeholder="Description (optional)"
                  value={editingEvent ? editEventForm.description : newEvent.description}
                  onChange={(e) => {
                    if (editingEvent) {
                      setEditEventForm(prev => ({ ...prev, description: e.target.value }));
                    } else {
                      setNewEvent(prev => ({ ...prev, description: e.target.value }));
                    }
                  }}
                />
              </div>

              <div className="day-form-actions">
                <button type="submit" className="day-form-btn primary">
                  {editingEvent ? "Update Event" : "Add Event"}
                </button>
                {editingEvent && (
                  <button
                    type="button"
                    className="day-form-btn cancel"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="day-list">
              {currentDateEvents.map((event) => (
                <div
                  key={event.id}
                  className={`day-item event ${
                    highlightId === `event-${event.id}` ? "highlighted" : ""
                  }`}
                  onClick={() => handleEventDetails(event)}
                >
                  <div className="event-info">
                    <h3 className="event-title">{event.title}</h3>
                    <div className="event-meta">
                      <span className="event-time">{formatTime(event.event_time)}</span>
                      <span className="event-type">{event.type}</span>
                    </div>
                    {event.description && (
                      <p className="event-description">{event.description}</p>
                    )}
                  </div>
                  <div className="event-actions">
                    <button
                      className="event-btn edit"
                      onClick={(e) => handleEditEvent(e, event)}
                    >
                      Edit
                    </button>
                    <button
                      className="event-btn delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEvent(event.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              
              {currentDateEvents.length === 0 && (
                <div className="day-empty">
                  <p>No events for this day</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="day-view-section">
            <form
              className="day-form"
              onSubmit={(e) => handleTaskSubmit(e, !!editingTask)}
            >
              <div className="day-form-group">
                <input
                  type="text"
                  className="day-form-input"
                  placeholder="Enter task title..."
                  value={editingTask ? editTaskForm.title : newTask.title}
                  onChange={(e) => {
                    if (editingTask) {
                      setEditTaskForm(prev => ({ ...prev, title: e.target.value }));
                    } else {
                      setNewTask(prev => ({ ...prev, title: e.target.value }));
                    }
                  }}
                  required
                />
              </div>

              <div className="day-form-group">
                <TimeInput
                  value={editingTask ? editTaskForm.task_time : newTask.task_time}
                  onChange={(time) => {
                    if (editingTask) {
                      setEditTaskForm(prev => ({ ...prev, task_time: time }));
                    } else {
                      setNewTask(prev => ({ ...prev, task_time: time }));
                    }
                  }}
                  placeholder="Select time (optional)"
                />
              </div>

              <div className="day-form-actions">
                <button type="submit" className="day-form-btn primary">
                  {editingTask ? "Update Task" : "Add Task"}
                </button>
                {editingTask && (
                  <button
                    type="button"
                    className="day-form-btn cancel"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="day-list">
              {currentDateTasks.map((task) => (
                <div
                  key={task.id}
                  className={`day-item task ${task.completed ? "completed" : ""} ${
                    highlightId === `task-${task.id}` ? "highlighted" : ""
                  }`}
                  onClick={() => handleTaskDetails(task)}
                >
                  <button
                    className={`task-status ${task.completed ? "completed" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTask(task);
                    }}
                  >
                    {task.completed ? "✓" : ""}
                  </button>
                  <div className="task-info">
                    <h3 className="task-title">{task.title}</h3>
                    <div className="task-meta">
                      {task.task_time && (
                        <span className="task-time">{formatTime(task.task_time)}</span>
                      )}
                    </div>
                  </div>
                  <div className="task-actions">
                    <button
                      className="task-btn edit"
                      onClick={(e) => handleEditTask(e, task)}
                    >
                      Edit
                    </button>
                    <button
                      className="task-btn delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              
              {currentDateTasks.length === 0 && (
                <div className="day-empty">
                  <p>No tasks for this day</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {currentPopupItem && (
        <DetailPopup
          item={currentPopupItem}
          onClose={closePopup}
          onComplete={completeTask}
        />
      )}
    </div>
  );
};

export default DayView;