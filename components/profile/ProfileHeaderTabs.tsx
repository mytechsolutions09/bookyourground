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
    <View style={[styles.actionHeader, style]}>

      <TouchableOpacity 
        style={styles.actionItem} 
        onPress={() => router.push('/(tabs)/profile/notifications')}
      >
        <View style={[styles.actionIconWrap, isActive('/(tabs)/profile/notifications') && { borderColor: themeAccent, borderWidth: 2 }]}>
          <Bell size={20} color={themeAccent} />
        </View>
        <Text style={[styles.actionLabel, isActive('/(tabs)/profile/notifications') && { color: themeAccent, fontWeight: '800' }]}>Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.actionItem} 
        onPress={() => router.push('/(tabs)/profile/settings')}
      >
        <View style={[styles.actionIconWrap, isActive('/(tabs)/profile/settings') && { borderColor: themeAccent, borderWidth: 2 }]}>
          <Settings size={20} color={themeAccent} />
        </View>
        <Text style={[styles.actionLabel, isActive('/(tabs)/profile/settings') && { color: themeAccent, fontWeight: '800' }]}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  actionItem: {
    alignItems: 'center',
    gap: 4,
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  actionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
