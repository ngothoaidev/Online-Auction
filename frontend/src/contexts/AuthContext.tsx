import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { SessionUser } from '../types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<SessionUser>;
  logout: () => void;
  oauthLogin: (userData: SessionUser, token: string) => SessionUser;
};

// Outside a provider (isolated component tests) there is simply nobody signed in.
const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: false,
  login: async () => { throw new Error('AuthProvider is missing'); },
  logout: () => {},
  oauthLogin: (userData) => userData,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log("Logged in user:", userData);
            setUser(userData);
          } else {
            localStorage.removeItem('authToken');
          }
        }
      } catch (error) {
        console.log("User not logged in", error);
        localStorage.removeItem('authToken');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    const onSessionEnded = () => setUser(null);
    window.addEventListener('auth:session-ended', onSessionEnded);
    return () => window.removeEventListener('auth:session-ended', onSessionEnded);
  }, []);

  const login = async (identifier: string, password: string): Promise<SessionUser> => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('userRole', data.user.role);
    console.log(data.user);
    setUser(data.user);
    return data.user;
  };

  const oauthLogin = (userData: SessionUser, token: string) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userRole', userData.role);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, oauthLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for easy access
export const useAuth = () => useContext(AuthContext);