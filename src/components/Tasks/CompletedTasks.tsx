import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format, endOfWeek } from "date-fns";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import type { Task } from "../../api/Task";
import DetailPopup from "../Common/DetailPopup";
import "./CompletedTasks.css"; // Use the dedicated CSS file

const CompletedTasks: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const dateFromUrl = query.get("date") || "";

  const {
    taskCache,
    currentWeekId,
    fetchWeekData,
    loading: dataLoading,
    toggleTask,
  } = useData();

  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>(dateFromUrl);
  const [groupedTasks, setGroupedTasks] = useState<Record<string, Task[]>>({});
  const [totalCompleted, setTotalCompleted] = useState(0);

  // Handle clicking on a task item - show popup
  const handleTaskClick = (task: Task) => {
    showPopupFor(task);
  };

  // Handle clicking on the task status circle specifically - toggle completion
  const handleStatusClick = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation(); // Prevent triggering the task item click
    e.preventDefault(); // Prevent default behavior

    // Prevent multiple simultaneous toggle operations on the same task
    if (task.isProcessing) {
      console.log("Task already being processed, ignoring click");
      return;
    }

    try {
      // Use the DataProvider to toggle task back to incomplete
      await toggleTask(task);

      // Update UI - remove this task from the list since it's no longer completed
      setGroupedTasks((prev) => {
        const newGroups = { ...prev };

        // Find which date group this task belongs to
        for (const dateKey in newGroups) {
          newGroups[dateKey] = newGroups[dateKey].filter(
            (t) => t.id !== task.id
          );

          // If this date group is now empty, remove it
          if (newGroups[dateKey].length === 0) {
            delete newGroups[dateKey];
          }
        }

        return newGroups;
      });

      // Update total count
      setTotalCompleted((prev) => prev - 1);

      // Close popup if it's open for this task
      if (currentPopupItem && currentPopupItem.id === task.id) {
        closePopup();
      }
    } catch (error) {
      console.error("Error toggling task status:", error);
    }
  };

  // Function to handle task completion from popup
  const completeTask = async (taskId: number): Promise<void> => {
    try {
      // Find the task in any of the date groups
      let foundTask: Task | undefined;

      for (const dateKey in groupedTasks) {
        foundTask = groupedTasks[dateKey].find((t) => t.id === taskId);
        if (foundTask) break;
      }

      if (!foundTask) {
        console.error(`Task with ID ${taskId} not found`);
        return;
      }

      // Call the API through DataContext to update the task
      await toggleTask(foundTask);

      // Update UI - remove this task since it's no longer completed
      setGroupedTasks((prev) => {
        const newGroups = { ...prev };

        // Find which date group this task belongs to
        for (const dateKey in newGroups) {
          newGroups[dateKey] = newGroups[dateKey].filter(
            (t) => t.id !== taskId
          );

          // If this date group is now empty, remove it
          if (newGroups[dateKey].length === 0) {
            delete newGroups[dateKey];
          }
        }

        return newGroups;
      });

      // Update total count
      setTotalCompleted((prev) => prev - 1);

      // Close the popup when done
      closePopup();
    } catch (error) {
      console.error("Error updating task completion:", error);
    }
  };

  // Ensure we have the current week's data loaded
  useEffect(() => {
    const loadWeekData = async () => {
      setLoading(true);
      try {
        // Fetch current week data if needed
        await fetchWeekData(currentWeekId);
      } catch (err) {
        console.error("Error loading week data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadWeekData();
  }, [fetchWeekData, currentWeekId]);

  // Process and group completed tasks from this week
  useEffect(() => {
    // Get tasks directly from cache if currentWeekId fails
    const processCompletedTasks = () => {
      setLoading(true);

      try {
        // Create a map to store tasks grouped by date
        const tasksByDate: Record<string, Task[]> = {};
        let completedCount = 0;

        // Process ALL weeks in cache, not just currentWeekId
        Object.keys(taskCache).forEach((weekId) => {
          Object.keys(taskCache[weekId] || {}).forEach((dateStr) => {
            // Get tasks for this date
            const tasksForDay = taskCache[weekId][dateStr] || [];

            // Filter for completed tasks only
            const completedTasks = tasksForDay.filter((task: Task) => task.completed);

            if (completedTasks.length > 0) {
              // If we have a filter date, only include tasks from that date
              if (!filterDate || dateStr === filterDate) {
                tasksByDate[dateStr] = completedTasks;
                completedCount += completedTasks.length;
              }
            }
          });
        });

        // Set state with grouped tasks and total count
        setGroupedTasks(tasksByDate);
        setTotalCompleted(completedCount);
      } catch (error) {
        console.error("Error processing completed tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    processCompletedTasks();
  }, [taskCache, filterDate]);

  // Ensure filter date defaults to today if coming from dashboard
  useEffect(() => {
    // If no date specified but coming from dashboard, default to today
    if (!dateFromUrl && location.state?.fromDashboard) {
      const today = new Date().toISOString().split('T')[0];
      setFilterDate(today);
    }
  }, [dateFromUrl, location]);

  // Get week range display for UI
  const getWeekRangeDisplay = useCallback(() => {
    if (!currentWeekId) return "";

    const weekStart = new Date(currentWeekId);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
    return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
  }, [currentWeekId]);

  // Format date for headers
  const formatDateHeader = useCallback((dateStr: string) => {
    return format(new Date(dateStr), "EEEE, MMMM d, yyyy");
  }, []);

  return (
    <div className="cpt-container">
      <div className="cpt-header">
        <h1>Completed Tasks</h1>
        <div className="cpt-actions">
          <button className="cpt-back-btn" onClick={() => navigate(-1)}>
            <span>←</span> Back
          </button>

          <div className="cpt-filter">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="cpt-date-input"
              placeholder="Filter by date"
            />
            {filterDate && (
              <button
                className="cpt-clear-btn"
                onClick={() => setFilterDate("")}
                title="Clear filter"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="cpt-week-range">
        <span>This Week: {getWeekRangeDisplay()}</span>
      </div>

      {loading || dataLoading ? (
        <div className="cpt-loading">
          <p>Loading completed tasks...</p>
        </div>
      ) : Object.keys(groupedTasks).length === 0 ? (
        <div className="cpt-empty">
          <div className="cpt-empty-icon">✓</div>
          <h2>No completed tasks</h2>

          {filterDate ? (
            <p>
              No completed tasks found for {format(new Date(filterDate), "PPP")}.
            </p>
          ) : (
            <p>
              No completed tasks this week. Tasks you complete will appear here.
            </p>
          )}

          <button
            className="cpt-action-btn"
            onClick={() => navigate("/calendar/day")}
          >
            Go to tasks
          </button>
        </div>
      ) : (
        <div className="cpt-task-list">
          <div className="cpt-count">
            {totalCompleted} completed task{totalCompleted !== 1 ? "s" : ""} found
          </div>

          {Object.entries(groupedTasks).map(([date, tasks]) => (
            <div key={date} className="cpt-date-group">
              <h3 className="cpt-date-header">{formatDateHeader(date)}</h3>
              <ul className="cpt-task-group">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className="cpt-task-item"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div
                      className="cpt-task-status"
                      onClick={(e) => handleStatusClick(e, task)}
                    >
                      ✓
                    </div>
                    <div className="cpt-task-content">
                      <div className="cpt-task-text">{task.title}</div>
                      <div className="cpt-task-meta">
                        {task.task_time && (
                          <span className="cpt-task-time">{task.task_time}</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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

export default CompletedTasks;