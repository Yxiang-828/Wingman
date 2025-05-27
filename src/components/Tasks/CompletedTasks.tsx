import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format, endOfWeek } from "date-fns";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import { useCalendarCache } from "../../Hooks/useCalendar";
import type { Task } from "../../api/Task";
import DetailPopup from "../Common/DetailPopup";
import "./CompletedTasks.css";

const CompletedTasks: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const dateFromUrl = query.get("date") || "";

  const { toggleTask } = useData();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();
  const { getDayData, getWeekData } = useCalendarCache("CompletedTasks");

  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>(dateFromUrl);
  const [groupedTasks, setGroupedTasks] = useState<Record<string, Task[]>>({});
  const [totalCompleted, setTotalCompleted] = useState(0);

  // Handle clicking on a task item - show popup
  const handleTaskClick = (task: Task) => {
    showPopupFor(task);
  };

  // Handle clicking on the task status circle specifically - toggle completion
  const handleStatusClick = async (
    e: React.MouseEvent<HTMLDivElement>,
    task: Task
  ) => {
    e.stopPropagation(); // Prevent triggering the task item click
    e.preventDefault(); // Prevent default behavior

    console.log("CompletedTasks: Click on status circle for task ID:", task.id);

    // Prevent multiple simultaneous toggle operations on the same task
    if (task.isProcessing) {
      console.log("Task already being processed, ignoring click");
      return;
    }

    try {
      // Use the DataProvider to toggle task back to incomplete
      const updatedTask = await toggleTask(task);
      console.log("CompletedTasks: Task toggled successfully:", updatedTask);

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
    console.log("CompletedTasks: completeTask called for ID:", taskId);

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
      const updatedTask = await toggleTask(foundTask);
      console.log("CompletedTasks: Task un-completed from popup:", updatedTask);

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
    const loadCompletedTasks = async () => {
      setLoading(true);
      try {
        if (filterDate) {
          // Load specific date
          const dayData = await getDayData(filterDate);
          const completedTasks = dayData.tasks.filter((t) => t.completed);
          setGroupedTasks({ [filterDate]: completedTasks });
          setTotalCompleted(completedTasks.length);
        } else {
          // Load current week
          const today = new Date();
          const dates = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            return date.toISOString().split("T")[0];
          });

          const weekData = await getWeekData(dates);
          const grouped: Record<string, Task[]> = {};
          let total = 0;

          dates.forEach((date) => {
            const completed = weekData[date]?.tasks.filter((t) => t.completed) || [];
            if (completed.length > 0) {
              grouped[date] = completed;
              total += completed.length;
            }
          });

          setGroupedTasks(grouped);
          setTotalCompleted(total);
        }
      } catch (error) {
        console.error("Error loading completed tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCompletedTasks();
  }, [filterDate, getDayData, getWeekData]);

  // Get week range display for UI
  const getWeekRangeDisplay = useCallback(() => {
    const today = new Date();
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
    return `${format(today, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
  }, []);

  // Format date for headers
  const formatDateHeader = useCallback((dateStr: string) => {
    return format(new Date(dateStr), "EEEE, MMMM d, yyyy");
  }, []);

  return (
    <div className="completed-tasks-container">
      <div className="completed-tasks-header">
        <h1>Completed Tasks</h1>
        <div className="completed-tasks-actions">
          <button className="back-button" onClick={() => navigate(-1)}>
            <span>←</span> Back
          </button>

          <div className="date-filter">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="date-input"
              placeholder="Filter by date"
            />
            {filterDate && (
              <button
                className="clear-filter"
                onClick={(_: React.MouseEvent<HTMLButtonElement>) =>
                  setFilterDate("")
                }
                title="Clear filter"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Week range display */}
      <div className="week-range">
        <span>This Week: {getWeekRangeDisplay()}</span>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading completed tasks...</p>
        </div>
      ) : Object.keys(groupedTasks).length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✓</div>
          <h2>No completed tasks</h2>

          {filterDate ? (
            <p>
              No completed tasks found for {format(new Date(filterDate), "PPP")}
              .
            </p>
          ) : (
            <p>
              No completed tasks this week. Tasks you complete will appear here.
            </p>
          )}

          <button
            className="action-button"
            onClick={() => navigate("/calendar/day")}
          >
            Go to tasks
          </button>
        </div>
      ) : (
        <div className="completed-tasks-list">
          <div className="task-count">
            {totalCompleted} completed task{totalCompleted !== 1 ? "s" : ""}{" "}
            found
          </div>

          {Object.entries(groupedTasks).map(([date, tasks]) => (
            <div key={date} className="date-group">
              <h3 className="date-header">{formatDateHeader(date)}</h3>
              <ul className="task-group">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className="completed-task-item"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div
                      className="task-status completed"
                      onClick={(e) => handleStatusClick(e, task)}
                    >
                      ✓
                    </div>
                    <div className="task-content">
                      <div className="task-text">{task.title}</div>
                      <div className="task-meta">
                        {task.task_time && (
                          <span className="task-time">{task.task_time}</span>
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

      {/* Add the DetailPopup component */}
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
