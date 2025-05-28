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
  
  // FIXED: Handle task completion with better state management
  const handleCompleteTask = useCallback(async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    
    // Prevent multiple clicks
    if (task.isProcessing) return;
    
    try {
      // 1. Apply optimistic update with processing flag
      const optimisticTask = {
        ...task,
        isProcessing: true, 
        completed: !task.completed,
        // ADDED: Ensure consistent field names
        task_date: task.task_date, // FIXED! Was using 'date' inconsistently
        task_time: task.task_time // FIXED! Was using 'time' inconsistently
      };
      
      // 2. Update local state immediately
      onToggleTask(optimisticTask);
      
      // 3. Call API to persist the change
      const updatedTask = await toggleTask(task);
      
      // 4. Update with final state from server
      onToggleTask(updatedTask);
    } catch (error) {
      console.error("Error completing task:", error);
      
      // 5. Revert on error
      onToggleTask({
        ...task,
        isProcessing: false
      });
    }
  }, [onToggleTask, toggleTask]);
  
  // FIXED: Function to handle task completion from popup
  const completeTask = useCallback(async (taskId: number): Promise<void> => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    try {
      // 1. Apply optimistic update
      onToggleTask({
        ...task,
        isProcessing: true,
        completed: !task.completed
      });
      
      // 2. Call API
      const updatedTask = await toggleTask(task);
      
      // 3. Update with final state
      onToggleTask(updatedTask);
      
      // 4. Close popup
      closePopup();
    } catch (error) {
      console.error("Error toggling task status:", error);
      
      // 5. Revert on error
      onToggleTask({
        ...task,
        isProcessing: false
      });
    }
  }, [tasks, onToggleTask, toggleTask, closePopup]);

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
              className={`task-item ${task.isProcessing ? "processing" : ""}`}
              onClick={() => handleTaskClick(task)}
            >
              <div className="task-row">
                {/* Keep only the circle, remove the Complete button */}
                <div 
                  className={`task-status-circle ${task.completed ? "completed" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTask(task);
                  }}
                >
                  {task.completed && <span>✓</span>}
                </div>
                <span className="task-title">{task.title}</span>
                <span className="task-meta">{task.due_time}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-list-message">
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
          onComplete={completeTask}
          container={document.body}
        />
      )}
    </div>
  );
};

export default TasksCard;
