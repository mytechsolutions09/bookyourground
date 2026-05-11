import React, { useMemo, useEffect } from 'react';
import { Tabs, Stack, usePathname, useSegments, useRouter } from 'expo-router';
import {
  House,
  LandPlot,
  CalendarCheck2,
  CircleUser,
  LogIn,
  Heart,
  Swords,
  Trophy,
  ShoppingBag,
  BarChart2,
  Search,
} from 'lucide-react-native';
import { ActivityIndicator, Platform, View, Pressable, StyleSheet, Text as RNText } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsCompact } from '@/hooks/useIsCompact';

const AUTH_REQUIRED_TAB = new Set(['dashboard', 'bookings', 'profile']);

const CustomTabBar = ({ state, descriptors, navigation, router, insets, isTabBarVisible, hideTabBarOnBigScreens }: any) => {
  if (hideTabBarOnBigScreens) return null;

  const visibleTabNames = Platform.OS === 'web' 
    ? ['home_tab', 'find-an-opponent', 'shop', 'cricket']
    : ['home_tab', 'grounds', 'find-an-opponent', 'shop', 'cricket'];

  const visibleRoutes = state.routes.filter((route: any) => {
    const { options } = descriptors[route.key];
    return visibleTabNames.includes(route.name) && options.href !== null;
  });

  return (
    <View style={[
      styles.customTabBar,
      { paddingBottom: Math.max(insets.bottom, 8) },
      !isTabBarVisible && { transform: [{ translateY: 100 }] }
    ]}>
      {visibleRoutes.map((route: any) => {
        const stateIndex = state.routes.findIndex((r: any) => r.key === route.key);
        const { options } = descriptors[route.key];
        const isFocused = state.index === stateIndex;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            if (route.name === 'grounds') {
              router.push('/book-my-ground');
            } else if (Platform.OS === 'web' && route.name === 'find-an-opponent') {
              router.push('/search');
            } else {
              navigation.navigate(route.name);
            }
          }
        };

        const Icon = options.tabBarIcon;

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tabItem}>
            {Icon && Icon({ color: isFocused ? (route.name === 'shop' ? '#f8688a' : '#00ea6b') : '#9ca3af', size: 22 })}
            <RNText
              numberOfLines={1}
              style={[styles.tabLabel, { color: isFocused ? (route.name === 'shop' ? '#f8688a' : '#00ea6b') : '#9ca3af' }]}
            >
              {options.title}
            </RNText>
          </Pressable>
        );
      })}
    </View>
  );
};

export default function TabLayout() {
  const router = useRouter();
  const isCompact = useIsCompact();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const pathname = usePathname() ?? '';
  const insets = useSafeAreaInsets();
  const { isTabBarVisible, tabAnimation } = useUI();

  const needsAuth = useMemo(() => {
    const leaf = segments[segments.length - 1];
    if (typeof leaf === 'string' && AUTH_REQUIRED_TAB.has(leaf)) return true;
    const p = pathname.split('?')[0];
    if (p.includes('/(owner)/') || p.includes('/(admin)/')) return false;
    if (p.endsWith('/dashboard') || p.endsWith('/bookings') || p.endsWith('/profile')) return true;
    return false;
  }, [segments, pathname]);

  const hideTabBarOnBigScreens = Platform.OS === 'web' && !isCompact;

  const nativeTabBarOff = {
    tabBar: () => null,
    tabBarStyle: { height: 0, display: 'none' as const, overflow: 'hidden' as const },
    tabBarItemStyle: { height: 0, width: 0, overflow: 'hidden' as const },
  } as const;

  useEffect(() => {
    if (!loading && !user && needsAuth) {
      router.replace('/(auth)/login');
    }
  }, [loading, user, needsAuth, router]);

  const webTabBarStyle = hideTabBarOnBigScreens
    ? ({ display: 'none' } as const)
    : { backgroundColor: '#043529', borderTopWidth: 1, borderTopColor: '#06392e', height: 60 };

  const showLoading = needsAuth && (loading || !user) && !pathname.endsWith('/profile');

  return (
    <View style={{ flex: 1, backgroundColor: '#043529' }}>
      {Platform.OS !== 'web' ? (
        <Stack
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            contentStyle: { backgroundColor: '#043529' },
            animation: tabAnimation,
          }}
        >
          <Stack.Screen name="home_tab" />
          <Stack.Screen name="grounds" />
          <Stack.Screen name="shop" />
          <Stack.Screen name="matches" />
          <Stack.Screen name="bookings" />
          <Stack.Screen name="favorites" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="profile/orders" />
          <Stack.Screen name="profile/settings" />
          <Stack.Screen name="profile/notifications" />
          <Stack.Screen name="profile/order-details" />
          <Stack.Screen name="support" />
          <Stack.Screen name="logout" />
          <Stack.Screen name="cricket" />
          <Stack.Screen name="book-my-ground" />
          <Stack.Screen name="find-an-opponent" />
          <Stack.Screen name="dashboard" />
        </Stack>
      ) : (
        <Tabs
          tabBar={(props) => (
            <CustomTabBar 
              {...props} 
              router={router} 
              insets={insets} 
              isTabBarVisible={isTabBarVisible} 
              hideTabBarOnBigScreens={hideTabBarOnBigScreens} 
            />
          )}
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#00ea6b',
            tabBarInactiveTintColor: '#9ca3af',
            tabBarStyle: { display: 'none', height: 0, overflow: 'hidden' },
            tabBarItemStyle: { display: 'none', height: 0, overflow: 'hidden' },
            ...(Platform.OS === 'web'
              ? {
                tabBarStyle: webTabBarStyle,
                tabBarShowLabel: false,
              }
              : nativeTabBarOff),
          }}
        >
          <Tabs.Screen
            name="home_tab"
            options={{
              title: 'Home',
              tabBarIcon: ({ color, size }) => <House size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="grounds"
            options={{
              href: Platform.OS === 'web' ? null : undefined,
              title: 'Grounds',
              tabBarIcon: ({ color, size }) => <LandPlot size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="find-an-opponent"
            options={{
              title: Platform.OS === 'web' ? 'Search' : 'Opposition',
              tabBarIcon: ({ color, size }) => Platform.OS === 'web' ? <Search size={size} color={color} /> : <Swords size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="shop"
            options={{
              title: 'Shop',
              tabBarIcon: ({ color, size }) => <ShoppingBag size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="cricket"
            options={{
              title: 'Cricket',
              tabBarIcon: ({ color, size }) => <Trophy size={size} color={color} />,
            }}
          />

          <Tabs.Screen
            name="bookings"
            options={{
              href: null,
              title: 'Bookings',
              tabBarIcon: ({ color, size }) => <CalendarCheck2 size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="favorites"
            options={{
              href: null,
              title: 'Favorites',
              tabBarIcon: ({ color, size }) => (
                <Heart size={size} color={color} fill={color === '#00ea6b' ? '#00ea6b' : 'none'} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              href: null,
              title: 'Profile',
              tabBarIcon: ({ color, size }) => <CircleUser size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="logout"
            options={{
              title: user ? 'Profile' : 'Login',
              href: user ? null : '/(auth)/login',
              tabBarIcon: ({ color, size }) => user ? <CircleUser size={size} color={color} /> : <LogIn size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="matches"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="support"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="dashboard"
            options={{
              href: null,
            }}
          />
        </Tabs>
      )}
      {showLoading && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#043529', zIndex: 9999 }]}>
          <ActivityIndicator size="large" color="#00ea6b" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  customTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    height: 64,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
});
