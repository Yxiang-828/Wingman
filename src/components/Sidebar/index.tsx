import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import MiniCalendar from "./MiniCalendar";
import NavSection from "./NavSection";
import type { MenuItem } from "./NavSection";
import QuickAdd from "./QuickAdd";
import "../../main.css";
import productiveIcon from "../../assets/productive.png";
import moodyIcon from "../../assets/moody.png";
import "./Sidebar.css";
import { logoutUser } from "../../utils/auth";

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

const moodIcons: Record<string, string> = {
  productive: productiveIcon,
  moody: moodyIcon,
};

const Sidebar: React.FC = () => {
  const [wingmanMood, setWingmanMood] =
    useState<keyof typeof moodIcons>("productive");
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (window.electronAPI?.onMoodChange) {
      window.electronAPI.onMoodChange((mood: string) => {
        if (mood === "productive" || mood === "moody") {
          setWingmanMood(mood as keyof typeof moodIcons);
        }
      });
    }
  }, []);

  const toggleSidebar = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);

    // Dispatch event to inform App about visibility change
    window.dispatchEvent(
      new CustomEvent("sidebar-visibility-change", {
        detail: { isVisible: newVisibility },
      })
    );
  };

  const menuItems: MenuItem[] = [
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
      ],
    },
    {
      title: "Home",
      path: "/home",
      icon: <span className="icon-rotate">🏠</span>,
    },
  ];

  return (
    <>
      {/* Toggle button that's always visible */}
      <button
        className={`sidebar-toggle ${isVisible ? "open" : ""}`}
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <img
          src={
            isVisible
              ? moodIcons[wingmanMood === "productive" ? "moody" : "productive"]
              : moodIcons[wingmanMood]
          }
          alt="Toggle sidebar"
          className="sidebar-toggle-icon"
        />
      </button>

      {/* Sidebar that slides in/out */}
      <aside className={`sidebar ${isVisible ? "visible" : ""}`}>
        {/* Logo Header */}
        <div className="sidebar-header">
          <h1 className="sidebar-title">Wingman</h1>
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

        <QuickAdd />
        {/* Logout Button */}
        <button
          className="logout-btn"
          onClick={() => {
            logoutUser();
            navigate("/login");
          }}
          style={{
            margin: "2rem auto 1rem auto",
            padding: "0.8rem 1.5rem",
            background: "#646cff",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: "pointer",
            display: "block",
            width: "80%",
          }}
        >
          Logout
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
