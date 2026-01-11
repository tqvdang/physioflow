"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getCurrentUser,
  isAuthenticated as checkIsAuthenticated,
  login as authLogin,
  logout as authLogout,
  refreshAccessToken,
  setupTokenRefresh,
  getAccessToken,
} from "@/lib/auth";
import type { AuthUser, LoginOptions, LogoutOptions, UserRole } from "@/types/auth";
import { hasRole, hasAnyRole, hasAllRoles, isAtLeastRole, STAFF_ROLES, ADMIN_ROLES, CLINICAL_ROLES } from "@/types/auth";

/**
 * Auth context value interface
 */
interface AuthContextValue {
  // State
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  accessToken: string | null;

  // Actions
  login: (options?: LoginOptions) => Promise<void>;
  logout: (options?: LogoutOptions) => Promise<void>;
  refreshSession: () => Promise<boolean>;

  // Role helpers
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasAllRoles: (roles: UserRole[]) => boolean;
  isAtLeastRole: (minRole: UserRole) => boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isClinical: boolean;
}

/**
 * Auth context
 */
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Auth provider props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth provider component
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  /**
   * Initialize auth state from stored tokens
   */
  const initializeAuth = useCallback(() => {
    try {
      const token = getAccessToken();
      const currentUser = getCurrentUser();
      const authenticated = checkIsAuthenticated();

      if (authenticated && currentUser) {
        setUser(currentUser);
        setAccessToken(token);
      } else {
        setUser(null);
        setAccessToken(null);
      }
      setError(null);
    } catch (err) {
      console.error("Failed to initialize auth:", err);
      setUser(null);
      setAccessToken(null);
      setError("Failed to initialize authentication");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  /**
   * Setup automatic token refresh
   */
  useEffect(() => {
    if (!user) return;

    const cleanup = setupTokenRefresh(60000); // Check every minute
    return cleanup;
  }, [user]);

  /**
   * Listen for storage events (for multi-tab support)
   */
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "physioflow_access_token") {
        initializeAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [initializeAuth]);

  /**
   * Login action
   */
  const login = useCallback(async (options?: LoginOptions) => {
    setIsLoading(true);
    setError(null);
    try {
      await authLogin(options);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      setIsLoading(false);
      throw err;
    }
  }, []);

  /**
   * Logout action
   */
  const logout = useCallback(async (options?: LogoutOptions) => {
    setIsLoading(true);
    setError(null);
    try {
      await authLogout(options);
      setUser(null);
      setAccessToken(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Logout failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh session
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const tokens = await refreshAccessToken();
      if (tokens) {
        const currentUser = getCurrentUser();
        setUser(currentUser);
        setAccessToken(tokens.accessToken);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to refresh session:", err);
      return false;
    }
  }, []);

  /**
   * Role check helpers
   */
  const checkHasRole = useCallback(
    (role: UserRole) => hasRole(user, role),
    [user]
  );

  const checkHasAnyRole = useCallback(
    (roles: UserRole[]) => hasAnyRole(user, roles),
    [user]
  );

  const checkHasAllRoles = useCallback(
    (roles: UserRole[]) => hasAllRoles(user, roles),
    [user]
  );

  const checkIsAtLeastRole = useCallback(
    (minRole: UserRole) => isAtLeastRole(user, minRole),
    [user]
  );

  /**
   * Computed role flags
   */
  const isStaff = useMemo(() => hasAnyRole(user, STAFF_ROLES), [user]);
  const isAdmin = useMemo(() => hasAnyRole(user, ADMIN_ROLES), [user]);
  const isClinical = useMemo(() => hasAnyRole(user, CLINICAL_ROLES), [user]);

  /**
   * Context value
   */
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user && checkIsAuthenticated(),
      isLoading,
      error,
      accessToken,
      login,
      logout,
      refreshSession,
      hasRole: checkHasRole,
      hasAnyRole: checkHasAnyRole,
      hasAllRoles: checkHasAllRoles,
      isAtLeastRole: checkIsAtLeastRole,
      isStaff,
      isAdmin,
      isClinical,
    }),
    [
      user,
      isLoading,
      error,
      accessToken,
      login,
      logout,
      refreshSession,
      checkHasRole,
      checkHasAnyRole,
      checkHasAllRoles,
      checkIsAtLeastRole,
      isStaff,
      isAdmin,
      isClinical,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Hook to require authentication
 * Returns the auth context or null if not authenticated
 */
export function useRequireAuth(): AuthContextValue {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      auth.login({ redirectPath: window.location.pathname });
    }
  }, [auth]);

  return auth;
}

/**
 * Hook to require specific roles
 */
export function useRequireRole(requiredRoles: UserRole | UserRole[]): AuthContextValue & { hasAccess: boolean } {
  const auth = useAuth();
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  const hasAccess = auth.hasAnyRole(roles);

  return {
    ...auth,
    hasAccess,
  };
}

/**
 * Component to protect routes based on authentication
 */
interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiredRoles?: UserRole[];
}

export function AuthGuard({ children, fallback, requiredRoles }: AuthGuardProps) {
  const auth = useAuth();

  if (auth.isLoading) {
    return fallback ?? <div>Loading...</div>;
  }

  if (!auth.isAuthenticated) {
    return fallback ?? null;
  }

  if (requiredRoles && !auth.hasAnyRole(requiredRoles)) {
    return fallback ?? <div>Access denied</div>;
  }

  return <>{children}</>;
}

/**
 * Component to show content only for specific roles
 */
interface RoleGuardProps {
  children: ReactNode;
  roles: UserRole[];
  fallback?: ReactNode;
}

export function RoleGuard({ children, roles, fallback }: RoleGuardProps) {
  const auth = useAuth();

  if (!auth.hasAnyRole(roles)) {
    return fallback ?? null;
  }

  return <>{children}</>;
}
