import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, referralCode?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('rage_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    if (!localStorage.getItem('rage_token')) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const data = await api.getMe();
      setUser(data);
    } catch {
      localStorage.removeItem('rage_token');
      localStorage.removeItem('rage_refresh');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem('rage_token', res.access_token);
    localStorage.setItem('rage_refresh', res.refresh_token);
    setToken(res.access_token);
    setUser(res.user);
  };

  const register = async (email: string, password: string, fullName: string, referralCode?: string) => {
    const res = await api.register({
      email,
      password,
      full_name: fullName,
      referral_code: referralCode || undefined
    });
    localStorage.setItem('rage_token', res.access_token);
    localStorage.setItem('rage_refresh', res.refresh_token);
    setToken(res.access_token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('rage_token');
    localStorage.removeItem('rage_refresh');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
