import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import "../main.css";

interface Event {
  id: number;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  type: "meeting" | "personal" | "reminder" | "holiday";
}

const Calendar: React.FC = () => {
  const location = useLocation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events] = useState<Event[]>([
    {
      id: 1,
      title: "Team Meeting",
      start: "2025-05-17T10:00",
      end: "2025-05-17T11:00",
      location: "Conference Room A",
      description: "Weekly team sync-up",
      type: "meeting",
    },
    {
      id: 2,
      title: "Lunch with Alex",
      start: "2025-05-17T12:30",
      end: "2025-05-17T13:30",
      location: "Cafe Downtown",
      type: "personal",
    },
    {
      id: 3,
      title: "Project Deadline",
      start: "2025-05-17T17:00",
      end: "2025-05-17T17:00",
      description: "Submit final project files",
      type: "reminder",
    },
    {
      id: 4,
      title: "Memorial Day",
      start: "2025-05-26T00:00",
      end: "2025-05-26T23:59",
      type: "holiday",
    },
  ]);

  // Get calendar view based on URL
  const getCalendarView = () => {
    if (location.pathname.includes("/calendar/month")) {
      return "month";
    } else if (location.pathname.includes("/calendar/week")) {
      return "week";
    } else {
      return "day";
    }
  };

  const currentView = getCalendarView();

  // Create days for month view
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  // Format date to YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;
  };

  // Check if a date has events
  const hasEvents = (date: number): boolean => {
    const dateString = `${currentMonth.getFullYear()}-${String(
      currentMonth.getMonth() + 1
    ).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
    return events.some((event) => event.start.includes(dateString));
  };

  // Get events for the selected date
  const getEventsForDate = (date: Date): Event[] => {
    const dateString = formatDate(date);
    return events.filter((event) => event.start.includes(dateString));
  };

  // Generate calendar grid
  const generateCalendarGrid = () => {
    const grid = [];
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Days of week header
    grid.push(
      <div key="header" className="grid grid-cols-7 mb-2">
        {daysOfWeek.map((day) => (
          <div key={day} className="text-center py-2 font-medium">
            {day}
          </div>
        ))}
      </div>
    );

    // Calendar days
    let days = [];

    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div key={`empty-${i}`} className="p-2 text-center opacity-30">
          {/* Empty cell */}
        </div>
      );
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        day === new Date().getDate() &&
        currentMonth.getMonth() === new Date().getMonth() &&
        currentMonth.getFullYear() === new Date().getFullYear();

      const isSelected =
        day === selectedDate.getDate() &&
        currentMonth.getMonth() === selectedDate.getMonth() &&
        currentMonth.getFullYear() === selectedDate.getFullYear();

      const hasEventsDot = hasEvents(day);

      days.push(
        <div
          key={day}
          className={`p-2 relative text-center cursor-pointer transition-all hover:bg-bg-hover rounded-lg
            ${isToday ? "font-bold border border-accent-primary" : ""}
            ${isSelected ? "bg-accent-primary text-white" : ""}
          `}
          onClick={() => {
            const newDate = new Date(currentMonth);
            newDate.setDate(day);
            setSelectedDate(newDate);
          }}
        >
          <div>{day}</div>
          {hasEventsDot && (
            <div className="w-2 h-2 bg-accent-secondary rounded-full absolute bottom-1 left-1/2 transform -translate-x-1/2"></div>
          )}
        </div>
      );
    }

    // Combine all days into a grid
    grid.push(
      <div key="days" className="grid grid-cols-7 gap-1">
        {days}
      </div>
    );

    return grid;
  };

  // Generate hours for day view
  const generateDayView = () => {
    const hours = [];
    const dailyEvents = getEventsForDate(selectedDate);

    for (let hour = 0; hour < 24; hour++) {
      const hourEvents = dailyEvents.filter((event) => {
        const eventHour = new Date(event.start).getHours();
        return eventHour === hour;
      });

      hours.push(
        <div
          key={hour}
          className="flex py-2 border-b border-opacity-10 hover:bg-bg-hover"
        >
          <div className="w-16 text-right pr-4 opacity-70">
            {hour === 0
              ? "12 AM"
              : hour < 12
              ? `${hour} AM`
              : hour === 12
              ? "12 PM"
              : `${hour - 12} PM`}
          </div>
          <div className="flex-1">
            {hourEvents.length > 0
              ? hourEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-2 rounded-lg mb-1 shadow-sm
                    ${
                      event.type === "meeting"
                        ? "bg-accent-primary bg-opacity-20"
                        : ""
                    }
                    ${
                      event.type === "personal"
                        ? "bg-green-500 bg-opacity-20"
                        : ""
                    }
                    ${
                      event.type === "reminder"
                        ? "bg-yellow-500 bg-opacity-20"
                        : ""
                    }
                    ${
                      event.type === "holiday"
                        ? "bg-purple-500 bg-opacity-20"
                        : ""
                    }
                  `}
                  >
                    <div className="font-bold">{event.title}</div>
                    <div className="text-sm opacity-70">
                      {new Date(event.start).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -
                      {new Date(event.end).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    {event.location && (
                      <div className="text-sm mt-1">📍 {event.location}</div>
                    )}
                  </div>
                ))
              : null}
          </div>
        </div>
      );
    }

    return hours;
  };

  // Generate week view
  const generateWeekView = () => {
    const weekDays = [];
    const today = new Date(selectedDate);
    const day = today.getDay(); // 0 = Sunday, 6 = Saturday

    // Calculate the first day of the week (Sunday)
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - day);

    // Generate each day of the week
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(firstDayOfWeek);
      currentDay.setDate(firstDayOfWeek.getDate() + i);

      const isToday =
        currentDay.getDate() === new Date().getDate() &&
        currentDay.getMonth() === new Date().getMonth() &&
        currentDay.getFullYear() === new Date().getFullYear();

      const dayEvents = getEventsForDate(currentDay);
      const dayName = currentDay.toLocaleDateString("en-US", {
        weekday: "short",
      });
      const dayNumber = currentDay.getDate();

      weekDays.push(
        <div
          key={i}
          className={`flex-1 min-w-0 p-2 ${
            isToday ? "bg-accent-primary bg-opacity-10 rounded-lg" : ""
          }`}
        >
          <div className="text-center mb-2">
            <div className="opacity-70">{dayName}</div>
            <div
              className={`text-lg font-bold ${
                isToday ? "text-accent-primary" : ""
              }`}
            >
              {dayNumber}
            </div>
          </div>

          <div className="space-y-2">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                className={`p-2 rounded-lg text-sm shadow-sm
                  ${
                    event.type === "meeting"
                      ? "bg-accent-primary bg-opacity-20"
                      : ""
                  }
                  ${
                    event.type === "personal"
                      ? "bg-green-500 bg-opacity-20"
                      : ""
                  }
                  ${
                    event.type === "reminder"
                      ? "bg-yellow-500 bg-opacity-20"
                      : ""
                  }
                  ${
                    event.type === "holiday"
                      ? "bg-purple-500 bg-opacity-20"
                      : ""
                  }
                `}
              >
                <div className="font-bold truncate">{event.title}</div>
                <div className="opacity-70 text-xs">
                  {new Date(event.start).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return <div className="flex">{weekDays}</div>;
  };

  // Navigation controls for calendar
  const changeMonth = (amount: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(currentMonth.getMonth() + amount);
    setCurrentMonth(newDate);
  };

  // Navigation controls for day view
  const changeDate = (amount: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + amount);
    setSelectedDate(newDate);
  };

  return (
    <div className="calendar">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Calendar</h1>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-card rounded-lg hover:bg-bg-hover"
            onClick={() => setSelectedDate(new Date())}
          >
            Today
          </button>
          <button className="action-btn">
            <span>✨</span>
            New Event
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="dashboard-card bg-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              className="p-2 rounded-lg hover:bg-bg-hover"
              onClick={() =>
                currentView === "month" ? changeMonth(-1) : changeDate(-1)
              }
            >
              ◀
            </button>
            <h2 className="text-2xl font-bold">
              {currentView === "month"
                ? currentMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })
                : selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
            </h2>
            <button
              className="p-2 rounded-lg hover:bg-bg-hover"
              onClick={() =>
                currentView === "month" ? changeMonth(1) : changeDate(1)
              }
            >
              ▶
            </button>
          </div>

          <div className="flex gap-2">
            <a
              href="/calendar/day"
              className={`px-4 py-2 rounded-lg ${
                currentView === "day"
                  ? "bg-accent-primary text-white"
                  : "hover:bg-bg-hover"
              }`}
            >
              Day
            </a>
            <a
              href="/calendar/week"
              className={`px-4 py-2 rounded-lg ${
                currentView === "week"
                  ? "bg-accent-primary text-white"
                  : "hover:bg-bg-hover"
              }`}
            >
              Week
            </a>
            <a
              href="/calendar/month"
              className={`px-4 py-2 rounded-lg ${
                currentView === "month"
                  ? "bg-accent-primary text-white"
                  : "hover:bg-bg-hover"
              }`}
            >
              Month
            </a>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="dashboard-card bg-card">
        {currentView === "month" && generateCalendarGrid()}
        {currentView === "week" && generateWeekView()}
        {currentView === "day" && (
          <div className="overflow-auto max-h-screen">{generateDayView()}</div>
        )}
      </div>

      {/* Event Details for Selected Date */}
      {(currentView === "day" || currentView === "week") && (
        <div className="dashboard-card bg-card mt-6">
          <h2 className="text-2xl font-bold mb-4">
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>

          <div className="space-y-4">
            {getEventsForDate(selectedDate).length > 0 ? (
              getEventsForDate(selectedDate).map((event) => (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg shadow-sm
                    ${
                      event.type === "meeting"
                        ? "bg-accent-primary bg-opacity-20"
                        : ""
                    }
                    ${
                      event.type === "personal"
                        ? "bg-green-500 bg-opacity-20"
                        : ""
                    }
                    ${
                      event.type === "reminder"
                        ? "bg-yellow-500 bg-opacity-20"
                        : ""
                    }
                    ${
                      event.type === "holiday"
                        ? "bg-purple-500 bg-opacity-20"
                        : ""
                    }
                  `}
                >
                  <div className="text-xl font-bold">{event.title}</div>
                  <div className="opacity-70 mb-2">
                    {new Date(event.start).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -
                    {new Date(event.end).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {event.location && (
                    <div className="mb-2">📍 {event.location}</div>
                  )}
                  {event.description && (
                    <div className="mt-4">{event.description}</div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center p-6 opacity-70">
                No events scheduled for this day
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
