import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import TimeInput from "../Common/TimeInput";
import DetailPopup from "../Common/DetailPopup";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import { isWithinInterval, startOfWeek, endOfWeek } from "date-fns";
import "./Calendar.css";

const DayView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Global data context - add the fixed cache properties
  const {
    fetchTasksByDate,
    fetchEventsByDate,
    toggleTask,
    addNewTask,
    addNewEvent,
    deleteExistingTask,
    deleteExistingEvent,
    updateTask,
    updateEvent,
    // Add these fixed cache properties
    fixedCurrentWeekCache,
    currentWeekId,
    ensureCurrentWeekLoaded,
    forceRefreshCurrentData,
    isCacheStale,
  } = useData();

  const { showPopupFor, currentPopupItem, closePopup, completeTask } =
    useNotifications();

  // Local states for UI management
  const [date, setDate] = useState<Date | null>(null);
  const [newTask, setNewTask] = useState({ text: "", time: "" });
  const [newEvent, setNewEvent] = useState({
    title: "",
    time: "",
    type: "",
    description: "",
  });
  const [activeTab, setActiveTab] = useState<"events" | "tasks">("events");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editTaskForm, setEditTaskForm] = useState({ text: "", time: "" });
  const [editEventForm, setEditEventForm] = useState({
    title: "",
    time: "",
    type: "",
    description: "",
  });

  // Current date data
  const [currentDateTasks, setCurrentDateTasks] = useState<Task[]>([]);
  const [currentDateEvents, setCurrentDateEvents] = useState<CalendarEvent[]>(
    []
  );

  // Add state to track if the day is in current week
  const [isInCurrentWeek, setIsInCurrentWeek] = useState(false);

  // Parse date from URL
  useEffect(() => {
    try {
      const query = new URLSearchParams(location.search);
      const dateStr = query.get("date");
      const highlight = query.get("highlight");

      if (highlight) {
        setHighlightId(highlight);
        // Set the active tab based on what's being highlighted
        if (highlight.startsWith("task-")) {
          setActiveTab("tasks");
        } else if (highlight.startsWith("event-")) {
          setActiveTab("events");
        }
      }

      if (dateStr) {
        const [year, month, day] = dateStr.split("-").map(Number);
        // Create date with noon UTC time to avoid timezone issues
        const newDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        setDate(newDate);

        // Check if this day is in the current week
        const currentWeekStart = startOfWeek(new Date(currentWeekId));
        const currentWeekEnd = endOfWeek(currentWeekStart);
        setIsInCurrentWeek(
          isWithinInterval(newDate, {
            start: currentWeekStart,
            end: currentWeekEnd,
          })
        );

        // Fetch data for this date
        fetchData(dateStr);
      } else {
        // Default to today if no date provided
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        setDate(today);
        setIsInCurrentWeek(true); // Today is always in current week
        fetchData(todayStr);
      }
    } catch (err) {
      console.error("Error parsing date:", err);
      // Default to today
      const today = new Date();
      setDate(today);
      setIsInCurrentWeek(true); // Today is always in current week
      fetchData(today.toISOString().split("T")[0]);
    }
  }, [location.search, currentWeekId]);

  // Enhanced fetchData to use fixed cache for current week days
  const fetchData = async (dateStr: string) => {
    try {
      let tasksData: Task[] = [];
      let eventsData: CalendarEvent[] = [];

      // If date is in current week, check fixed cache first
      if (isInCurrentWeek && fixedCurrentWeekCache) {
        // Check if we have data in fixed cache
        const tasksInFixedCache = fixedCurrentWeekCache.tasks[dateStr];
        const eventsInFixedCache = fixedCurrentWeekCache.events[dateStr];

        if (tasksInFixedCache && eventsInFixedCache) {
          console.log(`✅ CACHE HIT (fixed): Data for ${dateStr}`);
          tasksData = tasksInFixedCache;
          eventsData = eventsInFixedCache;
        } else {
          // If not in fixed cache, ensure current week is loaded then get from API
          console.log(
            `⚠️ CACHE MISS (fixed): Data for ${dateStr}, fetching...`
          );
          await ensureCurrentWeekLoaded(); // Make sure current week is loaded
          [tasksData, eventsData] = await Promise.all([
            fetchTasksByDate(dateStr),
            fetchEventsByDate(dateStr),
          ]);
        }
      } else {
        // Not in current week, use regular API fetch with normal caching
        console.log(`📅 Regular fetch for ${dateStr} (not in current week)`);
        [tasksData, eventsData] = await Promise.all([
          fetchTasksByDate(dateStr),
          fetchEventsByDate(dateStr),
        ]);
      }

      // Set current date data
      setCurrentDateTasks(tasksData);
      setCurrentDateEvents(eventsData);

      // Scroll to highlighted item after data is loaded
      setTimeout(() => {
        if (highlightId) {
          const element = document.getElementById(highlightId);
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
            element.classList.add("highlighted");
            // Remove highlight class after animation
            setTimeout(() => {
              element.classList.remove("highlighted");
            }, 3000);
          }
          // Clear highlight ID after scrolling
          setHighlightId(null);
        }
      }, 100);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // Toggle task handler with Supabase update
  const handleToggleTask = async (task: Task) => {
    try {
      // Create a local copy with processing state for UI
      const processingTask = { ...task, isProcessing: true };

      // Update local state immediately to show processing
      setCurrentDateTasks((prev) =>
        prev.map((t) => (t.id === task.id ? processingTask : t))
      );

      // Perform the actual toggle
      const updatedTask = await toggleTask(task);

      // Update local state with the returned task
      setCurrentDateTasks((prev) =>
        prev.map((t) => (t.id === task.id ? updatedTask : t))
      );
    } catch (error) {
      console.error("Failed to toggle task:", error);

      // Revert to original state on error
      setCurrentDateTasks((prev) =>
        prev.map((t) => (t.id === task.id ? task : t))
      );
    }
  };

  // Delete task handler with Supabase update
  const handleDeleteTask = async (id: number) => {
    try {
      console.log("Deleting task:", id);

      // Show confirmation dialog
      if (!confirm("Are you sure you want to delete this task?")) {
        return;
      }

      // Use the context method for deletion
      await deleteExistingTask(id);

      // Update local state - redundant but ensures UI sync
      setCurrentDateTasks((prev) => prev.filter((task) => task.id !== id));

      console.log("Task deleted successfully");
    } catch (error) {
      console.error("Failed to delete task:", error);
      alert("Could not delete task. Please try again.");
    }
  };

  // Add update tracking to prevent doubles
  const updatingRef = useRef<Set<number>>(new Set());

  // Optimized event submit handler
  const handleEventSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    isEditing: boolean
  ) => {
    e.preventDefault();

    if (!date) return;

    const dateStr = date.toISOString().split("T")[0];
    const eventData = isEditing ? editEventForm : newEvent;

    // Validation
    if (!eventData.title.trim() || !eventData.time || !eventData.type) {
      alert("Please fill all required fields");
      return;
    }

    try {
      if (isEditing && editingEvent) {
        // Prevent double updates
        if (updatingRef.current.has(editingEvent.id)) {
          console.log("Update already in progress, skipping");
          return;
        }

        updatingRef.current.add(editingEvent.id);

        const updatedEvent = await updateEvent({
          ...editingEvent,
          title: eventData.title.trim(),
          time: eventData.time,
          type: eventData.type,
          description: eventData.description || "",
        });

        // Only update local state, don't trigger another fetch
        setCurrentDateEvents((prev) =>
          prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
        );

        setEditingEvent(null);
        updatingRef.current.delete(editingEvent.id);
      } else {
        // Create new event
        const newEventItem = await addNewEvent({
          title: eventData.title.trim(),
          date: dateStr,
          time: eventData.time,
          type: eventData.type,
          description: eventData.description || "",
        });

        // Add to local state
        setCurrentDateEvents((prev) => [...prev, newEventItem]);
        setNewEvent({ title: "", time: "", type: "", description: "" });
      }
    } catch (error) {
      console.error("Event operation failed:", error);
      alert(
        `Failed to ${isEditing ? "update" : "create"} event. Please try again.`
      );

      if (isEditing && editingEvent) {
        updatingRef.current.delete(editingEvent.id);
      }
    }
  };

  // Delete event handler
  const handleDeleteEvent = async (id: number) => {
    try {
      console.log("Deleting event:", id);

      // Show confirmation dialog
      if (!confirm("Are you sure you want to delete this event?")) {
        return;
      }

      // Use the context method for deletion
      await deleteExistingEvent(id);

      // Update local state - redundant but ensures UI sync
      setCurrentDateEvents((prev) => prev.filter((event) => event.id !== id));

      console.log("Event deleted successfully");
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert("Could not delete event. Please try again.");
    }
  };

  // Format time for display
  const formatTime = (time: string) => {
    if (!time) return "";

    // Handle "HH:MM" or "HH:MM am/pm" or "HH:MM AM/PM"
    const match = time.match(/^(\d{1,2}):(\d{2})(\s*(am|pm|AM|PM))?$/);
    if (match) {
      const hour = parseInt(match[1], 10);
      const minute = match[2];
      const ampm = match[3] ? match[3].toLowerCase() : "";

      return ampm ? `${hour}:${minute} ${ampm}` : `${hour}:${minute}`;
    }

    return time;
  };

  // Navigation between days
  const handlePrevDay = () => {
    if (!date) return;

    try {
      // Create a simple date object without time components
      const prevDay = new Date(date);
      prevDay.setDate(prevDay.getDate() - 1);

      // Format using consistent method
      const prevDayStr = prevDay.toISOString().split("T")[0];

      // Navigate with the formatted date
      navigate(`/calendar/day?date=${prevDayStr}`);
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  const handleNextDay = () => {
    if (!date) return;

    try {
      // Create a simple date object without time components
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      // Format using consistent method
      const nextDayStr = nextDay.toISOString().split("T")[0];

      // Navigate with the formatted date
      navigate(`/calendar/day?date=${nextDayStr}`);
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  // Helper functions
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

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getSectionLabel = (type: string) => {
    return `${type} for ${
      date
        ? date.toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
          })
        : "Today"
    }`;
  };

  const stats = getStats();

  // Add task details handler
  const handleTaskDetails = (task: Task) => {
    showPopupFor(task);
  };

  // Add event details handler
  const handleEventDetails = (event: CalendarEvent) => {
    showPopupFor(event);
  };

  // Handle starting to edit a task
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTaskForm({
      text: task.text,
      time: task.time || "",
    });
  };

  // Handle starting to edit an event
  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEditEventForm({
      title: event.title,
      time: event.time || "",
      type: event.type || "",
      description: event.description || "",
    });
  };

  // Handle canceling edits
  const cancelEdit = () => {
    setEditingTask(null);
    setEditingEvent(null);
  };

  // Unified handler for task submission (both add and edit)
  const handleTaskSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    isEditing: boolean
  ) => {
    e.preventDefault();

    if (!date) return;

    const dateStr = date.toISOString().split("T")[0];
    const taskData = isEditing ? editTaskForm : newTask;

    // Validation
    if (!taskData.text.trim()) {
      // Handle validation error
      return;
    }

    try {
      if (isEditing && editingTask) {
        // Update existing task
        const updatedTask: Task = {
          ...editingTask,
          text: taskData.text,
          time: taskData.time || "",
        };

        const result = await updateTask(updatedTask);

        // Update local state
        setCurrentDateTasks((prev) =>
          prev.map((task) => (task.id === editingTask.id ? result : task))
        );

        // Reset edit state
        setEditingTask(null);
        setEditTaskForm({ text: "", time: "" });
      } else {
        // Create new task
        await addNewTask({
          date: dateStr,
          text: taskData.text,
          time: taskData.time || "",
          completed: false,
        });

        // Reset form
        setNewTask({ text: "", time: "" });
      }
    } catch (error) {
      console.error("Task operation failed:", error);
    }
  };

  // Updated navigation functions
  const navigateToCompletedTasks = () => {
    const dateStr = date ? date.toISOString().split("T")[0] : "";
    navigate(`/completed-tasks?date=${dateStr}`);
  };

  const navigateToPendingTasks = () => {
    navigate("/notifications?tab=task");
  };

  const navigateToEvents = () => {
    navigate("/notifications?tab=event");
  };

  // Create a wrapper function for handleEventSubmit
  const handleEventFormSubmit = (
    e: React.FormEvent<HTMLFormElement>,
    isEditing: boolean
  ) => {
    e.preventDefault();
    handleEventSubmit(e, isEditing);
  };

  // Create a wrapper for button clicks that need to call handleEventSubmit
  const handleEventButtonSubmit = (
    e: React.MouseEvent<HTMLButtonElement>,
    isEditing: boolean
  ) => {
    e.preventDefault();
    // Create a synthetic form event or call the logic directly
    const formData = isEditing ? editEventForm : newEvent;

    // Add your validation and submission logic here
    if (!formData.title.trim() || !formData.time || !formData.type) {
      alert("Please fill all required fields");
      return;
    }

    // Call the logic without passing the event
    if (isEditing && editingEvent) {
      updateEvent({
        ...editingEvent,
        title: formData.title.trim(),
        time: formData.time,
        type: formData.type,
        description: formData.description || "",
      }).then(/* handle result */);
    } else {
      // Handle new event creation
    }
  };

  // Create a wrapper for button clicks:
  const handleTaskButtonSubmit = (
    e: React.MouseEvent<HTMLButtonElement>,
    isEditing: boolean
  ) => {
    e.preventDefault();

    if (!date) return;

    const dateStr = date.toISOString().split("T")[0];
    const taskData = isEditing ? editTaskForm : newTask;

    // Validation
    if (!taskData.text.trim()) {
      // Handle validation error
      return;
    }

    try {
      if (isEditing && editingTask) {
        // Update existing task without passing the event
        updateTask({
          ...editingTask,
          text: taskData.text,
          time: taskData.time || "",
        });
      } else {
        // Create new task without passing the event
        addNewTask({
          date: dateStr,
          text: taskData.text,
          time: taskData.time || "",
          completed: false,
        });
      }
    } catch (error) {
      console.error("Task operation failed:", error);
    }
  };

  // Return the UI
  return (
    <div className="day-view-container">
      <div className="day-view-header">
        <button className="day-nav-btn" onClick={handlePrevDay}>
          &lt; Previous Day
        </button>

        <h1 className="day-view-date">
          {date
            ? date.toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "Loading..."}
        </h1>

        <button className="day-nav-btn" onClick={handleNextDay}>
          Next Day &gt;
        </button>

        {/* Add this refresh button */}
        {isCacheStale() && (
          <button
            className="day-refresh-btn"
            onClick={forceRefreshCurrentData}
            title="Refresh data"
          >
            Refresh Data
          </button>
        )}
      </div>

      <div className="day-view-stats">
        <div
          className="day-stat-card events"
          onClick={navigateToEvents}
          role="button"
          tabIndex={0}
        >
          <div className="day-stat-icon">📅</div>
          <div className="day-stat-content">
            <div className="day-stat-value">{stats.events}</div>
            <div className="day-stat-label">Events</div>
          </div>
        </div>

        <div
          className="day-stat-card pending"
          onClick={navigateToPendingTasks}
          role="button"
          tabIndex={0}
        >
          <div className="day-stat-icon">⏱️</div>
          <div className="day-stat-content">
            <div className="day-stat-value">{stats.pendingTasks}</div>
            <div className="day-stat-label">Pending Tasks</div>
          </div>
        </div>

        <div
          className="day-stat-card completed"
          onClick={navigateToCompletedTasks}
          role="button"
          tabIndex={0}
        >
          <div className="day-stat-icon">✓</div>
          <div className="day-stat-content">
            <div className="day-stat-value">{stats.completedTasks}</div>
            <div className="day-stat-label">Completed Tasks</div>
          </div>
        </div>
      </div>

      <div className="day-view-tabs">
        <button
          className={`day-view-tab ${activeTab === "events" ? "active" : ""}`}
          onClick={() => setActiveTab("events")}
        >
          Events
        </button>
        <button
          className={`day-view-tab ${activeTab === "tasks" ? "active" : ""}`}
          onClick={() => setActiveTab("tasks")}
        >
          Tasks
        </button>
      </div>

      <div className="day-view-content">
        {activeTab === "events" ? (
          <div className="day-view-section">
            <div className="day-section-header">
              <h2 className="day-section-title">{getSectionLabel("Events")}</h2>
            </div>

            <form
              onSubmit={(e) => handleEventFormSubmit(e, false)}
              className="day-form"
            >
              <div className="day-form-grid">
                <div className="day-form-group">
                  <label htmlFor="event-title">Title</label>
                  <input
                    type="text"
                    id="event-title"
                    value={newEvent.title}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, title: e.target.value })
                    }
                    required
                    className="day-form-input"
                    placeholder="Event title"
                  />
                </div>
                <div className="day-form-group">
                  <label htmlFor="event-type">Type</label>
                  <select
                    id="event-type"
                    value={newEvent.type}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, type: e.target.value })
                    }
                    required
                    className="day-form-select"
                  >
                    <option value="">Select type</option>
                    <option value="meeting">Meeting</option>
                    <option value="personal">Personal</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>
                <div className="day-form-group">
                  <label htmlFor="event-time">Time</label>
                  <TimeInput
                    value={newEvent.time}
                    onChange={(time) => setNewEvent({ ...newEvent, time })}
                  />
                </div>
                <div className="day-form-group full-width">
                  <label htmlFor="event-description">Description</label>
                  <textarea
                    id="event-description"
                    value={newEvent.description}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, description: e.target.value })
                    }
                    className="day-form-input"
                    placeholder="Optional description"
                    rows={3}
                  ></textarea>
                </div>
              </div>

              <button
                type="submit"
                disabled={!newEvent.title || !newEvent.time || !newEvent.type}
                className="day-form-btn"
              >
                Add Event
              </button>
            </form>

            {currentDateEvents.length > 0 ? (
              <ul className="day-list">
                {currentDateEvents.map((event, index) => {
                  // Create a truly unique key by including index and timestamp
                  const uniqueKey = `event-${event.id}-${index}-${Date.now()}`;

                  return (
                    <li
                      key={uniqueKey}
                      className={`event-item event-${event.type}`}
                      id={`event-${event.id}`}
                    >
                      {editingEvent && editingEvent.id === event.id ? (
                        // Edit mode
                        <div
                          className="event-edit-form"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="edit-form-grid">
                            <input
                              type="text"
                              value={editEventForm.title}
                              onChange={(e) => {
                                e.stopPropagation(); // Prevent event bubbling
                                setEditEventForm({
                                  ...editEventForm,
                                  title: e.target.value,
                                });
                              }}
                              className="day-form-input"
                              placeholder="Event title"
                              autoFocus // Add autofocus to improve UX
                            />

                            <select
                              value={editEventForm.type}
                              onChange={(e) => {
                                e.stopPropagation(); // Prevent event bubbling
                                setEditEventForm({
                                  ...editEventForm,
                                  type: e.target.value,
                                });
                              }}
                              className="day-form-select"
                              onClick={(e) => e.stopPropagation()} // Prevent select from closing the form
                            >
                              <option value="">Select type</option>
                              <option value="meeting">Meeting</option>
                              <option value="personal">Personal</option>
                              <option value="reminder">Reminder</option>
                            </select>

                            <div
                              className="time-input-wrapper"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <TimeInput
                                value={editEventForm.time}
                                onChange={(time) => {
                                  setEditEventForm({
                                    ...editEventForm,
                                    time,
                                  });
                                }}
                                placeholder="Event time (HH:MM)"
                              />
                            </div>

                            <textarea
                              value={editEventForm.description}
                              onChange={(e) => {
                                e.stopPropagation(); // Prevent event bubbling
                                setEditEventForm({
                                  ...editEventForm,
                                  description: e.target.value,
                                });
                              }}
                              className="day-form-input"
                              placeholder="Description"
                              rows={3}
                              onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling
                            ></textarea>
                          </div>

                          <div className="edit-form-actions">
                            <button
                              type="button"
                              className="edit-save-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEventButtonSubmit(e, true); // Use the button wrapper instead
                              }}
                            >
                              Save
                            </button>
                            <button
                              type="button" // Add this to explicitly mark it as a button
                              onClick={(e) => handleEventButtonSubmit(e, true)}
                              className="form-cancel-btn"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Display mode
                        <>
                          <div className="event-time">
                            <div className="event-time-value">
                              {formatTime(event.time)}
                            </div>
                          </div>
                          <div
                            className="event-info"
                            onClick={() => handleEventDetails(event)}
                          >
                            <div className="event-title">{event.title}</div>
                            <div className="event-meta">
                              <div className="event-date">
                                {formatDateDisplay(event.date)}
                              </div>
                              <div className="event-type">{event.type}</div>
                            </div>
                          </div>
                          <div className="event-actions">
                            <button
                              className="event-btn edit"
                              onClick={() => handleEditEvent(event)}
                              title="Edit event"
                            >
                              ✎
                            </button>
                            <button
                              className="event-btn delete"
                              onClick={() => handleDeleteEvent(event.id)}
                              title="Delete event"
                            >
                              🗑️
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="day-empty-state">
                <div className="day-empty-icon">📅</div>
                <div className="day-empty-text">No events for this day</div>
                <button
                  className="day-empty-btn"
                  onClick={() => setActiveTab("events")}
                >
                  Add Your First Event
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="day-view-section">
            <div className="day-section-header">
              <h2 className="day-section-title">{getSectionLabel("Tasks")}</h2>
              <button
                className="view-completed-btn"
                onClick={navigateToCompletedTasks}
              >
                View Completed
              </button>
            </div>

            <form
              onSubmit={(e) => handleTaskSubmit(e, false)}
              className="day-form"
            >
              <div className="day-form-grid">
                <input
                  type="text"
                  value={newTask.text}
                  onChange={(e) =>
                    setNewTask((prev) => ({ ...prev, text: e.target.value }))
                  }
                  placeholder="Task description"
                  className="day-form-input"
                />

                <div className="day-form-group">
                  {/* Use the TimeInput component for task time too */}
                  <TimeInput
                    value={newTask.time}
                    onChange={(time) =>
                      setNewTask((prev) => ({ ...prev, time }))
                    }
                    placeholder="Time by ... (24h)"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!newTask.text.trim()}
                className="day-form-btn"
              >
                Add Task
              </button>
            </form>

            {currentDateTasks.length > 0 ? (
              <ul className="day-list">
                {currentDateTasks.map((task) => {
                  // Create a truly unique key for each task item
                  const taskKey = `task-list-${task.id}-${activeTab}`;

                  return (
                    <li
                      key={taskKey}
                      className={`task-item ${
                        task.completed ? "completed" : ""
                      }`}
                      id={`task-${task.id}`}
                    >
                      {editingTask && editingTask.id === task.id ? (
                        // Edit mode
                        <div className="task-edit-form">
                          <div className="edit-form-grid">
                            <input
                              type="text"
                              value={editTaskForm.text}
                              onChange={(e) =>
                                setEditTaskForm({
                                  ...editTaskForm,
                                  text: e.target.value,
                                })
                              }
                              className="day-form-input"
                              placeholder="Task description"
                            />

                            <TimeInput
                              value={editTaskForm.time}
                              onChange={(time) =>
                                setEditTaskForm({
                                  ...editTaskForm,
                                  time,
                                })
                              }
                              placeholder="Task time (optional)"
                            />
                          </div>

                          <div className="edit-form-actions">
                            <button
                              type="button"
                              className="edit-save-btn"
                              onClick={(e) => handleTaskButtonSubmit(e, true)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="edit-cancel-btn"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Display mode
                        <>
                          <div
                            className="task-status"
                            onClick={() => handleToggleTask(task)}
                          >
                            {task.completed ? "✓" : "○"}
                          </div>
                          <div
                            className="task-info"
                            onClick={() => handleTaskDetails(task)}
                          >
                            <div className="task-title">{task.text}</div>
                            <div className="task-meta">
                              {task.time && (
                                <div className="task-time">
                                  {formatTime(task.time)}
                                </div>
                              )}
                              <div className="task-date">
                                {formatDateDisplay(task.date)}
                              </div>
                            </div>
                          </div>
                          <div className="task-actions">
                            <button
                              className="task-btn edit"
                              onClick={() => handleEditTask(task)}
                              title="Edit task"
                            >
                              ✎
                            </button>
                            <button
                              className="task-btn delete"
                              onClick={() => handleDeleteTask(task.id)}
                              title="Delete task"
                            >
                              🗑️
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="day-empty-state">
                <div className="day-empty-icon">✓</div>
                <div className="day-empty-text">No tasks for this day</div>
                <button
                  className="day-empty-btn"
                  onClick={() => setActiveTab("tasks")}
                >
                  Add Your First Task
                </button>
              </div>
            )}
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
