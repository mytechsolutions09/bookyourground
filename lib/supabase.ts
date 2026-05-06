import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processLock } from '@supabase/auth-js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// On web, native localStorage is more reliable than AsyncStorage for Supabase
const customStorage = Platform.OS === 'web' 
  ? {
      getItem: (key: string) => typeof window !== 'undefined' ? window.localStorage.getItem(key) : null,
      setItem: (key: string, value: string) => typeof window !== 'undefined' ? window.localStorage.setItem(key, value) : null,
      removeItem: (key: string) => typeof window !== 'undefined' ? window.localStorage.removeItem(key) : null,
    }
  : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: customStorage as any,
    flowType: 'pkce',
  },
});
