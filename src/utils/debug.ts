// Debug utilities for tracking performance issues

// Enable/disable all debug logging
export const DEBUG_ENABLED = true;

// Component-specific debug flags
export const DEBUG_CONFIG = {
  API: true,
  API_CLIENT: true, // Add this
  RENDER: true,
  CALENDAR_CACHE: true,
  MEMORY_USAGE: true,
  STATE_CHANGES: true,
  PERFORMANCE: true,
  EVENTS: true,
  EVENT_HANDLERS: true, // Add this
  DATA_FLOW: true
};

// Performance tracking
const performanceMarks: Record<string, number> = {};

// Track time between operations
export const startTimer = (id: string): void => {
  if (!DEBUG_ENABLED) return;
  performanceMarks[id] = performance.now();
  console.log(`⏱️ [${id}] Started`);
};

export const endTimer = (id: string): number => {
  if (!DEBUG_ENABLED) return 0;
  const start = performanceMarks[id];
  if (!start) {
    console.warn(`⏱️ [${id}] Timer was never started`);
    return 0;
  }
  const duration = performance.now() - start;
  console.log(`⏱️ [${id}] Completed in ${duration.toFixed(2)}ms`);
  delete performanceMarks[id];
  return duration;
};

// Component render tracking
const renderCounts: Record<string, number> = {};

export const logRender = (componentName: string): void => {
  // Always show renders, don't check DEBUG_ENABLED
  console.log(`🔄 [${componentName}] Render #${renderCounts[componentName] || 1}`);
  renderCounts[componentName] = (renderCounts[componentName] || 0) + 1;
};

// API call tracking
export const logApiCall = (endpoint: string, method: string, data?: any): void => {
  if (!DEBUG_ENABLED || !DEBUG_CONFIG.API_CLIENT) return;
  console.log(`🌐 API ${method} ${endpoint}`, data ? { body: data } : '');
};

export const logApiResponse = (endpoint: string, status: number, data: any, duration: number): void => {
  if (!DEBUG_ENABLED || !DEBUG_CONFIG.API_CLIENT) return;
  console.log(`✅ API ${endpoint} responded ${status} in ${duration.toFixed(2)}ms`, { response: data });
};

export const logApiError = (endpoint: string, error: any, duration: number): void => {
  if (!DEBUG_ENABLED) return; // Always log errors
  console.error(`❌ API ${endpoint} failed after ${duration.toFixed(2)}ms`, error);
};

// State change tracking
export const logStateChange = (componentName: string, stateName: string, oldValue: any, newValue: any): void => {
  if (!DEBUG_ENABLED || !DEBUG_CONFIG.STATE_CHANGES) return;
  console.log(`🔄 [${componentName}] State "${stateName}" changed:`, { from: oldValue, to: newValue });
};

// Event handler tracking
export const logEvent = (componentName: string, eventName: string, ...args: any[]): void => {
  if (!DEBUG_ENABLED || !DEBUG_CONFIG.EVENT_HANDLERS) return;
  console.log(`👆 [${componentName}] ${eventName} triggered`, ...args);
};

// Memory usage tracking
export const logMemoryUsage = (componentName: string): void => {
  // Add type guard for memory property
  if (!DEBUG_ENABLED || !DEBUG_CONFIG.MEMORY_USAGE || 
      !window.performance || !('memory' in window.performance)) return;

  // Then use memory property with type assertion
  const memory = (window.performance as any).memory;
  console.log(`🧠 [${componentName}] Memory:`, {
    usedHeap: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
    totalHeap: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
    limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
  });
};

// Component mount/unmount tracking
export const logMount = (componentName: string): void => {
  if (!DEBUG_ENABLED) return;
  console.log(`🟢 [${componentName}] Mounted`);
};

export const logUnmount = (componentName: string): void => {
  if (!DEBUG_ENABLED) return;
  console.log(`🔴 [${componentName}] Unmounted`);
};

// Cache operations
export const logCacheOperation = (operation: string, key: string, data?: any): void => {
  if (!DEBUG_ENABLED || !DEBUG_CONFIG.CALENDAR_CACHE) return;
  console.log(`📦 Cache ${operation}: ${key}`, data ? { data } : '');
};

// Debug function for intensive component inspection
export const inspectComponent = (componentName: string, props: any, state: any): void => {
  if (!DEBUG_ENABLED) return;
  console.group(`🔍 [${componentName}] Inspection`);
  console.log('Props:', props);
  console.log('State:', state);
  logMemoryUsage(componentName);
  console.groupEnd();
};