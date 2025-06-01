import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import DetailPopup from "../Common/DetailPopup";
import "./Dashboard.css"; // Import shared styles first
import "./TasksCard.css"; // Then component-specific styles

interface TasksCardProps {
  tasks: Task[];
  onToggleTask: (task: Task) => void;
}

const TasksCard: React.FC<TasksCardProps> = ({ tasks, onToggleTask }) => {
  const navigate = useNavigate();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();
  const { toggleTask } = useData();
  
  // Get pending tasks only
  const pendingTasks = React.useMemo(() => {
    return tasks.filter(task => !task.completed);
  }, [tasks]);
  
  // Handle clicking on a task item - show popup
  const handleTaskClick = useCallback((task: Task) => {
    showPopupFor(task);
  }, [showPopupFor]);
  
  // UNIFIED: Single task completion handler for all scenarios
  const handleTaskCompletion = useCallback(async (task: Task, fromPopup: boolean = false): Promise<void> => {
    if (task.isProcessing) {
      console.log("Task already being processed, ignoring request");
      return;
    }
    
    try {
      // ✅ KEEP: Only call API, let broadcasts handle UI updates
      const updatedTask = await toggleTask(task);
      
      // ✅ KEEP: Update parent state once with final result
      onToggleTask(updatedTask);
      
      if (fromPopup) {
        closePopup();
      }
      
      console.log(`✅ Task ${task.id} completion toggled successfully`);
    } catch (error) {
      console.error(`❌ Error toggling task ${task.id}:`, error);
    }
  }, [onToggleTask, toggleTask, closePopup]);
  
  // Handle status circle click (completion toggle)
  const handleStatusCircleClick = useCallback((e: React.MouseEvent, task: Task) => {
    e.stopPropagation(); // Prevent triggering task item click
    handleTaskCompletion(task, false);
  }, [handleTaskCompletion]);
  
  // Handle completion from popup (used by DetailPopup)
  const handleCompleteFromPopup = useCallback(async (taskId: number): Promise<void> => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      console.error(`Task with ID ${taskId} not found`);
      return;
    }
    
    await handleTaskCompletion(task, true);
  }, [tasks, handleTaskCompletion]);

  return (
    <div className="dashboard-card tasks-card">
      <div className="dashboard-card-header">
        <h2>Today's Tasks</h2>
        <button
          className="card-action-btn"
          onClick={() => navigate("/calendar/day?tab=tasks")}
        >
          View All
        </button>
      </div>

      {pendingTasks.length > 0 ? (
        <ul className="tasks-list">
          {pendingTasks.map((task) => (
            <li 
              key={`task-${task.id}`} 
              className={`task-item ${task.isProcessing ? "processing" : ""} ${task.completed ? "completed" : ""}`}
              onClick={() => handleTaskClick(task)}
            >
              <div className="task-row">
                <div 
                  className={`task-status-circle ${task.completed ? "completed" : ""} ${task.isProcessing ? "processing" : ""}`}
                  onClick={(e) => handleStatusCircleClick(e, task)}
                  title={task.completed ? "Mark as incomplete" : "Mark as complete"}
                >
                  {task.isProcessing ? (
                    <span className="spinner">⟳</span>
                  ) : task.completed ? (
                    <span>✓</span>
                  ) : null}
                </div>
                
                <div className="task-content">
                  <span className="task-title">{task.title}</span>
                  <div className="task-meta">
                    {/* FIXED: Use task_time instead of due_time */}
                    {task.task_time && (
                      <span className="task-time">{task.task_time}</span>
                    )}
                    {task.urgency_level && task.urgency_level > 1 && (
                      <span className={`task-priority priority-${task.urgency_level >= 4 ? 'urgent' : task.urgency_level >= 3 ? 'high' : 'medium'}`}>
                        {task.urgency_level >= 4 ? '🔥' : task.urgency_level >= 3 ? '⚡' : '⭐'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-list-message">
          <div className="empty-icon">📝</div>
          <p>No pending tasks for today</p>
          <button
            className="action-btn small"
            onClick={() => navigate("/calendar/day?tab=tasks")}
          >
            Add Task
          </button>
        </div>
      )}

      {currentPopupItem && (
        <DetailPopup
          item={currentPopupItem}
          onClose={closePopup}
          onComplete={handleCompleteFromPopup}
          container={document.body}
        />
      )}
    </div>
  );
};

export default TasksCard;