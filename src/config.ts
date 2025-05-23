// Environment configuration for both development and production
const isElectron = window.electronAPI !== undefined;
const isProd = import.meta.env.PROD;

// Handle connection issues with proper fallback
export const getApiBaseUrl = () => {
  if (isProd && isElectron) {
    return 'http://localhost:8080';
  }
  return '';
};

export const CONFIG = {
  // In packaged Electron app, the backend runs on localhost:8080
  // In development, we use Vite's proxy
  API_BASE_URL: getApiBaseUrl(),
  
  // Supabase credentials
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://urdfvwjxjnjfgkafkvub.supabase.co',
  SUPABASE_KEY: import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZGZ2d2p4am5qZmdrYWZrdnViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY1ODYyMSwiZXhwIjoyMDYzMjM0NjIxfQ.6jyBhqcL5jCP7Zl02DO44ADrKnNghMb2ET3s5UwanmI',
  
  APP_VERSION: '1.0.0',
  IS_ELECTRON: isElectron,
  IS_DEV: import.meta.env.DEV
};

// Enhanced getApiUrl with retry logic for when backend might be starting up
export function getApiUrl(endpoint: string): string {
  // Ensure endpoint starts with a slash if it doesn't already
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Ensure API prefix is present but not duplicated
  const path = normalizedEndpoint.startsWith('/api') ? normalizedEndpoint : `/api${normalizedEndpoint}`;
  
  // For Electron in production, use the full URL with base
  if (isProd && isElectron) {
    return `${CONFIG.API_BASE_URL}${path}`;
  }
  
  // For development or browser environments, use relative path
  return path.replace(/^\/+/, '/'); // Ensure only one leading slash
}