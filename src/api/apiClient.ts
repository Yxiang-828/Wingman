import { getApiUrl } from '../config';
import { Auth } from '../utils/AuthStateManager';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

/**
 * Hybrid Architecture: Authentication request queue
 * Only queues auth requests now - data operations go directly to SQLite via electronAPI
 * This ensures proper sequencing of authentication calls during app startup
 */
const authQueue: Array<() => Promise<any>> = [];
let isProcessingQueue = false;

/**
 * Automatically processes queued authentication requests when user logs in
 * Prevents race conditions between auth state and pending API calls
 */
Auth.addListener((isAuthenticated) => {
  if (isAuthenticated && authQueue.length > 0) {
    processAuthQueue();
  }
});

/**
 * Processes all queued authentication requests sequentially
 * Ensures no auth calls are lost during the login process
 */
async function processAuthQueue() {
  if (isProcessingQueue) return;
  
  isProcessingQueue = true;
  console.log(`Processing ${authQueue.length} queued authentication requests`);
  
  while (authQueue.length > 0) {
    const apiCall = authQueue.shift();
    if (apiCall) {
      try {
        await apiCall();
      } catch (err) {
        console.error('Error processing queued auth call:', err);
      }
    }
  }
  
  isProcessingQueue = false;
}

/**
 * Simplified API client focused exclusively on authentication operations
 * Data operations are now handled by LocalDataManager via Electron IPC for better performance
 * 
 * @param endpoint - API endpoint path
 * @param options - Fetch options
 * @param retryCount - Current retry attempt
 * @returns Promise with API response data
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  const url = getApiUrl(endpoint);
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  // Hybrid architecture: Only authentication endpoints use this client
  const isAuthEndpoint = endpoint.includes('/auth/') || 
                         endpoint.includes('/v1/user/') ||
                         endpoint.includes('/users/') ||
                         endpoint.includes('/health') ||
                         endpoint.includes('/status');

  // Development guard: Warn if data endpoints accidentally use this client
  const isDataEndpoint = endpoint.includes('/v1/tasks') || 
                         endpoint.includes('/v1/calendar') ||
                         endpoint.includes('/v1/diary') ||
                         endpoint.includes('/v1/chat');
                         
  if (isDataEndpoint) {
    console.warn(`Data endpoint ${endpoint} called on apiClient - should use LocalDataManager instead`);
    throw new Error(`Data endpoint ${endpoint} should use window.electronAPI.db instead of API calls`);
  }
                         
  // Queue non-auth requests if user isn't authenticated yet
  if (!isAuthEndpoint && !Auth.isAuthenticated) {
    return new Promise((resolve, reject) => {
      console.log(`Queuing authentication request to ${endpoint} - awaiting user login`);
      authQueue.push(async () => {
        try {
          const result = await apiRequest(endpoint, options, 0);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    });
  } 
  
  // Add authentication token for protected endpoints
  if (!isAuthEndpoint || endpoint.includes('/v1/user/profile')) {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      };
    }
  }
  
  try {
    console.log(`Sending authentication request to: ${url}`);
    const response = await fetch(url, config);

    if (!response.ok) {
      console.error(`Authentication API request failed: ${response.status}`);
      const errorText = await response.text();
      
      // Retry logic for backend startup scenarios
      if ((response.status === 503 || response.status === 502) && retryCount < MAX_RETRIES) {
        console.log(`Backend may be starting, retrying in ${RETRY_DELAY}ms... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return apiRequest(endpoint, options, retryCount + 1);
      }
      
      throw new Error(`Authentication API request failed: ${response.status} - ${errorText}`);
    }

    // Handle No Content responses appropriately
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();
    console.log(`Authentication request successful: ${endpoint}`);
    return data;
  } catch (error) {
    // Network error handling with exponential backoff
    if (retryCount < MAX_RETRIES) {
      console.log(`Authentication request failed, retrying in ${RETRY_DELAY}ms... (${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return apiRequest(endpoint, options, retryCount + 1);
    }
    
    console.error(`Authentication API request failed for ${url}:`, error);
    throw error;
  }
}

/**
 * Convenience methods for authentication operations only
 * Provides a clean interface for common HTTP methods
 */
export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) => 
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  
  post: <T = any>(endpoint: string, data: any, options?: RequestInit) => 
    apiRequest<T>(endpoint, { 
      ...options, 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
  
  put: <T = any>(endpoint: string, data: any, options?: RequestInit) => 
    apiRequest<T>(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),
  
  delete: <T = any>(endpoint: string, options?: RequestInit) => 
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

/**
 * Helper function to validate hybrid architecture usage
 * Useful for debugging and development guidance
 */
export function validateHybridUsage() {
  return {
    authEndpoints: 'Use api.* methods',
    dataOperations: 'Use window.electronAPI.db.*',
    architecture: 'Auth: Supabase | Data: SQLite'
  };
}