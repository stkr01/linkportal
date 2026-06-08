import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Role, User } from '../types';
import * as apiClient from '../api/client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  hasRole: (min: Role) => boolean;
}

const roleRank: Record<Role, number> = { VIEWER: 1, EDITOR: 2, ADMIN: 3 };

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth måste användas inom AuthProvider');
  return ctx;
}
