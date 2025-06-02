import React, { useEffect, useState, useCallback } from "react";
// ✅ REMOVED: import { useCalendarCache } from "../../Hooks/useCalendar";
import { useDiary } from "../../context/DiaryContext";
import { getCurrentUserId } from "../../utils/auth";
import DiaryCard from "./DiaryCard";
import TasksCard from "./TasksCard";
import EventsCard from "./EventsCard";
import SummaryCard from "./SummaryCard";
import CompletedTasksCard from "./CompletedTasksCard";
import { getTodayDateString } from "../../utils/timeUtils";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";

import "./Dashboard.css";

const Dashboard: React.FC = () => {
  const { entries, refreshEntries, loading: diaryLoading } = useDiary();

  // ✅ REMOVED ONLY THE CACHE: const { getDayData, loading: cacheLoading } = useCalendarCache("Dashboard");

  const [todaysTasks, setTodaysTasks] = useState<Task[]>([]);
  const [todaysEvents, setTodaysEvents] = useState<CalendarEvent[]>([]);
  const [recentDiaryEntries, setRecentDiaryEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // ✅ NEW: Direct SQLite data fetching (ONLY replacing cache part)
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

      // ✅ DIRECT SQLite calls - replacing cache calls
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

      // ✅ KEEP: Load diary entries (UNCHANGED!)
      await refreshEntries();
    } catch (error) {
      console.error("Dashboard load error:", error);
      setTodaysTasks([]);
      setTodaysEvents([]);
    } finally {
      setIsReady(true);
    }
  }, [refreshEntries]);

  // ✅ KEEP: Diary entries logic (UNCHANGED!)
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

  // ✅ SIMPLIFIED: Loading state (removed cache dependency)
  useEffect(() => {
    if (isReady && !diaryLoading) {
      setIsLoading(false);
    }
  }, [isReady, diaryLoading]);

  // ✅ KEEP: Task toggle handler (UNCHANGED!)
  const handleToggleTask = async (task: Task) => {
    try {
      const updatedTask = await window.electronAPI.db.updateTask(task.id, {
        completed: !task.completed,
      });

      setTodaysTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? updatedTask || { ...task, completed: !task.completed }
            : t
        )
      );
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

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

  // ✅ KEEP: All your existing filtering logic (UNCHANGED!)
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
    </div>
  );
};

export default Dashboard;
