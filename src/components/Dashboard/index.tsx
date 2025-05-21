import React, { useEffect, useState } from "react";
import { useData } from "../../context/DataContext";
import { useDiary } from "../../context/DiaryContext";
import DiaryCard from "./DiaryCard";
import TasksCard from "./TasksCard";
import EventsCard from "./EventsCard";
import SummaryCard from "./SummaryCard";
import "./Dashboard.css";

const Dashboard: React.FC = () => {
  // Use data from contexts
  const {
    fetchTasksByDate,
    fetchEventsByDate,
    toggleTask
  } = useData();
  
  const { entries, refreshEntries } = useDiary();
  
  const [todaysTasks, setTodaysTasks] = useState<Task[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [recentDiaryEntries, setRecentDiaryEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  // Fetch data when component mounts
  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        // Get only today's tasks and events
        const today = new Date().toISOString().split('T')[0];
        const [tasksData, eventsData] = await Promise.all([
          fetchTasksByDate(today),
          fetchEventsByDate(today)
        ]);
        
        setTodaysTasks(tasksData);
        setUpcomingEvents(eventsData); // Now these are today's events only
        
        // Also refresh diary entries
        await refreshEntries();
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  // Update diary entries when entries change
  useEffect(() => {
    if (entries && entries.length > 0) {
      // Sort by date (newest first) and take the most recent
      const recent = [...entries]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);
      setRecentDiaryEntries(recent);
    }
  }, [entries]);

  // Update the handleToggleTask function:
  const handleToggleTask = async (task: Task) => {
    try {
      const updatedTask = await toggleTask(task);
      // Update our local state
      setTodaysTasks(prev => 
        prev.map(t => t.id === updatedTask.id ? updatedTask : t)
      );
      return updatedTask;
    } catch (error) {
      console.error("Error toggling task:", error);
      throw error;
    }
  };

  // Show loading state
  if (isLoading) {
    return <div className="dashboard-loading">Loading dashboard data...</div>;
  }

  return (
    <div className="dashboard-container">
      <SummaryCard tasks={todaysTasks} events={upcomingEvents} />
      <div className="dashboard">
        <TasksCard tasks={todaysTasks} onToggleTask={handleToggleTask} />
        <EventsCard events={upcomingEvents} />
        <DiaryCard entries={recentDiaryEntries} />
      </div>
    </div>
  );
};

export default Dashboard;
