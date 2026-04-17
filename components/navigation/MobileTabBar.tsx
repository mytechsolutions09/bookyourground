import React from 'react';
import { View, Pressable, StyleSheet, Platform, Text } from 'react-native';
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
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

const ACTIVE = '#00ea6b';
const INACTIVE = '#9ca3af';

function getActiveTab(
  segments: string[],
): 'home' | 'grounds' | 'bookings' | 'favorites' | 'profile' | 'find-opponent' | 'cricket' | 'shop' {
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
  if (tab === 'index' || tab === 'home_tab') return 'home';
  if (tab === 'grounds') return 'grounds';
  if (tab === 'cricket') return 'cricket';
  if (tab === 'bookings') return 'bookings';
  if (tab === 'favorites') return 'favorites';
  if (tab === 'profile') return 'profile';
  if (tab === 'shop') return 'shop';
  return 'home';
}

/** Shared mobile bottom navigation (single instance via `MobileTabBarHost` in root layout). Native only. */
export default function MobileTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const { isTabBarVisible } = useUI();
  const { user } = useAuth();
  
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withTiming(isTabBarVisible ? 0 : 100, {
      duration: 600,
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
  const size = 22;

  const go = (href: string) => {
    router.push(href as any);
  };

  return (
    <Animated.View
      style={[
        styles.bar,
        animatedStyle,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          borderTopColor: '#06392e',
        },
      ]}
    >
      <Pressable
        style={styles.item}
        onPress={() => go('/(tabs)/home_tab')}
        accessibilityRole="button"
        accessibilityLabel="Home"
        accessibilityState={{ selected: activeTab === 'home' }}
      >
        <House size={size} color={activeTab === 'home' ? ACTIVE : INACTIVE} />
        <Text style={[styles.label, { color: activeTab === 'home' ? ACTIVE : INACTIVE }]}>Home</Text>
      </Pressable>
      
      <Pressable
        style={styles.item}
        onPress={() => go('/(tabs)/grounds')}
        accessibilityRole="button"
        accessibilityLabel="Grounds"
        accessibilityState={{ selected: activeTab === 'grounds' }}
      >
        <LandPlot size={size} color={activeTab === 'grounds' ? ACTIVE : INACTIVE} />
        <Text style={[styles.label, { color: activeTab === 'grounds' ? ACTIVE : INACTIVE }]}>Grounds</Text>
      </Pressable>

      <Pressable
        style={styles.item}
        onPress={() => go('/(tabs)/cricket')}
        accessibilityRole="button"
        accessibilityLabel="Cricket"
        accessibilityState={{ selected: activeTab === 'cricket' }}
      >
        <Trophy size={size} color={activeTab === 'cricket' ? ACTIVE : INACTIVE} />
        <Text style={[styles.label, { color: activeTab === 'cricket' ? ACTIVE : INACTIVE }]}>Cricket</Text>
      </Pressable>

      <Pressable
        style={styles.item}
        onPress={() => go('/(tabs)/shop')}
        accessibilityRole="button"
        accessibilityLabel="Shop"
        accessibilityState={{ selected: activeTab === 'shop' }}
      >
        <ShoppingBag size={size} color={activeTab === 'shop' ? ACTIVE : INACTIVE} />
        <Text style={[styles.label, { color: activeTab === 'shop' ? ACTIVE : INACTIVE }]}>Shop</Text>
      </Pressable>

      <Pressable
        style={styles.item}
        onPress={() => go('/(tabs)/profile')}
        accessibilityRole="button"
        accessibilityLabel="Profile"
        accessibilityState={{ selected: activeTab === 'profile' }}
      >
        <CircleUser size={size} color={activeTab === 'profile' ? ACTIVE : INACTIVE} />
        <Text style={[styles.label, { color: activeTab === 'profile' ? ACTIVE : INACTIVE }]}>Profile</Text>
      </Pressable>
    </Animated.View>
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
    height: 85,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
});
