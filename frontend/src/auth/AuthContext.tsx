import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Role, Theme, User } from '../types';
import * as apiClient from '../api/client';
import { applyTheme } from '../utils/theme';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  hasRole: (min: Role) => boolean;
  setTheme: (theme: Theme | null) => Promise<void>;
}

const roleRank: Record<Role, number> = { VIEWER: 1, EDITOR: 2, ADMIN: 3 };

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Applicera användarens tema när användaren ändras (logga in/ut/refresh).
  useEffect(() => {
    applyTheme(user?.theme ?? null);
  }, [user]);

  const refresh = async () => {
    try {
      const me = await apiClient.getMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string): Promise<User> => {
    const { user: u } = await apiClient.login(username, password);
    setUser(u);
    return u;
  };

  const logout = async () => {
    await apiClient.logout();
    setUser(null);
  };

  const hasRole = (min: Role) => (user ? roleRank[user.role] >= roleRank[min] : false);

  const setTheme = async (theme: Theme | null) => {
    const res = await apiClient.updateTheme(theme);
    setUser((prev) => (prev ? { ...prev, theme: res.theme } : prev));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh, hasRole, setTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
