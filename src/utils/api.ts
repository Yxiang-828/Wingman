// Helper to consistently get API URLs
export function getApiUrl(endpoint: string): string {
  const baseUrl = 'http://localhost:8080';
  // Ensure endpoint starts with a slash
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${path}`;
}