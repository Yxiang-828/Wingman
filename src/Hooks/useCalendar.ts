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
  const mountedRef = useRef(true);

  // Subscribe to CRUD broadcasts
  useEffect(() => {
    subscribeToCacheUpdates(componentId, (operation) => {
      const { type, entity, data, affectedDate } = operation;
      
      if (!affectedDate) return;
      
      const itemType = entity === 'TASK' ? 'task' : 'event';
      const cache = sharedCache.get(affectedDate);
      
      if (!cache) return;
      
      // Update cache with deduplication
      switch (type) {
        case 'CREATE':
          if (itemType === 'task') {
            // Only add if not already in cache
            if (!cache.data.tasks.some(t => t.id === data.id)) {
              cache.data.tasks.push(data);
            }
          } else if (itemType === 'event') {
            if (!cache.data.events.some(e => e.id === data.id)) {
              cache.data.events.push(data);
            }
          }
          break;
        
        // Handle other cases...
      }
      
      // Update component state to trigger re-render
      setLastUpdated(Date.now());
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
  const getWeekData = useCallback(async (dates: string[], forceRefresh = false): Promise<Record<string, DayData>> => {
    const results: Record<string, DayData> = {};
    const datesToFetch: string[] = [];
    
    // First check which dates we already have in cache
    dates.forEach(date => {
      const cachedData = sharedCache.get(date);
      if (!forceRefresh && cachedData && Date.now() - cachedData.lastFetched < CACHE_TTL) {
        // Use cached data if it's fresh
        results[date] = cachedData;
      } else {
        // Mark this date for fetching
        datesToFetch.push(date);
      }
    });
    
    // If we have dates to fetch, make ONE batch API call
    if (datesToFetch.length > 0) {
      try {
        console.log(`Batch fetching ${datesToFetch.length} days of data`);
        const batchData = await fetchMultipleDaysData(datesToFetch);
        
        // Process and cache the batch results
        Object.entries(batchData).forEach(([date, data]) => {
          const processedData = {
            tasks: data.tasks || [],
            events: data.events || [],
            lastFetched: Date.now(),
            hasMore: data.hasMore || { tasks: false, events: false },
            totalAvailable: data.totalAvailable || { tasks: 0, events: 0 }
          };
          
          // Update cache
          sharedCache.set(date, processedData);
          
          // Add to results
          results[date] = processedData;
        });
      } catch (error) {
        console.error('Error in batch fetching week data:', error);
        
        // Fall back to individual fetches if batch fails
        const individualPromises = datesToFetch.map(async (date) => {
          try {
            const data = await getDayData(date, true);
            return { date, data };
          } catch (e) {
            console.error(`Error fetching individual day ${date}:`, e);
            return { date, data: createEmptyDayData() };
          }
        });
        
        const individualResults = await Promise.all(individualPromises);
        individualResults.forEach(({ date, data }) => {
          results[date] = data;
        });
      }
    }
    
    return results;
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