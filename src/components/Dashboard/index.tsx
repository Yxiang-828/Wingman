import React, { useEffect, useState } from "react";
import { useData } from "../../context/DataContext";
import { useDiary } from "../../context/DiaryContext";
import { getCurrentUserId } from "../../utils/auth";
import DiaryCard from "./DiaryCard";
import TasksCard from "./TasksCard";
import EventsCard from "./EventsCard";
import SummaryCard from "./SummaryCard";
import CompletedTasksCard from "./CompletedTasksCard";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import "./Dashboard.css";

const Dashboard: React.FC = () => {
  // Update to use new optimized methods
  const {
    getTasksForToday,
    getEventsForToday,
    forceRefreshCurrentData,
    isCacheStale,
  } = useData();

  const { entries, refreshEntries } = useDiary();

  const [todaysTasks, setTodaysTasks] = useState<Task[]>([]);
  const [todaysEvents, setTodaysEvents] = useState<CalendarEvent[]>([]);
  const [recentDiaryEntries, setRecentDiaryEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Fetch data when component mounts - now using optimized methods
  useEffect(() => {
    const loadDashboard = async () => {
      // Get current user ID first
      const userId = getCurrentUserId();
      if (!userId) {
        console.log("Dashboard: User not authenticated, skipping data fetch");
        return;
      }

      setIsLoading(true);
      const timeoutId = setTimeout(() => setLoadingTimeout(true), 10000);

      try {
        // Use new optimized methods that check fixed cache first
        const [tasksData, eventsData] = await Promise.all([
          getTasksForToday(), // No longer needs today parameter
          getEventsForToday(), // No longer needs today parameter
        ]);

        setTodaysTasks(tasksData || []);
        setTodaysEvents(eventsData || []);

        // Also refresh diary entries
        await refreshEntries();
      } catch (error) {
        console.error("Dashboard load error:", error);
        setTodaysTasks([]);
        setTodaysEvents([]);
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
        setLoadingTimeout(false);
      }
    };

    loadDashboard();
  }, [getTasksForToday, getEventsForToday, refreshEntries]); // Updated dependencies

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
  const handleToggleTask = (updatedTask: Task) => {
    // Only update local state, don't call toggleTask again
    setTodaysTasks((prev) =>
      prev.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
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
              <button
                onClick={() => window.location.reload()}
                className="refresh-btn"
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Filter completed tasks for today only
  const todaysCompletedTasks = todaysTasks.filter((task) => task.completed);
  const pendingTasks = todaysTasks.filter((t) => !t.completed);

  return (
    <div className="dashboard-container">
      <SummaryCard tasks={todaysTasks} events={todaysEvents} />
      <div className="dashboard">
        <TasksCard tasks={pendingTasks} onToggleTask={handleToggleTask} />
        <EventsCard events={todaysEvents} />
        <CompletedTasksCard tasks={todaysCompletedTasks} />
        <DiaryCard entries={recentDiaryEntries} />
      </div>
      {!isLoading && (
        <div className="dashboard-footer">
          <div className="cache-status">
            {isCacheStale() ? (
              <button
                className="refresh-data-btn"
                onClick={forceRefreshCurrentData}
              >
                Data may be stale. Click to refresh
              </button>
            ) : (
              <span className="cache-fresh">Data is up to date</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
