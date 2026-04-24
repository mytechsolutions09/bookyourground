import React, { useMemo } from 'react';
import { Redirect, Tabs, Stack, usePathname, useSegments } from 'expo-router';
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
  Swords,
  CalendarClock,
  Trophy,
  ShoppingBag,
} from 'lucide-react-native';
import { ActivityIndicator, Platform, useWindowDimensions, View, Pressable, StyleSheet, Text as RNText } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AUTH_REQUIRED_TAB = new Set(['home_tab', 'dashboard', 'bookings', 'profile']);

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
    };

  const CustomTabBar = ({ state, descriptors, navigation }: any) => {
    const insets = useSafeAreaInsets();
    const { isTabBarVisible } = useUI();
    if (hideTabBarOnBigScreens || !isTabBarVisible) return null;

    const visibleTabNames = ['home_tab', 'grounds', 'find-an-opponent', 'cricket', 'shop'];
    
    const visibleRoutes = state.routes.filter((route: any) => {
      const { options } = descriptors[route.key];
      return visibleTabNames.includes(route.name) && options.href !== null;
    });

    return (
      <View style={[styles.customTabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
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
              navigation.navigate(route.name);
            }
          };

          const Icon = options.tabBarIcon;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
            >
              {Icon && Icon({ color: isFocused ? '#00ea6b' : '#9ca3af', size: 22 })}
              <RNText 
                numberOfLines={1} 
                style={[
                  styles.tabLabel, 
                  { color: isFocused ? '#00ea6b' : '#9ca3af' }
                ]}
              >
                {options.title}
              </RNText>
            </Pressable>
          );
        })}
      </View>
    );
  };

  if (Platform.OS !== 'web') {
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          contentStyle: { backgroundColor: '#043529' },
          animation: 'slide_from_bottom',
        }}
      >
        <Stack.Screen name="home_tab" />
        <Stack.Screen name="grounds" />
        <Stack.Screen name="shop" />
        <Stack.Screen name="matches" />
        <Stack.Screen name="bookings" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="support" />
        <Stack.Screen name="logout" />
        <Stack.Screen name="cricket" />
        <Stack.Screen name="find-an-opponent" />
        <Stack.Screen name="dashboard" options={{ href: null } as any} />
      </Stack>
    );
  }

  return (
    <Tabs
      tabBar={Platform.OS === 'web' ? (props) => <CustomTabBar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00ea6b',
        tabBarInactiveTintColor: '#9ca3af',
        tabBar: () => null,
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
          title: 'Grounds',
          tabBarIcon: ({ color, size }) => <LandPlot size={size} color={color} />,
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
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="find-an-opponent"
        options={{
          title: 'Opposition',
          tabBarIcon: ({ color, size }) => <Swords size={size} color={color} />,
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
      {!user && (
        <Tabs.Screen
          name="logout"
          options={{
            title: 'Login',
            href: '/(auth)/login',
            tabBarIcon: ({ color, size }) => <LogIn size={size} color={color} />,
          }}
        />
      )}
      <Tabs.Screen
        name="dashboard"
        options={{
          href: null,
        }}
      />
    </Tabs>
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
