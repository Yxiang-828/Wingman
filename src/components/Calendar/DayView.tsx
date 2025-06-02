import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import {
  getTodayDateString,
  formatDateToString,
  parseLocalDateString,
  getCurrentTimeString,
} from "../../utils/timeUtils";
import { getCurrentUserId } from "../../utils/auth";
import DetailPopup from "../Common/DetailPopup";
import TimeInput from "../Common/TimeInput"; // ✅ FIX: Proper TimeInput import
import "./Calendar.css";

const DayView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

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

  // State
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

  const [currentDateTasks, setCurrentDateTasks] = useState<Task[]>([]);
  const [currentDateEvents, setCurrentDateEvents] = useState<CalendarEvent[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [realCounts, setRealCounts] = useState({
    tasks: 0,
    events: 0,
  });

  // Sort tasks by time
  const { pendingTasks, failedTasks } = useMemo(() => {
    const pending = currentDateTasks
      .filter((task) => !task.completed && !task.failed)
      .sort((a, b) => {
        if (a.task_time && b.task_time) {
          return a.task_time.localeCompare(b.task_time);
        }
        if (a.task_time && !b.task_time) return -1;
        if (!a.task_time && b.task_time) return 1;
        return (
          new Date(a.created_at || "").getTime() -
          new Date(b.created_at || "").getTime()
        );
      });

    const failed = currentDateTasks
      .filter((task) => task.failed && !task.completed)
      .sort((a, b) => {
        if (a.task_time && b.task_time) {
          return a.task_time.localeCompare(b.task_time);
        }
        if (a.task_time && !b.task_time) return -1;
        if (!a.task_time && b.task_time) return 1;
        return (
          new Date(a.created_at || "").getTime() -
          new Date(b.created_at || "").getTime()
        );
      });

    return { pendingTasks: pending, failedTasks: failed };
  }, [currentDateTasks]);

  // Parse date from URL
  useEffect(() => {
    try {
      const query = new URLSearchParams(location.search);
      const dateParam = query.get("date");

      if (dateParam) {
        const parsedDate = parseLocalDateString(dateParam);
        setDate(parsedDate);
      } else {
        setDate(new Date());
      }
    } catch (err) {
      console.error("Error parsing date from URL:", err);
      setDate(new Date());
    }
  }, [location.search]);

  // Fetch data when date changes
  useEffect(() => {
    if (!date) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const userId = getCurrentUserId();
        if (!userId) {
          console.log("DayView: No user authenticated");
          setLoading(false);
          return;
        }

        const dateStr = formatDateToString(date);
        console.log(`📅 DayView: Loading data for ${dateStr} (direct SQLite)`);

        const [tasksData, eventsData] = await Promise.all([
          window.electronAPI.db.getTasks(userId, dateStr),
          window.electronAPI.db.getEvents(userId, dateStr),
        ]);

        setCurrentDateTasks(tasksData || []);
        setCurrentDateEvents(eventsData || []);
        setRealCounts({
          tasks: (tasksData || []).length,
          events: (eventsData || []).length,
        });

        console.log(
          `✅ DayView: Loaded ${(tasksData || []).length} tasks, ${
            (eventsData || []).length
          } events`
        );
      } catch (error) {
        console.error("DayView data fetch error:", error);
        setError("Failed to load data");
        setCurrentDateTasks([]);
        setCurrentDateEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [date]);

  // Set active tab from URL
  useEffect(() => {
    try {
      const query = new URLSearchParams(location.search);
      const tabParam = query.get("tab");
      if (tabParam === "tasks" || tabParam === "events") {
        setActiveTab(tabParam);
      }
    } catch (err) {
      console.error("Error parsing tab from URL:", err);
    }
  }, [location.search]);

  // Navigation handlers
  const handlePrevDay = useCallback(() => {
    if (!date) return;
    try {
      const prevDay = new Date(date);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDateStr = formatDateToString(prevDay);
      navigate(`/calendar/day?date=${prevDateStr}&tab=${activeTab}`);
    } catch (error) {
      console.error("Error navigating to previous day:", error);
    }
  }, [date, navigate, activeTab]);

  const handleNextDay = useCallback(() => {
    if (!date) return;
    try {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDateStr = formatDateToString(nextDay);
      navigate(`/calendar/day?date=${nextDateStr}&tab=${activeTab}`);
    } catch (error) {
      console.error("Error navigating to next day:", error);
    }
  }, [date, navigate, activeTab]);

  // Task submission
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
        await updateTask({
          ...editingTask,
          title: taskData.title,
          task_time: taskData.task_time,
          updated_at: new Date().toISOString(),
        });
        setEditingTask(null);
        setEditTaskForm({ title: "", task_time: "" });
      } else {
        await createTask({
          title: taskData.title,
          task_date,
          task_time: taskData.task_time,
          completed: false,
          failed: false,
        });
        setNewTask({ title: "", task_time: "" });
      }

      // Refresh data
      const userId = getCurrentUserId();
      if (userId) {
        const [tasksData] = await Promise.all([
          window.electronAPI.db.getTasks(userId, task_date),
        ]);
        setCurrentDateTasks(tasksData || []);
      }
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Failed to save task. Please try again.");
    }
  };

  // Event submission
  const handleEventSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    isEditing: boolean
  ) => {
    e.preventDefault();
    if (!date) return;

    const event_date = formatDateToString(date);
    const eventData = isEditing ? editEventForm : newEvent;

    if (!eventData.title.trim()) {
      alert("Please enter an event title");
      return;
    }

    try {
      if (isEditing && editingEvent) {
        await updateEvent({
          ...editingEvent,
          title: eventData.title,
          event_time: eventData.event_time,
          type: eventData.type,
          description: eventData.description,
          updated_at: new Date().toISOString(),
        });
        setEditingEvent(null);
        setEditEventForm({ title: "", event_time: "", type: "", description: "" });
      } else {
        await createEvent({
          title: eventData.title,
          event_date,
          event_time: eventData.event_time,
          type: eventData.type,
          description: eventData.description,
        });
        setNewEvent({ title: "", event_time: "", type: "", description: "" });
      }

      // Refresh data
      const userId = getCurrentUserId();
      if (userId) {
        const [eventsData] = await Promise.all([
          window.electronAPI.db.getEvents(userId, event_date),
        ]);
        setCurrentDateEvents(eventsData || []);
      }
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Failed to save event. Please try again.");
    }
  };

  const handleToggleTask = async (task: Task) => {
    try {
      await toggleTask(task);
      const userId = getCurrentUserId();
      if (userId && date) {
        const dateStr = formatDateToString(date);
        const [tasksData] = await Promise.all([
          window.electronAPI.db.getTasks(userId, dateStr),
        ]);
        setCurrentDateTasks(tasksData || []);
      }
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      await deleteTask(id);
      const userId = getCurrentUserId();
      if (userId && date) {
        const dateStr = formatDateToString(date);
        const [tasksData] = await Promise.all([
          window.electronAPI.db.getTasks(userId, dateStr),
        ]);
        setCurrentDateTasks(tasksData || []);
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      await deleteEvent(id);
      const userId = getCurrentUserId();
      if (userId && date) {
        const dateStr = formatDateToString(date);
        const [eventsData] = await Promise.all([
          window.electronAPI.db.getEvents(userId, dateStr),
        ]);
        setCurrentDateEvents(eventsData || []);
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  // Helper functions
  const formatTime = (time: string) => {
    if (!time) return "";

    try {
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return time;
    }
  };

  const getStats = () => {
    const totalTasks = currentDateTasks.length;
    const completedTasks = currentDateTasks.filter((t) => t.completed).length;
    const totalEvents = currentDateEvents.length;

    return {
      totalTasks,
      completedTasks,
      pendingTasks: totalTasks - completedTasks,
      totalEvents,
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
    setEditTaskForm({
      title: task.title,
      task_time: task.task_time || "",
    });
    setEditingTask(task);
    setActiveTab("tasks");
    document.querySelector(".day-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleEditEvent = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setEditEventForm({
      title: event.title,
      event_time: event.event_time || "",
      type: event.type || "",
      description: event.description || "",
    });
    setEditingEvent(event);
    setActiveTab("events");
    document.querySelector(".day-form")?.scrollIntoView({ behavior: "smooth" });
  };

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

  // ✅ NEW: Add refresh function
  const refreshDayView = useCallback(async () => {
    if (!date) return;

    try {
      setLoading(true);
      const today = formatDateToString(date);
      const userId = getCurrentUserId();
      
      if (!userId) return;

      const [tasksData, eventsData] = await Promise.all([
        window.electronAPI.db.getTasks(userId, today),
        window.electronAPI.db.getEvents(userId, today),
      ]);

      setCurrentDateTasks(tasksData || []);
      setCurrentDateEvents(eventsData || []);
      
      console.log(`✅ DayView: Refreshed data - ${tasksData?.length || 0} tasks, ${eventsData?.length || 0} events`);
    } catch (error) {
      console.error("❌ DayView refresh error:", error);
    } finally {
      setLoading(false);
    }
  }, [date]);

  // ✅ NEW: Listen for retry mission refresh events
  useEffect(() => {
    const handleRetryRefresh = () => {
      console.log("🔄 DayView: Retry mission refresh triggered");
      refreshDayView();
    };

    window.addEventListener("retry-mission-refresh", handleRetryRefresh);
    window.addEventListener("dashboard-refresh", handleRetryRefresh);
    window.addEventListener("notifications-refresh", handleRetryRefresh);
    
    return () => {
      window.removeEventListener("retry-mission-refresh", handleRetryRefresh);
      window.removeEventListener("dashboard-refresh", handleRetryRefresh);
      window.removeEventListener("notifications-refresh", handleRetryRefresh);
    };
  }, [refreshDayView]);

  // ✅ ADD: Auto-detect failed tasks every minute (copy from Notifications)
  useEffect(() => {
    if (!date) return;

    const checkForFailedTasks = async () => {
      const userId = getCurrentUserId();
      if (!userId) return;

      try {
        const dateStr = formatDateToString(date);
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        console.log(`⏰ DayView: Checking for failed tasks at ${currentTime}`);
        
        // Get tasks for this date
        const tasks = await window.electronAPI.db.getTasks(userId, dateStr);
        
        let updatedCount = 0;
        
        // Check each task for failure (only for today's date)
        if (dateStr === getTodayDateString()) {
          for (const task of tasks || []) {
            if (!task.completed && !task.failed && task.task_time && 
                task.task_time !== 'All day' && task.task_time < currentTime) {
              
              // Mark as failed in database
              await window.electronAPI.db.updateTask(task.id, {
                failed: true,
                updated_at: new Date().toISOString()
              });
              
              updatedCount++;
              console.log(`❌ DayView: Marked task ${task.id} as failed (${task.task_time} < ${currentTime})`);
            }
          }
        }
        
        if (updatedCount > 0) {
          console.log(`⏰ DayView: Auto-marked ${updatedCount} tasks as failed, refreshing day view`);
          // Refresh day view data to show updated failed status
          setCurrentDateTasks(tasks || []);
        }
        
      } catch (error) {
        console.error('❌ DayView: Error checking failed tasks:', error);
      }
    };

    // Check immediately when date changes
    checkForFailedTasks();
    
    // Then check every minute
    const interval = setInterval(checkForFailedTasks, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [date]);

  // Loading state
  if (loading) {
    return (
      <div className="day-view-container">
        <div className="day-view-loading">
          <div className="loading-spinner"></div>
          <p>Loading day data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="day-view-container">
        <div className="day-view-error">
          <p>Error: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (!date) {
    return (
      <div className="day-view-container">
        <div className="day-view-loading">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="day-view-container">
      <div className="day-view-header">
        <div className="day-view-date">
          <h1>{format(date, "EEEE, MMMM d, yyyy")}</h1>
          <div className="day-view-navigation">
            <button className="day-nav-btn" onClick={handlePrevDay}>
              ← Previous
            </button>
            <button
              className="day-nav-btn today-btn"
              onClick={() => navigate(`/calendar/day?tab=${activeTab}`)}
            >
              Today
            </button>
            <button className="day-nav-btn" onClick={handleNextDay}>
              Next →
            </button>
          </div>
        </div>
      </div>

      <div className="day-view-stats">
        <div className="day-stat-card" onClick={navigateToNotificationsTasks}>
          <div className="day-stat-icon">📝</div>
          <div className="day-stat-content">
            <div className="day-stat-value">{stats.pendingTasks}</div>
            <div className="day-stat-label">Pending Tasks</div>
          </div>
        </div>

        <div className="day-stat-card" onClick={navigateToNotificationsEvents}>
          <div className="day-stat-icon">📅</div>
          <div className="day-stat-content">
            <div className="day-stat-value">{stats.totalEvents}</div>
            <div className="day-stat-label">Events</div>
          </div>
        </div>

        <div className="day-stat-card" onClick={navigateToCompletedTasks}>
          <div className="day-stat-icon">✅</div>
          <div className="day-stat-content">
            <div className="day-stat-value">{stats.completedTasks}</div>
            <div className="day-stat-label">Completed</div>
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
          Tasks ({pendingTasks.length + failedTasks.length})
        </button>
      </div>

      <div className="day-view-content">
        {activeTab === "events" && (
          <div className="day-view-section">
            <div className="day-section-header">
              <h3 className="day-section-title">
                Events ({currentDateEvents.length})
              </h3>
            </div>

            <form
              onSubmit={(e) => handleEventSubmit(e, !!editingEvent)}
              className="day-form"
            >
              <div className="day-form-grid">
                <div className="day-form-group">
                  <input
                    type="text"
                    placeholder="Event title"
                    value={editingEvent ? editEventForm.title : newEvent.title}
                    onChange={(e) => {
                      if (editingEvent) {
                        setEditEventForm({ ...editEventForm, title: e.target.value });
                      } else {
                        setNewEvent({ ...newEvent, title: e.target.value });
                      }
                    }}
                    className="day-form-input"
                    required
                  />
                </div>
                <div className="day-form-group">
                  {/* ✅ FIX: Use TimeInput component for events */}
                  <TimeInput
                    value={editingEvent ? editEventForm.event_time : newEvent.event_time}
                    onChange={(time) => {
                      if (editingEvent) {
                        setEditEventForm({ ...editEventForm, event_time: time });
                      } else {
                        setNewEvent({ ...newEvent, event_time: time });
                      }
                    }}
                    placeholder="Event time"
                    className="day-form-input"
                  />
                </div>
                <div className="day-form-group">
                  <select
                    value={editingEvent ? editEventForm.type : newEvent.type}
                    onChange={(e) => {
                      if (editingEvent) {
                        setEditEventForm({ ...editEventForm, type: e.target.value });
                      } else {
                        setNewEvent({ ...newEvent, type: e.target.value });
                      }
                    }}
                    className="day-form-select"
                  >
                    <option value="">Select type</option>
                    <option value="meeting">Meeting</option>
                    <option value="personal">Personal</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>
              </div>
              <div className="day-form-group">
                <textarea
                  placeholder="Description (optional)"
                  value={editingEvent ? editEventForm.description : newEvent.description}
                  onChange={(e) => {
                    if (editingEvent) {
                      setEditEventForm({ ...editEventForm, description: e.target.value });
                    } else {
                      setNewEvent({ ...newEvent, description: e.target.value });
                    }
                  }}
                  className="day-form-input"
                  rows={2}
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

            <div className="day-list">
              {currentDateEvents.map((event) => (
                <div
                  key={event.id}
                  className={`event-item ${event.type || ""}`}
                >
                  <div className="event-info">
                    <div className="event-title">{event.title}</div>
                    <div className="event-meta">
                      {event.event_time && (
                        <span className="event-time">
                          {formatTime(event.event_time)}
                        </span>
                      )}
                      {event.type && (
                        <span className="event-type">{event.type}</span>
                      )}
                    </div>
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
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {currentDateEvents.length === 0 && (
                <div className="day-empty-state">
                  <div className="day-empty-icon">📅</div>
                  <p className="day-empty-text">No events for today</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="day-view-section">
            <div className="day-section-header">
              <h3 className="day-section-title">
                Tasks ({pendingTasks.length + failedTasks.length})
              </h3>
            </div>

            <form
              onSubmit={(e) => handleTaskSubmit(e, !!editingTask)}
              className="day-form"
            >
              <div className="day-form-grid">
                <div className="day-form-group">
                  <input
                    type="text"
                    placeholder="Task title"
                    value={editingTask ? editTaskForm.title : newTask.title}
                    onChange={(e) => {
                      if (editingTask) {
                        setEditTaskForm({ ...editTaskForm, title: e.target.value });
                      } else {
                        setNewTask({ ...newTask, title: e.target.value });
                      }
                    }}
                    className="day-form-input"
                    required
                  />
                </div>
                <div className="day-form-group">
                  {/* ✅ FIX: Use TimeInput component for tasks */}
                  <TimeInput
                    value={editingTask ? editTaskForm.task_time : newTask.task_time}
                    onChange={(time) => {
                      if (editingTask) {
                        setEditTaskForm({ ...editTaskForm, task_time: time });
                      } else {
                        setNewTask({ ...newTask, task_time: time });
                      }
                    }}
                    placeholder="Task time"
                    className="day-form-input"
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

            <div className="day-list">
              {/* Pending tasks */}
              {pendingTasks.map((task) => (
                <div key={task.id} className="task-item">
                  <div
                    className="task-status"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTask(task);
                    }}
                    title="Mark as completed"
                  >
                    {task.completed ? "✓" : "○"}
                  </div>

                  <div className="task-info">
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      {task.task_time && (
                        <span className="task-time">
                          {formatTime(task.task_time)}
                        </span>
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
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {/* Failed tasks */}
              {failedTasks.map((task) => (
                <div key={task.id} className="task-item failed">
                  <div className="task-status failed" title="Failed task">
                    ✗
                  </div>

                  <div className="task-info">
                    <div className="task-title failed">{task.title}</div>
                    <div className="task-meta">
                      {task.task_time && (
                        <span className="task-time">
                          {formatTime(task.task_time)}
                        </span>
                      )}
                      <span className="failed-label">Failed</span>
                    </div>
                  </div>

                  <div className="task-actions">
                    <button
                      className="task-btn retry"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskDetails(task);
                      }}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ))}

              {pendingTasks.length === 0 && failedTasks.length === 0 && (
                <div className="day-empty-state">
                  <div className="day-empty-icon">📝</div>
                  <p className="day-empty-text">No tasks for today</p>
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