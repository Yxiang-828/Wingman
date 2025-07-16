import React, { useMemo, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import { isRecurringTask } from "../../api/Task";
import { useNotifications } from "../../context/NotificationsContext";
import DetailPopup from "../Common/DetailPopup";

interface TasksCardProps {
  tasks: Task[];
  onToggleTask: (task: Task) => Promise<Task>;
}

/**
 * TasksCard Component
 * Displays today's tasks with instant completion feedback and failure detection
 */
const TasksCard: React.FC<TasksCardProps> = ({ tasks, onToggleTask }) => {
  const navigate = useNavigate();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();

  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  /**
   * Keeps local state synchronized with parent data
   */
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  /**
   * Listen for task failure events from TaskFailureManager
   * Refreshes dashboard when centralized failure detection runs
   */
  useEffect(() => {
    const handleTaskFailureUpdate = () => {
      // Trigger parent refresh by dispatching dashboard-refresh event
      window.dispatchEvent(new CustomEvent("dashboard-refresh"));
    };

    const handleDashboardRefresh = () => {
      console.log("TasksCard: Dashboard refresh requested");
      // Parent will handle the actual data refresh
    }; // Listen for task failure events from TaskFailureManager
    window.addEventListener("tasks-failed-update", handleTaskFailureUpdate);
    window.addEventListener("dashboard-refresh", handleDashboardRefresh);

    return () => {
      window.removeEventListener(
        "tasks-failed-update",
        handleTaskFailureUpdate,
      );
      window.removeEventListener("dashboard-refresh", handleDashboardRefresh);
    };
  }, []);

  /**
   * Periodic refresh to ensure UI stays current
   * Lightweight check every 60 seconds to sync with TaskFailureManager
   */
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      console.log("TasksCard: Periodic refresh - triggering dashboard refresh");
      window.dispatchEvent(new CustomEvent("dashboard-refresh"));
    }, 60000); // 60 seconds - matches TaskFailureManager interval

    return () => clearInterval(refreshInterval);
  }, []);

  /**
   * Organizes tasks by status with smart sorting
   * Pending tasks sorted by time, failed tasks grouped separately
   */
  const { pendingTasks, failedTasks, totalPendingTasks, totalFailedTasks } =
    useMemo(() => {
      const pending = localTasks
        .filter((task) => !task.completed && !task.failed)
        .sort((a, b) => {
          if (a.task_time && b.task_time)
            return a.task_time.localeCompare(b.task_time);
          if (a.task_time && !b.task_time) return -1;
          if (!a.task_time && b.task_time) return 1;
          return (
            new Date(a.created_at || "").getTime() -
            new Date(b.created_at || "").getTime()
          );
        });

      const failed = localTasks
        .filter((task) => task.failed && !task.completed)
        .sort((a, b) => {
          if (a.task_time && b.task_time)
            return a.task_time.localeCompare(b.task_time);
          if (a.task_time && !b.task_time) return -1;
          if (!a.task_time && b.task_time) return 1;
          return (
            new Date(a.created_at || "").getTime() -
            new Date(b.created_at || "").getTime()
          );
        });

      return {
        pendingTasks: pending.slice(0, 8),
        failedTasks: failed.slice(0, 4),
        totalPendingTasks: pending.length,
        totalFailedTasks: failed.length,
      };
    }, [localTasks]);

  const hasMorePending = totalPendingTasks > 8;
  const hasMoreFailed = totalFailedTasks > 4;

  const handleTaskClick = useCallback(
    (task: Task) => {
      showPopupFor(task);
    },
    [showPopupFor],
  );

  /**
   * Handles task completion with immediate UI feedback
   */
  const handleTaskCompletion = useCallback(
    async (e: React.MouseEvent, task: Task): Promise<void> => {
      e.stopPropagation();

      if (task.isProcessing) return;

      try {
        console.log(`Wingman: Completing task ${task.id}`); // Immediate state update for instant UI feedback
        setLocalTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id
              ? { ...t, completed: true, isProcessing: true }
              : t,
          ),
        );

        // Use parent's toggle function for consistency
        await onToggleTask(task);

        // Send immediate congratulation notification
        try {
          const { systemNotificationService } = await import(
            "../../services/SystemNotificationService"
          );
          await systemNotificationService.showTaskCompletion(task.title);
          console.log(
            `WINGMAN SUCCESS: Congratulation notification sent for task: ${task.title}`,
          );
        } catch (error) {
          console.error(
            "WINGMAN ERROR: Failed to send congratulation notification:",
            error,
          );
        } // Dispatch completion event for OSNotificationManager
        window.dispatchEvent(
          new CustomEvent("task-completed", {
            detail: { taskId: task.id, title: task.title },
          }),
        );

        // Dispatch dashboard refresh event to update CompletedTasksCard
        window.dispatchEvent(new CustomEvent("dashboard-refresh"));

        // Clear processing state (refresh handled by NotificationDataBridge)
        setLocalTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id ? { ...t, isProcessing: false } : t,
          ),
        );

        console.log(
          `Wingman: Task ${task.id} completed with immediate UI update`,
        );
      } catch (error) {
        console.error(`Wingman: Error completing task ${task.id}:`, error);

        // Rollback state on error
        setLocalTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id
              ? { ...t, completed: false, isProcessing: false }
              : t,
          ),
        );
      }
    },
    [onToggleTask],
  );
  /**
   * Auto-detects failed tasks based on current time
   * NOTE: This is now handled by the centralized TaskFailureManager in App.tsx
   */
  // Removed local failure detection - now handled by TaskFailureManager

  return (
    <div className="dashboard-card tasks-card">
      <div className="dashboard-card-header">
        <h2>Today's Tasks ({totalPendingTasks + totalFailedTasks})</h2>
        <button
          className="card-action-btn"
          onClick={() => navigate("/calendar/day?tab=tasks")}
        >
          View All
        </button>
      </div>

      <div className="dashboard-card-content">
        {pendingTasks.length > 0 || failedTasks.length > 0 ? (
          <>
            <div className="dashboard-list">
              {/* Pending Tasks */}
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="dashboard-item task"
                  onClick={() => handleTaskClick(task)}
                >
                  <div
                    className="item-status"
                    onClick={(e) => handleTaskCompletion(e, task)}
                    title="Mark as completed"
                  >
                    {task.isProcessing ? "⏳" : "○"}
                  </div>{" "}
                  <div className="item-content">
                    <div className="item-title">
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
                    </div>
                  </div>
                </div>
              ))}

              {/* Failed Tasks */}
              {failedTasks.map((task) => (
                <div
                  key={task.id}
                  className="dashboard-item task failed"
                  onClick={() => handleTaskClick(task)}
                >
                  <div className="item-status failed">❌</div>{" "}
                  <div className="item-content">
                    <div className="item-title failed">
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
                      <span className="failed-label">Failed</span>
                      {task.task_time && (
                        <span className="item-time">{task.task_time}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {(hasMorePending || hasMoreFailed) && (
              <button
                className="view-more-btn"
                onClick={() => navigate("/calendar/day?tab=tasks")}
              >
                View All {totalPendingTasks + totalFailedTasks} Tasks →
              </button>
            )}
          </>
        ) : (
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon">📋</div>
            <p>No pending missions, boss</p>
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

export default TasksCard;
