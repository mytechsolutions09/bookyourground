import React, { useMemo } from 'react';
import { Redirect, Tabs, usePathname, useSegments } from 'expo-router';
import {
  Hop as Home,
  Calendar,
  User,
  Building2,
  LogOut,
  House,
  LandPlot,
  CalendarCheck2,
  CircleUser,
  LogIn,
  Heart,
} from 'lucide-react-native';
import { ActivityIndicator, Platform, useWindowDimensions, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

const AUTH_REQUIRED_TAB = new Set(['dashboard', 'bookings', 'profile']);

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const pathname = usePathname() ?? '';

  const needsAuth = useMemo(() => {
    const leaf = segments[segments.length - 1];
    if (typeof leaf === 'string' && AUTH_REQUIRED_TAB.has(leaf)) return true;

    const p = pathname.split('?')[0];
    if (p.includes('/(owner)/') || p.includes('/(admin)/')) return false;
    if (
      p.endsWith('/dashboard') ||
      p.endsWith('/bookings') ||
      p.endsWith('/profile')
    ) {
      return true;
    }
    return false;
  }, [segments, pathname]);

  const hideTabBarOnBigScreens = Platform.OS === 'web' && width >= 900;

  /** Native uses `MobileTabBarHost` in root layout — hide RN tab bar and take no layout space. */
  const nativeTabBarOff = {
    tabBar: () => null,
    tabBarStyle: { height: 0, display: 'none' as const, overflow: 'hidden' as const },
    tabBarItemStyle: { height: 0, width: 0, overflow: 'hidden' as const },
  } as const;

  if (loading && needsAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#043529' }}>
        <ActivityIndicator size="large" color={Platform.OS === 'web' ? '#00ea6b' : '#00ea6b'} />
      </View>
    );
  }

  if (!loading && !user && needsAuth) {
    return <Redirect href="/(auth)/login" />;
  }

  const webTabBarStyle = hideTabBarOnBigScreens
    ? ({ display: 'none' } as const)
    : {
        backgroundColor: '#043529',
        borderTopWidth: 1,
        borderTopColor: '#06392e',
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00ea6b',
        tabBarInactiveTintColor: '#e5e7eb',
        ...(Platform.OS === 'web'
          ? {
              tabBarStyle: webTabBarStyle,
              tabBarShowLabel: false,
            }
          : nativeTabBarOff),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) =>
            Platform.OS === 'web' ? (
              <Home size={size} color={color} />
            ) : (
              <House size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="grounds"
        options={{
          title: 'Grounds',
          tabBarIcon: ({ color, size }) =>
            Platform.OS === 'web' ? (
              <Building2 size={size} color={color} />
            ) : (
              <LandPlot size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) =>
            Platform.OS === 'web' ? (
              <Calendar size={size} color={color} />
            ) : (
              <CalendarCheck2 size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, size }) => (
            <Heart size={size} color={color} fill={color === '#00ea6b' ? '#00ea6b' : 'none'} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) =>
            Platform.OS === 'web' ? (
              <User size={size} color={color} />
            ) : (
              <CircleUser size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="logout"
        options={{
          title: user ? 'Logout' : 'Login',
          // When not authenticated, route this tab to the login screen
          href: user ? undefined : '/(auth)/login',
          tabBarIcon: ({ color, size }) =>
            Platform.OS === 'web' ? (
              <LogOut size={size} color={color} />
            ) : user ? (
              <LogOut size={size} color={color} />
            ) : (
              <LogIn size={size} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}
