import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useNotifications } from '../context/NotificationsContext';
import { useCalendarCache } from '../Hooks/useCalendar';

/**
 * Hook that triggers data refresh when navigating to specific routes
 */
export function useNavigationRefresh() {
  const location = useLocation();
  const { getDayData } = useCalendarCache('Navigation');
  const { refreshNotifications } = useNotifications();
  
  useEffect(() => {
    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    const query = new URLSearchParams(location.search);
    
    console.log(`🧭 Navigation to: ${location.pathname}${location.search}`);
    
    // Route-specific refresh logic
    if (location.pathname === '/notifications') {
      // Refresh notifications data when navigating to notifications page
      console.log('📋 Refreshing notifications data due to navigation');
      
      // Force-refresh today's data in cache
      getDayData(today, true).then(() => {
        // Then refresh the notifications with the new data
        refreshNotifications();
      });
      
      // Check if we need to switch tabs based on URL params
      const tabParam = query.get('tab');
      if (tabParam) {
        console.log(`📋 Navigation specified tab: ${tabParam}`);
        // The tab will be handled by the component using the URL parameter
      }
    }
    
    else if (location.pathname === '/completed-tasks') {
      // Refresh completed tasks data
      console.log('📋 Refreshing completed tasks data due to navigation');
      getDayData(today, true);
    }
    
    else if (location.pathname === '/calendar/day') {
      // Handle calendar day view navigation
      const dateParam = query.get('date');
      const date = dateParam || today;
      console.log(`📋 Refreshing calendar data for ${date} due to navigation`);
      getDayData(date, true);
    }
    
  }, [location.pathname, location.search, getDayData, refreshNotifications]);
}