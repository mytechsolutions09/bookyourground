import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import LandingScrollContent from '@/components/landing/LandingScrollContent';
import HomePageSkeleton from '@/components/landing/HomePageSkeleton';
import WebLayout from '@/components/web/WebLayout';

export default function IndexScreen() {
  const { user, loading } = useAuth();
  const os = Platform.OS as string;

  useEffect(() => {
    // On mobile, keep redirecting authenticated users to the app tabs.
    // On web, we keep landing visible so the booking form can be used.
    if (!loading && user && os !== 'web') {
      router.replace('/(tabs)');
    }
  }, [user, loading]);

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
