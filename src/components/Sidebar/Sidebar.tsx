// Command center sidebar - your loyal navigator through the digital realm
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import MiniCalendar from "./MiniCalendar";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationsContext";
import WingmanAvatar from "../Common/WingmanAvatar";
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
  badge?: number | string;
  onClick?: () => void;
}

const Sidebar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false); // Pinned state for persistent access
  const [isHoverExpanded, setIsHoverExpanded] = useState(false); // Temporary expansion on hover
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());
  const [userAvatar, setUserAvatar] = useState<string | null>(null); // Boss's chosen avatar
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { unreadCount } = useNotifications();

  // Retrieve the boss's avatar from their settings
  useEffect(() => {
    loadUserAvatar();
  }, []);

  const loadUserAvatar = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const settings = await window.electronAPI.db.getUserSettings(userId);
      if (settings?.avatar_image) {
        setUserAvatar(settings.avatar_image);
      }
    } catch (error) {
      console.error("Failed to load user avatar:", error);
    }
  };

  // Hover handlers for the toggle button - shows preview without commitment
  const handleToggleHover = () => {
    if (!isVisible) {
      setIsHoverExpanded(true);
    }
  };

  const handleToggleLeave = () => {
    if (!isVisible) {
      setIsHoverExpanded(false);
    }
  };

  // Sidebar hover handlers - maintains expansion while boss explores
  const handleSidebarMouseEnter = () => {
    if (!isVisible) {
      setIsHoverExpanded(true);
    }
  };

  const handleSidebarMouseLeave = () => {
    if (!isVisible) {
      setIsHoverExpanded(false);
    }
  };

  // Pin or unpin the sidebar - boss's choice for workspace layout
  const toggleSidebar = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);

    if (!newVisibility) {
      setIsHoverExpanded(false);
    }

    // Notify other components about the change
    const event = new CustomEvent("toggle-sidebar", {
      detail: { visible: newVisibility },
    });
    window.dispatchEvent(event);
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

  // Listen for external sidebar toggle events
  useEffect(() => {
    const handleToggle = (event: CustomEvent) => {
      const newVisibility = event.detail.visible;
      setIsVisible(newVisibility);
    };

    window.addEventListener("toggle-sidebar", handleToggle as EventListener);

    return () => {
      window.removeEventListener(
        "toggle-sidebar",
        handleToggle as EventListener
      );
    };
  }, []);

  // Listen for avatar updates from profile changes
  useEffect(() => {
    const handleAvatarUpdate = () => {
      loadUserAvatar();
    };

    window.addEventListener("avatar-updated", handleAvatarUpdate);

    return () => {
      window.removeEventListener("avatar-updated", handleAvatarUpdate);
    };
  }, []);

  return (
    <>
      {/* Toggle button with boss's avatar - floats majestically */}
      <button
        className={`sidebar-toggle ${isVisible ? "open" : ""}`}
        onClick={toggleSidebar}
        onMouseEnter={handleToggleHover}
        onMouseLeave={handleToggleLeave}
        aria-label="Toggle sidebar"
      >
        <div className="sidebar-toggle-avatar">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt="User Avatar"
              onError={() => setUserAvatar(null)}
            />
          ) : (
            <span
              style={{ fontSize: "20px", color: "rgba(255, 255, 255, 0.7)" }}
            >
              👤
            </span>
          )}
        </div>
      </button>

      {/* Main sidebar panel - expands on hover or when pinned */}
      <aside
        className={`sidebar ${isVisible ? "visible" : ""} ${
          isHoverExpanded ? "hover-expanded" : ""
        }`}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
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

                {item.badge && (
                  <span className="sidebar-badge">{item.badge}</span>
                )}

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
