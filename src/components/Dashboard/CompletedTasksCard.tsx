import React, { useMemo, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import { isRecurringTask } from "../../api/Task";
import { useNotifications } from "../../context/NotificationsContext";
import DetailPopup from "../Common/DetailPopup";
import "./Dashboard.css";

interface CompletedTasksCardProps {
  tasks: Task[];
}

/**
 * CompletedTasksCard Component
 * Displays completed missions
 * All glories are stored here for the day (only showing today's completed tasks)
 */
const CompletedTasksCard: React.FC<CompletedTasksCardProps> = ({ tasks }) => {
  const navigate = useNavigate();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();

  const totalCompletedTasks = tasks.filter((task) => task.completed).length;
  const hasMore = totalCompletedTasks > 12;

  // Local state to trigger re-renders when tasks change
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  // Keep local state synchronized with parent data
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Listen for dashboard refresh events to update immediately
  useEffect(() => {
    const handleDashboardRefresh = () => {
      // Force a re-render by updating local state
      setLocalTasks([...tasks]);
    };

    window.addEventListener("dashboard-refresh", handleDashboardRefresh);
    return () => {
      window.removeEventListener("dashboard-refresh", handleDashboardRefresh);
    };
  }, [tasks]);

  // Update displayTasks to use localTasks instead of tasks
  const updatedDisplayTasks = useMemo(() => {
    return localTasks
      .filter((task) => task.completed)
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || "").getTime() -
          new Date(a.updated_at || a.created_at || "").getTime(),
      )
      .slice(0, 12);
  }, [localTasks]);

  const handleTaskClick = useCallback(
    (task: Task) => {
      showPopupFor(task);
    },
    [showPopupFor],
  );

  /**
   * Handles task uncomplete with dashboard refresh
   *  Wingman restores missions to active status
   */
  const handleStatusClick = useCallback(
    async (e: React.MouseEvent, task: Task) => {
      e.stopPropagation();

      try {
        console.log("Wingman: Restoring task to active status:", task.id);

        await window.electronAPI.db.updateTask(task.id, {
          completed: false,
        });

        const refreshEvent = new CustomEvent("dashboard-refresh");
        window.dispatchEvent(refreshEvent);

        console.log("Wingman: Task restored and dashboard refreshed");
      } catch (error) {
        console.error("Wingman: Error restoring task:", error);
      }
    },
    [],
  );

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="dashboard-card completed-tasks-card">
      <div className="dashboard-card-header">
        <h2>Completed Today ({totalCompletedTasks})</h2>
        <button
          className="card-action-btn"
          onClick={() => navigate("/notifications?tab=completed")}
        >
          View All
        </button>
      </div>{" "}
      <div className="dashboard-card-content">
        {updatedDisplayTasks.length > 0 ? (
          <>
            <div className="dashboard-list">
              {updatedDisplayTasks.map((task) => (
                <div
                  key={task.id}
                  className="dashboard-item task completed"
                  onClick={() => handleTaskClick(task)}
                >
                  <div
                    className="item-status completed"
                    onClick={(e) => handleStatusClick(e, task)}
                    title="Mark as incomplete"
                  >
                    ✓
                  </div>{" "}
                  <div className="item-content">
                    <div className="item-title completed">
                      {task.title}
                      {isRecurringTask(task) && (
                        <span
                          className="recurring-badge-dashboard"
                          title="Recurring task"
                        >
                          ♻️
                        </span>
                      )}
                    </div>
                    <div className="item-meta">
                      {task.task_time && (
                        <span className="item-time">{task.task_time}</span>
                      )}
                      <span className="item-time">
                        {formatDate(task.task_date)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <button
                className="view-more-btn"
                onClick={() => navigate("/notifications?tab=completed")}
              >
                View All {totalCompletedTasks} Completed →
              </button>
            )}
          </>
        ) : (
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon">✅</div>
            <p>No victories yet today, boss</p>
            <button
              className="action-btn"
              onClick={() => navigate("/calendar/day?tab=tasks")}
            >
              Add Mission
            </button>
          </div>
        )}
      </div>
      {currentPopupItem && (
        <DetailPopup
          item={currentPopupItem}
          onClose={closePopup}
          container={document.body}
        />
      )}
    </div>
  );
};

export default CompletedTasksCard;
