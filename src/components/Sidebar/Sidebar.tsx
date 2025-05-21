// Add to your sidebar wherever the notifications link is displayed
import { useNotifications } from '../../context/NotificationsContext';

// Inside your Sidebar component:
const { unreadCount } = useNotifications();

// In the link/button for notifications:
<NavLink to="/notifications" className="sidebar-link">
  <span className="sidebar-icon">🔔</span>
  <span className="sidebar-text">Notifications</span>
  {unreadCount > 0 && (
    <span className="notification-badge">{unreadCount}</span>
  )}
</NavLink>