import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

const WeekView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const query = new URLSearchParams(location.search);
  const dateStr = query.get("date") || new Date().toISOString().slice(0, 10);
  const [year, month, day] = dateStr.split("-").map(Number);
  const baseDate = new Date(year, month - 1, day);
  const semester = getSemester(month);

  const dayOfWeek = baseDate.getDay();
  const weekStart = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() - dayOfWeek
  );

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + i
    );
    return d;
  });

  const semesterStart = getSemesterStart(year, month);
  const nthWeek = getNthWeekOfSemester(weekStart, semesterStart);

  // For the title: show the month and year of the first day of the week
  const monthTitle = weekStart.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  // Handlers for toggling weeks
  const handlePrevWeek = () => {
    const prevWeek = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() - 7
    );
    navigate(
      `/calendar/week?date=${prevWeek.getFullYear()}-${(prevWeek.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${prevWeek.getDate().toString().padStart(2, "0")}`
    );
  };

  const handleNextWeek = () => {
    const nextWeek = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + 7
    );
    navigate(
      `/calendar/week?date=${nextWeek.getFullYear()}-${(nextWeek.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${nextWeek.getDate().toString().padStart(2, "0")}`
    );
  };

  return (
    <div className="calendar-week-view">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <button className="calendar-btn" onClick={handlePrevWeek}>
          ←
        </button>
        <h2 style={{ flex: 1, textAlign: "center" }}>
          {monthTitle} — Week {nthWeek} - {semester} (
          {semester === "Semester 1" ? "Jan–Jun" : "Jul–Dec"})
        </h2>
        <button className="calendar-btn" onClick={handleNextWeek}>
          →
        </button>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          marginTop: "2rem",
        }}
      >
        {days.map((date) => (
          <button
            key={date.toISOString()}
            className="calendar-btn"
            onClick={() =>
              navigate(
                `/calendar/day?date=${date.getFullYear()}-${(
                  date.getMonth() + 1
                )
                  .toString()
                  .padStart(2, "0")}-${date
                  .getDate()
                  .toString()
                  .padStart(2, "0")}`
              )
            }
          >
            <div style={{ fontWeight: "bold" }}>
              {date.toLocaleDateString("en-US", { weekday: "short" })}
            </div>
            <div>
              {date.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default WeekView;
