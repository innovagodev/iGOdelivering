'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

type Role = 'ristoratore' | 'superadmin' | 'cliente' | null;

interface User {
  id: string;
  email: string;
  role: Role;
  name?: string;
  restaurantId?: string;
}

interface AuthContextType {
  user: User | null;
  role: Role;
  isLoading: boolean;
  login: (email: string, role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulazione recupero sessione da localStorage o Supabase
    const savedUser = localStorage.getItem('igodelivering_auth');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, role: Role) => {
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      role,
    };
    setUser(newUser);
    localStorage.setItem('igodelivering_auth', JSON.stringify(newUser));
    // Imposta cookie per middleware
    document.cookie = `igodelivering_role=${role}; path=/; max-age=86400; SameSite=Lax`;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('igodelivering_auth');
    document.cookie = 'igodelivering_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || null, isLoading, login, logout }}>
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
