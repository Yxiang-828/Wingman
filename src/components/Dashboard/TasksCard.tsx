import React, { useMemo, useCallback, useEffect, useState } from "react";
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

// ✅ FIXED: Complete TasksCard with immediate state update
const TasksCard: React.FC<TasksCardProps> = ({ tasks, onToggleTask }) => {
  const navigate = useNavigate();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();
  
  // ✅ LOCAL STATE: Track tasks for immediate updates
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  
  // ✅ SYNC: Keep local state in sync with props
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);
  
  // ✅ UPDATED: Use local tasks for display calculations
  const { pendingTasks, failedTasks, totalPendingTasks, totalFailedTasks } = useMemo(() => {
    const pending = localTasks
      .filter(task => !task.completed && !task.failed)
      .sort((a, b) => {
        if (a.task_time && b.task_time) return a.task_time.localeCompare(b.task_time);
        if (a.task_time && !b.task_time) return -1;
        if (!a.task_time && b.task_time) return 1;
        return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
      });

    const failed = localTasks
      .filter(task => task.failed && !task.completed)
      .sort((a, b) => {
        if (a.task_time && b.task_time) return a.task_time.localeCompare(b.task_time);
        if (a.task_time && !b.task_time) return -1;
        if (!a.task_time && b.task_time) return 1;
        return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
      });

    return {
      pendingTasks: pending.slice(0, 8),
      failedTasks: failed.slice(0, 4),
      totalPendingTasks: pending.length,
      totalFailedTasks: failed.length
    };
  }, [localTasks]); // ✅ USE localTasks instead of tasks

  const hasMorePending = totalPendingTasks > 8;
  const hasMoreFailed = totalFailedTasks > 4;
  
  // Handle clicking on a task item - show popup
  const handleTaskClick = useCallback((task: Task) => {
    showPopupFor(task);
  }, [showPopupFor]);
  
  // ✅ COMPLETE: Task completion with immediate state update
  const handleTaskCompletion = useCallback(async (e: React.MouseEvent, task: Task): Promise<void> => {
    e.stopPropagation();
    
    if (task.isProcessing) return;
    
    try {
      console.log(`🎯 TasksCard: Completing task ${task.id}`);
      
      // ✅ STEP 1: IMMEDIATE STATE UPDATE (for instant UI feedback)
      setLocalTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === task.id 
            ? { ...t, completed: true, isProcessing: true }
            : t
        )
      );
      
      // ✅ STEP 2: Update in database
      await window.electronAPI.db.updateTask(task.id, { completed: true });
      
      // ✅ STEP 3: Clear processing state and trigger dashboard refresh
      setLocalTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === task.id 
            ? { ...t, isProcessing: false }
            : t
        )
      );
      
      // ✅ STEP 4: Trigger parent refresh
      const refreshEvent = new CustomEvent("dashboard-refresh");
      window.dispatchEvent(refreshEvent);
      
      console.log(`✅ TasksCard: Task ${task.id} completed with immediate UI update`);
      
    } catch (error) {
      console.error(`❌ Error completing task ${task.id}:`, error);
      
      // ✅ ROLLBACK: Revert state on error
      setLocalTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === task.id 
            ? { ...t, completed: false, isProcessing: false }
            : t
        )
      );
    }
  }, []);

  // ✅ AUTO-DETECT: Failed tasks every 60 seconds
  useEffect(() => {
    const checkForFailedTasks = async () => {
      const userId = getCurrentUserId();
      if (!userId) return;

      try {
        const today = getTodayDateString();
        const currentTime = getCurrentTimeString();
        
        // Get current tasks from local state
        const tasksToCheck = localTasks.filter(task => 
          !task.completed && 
          !task.failed && 
          task.task_time &&
          task.task_time < currentTime
        );

        if (tasksToCheck.length === 0) return;

        console.log(`⏰ TasksCard: Found ${tasksToCheck.length} tasks to mark as failed`);

        // Update failed tasks in database
        for (const task of tasksToCheck) {
          await window.electronAPI.db.updateTask(task.id, { failed: true });
        }

        // ✅ IMMEDIATE STATE UPDATE: Mark failed tasks in local state
        setLocalTasks(prevTasks => 
          prevTasks.map(task => {
            const shouldFail = tasksToCheck.find(failedTask => failedTask.id === task.id);
            if (shouldFail) {
              return { ...task, failed: true };
            }
            return task;
          })
        );

        console.log(`✅ TasksCard: Updated UI immediately for ${tasksToCheck.length} failed tasks`);

      } catch (error) {
        console.error('❌ TasksCard: Error checking for failed tasks:', error);
      }
    };

    // Check immediately on mount
    checkForFailedTasks();
    
    // Then check every 60 seconds
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
              {/* PENDING TASKS */}
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

              {/* FAILED TASKS */}
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
            <p>No pending tasks</p>
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