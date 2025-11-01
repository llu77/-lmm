// API Client for Cloudflare backend
const API_BASE = '/api';

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  user?: any;
  authenticated?: boolean;
}

class ApiClient {
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include', // Important for cookies
      });

      const data = await response.json();

      if (!response.ok && data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('حدث خطأ في الاتصال بالخادم');
    }
  }

  // Auth endpoints
  async login(username: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getSession() {
    return this.request('/auth/session', {
      method: 'GET',
    });
  }

  // Generic GET/POST/PUT/DELETE methods
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T = any>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
