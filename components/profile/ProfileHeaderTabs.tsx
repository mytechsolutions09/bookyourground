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
          style={[styles.tab, isActive('/profile') && styles.activeTab]} 
          onPress={() => router.push('/(tabs)/profile' as any)}
        >
          <Text style={[styles.tabText, isActive('/profile') && { color: themeAccent, fontWeight: '700' }]}>
            Overview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, isActive('/profile/notifications') && styles.activeTab]} 
          onPress={() => router.push('/(tabs)/profile/notifications' as any)}
        >
          <Text style={[styles.tabText, isActive('/profile/notifications') && { color: themeAccent, fontWeight: '700' }]}>
            Notifications
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, isActive('/profile/settings') && styles.activeTab]} 
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
  },
  tabBackground: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    padding: 6,
    borderRadius: 100,
    minWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 100,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
});
