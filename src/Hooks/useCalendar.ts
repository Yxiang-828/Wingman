import { useState, useCallback, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import type { Task } from '../api/Task';
import type { CalendarEvent } from '../api/Calendar';
import { fetchMultipleDaysData } from '../api/Calendar';

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

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

    // Skip optimistic updates that have already been processed
    if ('_isOptimistic' in item && item._isOptimistic) {
      // Check if we already have a non-optimistic version with same ID
      if (type === 'task') {
        const task = item as Task;
        const existingFinal = cached.tasks.find(t => 
          (t.id === task.id && !('_isOptimistic' in t))
        );
        if (existingFinal) {
          console.log(`📦 Cache SKIP: Optimistic task update already processed for ${task.id}`);
          return;
        }
      } else if (type === 'event') {
        const event = item as CalendarEvent;
        const existingFinal = cached.events.find(e => 
          (e.id === event.id && !('_isOptimistic' in e))
        );
        if (existingFinal) {
          console.log(`📦 Cache SKIP: Optimistic event update already processed for ${event.id}`);
          return;
        }
      }
    }

    if (type === 'task' && 'title' in item) {
      const task = item as Task;
      
      // Check for duplicate before adding
      const existingIndex = cached.tasks.findIndex(t => t.id === task.id);
      
      switch (operation) {
        case 'add':
          // Only add if not already present
          if (existingIndex === -1) {
            cached.tasks.push(task);
            console.log(`📦 Cache ADD: Task ${task.id} added to ${date}`);
          } else {
            console.log(`📦 Cache SKIP: Task ${task.id} already exists in ${date}`);
          }
          break;
          
        case 'update':
          // Only update if found
          if (existingIndex !== -1) {
            cached.tasks[existingIndex] = task;
            console.log(`📦 Cache UPDATE: Task ${task.id} updated in ${date}`);
          } else {
            // If task not found but this is an update operation, add it
            // This handles the case when tasks are moved between dates
            cached.tasks.push(task);
            console.log(`📦 Cache ADD-UPDATE: Task ${task.id} added during update to ${date}`);
          }
          break;
          
        case 'delete':
          // Only filter if found
          if (existingIndex !== -1) {
            cached.tasks = cached.tasks.filter(t => t.id !== task.id);
            console.log(`📦 Cache DELETE: Task ${task.id} removed from ${date}`);
          }
          break;
      }
    } else if (type === 'event' && 'event_date' in item) {
      const event = item as CalendarEvent;
      const existingIndex = cached.events.findIndex(e => e.id === event.id);
      
      switch (operation) {
        case 'add':
          // Only add if not already present
          if (existingIndex === -1) {
            cached.events.push(event);
            console.log(`📦 Cache ADD: Event ${event.id} added to ${date}`);
          } else {
            console.log(`📦 Cache SKIP: Event ${event.id} already exists in ${date}`);
          }
          break;
          
        case 'update':
          // Only update if found
          if (existingIndex !== -1) {
            cached.events[existingIndex] = event;
            console.log(`📦 Cache UPDATE: Event ${event.id} updated in ${date}`);
          } else {
            // If event not found but this is an update operation, add it
            // This handles the case when events are moved between dates
            cached.events.push(event);
            console.log(`📦 Cache ADD-UPDATE: Event ${event.id} added during update to ${date}`);
          }
          break;
          
        case 'delete':
          // Only filter if found
          if (existingIndex !== -1) {
            cached.events = cached.events.filter(e => e.id !== event.id);
            console.log(`📦 Cache DELETE: Event ${event.id} removed from ${date}`);
          }
          break;
      }
    }
    
    // Set the updated cache
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
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const mountedRef = useRef(true);

  // Subscribe to CRUD broadcasts
  useEffect(() => {
    subscribeToCacheUpdates(componentId, (operation) => {
      console.log(`📡 ${componentId}: Received cache update:`, operation);
      
      const { type, entity, data, affectedDate } = operation;
      
      if (!affectedDate) {
        console.log(`⚠️ ${componentId}: No affected date in operation, skipping`);
        return;
      }
      
      // Get existing cache or create new one
      let cache = sharedCache.get(affectedDate);
      
      // ✅ CRITICAL FIX: Always ensure cache exists with correct structure
      if (!cache) {
        console.log(`📝 ${componentId}: Creating empty cache for ${affectedDate}`);
        const emptyCache = {
          tasks: [],
          events: [],
          lastFetched: Date.now(),
          hasMore: { tasks: false, events: false },
          totalAvailable: { tasks: 0, events: 0 }
        };
        sharedCache.set(affectedDate, emptyCache);
        cache = emptyCache;
      }
      
      // ✅ CRITICAL FIX: Ensure cache has all required properties
      if (!cache.tasks) cache.tasks = [];
      if (!cache.events) cache.events = [];
      if (!cache.hasMore) cache.hasMore = { tasks: false, events: false };
      if (!cache.totalAvailable) cache.totalAvailable = { tasks: 0, events: 0 };
      
      // Process the cache update
      const itemType = entity === 'TASK' ? 'task' : 'event';
      
      try {
        switch (type) {
          case 'CREATE':
            if (itemType === 'task') {
              // Check for duplicates before adding
              if (!cache.tasks.some(t => t.id === data.id)) {
                cache.tasks.push(data);
                cache.totalAvailable.tasks = cache.tasks.length;
                console.log(`✅ ${componentId}: Added task ${data.id} to cache for ${affectedDate}`);
              } else {
                console.log(`⚠️ ${componentId}: Task ${data.id} already exists in cache for ${affectedDate}`);
              }
            } else if (itemType === 'event') {
              if (!cache.events.some(e => e.id === data.id)) {
                cache.events.push(data);
                cache.totalAvailable.events = cache.events.length;
                console.log(`✅ ${componentId}: Added event ${data.id} to cache for ${affectedDate}`);
              } else {
                console.log(`⚠️ ${componentId}: Event ${data.id} already exists in cache for ${affectedDate}`);
              }
            }
            break;
          
          case 'UPDATE':
            if (itemType === 'task') {
              const taskIndex = cache.tasks.findIndex(t => t.id === data.id);
              if (taskIndex !== -1) {
                cache.tasks[taskIndex] = { ...cache.tasks[taskIndex], ...data };
                console.log(`✅ ${componentId}: Updated task ${data.id} in cache for ${affectedDate}`);
              } else {
                // Task not found, add it (handles date changes)
                cache.tasks.push(data);
                cache.totalAvailable.tasks = cache.tasks.length;
                console.log(`✅ ${componentId}: Added task ${data.id} during update to cache for ${affectedDate}`);
              }
            } else if (itemType === 'event') {
              const eventIndex = cache.events.findIndex(e => e.id === data.id);
              if (eventIndex !== -1) {
                cache.events[eventIndex] = { ...cache.events[eventIndex], ...data };
                console.log(`✅ ${componentId}: Updated event ${data.id} in cache for ${affectedDate}`);
              } else {
                // Event not found, add it (handles date changes)
                cache.events.push(data);
                cache.totalAvailable.events = cache.events.length;
                console.log(`✅ ${componentId}: Added event ${data.id} during update to cache for ${affectedDate}`);
              }
            }
            break;
          
          case 'DELETE':
            if (itemType === 'task') {
              const originalLength = cache.tasks.length;
              cache.tasks = cache.tasks.filter(t => t.id !== data.id);
              if (cache.tasks.length !== originalLength) {
                cache.totalAvailable.tasks = cache.tasks.length;
                console.log(`✅ ${componentId}: Removed task ${data.id} from cache for ${affectedDate}`);
              }
            } else if (itemType === 'event') {
              const originalLength = cache.events.length;
              cache.events = cache.events.filter(e => e.id !== data.id);
              if (cache.events.length !== originalLength) {
                cache.totalAvailable.events = cache.events.length;
                console.log(`✅ ${componentId}: Removed event ${data.id} from cache for ${affectedDate}`);
              }
            }
            break;
          
          case 'TOGGLE':
            if (itemType === 'task') {
              const taskIndex = cache.tasks.findIndex(t => t.id === data.id);
              if (taskIndex !== -1) {
                cache.tasks[taskIndex].completed = !cache.tasks[taskIndex].completed;
                console.log(`✅ ${componentId}: Toggled task ${data.id} completion in cache for ${affectedDate}`);
              }
            }
            break;
          
          default:
            console.log(`⚠️ ${componentId}: Unknown operation type: ${type}`);
        }
        
        // Update the cache with the modified data
        sharedCache.set(affectedDate, cache);
        
        // Trigger component re-render
        setLastUpdated(Date.now());
        
        console.log(`✅ ${componentId}: Cache update completed for ${affectedDate}`);
        
      } catch (cacheError) {
        console.error(`❌ ${componentId}: Error updating cache for ${affectedDate}:`, cacheError);
      }
    });
    
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

  // Replace the getWeekData function with this implementation
  const getWeekData = useCallback(async (dates: string[]) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🗓️ Fetching data for ${dates.length} days: ${dates.join(', ')}`);
      
      // MIGRATION: Use DataContext instead of deprecated API
      const fetchPromises = dates.map(date => getDayData(date));
      const results = await Promise.all(fetchPromises);
      
      // Merge results into a single object keyed by date
      const mergedData = dates.reduce((acc, date, index) => {
        acc[date] = results[index];
        return acc;
      }, {} as Record<string, DayData>);
      
      console.log(`✅ Successfully fetched data for ${dates.length} days`);
      return mergedData;
    } catch (error) {
      console.error('Error in batch fetching week data:', error);
      setError('Failed to fetch week data');
      return {};
    } finally {
      setLoading(false);
    }
  }, [getDayData]);

  // Helper function to create empty day data
  const createEmptyDayData = (): DayData => ({
    tasks: [],
    events: [],
    lastFetched: Date.now(),
    hasMore: { tasks: false, events: false },
    totalAvailable: { tasks: 0, events: 0 }
  });

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