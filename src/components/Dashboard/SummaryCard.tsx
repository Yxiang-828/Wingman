import React from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import "./Dashboard.css"; // Import shared dashboard styles first
import "./SummaryCard.css"; // Then component-specific styles

interface SummaryCardProps {
  tasks: Task[];
  events: CalendarEvent[];
}

const SummaryCard: React.FC<SummaryCardProps> = ({ tasks, events }) => {
  const navigate = useNavigate();
  
  // Navigation handlers with clear purpose
  const navigateToPendingTasks = () => {
    navigate(`/notifications?tab=task`);
  };

  const navigateToEvents = () => {
    navigate(`/notifications?tab=event`);
  };
  
  const navigateToCompletedTasks = () => {
    // Navigate to today's completed tasks
    const today = new Date().toISOString().split("T")[0];
    navigate(`/completed-tasks?date=${today}`);
  };

  // Calculate statistics for today only
  const pendingTasks = tasks.filter(task => !task.completed).length;
  const completedTasks = tasks.filter(task => task.completed).length;
  
  const stats = {
    events: events.length,
    pendingTasks: pendingTasks,
    completedTasks: completedTasks,
  };
  
  return (
    <div className="dashboard-card summary-card">
      <div className="dashboard-card-header">
        <h2>Today's Summary</h2>
      </div>
      
      <div className="quote-box">
        "The key is not to prioritize what's on your schedule, but to schedule your priorities."
      </div>
      
      <div className="summary-stats">
        <div 
          className="stat-item clickable" 
          onClick={navigateToEvents}
          tabIndex={0}
          role="button"
          aria-label="View today's events"
        >
          <span className="stat-number">{stats.events}</span>
          <span className="stat-label">Today's Events</span>
        </div>
        
        <div 
          className="stat-item clickable" 
          onClick={navigateToPendingTasks}
          tabIndex={0}
          role="button"
          aria-label="View pending tasks"
        >
          <span className="stat-number">{stats.pendingTasks}</span>
          <span className="stat-label">Pending Tasks</span>
        </div>
        
        <div 
          className="stat-item clickable" 
          onClick={navigateToCompletedTasks}
          tabIndex={0}
          role="button"
          aria-label="View today's completed tasks"
        >
          <span className="stat-number">{stats.completedTasks}</span>
          <span className="stat-label">Completed Today</span>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;