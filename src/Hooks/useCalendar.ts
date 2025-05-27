import { useState, useCallback, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import type { Task } from '../api/Task';
import type { CalendarEvent } from '../api/Calendar';

interface DayData {
  tasks: Task[];
  events: CalendarEvent[];
  lastFetched: number;
  hasMore: { tasks: boolean; events: boolean };
  totalAvailable: { tasks: number; events: number };
}

interface CacheEntry {
  data: DayData;
  lastAccessed: number;
}

interface CacheStats {
  size: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}

// Smart cache with LRU eviction and size limits
class SmartCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize = 30; // 30 days max
  private readonly maxItemsPerDay = 7; // 7 items per category

  set(key: string, data: DayData): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    // Limit items per day
    const limitedData: DayData = {
      tasks: data.tasks.slice(0, this.maxItemsPerDay),
      events: data.events.slice(0, this.maxItemsPerDay),
      lastFetched: data.lastFetched,
      hasMore: data.hasMore,
      totalAvailable: data.totalAvailable
    };

    this.cache.set(key, {
      data: limitedData,
      lastAccessed: Date.now()
    });

    console.log(`📦 Cache SET: ${key} (${limitedData.tasks.length} tasks, ${limitedData.events.length} events)`);
  }

  get(key: string): DayData | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Update access time
    entry.lastAccessed = Date.now();
    this.cache.set(key, entry);

    console.log(`📦 Cache HIT: ${key}`);
    return entry.data;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    console.log(`📦 Cache DELETE: ${key}`);
    return this.cache.delete(key);
  }

  clear(): void {
    console.log(`📦 Cache CLEAR: Removed ${this.cache.size} entries`);
    this.cache.clear();
  }

  getStats(): CacheStats {
    if (this.cache.size === 0) {
      return { size: 0, oldestEntry: null, newestEntry: null };
    }

    let oldestTime = Date.now();
    let newestTime = 0;
    let oldestKey = '';
    let newestKey = '';

    this.cache.forEach((entry, key) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
      if (entry.lastAccessed > newestTime) {
        newestTime = entry.lastAccessed;
        newestKey = key;
      }
    });

    return {
      size: this.cache.size,
      oldestEntry: oldestKey,
      newestEntry: newestKey
    };
  }

  private evictOldest(): void {
    let oldestTime = Date.now();
    let oldestKey = '';

    this.cache.forEach((entry, key) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      console.log(`📦 Cache EVICT: ${oldestKey} (LRU)`);
      this.cache.delete(oldestKey);
    }
  }

  // Update specific items in cache
  updateItem(date: string, type: 'task' | 'event', item: Task | CalendarEvent, operation: 'add' | 'update' | 'delete'): void {
    const cached = this.get(date);
    if (!cached) return;

    if (type === 'task' && 'title' in item) {
      const task = item as Task;
      switch (operation) {
        case 'add':
          if (cached.tasks.length < this.maxItemsPerDay) {
            cached.tasks.push(task);
          }
          break;
        case 'update':
          const taskIndex = cached.tasks.findIndex(t => t.id === task.id);
          if (taskIndex !== -1) {
            cached.tasks[taskIndex] = task;
          }
          break;
        case 'delete':
          cached.tasks = cached.tasks.filter(t => t.id !== task.id);
          break;
      }
    } else if (type === 'event' && 'event_date' in item) {
      const event = item as CalendarEvent;
      switch (operation) {
        case 'add':
          if (cached.events.length < this.maxItemsPerDay) {
            cached.events.push(event);
          }
          break;
        case 'update':
          const eventIndex = cached.events.findIndex(e => e.id === event.id);
          if (eventIndex !== -1) {
            cached.events[eventIndex] = event;
          }
          break;
        case 'delete':
          cached.events = cached.events.filter(e => e.id !== event.id);
          break;
      }
    }

    // Update cache
    this.set(date, cached);
  }
}

// Shared cache instance
const sharedCache = new SmartCache();

// Hook for components to use the shared cache
export const useCalendarCache = (componentId: string) => {
  const { fetchDayData, subscribeToCacheUpdates, unsubscribeFromCacheUpdates } = useData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Subscribe to CRUD broadcasts
  useEffect(() => {
    const handleCacheUpdate = (operation: any) => {
      const { type, entity, data, affectedDate } = operation;
      
      if (!affectedDate) return;

      const itemType = entity === 'TASK' ? 'task' : 'event';
      
      switch (type) {
        case 'CREATE':
          sharedCache.updateItem(affectedDate, itemType, data, 'add');
          break;
        case 'UPDATE':
          sharedCache.updateItem(affectedDate, itemType, data, 'update');
          break;
        case 'DELETE':
          sharedCache.updateItem(affectedDate, itemType, data, 'delete');
          break;
        case 'TOGGLE':
          sharedCache.updateItem(affectedDate, itemType, data, 'update');
          break;
      }

      console.log(`🔄 ${componentId}: Cache updated for ${affectedDate}`);
    };

    subscribeToCacheUpdates(componentId, handleCacheUpdate);

    return () => {
      unsubscribeFromCacheUpdates(componentId);
    };
  }, [componentId, subscribeToCacheUpdates, unsubscribeFromCacheUpdates]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Get data for a specific date (cache-first)
  const getDayData = useCallback(async (date: string, forceRefresh = false): Promise<DayData> => {
    try {
      // ✅ SKIP CACHE if forceRefresh is true
      if (!forceRefresh && sharedCache.has(date)) {
        const cached = sharedCache.get(date);
        if (cached && (cached.tasks.length > 0 || cached.events.length > 0 || cached.lastFetched)) {
          console.log(`📦 ${componentId}: Using cached data for ${date}`);
          return cached;
        }
      }

      // ✅ ALWAYS FETCH when forceRefresh = true OR cache miss
      console.log(`🌐 ${componentId}: ${forceRefresh ? 'FORCE' : 'Cache miss'} fetching data for ${date}...`);
      
      setLoading(true);
      setError(null);

      // Use DataContext.fetchDayData which handles API calls properly
      const result = await fetchDayData(date);
      
      const dayData: DayData = {
        tasks: result.tasks || [],
        events: result.events || [],
        lastFetched: Date.now(),
        hasMore: result.hasMore || { tasks: false, events: false },
        totalAvailable: {
          tasks: (result.tasks || []).length,
          events: (result.events || []).length
        }
      };

      // ✅ ALWAYS UPDATE CACHE with fresh data
      sharedCache.set(date, dayData);
      
      console.log(`✅ ${componentId}: Fetched and cached ${dayData.tasks.length} tasks, ${dayData.events.length} events for ${date}`);
      
      if (mountedRef.current) {
        setLoading(false);
      }

      return dayData;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      console.error(`❌ ${componentId}: Error fetching data for ${date}:`, err);
      
      if (mountedRef.current) {
        setError(errorMessage);
        setLoading(false);
      }

      // Return empty data on error but still cache it to prevent repeated failed requests
      const emptyData: DayData = { 
        tasks: [], 
        events: [], 
        lastFetched: Date.now(),
        hasMore: { tasks: false, events: false },
        totalAvailable: { tasks: 0, events: 0 }
      };
      sharedCache.set(date, emptyData);
      
      return emptyData;
    }
  }, [componentId, fetchDayData]);

  // ✅ FIXED: Update getWeekData to support force refresh
  const getWeekData = useCallback(async (dates: string[], forceRefresh = false): Promise<Record<string, DayData>> => {
    const results: Record<string, DayData> = {};
    
    // Process in parallel with force refresh option
    const promises = dates.map(async (date) => {
      const data = await getDayData(date, forceRefresh);
      return { date, data };
    });

    const resolved = await Promise.all(promises);
    
    resolved.forEach(({ date, data }) => {
      results[date] = data;
    });

    return results;
  }, [getDayData]);

  // Cache management functions
  const clearCache = useCallback(() => {
    sharedCache.clear();
    console.log(`🗑️ ${componentId}: Cache cleared`);
  }, [componentId]);

  const getCacheStats = useCallback(() => {
    return sharedCache.getStats();
  }, []);

  const removeCacheEntry = useCallback((date: string) => {
    sharedCache.delete(date);
    console.log(`🗑️ ${componentId}: Removed cache entry for ${date}`);
  }, [componentId]);

  return {
    // Data fetching
    getDayData,
    getWeekData,
    
    // Cache management
    clearCache,
    getCacheStats,
    removeCacheEntry,
    
    // State
    loading,
    error
  };
};