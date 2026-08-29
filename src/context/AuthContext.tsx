import React, { createContext, useContext, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { NextGenAPI, setAuthToken } from '../api/NextGenAPI';
import { jwtDecode } from 'jwt-decode';

export interface User {
  id: string;
  email: string;
  role: string;
  organisation_id: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(localStorage.getItem('lumina_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      if (token) {
        try {
          const decoded = jwtDecode<any>(token);
          // Check if token expired
          if (decoded.exp * 1000 < Date.now()) {
            logout();
          } else {
            setUser({
              // The JWT carries the uuid as `user_id` (and `sub`), NOT `id`.
              // Fallback chain: user_id (current shape) → sub → id (future-proof).
              id: decoded.user_id || decoded.sub || decoded.id,
              email: decoded.email ?? '',
              // ⛔ `app_role` FIRST. `decoded.role` is NOT the application role.
              //
              // The backend hardcodes the JWT's `role` claim to the literal
              // "authenticated" (routes/auth.ts:256) because PostgREST does
              // SET ROLE from it, and moved the authorisation-carrying value to
              // `app_role` (auth.ts:260). This line read `decoded.role` alone,
              // so every CRM user resolved to role "authenticated" — meaning
              // `user?.role === 'super_admin'` was false for EVERYONE, however
              // they were provisioned. That hid Delete client
              // (ClientDetailPage.tsx:79) and the Sponsor Compliance / Team
              // Attendance tabs (SetupPage.tsx:46). No database change could
              // have fixed it: the value never carried a role.
              //
              // The `??` keeps tokens minted BEFORE that change working — those
              // carry the real role in `role` and have no `app_role` — which is
              // exactly the fallback the server itself uses at
              // middleware/auth.ts:171.
              role: decoded.app_role ?? decoded.role,
              organisation_id: decoded.organisation_id,
              // Additive: present only in tokens minted after the display_name claim
              // change; older tokens simply leave this undefined (falls back to role).
              name: decoded.display_name ?? undefined
            });
            setAuthToken(token);
          }
        } catch (err) {
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();

    // Listen to our custom interceptor event
    const handleUnauthorized = () => logout();
    window.addEventListener('auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth_unauthorized', handleUnauthorized);
  }, [token]);

  const login = (newToken: string) => {
    setAuthToken(newToken);
    setTokenState(newToken);
  };

  const logout = () => {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-8">Loading session...</div>;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
