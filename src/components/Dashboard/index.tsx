import React, { useEffect, useState, useCallback } from "react";
import { useDiary } from "../../context/DiaryContext";
import { getCurrentUserId } from "../../utils/helpers";
import { getCurrentTimeString, getTodayDateString } from "../../utils/timeUtils"; // ✅ ADD: Import time functions
import DiaryCard from "./DiaryCard";
import TasksCard from "./TasksCard";
import EventsCard from "./EventsCard";
import SummaryCard from "./SummaryCard";
import CompletedTasksCard from "./CompletedTasksCard";

import "./Dashboard.css";

const Dashboard: React.FC = () => {
  const { entries, refreshEntries, loading: diaryLoading } = useDiary();

  const [todaysTasks, setTodaysTasks] = useState<Task[]>([]);
  const [todaysEvents, setTodaysEvents] = useState<CalendarEvent[]>([]);
  const [recentDiaryEntries, setRecentDiaryEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // ✅ FIXED: Direct SQLite data fetching with proper refresh
  const fetchDashboardData = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      console.log("Dashboard: User not authenticated, skipping data fetch");
      setIsReady(true);
      return;
    }

    try {
      const today = getTodayDateString();
      console.log(`📊 Dashboard: Loading data for ${today} (direct SQLite)`);

      const [tasksData, eventsData] = await Promise.all([
        window.electronAPI.db.getTasks(userId, today),
        window.electronAPI.db.getEvents(userId, today),
      ]);

      setTodaysTasks(tasksData || []);
      setTodaysEvents(eventsData || []);

      console.log(
        `📊 Dashboard: Loaded ${
          tasksData?.length || 0
        } tasks, ${eventsData?.length || 0} events`
      );

      await refreshEntries();
    } catch (error) {
      console.error("Dashboard load error:", error);
      setTodaysTasks([]);
      setTodaysEvents([]);
    } finally {
      setIsReady(true);
    }
  }, [refreshEntries]);

  // ✅ KEEP: Diary entries logic
  useEffect(() => {
    if (entries && entries.length > 0) {
      const recent = [...entries]
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        .slice(0, 3);
      setRecentDiaryEntries(recent);
    }
  }, [entries]);

  // ✅ Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ✅ LOADING state
  useEffect(() => {
    if (isReady && !diaryLoading) {
      setIsLoading(false);
    }
  }, [isReady, diaryLoading]);

  // ✅ FIXED: Task toggle handler that refreshes ALL dashboard data
  const handleToggleTask = useCallback(async (task: Task) => {
    try {
      console.log(`🎯 Dashboard: Toggling task ${task.id}`);
      
      // Update in database
      const updatedTask = await window.electronAPI.db.updateTask(task.id, {
        completed: !task.completed,
      });

      // ✅ CRITICAL: Refresh ALL dashboard data from database
      await fetchDashboardData();
      
      console.log(`✅ Dashboard: Task ${task.id} toggled and dashboard refreshed`);
      
      return updatedTask || { ...task, completed: !task.completed };
    } catch (error) {
      console.error("Error toggling task:", error);
      throw error;
    }
  }, [fetchDashboardData]);

  // ✅ LISTEN: For external refresh events (from TasksCard completion)
  useEffect(() => {
    const handleDashboardRefresh = () => {
      console.log("📊 Dashboard: External refresh triggered");
      fetchDashboardData();
    };

    window.addEventListener("dashboard-refresh", handleDashboardRefresh);
    return () => window.removeEventListener("dashboard-refresh", handleDashboardRefresh);
  }, [fetchDashboardData]);

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading today's schedule...</p>
        </div>
      </div>
    );
  }

  // ✅ SPLIT: Tasks into pending and completed
  const pendingTasks = todaysTasks.filter((t) => !t.completed);
  const completedTasks = todaysTasks.filter((t) => t.completed);

  return (
    <div className="dashboard-container">
      <SummaryCard tasks={todaysTasks} events={todaysEvents} />
      <div className="dashboard">
        <TasksCard tasks={pendingTasks} onToggleTask={handleToggleTask} />
        <EventsCard events={todaysEvents} />
        <CompletedTasksCard tasks={completedTasks} />
        <DiaryCard entries={recentDiaryEntries} />
      </div>
    </div>
  );
};

export default Dashboard;
