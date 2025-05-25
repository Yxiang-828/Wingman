import React, { useEffect, useState } from "react";
import { useCalendarCache } from "../../Hooks/useCalendar";
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
// import { logout } from "../../utils/logout";

import "./Dashboard.css"; // This now contains only Dashboard-specific styles
const Dashboard: React.FC = () => {
  const { entries, refreshEntries, loading: diaryLoading } = useDiary();

  // Use shared cache to copy from DayView
  const { getDayData, loading: cacheLoading } = useCalendarCache("Dashboard");

  const [todaysTasks, setTodaysTasks] = useState<Task[]>([]);
  const [todaysEvents, setTodaysEvents] = useState<CalendarEvent[]>([]);
  const [recentDiaryEntries, setRecentDiaryEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Single loading state with timeout
  const [isReady, setIsReady] = useState(false);

  // Fetch today's data using shared cache
  useEffect(() => {
    const loadDashboard = async () => {
      // Get current user ID first
      const userId = getCurrentUserId();
      if (!userId) {
        console.log("Dashboard: User not authenticated, skipping data fetch");
        setIsReady(true); // SET READY EVEN IF NO USER
        return;
      }

      try {
        // Use standardized time utility
        const today = getTodayDateString();
        console.log(`📊 Dashboard: Loading data for ${today}`);

        // Copy data from shared cache (DayView is primary owner)
        const todayData = await getDayData(today);

        setTodaysTasks(todayData.tasks);
        setTodaysEvents(todayData.events);

        console.log(
          `📊 Dashboard: Loaded ${todayData.tasks.length} tasks, ${todayData.events.length} events`
        );

        // Load diary entries
        await refreshEntries();
      } catch (error) {
        console.error("Dashboard load error:", error);
        setTodaysTasks([]);
        setTodaysEvents([]);
      } finally {
        setIsReady(true); //  ALWAYS end loading
      }
    };

    loadDashboard();
  }, [getDayData, refreshEntries]);

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

  // Better loading condition with individual states
  useEffect(() => {
    console.log(
      `📊 Dashboard Loading States: cache=${cacheLoading}, diary=${diaryLoading}, isReady=${isReady}`
    );

    // Set loading to false when:
    // 1. Cache is not loading AND data is loaded
    // 2. Diary is loaded (regardless of diaryLoading from context)
    if (!cacheLoading && isReady) {
      console.log("📊 Dashboard: All data loaded, hiding loading screen");
      setIsLoading(false);
    }
  }, [cacheLoading, diaryLoading, isReady]);

 
  console.log("Dashboard Loading Debug:", {
    cacheLoading,
    dataLoaded: isReady,
    diaryLoaded: !diaryLoading,
    isLoading,
  });

  // Handle task toggle with cache awareness
  const handleToggleTask = (updatedTask: Task) => {
    // Update ALL tasks, not just displayed ones
    setTodaysTasks((prev) =>
      prev.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );

    // Force refresh the cache for today to ensure consistency
    const today = getTodayDateString();
    getDayData(today, true).catch(console.error);
  };

  if (!isReady) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading today's schedule...</p>
          {/* Debug info */}
          <small style={{ color: "#666", marginTop: "10px" }}>
            Cache: {cacheLoading ? "loading..." : "ready"} | Data:{" "}
            {isReady ? "loaded" : "loading..."} | Diary:{" "}
            {diaryLoading ? "loading..." : "loaded"}
          </small>
        </div>
      </div>
    );
  }

  // Filter completed tasks for today only
  const todaysCompletedTasks = todaysTasks.filter((task) => task.completed);
  const pendingTasks = todaysTasks.filter((t) => !t.completed);


  console.log(
    `📊 Dashboard DEBUG: Passing ${pendingTasks.length} pending tasks to TasksCard`
  );
  console.log(`📊 Dashboard DEBUG: Total tasks: ${todaysTasks.length}`);

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
