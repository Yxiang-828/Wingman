import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import type { Task } from "../../api/Task";
import type { CalendarEvent } from "../../api/Calendar";
import { format, isSameDay, addDays } from "date-fns"; // Using date-fns consistently
import {
  getWeekStart,
  formatToDateString,
  parseFromDateString,
} from "../../utils/dateUtils";
import "./Calendar.css";

function getSemester(month: number) {
  return month < 6 ? "Semester 1" : "Semester 2";
}

function getSemesterStart(year: number, month: number) {
  return month < 6 ? new Date(year, 0, 1) : new Date(year, 6, 1);
}

function getNthWeekOfSemester(weekStart: Date, semesterStart: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(
    (weekStart.getTime() - semesterStart.getTime()) / msPerDay
  );
  return Math.floor(diffDays / 7) + 1;
}

// Helper function to format date consistently
function formatDateForAPI(date: Date): string {
  // Returns YYYY-MM-DD format for API calls
  return format(date, 'yyyy-MM-dd');
}

const WeekView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchTasksByDate, fetchEventsByDate, toggleTask } = useData();

  // Parse date from query string with safer fallback
  const query = new URLSearchParams(location.search);
  const dateStr = query.get("date") || format(new Date(), 'yyyy-MM-dd');

  // Parse date safely using our utility functions
  const baseDate = parseFromDateString(dateStr);
  const semester = getSemester(baseDate.getMonth() + 1);

  // Calculate week start (Sunday)
  const weekStart = getWeekStart(baseDate);

  // Generate array of dates for the week using date-fns
  const days = Array.from({ length: 7 }, (_, i) => 
    addDays(weekStart, i)
  );

  // Calculate semester info
  const semesterStart = getSemesterStart(baseDate.getFullYear(), baseDate.getMonth() + 1);
  const nthWeek = getNthWeekOfSemester(weekStart, semesterStart);

  // State for tasks and events
  const [weeklyData, setWeeklyData] = useState<{
    [key: string]: {
      tasks: Task[];
      events: CalendarEvent[];
    };
  }>({});

  // Monthly title
  const monthTitle = format(weekStart, 'MMMM yyyy');

  // Load data for all days in the week
  useEffect(() => {
    const loadWeekData = async () => {
      const dataByDay: any = {};

      for (const day of days) {
        // Use our helper for consistent date formatting
        const dateStr = formatDateForAPI(day);
        try {
          // Fetch tasks and events for this day
          const tasksData = await fetchTasksByDate(dateStr);
          const eventsData = await fetchEventsByDate(dateStr);

          // Store in our data map
          dataByDay[dateStr] = {
            tasks: tasksData,
            events: eventsData,
          };
        } catch (err) {
          console.error(`Error fetching data for ${dateStr}:`, err);
          dataByDay[dateStr] = { tasks: [], events: [] };
        }
      }

      setWeeklyData(dataByDay);
    };

    loadWeekData();
  }, [days, fetchEventsByDate, fetchTasksByDate]);

  // Navigation handlers using date-fns for consistency
  const handlePrevWeek = () => {
    const prevWeek = addDays(weekStart, -7);
    // Format with date-fns
    navigate(`/calendar/week?date=${formatDateForAPI(prevWeek)}`);
  };

  const handleNextWeek = () => {
    const nextWeek = addDays(weekStart, 7);
    // Format with date-fns
    navigate(`/calendar/week?date=${formatDateForAPI(nextWeek)}`);
  };

  // Task toggle handler
  const handleToggleTask = async (task: Task) => {
    try {
      await toggleTask(task);

      // Update local state
      const dateStr = task.date;
      setWeeklyData((prev) => {
        if (!prev[dateStr]) return prev;

        const updatedTasks = prev[dateStr].tasks.map((t) =>
          t.id === task.id ? { ...t, completed: !t.completed } : t
        );

        return {
          ...prev,
          [dateStr]: {
            ...prev[dateStr],
            tasks: updatedTasks,
          },
        };
      });
    } catch (error) {
      console.error("Failed to toggle task:", error);
    }
  };

  // Format date for display using date-fns
  const formatDateHeader = (date: Date) => {
    return format(date, 'EEE, MMM d');
  };

  return (
    <div className="calendar-week-view">
      <div className="week-header">
        <button className="calendar-btn" onClick={handlePrevWeek}>
          &lt; Previous
        </button>
        <h1 className="week-title">
          {monthTitle} • Week {nthWeek} of {semester}
        </h1>
        <button className="calendar-btn" onClick={handleNextWeek}>
          Next &gt;
        </button>
      </div>

      <div className="week-days">
        {days.map((day, index) => {
          const dateStr = formatDateForAPI(day);
          const dayData = weeklyData[dateStr] || { tasks: [], events: [] };
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={index}
              className={`week-day ${isToday ? "today" : ""}`}
              onClick={() => {
                navigate(`/calendar/day?date=${formatDateForAPI(day)}`);
              }}
            >
              <div className="week-day-header">
                <span className="week-day-title">
                  {formatDateHeader(day)}
                  {isToday && <span className="today-badge">Today</span>}
                </span>
              </div>

              <div className="week-day-content">
                {dayData.events.length > 0 && (
                  <div className="week-events">
                    <h4>Events ({dayData.events.length})</h4>
                    <ul className="week-events-list">
                      {dayData.events.slice(0, 3).map((event) => (
                        <li
                          key={event.id}
                          className={`week-event week-event-${event.type}`}
                        >
                          <span className="week-event-time">{event.time}</span>
                          <span className="week-event-title">
                            {event.title}
                          </span>
                        </li>
                      ))}
                      {dayData.events.length > 3 && (
                        <li className="week-more">
                          +{dayData.events.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {dayData.tasks.length > 0 && (
                  <div className="week-tasks">
                    <h4>Tasks ({dayData.tasks.length})</h4>
                    <ul className="week-tasks-list">
                      {dayData.tasks.slice(0, 3).map((task) => (
                        <li
                          key={task.id}
                          className={`week-task ${
                            task.completed ? "completed" : ""
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTask(task);
                          }}
                        >
                          <span className="week-task-status">
                            {task.completed ? "✓" : "○"}
                          </span>
                          <span className="week-task-text">{task.text}</span>
                        </li>
                      ))}
                      {dayData.tasks.length > 3 && (
                        <li className="week-more">
                          +{dayData.tasks.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {dayData.events.length === 0 && dayData.tasks.length === 0 && (
                  <div className="week-empty-day">
                    <p>No events or tasks</p>
                    <button className="week-add-btn">+</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekView;
