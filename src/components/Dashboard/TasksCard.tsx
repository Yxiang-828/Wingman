import React, { useRef } from "react";
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  // Handle clicking on a task item - show popup
  const handleTaskClick = (task: Task) => {
    showPopupFor(task);
  };

  // Handle clicking on the task status circle specifically - toggle completion
  const handleStatusClick = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation(); // Prevent triggering the task item click
    e.preventDefault(); // Add this line to prevent default behavior

    console.log("TaskCard: Click on status circle for task ID:", task.id);

    // Prevent multiple simultaneous toggle operations on the same task
    if (task.isProcessing) {
      console.log("Task already being processed, ignoring click");
      return;
    }

    // Mark task as processing locally
    const updatedTasks = tasks.map((t) =>
      t.id === task.id ? { ...t, isProcessing: true } : t
    );

    try {
      // Use the DataProvider to toggle the task
      const updatedTask = await toggleTask(task);
      console.log("TaskCard: Task toggled successfully:", updatedTask);

      // Propagate the change up to parent component
      onToggleTask(updatedTask);

      // Make sure popup closes if it's open for this task
      if (currentPopupItem && currentPopupItem.id === task.id) {
        closePopup();
      }
    } catch (error) {
      console.error("Error toggling task status:", error);
    }
  };

  // Function to handle task completion from popup - this may be called separately
  const completeTask = async (taskId: number): Promise<void> => {
    console.log("TaskCard: completeTask called for ID:", taskId);

    try {
      // Find the task to complete
      const task = tasks.find((t) => t.id === taskId);
      if (!task) {
        console.error(`Task with ID ${taskId} not found`);
        return;
      }

      // Prevent duplicate processing
      if (task.isProcessing) {
        console.log("Task already being processed, ignoring call from popup");
        return;
      }

      // Call the API through DataContext to update the task
      const updatedTask = await toggleTask(task);
      console.log("TaskCard: Task completed from popup:", updatedTask);

      // Update local state through the parent component
      onToggleTask(updatedTask);

      // Close the popup when done
      closePopup();
    } catch (error) {
      console.error("Error completing task:", error);
      throw error;
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
              className={`task-item ${task.completed ? "completed" : ""}`}
              onClick={() => handleTaskClick(task)}
            >
              <div
                className="task-status"
                onClick={(e) => handleStatusClick(e, task)}
              >
                {task.completed ? "✓" : "○"}
              </div>
              <div className="task-details">
                <div className="task-title">{task.text}</div>
                <div className="task-meta">
                  {task.time && <span className="task-time">{task.time}</span>}
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
