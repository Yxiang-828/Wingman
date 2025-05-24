/**
 * API configuration
 *
 * This file contains configuration for API endpoints that adapts
 * based on whether we're running in Electron or browser mode
 */

// Extend the Window interface to include 'electron'
declare global {
  interface Window {
    electron?: {
      isElectron?: boolean;
    };
  }
}

// Determine if we're in Electron context
export const isElectron = window.electron?.isElectron || false;

// For debugging - log the environment
console.log("Environment detection:", {
  isElectron,
  protocol: window.location.protocol,
  electronObj: !!window.electron,
});

// Add explicit detection for file protocol
// export const API_BASE_URL = (() => {
//   console.log('Protocol:', window.location.protocol);

//   // In Electron or file protocol, use localhost
//   if (isElectron || window.location.protocol === 'file:') {
//     return 'http://localhost:8000/api/v1';
//   }

//   // In web deployment, use relative path
//   return '/api/v1';
// })();

export const API_BASE_URL = (() => {
  // Use environment variable if set (for Vercel deployment)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // In Electron or file protocol, use localhost
  if (isElectron || window.location.protocol === "file:") {
    return "http://localhost:8000/api/v1";
  }
  // In web deployment (dev), use relative path (Vite proxy)
  return "/api/v1";
})();

// Log the configured API base URL for debugging
console.log("API_BASE_URL configured as:", API_BASE_URL);

// Export other API-related configurations
export const API_TIMEOUT = 15000; // 15 seconds
