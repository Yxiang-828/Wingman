import React from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import { useNotifications } from "../../context/NotificationsContext";
import { useData } from "../../context/DataContext";
import DetailPopup from "../Common/DetailPopup";
import { formatDateToString } from "../../utils/timeUtils";
import "./Dashboard.css";

interface CompletedTasksCardProps {
  tasks: Task[];
}

const CompletedTasksCard: React.FC<CompletedTasksCardProps> = ({ tasks }) => {
  const navigate = useNavigate();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();
  const { toggleTask } = useData();
  const completedTasks = tasks.filter((task) => task.completed);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return dateStr;
    }
  };

  // Handle clicking on a task item - show popup
  const handleTaskClick = (task: Task) => {
    showPopupFor(task);
  };

  // ✅ FIXED: Handle clicking on the task status circle specifically - toggle completion
  const handleStatusClick = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    e.preventDefault();

    if (task.isProcessing) return;

    try {
      console.log("🔄 CompletedTasksCard: Toggling task completion for:", task.id);

      // Call the API through DataContext to toggle the task
      const updatedTask = await toggleTask(task);
      console.log("✅ CompletedTasksCard: Task toggled successfully:", updatedTask);

      // Close popup if it's open for this task
      if (currentPopupItem && currentPopupItem.id === task.id) {
        closePopup();
      }

      // Note: No need to update local state here since DataContext broadcasts the change
      // and the Dashboard component will re-fetch and update the tasks prop
    } catch (error) {
      console.error("❌ Error toggling task status:", error);
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
      console.log(
        "CompletedTasksCard: Task un-completed from popup:",
        updatedTask
      );

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
          onClick={() => navigate("/calendar/day?tab=tasks")}
        >
          View Tasks
        </button>
      </div>

      {completedTasks.length > 0 ? (
        <ul className="tasks-list">
          {/* ✅ FIXED: Show more items, not limited to 3 */}
          {completedTasks.map((task) => (
            <li
              key={`task-${task.id}`}
              className="task-item completed"
              onClick={() => handleTaskClick(task)}
            >
              {/* ✅ FIXED: Make sure the status button is properly clickable */}
              <div
                className="task-status"
                onClick={(e) => handleStatusClick(e, task)}
                style={{
                  cursor: "pointer",
                  userSelect: "none",
                  zIndex: 10,
                  position: "relative",
                }}
                title="Click to mark as incomplete"
              >
                ✓
              </div>
              <div className="task-details">
                <div className="task-title">{task.title}</div>
                <div className="task-meta">
                  {task.task_time && (
                    <span className="task-time">{task.task_time}</span>
                  )}
                  <span className="task-date">
                    {formatDate(task.task_date)}
                  </span>
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
            onClick={() => navigate("/calendar/day?tab=tasks")}
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
