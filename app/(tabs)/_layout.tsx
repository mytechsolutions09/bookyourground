import React from 'react';
import { Tabs } from 'expo-router';
import { Hop as Home, Calendar, User, Building2, LogOut } from 'lucide-react-native';
import { Platform, useWindowDimensions } from 'react-native';

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const hideTabBarOnBigScreens = Platform.OS === 'web' && width >= 900;

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
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
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
          title: 'Logout',
          tabBarIcon: ({ color, size }) => <LogOut size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
