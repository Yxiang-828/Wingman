import React, { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import DetailPopup from "../Common/DetailPopup";

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
          completedCard.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center'
          });
          
          // Add highlight effect
          completedCard.classList.add('highlight-flash');
          setTimeout(() => {
            completedCard.classList.remove('highlight-flash');
          }, 2000);
        }
      }, 100);
      
      console.log(`✅ TasksCard: Task ${task.id} completed successfully`);
      
    } catch (error) {
      console.error(`❌ Error toggling task ${task.id}:`, error);
    }
  }, [onToggleTask]);

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
        {(pendingTasks.length > 0 || failedTasks.length > 0) ? (
          <>
            <div className="dashboard-list">
              {/* ✅ PENDING TASKS - Show first */}
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

              {/* ✅ FAILED TASKS - Show at bottom */}
              {failedTasks.map((task) => (
                <div
                  key={task.id}
                  className="dashboard-item task failed"
                  onClick={() => handleTaskClick(task)}
                >
                  <div
                    className="item-status failed"
                    title="Failed task"
                  >
                    ✗
                  </div>
                  
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
            <div className="dashboard-empty-icon">📝</div>
            <p>No tasks for today</p>
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