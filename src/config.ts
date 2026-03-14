// Environment configuration for both development and production
const isElectron = window.electronAPI !== undefined;
/** Used for environment detection */
// @ts-ignore
const _isProd = import.meta.env.PROD;

// Handle connection issues with proper fallback
export const getApiBaseUrl = () => {
  // Always use direct URL in Electron (both dev and prod)
  if (window.electronAPI) {
    return "http://localhost:8080";
  }
  // Empty string for browser dev (uses Vite proxy)
  return "";
};

export const CONFIG = {
  // In packaged Electron app, the backend runs on localhost:8080
  // In development, we use Vite's proxy
  API_BASE_URL: getApiBaseUrl(),
  
  APP_VERSION: "1.0.0",
  IS_ELECTRON: isElectron,
  // @ts-ignore
  IS_DEV: import.meta.env.DEV,
};

// Enhanced getApiUrl with retry logic for when backend might be starting up    
export function getApiUrl(endpoint: string): string {
  // Ensure endpoint starts with a slash if it doesn't already
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  // Ensure API prefix is present but not duplicated
  const path = normalizedEndpoint.startsWith("/api")
    ? normalizedEndpoint
    : `/api${normalizedEndpoint}`;

  // ALWAYS use full URL for Electron (both dev and prod)
  if (window.electronAPI !== undefined) {
    return `http://localhost:8080${path}`;
  }

  // For browser environments, use relative path
  return path.replace(/^\/+/, "/");
}
