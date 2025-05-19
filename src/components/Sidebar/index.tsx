import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavSection from "./NavSection";
import MiniCalendar from "./MiniCalendar";
import QuickAdd from "./QuickAdd";
import "../../main.css";
import productiveIcon from "../../assets/productive.png";
import moodyIcon from "../../assets/moody.png";

// Extend the Window interface to include electronAPI
declare global {
  interface Window {
    electronAPI?: {
      onMoodChange?: (callback: (mood: string) => void) => void;
    };
  }
}

const DashboardIcon = () => <span className="icon-rotate">📊</span>;
const CalendarIcon = () => <span className="icon-rotate">📅</span>;
const DiaryIcon = () => <span className="icon-rotate">📝</span>;
const ProfileIcon = () => <span className="icon-rotate">👤</span>;

const moodIcons = {
  productive: productiveIcon,
  moody: moodyIcon,
};

const Sidebar: React.FC = () => {
  const [wingmanMood, setWingmanMood] =
    useState<keyof typeof moodIcons>("productive");
  const navigate = useNavigate();

  useEffect(() => {
    if (window.electronAPI?.onMoodChange) {
      window.electronAPI.onMoodChange((mood: string) => {
        if (mood === "productive" || mood === "moody") {
          setWingmanMood(mood);
        }
      });
    }
  }, []);

  const menuItems = [
    {
      title: "Dashboard",
      path: "/",
      icon: <DashboardIcon />,
    },
    {
      title: "Calendar",
      path: "/calendar",
      icon: <CalendarIcon />,
      submenu: [
        { title: "Day View", path: "/calendar/day" },
        { title: "Week View", path: "/calendar/week" },
        { title: "Month View", path: "/calendar/month" },
      ],
    },
    {
      title: "Diary",
      path: "/diary",
      icon: <DiaryIcon />,
      submenu: [
        { title: "Write Entry", path: "/diary/write" },
        { title: "View Entries", path: "/diary/view" },
        { title: "Search", path: "/diary/search" },
      ],
    },
    {
      title: "Wingman",
      path: "/chatbot",
      icon: (
        <img
          src={moodIcons[wingmanMood] || productiveIcon}
          alt={wingmanMood}
          className="icon-rotate"
          style={{ width: 28, height: 28, borderRadius: "50%" }}
        />
      ),
      badge: 1,
    },
    {
      title: "Profile",
      path: "/profile",
      icon: <ProfileIcon />,
      submenu: [
        { title: "Settings", path: "/profile/settings" },
        { title: "Avatar", path: "/profile/avatar" },
        { title: "Preferences", path: "/profile/preferences" },
      ],
    },
    {
      title: "Home",
      path: "/home",
      icon: <span className="icon-rotate">🏠</span>,
    },
  ];

  return (
    <aside className="sidebar">
      {/* Logo Header */}
      <div className="flex items-center justify-center mb-6 p-4">
        <h1 className="text-2xl font-bold m-0">Wingman</h1>
      </div>

      {/* Mini Calendar */}
      <MiniCalendar
        events={[
          { date: new Date(), count: 3 },
          { date: new Date(2025, 4, 20), count: 2 },
        ]}
        onDateSelect={(date) => {
          const formatted = `${date.getFullYear()}-${(date.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
          navigate(`/calendar/day?date=${formatted}`);
        }}
      />

      {/* Navigation Section */}
      <NavSection items={menuItems} />

      {/* Quick Add Button */}
      <QuickAdd />
    </aside>
  );
};

export default Sidebar;
