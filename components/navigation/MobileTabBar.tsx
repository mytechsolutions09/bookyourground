import React from 'react';
import { View, Pressable, StyleSheet, Platform, Text, useWindowDimensions } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  House,
  LandPlot,
  CalendarCheck2,
  CircleUser,
  Heart,
  Swords,
  Trophy,
  ShoppingBag,
  CalendarClock,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

const ACTIVE = '#00ea6b';
const INACTIVE = '#9ca3af';

function getActiveTab(
  segments: string[],
): 'home' | 'grounds' | 'bookings' | 'favorites' | 'profile' | 'find-opponent' | 'cricket' | 'shop' | 'inventory' {
  const root = segments[0];
  if (root === 'inventory') return 'inventory';
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
  if (tab === 'index' || tab === 'home_tab') return 'home';
  if (tab === 'grounds') return 'grounds';
  if (tab === 'cricket') return 'cricket';
  if (tab === 'bookings') return 'bookings';
  if (tab === 'favorites') return 'favorites';
  if (tab === 'find-an-opponent') return 'find-opponent';
  if (tab === 'profile') return 'profile';
  if (tab === 'shop') return 'shop';
  if (tab === 'inventory') return 'inventory';
  return 'home';
}

/** Shared mobile bottom navigation (single instance via `MobileTabBarHost` in root layout). Native only. */
export default function MobileTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const { profile } = useAuth();
  const { isTabBarVisible } = useUI();
  
  const isOwner = profile?.role === 'ground_owner';
  
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withTiming(isTabBarVisible ? 0 : 120, {
      duration: 500,
      easing: Easing.out(Easing.exp),
    });
  }, [isTabBarVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  }));

  if (Platform.OS === 'web') return null;

  const activeTab = getActiveTab(segments as string[]);
  const size = 24;

  const go = (href: string) => {
    router.push(href as any);
  };

  return (
    <Animated.View
      style={[
        styles.bar,
        animatedStyle,
        { paddingBottom: Math.max(insets.bottom, 12) }
      ]}
    >
      <Pressable
        style={styles.item}
        onPress={() => go('/(tabs)/home_tab')}
      >
        <House size={size} color={activeTab === 'home' ? ACTIVE : INACTIVE} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
        <Text style={[styles.label, { color: activeTab === 'home' ? ACTIVE : INACTIVE }]}>Home</Text>
      </Pressable>
      
      <Pressable
        style={styles.item}
        onPress={() => go('/(tabs)/grounds')}
      >
        <LandPlot size={size} color={activeTab === 'grounds' ? ACTIVE : INACTIVE} strokeWidth={activeTab === 'grounds' ? 2.5 : 2} />
        <Text style={[styles.label, { color: activeTab === 'grounds' ? ACTIVE : INACTIVE }]}>Grounds</Text>
      </Pressable>

      <Pressable
        style={styles.item}
        onPress={() => go('/(tabs)/cricket')}
      >
        <Trophy size={size} color={activeTab === 'cricket' ? ACTIVE : INACTIVE} strokeWidth={activeTab === 'cricket' ? 2.5 : 2} />
        <Text style={[styles.label, { color: activeTab === 'cricket' ? ACTIVE : INACTIVE }]}>Play</Text>
      </Pressable>

      <Pressable
        style={styles.item}
        onPress={() => go('/(tabs)/find-an-opponent')}
      >
        <Swords size={size} color={activeTab === 'find-opponent' ? ACTIVE : INACTIVE} strokeWidth={activeTab === 'find-opponent' ? 2.5 : 2} />
        <Text style={[styles.label, { color: activeTab === 'find-opponent' ? ACTIVE : INACTIVE }]}>Opposition</Text>
      </Pressable>

      <Pressable
        style={styles.item}
        onPress={() => go('/(tabs)/shop')}
      >
        <ShoppingBag size={size} color={activeTab === 'shop' ? '#2b2f4b' : INACTIVE} strokeWidth={activeTab === 'shop' ? 2.5 : 2} />
        <Text style={[styles.label, { color: activeTab === 'shop' ? '#2b2f4b' : INACTIVE }]}>Shop</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    // Premium shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
});

