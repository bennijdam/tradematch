'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// ========================================
// TYPES
// ========================================

export type UserRole = 'customer' | 'vendor' | 'admin' | 'super_admin' | 'finance_admin' | 'trust_safety_admin' | 'support_admin' | 'read_only_admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
  vendorId?: string;
  customerId?: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ========================================
// AUTH CONTEXT
// ========================================

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  hasRole: (roles: UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ========================================
// AUTH HOOK
// ========================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// ========================================
// AUTH PROVIDER
// ========================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refreshToken');
        const userStr = localStorage.getItem('user');

        if (token && userStr) {
          const user = JSON.parse(userStr);
          setState({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to restore session',
        }));
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();

      // Store tokens
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      setState({
        user: data.user,
        token: data.token,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }));
      throw error;
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Call logout endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
        },
      });
    } finally {
      // Clear storage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      setState({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, [state.token]);

  // Refresh token function
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: state.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      localStorage.setItem('token', data.token);

      setState(prev => ({
        ...prev,
        token: data.token,
      }));
    } catch (error) {
      // If refresh fails, logout
      await logout();
    }
  }, [state.refreshToken, logout]);

  // Update user data
  const updateUser = useCallback((updates: Partial<User>) => {
    setState(prev => {
      if (!prev.user) return prev;
      const updatedUser = { ...prev.user, ...updates };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { ...prev, user: updatedUser };
    });
  }, []);

  // Check if user has any of the specified roles
  const hasRole = useCallback((roles: UserRole[]): boolean => {
    if (!state.user) return false;
    return roles.includes(state.user.role);
  }, [state.user]);

  // Check if user has a specific permission
  const hasPermission = useCallback((permission: string): boolean => {
    if (!state.user) return false;
    
    // Permission mapping based on role
    const rolePermissions: Record<UserRole, string[]> = {
      customer: ['read:own', 'write:own', 'read:quotes', 'write:messages'],
      vendor: ['read:own', 'write:own', 'read:leads', 'write:quotes', 'write:messages'],
      admin: ['read:all', 'write:all', 'read:users', 'write:users', 'read:vendors', 'write:vendors'],
      super_admin: ['*'],
      finance_admin: ['read:all', 'read:finance', 'write:finance'],
      trust_safety_admin: ['read:all', 'read:disputes', 'write:disputes'],
      support_admin: ['read:all', 'write:support', 'read:messages'],
      read_only_admin: ['read:all'],
    };

    const userPermissions = rolePermissions[state.user.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  }, [state.user]);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refresh,
    updateUser,
    hasRole,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ========================================
// PROTECTED ROUTE HOC
// ========================================

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles?: UserRole[]
): React.ComponentType<P> {
  return function ProtectedComponent(props: P) {
    const { isAuthenticated, isLoading, hasRole } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin h-8 w-8 border-2 border-neon border-t-transparent rounded-full" />
        </div>
      );
    }

    if (!isAuthenticated) {
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return null;
    }

    if (requiredRoles && !hasRole(requiredRoles)) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-danger mb-2">Access Denied</h1>
            <p className="text-t3">You don't have permission to view this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
