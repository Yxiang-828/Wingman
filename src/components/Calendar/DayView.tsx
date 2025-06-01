import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCalendarCache } from "../../Hooks/useCalendar";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import { getCurrentUserId } from "../../utils/auth";
import { formatDateToString } from "../../utils/timeUtils";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import DetailPopup from "../Common/DetailPopup";
import TimeInput from "../Common/TimeInput"; // ✅ YOU ALREADY HAVE THIS IMPORTED
import WingmanAvatar from "../Common/WingmanAvatar";
import "./Calendar.css";

const DayView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    getDayData,
    loading: cacheLoading,
    error: cacheError,
  } = useCalendarCache("DayView");
  const {
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useData();
  const { showPopupFor, currentPopupItem, closePopup, completeTask } =
    useNotifications();

  // ✅ Auto-fetch timer
  const autoFetchTimerRef = useRef<NodeJS.Timeout>();

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

  // ✅ Current date data from cache
  const [currentDateTasks, setCurrentDateTasks] = useState<Task[]>([]);
  const [currentDateEvents, setCurrentDateEvents] = useState<CalendarEvent[]>(
    []
  );
  const [loading, setLoading] = useState(false);

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
        targetDate = new Date(dateStr);
        if (isNaN(targetDate.getTime())) {
          console.warn("Invalid date in URL, using today");
          targetDate = new Date();
        }
      } else {
        targetDate = new Date();
      }

      console.log(
        `📅 DayView: Setting date to ${targetDate.toISOString().split("T")[0]}`
      );
      setDate(targetDate);
    } catch (err) {
      console.error("Error parsing date:", err);
      const today = new Date();
      setDate(today);
    }
  }, [location.search]);

  // Add this near the start of your component, after setting the date
  useEffect(() => {
    try {
      const query = new URLSearchParams(location.search);
      const tabParam = query.get("tab");

      // Set the active tab based on URL parameter if present
      if (tabParam === "tasks" || tabParam === "events") {
        setActiveTab(tabParam);
      }
    } catch (err) {
      console.error("Error parsing tab parameter:", err);
    }
  }, [location.search]);

  // ✅ FIXED: Separate effect to fetch data when date is set
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
      try {
        const dateStr = formatDateToString(date);
        console.log(`📅 DayView: Fetching data for ${dateStr}`);

        // ✅ FIXED: Just get data normally, don't force refresh
        const dayData = await getDayData(dateStr);

        setCurrentDateTasks(dayData.tasks);
        setCurrentDateEvents(dayData.events);

        console.log(
          `📅 DayView: Loaded ${dayData.tasks.length} tasks, ${dayData.events.length} events`
        );
      } catch (error) {
        console.error("📅 DayView: Error loading data:", error);
        setCurrentDateTasks([]);
        setCurrentDateEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [date, getDayData]); // ✅ FIXED: Only depend on date and getDayData

  // ✅ REMOVED: forceLoadDayData function - not needed

  // ✅ FIXED: Navigate to previous day with simpler logic
  const handlePrevDay = useCallback(() => {
    if (!date) return;
    try {
      const prevDay = new Date(date);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDayStr = prevDay.toISOString().split("T")[0];

      console.log(`📅 DayView: Navigating to PREVIOUS day: ${prevDayStr}`);
      navigate(`/calendar/day?date=${prevDayStr}`);
    } catch (error) {
      console.error("Navigation error:", error);
    }
  }, [date, navigate]);

  // ✅ FIXED: Navigate to next day with simpler logic
  const handleNextDay = useCallback(() => {
    if (!date) return;
    try {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split("T")[0];

      console.log(`📅 DayView: Navigating to NEXT day: ${nextDayStr}`);
      navigate(`/calendar/day?date=${nextDayStr}`);
    } catch (error) {
      console.error("Navigation error:", error);
    }
  }, [date, navigate]);

  // ✅ NEW: Auto-fetch adjacent days after 10 seconds
  useEffect(() => {
    if (!date) return;

    const userId = getCurrentUserId();
    if (!userId) return;

    // Clear existing timer
    if (autoFetchTimerRef.current) {
      clearTimeout(autoFetchTimerRef.current);
    }

    // Set new timer for 10 seconds
    autoFetchTimerRef.current = setTimeout(async () => {
      console.log(
        `🤖 DayView: Auto-fetching adjacent days for ${
          date.toISOString().split("T")[0]
        }`
      );

      try {
        const prevDay = new Date(date);
        prevDay.setDate(prevDay.getDate() - 1);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const prevDayStr = formatDateToString(prevDay);
        const nextDayStr = formatDateToString(nextDay);

        // Pre-fetch adjacent days
        await Promise.all([
          getDayData(prevDayStr, true),
          getDayData(nextDayStr, true),
        ]);

        console.log(`✅ DayView: Pre-fetched adjacent days`);
      } catch (error) {
        console.error("Error pre-fetching adjacent days:", error);
      }
    }, 10000); // 10 seconds

    // Cleanup on unmount or date change
    return () => {
      if (autoFetchTimerRef.current) {
        clearTimeout(autoFetchTimerRef.current);
      }
    };
  }, [date, getDayData]);

  // ✅ UPDATED: Toggle task handler with optimistic updates
  const handleToggleTask = async (task: Task) => {
    try {
      // ❌ REMOVE: Manual optimistic updates
      // const processingTask = { ...task, isProcessing: true };
      // setCurrentDateTasks((prev) =>
      //   prev.map((t) => (t.id === task.id ? processingTask : t))
      // );

      // ✅ KEEP: Only call API, let broadcasts handle UI updates
      await toggleTask(task);
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  // ✅ UPDATED: Delete task handler
  const handleDeleteTask = async (id: number) => {
    try {
      if (!confirm("Are you sure you want to delete this task?")) {
        return;
      }

      // Use the context method for deletion - broadcasts will update cache
      await deleteTask(id);
      
      // Close popup if open
      if (currentPopupItem && currentPopupItem.id === id) {
        closePopup();
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      // ❌ REMOVE: Manual rollback - broadcasts will handle consistency
      // const today = date.toISOString().split("T")[0];
      // const dayData = await getDayData(today, true);
      // setCurrentDateTasks(dayData.tasks);
    }
  };

  // ✅ UPDATED: Task submission handler
  const handleTaskSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    isEditing: boolean
  ) => {
    e.preventDefault();
    if (!date) return;

    const task_date = date.toISOString().split("T")[0];
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

        // ✅ FIXED: Only call API, let broadcasts handle UI updates
        await updateTask(taskToUpdate);
        
        setEditingTask(null);
        setEditTaskForm({ title: "", task_time: "" });
      } else {
        const newTaskData = {
          title: taskData.title,
          task_date,
          task_time: taskData.task_time,
          completed: false,
        };

        // ✅ FIXED: Only call API, let broadcasts handle UI updates
        await createTask(newTaskData);
        
        setNewTask({ title: "", task_time: "" });
      }
    } catch (error) {
      console.error("Error submitting task:", error);
      alert("Failed to save task. Please try again.");
    }
  };

  // ✅ COMPLETE the missing event submission handler
  const handleEventSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    isEditing: boolean
  ) => {
    e.preventDefault();
    if (!date) return;

    const event_date = date.toISOString().split("T")[0];
    const eventData = isEditing ? editEventForm : newEvent;

    // Validation
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

        // Update local state
        setCurrentDateEvents((prev) =>
          prev.map((e) => (e.id === editingEvent.id ? updatedEvent : e))
        );
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
          event_date: event_date,
          event_time: eventData.event_time,
          type: eventData.type,
          description: eventData.description.trim(),
          user_id: getCurrentUserId(),
        };

        const addedEvent = await createEvent(newEventData);
        setCurrentDateEvents((prev) => [...prev, addedEvent]);
        setNewEvent({ title: "", event_time: "", type: "", description: "" });
      }
    } catch (error) {
      console.error("Event operation failed:", error);
      alert("Failed to save event. Please try again.");
    }
  };

  // ✅ UPDATED: Delete event handler
  const handleDeleteEvent = async (id: number) => {
    try {
      if (!confirm("Are you sure you want to delete this event?")) {
        return;
      }

      // Use the context method for deletion - broadcasts will update cache
      await deleteEvent(id);

      // Update local state immediately
      setCurrentDateEvents((prev) => prev.filter((event) => event.id !== id));

      console.log("Event deleted successfully");
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert("Could not delete event. Please try again.");
    }
  };

  // ✅ KEEP: All other handlers unchanged (navigation, formatting, etc.)
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
      events: currentDateEvents.length,
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

  // MODIFY: handleEditTask function to use inline editing
  const handleEditTask = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    e.preventDefault();

    // Use the existing inline editing state
    setEditingTask(task);

    // Populate the edit form
    setEditTaskForm({
      title: task.title,
      task_time: task.task_time || "",
    });

    // Switch to tasks tab
    setActiveTab("tasks");

    // Scroll to form
    document.querySelector(".day-form")?.scrollIntoView({ behavior: "smooth" });
  };

  // MODIFY: handleEditEvent function to use inline editing
  const handleEditEvent = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Use the existing inline editing state
    setEditingEvent(event);

    // Populate the edit form
    setEditEventForm({
      title: event.title,
      event_time: event.event_time || "",
      type: event.type || "",
      description: event.description || "",
    });

    // Switch to events tab
    setActiveTab("events");

    // Scroll to form
    document.querySelector(".day-form")?.scrollIntoView({ behavior: "smooth" });
  };

  // ✅ Show loading state
  if (loading) {
    return (
      <div className="day-view-container">
        <div className="day-view-loading">
          <div className="loading-spinner"></div>
          <p>Loading day data...</p>
          <small style={{ color: "#666", marginTop: "10px" }}>
            Date: {date ? date.toISOString().split("T")[0] : "Not set"} | Cache:{" "}
            {cacheLoading ? "loading..." : "ready"} | Local:{" "}
            {loading ? "loading..." : "ready"}
          </small>
        </div>
      </div>
    );
  }

  // ✅ Show error state
  if (cacheError) {
    return (
      <div className="day-view-container">
        <div className="day-view-error">
          <h2>Error Loading Day</h2>
          <p>{cacheError}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  // ✅ Show message if no date is set
  if (!date) {
    return (
      <div className="day-view-container">
        <div className="day-view-loading">
          <p>Setting up calendar...</p>
        </div>
      </div>
    );
  }

  const navigateToNotificationsTasks = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    navigate("/notifications?filter=pending-tasks");
  };

  const navigateToNotificationsEvents = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    navigate("/notifications?filter=events");
  };

  const navigateToCompletedTasks = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    navigate("/notifications?filter=completed-tasks");
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setEditingEvent(null);
    setEditTaskForm({ title: "", task_time: "" });
    setEditEventForm({ title: "", event_time: "", type: "", description: "" });
  };

  const stats = getStats();

  return (
    <div className="day-view-container">
      {" "}
      {/* ✅ KEEP: All existing JSX structure exactly the same */}
      <div className="day-view-header">
        <div className="flex items-center gap-3 mb-4">
          <WingmanAvatar
            size="medium"
            mood="happy"
            context="dashboard"
            onClick={() => navigate("/profile")}
            className="hover:scale-110 transition-transform duration-300"
          />
          <h1 className="day-view-date">
            {date
              ? date.toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Today"}
          </h1>
        </div>

        <div className="day-view-navigation">
          <button className="day-nav-btn" onClick={handlePrevDay}>
            ← Prev
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
        <div
          className="day-stat-card"
          onClick={navigateToNotificationsEvents}
          title="View all events"
        >
          <div className="day-stat-icon">📅</div>
          <div className="day-stat-content">
            <div className="day-stat-value">{stats.events}</div>
            <div className="day-stat-label">Events</div>
          </div>
        </div>

        <div
          className="day-stat-card"
          onClick={navigateToCompletedTasks}
          title="View completed tasks"
        >
          <div className="day-stat-icon">✅</div>
          <div className="day-stat-content">
            <div className="day-stat-value">{stats.completedTasks}</div>
            <div className="day-stat-label">Completed</div>
          </div>
        </div>

        <div
          className="day-stat-card"
          onClick={navigateToNotificationsTasks}
          title="View pending tasks"
        >
          <div className="day-stat-icon">⏰</div>
          <div className="day-stat-content">
            <div className="day-stat-value">{stats.pendingTasks}</div>
            <div className="day-stat-label">Pending</div>
          </div>
        </div>
      </div>
      <div className="day-view-tabs">
        <button
          className={`day-view-tab ${activeTab === "events" ? "active" : ""}`}
          onClick={() => setActiveTab("events")}
        >
          Events ({currentDateEvents.length})
        </button>
        <button
          className={`day-view-tab ${activeTab === "tasks" ? "active" : ""}`}
          onClick={() => setActiveTab("tasks")}
        >
          Tasks ({currentDateTasks.length})
        </button>
      </div>
      <div className="day-view-content">
        {activeTab === "events" && (
          <div className="day-view-section">
            <div className="day-section-header">
              <h3 className="day-section-title">Events</h3>
            </div>

            {/* ✅ FIXED: Event Form with TimeInput */}
            <form
              className="day-form"
              onSubmit={(e) => handleEventSubmit(e, !!editingEvent)}
            >
              <div className="day-form-grid">
                <div className="day-form-group">
                  <input
                    type="text"
                    className="day-form-input"
                    placeholder="Event title"
                    value={editingEvent ? editEventForm.title : newEvent.title}
                    onChange={(e) => {
                      if (editingEvent) {
                        setEditEventForm((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }));
                      } else {
                        setNewEvent((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }));
                      }
                    }}
                    required
                  />
                </div>

                <div className="day-form-group">
                  {/* ✅ USE YOUR TimeInput COMPONENT */}
                  <TimeInput
                    value={
                      editingEvent
                        ? editEventForm.event_time
                        : newEvent.event_time
                    }
                    onChange={(time) => {
                      if (editingEvent) {
                        setEditEventForm((prev) => ({
                          ...prev,
                          event_time: time,
                        }));
                      } else {
                        setNewEvent((prev) => ({
                          ...prev,
                          event_time: time,
                        }));
                      }
                    }}
                    placeholder="Event time"
                  />
                </div>

                <div className="day-form-group">
                  <select
                    className="day-form-select"
                    value={editingEvent ? editEventForm.type : newEvent.type}
                    onChange={(e) => {
                      if (editingEvent) {
                        setEditEventForm((prev) => ({
                          ...prev,
                          type: e.target.value,
                        }));
                      } else {
                        setNewEvent((prev) => ({
                          ...prev,
                          type: e.target.value,
                        }));
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
                  value={
                    editingEvent
                      ? editEventForm.description
                      : newEvent.description
                  }
                  onChange={(e) => {
                    if (editingEvent) {
                      setEditEventForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }));
                    } else {
                      setNewEvent((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }));
                    }
                  }}
                />
              </div>

              <div className="day-form-actions">
                <button type="submit" className="day-form-btn">
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

            {/* ✅ FIXED: Events List with working edit buttons */}
            <div className="day-list">
              {currentDateEvents.length > 0 ? (
                currentDateEvents.map((event) => (
                  <div
                    key={`event-${event.id}-${event.event_date}`} // ✅ FIXED: Unique keys
                    id={`event-${event.id}`}
                    className={`event-item event-${event.type} ${
                      highlightId === `event-${event.id}` ? "highlighted" : ""
                    }`}
                    onClick={() => handleEventDetails(event)}
                  >
                    <div className="event-time">
                      <span className="event-time-value">
                        {formatTime(event.event_time)}
                      </span>
                    </div>
                    <div className="event-info">
                      <div className="event-title">{event.title}</div>
                      <div className="event-meta">
                        <span className="event-type">{event.type}</span>
                        {event.description && (
                          <span className="event-description">
                            {event.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="event-actions">
                      {/* ✅ FIXED: Working edit button */}
                      <button
                        className="event-btn edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEvent(e, event);
                        }}
                        title="Edit event"
                      >
                        ✏️
                      </button>
                      <button
                        className="event-btn delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(event.id);
                        }}
                        title="Delete event"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="day-empty-state">
                  <p className="day-empty-text">No events for this day</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="day-view-section">
            <div className="day-section-header">
              <h3 className="day-section-title">Tasks</h3>
            </div>

            {/* ✅ FIXED: Task Form with TimeInput */}
            <form
              className="day-form"
              onSubmit={(e) => handleTaskSubmit(e, !!editingTask)}
            >
              <div className="day-form-grid">
                <div className="day-form-group">
                  <input
                    type="text"
                    className="day-form-input"
                    placeholder="Task title"
                    value={editingTask ? editTaskForm.title : newTask.title}
                    onChange={(e) => {
                      if (editingTask) {
                        setEditTaskForm((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }));
                      } else {
                        setNewTask((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }));
                      }
                    }}
                    required
                  />
                </div>

                <div className="day-form-group">
                  {/* ✅ USE YOUR TimeInput COMPONENT */}
                  <TimeInput
                    value={
                      editingTask ? editTaskForm.task_time : newTask.task_time
                    }
                    onChange={(time) => {
                      if (editingTask) {
                        setEditTaskForm((prev) => ({
                          ...prev,
                          task_time: time,
                        }));
                      } else {
                        setNewTask((prev) => ({
                          ...prev,
                          task_time: time,
                        }));
                      }
                    }}
                    placeholder="Task time"
                  />
                </div>
              </div>

              <div className="day-form-actions">
                <button type="submit" className="day-form-btn">
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

            {/* ✅ FIXED: Tasks List with working edit buttons */}
            <div className="day-list">
              {currentDateTasks.length > 0 ? (
                currentDateTasks.map((task) => (
                  <div
                    key={`task-${task.id}-${task.task_date}`} // ✅ FIXED: Unique keys
                    id={`task-${task.id}`}
                    className={`task-item ${
                      task.completed ? "completed" : ""
                    } ${
                      highlightId === `task-${task.id}` ? "highlighted" : ""
                    }`}
                    onClick={() => handleTaskDetails(task)}
                  >
                    <div
                      className="task-status"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTask(task);
                      }}
                    >
                      {task.completed ? "✓" : "○"}
                    </div>
                    <div className="task-info">
                      <div className="task-title">{task.title}</div>
                      {task.task_time && (
                        <div className="task-meta">
                          <span className="task-time">
                            {formatTime(task.task_time)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="task-actions">
                      {/* ✅ FIXED: Working edit button */}
                      <button
                        className="task-btn edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTask(e, task);
                        }}
                        title="Edit task"
                      >
                        ✏️
                      </button>
                      <button
                        className="task-btn delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        title="Delete task"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="day-empty-state">
                  <p className="day-empty-text">No tasks for this day</p>
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
