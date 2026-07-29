const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface FetchOptions extends RequestInit {
  json?: any;
}

export async function apiFetch(path: string, options: FetchOptions = {}) {
  const headers = new Headers(options.headers);

  // Get token from localStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (options.json) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.json);
  }

  options.headers = headers;

  const response = await fetch(`${API_URL}${path}`, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Ocurrió un error en el servidor');
  }

  // If response is empty (e.g. 204 or 205), return null
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  return response.json();
}
