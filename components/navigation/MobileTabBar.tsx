import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  House,
  LandPlot,
  CalendarCheck2,
  CircleUser,
  LogIn,
  LogOut,
  Heart,
  Swords,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

const ACTIVE = '#00ea6b';
const INACTIVE = '#e5e7eb';

function getActiveTab(
  segments: string[],
): 'home' | 'grounds' | 'bookings' | 'favorites' | 'profile' | 'logout' | 'find-opponent' {
  const root = segments[0];
  if (root === 'find-an-opponent') return 'find-opponent';
  if (root === 'ground' || root === 'grounds' || root === 'book-my-ground') {
    return 'grounds';
  }
  if (root === 'bookings') return 'bookings';
  if (root === 'favorites') return 'favorites';
  if (root !== '(tabs)') return 'home';
  const tab = segments[1] ?? 'index';
  if (tab === 'index') return 'home';
  if (tab === 'grounds') return 'grounds';
  if (tab === 'bookings') return 'bookings';
  if (tab === 'favorites') return 'favorites';
  if (tab === 'profile') return 'profile';
  if (tab === 'logout') return 'logout';
  return 'home';
}

/** Shared mobile bottom navigation (single instance via `MobileTabBarHost` in root layout). Native only. */
export default function MobileTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const { user, profile } = useAuth();
  const isOwner = profile?.role === 'ground_owner';

  if (Platform.OS === 'web') return null;

  const activeTab = getActiveTab(segments as string[]);
  const size = 24;

  const go = (href: string) => {
    router.push(href as any);
  };

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          borderTopColor: '#06392e',
        },
      ]}
    >
      <Pressable
        style={styles.item}
        onPress={() => go('/(tabs)')}
        accessibilityRole="button"
        accessibilityLabel="Home"
        accessibilityState={{ selected: activeTab === 'home' }}
      >
        <House size={size} color={activeTab === 'home' ? ACTIVE : INACTIVE} />
      </Pressable>
      
      <Pressable
        style={styles.item}
        onPress={() => go(isOwner ? '/find-an-opponent' : '/(tabs)/grounds')}
        accessibilityRole="button"
        accessibilityLabel={isOwner ? "Find Opponent" : "Grounds"}
        accessibilityState={{ selected: isOwner ? activeTab === 'find-opponent' : activeTab === 'grounds' }}
      >
        {isOwner ? (
          <Swords size={size} color={activeTab === 'find-opponent' ? ACTIVE : INACTIVE} />
        ) : (
          <LandPlot size={size} color={activeTab === 'grounds' ? ACTIVE : INACTIVE} />
        )}
      </Pressable>

      <Pressable
        style={styles.item}
        onPress={() => go('/(tabs)/bookings')}
        accessibilityRole="button"
        accessibilityLabel="Bookings"
        accessibilityState={{ selected: activeTab === 'bookings' }}
      >
        <CalendarCheck2 size={size} color={activeTab === 'bookings' ? ACTIVE : INACTIVE} />
      </Pressable>
      <Pressable
        style={styles.item}
        onPress={() => go('/(tabs)/favorites')}
        accessibilityRole="button"
        accessibilityLabel="Favorites"
        accessibilityState={{ selected: activeTab === 'favorites' }}
      >
        <Heart size={size} color={activeTab === 'favorites' ? ACTIVE : INACTIVE} fill={activeTab === 'favorites' ? ACTIVE : 'none'} />
      </Pressable>
      <Pressable
        style={styles.item}
        onPress={() => go('/(tabs)/profile')}
        accessibilityRole="button"
        accessibilityLabel="Profile"
        accessibilityState={{ selected: activeTab === 'profile' }}
      >
        <CircleUser size={size} color={activeTab === 'profile' ? ACTIVE : INACTIVE} />
      </Pressable>
      <Pressable
        style={styles.item}
        onPress={() => go(user ? '/(tabs)/logout' : '/(auth)/login')}
        accessibilityRole="button"
        accessibilityLabel={user ? 'Log out' : 'Log in'}
        accessibilityState={{ selected: activeTab === 'logout' }}
      >
        {user ? (
          <LogOut size={size} color={activeTab === 'logout' ? ACTIVE : INACTIVE} />
        ) : (
          <LogIn size={size} color={activeTab === 'logout' ? ACTIVE : INACTIVE} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#043529',
    borderTopWidth: 1,
    paddingTop: 8,
    minHeight: 52,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
});
