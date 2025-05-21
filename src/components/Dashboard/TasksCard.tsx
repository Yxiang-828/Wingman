import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import { useNotifications } from "../../context/NotificationsContext";
import DetailPopup from "../Common/DetailPopup";
import "./Dashboard.css";

interface TasksCardProps {
  tasks: Task[];
  onToggleTask: (task: Task) => void;
}

const TasksCard: React.FC<TasksCardProps> = ({ tasks, onToggleTask }) => {
  const navigate = useNavigate();
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const { showPopupFor, currentPopupItem, closePopup, completeTask } =
    useNotifications();

  // Get reference to dashboard container for modal positioning
  useEffect(() => {
    // Find the dashboard container
    dashboardRef.current =
      document.querySelector(".dashboard") ||
      document.querySelector(".dashboard-container") ||
      document.getElementById("dashboard");
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const handleTaskClick = (task: Task) => {
    showPopupFor(task);
  };

  // Make sure each task has a unique key by using its ID
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
              key={`task-${task.id}`} // Use a proper prefix + id format
              className={`task-item ${task.completed ? "completed" : ""}`}
              onClick={() => handleTaskClick(task)}
            >
              <div className="task-status">{task.completed ? "✓" : "○"}</div>
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
          container={dashboardRef.current || undefined}
        />
      )}
    </div>
  );
};

export default TasksCard;
