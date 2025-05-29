import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import MiniCalendar from "./MiniCalendar";
import NavSection from "./NavSection";
import type { MenuItem } from "./NavSection";
import "../../main.css";
import productiveIcon from "../../assets/productive.png";
import moodyIcon from "../../assets/moody.png";
import "./Sidebar.css";

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

  useEffect(() => {
    if (window.electronAPI?.onMoodChange) {
      window.electronAPI.onMoodChange((mood: string) => {
        if (mood === "productive" || mood === "moody") {
          setWingmanMood(mood as keyof typeof moodIcons);
        }
      });
    }
  }, []);

  // Listen for toggle-sidebar events (from DiaryEntry immersive mode)
  useEffect(() => {
    const handleToggle = (event: CustomEvent) => {
      setIsVisible(event.detail.visible);
    };

    window.addEventListener("toggle-sidebar", handleToggle as EventListener);

    return () => {
      window.removeEventListener(
        "toggle-sidebar",
        handleToggle as EventListener
      );
    };
  }, []);

  const toggleSidebar = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);

    // Dispatch sidebar visibility change event for other components
    const event = new CustomEvent("sidebar-visibility-change", {
      detail: { isVisible: newVisibility },
    });
    window.dispatchEvent(event);
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
          onDateSelect={(date) => {
            navigate(`/calendar/day?date=${format(date, "yyyy-MM-dd")}`);
          }}
        />

        {/* Navigation Section */}
        <NavSection items={menuItems} />
      </aside>
    </>
  );
};

export default Sidebar;
