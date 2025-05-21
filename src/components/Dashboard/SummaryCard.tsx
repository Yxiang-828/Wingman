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
  
  // Today's date in YYYY-MM-DD format for navigation
  const today = new Date().toISOString().split("T")[0];
  
  // Handle navigation to day view with focus on tasks
  const navigateToTasks = () => {
    navigate(`/calendar/day?date=${today}&focus=tasks`);
  };

  // Handle navigation to day view with focus on events
  const navigateToEvents = () => {
    navigate(`/calendar/day?date=${today}&focus=events`);
  };
  
  // Handle navigation to completed tasks view
  const navigateToCompleted = () => {
    navigate('/completed-tasks');
  };

  // Calculate statistics
  const todayTasks = tasks.filter(task => task.date === today);
  const todayEvents = events.filter(event => event.date === today);
  const completedTasks = tasks.filter(task => task.completed);
  
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
          <span className="stat-number">{todayEvents.length}</span>
          <span className="stat-label">Today's Events</span>
        </div>
        
        <div 
          className="stat-item clickable" 
          onClick={navigateToTasks}
          tabIndex={0}
          role="button"
          aria-label="View today's tasks"
        >
          <span className="stat-number">{todayTasks.length}</span>
          <span className="stat-label">Today's Tasks</span>
        </div>
        
        <div 
          className="stat-item clickable" 
          onClick={navigateToCompleted}
          tabIndex={0}
          role="button"
          aria-label="View completed tasks"
        >
          <span className="stat-number">{completedTasks.length}</span>
          <span className="stat-label">Completed Tasks</span>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
