// Command center sidebar - your loyal navigator through the digital realm
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import MiniCalendar from "./MiniCalendar";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationsContext";
import { getCurrentUserId } from "../../utils/auth";
import "../../main.css";
import "./Sidebar.css";

// Simple icon components with subtle animation
const DashboardIcon = () => <span className="icon-rotate">📊</span>;
const CalendarIcon = () => <span className="icon-rotate">📅</span>;
const DiaryIcon = () => <span className="icon-rotate">📝</span>;
const ProfileIcon = () => <span className="icon-rotate">👤</span>;

type Theme = "dark" | "light" | "yandere" | "kuudere" | "tsundere" | "dandere";

// Navigation item structure for the boss's convenience
interface MenuItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  submenu?: { title: string; path: string }[];
  onClick?: () => void;
}

const Sidebar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false); // Pinned state for persistent access
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  
    // Simplified toggle - click to expand/collapse with content push
  const toggleSidebar = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);

    // Apply body class for global layout adaptation
    if (newVisibility) {
      document.body.classList.add('sidebar-visible');
    } else {
      document.body.classList.remove('sidebar-visible');
    }

    // Notify layout system to adapt main content
    const event = new CustomEvent("sidebar-toggle", {
      detail: { visible: newVisibility },
    });
    window.dispatchEvent(event);

    // Also maintain backward compatibility
    const legacyEvent = new CustomEvent("toggle-sidebar", {
      detail: { visible: newVisibility },
    });
    window.dispatchEvent(legacyEvent);
  };

  // Theme cycling through all available moods
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

  // Visual representation of current theme mood
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

  // Dashboard refresh with event broadcasting for coordinated updates
  const handleDashboardRefresh = async () => {
    console.log("Navigating to dashboard and broadcasting refresh");
    navigate("/");
    const refreshEvent = new CustomEvent("dashboard-refresh", {
      detail: { timestamp: Date.now() },
    });
    window.dispatchEvent(refreshEvent);
    console.log("Dashboard refresh completed");
  };

  // Submenu expansion management
  const toggleSubmenu = (title: string) => {
    setOpenSubmenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  // Complete navigation structure for the boss's empire
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
      icon: <span className="icon-rotate">🤖</span>,
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
    },
  ];

  // Listen for external sidebar toggle events
    // Listen for external sidebar toggle events and cleanup on unmount
  useEffect(() => {
    const handleToggle = (event: CustomEvent) => {
      const newVisibility = event.detail.visible;
      setIsVisible(newVisibility);
      
      // Sync body class
      if (newVisibility) {
        document.body.classList.add('sidebar-visible');
      } else {
        document.body.classList.remove('sidebar-visible');
      }
    };

    window.addEventListener("toggle-sidebar", handleToggle as EventListener);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener("toggle-sidebar", handleToggle as EventListener);
      document.body.classList.remove('sidebar-visible');
    };
  }, []);

  return (
    <>
      {/* Toggle button with boss's avatar - floats majestically */}
      <button
        className={`sidebar-toggle ${isVisible ? "open" : ""}`}
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <div className="adaptive-streaks">
          <div className="streak streak-1"></div>
          <div className="streak streak-2"></div>
          <div className="streak streak-3"></div>
          <div className="streak streak-4"></div>
        </div>
      </button>

      {/* Main sidebar panel - expands on hover or when pinned */}
      <aside
        className={`sidebar ${isVisible ? "visible" : ""}`}
      >
        {/* Header with title and theme selector */}
        <div className="sidebar-header">
          <h1 className="sidebar-title">Wingman</h1>
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Current: ${theme} - Click to cycle themes`}
          >
            {getThemeEmoji()}
          </button>
        </div>

        {/* Compact calendar widget for quick date navigation */}
        <MiniCalendar />

        {/* Complete navigation menu with submenus and badges */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <div key={item.title} className="nav-item">
              <Link
                to={item.path}
                className={`sidebar-link ${item.submenu ? "has-submenu" : ""} ${
                  openSubmenus.has(item.title) ? "active" : ""
                }`}
                onClick={(e) => {
                  if (item.submenu) {
                    e.preventDefault();
                    toggleSubmenu(item.title);
                  } else if (item.onClick) {
                    item.onClick();
                  }
                }}
              >
                <div className="sidebar-link-content">
                  <span className="sidebar-icon">{item.icon}</span>
                  <span className="sidebar-text">{item.title}</span>
                </div>

                {item.submenu && <span className="submenu-arrow">▶</span>}
              </Link>

              {/* Expandable submenu with smooth animation */}
              {item.submenu && (
                <div
                  className={`sidebar-submenu ${
                    openSubmenus.has(item.title) ? "open" : ""
                  }`}
                >
                  {item.submenu.map((subItem) => (
                    <Link
                      key={subItem.title}
                      to={subItem.path}
                      className="sidebar-submenu-item"
                    >
                      {subItem.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
