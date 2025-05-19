import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../main.css";

// Event type for upcoming events
interface Event {
  id: number;
  title: string;
  time: string;
  type: "meeting" | "personal" | "reminder";
}

// Diary entry type for recent entries
interface DiaryEntry {
  id: number;
  title: string;
  preview: string;
  date: string;
}

const Dashboard: React.FC = () => {
  // Simulated data for upcoming events
  const upcomingEvents: Event[] = [
    { id: 1, title: "Team Meeting", time: "10:00 AM", type: "meeting" },
    { id: 2, title: "Lunch with Alex", time: "12:30 PM", type: "personal" },
    { id: 3, title: "Project Deadline", time: "5:00 PM", type: "reminder" },
  ];

  // Simulated data for recent diary entries
  const recentEntries: DiaryEntry[] = [
    {
      id: 1,
      title: "Productive Day",
      preview: "Finished the frontend implementation and started working on...",
      date: "May 15, 2025",
    },
    {
      id: 2,
      title: "Weekend Plans",
      preview: "Thinking about visiting the new art exhibition downtown...",
      date: "May 14, 2025",
    },
  ];

  // Simulated jokes for fun UI
  const jokes = [
    "Why do programmers prefer dark mode? Because light attracts bugs!",
    "I told my computer I needed a break, and now it won't stop sending me vacation ads.",
  ];

  const [chatInput, setChatInput] = useState("");
  const navigate = useNavigate();

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      // Optionally, you can pass the message as state or query param
      navigate("/chatbot");
    }
  };

  return (
    <div className="dashboard">
      {/* Left column: Dashboard title and New Task button stacked at the top */}
      <div className="flex flex-col items-center md:items-start md:col-span-1 col-span-3 pt-8 gap-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button className="action-btn"
        onClick={() => navigate("/calendar")}>
          <span>✨</span>
          New Task
        </button>
      </div>

      {/* Right columns: All dashboard content */}
      <div className="md:col-span-2 col-span-3 flex flex-col gap-6">
        {/* Top grid: Greeting card and Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Greeting Card */}
          <div className="dashboard-card bg-card">
            <h2 className="text-2xl font-bold mb-2">Hello there!</h2>
            <p className="mb-4">
              Here's what you have coming up today. Don't forget your meeting at
              10AM!
            </p>
            <p className="text-accent-primary">"{jokes[0]}"</p>
          </div>

          {/* Quick Stats Card */}
          <div className="dashboard-card bg-card">
            <h2 className="text-2xl font-bold mb-4">Your Day at a Glance</h2>
            <div className="flex justify-between mb-2">
              <span>Events Today</span>
              <span className="font-bold">3</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Diary Entries This Week</span>
              <span className="font-bold">2</span>
            </div>
            <div className="flex justify-between">
              <span>Tasks Completed</span>
              <span className="font-bold">5/8</span>
            </div>
          </div>
        </div>

        {/* Middle grid: Upcoming Events and Recent Diary Entries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upcoming Events Card */}
          <div className="dashboard-card bg-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Upcoming Events</h2>
              <button className="rounded-full bg-dark p-2">
                <span className="icon-rotate">📅</span>
              </button>
            </div>
            <div className="space-y-4">
              {/* List of upcoming events */}
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center p-3 bg-dark rounded-lg"
                >
                  <div className="mr-4">
                    {/* Icon based on event type */}
                    {event.type === "meeting" && (
                      <span className="text-2xl">👥</span>
                    )}
                    {event.type === "personal" && (
                      <span className="text-2xl">🍽️</span>
                    )}
                    {event.type === "reminder" && (
                      <span className="text-2xl">⏰</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">{event.title}</h3>
                    <p className="text-sm opacity-70">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Diary Entries Card */}
          <div className="dashboard-card bg-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Recent Diary Entries</h2>
              <button className="rounded-full bg-dark p-2">
                <span className="icon-rotate">📝</span>
              </button>
            </div>
            <div className="space-y-4">
              {/* List of recent diary entries */}
              {recentEntries.map((entry) => (
                <div key={entry.id} className="p-3 bg-dark rounded-lg">
                  <h3 className="font-bold">{entry.title}</h3>
                  <p className="text-sm opacity-70 mb-2">{entry.date}</p>
                  <p className="text-sm">{entry.preview}</p>
                </div>
              ))}
              {/* Button to write a new diary entry */}
              <button className="action-btn w-full mt-4"
                  onClick={() => navigate("/diary/write")}>
                <span>✏️</span>
                Write New Entry
              </button>
            </div>
          </div>
        </div>

        {/* Chatbot Quick Access Card */}
        <div className="dashboard-card bg-card mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Chat with Wingman</h2>
            <button className="rounded-full bg-dark p-2">
              <span className="icon-rotate">🤖</span>
            </button>
          </div>
          <div className="bg-dark p-4 rounded-lg mb-4">
            <p className="mb-2">
              Need some help or just want to chat? Wingman is here for you!
            </p>
            <p className="text-accent-primary">"{jokes[1]}"</p>
          </div>
          {/* Chat input area */}
          <form className="flex" onSubmit={handleChatSubmit}>
            <input
              type="text"
              className="flex-1 p-3 bg-dark rounded-l-lg border border-r-0 border-transparent focus:outline-none focus:border-accent-primary"
              placeholder="Type a message to Wingman..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button
              type="submit"
              className="bg-accent-primary p-3 rounded-r-lg hover:bg-accent-secondary"
            >
              <span>📤</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
