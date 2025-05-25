import { getApiUrl } from '../config';
import { Auth } from '../utils/AuthStateManager';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Add this at the start of your file
let apiQueue: Array<() => Promise<any>> = [];
let isProcessingQueue = false;

// Process queued API requests when authentication is confirmed
Auth.addListener((isAuthenticated) => {
  if (isAuthenticated && apiQueue.length > 0) {
    processApiQueue();
  }
});

async function processApiQueue() {
  if (isProcessingQueue) return;
  
  isProcessingQueue = true;
  console.log(`Processing ${apiQueue.length} queued API requests`);
  
  while (apiQueue.length > 0) {
    const apiCall = apiQueue.shift();
    if (apiCall) {
      try {
        await apiCall();
      } catch (err) {
        console.error('Error processing queued API call:', err);
      }
    }
  }
  
  isProcessingQueue = false;
}

/**
 * Generic API client with retry capability for making fetch requests
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

  // Skip auth check for login/register endpoints
  const isAuthEndpoint = endpoint.includes('/auth/login') || 
                         endpoint.includes('/auth/register') ||
                         endpoint.includes('/v1/user/login') ||
                         endpoint.includes('/v1/user/register');
                         
  if (!isAuthEndpoint && !Auth.isAuthenticated) {
    // Queue this request for later execution
    return new Promise((resolve, reject) => {
      console.log(`Queuing API request to ${endpoint} - not authenticated yet`);
      apiQueue.push(async () => {
        try {
          const result = await apiRequest(endpoint, options, 0);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    });
  } 
  
  // Add authentication token if available
  if (!isAuthEndpoint) {
    const token = localStorage.getItem('token');
    if (token) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      };
    }
  }
  
  try {
    console.log(`Sending API request to: ${url}`);
    const response = await fetch(url, config);

    if (!response.ok) {
      console.error(`API request failed: ${response.status}`);
      const errorText = await response.text();
      
      // If backend is starting up in electron packaged app (status 503 or 502), retry
      if ((response.status === 503 || response.status === 502) && retryCount < MAX_RETRIES) {
        console.log(`Backend may be starting, retrying in ${RETRY_DELAY}ms... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return apiRequest(endpoint, options, retryCount + 1);
      }
      
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    // For 204 No Content responses, return empty object
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Network error or other failure - retry if we haven't exceeded max retries
    if (retryCount < MAX_RETRIES) {
      console.log(`Request failed, retrying in ${RETRY_DELAY}ms... (${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return apiRequest(endpoint, options, retryCount + 1);
    }
    
    console.error(`API request failed for ${url}:`, error);
    throw error;
  }
}

// Convenience methods for common HTTP methods
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