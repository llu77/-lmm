// API Client for Cloudflare backend
const API_BASE = '/api';

export interface User {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
  role: string;
  roleAr?: string;
  branchId?: string;
  branchName?: string;
  permissions?: {
    canViewAllBranches?: boolean;
    canManageUsers?: boolean;
    canManageSettings?: boolean;
    canManageBranches?: boolean;
    canAddRevenue?: boolean;
    canAddExpense?: boolean;
    canViewReports?: boolean;
    canManageEmployees?: boolean;
    canManageOrders?: boolean;
    canManageRequests?: boolean;
    canApproveRequests?: boolean;
    canGeneratePayroll?: boolean;
    canManageBonus?: boolean;
    canSubmitRequests?: boolean;
    canViewOwnRequests?: boolean;
    canViewOwnBonus?: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  user?: User;
  authenticated?: boolean;
}

class ApiClient {
  private async request<T = unknown>(
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
  async get<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = unknown>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T = unknown>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
