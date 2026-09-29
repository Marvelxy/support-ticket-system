import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';

interface AuthContextValue {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialized from localStorage so refresh keeps you logged in;
  // setToken() below makes login/logout re-render the app immediately.
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  async function saveToken(data: { token: string }) {
    localStorage.setItem('token', data.token);
    setToken(data.token);
  }

  async function login(email: string, password: string) {
    await saveToken(
      await api<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    );
  }

  async function register(email: string, password: string, name: string) {
    await saveToken(
      await api<{ token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }),
    );
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
