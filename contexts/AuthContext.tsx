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

    const startTime = Date.now();
    try {
      setLoading(true);
      
      // Wrap the thenable in an async IIFE to ensure it returns a standard native Promise
      const profilePromise = (async () => {
        return await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
      })();

      // 10s timeout is more than enough for Supabase cold starts while avoiding extreme hangs
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      );

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

      if (error) throw error;
      
      if (data) {
        console.log(`AuthContext: Loaded profile in ${Date.now() - startTime}ms`);
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
          await new Promise(resolve => setTimeout(resolve, 1500));
          return loadProfile(userObj, retryCount + 1);
        }
        throw new Error('Profile not found');
      }
      
      void scheduleMatchReminders(userId);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error(`AuthContext: Error loading profile (Attempt ${retryCount + 1}) after ${Date.now() - startTime}ms:`, errorMsg);
      
      const isRetryable = errorMsg.includes('timeout') || 
                          errorMsg.toLowerCase().includes('fetch') || 
                          errorMsg.toLowerCase().includes('network') ||
                          errorMsg.toLowerCase().includes('aborted');

      // Retry on timeout or common network errors (increased to 2 retries)
      if (retryCount < 2 && isRetryable) {
        const delay = (retryCount + 1) * 3000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return loadProfile(userObj, retryCount + 1);
      } else {
        console.warn('AuthContext: Profile fetch failed after all attempts. Profile will remain null.');
      }
    } finally {
      if (loadingProfileRef.current === userId) {
        loadingProfileRef.current = null;
      }
      setLoading(false);
    }
  }, []);

  // 1. Check initial session and listen to auth state changes synchronously (no async database calls in listener)
  useEffect(() => {
    let isMounted = true;

    const checkInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('AuthContext: Initial session check error:', error.message);
          if (error.message.includes('Refresh Token Not Found') || error.message.includes('invalid_grant')) {
            await supabase.auth.signOut();
          }
        }
        if (isMounted) {
          if (initialSession?.user) {
            setSession(initialSession);
            setUser(initialSession.user);
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('AuthContext: Error in checkInitialSession:', err);
        if (isMounted) setLoading(false);
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
          setProfile(null);
          setUser(null);
          setSession(null);
          setLoading(false);
          return;
      }
      
      const newUser = session?.user ?? null;
      
      setSession(prev => prev?.access_token === session?.access_token ? prev : session);
      setUser(prev => prev?.id === newUser?.id ? prev : newUser);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 2. Load user profile whenever the user state changes (outside of onAuthStateChange flow to avoid deadlocks)
  useEffect(() => {
    let isMounted = true;
    let profileTimeout: NodeJS.Timeout;

    if (user) {
      // Safety backup timeout to guarantee the app becomes interactive within 10s
      profileTimeout = setTimeout(() => {
        if (isMounted) {
          console.warn('AuthContext: Profile fetch backup timeout reached, enabling interaction.');
          setLoading(false);
        }
      }, 10000);

      loadProfile(user).then(() => {
        if (isMounted) {
          clearTimeout(profileTimeout);
        }
      });
    } else {
      setProfile(null);
    }

    return () => {
      isMounted = false;
      if (profileTimeout) clearTimeout(profileTimeout);
    };
  }, [user, loadProfile]);


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
