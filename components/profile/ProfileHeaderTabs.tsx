import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Bell, Settings } from 'lucide-react-native';
import { router, usePathname } from 'expo-router';

interface ProfileHeaderTabsProps {
  themeAccent: string;
  themeText: string;
  isCompact: boolean;
  style?: any;
}

export default function ProfileHeaderTabs({ themeAccent, themeText, isCompact, style }: ProfileHeaderTabsProps) {
  const pathname = usePathname();
  const isWeb = Platform.OS === 'web';
  
  if (!isWeb || isCompact) return null;

  const isActive = (path: string) => pathname === path;

  return (
    <View style={[styles.tabContainer, style]}>
      <View style={styles.tabBackground}>
        <TouchableOpacity 
          style={[styles.tab, isActive('/profile') && { borderBottomColor: themeAccent }]} 
          onPress={() => router.push('/(tabs)/profile' as any)}
        >
          <Text style={[styles.tabText, isActive('/profile') && { color: themeAccent, fontWeight: '700' }]}>
            Overview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, isActive('/profile/notifications') && { borderBottomColor: themeAccent }]} 
          onPress={() => router.push('/(tabs)/profile/notifications' as any)}
        >
          <Text style={[styles.tabText, isActive('/profile/notifications') && { color: themeAccent, fontWeight: '700' }]}>
            Notifications
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, isActive('/profile/settings') && { borderBottomColor: themeAccent }]} 
          onPress={() => router.push('/(tabs)/profile/settings' as any)}
        >
          <Text style={[styles.tabText, isActive('/profile/settings') && { color: themeAccent, fontWeight: '700' }]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    alignItems: 'flex-start',
    marginBottom: 24,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  tabBackground: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    // borderBottomColor will be set dynamically via themeAccent
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: 'Inter',
  },
});
