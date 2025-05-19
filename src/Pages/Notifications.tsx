import React, { useState } from "react";

type Notification = {
  id: number;
  type: "reminder" | "diary" | "calendar";
  message: string;
  time: string;
  read: boolean;
};

const initialNotifications: Notification[] = [
  {
    id: 1,
    type: "reminder",
    message: "Drink water!",
    time: "2025-05-19 21:00",
    read: false,
  },
  {
    id: 2,
    type: "calendar",
    message: "Meeting with team at 10am tomorrow.",
    time: "2025-05-20 10:00",
    read: false,
  },
  {
    id: 3,
    type: "diary",
    message: "Don't forget to write your diary entry tonight.",
    time: "2025-05-19 20:00",
    read: true,
  },
];

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState(initialNotifications);

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => setNotifications([]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Notifications</h2>
      {notifications.length === 0 ? (
        <p>No notifications 🎉</p>
      ) : (
        <>
          <button className="mb-4 btn btn-danger" onClick={clearAll}>
            Clear All
          </button>
          <ul className="space-y-4">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`p-4 rounded-lg shadow-md flex items-center justify-between ${
                  n.read ? "bg-gray-700 opacity-60" : "bg-dark"
                }`}
              >
                <div>
                  <span className="mr-2">
                    {n.type === "reminder" && "⏰"}
                    {n.type === "diary" && "📝"}
                    {n.type === "calendar" && "📅"}
                  </span>
                  <span className="font-medium">{n.message}</span>
                  <div className="text-xs opacity-70">{n.time}</div>
                </div>
                <div className="flex gap-2">
                  {!n.read && (
                    <button
                      className="btn btn-primary"
                      onClick={() => markAsRead(n.id)}
                    >
                      Mark as read
                    </button>
                  )}
                  <button
                    className="btn btn-danger"
                    onClick={() => clearNotification(n.id)}
                  >
                    Clear
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default Notifications;
