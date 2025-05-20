import React from "react";
import { useData } from "../../context/DataContext";
import SummaryCard from "./SummaryCard";
import TasksCard from "./TasksCard";
import EventsCard from "./EventsCard";
import ChatCard from "./ChatCard";
import DiaryCard from "./DiaryCard";
import "./Dashboard.css";

const Dashboard = () => {
  // Replace your local state and useEffect with this:
  const { tasks, events, loading, toggleTask } = useData();

  // Optionally show loading state
  if (loading) {
    return <div className="dashboard-loading">Loading dashboard data...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <SummaryCard tasks={tasks} events={events} />
        <TasksCard tasks={tasks} onToggleTask={toggleTask} />
        <EventsCard events={events} />
        <ChatCard />
        <DiaryCard />
      </div>
    </div>
  );
};

export default Dashboard;
