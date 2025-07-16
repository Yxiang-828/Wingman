import React, { useEffect, useState, useCallback } from "react";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import { useDiary } from "../../context/DiaryContext";
import { getCurrentUserId } from "../../utils/helpers";
import { getTodayDateString } from "../../utils/timeUtils";
import DiaryCard from "./DiaryCard";
import TasksCard from "./TasksCard";
import EventsCard from "./EventsCard";
import SummaryCard from "./SummaryCard";
import CompletedTasksCard from "./CompletedTasksCard";
import "./Dashboard.css";

/**
 * Dashboard Component
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
   */ useEffect(() => {
    if (entries && entries.length > 0) {
      const recent = [...entries]
        .sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        })
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
   */
  const handleToggleTask = useCallback(
    async (task: Task) => {
      try {
        console.log("Wingman: Updating task status:", task.id);
        const updatedTask = await window.electronAPI.db.updateTask(task.id, {
          completed: !task.completed,
        });

        // Send congratulation notification if task was just completed
        if (!task.completed && updatedTask?.completed) {
          try {
            const { systemNotificationService } = await import(
              "../../services/SystemNotificationService"
            );
            await systemNotificationService.showTaskCompletion(
              updatedTask.title || task.title,
            );
            console.log(
              `WINGMAN SUCCESS: Congratulation notification sent for task: ${
                updatedTask.title || task.title
              }`,
            );
          } catch (error) {
            console.error(
              "WINGMAN ERROR: Failed to send congratulation notification:",
              error,
            );
          }
        }

        await fetchDashboardData();

        console.log("Wingman: Task updated and dashboard refreshed");

        return updatedTask || { ...task, completed: !task.completed };
      } catch (error) {
        console.error("Wingman: Error updating task:", error);
        throw error;
      }
    },
    [fetchDashboardData],
  );

  /**
   * Listens for external refresh requests
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
