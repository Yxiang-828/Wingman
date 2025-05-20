import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
// Define the MenuItem type locally
export interface MenuItem {
  title: string;
  path?: string;
  icon?: React.ReactNode;
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
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {}
  );

  const toggleSubmenu = (title: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
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
                  <Link
                    key={subIndex}
                    to={subItem.path}
                    className={`sidebar-submenu-item${
                      location.pathname === subItem.path ? " active" : ""
                    }`}
                  >
                    {subItem.title}
                  </Link>
                ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
};

export default NavSection;
