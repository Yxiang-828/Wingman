import React, { useEffect, useState, useCallback } from "react";
import { useDiary } from "../../context/DiaryContext";
import { getCurrentUserId } from "../../utils/helpers";
import {
  getCurrentTimeString,
  getTodayDateString,
} from "../../utils/timeUtils";
import DiaryCard from "./DiaryCard";
import TasksCard from "./TasksCard";
import EventsCard from "./EventsCard";
import SummaryCard from "./SummaryCard";
import CompletedTasksCard from "./CompletedTasksCard";
import "./Dashboard.css";

/**
 * Dashboard Component - Your Wingman's Command Center
 * Central hub displaying today's schedule, tasks, and achievements
 * Your digital war room where all battles are planned and victories celebrated
 */
const Dashboard: React.FC = () => {
  const { entries, refreshEntries, loading: diaryLoading } = useDiary();

  const [todaysTasks, setTodaysTasks] = useState<Task[]>([]);
  const [todaysEvents, setTodaysEvents] = useState<CalendarEvent[]>([]);
  const [recentDiaryEntries, setRecentDiaryEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  /**
   * Fetches comprehensive dashboard data from database
   * Your Wingman gathers all intel for today's operations
   */
  const fetchDashboardData = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      console.log("Wingman: User not authenticated, skipping data fetch");
      setIsReady(true);
      return;
    }

    try {
      const today = getTodayDateString();
      console.log("Wingman: Loading data for today");

      const [tasksData, eventsData] = await Promise.all([
        window.electronAPI.db.getTasks(userId, today),
        window.electronAPI.db.getEvents(userId, today),
      ]);

      setTodaysTasks(tasksData || []);
      setTodaysEvents(eventsData || []);

      console.log("Wingman: Data loaded successfully");

      await refreshEntries();
    } catch (error) {
      console.error("Wingman: Dashboard load error:", error);
      setTodaysTasks([]);
      setTodaysEvents([]);
    } finally {
      setIsReady(true);
    }
  }, [refreshEntries]);

  /**
   * Organizes diary entries by recency
   * Your Wingman prioritizes your most recent thoughts
   */
  useEffect(() => {
    if (entries && entries.length > 0) {
      const recent = [...entries]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);
      setRecentDiaryEntries(recent);
    }
  }, [entries]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (isReady && !diaryLoading) {
      setIsLoading(false);
    }
  }, [isReady, diaryLoading]);

  /**
   * Handles task completion with comprehensive dashboard refresh
   * Your Wingman ensures all systems reflect the latest status
   */
  const handleToggleTask = useCallback(
    async (task: Task) => {
      try {
        console.log("Wingman: Updating task status:", task.id);

        const updatedTask = await window.electronAPI.db.updateTask(task.id, {
          completed: !task.completed,
        });

        await fetchDashboardData();

        console.log("Wingman: Task updated and dashboard refreshed");

        return updatedTask || { ...task, completed: !task.completed };
      } catch (error) {
        console.error("Wingman: Error updating task:", error);
        throw error;
      }
    },
    [fetchDashboardData]
  );

  /**
   * Listens for external refresh requests
   * Your Wingman responds to updates from other components
   */
  useEffect(() => {
    const handleDashboardRefresh = () => {
      console.log("Wingman: External refresh triggered");
      fetchDashboardData();
    };

    window.addEventListener("dashboard-refresh", handleDashboardRefresh);
    return () =>
      window.removeEventListener("dashboard-refresh", handleDashboardRefresh);
  }, [fetchDashboardData]);

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Your Wingman is preparing today's briefing...</p>
        </div>
      </div>
    );
  }

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
