import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TimeBlockVisualizer from "./TimeBlockVisualizer";
import type { TimeBlock } from "./TimeBlockVisualizer";
import {
  fetchTasks,
  addTask,
  updateTask,
  deleteTask,
} from "../../api/Calendar";
import type { Task } from "../../api/Calendar";
import "./Calendar.css";

const DayView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");

  React.useEffect(() => {
    try {
      const query = new URLSearchParams(location.search);
      const dateStr = query.get("date");
      if (dateStr) {
        const [year, month, day] = dateStr.split("-").map(Number);
        const newDate = new Date(year, month - 1, day);
        if (isNaN(newDate.getTime())) {
          setDateError(`Invalid date: ${dateStr}`);
          setDate(new Date());
        } else {
          setDate(newDate);
          setDateError(null);
        }
      } else {
        setDate(new Date());
        setDateError(null);
      }
    } catch (err) {
      setDateError(
        `Error: ${err instanceof Error ? err.message : String(err)}`
      );
      setDate(new Date());
    }
  }, [location.search]);

  useEffect(() => {
    if (!date) return;
    const dateStr = date.toISOString().slice(0, 10);
    fetchTasks(dateStr).then(setTasks);
  }, [date]);

  const handlePrevDay = () => {
    if (!date) return;
    const prev = new Date(date);
    prev.setDate(date.getDate() - 1);
    navigate(
      `/calendar/day?date=${prev.getFullYear()}-${(prev.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${prev.getDate().toString().padStart(2, "0")}`
    );
  };

  const handleNextDay = () => {
    if (!date) return;
    const next = new Date(date);
    next.setDate(date.getDate() + 1);
    navigate(
      `/calendar/day?date=${next.getFullYear()}-${(next.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${next.getDate().toString().padStart(2, "0")}`
    );
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !newTask.trim()) return;
    const dateStr = date.toISOString().slice(0, 10);
    const task = await addTask({
      date: dateStr,
      text: newTask,
      completed: false,
    });
    setTasks((prev) => [...prev, task]);
    setNewTask("");
  };

  const handleToggleTask = async (task: Task) => {
    const updated = await updateTask({ ...task, completed: !task.completed });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  };

  const handleDeleteTask = async (task: Task) => {
    await deleteTask(task.id);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  };

  const sampleBlocks: TimeBlock[] = [
    {
      id: 1,
      start: "09:00",
      end: "10:00",
      label: "Team Standup",
      color: "#646cff",
    },
    {
      id: 2,
      start: "11:00",
      end: "12:30",
      label: "Deep Work",
      color: "#535bf2",
    },
    {
      id: 3,
      start: "14:00",
      end: "15:00",
      label: "1:1 Meeting",
      color: "#7c7fff",
    },
  ];

  return (
    <div className="calendar-day-view">
      {dateError && (
        <div className="error-message" style={{ color: "red" }}>
          {dateError}
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <button className="calendar-btn" onClick={handlePrevDay}>
          ←
        </button>
        <h2
          className="text-xl font-bold mb-4"
          style={{ flex: 1, textAlign: "center" }}
        >
          {date
            ? date.toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "Loading..."}
        </h2>
        <button className="calendar-btn" onClick={handleNextDay}>
          →
        </button>
      </div>
      <section className="tasks-section mb-4">
        <h3 className="text-lg font-bold mb-2">Tasks for Today</h3>
        <form onSubmit={handleAddTask} className="flex gap-2 mb-3">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 p-2 rounded bg-dark border border-accent-primary"
          />
          <button type="submit" className="action-btn">
            Add
          </button>
        </form>
        <ul>
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggleTask(task)}
              />
              <span
                style={{
                  textDecoration: task.completed ? "line-through" : "none",
                }}
              >
                {task.text}
              </span>
              <button
                onClick={() => handleDeleteTask(task)}
                className="calendar-btn"
              >
                🗑️
              </button>
            </li>
          ))}
          {tasks.length === 0 && <li>No tasks for today.</li>}
        </ul>
      </section>
      <TimeBlockVisualizer blocks={sampleBlocks} />
      <button className="calendar-btn">Add Event</button>
    </div>
  );
};

export default DayView;
