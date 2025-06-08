// Navigation section builder with async action support and loading states
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCalendarCache } from "../../Hooks/useCalendar";
import { getTodayDateString } from "../../utils/timeUtils";

// Navigation item structure with optional async handlers
export interface MenuItem {
  title: string;
  path?: string;
  icon?: React.ReactNode;
  badge?: number;
  onClick?: () => Promise<void>; // Custom async click handler for special actions
  submenu?: Array<{
    title: string;
    path: string;
  }>;
}

export interface NavSectionProps {
  items: Array<MenuItem>;
  collapsed?: boolean;
}

const NavSection: React.FC<NavSectionProps> = ({
  items,
  collapsed = false,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {}
  );
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({}); // Loading state management

  const toggleSubmenu = (title: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // Handle submenu navigation
  const handleSubmenuItemClick = (item: MenuItem) => {
    if (item.path) {
      navigate(item.path);
    }
  };

  // Handle main nav item clicks with async support
  const handleNavItemClick = async (item: MenuItem, e: React.MouseEvent) => {
    e.preventDefault();

    if (item.onClick) {
      // Show loading state for this specific item
      setLoadingItems((prev) => ({ ...prev, [item.title]: true }));

      try {
        // Execute custom click handler
        await item.onClick();

        // Navigate after successful execution
        if (item.path) {
          navigate(item.path);
        }
      } catch (error) {
        console.error(`Error in ${item.title} onClick:`, error);
      } finally {
        // Clear loading state
        setLoadingItems((prev) => ({ ...prev, [item.title]: false }));
      }
    } else if (item.path) {
      // Standard navigation without custom handler
      navigate(item.path);
    }
  };

  return (
    <nav className="sidebar-nav">
      {items.map((item, index) => (
        <div key={index} className="nav-item">
          {item.submenu ? (
            <div
              className={`sidebar-link flex items-center justify-between ${
                location.pathname === item.path ? "active" : ""
              }`}
              onClick={() => toggleSubmenu(item.title)}
              style={{ cursor: "pointer" }}
              title={collapsed ? item.title : ""}
            >
              <div className="sidebar-link-content">
                <span className="sidebar-icon">{item.icon}</span>
                {!collapsed && (
                  <span className="sidebar-text">{item.title}</span>
                )}
              </div>
              {!collapsed && (
                <span className="icon-rotate submenu-arrow">
                  {expandedItems[item.title] ? "▼" : "▶"}
                </span>
              )}
            </div>
          ) : // Support both Link and custom onClick handlers
          item.onClick ? (
            <div
              className={`sidebar-link ${
                location.pathname === item.path ? "active" : ""
              } ${loadingItems[item.title] ? "loading" : ""}`}
              onClick={(e) => handleNavItemClick(item, e)}
              style={{ cursor: "pointer" }}
              title={collapsed ? item.title : ""}
            >
              <div className="sidebar-link-content">
                <span className="sidebar-icon">
                  {loadingItems[item.title] ? "🔄" : item.icon}
                </span>
                {!collapsed && (
                  <span className="sidebar-text">
                    {loadingItems[item.title] ? "Processing..." : item.title}
                  </span>
                )}
                {item.badge !== undefined && (
                  <span className="badge">{item.badge}</span>
                )}
              </div>
            </div>
          ) : (
            <Link
              to={item.path!}
              className={`sidebar-link ${
                location.pathname === item.path ? "active" : ""
              }`}
              title={collapsed ? item.title : ""}
            >
              <div className="sidebar-link-content">
                <span className="sidebar-icon">{item.icon}</span>
                {!collapsed && (
                  <span className="sidebar-text">{item.title}</span>
                )}
                {item.badge !== undefined && (
                  <span className="badge">{item.badge}</span>
                )}
              </div>
            </Link>
          )}

          {item.submenu && !collapsed && (
            <div
              className={`sidebar-submenu${
                expandedItems[item.title] ? " open" : ""
              }`}
            >
              {expandedItems[item.title] &&
                item.submenu.map((subItem, subIndex) => (
                  <div
                    className="sidebar-submenu-item"
                    onClick={() => handleSubmenuItemClick(subItem)}
                    key={subIndex}
                  >
                    {subItem.title}
                  </div>
                ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
};

export default NavSection;
