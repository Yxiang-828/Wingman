import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MiniCalendar from "./MiniCalendar";
import NavSection from "./NavSection";
import type { MenuItem } from "./NavSection";
import WingmanAvatar from "../Common/WingmanAvatar";
import { useTheme } from "../../context/ThemeContext";
import { useCalendarCache } from "../../Hooks/useCalendar";
import { getTodayDateString } from "../../utils/timeUtils";
import "../../main.css";
import "./Sidebar.css";

const DashboardIcon = () => <span className="icon-rotate">📊</span>;
const CalendarIcon = () => <span className="icon-rotate">📅</span>;
const DiaryIcon = () => <span className="icon-rotate">📝</span>;
const ProfileIcon = () => <span className="icon-rotate">👤</span>;

const Sidebar: React.FC = () => {
  const [wingmanMood, setWingmanMood] = useState<"productive" | "moody">(
    "productive"
  );
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const { actualTheme, setTheme } = useTheme();
  const { getDayData, clearCache } = useCalendarCache("Sidebar");

  // Toggle theme function
  const toggleTheme = () => {
    setTheme(actualTheme === "dark" ? "light" : "dark");
  };

  // ✅ ADD: Dashboard force reload function
  const handleDashboardRefresh = async () => {
    console.log("🔄 DASHBOARD REFRESH: Starting...");

    try {
      const today = getTodayDateString();
      console.log(`🔄 DASHBOARD REFRESH: Clearing cache and fetching ${today}`);

      // Clear cache for today
      clearCache();

      // Force fetch today's data with fresh request
      await getDayData(today, true); // forceRefresh = true

      console.log("✅ DASHBOARD REFRESH: Cache updated successfully");
    } catch (error) {
      console.error("❌ DASHBOARD REFRESH: Error updating cache:", error);
    }
  };

  // Map wingman mood to avatar mood
  const getAvatarMood = (wingmanMood: "productive" | "moody") => {
    return wingmanMood === "productive" ? "happy" : "neutral";
  };

  useEffect(() => {
    if (window.electronAPI?.onMoodChange) {
      window.electronAPI.onMoodChange((mood: string) => {
        if (mood === "productive" || mood === "moody") {
          setWingmanMood(mood as "productive" | "moody");
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

  // ✅ MODIFIED: Add onClick handler to Dashboard menu item
  const menuItems: MenuItem[] = [
    {
      title: "Dashboard",
      path: "/",
      icon: <DashboardIcon />,
      onClick: handleDashboardRefresh, // ✅ ADD REFRESH HANDLER
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
        <WingmanAvatar
          size="small"
          mood={getAvatarMood(wingmanMood)}
          context="sidebar"
          showMessage={false}
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
        <div className="sidebar-toggle-avatar">
          <WingmanAvatar
            size="toggle"
            mood={getAvatarMood(wingmanMood)}
            context="sidebar"
            showMessage={false}
            onClick={() => navigate("/chatbot")}
          />
        </div>
      </button>

      {/* Sidebar that slides in/out */}
      <aside className={`sidebar ${isVisible ? "visible" : ""}`}>
        {/* Logo Header with Avatar */}
        <div className="sidebar-header">
          <WingmanAvatar
            size="medium"
            mood={getAvatarMood(wingmanMood)}
            context="sidebar"
            showMessage={isVisible && Math.random() > 0.7} // Show message occasionally when sidebar opens
            onClick={() => navigate("/chatbot")}
            className="wingman-avatar--sidebar"
          />
          <div className="sidebar-header-content">
            <h1 className="sidebar-title">Wingman</h1>
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${
                actualTheme === "dark" ? "light" : "dark"
              } theme`}
            >
              {actualTheme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* Mini Calendar */}
        <MiniCalendar />
        {/* Navigation Section */}
        <NavSection items={menuItems} />
      </aside>
    </>
  );
};

export default Sidebar;
