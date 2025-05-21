import React, { useEffect, useState } from "react";
import { useData } from "../../context/DataContext";
import { useDiary } from "../../context/DiaryContext";
import DiaryCard from "./DiaryCard";
import TasksCard from "./TasksCard";
import EventsCard from "./EventsCard";
import SummaryCard from "./SummaryCard";
import CompletedTasksCard from "./CompletedTasksCard";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar"; 
import "./Dashboard.css";

const Dashboard: React.FC = () => {
  const {
    fetchTasksByDate,
    fetchEventsByDate,
    toggleTask
  } = useData();
  
  const { entries, refreshEntries } = useDiary();
  
  const [todaysTasks, setTodaysTasks] = useState<Task[]>([]);
  const [todaysEvents, setTodaysEvents] = useState<CalendarEvent[]>([]);
  const [recentDiaryEntries, setRecentDiaryEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  // Fetch data when component mounts - focused only on today's data
  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000);
      
      try {
        // Get today's tasks and events only
        const [tasksData, eventsData] = await Promise.all([
          fetchTasksByDate(today),
          fetchEventsByDate(today)
        ]);
        
        setTodaysTasks(tasksData || []); // Added null check with fallback
        setTodaysEvents(eventsData || []); // Added null check with fallback
        
        // Also refresh diary entries
        await refreshEntries();
      } catch (error) {
        console.error("Dashboard load error:", error);
        // Show error state
        setTodaysTasks([]);
        setTodaysEvents([]);
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
        setLoadingTimeout(false);
      }
    };

    loadDashboard();
  }, [today, fetchTasksByDate, fetchEventsByDate, refreshEntries]);

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

  // Update the handleToggleTask function
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
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading today's schedule...</p>
          {loadingTimeout && (
            <div className="loading-error">
              <p>Taking longer than usual. You can try refreshing the page.</p>
              <button onClick={() => window.location.reload()} className="refresh-btn">
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Filter completed tasks for today only
  const todaysCompletedTasks = todaysTasks.filter(task => task.completed);

  return (
    <div className="dashboard-container">
      <SummaryCard tasks={todaysTasks} events={todaysEvents} />
      <div className="dashboard">
        <TasksCard tasks={todaysTasks.filter(t => !t.completed)} onToggleTask={handleToggleTask} />
        <EventsCard events={todaysEvents} />
        {todaysCompletedTasks.length > 0 ? (
          <CompletedTasksCard tasks={todaysCompletedTasks} />
        ) : (
          <DiaryCard entries={recentDiaryEntries} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
