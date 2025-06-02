
import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

interface UsePageRefreshOptions {
  refreshOnMount?: boolean;
  refreshOnNavigation?: boolean;
  refreshOnEvents?: string[];
  minLoadingTime?: number; // Minimum loading time for smooth UX
}

export const usePageRefresh = (
  fetchFunction: () => Promise<void>,
  options: UsePageRefreshOptions = {}
) => {
  const {
    refreshOnMount = true,
    refreshOnNavigation = true,
    refreshOnEvents = ['dashboard-refresh', 'notifications-refresh'],
    minLoadingTime = 300
  } = options;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  const refresh = useCallback(async () => {
    const startTime = Date.now();
    setLoading(true);
    setError(null);

    try {
      await fetchFunction();
      
      // Ensure minimum loading time for smooth UX
      const elapsed = Date.now() - startTime;
      if (elapsed < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, minLoadingTime]);

  // Refresh on mount
  useEffect(() => {
    if (refreshOnMount) {
      refresh();
    }
  }, [refresh, refreshOnMount]);

  // Refresh on navigation (every page visit)
  useEffect(() => {
    if (refreshOnNavigation) {
      refresh();
    }
  }, [location.pathname, location.search, refresh, refreshOnNavigation]);

  // Refresh on custom events
  useEffect(() => {
    const handleRefresh = () => refresh();

    refreshOnEvents.forEach(event => {
      window.addEventListener(event, handleRefresh);
    });

    return () => {
      refreshOnEvents.forEach(event => {
        window.removeEventListener(event, handleRefresh);
      });
    };
  }, [refresh, refreshOnEvents]);

  return { loading, error, refresh };
};