import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';
import type { User } from '@/types';

// Re-export User type for backward compatibility
export type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  isAuthenticated: boolean; // Alias for authenticated
  isLoading: boolean; // Alias for loading
  error: Error | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signoutRedirect: () => Promise<void>;
  signinRedirect: () => Promise<void>; // Alias for login navigation
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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

  /**
   * Authenticates a user with username and password.
   * @throws {Error} If login fails or credentials are invalid
   */
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

  async function signinRedirect() {
    // Navigate to login page or trigger OAuth flow
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authenticated,
        isAuthenticated: authenticated,
        isLoading: loading,
        error,
        login,
        logout,
        signoutRedirect,
        signinRedirect,
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
