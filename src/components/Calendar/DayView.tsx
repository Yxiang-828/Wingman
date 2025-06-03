import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { format, addDays, subDays } from "date-fns";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import { getCurrentUserId } from "../../utils/helpers";
import { getCurrentTimeString, getTodayDateString } from "../../utils/timeUtils";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import TimeInput from "./TimeInput"; // ✅ FIX: Proper TimeInput import
import DetailPopup from "../Common/DetailPopup"; // ✅ ADD: Import DetailPopup
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
  const { pendingTasks, completedTasks, failedTasks } = useMemo(() => {
    const pending = currentDateTasks.filter(task => !task.completed && !task.failed);
    const completed = currentDateTasks.filter(task => task.completed && !task.failed);
    const failed = currentDateTasks.filter(task => task.failed && !task.completed);

    // Sort each group by time
    const sortByTime = (tasks: Task[]) => tasks.sort((a, b) => {
      if (a.task_time && b.task_time) {
        return a.task_time.localeCompare(b.task_time);
      }
      if (a.task_time && !b.task_time) return -1;
      if (!a.task_time && b.task_time) return 1;
      return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
    });

    return {
      pendingTasks: sortByTime(pending),
      completedTasks: sortByTime(completed), 
      failedTasks: sortByTime(failed)
    };
  }, [currentDateTasks]);

  // Parse date from URL
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const dateParam = query.get("date");
    const highlightParam = query.get("highlight");

    if (dateParam) {
      try {
        const parsedDate = new Date(dateParam + "T00:00:00");
        setDate(parsedDate);
      } catch (error) {
        console.error("Invalid date parameter:", dateParam);
        setDate(new Date());
      }
    } else {
      setDate(new Date());
    }

    setHighlightId(highlightParam);
  }, [location.search]);

  // ✅ DEFINE: fetchDayData as a standalone function (ADD AFTER LINE 110)
  const fetchDayData = useCallback(async () => {
    if (!date) return;
    
    const userId = getCurrentUserId();
    if (!userId) {
      console.log("DayView: No user ID, skipping fetch");
      return;
    }

    setLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      console.log(`📅 DayView: Fetching data for ${dateStr} (direct SQLite)`);

      const [tasks, events] = await Promise.all([
        window.electronAPI.db.getTasks(userId, dateStr),
        window.electronAPI.db.getEvents(userId, dateStr),
      ]);

      setCurrentDateTasks(tasks || []);
      setCurrentDateEvents(events || []);
      setRealCounts({
        tasks: (tasks || []).length,
        events: (events || []).length,
      });

      console.log(`📅 DayView: Loaded ${tasks?.length || 0} tasks, ${events?.length || 0} events`);
    } catch (error) {
      console.error("❌ DayView: Error fetching data:", error);
      setError("Failed to load day data");
    } finally {
      setLoading(false);
    }
  }, [date]);

  // ✅ REPLACE: The existing useEffect (lines 113-143) with this simple one:
  useEffect(() => {
    fetchDayData();
  }, [fetchDayData]);

  // Set active tab from URL
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const tab = query.get("tab");
    if (tab === "tasks" || tab === "events") {
      setActiveTab(tab);
    }
  }, [location.search]);

  // Navigation handlers
  const handlePrevDay = useCallback(() => {
    if (!date) return;
    const prevDay = subDays(date, 1);
    const dateStr = format(prevDay, "yyyy-MM-dd");
    navigate(`/calendar/day?date=${dateStr}&tab=${activeTab}`);
  }, [date, navigate, activeTab]);

  const handleNextDay = useCallback(() => {
    if (!date) return;
    const nextDay = addDays(date, 1);
    const dateStr = format(nextDay, "yyyy-MM-dd");
    navigate(`/calendar/day?date=${dateStr}&tab=${activeTab}`);
  }, [date, navigate, activeTab]);

  // Task submission
  const handleTaskSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    isEditing: boolean
  ) => {
    e.preventDefault();
    
    if (!date) return;

    try {
      const taskData = isEditing ? editTaskForm : newTask;
      
      if (!taskData.title.trim()) {
        setError("Task title is required");
        return;
      }

      const userId = getCurrentUserId();
      if (!userId) {
        setError("Please log in to create tasks");
        return;
      }

      if (isEditing && editingTask) {
        await updateTask({
          ...editingTask,
          title: taskData.title,
          task_time: taskData.task_time,
        });
        setEditingTask(null);
        setEditTaskForm({ title: "", task_time: "" });
      } else {
        await createTask({
          title: taskData.title,
          task_date: format(date, "yyyy-MM-dd"),
          task_time: taskData.task_time,
          completed: false,
          user_id: userId,
        });
        setNewTask({ title: "", task_time: "" });
      }

      // Refresh data
      const dateStr = format(date, "yyyy-MM-dd");
      const [tasks] = await Promise.all([
        window.electronAPI.db.getTasks(userId, dateStr),
      ]);
      setCurrentDateTasks(tasks || []);
      setError(null);
    } catch (error) {
      console.error("Error saving task:", error);
      setError("Failed to save task");
    }
  };

  // Event submission
  const handleEventSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    isEditing: boolean
  ) => {
    e.preventDefault();
    
    if (!date) return;

    try {
      const eventData = isEditing ? editEventForm : newEvent;
      
      if (!eventData.title.trim()) {
        setError("Event title is required");
        return;
      }

      const userId = getCurrentUserId();
      if (!userId) {
        setError("Please log in to create events");
        return;
      }

      if (isEditing && editingEvent) {
        await updateEvent({
          ...editingEvent,
          title: eventData.title,
          event_time: eventData.event_time,
          type: eventData.type,
          description: eventData.description,
        });
        setEditingEvent(null);
        setEditEventForm({ title: "", event_time: "", type: "", description: "" });
      } else {
        await createEvent({
          title: eventData.title,
          event_date: format(date, "yyyy-MM-dd"),
          event_time: eventData.event_time,
          type: eventData.type || "Personal",
          description: eventData.description,
          user_id: userId,
        });
        setNewEvent({ title: "", event_time: "", type: "", description: "" });
      }

      // Refresh data
      const dateStr = format(date, "yyyy-MM-dd");
      const [events] = await Promise.all([
        window.electronAPI.db.getEvents(userId, dateStr),
      ]);
      setCurrentDateEvents(events || []);
      setError(null);
    } catch (error) {
      console.error("Error saving event:", error);
      setError("Failed to save event");
    }
  };

  const handleToggleTask = async (task: Task) => {
    try {
      await toggleTask(task);
      
      // Refresh data
      if (date) {
        const userId = getCurrentUserId();
        if (userId) {
          const dateStr = format(date, "yyyy-MM-dd");
          const tasks = await window.electronAPI.db.getTasks(userId, dateStr);
          setCurrentDateTasks(tasks || []);
        }
      }
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    try {
      await deleteTask(id);
      
      // Refresh data
      if (date) {
        const userId = getCurrentUserId();
        if (userId) {
          const dateStr = format(date, "yyyy-MM-dd");
          const tasks = await window.electronAPI.db.getTasks(userId, dateStr);
          setCurrentDateTasks(tasks || []);
        }
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    
    try {
      await deleteEvent(id);
      
      // Refresh data
      if (date) {
        const userId = getCurrentUserId();
        if (userId) {
          const dateStr = format(date, "yyyy-MM-dd");
          const events = await window.electronAPI.db.getEvents(userId, dateStr);
          setCurrentDateEvents(events || []);
        }
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  // Helper functions
  const formatTime = (time: string) => {
    if (!time) return "";
    return time.slice(0, 5); // HH:MM format
  };

  const getStats = () => {
    const completedTasks = currentDateTasks.filter((t) => t.completed).length;
    const pendingTasksCount = currentDateTasks.filter((t) => !t.completed).length;
    const eventsCount = currentDateEvents.length;

    return { completedTasks, pendingTasks: pendingTasksCount, events: eventsCount };
  };

  // ✅ ADD: Handle task details (show popup)
  const handleTaskDetails = (task: Task) => {
    showPopupFor(task);
  };

  // ✅ ADD: Handle event details (show popup)
  const handleEventDetails = (event: CalendarEvent) => {
    showPopupFor(event);
  };

  const handleEditTask = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setEditingTask(task);
    setEditTaskForm({
      title: task.title,
      task_time: task.task_time || "",
    });
  };

  const handleEditEvent = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setEditEventForm({
      title: event.title,
      event_time: event.event_time || "",
      type: event.type || "",
      description: event.description || "",
    });
  };

  const navigateToNotificationsTasks = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    navigate("/notifications?tab=task");
  };

  const navigateToNotificationsEvents = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    navigate("/notifications?tab=event");
  };

  const navigateToCompletedTasks = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    const dateStr = date ? format(date, "yyyy-MM-dd") : getTodayDateString();
    navigate(`/completed-tasks?date=${dateStr}`);
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
    
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      const dateStr = format(date, "yyyy-MM-dd");
      console.log(`🔄 DayView: Refreshing data for ${dateStr}`);
      
      const [tasks, events] = await Promise.all([
        window.electronAPI.db.getTasks(userId, dateStr),
        window.electronAPI.db.getEvents(userId, dateStr),
      ]);

      setCurrentDateTasks(tasks || []);
      setCurrentDateEvents(events || []);
      setRealCounts({
        tasks: (tasks || []).length,
        events: (events || []).length,
      });
      
      console.log(`✅ DayView: Refreshed ${tasks?.length || 0} tasks, ${events?.length || 0} events`);
    } catch (error) {
      console.error("❌ DayView: Error refreshing data:", error);
    }
  }, [date]);

  // ✅ NEW: Listen for retry mission refresh events
  useEffect(() => {
    const handleRetryRefresh = () => {
      console.log("🔄 DayView: Received retry mission refresh event");
      refreshDayView();
    };

    window.addEventListener("retry-mission-refresh", handleRetryRefresh);
    return () => window.removeEventListener("retry-mission-refresh", handleRetryRefresh);
  }, [refreshDayView]);

  // ✅ ADD: Listen for task failure updates and auto-refresh
  useEffect(() => {
    const checkAndMarkFailedTasks = async () => {
      if (!date) return;
      
      const currentTime = getCurrentTimeString();
      const currentDate = format(date, "yyyy-MM-dd");
      const today = getTodayDateString();
      
      // Only check for failures on today's date
      if (currentDate !== today) return;
      
      let hasUpdates = false;
      
      const updatedTasks = await Promise.all(
        currentDateTasks.map(async (task) => {
          // Check if task should be marked as failed
          if (
            !task.completed &&
            !task.failed &&
            task.task_time &&
            task.task_time < currentTime
          ) {
            try {
              console.log(`❌ DayView: Marking task ${task.id} "${task.title}" as failed`);
              // ✅ UPDATE DATABASE
              await window.electronAPI.db.updateTask(task.id, { failed: true });
              hasUpdates = true;
              return { ...task, failed: true };
            } catch (error) {
              console.error(`Failed to mark task ${task.id} as failed:`, error);
              return task;
            }
          }
          return task;
        })
      );

      // ✅ UPDATE LOCAL STATE
      if (hasUpdates) {
        setCurrentDateTasks(updatedTasks);
        console.log(`✅ DayView: Marked failed tasks and updated UI`);
      }
    };

    const handleTaskFailure = (event?: CustomEvent) => {
      if (event?.detail?.affectedDate) {
        const affectedDate = event.detail.affectedDate;
        const currentDate = date ? format(date, "yyyy-MM-dd") : null;
        
        if (currentDate === affectedDate) {
          console.log(`🔄 DayView: ${event.detail.totalFailed || 0} tasks failed on ${affectedDate}, refreshing`);
          checkAndMarkFailedTasks(); // Use our function instead of fetchDayData
        }
      } else {
        console.log(`🔄 DayView: Generic refresh triggered`);
        checkAndMarkFailedTasks();
      }
    };

    // Listen for events
    window.addEventListener('task-failure-detected', handleTaskFailure as EventListener);
    window.addEventListener('dashboard-refresh', handleTaskFailure);
    window.addEventListener('notifications-refresh', handleTaskFailure);
    window.addEventListener('retry-mission-refresh', handleTaskFailure);
    
    // ✅ SINGLE INTERVAL: Check and mark failed tasks every minute
    checkAndMarkFailedTasks(); // Run immediately
    const interval = setInterval(checkAndMarkFailedTasks, 60 * 1000);

    return () => {
      window.removeEventListener('task-failure-detected', handleTaskFailure as EventListener);
      window.removeEventListener('dashboard-refresh', handleTaskFailure);
      window.removeEventListener('notifications-refresh', handleTaskFailure);
      window.removeEventListener('retry-mission-refresh', handleTaskFailure);
      clearInterval(interval);
    };
  }, [currentDateTasks, date]);

  // Loading state
  if (loading) {
    return (
      <div className="day-view-container">
        <div className="day-loading">Loading day view...</div>
      </div>
    );
  }

  if (!date) {
    return (
      <div className="day-view-container">
        <div className="day-loading">Invalid date</div>
      </div>
    );
  }

  const stats = getStats();
  const isToday = format(date, "yyyy-MM-dd") === getTodayDateString();

  return (
    <div className="day-view-container">
      {/* Header */}
      <div className="day-view-header">
        <div className="day-view-date">
          <h1>{format(date, "EEEE, MMMM d, yyyy")}</h1>
          {isToday && <span className="today-badge">Today</span>}
        </div>
        
        <div className="day-view-navigation">
          <button className="day-nav-btn" onClick={handlePrevDay}>
            ← Previous
          </button>
          <button 
            className="day-nav-btn today-btn" 
            onClick={() => navigate("/calendar/day")}
          >
            Today
          </button>
          <button className="day-nav-btn" onClick={handleNextDay}>
            Next →
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="day-view-stats">
        <div 
          className="day-stat-card"
          onClick={navigateToNotificationsEvents}
        >
          <div className="day-stat-icon">📅</div>
          <div className="day-stat-content">
            <div className="day-stat-value">{stats.events}</div>
            <div className="day-stat-label">Events</div>
          </div>
        </div>
        
        <div 
          className="day-stat-card"
          onClick={navigateToNotificationsTasks}
        >
          <div className="day-stat-icon">📋</div>
          <div className="day-stat-content">
            <div className="day-stat-value">{stats.pendingTasks}</div>
            <div className="day-stat-label">Pending</div>
          </div>
        </div>
        
        <div 
          className="day-stat-card"
          onClick={navigateToCompletedTasks}
        >
          <div className="day-stat-icon">✅</div>
          <div className="day-stat-content">
            <div className="day-stat-value">{stats.completedTasks}</div>
            <div className="day-stat-label">Completed</div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="day-error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Tabs */}
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

      {/* Content */}
      <div className="day-view-content">
        {activeTab === "events" && (
          <div className="day-view-section">
            {/* New Event Form */}
            <div className="day-section-header">
              <h3 className="day-section-title">Add New Event</h3>
            </div>
            
            <form onSubmit={(e) => handleEventSubmit(e, false)} className="day-form">
              <div className="day-form-grid">
                <div className="day-form-group">
                  <input
                    type="text"
                    className="day-form-input"
                    placeholder="Event title..."
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  />
                </div>
                
                <div className="day-form-group">
                  <TimeInput
                    value={newEvent.event_time}
                    onChange={(time) => setNewEvent({ ...newEvent, event_time: time })}
                    placeholder="Event time"
                  />
                </div>
                
                <div className="day-form-group">
                  <select
                    className="day-form-select"
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                  >
                    <option value="">Select type...</option>
                    <option value="Personal">Personal</option>
                    <option value="Work">Work</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Reminder">Reminder</option>
                  </select>
                </div>
                
                <div className="day-form-group">
                  <input
                    type="text"
                    className="day-form-input"
                    placeholder="Description (optional)"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  />
                </div>
              </div>
              
              <button type="submit" className="day-form-btn">
                Add Event
              </button>
            </form>

            {/* Events List */}
            <div className="day-list">
              {currentDateEvents.map((event) => (
                <div
                  key={event.id}
                  className={`event-item event-${event.type?.toLowerCase()}`}
                  onClick={() => handleEventDetails(event)} // ✅ ADD: Click handler for popup
                >
                  <div className="event-time">
                    {formatTime(event.event_time)}
                  </div>
                  <div className="event-info">
                    <div className="event-title">{event.title}</div>
                    <div className="event-meta">
                      <span className="event-type">{event.type}</span>
                      {event.description && (
                        <span className="event-description">{event.description}</span>
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
                <div className="day-empty">No events scheduled for this day</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="day-view-section">
            <div className="day-section-header">
              <h3 className="day-section-title">Tasks</h3>
            </div>

            {/* Add new task form */}
            <form onSubmit={(e) => handleTaskSubmit(e, false)} className="day-form">
              <div className="day-form-grid">
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task title"
                  className="day-form-input"
                />
                <TimeInput
                  value={newTask.task_time}
                  onChange={(time) => setNewTask({ ...newTask, task_time: time })}
                  placeholder="Task time"
                />
                <button type="submit" className="day-form-btn">
                  Add Task
                </button>
              </div>
            </form>

            {/* ✅ NEW: Structured task lists in order */}
            <div className="day-list">
              {/* 1. PENDING TASKS */}
              {pendingTasks.length > 0 && (
                <div className="task-group">
                  <h4 className="task-group-title">Pending ({pendingTasks.length})</h4>
                  {pendingTasks.map((task) => (
                    <div key={task.id} className="task-item">
                      <div
                        className="task-status"
                        onClick={() => handleToggleTask(task)}
                        title="Mark as completed"
                      >
                        ○
                      </div>
                      <div className="task-content" onClick={() => handleTaskDetails(task)}>
                        <span className="task-text">{task.title}</span>
                        {task.task_time && (
                          <span className="task-time">{formatTime(task.task_time)}</span>
                        )}
                      </div>
                      <div className="task-actions">
                        <button
                          className="task-btn edit"
                          onClick={(e) => handleEditTask(e, task)}
                          title="Edit task"
                        >
                          ✏️
                        </button>
                        <button
                          className="task-btn delete"
                          onClick={() => handleDeleteTask(task.id)}
                          title="Delete task"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 2. COMPLETED TASKS */}
              {completedTasks.length > 0 && (
                <div className="task-group">
                  <h4 className="task-group-title">Completed ({completedTasks.length})</h4>
                  {completedTasks.map((task) => (
                    <div key={task.id} className="task-item completed">
                      <div
                        className="task-status completed"
                        onClick={() => handleToggleTask(task)}
                        title="Mark as incomplete"
                      >
                        ✓
                      </div>
                      <div className="task-content" onClick={() => handleTaskDetails(task)}>
                        <span className="task-text">{task.title}</span>
                        {task.task_time && (
                          <span className="task-time">{formatTime(task.task_time)}</span>
                        )}
                      </div>
                      <div className="task-actions">
                        <button
                          className="task-btn edit"
                          onClick={(e) => handleEditTask(e, task)}
                          title="Edit task"
                        >
                          ✏️
                        </button>
                        <button
                          className="task-btn delete"
                          onClick={() => handleDeleteTask(task.id)}
                          title="Delete task"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 3. FAILED TASKS */}
              {failedTasks.length > 0 && (
                <div className="task-group">
                  <h4 className="task-group-title">Failed ({failedTasks.length})</h4>
                  {failedTasks.map((task) => (
                    <div key={task.id} className="task-item failed">
                      <div className="task-status failed" title="Failed task">
                        ❌
                      </div>
                      <div className="task-content" onClick={() => handleTaskDetails(task)}>
                        <span className="task-text">{task.title}</span>
                        {task.task_time && (
                          <span className="task-time">{formatTime(task.task_time)}</span>
                        )}
                      </div>
                      <div className="task-actions">
                        <button
                          className="task-btn retry"
                          onClick={(e) => {
                            e.stopPropagation();
                            // This will be handled by DetailPopup when clicking on the task
                            handleTaskDetails(task);
                          }}
                          title="Retry mission"
                        >
                          🔄
                        </button>
                        <button
                          className="task-btn edit"
                          onClick={(e) => handleEditTask(e, task)}
                          title="Edit task"
                        >
                          ✏️
                        </button>
                        <button
                          className="task-btn delete"
                          onClick={() => handleDeleteTask(task.id)}
                          title="Delete task"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {pendingTasks.length === 0 && completedTasks.length === 0 && failedTasks.length === 0 && (
                <p className="day-empty">No tasks for this day</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ✅ ADD: DetailPopup rendering */}
      {currentPopupItem && (
        <DetailPopup
          item={currentPopupItem}
          onClose={closePopup}
          container={document.body}
        />
      )}

      {/* Edit Forms */}
      {editingTask && (
        <div className="edit-overlay">
          <div className="edit-form">
            <h3>Edit Task</h3>
            <form onSubmit={(e) => handleTaskSubmit(e, true)}>
              <input
                type="text"
                value={editTaskForm.title}
                onChange={(e) => setEditTaskForm({ ...editTaskForm, title: e.target.value })}
                placeholder="Task title"
              />
              <TimeInput
                value={editTaskForm.task_time}
                onChange={(time) => setEditTaskForm({ ...editTaskForm, task_time: time })}
                placeholder="Task time"
              />
              <div className="day-form-actions">
                <button type="submit">Save</button>
                <button type="button" onClick={cancelEdit}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingEvent && (
        <div className="edit-overlay">
          <div className="edit-form">
            <h3>Edit Event</h3>
            <form onSubmit={(e) => handleEventSubmit(e, true)}>
              <input
                type="text"
                value={editEventForm.title}
                onChange={(e) => setEditEventForm({ ...editEventForm, title: e.target.value })}
                placeholder="Event title"
              />
              <TimeInput
                value={editEventForm.event_time}
                onChange={(time) => setEditEventForm({ ...editEventForm, event_time: time })}
                placeholder="Event time"
              />
              <select
                value={editEventForm.type}
                onChange={(e) => setEditEventForm({ ...editEventForm, type: e.target.value })}
              >
                <option value="">Select type...</option>
                <option value="Personal">Personal</option>
                <option value="Work">Work</option>
                <option value="Meeting">Meeting</option>
                <option value="Reminder">Reminder</option>
              </select>
              <input
                type="text"
                value={editEventForm.description}
                onChange={(e) => setEditEventForm({ ...editEventForm, description: e.target.value })}
                placeholder="Description"
              />
              <div className="day-form-actions">
                <button type="submit">Save</button>
                <button type="button" onClick={cancelEdit}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayView;