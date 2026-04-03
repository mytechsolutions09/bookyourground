import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { processLock } from '@supabase/auth-js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Default browser lock uses Web Locks + steal recovery; concurrent refresh /
    // React Strict Mode can surface "another request stole it". Serialize auth
    // in-process on web instead (RN already uses a no-op / process lock path).
    ...(Platform.OS === 'web' ? { lock: processLock } : {}),
  },
});
