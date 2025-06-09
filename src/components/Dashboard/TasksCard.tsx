import React, { useMemo, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import DetailPopup from "../Common/DetailPopup";
import { getCurrentUserId } from "../../utils/helpers";
import {
  getCurrentTimeString,
  getTodayDateString,
} from "../../utils/timeUtils";

interface TasksCardProps {
  tasks: Task[];
  onToggleTask: (task: Task) => Promise<Task>;
}

/**
 * TasksCard Component - Your Wingman's Mission Control
 * Displays today's tasks with instant completion feedback and failure detection
 * Your faithful assistant tracks every mission status
 */
const TasksCard: React.FC<TasksCardProps> = ({ tasks, onToggleTask }) => {
  const navigate = useNavigate();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();

  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  /**
   * Keeps local state synchronized with parent data
   * Your Wingman maintains real-time task status
   */
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

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
    [showPopupFor]
  );

  /**
   * Handles task completion with immediate UI feedback
   * Your Wingman provides instant visual confirmation
   */
  const handleTaskCompletion = useCallback(
    async (e: React.MouseEvent, task: Task): Promise<void> => {
      e.stopPropagation();

      if (task.isProcessing) return;

      try {
        console.log(`Wingman: Completing task ${task.id}`);

        // Immediate state update for instant UI feedback
        setLocalTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id ? { ...t, completed: true, isProcessing: true } : t
          )
        );

        // Update in database
        await window.electronAPI.db.updateTask(task.id, { completed: true });

        // Dispatch completion event for OSNotificationManager
        window.dispatchEvent(new CustomEvent('task-completed', {
          detail: { taskId: task.id, title: task.title }
        }));

        // Clear processing state and trigger dashboard refresh
        setLocalTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id ? { ...t, isProcessing: false } : t
          )
        );

        // Trigger parent refresh
        const refreshEvent = new CustomEvent("dashboard-refresh");
        window.dispatchEvent(refreshEvent);

        console.log(
          `Wingman: Task ${task.id} completed with immediate UI update`
        );
      } catch (error) {
        console.error(`Wingman: Error completing task ${task.id}:`, error);

        // Rollback state on error
        setLocalTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id
              ? { ...t, completed: false, isProcessing: false }
              : t
          )
        );
      }
    },
    []
  );

  /**
   * Auto-detects failed tasks based on current time
   * Your Wingman never misses a deadline
   */
  useEffect(() => {
    const checkForFailedTasks = async () => {
      const userId = getCurrentUserId();
      if (!userId) return;

      try {
        const today = getTodayDateString();
        const currentTime = getCurrentTimeString();

        const tasksToCheck = localTasks.filter(
          (task) =>
            !task.completed &&
            !task.failed &&
            task.task_time &&
            task.task_time < currentTime
        );

        if (tasksToCheck.length === 0) return;

        console.log(
          `Wingman: Found ${tasksToCheck.length} tasks to mark as failed`
        );

        // Update failed tasks in database
        for (const task of tasksToCheck) {
          await window.electronAPI.db.updateTask(task.id, { failed: true });
        }

        // Immediate state update for failed tasks
        setLocalTasks((prevTasks) =>
          prevTasks.map((task) => {
            const shouldFail = tasksToCheck.find(
              (failedTask) => failedTask.id === task.id
            );
            if (shouldFail) {
              return { ...task, failed: true };
            }
            return task;
          })
        );

        console.log(
          `Wingman: Updated UI immediately for ${tasksToCheck.length} failed tasks`
        );
      } catch (error) {
        console.error("Wingman: Error checking for failed tasks:", error);
      }
    };

    checkForFailedTasks();
    const interval = setInterval(checkForFailedTasks, 60 * 1000);
    return () => clearInterval(interval);
  }, [localTasks]);

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
                  </div>
                  <div className="item-content">
                    <div className="item-title">{task.title}</div>
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
                  <div className="item-status failed">❌</div>
                  <div className="item-content">
                    <div className="item-title failed">{task.title}</div>
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
