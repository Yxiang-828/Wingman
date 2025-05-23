import React from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import { useNotifications } from "../../context/NotificationsContext";
import { useData } from "../../context/DataContext";
import DetailPopup from "../Common/DetailPopup";
import "./Dashboard.css";

interface CompletedTasksCardProps {
  tasks: Task[];
}

const CompletedTasksCard: React.FC<CompletedTasksCardProps> = ({ tasks }) => {
  const navigate = useNavigate();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();
  const { toggleTask } = useData();
  const completedTasks = tasks.filter(task => task.completed);
  
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
    e.preventDefault(); // Prevent default behavior

    // Store the current scroll position
    const container = e.currentTarget.closest('.tasks-list');
    const scrollPosition = container ? container.scrollTop : 0;

    console.log("CompletedTasksCard: Click on status circle for task ID:", task.id);

    // Prevent multiple simultaneous toggle operations on the same task
    if (task.isProcessing) {
      console.log("Task already being processed, ignoring click");
      return;
    }

    try {
      // Use the DataProvider to toggle task back to incomplete
      const updatedTask = await toggleTask(task);
      console.log("CompletedTasksCard: Task toggled successfully:", updatedTask);

      // Close popup if it's open for this task
      if (currentPopupItem && currentPopupItem.id === task.id) {
        closePopup();
      }
      
      // Restore scroll position
      if (container) {
        setTimeout(() => {
          container.scrollTop = scrollPosition;
        }, 0);
      }
    } catch (error) {
      console.error("Error toggling task status:", error);
    }
  };

  // Function to handle task completion from popup
  const completeTask = async (taskId: number): Promise<void> => {
    console.log("CompletedTasksCard: completeTask called for ID:", taskId);

    try {
      // Find the task
      const task = completedTasks.find((t) => t.id === taskId);
      if (!task) {
        console.error(`Task with ID ${taskId} not found`);
        return;
      }

      // Call the API through DataContext to update the task
      const updatedTask = await toggleTask(task);
      console.log("CompletedTasksCard: Task un-completed from popup:", updatedTask);

      // Close the popup when done
      closePopup();
    } catch (error) {
      console.error("Error updating task completion:", error);
    }
  };

  return (
    <div className="dashboard-card completed-tasks-card">
      <div className="dashboard-card-header">
        <h2>Completed Tasks</h2>
        <button
          className="card-action-btn"
          onClick={() => navigate("/completed-tasks")}
        >
          View All
        </button>
      </div>
      
      {completedTasks.length > 0 ? (
        <ul className="tasks-list">
          {completedTasks.slice(0, 3).map((task) => (
            <li
              key={`task-${task.id}`}
              className="task-item completed"
              onClick={() => handleTaskClick(task)}
            >
              <div 
                className="task-status"
                onClick={(e) => handleStatusClick(e, task)}
              >
                ✓
              </div>
              <div className="task-details">
                <div className="task-title">{task.text}</div>
                <div className="task-meta">
                  {task.time && <span className="task-time">{task.time}</span>}
                  <span className="task-date">{formatDate(task.date)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-list-message">
          <p>No completed tasks today</p>
          <button
            className="action-btn small"
            onClick={() => navigate("/calendar/day")}
          >
            View Tasks
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

export default CompletedTasksCard;