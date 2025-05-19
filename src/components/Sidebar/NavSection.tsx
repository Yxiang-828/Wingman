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
}

const NavSection: React.FC<NavSectionProps> = ({ items }) => {
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
    <nav className="flex flex-col space-y-1 px-2">
      {items.map((item, index) => (
        <div key={index} className="nav-item">
          {item.submenu ? (
            <div
              className={`sidebar-link flex items-center justify-between p-2 rounded-md hover:bg-accent-primary/10 ${
                location.pathname === item.path ? "bg-accent-primary/20" : ""
              }`}
              onClick={() => toggleSubmenu(item.title)}
              style={{ cursor: "pointer" }}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="text-sm font-medium">{item.title}</span>
              </div>
              <span className="icon-rotate text-xs">
                {expandedItems[item.title] ? "▼" : "▶"}
              </span>
            </div>
          ) : (
            <Link
              to={item.path!}
              className={`sidebar-link flex items-center justify-between p-2 rounded-md hover:bg-accent-primary/10 ${
                location.pathname === item.path ? "bg-accent-primary/20" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="text-sm font-medium">{item.title}</span>
              </div>
            </Link>
          )}

          {item.submenu && (
            <div
              className={`sidebar-submenu${
                expandedItems[item.title] ? " open" : ""
              } ml-4 mt-1 space-y-1`}
            >
              {expandedItems[item.title] &&
                item.submenu.map((subItem, subIndex) => (
                  <Link
                    key={subIndex}
                    to={subItem.path}
                    className={`sidebar-submenu-item${
                      location.pathname === subItem.path ? " bg-accent-primary/20" : ""
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
