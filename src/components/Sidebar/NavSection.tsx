import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCalendarCache } from "../../Hooks/useCalendar";
import { getTodayDateString } from "../../utils/timeUtils";

// Update MenuItem interface to include onClick handler
export interface MenuItem {
  title: string;
  path?: string;
  icon?: React.ReactNode;
  badge?: number;
  onClick?: () => Promise<void>; // ✅ ADD: Custom async click handler
  submenu?: Array<{
    title: string;
    path: string;
  }>;
}

export interface NavSectionProps {
  items: Array<MenuItem>;
  collapsed?: boolean;
}

const NavSection: React.FC<NavSectionProps> = ({ items, collapsed = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({}); // ✅ ADD: Loading state

  const toggleSubmenu = (title: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // Handle potential undefined path
  const handleSubmenuItemClick = (item: MenuItem) => {
    if (item.path) {
      navigate(item.path);
    }
  };

  // ✅ ADD: Handle nav item click with custom onClick support
  const handleNavItemClick = async (item: MenuItem, e: React.MouseEvent) => {
    e.preventDefault();
    
    if (item.onClick) {
      // Set loading state for this item
      setLoadingItems(prev => ({ ...prev, [item.title]: true }));
      
      try {
        // Use custom click handler if provided
        await item.onClick();
        
        // Navigate after successful onClick
        if (item.path) {
          navigate(item.path);
        }
      } catch (error) {
        console.error(`Error in ${item.title} onClick:`, error);
      } finally {
        // Clear loading state
        setLoadingItems(prev => ({ ...prev, [item.title]: false }));
      }
    } else if (item.path) {
      // Default navigation
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
                {!collapsed && <span className="sidebar-text">{item.title}</span>}
              </div>
              {!collapsed && (
                <span className="icon-rotate submenu-arrow">
                  {expandedItems[item.title] ? "▼" : "▶"}
                </span>
              )}
            </div>
          ) : (
            // ✅ MODIFIED: Support both Link and custom onClick
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
                      {loadingItems[item.title] ? "Refreshing..." : item.title}
                    </span>
                  )}
                  {/* Render the badge if it exists */}
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
                  {!collapsed && <span className="sidebar-text">{item.title}</span>}
                  {/* Render the badge if it exists */}
                  {item.badge !== undefined && (
                    <span className="badge">{item.badge}</span>
                  )}
                </div>
              </Link>
            )
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
