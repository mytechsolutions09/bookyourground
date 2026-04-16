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
  Trophy,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';

const ACTIVE = '#00ea6b';
const INACTIVE = '#e5e7eb';

function getActiveTab(
  segments: string[],
): 'home' | 'grounds' | 'bookings' | 'favorites' | 'profile' | 'logout' | 'find-opponent' | 'cricket' | 'shop' {
  const root = segments[0];
  if (root === 'find-an-opponent') return 'find-opponent';
  if (root === 'ground' || root === 'grounds' || root === 'book-my-ground') {
    return 'grounds';
  }
  if (root === 'cricket') return 'cricket';
  if (root === 'bookings') return 'bookings';
  if (root === 'favorites') return 'favorites';
  if (root === 'shop') return 'shop';
  if (root !== '(tabs)') return 'home';
  const tab = segments[1] ?? 'index';
  if (tab === 'index') return 'home';
  if (tab === 'grounds') return 'grounds';
  if (tab === 'cricket') return 'cricket';
  if (tab === 'bookings') return 'bookings';
  if (tab === 'favorites') return 'favorites';
  if (tab === 'profile') return 'profile';
  if (tab === 'shop') return 'shop';
  if (tab === 'logout') return 'logout';
  return 'home';
}

/** Shared mobile bottom navigation (single instance via `MobileTabBarHost` in root layout). Native only. */
export default function MobileTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const { isTabBarVisible } = useUI();
  const { user } = useAuth();

  if (Platform.OS === 'web') return null;
  if (!isTabBarVisible) return null;

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
        onPress={() => go('/(tabs)/grounds')}
        accessibilityRole="button"
        accessibilityLabel="Grounds"
        accessibilityState={{ selected: activeTab === 'grounds' }}
      >
        <LandPlot size={size} color={activeTab === 'grounds' ? ACTIVE : INACTIVE} />
      </Pressable>

      <Pressable
        style={styles.item}
        onPress={() => go('/cricket')}
        accessibilityRole="button"
        accessibilityLabel="Cricket"
        accessibilityState={{ selected: activeTab === 'cricket' }}
      >
        <Trophy size={size} color={activeTab === 'cricket' ? ACTIVE : INACTIVE} />
      </Pressable>

      <Pressable
        style={styles.item}
        onPress={() => go('/(tabs)/shop')}
        accessibilityRole="button"
        accessibilityLabel="Shop"
        accessibilityState={{ selected: activeTab === 'shop' }}
      >
        <ShoppingBag size={size} color={activeTab === 'shop' ? ACTIVE : INACTIVE} />
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

      {!user && (
        <Pressable
          style={styles.item}
          onPress={() => go('/(auth)/login')}
          accessibilityRole="button"
          accessibilityLabel="Log in"
          accessibilityState={{ selected: activeTab === 'logout' }}
        >
          <LogIn size={size} color={activeTab === 'logout' ? ACTIVE : INACTIVE} />
        </Pressable>
      )}
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
