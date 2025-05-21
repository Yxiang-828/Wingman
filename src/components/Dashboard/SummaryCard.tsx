import React from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import "./Dashboard.css";

interface SummaryCardProps {
  tasks: Task[];
  events: CalendarEvent[];
}

const SummaryCard: React.FC<SummaryCardProps> = ({ tasks, events }) => {
  const navigate = useNavigate();
  
  // Handle navigation to all tasks in notifications
  const navigateToTasks = () => {
    navigate(`/notifications?tab=task`);
  };

  // Handle navigation to all events in notifications
  const navigateToEvents = () => {
    navigate(`/notifications?tab=event`);
  };
  
  // Handle navigation to completed tasks view
  const navigateToCompleted = () => {
    navigate('/completed-tasks');
  };

  // Calculate statistics
  const today = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter(task => task.date === today);
  const todayEvents = events.filter(event => event.date === today);
  const completedTasks = tasks.filter(task => task.completed);
  
  const stats = {
    events: todayEvents.length,
    pendingTasks: todayTasks.filter(task => !task.completed).length,
    completedTasks: completedTasks.length,
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
          aria-label="View all events"
        >
          <span className="stat-number">{stats.events}</span>
          <span className="stat-label">Today's Events</span>
        </div>
        
        <div 
          className="stat-item clickable" 
          onClick={navigateToTasks}
          tabIndex={0}
          role="button"
          aria-label="View pending tasks"
        >
          <span className="stat-number">{stats.pendingTasks}</span>
          <span className="stat-label">Pending Tasks</span>
        </div>
        
        <div 
          className="stat-item clickable" 
          onClick={navigateToCompleted}
          tabIndex={0}
          role="button"
          aria-label="View completed tasks"
        >
          <span className="stat-number">{stats.completedTasks}</span>
          <span className="stat-label">Completed Tasks</span>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
