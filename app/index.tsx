import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import LandingScrollContent from '@/components/landing/LandingScrollContent';
import HomePageSkeleton from '@/components/landing/HomePageSkeleton';
import WebLayout from '@/components/web/WebLayout';

const WELCOME_SEEN_KEY = 'welcome_seen_v1';

export default function IndexScreen() {
  const { user, profile, loading } = useAuth();
  const os = Platform.OS as string;
  const [welcomeChecked, setWelcomeChecked] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS === 'web') {
      setWelcomeChecked(true);
      return;
    }
    
    let cancelled = false;
    const checkWelcome = async () => {
      try {
        const seen = await AsyncStorage.getItem(WELCOME_SEEN_KEY);
        if (cancelled) return;
        
        if (seen !== '1') {
          // Explicitly redirect and do NOT set welcomeChecked to true yet
          router.replace('/welcome');
        } else {
          setWelcomeChecked(true);
        }
      } catch (err) {
        console.error('Welcome storage check error:', err);
        if (!cancelled) setWelcomeChecked(true);
      }
    };
    
    checkWelcome();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // skip marketing homepage on mobile: go to app tabs immediately.
    if (!loading && welcomeChecked && os !== 'web') {
      if (user) {
        if (profile?.role === 'super_admin') {
          router.replace('/(admin)/dashboard');
        } else {
          router.replace('/(tabs)/home_tab');
        }
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, profile, loading, welcomeChecked, os]);

  if (!welcomeChecked || (loading && os !== 'web')) {
    return <HomePageSkeleton />;
  }


  // On web, we keep landing visible for authenticated users.
  if (os !== 'web') return null;

  return (
    <WebLayout>
      <LandingScrollContent variant="web" />
    </WebLayout>
  );
}
