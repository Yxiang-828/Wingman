import { Link, useLocation } from 'react-router-dom';
import '../main.css';
import { useState } from 'react';

// Icons (you can replace these with actual imported icons)
const DashboardIcon = () => <span className="icon-rotate">📊</span>;
const CalendarIcon = () => <span className="icon-rotate">📅</span>;
const DiaryIcon = () => <span className="icon-rotate">📝</span>;
const ChatbotIcon = () => <span className="icon-rotate">🤖</span>;
const ProfileIcon = () => <span className="icon-rotate">👤</span>;
const ChevronDown = () => <span className="icon-rotate">▼</span>;
const ChevronRight = () => <span className="icon-rotate">▶</span>;

interface MenuItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  submenu?: Array<{
    title: string;
    path: string;
  }>;
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({
    calendar: false,
    diary: false
  });

  // Define menu items with potential submenus
  const menuItems: MenuItem[] = [
    {
      title: 'Dashboard',
      path: '/',
      icon: <DashboardIcon />
    },
    {
      title: 'Calendar',
      path: '/calendar',
      icon: <CalendarIcon />,
      submenu: [
        { title: 'Day View', path: '/calendar/day' },
        { title: 'Week View', path: '/calendar/week' },
        { title: 'Month View', path: '/calendar/month' }
      ]
    },
    {
      title: 'Diary',
      path: '/diary',
      icon: <DiaryIcon />,
      submenu: [
        { title: 'Write Entry', path: '/diary/write' },
        { title: 'View Entries', path: '/diary/view' },
        { title: 'Search', path: '/diary/search' }
      ]
    },
    {
      title: 'Wingman',
      path: '/chatbot',
      icon: <ChatbotIcon />
    },
    {
      title: 'Profile',
      path: '/profile',
      icon: <ProfileIcon />
    }
  ];

  const toggleSubmenu = (key: string) => {
    setExpandedItems((prev: { [key: string]: boolean }) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <aside className="sidebar p-3 h-screen w-64 shadow-lg bg-card text-light">
      <div className="flex items-center justify-center mb-6 p-4">
        <h1 className="text-2xl font-bold m-0">Wingman</h1>
      </div>
      
      <nav className="flex flex-col space-y-2">
        {menuItems.map((item, index) => (
          <div key={index}>
            {/* Main menu item */}
            <div 
              className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => item.submenu && toggleSubmenu(item.title.toLowerCase())}
            >
              {item.submenu ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    {item.title}
                  </div>
                  {expandedItems[item.title.toLowerCase()] ? <ChevronDown /> : <ChevronRight />}
                </div>
              ) : (
                <Link to={item.path} className="flex items-center gap-2 w-full">
                  {item.icon}
                  {item.title}
                </Link>
              )}
            </div>
            
            {/* Submenu items if present */}
            {item.submenu && (
              <div 
                className={`sidebar-submenu ${expandedItems[item.title.toLowerCase()] ? 'open' : ''}`}
                style={{ height: expandedItems[item.title.toLowerCase()] ? `${item.submenu.length * 2.5}rem` : '0' }}
              >
                {item.submenu.map((subItem, subIndex) => (
                  <Link 
                    key={subIndex}
                    to={subItem.path}
                    className={`sidebar-submenu-item ${location.pathname === subItem.path ? 'active' : ''}`}
                  >
                    {subItem.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      
      <div className="mt-4 px-4">
        <button className="action-btn w-full">
          <span className="icon-rotate">✨</span>
          New Entry
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;