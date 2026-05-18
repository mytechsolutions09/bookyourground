import React from 'react';
import { Platform } from 'react-native';
import { useSegments } from 'expo-router';
import { useUI } from '@/contexts/UIContext';
import MobileTabBar from './MobileTabBar';

/**
 * Renders the shared mobile bottom bar for all main-app stack routes.
 * Hidden on web and on auth / owner / admin flows (they use their own navigation).
 */
export function MobileTabBarHost() {
  const segments = useSegments();
  const { isTabBarVisible } = useUI();
  
  if (!isTabBarVisible) return null;

  const root = segments[0];
  const sub = segments[1];
  const isInventory = segments.includes('inventory');
  
  if (
    root === 'welcome' ||
    root === '(auth)' ||
    (root === '(owner)' && !isInventory) ||
    (root === '(admin)' && !isInventory) ||
    root === 'players' ||
    root === 'teams' ||
    root === 'live' ||
    root === 'search' ||
    root === 'ground' ||
    root === 'cricket' ||
    root === 'owner-contract' ||
    root === 'bookings' ||
    (root === 'shop' && sub && sub !== 'cart') // Hide on shop detail pages, but show on cart/home
  ) {
    return null;
  }

  return <MobileTabBar />;
}
