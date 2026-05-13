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
  const loadingProfileRef = React.useRef<string | null>(null);

  const loadProfile = useCallback(async (userObj: User, retryCount = 0) => {
    const userId = userObj.id;
    // Prevent duplicate concurrent loads for the same user
    if (loadingProfileRef.current === userId && retryCount === 0) return;
    loadingProfileRef.current = userId;

    try {
      setLoading(true);
      
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // Reduced timeout to 5s to avoid long hangs, relying on fallback
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

      if (error) throw error;
      
      if (data) {
        setProfile(prev => {
          if (prev && prev.id === data.id && 
              prev.role === data.role && 
              prev.full_name === data.full_name &&
              prev.avatar_url === data.avatar_url &&
              prev.business_verified === data.business_verified) {
            return prev;
          }
          return data;
        });
      } else {
        // If no profile found, we might want to wait a bit and retry (sometimes auth hook fires before profile trigger)
        if (retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return loadProfile(userObj, retryCount + 1);
        }
        throw new Error('Profile not found');
      }
      
      void scheduleMatchReminders(userId);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error(`AuthContext: Error loading profile (Attempt ${retryCount + 1}):`, errorMsg);
      
      const isRetryable = errorMsg.includes('timeout') || 
                          errorMsg.toLowerCase().includes('fetch') || 
                          errorMsg.toLowerCase().includes('network') ||
                          errorMsg.toLowerCase().includes('aborted');

      // Retry on timeout or common network errors
      if (retryCount < 2 && isRetryable) {
        const delay = (retryCount + 1) * 2000; // Exponential-ish backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return loadProfile(userObj, retryCount + 1);
      } else {
        // Fallback profile if all retries failed or not retryable
        console.warn('AuthContext: Using fallback profile from metadata due to error:', errorMsg);
        setProfile({
          id: userId,
          role: (userObj.user_metadata?.role as UserRole) || 'user',
          full_name: userObj.user_metadata?.full_name || 'User',
          phone: userObj.user_metadata?.phone || null,
          phone_verified: false,
          avatar_url: userObj.user_metadata?.avatar_url || null,
          business_name: userObj.user_metadata?.business_name || null,
          business_verified: false,
          address: userObj.user_metadata?.address || null,
          state: userObj.user_metadata?.state || null,
          team_name: userObj.user_metadata?.team_name || null,
          player_type: userObj.user_metadata?.player_type || null,
          dob: userObj.user_metadata?.dob || null,
        });
      }
    } finally {
      if (loadingProfileRef.current === userId) {
        loadingProfileRef.current = null;
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let profileTimeout: NodeJS.Timeout;
    let isMounted = true;

    // Use onAuthStateChange for all auth state management
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      // console.log('Auth event:', event, !!session);
      
      const newUser = session?.user ?? null;
      
      // Only update states if they actually changed to avoid re-render loops
      setSession(prev => prev?.access_token === session?.access_token ? prev : session);
      setUser(prev => prev?.id === newUser?.id ? prev : newUser);

      if (newUser) {
        if (profileTimeout) clearTimeout(profileTimeout);

        // Safety timeout to ensure loading always finishes (extended to match profile timeout)
        profileTimeout = setTimeout(() => {
          if (isMounted) setLoading(false);
        }, 30000);

        // Load profile if we don't have it or if it's a new user
        // We always try to refresh it on SIGNED_IN or INITIAL_SESSION
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || !profile) {
          await loadProfile(newUser);
        } else {
          // On other events like TOKEN_REFRESHED, we just make sure loading is false
          setLoading(false);
        }
        
        void scheduleMatchReminders(newUser.id);
      } else {
        // Only wipe profile if the user is truly signed out
        if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
          setProfile(null);
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (profileTimeout) clearTimeout(profileTimeout);
    };
  }, [loadProfile]);

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
