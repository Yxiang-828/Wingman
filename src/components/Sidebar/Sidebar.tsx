import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MiniCalendar from "./MiniCalendar";
import NavSection from "./NavSection";
import type { MenuItem } from "./NavSection";
import WingmanAvatar from "../Common/WingmanAvatar";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationsContext";
import { getTodayDateString } from "../../utils/timeUtils";
import "../../main.css";
import "./Sidebar.css";

const DashboardIcon = () => <span className="icon-rotate">📊</span>;
const CalendarIcon = () => <span className="icon-rotate">📅</span>;
const DiaryIcon = () => <span className="icon-rotate">📝</span>;
const ProfileIcon = () => <span className="icon-rotate">👤</span>;

type Theme = "dark" | "light" | "yandere" | "kuudere" | "tsundere" | "dandere";

const Sidebar: React.FC = () => {
  const [wingmanMood, setWingmanMood] = useState<"productive" | "moody">(
    "productive"
  );
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme(); // ✅ USE: Full theme system
  const { unreadCount } = useNotifications();

  // ✅ FIXED: Theme rotation function - cycles through all 6 themes
  const toggleTheme = () => {
    const themes: Theme[] = [
      "dark",
      "light",
      "yandere",
      "kuudere",
      "tsundere",
      "dandere",
    ];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  // ✅ FIXED: Get theme emoji for display
  const getThemeEmoji = () => {
    switch (theme) {
      case "dark":
        return "🌙";
      case "light":
        return "☀️";
      case "yandere":
        return "🌸";
      case "kuudere":
        return "❄️";
      case "tsundere":
        return "🧡";
      case "dandere":
        return "💜";
      default:
        return "🌙";
    }
  };

  // Dashboard refresh function
  const handleDashboardRefresh = async () => {
    console.log("🔄 DASHBOARD REFRESH: Navigating to dashboard");
    navigate("/");
    const refreshEvent = new CustomEvent("dashboard-refresh", {
      detail: { timestamp: Date.now() },
    });
    window.dispatchEvent(refreshEvent);
    console.log("✅ DASHBOARD REFRESH: Completed");
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

  // Listen for toggle-sidebar events
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
      onClick: handleDashboardRefresh,
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
        <div className="sidebar-wingman-icon">
          <WingmanAvatar
            size="small"
            mood={getAvatarMood(wingmanMood)}
            context="sidebar"
            showMessage={false}
          />
        </div>
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
    {
      title: "Notifications",
      path: "/notifications",
      icon: <span className="icon-rotate">🔔</span>,
      badge: unreadCount > 0 ? unreadCount : undefined,
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
            showMessage={isVisible && Math.random() > 0.7}
            onClick={() => navigate("/chatbot")}
            className="wingman-avatar--sidebar"
          />
          <div className="sidebar-header-content">
            <h1 className="sidebar-title">Wingman</h1>
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Current: ${theme} - Click to cycle themes`}
            >
              {getThemeEmoji()}
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
