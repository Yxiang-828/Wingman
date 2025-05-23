import React from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import { useNotifications } from "../../context/NotificationsContext";
import { useData } from "../../context/DataContext";
import DetailPopup from "../Common/DetailPopup";
import "./Dashboard.css";

interface TasksCardProps {
  tasks: Task[]; // Should be pending tasks only
  onToggleTask: (task: Task) => void;
}

const TasksCard: React.FC<TasksCardProps> = ({ tasks, onToggleTask }) => {
  const navigate = useNavigate();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();
  const { toggleTask } = useData();

  // Handle clicking on a task item - show popup
  const handleTaskClick = (task: Task) => {
    showPopupFor(task);
  };

  // Handle clicking on the task status circle specifically - toggle completion
  const handleStatusClick = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation(); // Prevent triggering the task item click
    e.preventDefault(); // Prevent default behavior

    // Prevent multiple simultaneous toggle operations on the same task
    if (task.isProcessing) {
      console.log("Task already being processed, ignoring click");
      return;
    }

    // Store the current scroll position
    const container = e.currentTarget.closest('.tasks-list');
    const scrollPosition = container ? container.scrollTop : 0;

    // Create a local copy with processing state
    const processingTask = { ...task, isProcessing: true };

    // Update UI immediately to show processing state
    onToggleTask(processingTask);

    try {
      // Use the DataProvider to toggle the task
      const updatedTask = await toggleTask(task);
      console.log("TaskCard: Task toggled successfully:", updatedTask);

      // Propagate the change up to parent component
      onToggleTask(updatedTask);

      // Make sure popup closes if it's open for this task
      if (currentPopupItem && 'id' in currentPopupItem && currentPopupItem.id === task.id) {
        closePopup();
      }
      
      // Restore scroll position after state update
      if (container) {
        setTimeout(() => {
          container.scrollTop = scrollPosition;
        }, 0);
      }
    } catch (error) {
      console.error("Error toggling task status:", error);
      // Revert to original state on error
      onToggleTask(task);
    }
  };

  // Function to handle task completion from popup - delegate to handleStatusClick
  const completeTask = async (taskId: number): Promise<void> => {
    console.log("TaskCard: completeTask called for ID:", taskId);

    // Find the task to complete
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      console.error(`Task with ID ${taskId} not found`);
      return;
    }

    try {
      // Use the DataProvider to toggle the task
      const updatedTask = await toggleTask(task);
      console.log("TaskCard: Task toggled successfully:", updatedTask);

      // Propagate the change up to parent component
      onToggleTask(updatedTask);

      // Close the popup if it's open
      closePopup();
    } catch (error) {
      console.error("Error toggling task status:", error);
    }
  };

  return (
    <div className="dashboard-card tasks-card">
      <div className="dashboard-card-header">
        <h2>Today's Tasks</h2>
        <button
          className="card-action-btn"
          onClick={() => navigate("/calendar/day")}
        >
          View All
        </button>
      </div>

      {tasks.length > 0 ? (
        <ul className="tasks-list">
          {tasks.map((task) => (
            <li
              key={`task-${task.id}`}
              className={`task-item ${task.completed ? "completed" : ""} ${task.isProcessing ? "processing" : ""}`}
              onClick={() => handleTaskClick(task)}
            >
              <div
                className={`task-status ${task.completed ? "completed" : ""} ${task.isProcessing ? "processing" : ""}`}
                onClick={(e) => handleStatusClick(e, task)}
              >
                {/* No text - style will show icon */}
              </div>
              <div className="task-details">
                <div className="task-title">{task.text}</div>
                <div className="task-meta">
                  {task.time && <span className="task-time">{task.time}</span>}
                  {/* <span className="task-date">{formatDate(task.date)}</span> */}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-list-message">
          <p>No tasks for today</p>
          <button
            className="action-btn small"
            onClick={() => navigate("/calendar/day")}
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
