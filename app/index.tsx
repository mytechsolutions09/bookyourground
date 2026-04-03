import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import LandingScrollContent from '@/components/landing/LandingScrollContent';
import HomePageSkeleton from '@/components/landing/HomePageSkeleton';
import WebLayout from '@/components/web/WebLayout';

const WELCOME_SEEN_KEY = 'welcome_seen_v1';

export default function IndexScreen() {
  const { user, loading } = useAuth();
  const os = Platform.OS as string;
  const [welcomeChecked, setWelcomeChecked] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(WELCOME_SEEN_KEY);
        if (cancelled) return;
        if (seen !== '1') {
          router.replace('/welcome');
          return;
        }
      } catch {
        // If storage fails, continue to the app without blocking.
      }
      if (!cancelled) setWelcomeChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // On mobile, keep redirecting authenticated users to the app tabs.
    // On web, we keep landing visible so the booking form can be used.
    if (!loading && user && os !== 'web') {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, loading]);

  if (!welcomeChecked) {
    return <HomePageSkeleton />;
  }

  if (loading) {
    return os === 'web' ? (
      <WebLayout>
        <LandingScrollContent variant="web" />
      </WebLayout>
    ) : (
      <HomePageSkeleton />
    );
  }

  // On mobile we redirect authenticated users to the app tabs.
  // On web we keep the landing visible so the booking form can be used.
  if (user && os !== 'web') return null;

  return os === 'web' ? (
    <WebLayout>
      <LandingScrollContent variant="web" />
    </WebLayout>
  ) : (
    <LandingScrollContent variant="native" />
  );
}
