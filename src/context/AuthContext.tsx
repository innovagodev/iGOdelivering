'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
  login: (email: string, role: Role) => void; // Kept for compatibility, but login should be done via supabase client
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchProfileAndSetUser = async (sessionUser: any) => {
      if (!sessionUser) {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        // Fetch profile to get role and name
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single();

        if (profileError || !profile) {
          console.error('Error fetching profile:', profileError);
          
          // Self-healing: if auth session is active but profile is missing/error, sign out to clear session
          await supabase.auth.signOut();
          document.cookie = 'igodelivering_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          
          if (isMounted) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }

        let restaurantData = null;
        if (profile.role === 'ristoratore') {
          // Fetch restaurant details for the owner
          const { data: restaurant, error: restError } = await supabase
            .from('restaurants')
            .select('*')
            .eq('owner_id', sessionUser.id)
            .maybeSingle();

          if (restError) {
            console.error('Error fetching restaurant for owner:', restError);
          } else if (restaurant) {
            if (restaurant.status === 'suspended') {
              console.warn('Restaurant is suspended. Logging out.');
              await supabase.auth.signOut();
              document.cookie = 'igodelivering_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
              if (isMounted) {
                setUser(null);
                setIsLoading(false);
              }
              if (typeof window !== 'undefined') {
                window.location.href = '/login?error=suspended';
              }
              return;
            }
            restaurantData = restaurant;
          }
        }

        if (isMounted) {
          const userData: User = {
            id: sessionUser.id,
            email: sessionUser.email || '',
            role: profile.role,
            name: profile.name || undefined,
            restaurantId: restaurantData?.id || undefined,
            restaurantName: restaurantData?.name || undefined,
            restaurantLogo: restaurantData?.logo_url || undefined,
          };
          setUser(userData);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error in fetchProfileAndSetUser:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Initial session retrieval
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfileAndSetUser(session.user);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
      } else if (session) {
        fetchProfileAndSetUser(session.user);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = (email: string, role: Role) => {
    // Left for compatibility, but the application should perform authentication
    // directly via Supabase Auth in the page component.
    console.warn('login() context helper is deprecated. Use supabase.auth.signInWithPassword() directly.');
  };

  const logout = async () => {
    setIsLoading(true);
    const isAdmin = user?.role === 'admin';
    await supabase.auth.signOut();

    // Clear the role cookie
    document.cookie = 'igodelivering_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

    if (typeof window !== 'undefined') {
      window.location.href = isAdmin ? '/admin' : '/login';
    }
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
