import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// ✅ REMOVED: import { useCalendarCache } from "../../Hooks/useCalendar";
import { getCurrentUserId } from "../../utils/auth";
import { formatDateToString, parseLocalDateString, getTodayDateString } from "../../utils/timeUtils";
import type { Task } from "../../api/Task";
import "./CompletedTasks.css";

const CompletedTasks: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // ✅ REMOVED: const { taskCache } = useCalendarCache("CompletedTasks");

  const [groupedTasks, setGroupedTasks] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [filterDate, setFilterDate] = useState<string | null>(null);

  // Get filter date from URL
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const dateParam = query.get("date");
    setFilterDate(dateParam);
  }, [location.search]);

  // ✅ NEW: Direct SQLite data fetching for completed tasks
  const fetchCompletedTasks = useCallback(async () => {
    setLoading(true);
    
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        console.log("✅ CompletedTasks: No user ID, skipping fetch");
        setLoading(false);
        return;
      }

      console.log(`✅ CompletedTasks: Fetching completed tasks (direct SQLite)`);

      if (filterDate) {
        // ✅ SINGLE DATE: Direct SQLite call for specific date
        const tasks = await window.electronAPI.db.getTasks(userId, filterDate);
        const completedTasks = (tasks || []).filter((task: Task) => task.completed);
        
        const tasksByDate: Record<string, Task[]> = {};
        if (completedTasks.length > 0) {
          tasksByDate[filterDate] = completedTasks;
        }
        
        setGroupedTasks(tasksByDate);
        setTotalCompleted(completedTasks.length);
        
        console.log(`✅ CompletedTasks: Loaded ${completedTasks.length} completed tasks for ${filterDate}`);
      } else {
        // ✅ ALL DATES: Fetch last 30 days of completed tasks
        const tasksByDate: Record<string, Task[]> = {};
        let totalCount = 0;
        
        const today = new Date();
        const promises = [];
        
        // Fetch last 30 days
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = formatDateToString(date);
          
          promises.push(
            window.electronAPI.db.getTasks(userId, dateStr)
              .then((tasks: Task[]) => {
                const completedTasks = (tasks || []).filter((task: Task) => task.completed);
                if (completedTasks.length > 0) {
                  return { date: dateStr, tasks: completedTasks };
                }
                return null;
              })
              .catch((error: any) => {
                console.error(`Error fetching tasks for ${dateStr}:`, error);
                return null;
              })
          );
        }
        
        const results = await Promise.all(promises);
        
        results.forEach(result => {
          if (result && result.tasks.length > 0) {
            tasksByDate[result.date] = result.tasks;
            totalCount += result.tasks.length;
          }
        });
        
        setGroupedTasks(tasksByDate);
        setTotalCompleted(totalCount);
        
        console.log(`✅ CompletedTasks: Loaded ${totalCount} completed tasks across ${Object.keys(tasksByDate).length} days`);
      }
    } catch (error) {
      console.error("❌ CompletedTasks: Error fetching data:", error);
      setGroupedTasks({});
      setTotalCompleted(0);
    } finally {
      setLoading(false);
    }
  }, [filterDate]);

  // Fetch data when component mounts or filter changes
  useEffect(() => {
    fetchCompletedTasks();
  }, [fetchCompletedTasks]);

  const formatDateHeader = (dateStr: string) => {
    try {
      const date = parseLocalDateString(dateStr);
      const today = getTodayDateString();
      
      if (dateStr === today) {
        return "Today";
      }
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatDateToString(yesterday);
      
      if (dateStr === yesterdayStr) {
        return "Yesterday";
      }
      
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
      });
    } catch (error) {
      return dateStr;
    }
  };

  const handleTaskClick = (task: Task) => {
    const taskDate = task.task_date || getTodayDateString();
    navigate(`/calendar/day?date=${taskDate}&highlight=task-${task.id}`);
  };

  const clearFilter = () => {
    navigate("/completed-tasks");
  };

  if (loading) {
    return (
      <div className="ct-container">
        <div className="ct-loading">
          <div className="loading-spinner"></div>
          <p>Loading completed tasks...</p>
        </div>
      </div>
    );
  }

  const sortedDates = Object.keys(groupedTasks).sort((a, b) => b.localeCompare(a));

  return (
    <div className="ct-container">
      <div className="ct-header">
        <div className="ct-title-section">
          <h1 className="ct-title">Completed Tasks</h1>
          <span className="ct-count">
            {totalCompleted} task{totalCompleted !== 1 ? "s" : ""} completed
          </span>
        </div>
        
        <div className="ct-actions">
          {filterDate && (
            <button className="ct-clear-filter" onClick={clearFilter}>
              Show All Dates
            </button>
          )}
          
          <button 
            className="ct-refresh"
            onClick={fetchCompletedTasks}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {filterDate && (
        <div className="ct-filter-info">
          <span className="ct-filter-label">Showing tasks for:</span>
          <span className="ct-filter-date">{formatDateHeader(filterDate)}</span>
        </div>
      )}

      <div className="ct-content">
        {sortedDates.length > 0 ? (
          <div className="ct-task-groups">
            {sortedDates.map((dateStr) => {
              const tasks = groupedTasks[dateStr] || [];
              
              return (
                <div key={dateStr} className="ct-date-group">
                  <div className="ct-date-header">
                    <h3 className="ct-date-title">{formatDateHeader(dateStr)}</h3>
                    <span className="ct-date-count">
                      {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  
                  <div className="ct-task-list">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="ct-task-item"
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="task-status completed">✓</div>
                        <div className="task-details">
                          <h4 className="task-title completed">{task.title}</h4>
                          <div className="task-meta">
                            {task.task_time && (
                              <span className="task-time">{task.task_time}</span>
                            )}
                            <span className="task-date">{dateStr}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ct-empty">
            <div className="ct-empty-icon">✅</div>
            <p className="ct-empty-text">
              {filterDate 
                ? `No completed tasks found for ${formatDateHeader(filterDate)}`
                : "No completed tasks found"
              }
            </p>
            <button
              className="ct-empty-action"
              onClick={() => navigate("/calendar/day")}
            >
              Add New Task
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompletedTasks;