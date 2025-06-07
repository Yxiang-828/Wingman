/* filepath: c:\Users\xiang\checker\Wingman\src\components\Sidebar\Sidebar.tsx */

import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import MiniCalendar from "./MiniCalendar";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationsContext";
import { getCurrentUserId } from "../../utils/auth";
import "../../main.css";
import "./Sidebar.css";

const DashboardIcon = () => <span className="icon-rotate">📊</span>;
const CalendarIcon = () => <span className="icon-rotate">📅</span>;
const DiaryIcon = () => <span className="icon-rotate">📝</span>;
const ProfileIcon = () => <span className="icon-rotate">👤</span>;

type Theme = "dark" | "light" | "yandere" | "kuudere" | "tsundere" | "dandere";

// ✅ SIMPLIFIED: MenuItem interface
interface MenuItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  submenu?: { title: string; path: string }[];
  badge?: number | string;
  onClick?: () => void;
}

const Sidebar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false); // ✅ PINNED state
  const [isHoverExpanded, setIsHoverExpanded] = useState(false); // ✅ HOVER state
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());
  const [userAvatar, setUserAvatar] = useState<string | null>(null); // ✅ NEW: User's avatar
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { unreadCount } = useNotifications();

  // ✅ LOAD USER AVATAR: Get from database
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

  // ✅ HOVER HANDLERS: Toggle button triggers expansion
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

  // ✅ SIDEBAR HOVER HANDLERS: Keep sidebar open when hovering
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

  // ✅ CLICK HANDLER: Pin/unpin sidebar
  const toggleSidebar = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);

    if (!newVisibility) {
      setIsHoverExpanded(false);
    }

    const event = new CustomEvent("toggle-sidebar", {
      detail: { visible: newVisibility },
    });
    window.dispatchEvent(event);
  };

  // ✅ THEME FUNCTIONS: Cycle through all themes
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

  // ✅ DASHBOARD REFRESH: Special function with event dispatch
  const handleDashboardRefresh = async () => {
    console.log("🔄 DASHBOARD REFRESH: Navigating to dashboard");
    navigate("/");
    const refreshEvent = new CustomEvent("dashboard-refresh", {
      detail: { timestamp: Date.now() },
    });
    window.dispatchEvent(refreshEvent);
    console.log("✅ DASHBOARD REFRESH: Completed");
  };

  // ✅ SUBMENU TOGGLE: Expand/collapse submenu items
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

  // ✅ MENU ITEMS: Complete navigation structure
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

  // ✅ LIFECYCLE: Listen for external sidebar toggle events
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

  // ✅ LISTEN FOR AVATAR UPDATES: Reload when user changes avatar
  useEffect(() => {
    const handleAvatarUpdate = () => {
      loadUserAvatar();
    };

    window.addEventListener("avatar-updated", handleAvatarUpdate);

    return () => {
      window.removeEventListener("avatar-updated", handleAvatarUpdate);
    };
  }, []);

  // ✅ COMPLETE RENDER: Full sidebar with all functionality
  return (
    <>
      {/* ✅ SIMPLIFIED TOGGLE BUTTON: Use user's selected avatar */}
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
              onError={() => setUserAvatar(null)} // ✅ FALLBACK: Remove broken images
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

      {/* ✅ SIDEBAR: Expands on button hover OR sidebar hover, stays when pinned */}
      <aside
        className={`sidebar ${isVisible ? "visible" : ""} ${
          isHoverExpanded ? "hover-expanded" : ""
        }`}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        {/* ✅ HEADER: Compact title and theme toggle */}
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

        {/* ✅ MINI CALENDAR: Compact calendar widget */}
        <MiniCalendar />

        {/* ✅ NAVIGATION: Full menu with submenus */}
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

              {/* ✅ SUBMENU: Animated expansion */}
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
