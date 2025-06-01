import React, { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import DetailPopup from "../Common/DetailPopup";
import { VirtualizedTaskList } from "../Calendar/VirtualizedList";
import "./Dashboard.css";
import "./TasksCard.css";

interface TasksCardProps {
  tasks: Task[];
  onToggleTask: (task: Task) => void;
}

const TasksCard: React.FC<TasksCardProps> = ({ tasks, onToggleTask }) => {
  const navigate = useNavigate();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();
  const { toggleTask } = useData();
  
  // Get pending tasks only
  const pendingTasks = useMemo(() => {
    return tasks.filter(task => !task.completed);
  }, [tasks]);
  
  // Handle clicking on a task item - show popup
  const handleTaskClick = useCallback((task: Task) => {
    showPopupFor(task);
  }, [showPopupFor]);
  
  // Handle task completion
  const handleTaskCompletion = useCallback(async (task: Task): Promise<void> => {
    if (task.isProcessing) return;
    
    try {
      const updatedTask = await toggleTask(task);
      onToggleTask(updatedTask);
    } catch (error) {
      console.error(`❌ Error toggling task ${task.id}:`, error);
    }
  }, [onToggleTask, toggleTask]);
  
  // Handle deletion - removed since we removed delete buttons
  const handleDeleteTask = useCallback(async (task: Task) => {
    console.log("Delete task:", task.id);
  }, []);
  
  // Handle completion from popup
  const handleCompleteFromPopup = useCallback(async (taskId: number): Promise<void> => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    await handleTaskCompletion(task);
    closePopup();
  }, [tasks, handleTaskCompletion, closePopup]);

  return (
    <div className="dashboard-card tasks-card">
      <div className="dashboard-card-header">
        <h2>Today's Tasks ({pendingTasks.length})</h2>
        <button
          className="card-action-btn"
          onClick={() => navigate("/calendar/day?tab=tasks")}
        >
          View All
        </button>
      </div>

      {pendingTasks.length > 0 ? (
        <div className="tasks-virtualized-container">
          <VirtualizedTaskList
            tasks={pendingTasks}
            onTaskClick={handleTaskClick}
            onCompleteTask={handleTaskCompletion}
            onDeleteTask={handleDeleteTask}
          />
        </div>
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