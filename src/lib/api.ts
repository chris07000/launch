// Helper function to get the API URL
export function getApiUrl(path: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '/';
  return `${baseUrl}${path}`;
}

// Helper function to make API calls
export async function fetchApi(path: string, options: RequestInit = {}) {
  const url = getApiUrl(path);
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  const response = await fetch(url, mergedOptions);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API call failed: ${response.status}`);
  }
  
  return response.json();
}

// Helper function to handle API errors
export function handleApiError(error: any): { error: string } {
  console.error('API Error:', error);
  return {
    error: error.message || 'Er is een fout opgetreden'
  };
} 