import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import { updateTask } from "../../api/Task";
import { updateEvent } from "../../api/Calendar";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import TimeInput from "../Common/TimeInput"; // Import the TimeInput component
import DetailPopup from "../Common/DetailPopup";
import "./Calendar.css";

const DayView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Global data context
  const {
    tasks,
    events,
    setTasks,
    setEvents,
    toggleTask,
    fetchTasksByDate,
    fetchEventsByDate,
    addNewTask,
    addNewEvent,
    updateExistingTask,
    updateExistingEvent,
    deleteExistingTask,
    deleteExistingEvent,
  } = useData();

  const { showPopupFor, currentPopupItem, closePopup, completeTask } =
    useNotifications();

  // Local states for UI management
  const [date, setDate] = useState<Date | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
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
        // Fetch data for this date
        fetchData(dateStr);
      } else {
        // Default to today if no date provided
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        setDate(today);
        fetchData(todayStr);
      }
    } catch (err) {
      console.error("Error parsing date:", err);
      setDateError("Invalid date format in URL");
      // Default to today
      const today = new Date();
      setDate(today);
      fetchData(today.toISOString().split("T")[0]);
    }
  }, [location.search]);

  // Fetch data for a specific date
  const fetchData = async (dateStr: string) => {
    try {
      const tasksData = await fetchTasksByDate(dateStr);
      const eventsData = await fetchEventsByDate(dateStr);

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

  // Add task handler
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !newTask.text.trim()) return;

    const dateStr = date.toISOString().split("T")[0];

    try {
      console.log("Adding task to Supabase:", {
        date: dateStr,
        text: newTask.text,
        time: newTask.time || "",
        completed: false,
      });

      const task = await addNewTask({
        date: dateStr,
        text: newTask.text,
        time: newTask.time || "",
        completed: false,
      });

      // Update current date tasks
      setCurrentDateTasks((prev) => [...prev, task]);

      // Reset form
      setNewTask({ text: "", time: "" });
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  };

  // Toggle task handler with Supabase update
  const handleToggleTask = async (task: Task) => {
    try {
      const updatedTask = await toggleTask(task);

      // Update local state for current view
      setCurrentDateTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, completed: !t.completed } : t
        )
      );
    } catch (error) {
      console.error("Failed to toggle task:", error);
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

  // Unified handler for event submission (both add and edit)
  const handleEventSubmit = async (e: React.FormEvent, isEditing: boolean) => {
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
        console.log("Updating existing event:", {
          ...editingEvent,
          ...eventData,
        });

        // Update existing event
        const updatedEvent = await updateEvent({
          ...editingEvent,
          title: eventData.title.trim(),
          time: eventData.time,
          type: eventData.type,
          description: eventData.description || "",
        });

        // Update local state - redundant with context but ensures UI sync
        setCurrentDateEvents((prev) =>
          prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
        );

        // Clear editing state
        setEditingEvent(null);

        console.log("Event updated successfully:", updatedEvent);
      } else {
        console.log("Adding new event to Supabase:", {
          title: eventData.title,
          date: dateStr,
          time: eventData.time,
          type: eventData.type,
          description: eventData.description || "",
        });

        // Create new event
        const newEventItem = await addNewEvent({
          title: eventData.title.trim(),
          date: dateStr,
          time: eventData.time,
          type: eventData.type,
          description: eventData.description || "",
        });

        // Update local state
        setCurrentDateEvents((prev) => [...prev, newEventItem]);

        // Reset form
        setNewEvent({ title: "", time: "", type: "", description: "" });

        console.log("Event added successfully:", newEventItem);
      }
    } catch (error) {
      console.error("Event operation failed:", error);
      alert(
        `Failed to ${isEditing ? "update" : "create"} event. Please try again.`
      );
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

  // Handle saving task edits
  const handleSaveTaskEdit = async () => {
    if (!editingTask) return;

    try {
      const updatedTask = {
        ...editingTask,
        text: editTaskForm.text.trim(),
        time: editTaskForm.time,
      };

      console.log("Saving updated task:", updatedTask);

      // Use the updateTask function
      const result = await updateTask(updatedTask);

      // Update local state
      setCurrentDateTasks((prev) =>
        prev.map((task) =>
          task.id === result.id ? { ...task, ...result } : task
        )
      );

      // Clear editing state
      setEditingTask(null);
    } catch (error) {
      console.error("Failed to update task:", error);
      alert("Could not update task. Please try again.");
    }
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

  // Handle saving event edits
  const handleSaveEventEdit = async () => {
    if (!editingEvent) return;

    try {
      // Start with a copy of the original event
      const updatedEvent = {
        ...editingEvent,
        title: editEventForm.title.trim(),
        time: editEventForm.time,
        type: editEventForm.type,
        description: editEventForm.description || "",
      };

      console.log("Saving updated event:", updatedEvent);

      // Use the updateEvent function
      const result = await updateEvent(updatedEvent);

      // Update local state
      setCurrentDateEvents((prev) =>
        prev.map((event) =>
          event.id === result.id ? { ...event, ...result } : event
        )
      );

      // Clear editing state
      setEditingEvent(null);
    } catch (error) {
      console.error("Failed to update event:", error);
      // Show user-friendly error
      alert("Could not update event. Please try again.");
    }
  };

  // Handle canceling edits
  const cancelEdit = () => {
    setEditingTask(null);
    setEditingEvent(null);
  };

  // Unified handler for task submission (both add and edit)
  const handleTaskSubmit = async (e: React.FormEvent, isEditing: boolean) => {
    e.preventDefault();

    if (!date) return;

    const dateStr = date.toISOString().split("T")[0];
    const taskData = isEditing ? editTaskForm : newTask;

    // Validation
    if (!taskData.text.trim()) {
      alert("Please enter a task description");
      return;
    }

    try {
      if (isEditing && editingTask) {
        console.log("Updating existing task:", {
          ...editingTask,
          text: taskData.text.trim(),
          time: taskData.time || "",
        });

        // Update existing task
        const updatedTask = await updateExistingTask({
          ...editingTask,
          text: taskData.text.trim(),
          time: taskData.time || "",
        });

        // Update local state
        setCurrentDateTasks((prev) =>
          prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
        );

        // Clear editing state
        setEditingTask(null);

        console.log("Task updated successfully:", updatedTask);
      } else {
        console.log("Adding task to Supabase:", {
          date: dateStr,
          text: taskData.text.trim(),
          time: taskData.time || "",
          completed: false,
        });

        // Create new task
        const newTaskItem = await addNewTask({
          date: dateStr,
          text: taskData.text.trim(),
          time: taskData.time || "",
          completed: false,
        });

        // Update local state
        setCurrentDateTasks((prev) => [...prev, newTaskItem]);

        // Reset form
        setNewTask({ text: "", time: "" });

        console.log("Task added successfully:", newTaskItem);
      }
    } catch (error) {
      console.error("Task operation failed:", error);
      alert(
        `Failed to ${isEditing ? "update" : "create"} task. Please try again.`
      );
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
      </div>

      <div className="day-view-stats">
        <div className="day-stat-card">
          <div className="day-stat-icon">📅</div>
          <div className="day-stat-content">
            <div className="day-stat-value">{stats.events}</div>
            <div className="day-stat-label">Events</div>
          </div>
        </div>

        <div className="day-stat-card">
          <div className="day-stat-icon">✓</div>
          <div className="day-stat-content">
            <div className="day-stat-value">{stats.completedTasks}</div>
            <div className="day-stat-label">Completed</div>
          </div>
        </div>

        <div className="day-stat-card">
          <div className="day-stat-icon">⏳</div>
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
              onSubmit={(e) => handleEventSubmit(e, false)}
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
                {currentDateEvents.map((event) => (
                  <li
                    key={event.id}
                    className={`event-item event-${event.type}`}
                    id={`event-${event.id}`}
                  >
                    {editingEvent && editingEvent.id === event.id ? (
                      // Edit mode
                      <div className="event-edit-form">
                        <div className="edit-form-grid">
                          <input
                            type="text"
                            value={editEventForm.title}
                            onChange={(e) =>
                              setEditEventForm({
                                ...editEventForm,
                                title: e.target.value,
                              })
                            }
                            className="day-form-input"
                            placeholder="Event title"
                          />

                          <select
                            value={editEventForm.type}
                            onChange={(e) =>
                              setEditEventForm({
                                ...editEventForm,
                                type: e.target.value,
                              })
                            }
                            className="day-form-select"
                          >
                            <option value="">Select type</option>
                            <option value="meeting">Meeting</option>
                            <option value="personal">Personal</option>
                            <option value="reminder">Reminder</option>
                          </select>

                          <TimeInput
                            value={editEventForm.time}
                            onChange={(time) =>
                              setEditEventForm({
                                ...editEventForm,
                                time,
                              })
                            }
                            placeholder="Event time (HH:MM)"
                          />

                          <textarea
                            value={editEventForm.description}
                            onChange={(e) =>
                              setEditEventForm({
                                ...editEventForm,
                                description: e.target.value,
                              })
                            }
                            className="day-form-input"
                            placeholder="Description"
                            rows={3}
                          ></textarea>
                        </div>

                        <div className="edit-form-actions">
                          <button
                            type="button"
                            className="edit-save-btn"
                            onClick={(e) => handleEventSubmit(e, true)}
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
                ))}
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
                {currentDateTasks.map((task) => (
                  <li
                    key={task.id}
                    className={`task-item ${task.completed ? "completed" : ""}`}
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
                            onClick={(e) => handleTaskSubmit(e, true)}
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
                ))}
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
