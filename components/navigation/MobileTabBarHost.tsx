import React from 'react';
import { Platform } from 'react-native';
import { useSegments } from 'expo-router';
import MobileTabBar from './MobileTabBar';

/**
 * Renders the shared mobile bottom bar for all main-app stack routes.
 * Hidden on web and on auth / owner / admin flows (they use their own navigation).
 */
export function MobileTabBarHost() {
  const segments = useSegments();
  if (Platform.OS === 'web') return null;

  const root = segments[0];
  if (
    root === 'welcome' ||
    root === '(auth)' ||
    root === '(owner)' ||
    root === '(admin)'
  ) {
    return null;
  }

  return <MobileTabBar />;
}
