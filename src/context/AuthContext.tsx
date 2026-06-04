'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

import { STORAGE_KEYS } from '@/lib/storage-keys';

type Role = 'ristoratore' | 'admin' | 'cliente' | null;

interface User {
  id: string;
  email: string;
  role: Role;
  name?: string;
  restaurantId?: string;
  restaurantName?: string;
  restaurantLogo?: string;
}

interface AuthContextType {
  user: User | null;
  role: Role;
  isLoading: boolean;
  login: (email: string, role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function enrichRistoratoreUser(user: User): User {
  const email = user.email;
  let restaurantId = user.restaurantId || '';
  let restaurantName = user.restaurantName || '';
  let restaurantLogo = user.restaurantLogo || '';
  let name = user.name || '';

  // Try to find the restaurant in stored restaurants
  try {
    const storedStr = localStorage.getItem(STORAGE_KEYS.RESTAURANTS);
    if (storedStr) {
      const restaurants = JSON.parse(storedStr);
      const matched = restaurants.find((r: any) => r.email === email);
      if (matched) {
        restaurantId = matched.id;
        restaurantName = matched.name;
        name = matched.owner || matched.name;
        restaurantLogo = matched.logoUrl || '';
      }
    }
  } catch (e) {
    console.error('Error reading restaurants from localStorage', e);
  }

  // Fallback for demo credentials
  if (!restaurantId && email === 'giuseppe@bellanapoli.it') {
    restaurantId = 'r-001';
    restaurantName = 'Pizzeria Bella Napoli';
    name = 'Giuseppe Esposito';
    restaurantLogo = '';
  }

  // Check for settings override
  if (restaurantId) {
    try {
      const settingsStr = localStorage.getItem(STORAGE_KEYS.settings(restaurantId));
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        if (settings.profile) {
          if (settings.profile.name) restaurantName = settings.profile.name;
          if (settings.profile.logoUrl) restaurantLogo = settings.profile.logoUrl;
        }
      }
    } catch (e) {
      console.error('Error reading settings from localStorage', e);
    }
  }

  return {
    ...user,
    name: name || email.split('@')[0],
    restaurantId,
    restaurantName: restaurantName || 'Il tuo ristorante',
    restaurantLogo,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as User;
        if (parsedUser.role === 'ristoratore') {
          setUser(enrichRistoratoreUser(parsedUser));
        } else {
          setUser(parsedUser);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEYS.AUTH);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, role: Role) => {
    let newUser: User = {
      // crypto.randomUUID() è crittograficamente sicuro (disponibile nei browser moderni)
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
      email,
      role,
    };

    if (role === 'ristoratore') {
      newUser = enrichRistoratoreUser(newUser);
    } else if (role === 'admin') {
      newUser.name = 'Admin';
    }

    setUser(newUser);
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(newUser));
    document.cookie = `${STORAGE_KEYS.AUTH_ROLE}=${role}; path=/; max-age=86400; SameSite=Lax`;
  };

  const logout = () => {
    const isAdmin = user?.role === 'admin';
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    document.cookie = `${STORAGE_KEYS.AUTH_ROLE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    window.location.href = isAdmin ? '/admin' : '/login';
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
