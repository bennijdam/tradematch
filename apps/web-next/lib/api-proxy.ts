/**
 * API Proxy Utilities
 * Proxies requests from Next.js to the backend API server
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ProxyOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

/**
 * Proxy a request to the backend API
 */
export async function proxyToBackend(
  endpoint: string,
  options: ProxyOptions = {}
) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  if (options.body && options.method !== 'GET') {
    fetchOptions.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    console.error(`Proxy error for ${endpoint}:`, error);
    return {
      success: false,
      status: 500,
      error: 'Failed to connect to backend API',
    };
  }
}

/**
 * Build query string from params object
 */
export function buildQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}
