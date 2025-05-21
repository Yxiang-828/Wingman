import React from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import "./Dashboard.css";

interface CompletedTasksCardProps {
  tasks: Task[];
}

const CompletedTasksCard: React.FC<CompletedTasksCardProps> = ({ tasks }) => {
  const navigate = useNavigate();
  const completedTasks = tasks.filter(task => task.completed);
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
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
            >
              <div className="task-status">
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
    </div>
  );
};

export default CompletedTasksCard;