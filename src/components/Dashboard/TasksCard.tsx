import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import { useNotifications } from "../../context/NotificationsContext";
import { useData } from "../../context/DataContext";
import DetailPopup from "../Common/DetailPopup";
import "./Dashboard.css";

interface TasksCardProps {
  tasks: Task[];
  onToggleTask: (task: Task) => void;
}

const TasksCard: React.FC<TasksCardProps> = ({ tasks, onToggleTask }) => {
  const navigate = useNavigate();
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();
  const { toggleTask } = useData();
  
  // Get reference to dashboard container for modal positioning
  useEffect(() => {
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

  // Handles clicking on the entire task item - show popup
  const handleTaskClick = (task: Task) => {
    showPopupFor(task);
  };

  // Handle clicking on the task status circle specifically - toggle completion
  const handleStatusClick = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation(); // Prevent triggering the task item click
    
    try {
      console.log("Toggling task completion via status button:", task.id);
      const updatedTask = await toggleTask(task);
      
      // Use a local state update first for immediate visual feedback
      const updatedTasks = tasks.map(t => 
        t.id === updatedTask.id ? updatedTask : t
      );
      
      // Then propagate the change up to parent component
      onToggleTask(updatedTask);
    } catch (error) {
      console.error("Error toggling task status:", error);
    }
  };

  // Function to handle task completion from popup
  const completeTask = async (taskId: number) => {
    try {
      // Find the task to complete
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error(`Task with ID ${taskId} not found`);
        return;
      }
      
      // Call the API through DataContext to update the task
      const updatedTask = await toggleTask(task);
      
      // Update local state through the parent component
      onToggleTask(updatedTask);
      
      return updatedTask;
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
          container={document.body}
        />
      )}
    </div>
  );
};

export default TasksCard;
