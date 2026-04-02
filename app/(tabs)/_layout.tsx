import React, { useMemo } from 'react';
import { Redirect, Tabs, usePathname, useSegments } from 'expo-router';
import { Hop as Home, Calendar, User, Building2, LogOut } from 'lucide-react-native';
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

  if (loading && needsAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' }}>
        <ActivityIndicator size="large" color={Platform.OS === 'web' ? '#dc8d3c' : '#2196F3'} />
      </View>
    );
  }

  if (!loading && !user && needsAuth) {
    return <Redirect href="/(auth)/login" />;
  }

  const tabBarStyle = hideTabBarOnBigScreens
    ? ({ display: 'none' } as any)
    : {
        backgroundColor: '#2b2f4b',
        borderTopWidth: 1,
        borderTopColor: '#1f243a',
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#dc8d3c',
        tabBarInactiveTintColor: '#e5e7eb',
        tabBarStyle,
        // On small screens we show only icons (no text labels).
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="grounds"
        options={{
          title: 'Grounds',
          tabBarIcon: ({ color, size }) => <Building2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="logout"
        options={{
          title: user ? 'Logout' : 'Login',
          // When not authenticated, route this tab to the login screen
          href: user ? undefined : '/(auth)/login',
          tabBarIcon: ({ color, size }) => <LogOut size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
