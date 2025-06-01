import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
// Removed import for calendar cache as it's no longer needed

/**
 * Hook that triggers data refresh when navigating between pages
 * No longer uses cache system - just dispatches refresh events
 */
const useNavigationRefresh = () => {
  const location = useLocation();
  // Removed calendar cache hook usage

  useEffect(() => {
    // Dispatch refresh events for components to handle
    const handlePageNavigation = () => {
      console.log('🧭 Navigation: Page changed, dispatching refresh events');
      
      // Dispatch refresh event for any components that want to refresh
      const refreshEvent = new CustomEvent('navigation-refresh', {
        detail: { 
          pathname: location.pathname,
          search: location.search,
          timestamp: Date.now()
        }
      });
      window.dispatchEvent(refreshEvent);
      
      // Also dispatch specific events based on path
      if (location.pathname === '/') {
        const dashboardEvent = new CustomEvent('dashboard-refresh', {
          detail: { timestamp: Date.now() }
        });
        window.dispatchEvent(dashboardEvent);
      }
      
      if (location.pathname.startsWith('/notifications')) {
        const notificationsEvent = new CustomEvent('notifications-refresh', {
          detail: { timestamp: Date.now() }
        });
        window.dispatchEvent(notificationsEvent);
      }
    };

    // Small delay to ensure components are mounted
    const timeoutId = setTimeout(handlePageNavigation, 100);
    
    return () => clearTimeout(timeoutId);
  }, [location.pathname, location.search]);
};

// Export as named export to match import usage
export { useNavigationRefresh };
export default useNavigationRefresh;