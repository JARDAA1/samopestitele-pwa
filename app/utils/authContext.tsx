import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signInWithPhone: (phone: string) => Promise<{ error: any }>;
  verifyPhoneOTP: (phone: string, token: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  pestitelId: number | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pestitelId, setPestitelId] = useState<number | null>(null);

  useEffect(() => {
    // Načíst aktuální session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadPestitelId(session.user.id);
      }
      setLoading(false);
    });

    // Naslouchat změnám auth stavu
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadPestitelId(session.user.id);
      } else {
        setPestitelId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadPestitelId = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('pestitele')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setPestitelId(data?.id || null);
    } catch (error) {
      console.error('Chyba při načítání pestitel ID:', error);
      setPestitelId(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signInWithPhone = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    return { error };
  };

  const verifyPhoneOTP = async (phone: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signInWithPhone,
        verifyPhoneOTP,
        signOut,
        pestitelId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
