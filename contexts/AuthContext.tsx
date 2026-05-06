import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types/database';
import { scheduleMatchReminders } from '@/utils/notifications';

interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  phone_verified: boolean;
  avatar_url: string | null;
  business_name: string | null;
  business_verified: boolean;
  address: string | null;
  state: string | null;
  team_name: string | null;
  player_type: string | null;
  dob: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string, role?: UserRole, businessName?: string, address?: string, state?: string, teamName?: string, playerType?: string, captchaToken?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  changePassword: (newPassword: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      // Use a timeout for the profile fetch itself
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // Race against a 4-second timeout for the database call
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 4000)
      );

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

      if (error) throw error;
      
      if (data) {
        setProfile(prev => {
          if (prev && prev.id === data.id && prev.role === data.role && prev.full_name === data.full_name) {
            return prev;
          }
          return data;
        });
      }
      
      void scheduleMatchReminders(userId);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let profileTimeout: NodeJS.Timeout;

    // Use onAuthStateChange for all auth state management, including initial session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // console.log('Auth event:', event, !!session);
      
      const newUser = session?.user ?? null;
      
      // Update session and user states
      setSession(session);
      setUser(newUser);

      if (newUser) {
        // Clear any existing timeout
        if (profileTimeout) clearTimeout(profileTimeout);

        // Set a safety timeout: don't block the app for more than 5 seconds on profile loading
        profileTimeout = setTimeout(() => {
          setLoading(false);
        }, 5000);

        // Load profile if needed
        if (!profile || profile.id !== newUser.id) {
          await loadProfile(newUser.id);
        } else {
          setLoading(false);
        }
        
        // Schedule 6 AM reminders for today's matches
        void scheduleMatchReminders(newUser.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Handle window focus on Web to ensure session is fresh after idleness
    const handleFocus = async () => {
      if (Platform.OS === 'web') {
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
          }
        } catch (err) {
          console.warn('Error refreshing session on focus:', err);
        }
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
    }

    return () => {
      subscription.unsubscribe();
      if (profileTimeout) clearTimeout(profileTimeout);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, [profile?.id, loadProfile]);

  const signUp = useCallback(async (email: string, password: string, fullName: string, phone: string, role: UserRole = 'user', businessName?: string, address?: string, state?: string, teamName?: string, playerType?: string, captchaToken?: string) => {
    try {
      // Ensure we are signed out before trying to sign up to avoid session collision/refresh errors
      await supabase.auth.signOut();

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: role,
            business_name: businessName,
            address: address,
            state: state,
            team_name: teamName,
            player_type: playerType,
          },
          captchaToken,
        },
      });

      if (error) return { error };

      return { error: null };
    } catch (error) {
      return { error };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string, captchaToken?: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken,
      },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error && profile) {
      setProfile({ ...profile, ...updates });
    }

    return { error };
  }, [user?.id, profile]);

  const value = useMemo(() => ({
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resetPassword,
    changePassword,
    loadProfile,
  }), [user, profile, session, loading, signUp, signIn, signOut, updateProfile, resetPassword, changePassword, loadProfile]);

  return (
    <AuthContext.Provider value={value}>
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
