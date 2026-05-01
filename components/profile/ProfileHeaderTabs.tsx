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
    marginBottom: 32,
    width: '100%',
  },
  tabBackground: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 6,
    borderRadius: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
});
