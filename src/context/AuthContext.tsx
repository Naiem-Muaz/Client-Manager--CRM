import React, { createContext, useContext, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { NextGenAPI, setAuthToken } from '../api/NextGenAPI';
import { jwtDecode } from 'jwt-decode';

export interface User {
  id: string;
  email: string;
  role: string;
  organisation_id: string;
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
              id: decoded.id,
              email: decoded.email,
              role: decoded.role,
              organisation_id: decoded.organisation_id
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
