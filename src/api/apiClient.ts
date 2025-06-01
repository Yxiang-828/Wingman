import { getApiUrl } from '../config';
import { Auth } from '../utils/AuthStateManager';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// ✅ HYBRID ARCHITECTURE: Only queue AUTH requests now
// Data operations go directly to SQLite via electronAPI.db
const authQueue: Array<() => Promise<any>> = [];
let isProcessingQueue = false;

// Process queued AUTH requests when authentication is confirmed
Auth.addListener((isAuthenticated) => {
  if (isAuthenticated && authQueue.length > 0) {
    processAuthQueue();
  }
});

async function processAuthQueue() {
  if (isProcessingQueue) return;
  
  isProcessingQueue = true;
  console.log(`Processing ${authQueue.length} queued AUTH requests`);
  
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
 * ✅ SIMPLIFIED API CLIENT - AUTH ONLY
 * Data operations now handled by LocalDataManager via Electron IPC
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

  // ✅ HYBRID: Only auth endpoints use this client now
  const isAuthEndpoint = endpoint.includes('/auth/') || 
                         endpoint.includes('/v1/user/') ||
                         endpoint.includes('/users/') ||
                         endpoint.includes('/health') ||
                         endpoint.includes('/status');

  // ✅ WARNING: Data endpoints should not use this client anymore
  const isDataEndpoint = endpoint.includes('/v1/tasks') || 
                         endpoint.includes('/v1/calendar') ||
                         endpoint.includes('/v1/diary') ||
                         endpoint.includes('/v1/chat');
                         
  if (isDataEndpoint) {
    console.warn(`🚨 Data endpoint ${endpoint} called on apiClient - should use LocalDataManager instead!`);
    throw new Error(`Data endpoint ${endpoint} should use window.electronAPI.db instead of API calls`);
  }
                         
  if (!isAuthEndpoint && !Auth.isAuthenticated) {
    // Queue auth requests for later execution
    return new Promise((resolve, reject) => {
      console.log(`Queuing AUTH request to ${endpoint} - not authenticated yet`);
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
    console.log(`🔐 Sending AUTH request to: ${url}`);
    const response = await fetch(url, config);

    if (!response.ok) {
      console.error(`Auth API request failed: ${response.status}`);
      const errorText = await response.text();
      
      // If backend is starting up (status 503 or 502), retry
      if ((response.status === 503 || response.status === 502) && retryCount < MAX_RETRIES) {
        console.log(`Backend may be starting, retrying in ${RETRY_DELAY}ms... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return apiRequest(endpoint, options, retryCount + 1);
      }
      
      throw new Error(`Auth API request failed: ${response.status} - ${errorText}`);
    }

    // For 204 No Content responses, return empty object
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();
    console.log(`✅ Auth request successful: ${endpoint}`);
    return data;
  } catch (error) {
    // Network error or other failure - retry if we haven't exceeded max retries
    if (retryCount < MAX_RETRIES) {
      console.log(`Auth request failed, retrying in ${RETRY_DELAY}ms... (${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return apiRequest(endpoint, options, retryCount + 1);
    }
    
    console.error(`Auth API request failed for ${url}:`, error);
    throw error;
  }
}

// ✅ SIMPLIFIED: Convenience methods for AUTH operations only
export const api = {
  // AUTH & USER OPERATIONS ONLY
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

// ✅ HELPER: Check if hybrid architecture is working correctly
export function validateHybridUsage() {
  return {
    authEndpoints: 'Use api.* methods',
    dataOperations: 'Use window.electronAPI.db.*',
    architecture: 'Auth: Supabase | Data: SQLite'
  };
}