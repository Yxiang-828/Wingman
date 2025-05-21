import React, { useEffect, useState } from "react";
import { useData } from "../../context/DataContext";
import { useDiary } from "../../context/DiaryContext";
import DiaryCard from "./DiaryCard";
import TasksCard from "./TasksCard";
import EventsCard from "./EventsCard";
import SummaryCard from "./SummaryCard";
import "./Dashboard.css";

const Dashboard: React.FC = () => {
  const { tasks, events, loading: dataLoading, refreshData, toggleTask } = useData();
  const { entries, loading: diaryLoading, refreshEntries } = useDiary();
  const [todaysTasks, setTodaysTasks] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [recentDiaryEntries, setRecentDiaryEntries] = useState<any[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  // Fetch data only once when component mounts
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // Run these in parallel
        await Promise.all([
          refreshData(),
          refreshEntries()
        ]);
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setIsInitialLoad(false);
      }
    };

    if (isInitialLoad) {
      loadDashboard();
    }
  }, [isInitialLoad]);

  // Filter data when tasks, events, or entries change
  useEffect(() => {
    // Filter tasks for today
    const todayTasks = tasks.filter((task) => task.date === today);
    setTodaysTasks(todayTasks);

    // Filter upcoming events (today and future)
    const upcoming = events.filter((event) => event.date >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3); // Show max 3 upcoming events
    setUpcomingEvents(upcoming);

    // Sort diary entries by date (newest first) and take the most recent ones
    if (entries && entries.length > 0) {
      const recent = [...entries].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ).slice(0, 3); // Show max 3 recent entries
      setRecentDiaryEntries(recent);
    }
  }, [tasks, events, entries, today]);

  const handleToggleTask = (task: any) => {
    toggleTask(task);
  };

  // Show loading state only on initial load
  if (isInitialLoad) {
    return <div className="dashboard-loading">Loading dashboard data...</div>;
  }

  return (
    <div className="dashboard-container">
      <SummaryCard tasks={tasks} events={events} />
      <div className="dashboard-grid">
        <TasksCard tasks={todaysTasks} onToggleTask={handleToggleTask} />
        <EventsCard events={upcomingEvents} />
        <DiaryCard entries={recentDiaryEntries} />
      </div>
    </div>
  );
};

export default Dashboard;
