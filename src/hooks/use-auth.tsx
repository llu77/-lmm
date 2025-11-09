import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';

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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signoutRedirect: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const response = await apiClient.getSession();

      if (response.authenticated && response.user) {
        setUser(response.user);
        setAuthenticated(true);
      } else {
        setUser(null);
        setAuthenticated(false);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setUser(null);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }

  async function login(username: string, password: string) {
    const response = await apiClient.login(username, password);

    if (response.success && response.user) {
      setUser(response.user);
      setAuthenticated(true);
    } else {
      throw new Error(response.error || 'فشل تسجيل الدخول');
    }
  }

  async function logout() {
    try {
      await apiClient.logout();
      setUser(null);
      setAuthenticated(false);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      setUser(null);
      setAuthenticated(false);
      window.location.href = '/';
    }
  }

  async function signoutRedirect() {
    await logout();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authenticated,
        login,
        logout,
        signoutRedirect,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Auth component wrappers (Convex-compatible API)
export function Authenticated({ children }: { children: ReactNode }) {
  const { authenticated, loading } = useAuth();

  if (loading) return null;
  if (!authenticated) return null;

  return <>{children}</>;
}

export function Unauthenticated({ children }: { children: ReactNode }) {
  const { authenticated, loading } = useAuth();

  if (loading) return null;
  if (authenticated) return null;

  return <>{children}</>;
}

export function AuthLoading({ children }: { children: ReactNode }) {
  const { loading } = useAuth();

  if (!loading) return null;

  return <>{children}</>;
}
