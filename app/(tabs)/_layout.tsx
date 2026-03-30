import React from 'react';
import { Tabs } from 'expo-router';
import { Hop as Home, Calendar, User } from 'lucide-react-native';
import { Platform, useWindowDimensions } from 'react-native';

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const hideTabBarOnBigScreens = Platform.OS === 'web' && width >= 900;

  const tabBarStyle = hideTabBarOnBigScreens
    ? ({ display: 'none' } as any)
    : {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Platform.OS === 'web' ? '#dc8d3c' : '#2196F3',
        tabBarInactiveTintColor: '#666',
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
    </Tabs>
  );
}
