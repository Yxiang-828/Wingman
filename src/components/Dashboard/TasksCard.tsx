import React, { useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import DetailPopup from "../Common/DetailPopup";
import { getCurrentUserId } from "../../utils/helpers"; // ✅ KEEP: User ID from helpers
import { getCurrentTimeString, getTodayDateString } from "../../utils/timeUtils"; // ✅ FIX: Time functions from timeUtils

interface TasksCardProps {
  tasks: Task[];
  onToggleTask: (task: Task) => Promise<Task>;
}

const TasksCard: React.FC<TasksCardProps> = ({ tasks, onToggleTask }) => {
  const navigate = useNavigate();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();
  
  // ✅ UPDATED: Separate tasks into pending and failed, with proper sorting
  const { pendingTasks, failedTasks, totalPendingTasks, totalFailedTasks } = useMemo(() => {
    const pending = tasks
      .filter(task => !task.completed && !task.failed)
      .sort((a, b) => {
        // Sort by time (earliest first), then by creation time
        if (a.task_time && b.task_time) {
          return a.task_time.localeCompare(b.task_time);
        }
        if (a.task_time && !b.task_time) return -1;
        if (!a.task_time && b.task_time) return 1;
        return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
      });

    const failed = tasks
      .filter(task => task.failed && !task.completed)
      .sort((a, b) => {
        // Sort failed tasks by time as well (earliest first)
        if (a.task_time && b.task_time) {
          return a.task_time.localeCompare(b.task_time);
        }
        if (a.task_time && !b.task_time) return -1;
        if (!a.task_time && b.task_time) return 1;
        return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
      });

    return {
      pendingTasks: pending.slice(0, 8), // Show max 8 pending
      failedTasks: failed.slice(0, 4), // Show max 4 failed
      totalPendingTasks: pending.length,
      totalFailedTasks: failed.length
    };
  }, [tasks]);

  const hasMorePending = totalPendingTasks > 8;
  const hasMoreFailed = totalFailedTasks > 4;
  
  // Handle clicking on a task item - show popup
  const handleTaskClick = useCallback((task: Task) => {
    showPopupFor(task);
  }, [showPopupFor]);
  
  // ✅ UNCHANGED: Task completion handler
  const handleTaskCompletion = useCallback(async (e: React.MouseEvent, task: Task): Promise<void> => {
    e.stopPropagation(); // Prevent item click
    
    if (task.isProcessing) return;
    
    try {
      console.log(`🎯 TasksCard: Completing task ${task.id}`);
      
      // Use the parent's toggle handler
      await onToggleTask(task);
      
      // ✅ IMMEDIATE: Scroll to completed tasks card after a brief delay
      setTimeout(() => {
        const completedCard = document.querySelector('.completed-tasks-card');
        if (completedCard) {
          completedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      
      console.log(`✅ TasksCard: Task ${task.id} completed successfully`);
      
    } catch (error) {
      console.error(`❌ Error toggling task ${task.id}:`, error);
    }
  }, [onToggleTask]);

  // ✅ ADD: Auto-detect failed tasks every 60 seconds (COPIED FROM NOTIFICATIONS)
  useEffect(() => {
    const checkForFailedTasks = async () => {
      try {
        const userId = getCurrentUserId();
        if (!userId) return;

        const currentTime = getCurrentTimeString();
        const today = getTodayDateString();
        
        console.log(`⏰ TasksCard: Checking for failed tasks at ${currentTime}`);

        // Get today's tasks
        const todaysTasks = await window.electronAPI.db.getTasks(userId, today);
        if (!todaysTasks || todaysTasks.length === 0) return;

        // Find tasks that should be marked as failed
        const tasksToFail = todaysTasks.filter((task: Task) => {
          if (task.completed || task.failed || !task.task_time) return false;
          
          // Compare current time with task time
          return currentTime >= task.task_time;
        });

        if (tasksToFail.length > 0) {
          console.log(`❌ TasksCard: Found ${tasksToFail.length} tasks to mark as failed`);
          
          // Update each failed task in database
          for (const task of tasksToFail) {
            await window.electronAPI.db.updateTask(task.id, {
              failed: true,
              updated_at: new Date().toISOString()
            });
            console.log(`❌ TasksCard: Marked task ${task.id} as failed`);
          }

          // Trigger dashboard refresh after marking tasks as failed
          const refreshEvent = new CustomEvent("dashboard-refresh");
          window.dispatchEvent(refreshEvent);
          
          console.log(`✅ TasksCard: Completed failed task detection and triggered refresh`);
        }
      } catch (error) {
        console.error("❌ TasksCard: Error in failed task detection:", error);
      }
    };

    // Check immediately on mount
    checkForFailedTasks();
    
    // Then check every 60 seconds
    const interval = setInterval(checkForFailedTasks, 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

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
              {/* Failed Tasks First */}
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
                      {task.task_time && (
                        <span className="item-time">{task.task_time}</span>
                      )}
                      <span className="failed-label">Failed</span>
                    </div>
                  </div>
                </div>
              ))}

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
                    ○
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
            <div className="dashboard-empty-icon">✅</div>
            <p>No pending tasks for today</p>
            <button
              className="action-btn"
              onClick={() => navigate("/calendar/day?tab=tasks")}
            >
              Add Task
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