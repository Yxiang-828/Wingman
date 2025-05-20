import React from "react";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import "./Dashboard.css";

interface SummaryCardProps {
  tasks: Task[];
  events: CalendarEvent[];
}

const SummaryCard: React.FC<SummaryCardProps> = ({ tasks, events }) => {
  const completedTasks = tasks.filter((task) => task.completed).length;
  const pendingTasks = tasks.length - completedTasks;

  const randomQuotes = [
    "The secret of getting ahead is getting started.",
    "Focus on being productive instead of busy.",
    "Do the hard jobs first. The easy jobs will take care of themselves.",
  ];

  const randomQuote =
    randomQuotes[Math.floor(Math.random() * randomQuotes.length)];

  return (
    <div className="dashboard-card summary-card">
      <div className="dashboard-card-header">
        <h2>Today's Summary</h2>
      </div>
      <div className="quote-box">
        <p>"{randomQuote}"</p>
      </div>
      <div className="summary-stats">
        <div className="stat-item">
          <span className="stat-number">{events.length}</span>
          <span className="stat-label">Events</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{pendingTasks}</span>
          <span className="stat-label">Tasks</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{completedTasks}</span>
          <span className="stat-label">Completed</span>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
