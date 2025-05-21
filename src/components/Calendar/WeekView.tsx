import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format, startOfWeek, addDays, parseISO } from "date-fns";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import { debounce } from "../../utils/helpers";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import Portal from "../Common/Portal";
import DetailPopup from "../Common/DetailPopup";
import { VirtualizedEventList, VirtualizedTaskList } from "./VirtualizedList";
import "./Calendar.css";

// Helper function for date formatting
function formatDateForAPI(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

// Safe format function that handles invalid dates
const safeFormat = (date: any, formatString: string): string => {
  try {
    if (!date) return '';
    
    // Convert string to Date if needed
    let dateObj: Date;
    if (typeof date === 'string') {
      // Handle ISO format dates
      if (date.includes('T')) {
        dateObj = new Date(date);
      } 
      // Handle YYYY-MM-DD format
      else if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = date.split('-').map(Number);
        dateObj = new Date(year, month - 1, day);
      } 
      // Try standard parsing
      else {
        dateObj = new Date(date);
      }
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      console.warn('Invalid date type:', typeof date);
      return '';
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date value:', date);
      return '';
    }
    
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

// Add this function to check validity before any processing
const isValidDateValue = (value: any): boolean => {
  if (!value) return false;
  
  try {
    if (typeof value === 'string') {
      const testDate = new Date(value);
      return !isNaN(testDate.getTime());
    } else if (value instanceof Date) {
      return !isNaN(value.getTime());
    }
    return false;
  } catch (e) {
    return false;
  }
};

const WeekView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    fetchWeekData,
    taskCache,
    eventCache,
    currentWeekId,
    toggleTask,
    addNewTask,
    addNewEvent,
    deleteExistingTask,
    deleteExistingEvent,
    loading: isLoading
  } = useData();

  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();

  // Local state for UI management
  const [quickAction, setQuickAction] = useState({
    visible: false,
    type: null,
    position: { x: 0, y: 0 },
    date: ""
  });

  const [quickForm, setQuickForm] = useState({
    task: { text: "", time: "" },
    event: { title: "", time: "", type: "personal", description: "" }
  });
  
  const [activeWeekId, setActiveWeekId] = useState<string>("");
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [weeklyData, setWeeklyData] = useState<Record<string, {
    tasks: Task[], events: CalendarEvent[]
  }>>({});

  // Parse date from URL and compute active week
  useEffect(() => {
    try {
      const query = new URLSearchParams(location.search);
      const dateParam = query.get("date") || format(new Date(), "yyyy-MM-dd");
      
      // Validate the dateParam before using it
      if (!isValidDateValue(dateParam)) {
        console.warn('Invalid date parameter:', dateParam);
        // Use today's date as fallback
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 0 });
        const weekId = format(weekStart, "yyyy-MM-dd");
        setActiveWeekId(weekId);
        return;
      }
      
      const date = new Date(dateParam);
      const weekStart = startOfWeek(date, { weekStartsOn: 0 });
      const weekId = format(weekStart, "yyyy-MM-dd");
      
      setActiveWeekId(weekId);
    } catch (err) {
      console.error('Error setting active week:', err);
      // Use today as fallback
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const weekId = format(weekStart, "yyyy-MM-dd");
      setActiveWeekId(weekId);
    }
  }, [location.search]);

  // Check activeWeekId validity
  useEffect(() => {
    if (activeWeekId && !isValidDateValue(activeWeekId)) {
      console.warn('Invalid activeWeekId:', activeWeekId);
      // Use today as fallback
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const weekId = format(weekStart, "yyyy-MM-dd");
      setActiveWeekId(weekId);
    }
  }, [activeWeekId]);

  // Update the data loading effect
  useEffect(() => {
    if (!activeWeekId || !isValidDateValue(activeWeekId)) {
      return;
    }
    
    // Set a timeout to show loading timeout message
    const loadTimeout = setTimeout(() => setLoadingTimeout(true), 5000);
    
    const loadData = async () => {
      try {
        await fetchWeekData(activeWeekId);
        
        // Process weeklyData from cache once data is fetched
        if (taskCache && eventCache) {
          const processedData: Record<string, { tasks: Task[], events: CalendarEvent[] }> = {};
          
          // Get the dates for the week
          const weekStart = new Date(activeWeekId);
          
          for (let i = 0; i < 7; i++) {
            const currentDate = addDays(weekStart, i);
            const dateStr = format(currentDate, "yyyy-MM-dd");
            
            // Extract data for this day from cache
            const weekId = format(startOfWeek(currentDate, { weekStartsOn: 0 }), "yyyy-MM-dd");
            const tasksForDate = taskCache[weekId]?.[dateStr] || [];
            const eventsForDate = eventCache[weekId]?.[dateStr] || [];
            
            processedData[dateStr] = {
              tasks: tasksForDate,
              events: eventsForDate
            };
          }
          
          setWeeklyData(processedData);
        }
      } catch (error) {
        console.error("Error loading week data:", error);
      } finally {
        clearTimeout(loadTimeout);
        setLoadingTimeout(false);
      }
    };
    
    loadData();
    
    return () => {
      clearTimeout(loadTimeout);
    };
  }, [activeWeekId, fetchWeekData, taskCache, eventCache]);

  // Update the days calculation function to use safeFormat
  const days = useCallback(() => {
    if (!activeWeekId || !isValidDateValue(activeWeekId)) {
      return [];
    }
    
    try {
      const weekDays = [];
      const weekStart = new Date(activeWeekId);
      
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        weekDays.push(day);
      }
      
      return weekDays;
    } catch (error) {
      console.error("Error calculating days:", error);
      return [];
    }
  }, [activeWeekId]);

  // Navigation handlers
  const handlePrevWeek = useCallback(() => {
    if (!activeWeekId || !isValidDateValue(activeWeekId)) return;
    
    try {
      const weekStart = new Date(activeWeekId);
      const prevWeekStart = addDays(weekStart, -7);
      const prevWeekId = format(prevWeekStart, "yyyy-MM-dd");
      navigate(`/calendar/week?date=${prevWeekId}`);
    } catch (error) {
      console.error("Error navigating to previous week:", error);
    }
  }, [activeWeekId, navigate]);

  const handleNextWeek = useCallback(() => {
    if (!activeWeekId || !isValidDateValue(activeWeekId)) return;
    
    try {
      const weekStart = new Date(activeWeekId);
      const nextWeekStart = addDays(weekStart, 7);
      const nextWeekId = format(nextWeekStart, "yyyy-MM-dd");
      navigate(`/calendar/week?date=${nextWeekId}`);
    } catch (error) {
      console.error("Error navigating to next week:", error);
    }
  }, [activeWeekId, navigate]);

  const handleToday = useCallback(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 });
    const weekId = format(weekStart, "yyyy-MM-dd");
    navigate(`/calendar/week?date=${weekId}`);
  }, [navigate]);

  // Rendering functions for events and tasks - SAFELY
  const renderEvents = (events: CalendarEvent[], date: string) => {
    if (!Array.isArray(events) || events.length === 0) {
      return <div className="week-day-empty">No events</div>;
    }

    return (
      <VirtualizedEventList
        events={events}
        onEventClick={handleEventClick}
        onDeleteEvent={handleDeleteEvent}
        height={Math.min(150, events.length * 40 + 10)}
      />
    );
  };

  const renderTasks = (tasks: Task[], date: string) => {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return <div className="week-day-empty">No tasks</div>;
    }

    return (
      <VirtualizedTaskList
        tasks={tasks}
        onTaskClick={handleTaskClick}
        onCompleteTask={handleCompleteTask}
        onDeleteTask={handleDeleteTask}
        height={Math.min(150, tasks.length * 40 + 10)}
      />
    );
  };

  // Function to handle quick action for adding tasks/events
  const handleShowQuickAction = useCallback(
    (e: React.MouseEvent, day: Date, type: string) => {
      if (!isValidDateValue(day)) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const dateStr = safeFormat(day, "yyyy-MM-dd");
      
      setQuickAction({
        visible: true,
        type: type,
        position: {
          x: rect.right,
          y: rect.top
        },
        date: dateStr
      });
      
      // Reset form
      setQuickForm({
        task: { text: "", time: "" },
        event: { title: "", time: "", type: "personal", description: "" }
      });
    },
    [setQuickAction, setQuickForm]
  );

  const handleHideQuickAction = useCallback(() => {
    setQuickAction(prev => ({ ...prev, visible: false }));
  }, []);

  // Safe quick action form save
  const handleQuickSave = async () => {
    try {
      const { date } = quickAction;
      
      // Validate date before proceeding
      if (!date || !isValidDateValue(date)) {
        console.error("Invalid date for quick action:", date);
        handleHideQuickAction();
        return;
      }
      
      if (quickAction.type === "task") {
        const { text, time } = quickForm.task;
        if (!text.trim()) {
          handleHideQuickAction();
          return;
        }
        
        await addNewTask({
          text: text.trim(),
          date,
          time: time || "",
          completed: false
        });
      } else if (quickAction.type === "event") {
        const { title, time, type, description } = quickForm.event;
        if (!title.trim()) {
          handleHideQuickAction();
          return;
        }
        
        await addNewEvent({
          title: title.trim(),
          date,
          time: time || "",
          type: type || "personal",
          description: description || ""
        });
      }
      
      handleHideQuickAction();
    } catch (error) {
      console.error("Error saving quick action:", error);
      handleHideQuickAction();
    }
  };

  // Task actions
  const handleTaskClick = (task: Task) => {
    if (task) {
      showPopupFor(task);
    }
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      await toggleTask(task);
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    try {
      if (task && task.id) {
        await deleteExistingTask(task.id);
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  // Event actions
  const handleEventClick = (event: CalendarEvent) => {
    if (event) {
      showPopupFor(event);
    }
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    try {
      if (event && event.id) {
        await deleteExistingEvent(event.id);
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  // Popup action for completing a task
  const completeTask = async (taskId: number) => {
    try {
      // Find the task in weeklyData
      let taskToComplete: Task | null = null;
      
      Object.values(weeklyData).forEach(({ tasks }) => {
        const found = tasks.find(t => t.id === taskId);
        if (found) taskToComplete = found;
      });
      
      if (taskToComplete) {
        await handleCompleteTask(taskToComplete);
      }
    } catch (error) {
      console.error("Error completing task from popup:", error);
    }
  };

  // Import debounce utility
  const debouncedSetQuickForm = useCallback(
    debounce((newState) => {
      setQuickForm(newState);
    }, 100),
    []
  );

  // A safe rendering implementation
  return (
    <div className="calendar-week-view" ref={containerRef}>
      <div className="week-header">
        <div className="week-title-container">
          <h2 className="week-title">Week View</h2>
          {activeWeekId && isValidDateValue(activeWeekId) && (
            <div className="week-subtitle">
              {safeFormat(new Date(activeWeekId), "MMMM d")} - 
              {safeFormat(addDays(new Date(activeWeekId), 6), "MMMM d, yyyy")}
            </div>
          )}
        </div>
        <div className="calendar-buttons">
          <button className="calendar-btn today-btn" onClick={handleToday}>
            Today
          </button>
          <button className="calendar-btn prev-btn" onClick={handlePrevWeek}>
            <span className="btn-icon">←</span>
          </button>
          <button className="calendar-btn next-btn" onClick={handleNextWeek}>
            <span className="btn-icon">→</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="week-loading">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your schedule...</p>
            {loadingTimeout && (
              <p>This is taking longer than usual. Please wait or try refreshing.</p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="week-days-container">
            <div className="week-days-header">
              {days().map((day) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dayDate = new Date(day);
                dayDate.setHours(0, 0, 0, 0);
                const isToday = dayDate.getTime() === today.getTime();
                
                return (
                  <div 
                    key={safeFormat(day, "yyyy-MM-dd")} 
                    className={`week-day-header ${isToday ? "today" : ""}`}
                  >
                    <div className="day-name">{safeFormat(day, "EEE")}</div>
                    <div className="day-number">{safeFormat(day, "d")}</div>
                  </div>
                );
              })}
            </div>
            
            <div className="week-days-grid">
              {days().map((day) => {
                const dayStr = safeFormat(day, "yyyy-MM-dd");
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dayDate = new Date(day);
                dayDate.setHours(0, 0, 0, 0);
                const isToday = dayDate.getTime() === today.getTime();
                const dayData = weeklyData[dayStr] || { tasks: [], events: [] };
                
                return (
                  <div 
                    key={dayStr} 
                    className={`week-day ${isToday ? "today" : ""}`}
                  >
                    <div className="week-day-content">
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
                      
                      <div className="section">
                        <div className="section-title">Events</div>
                        <div className="week-event-list">
                          {renderEvents(dayData.events, dayStr)}
                        </div>
                      </div>
                      
                      <div className="section">
                        <div className="section-title">Tasks</div>
                        <div className="week-task-list">
                          {renderTasks(dayData.tasks, dayStr)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {quickAction.visible && (
            <Portal>
              <div 
                className="quick-action-popup"
                style={{
                  position: 'fixed',
                  top: `${quickAction.position.y}px`,
                  left: `${quickAction.position.x}px`,
                  zIndex: 1000
                }}
              >
                <div className="quick-action-form">
                  <div className="quick-form-header">
                    <h3>
                      {quickAction.type === "task" ? "Add Task" : "Add Event"}
                    </h3>
                    <span className="quick-form-date">
                      {safeFormat(new Date(quickAction.date), "EEE, MMM d")}
                    </span>
                    <button 
                      className="quick-form-close"
                      onClick={handleHideQuickAction}
                    >
                      ×
                    </button>
                  </div>
                  
                  {quickAction.type === "task" ? (
                    <div className="quick-form-content">
                      <input
                        type="text"
                        placeholder="Task description"
                        value={quickForm.task.text}
                        onChange={(e) => 
                          debouncedSetQuickForm({
                            ...quickForm,
                            task: { ...quickForm.task, text: e.target.value }
                          })
                        }
                        className="quick-form-input"
                        autoFocus
                      />
                      <input
                        type="text"
                        placeholder="Time (optional)"
                        value={quickForm.task.time}
                        onChange={(e) => 
                          debouncedSetQuickForm({
                            ...quickForm,
                            task: { ...quickForm.task, time: e.target.value }
                          })
                        }
                        className="quick-form-input"
                      />
                      <button 
                        className="quick-form-save"
                        onClick={handleQuickSave}
                        disabled={!quickForm.task.text.trim()}
                      >
                        Save Task
                      </button>
                    </div>
                  ) : (
                    <div className="quick-form-content">
                      <input
                        type="text"
                        placeholder="Event title"
                        value={quickForm.event.title}
                        onChange={(e) => 
                          debouncedSetQuickForm({
                            ...quickForm,
                            event: { ...quickForm.event, title: e.target.value }
                          })
                        }
                        className="quick-form-input"
                        autoFocus
                      />
                      <input
                        type="text"
                        placeholder="Time (optional)"
                        value={quickForm.event.time}
                        onChange={(e) => 
                          debouncedSetQuickForm({
                            ...quickForm,
                            event: { ...quickForm.event, time: e.target.value }
                          })
                        }
                        className="quick-form-input"
                      />
                      <select
                        value={quickForm.event.type}
                        onChange={(e) => 
                          debouncedSetQuickForm({
                            ...quickForm,
                            event: { ...quickForm.event, type: e.target.value }
                          })
                        }
                        className="quick-form-select"
                      >
                        <option value="personal">Personal</option>
                        <option value="meeting">Meeting</option>
                        <option value="reminder">Reminder</option>
                      </select>
                      <textarea
                        placeholder="Description (optional)"
                        value={quickForm.event.description}
                        onChange={(e) => 
                          debouncedSetQuickForm({
                            ...quickForm,
                            event: { ...quickForm.event, description: e.target.value }
                          })
                        }
                        className="quick-form-textarea"
                      />
                      <button 
                        className="quick-form-save"
                        onClick={handleQuickSave}
                        disabled={!quickForm.event.title.trim()}
                      >
                        Save Event
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Portal>
          )}
        </>
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
