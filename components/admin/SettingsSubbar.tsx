import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Settings as SettingsIcon, MapPin, Tag } from 'lucide-react-native';

const BASE = '/(admin)/settings';

export default function SettingsSubbar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isGeneral =
    !pathname.includes('/settings/') && String(pathname).includes('settings');
  const isLocations = pathname.includes('/settings/locations');
  const isGroundTypes = pathname.includes('/settings/ground-types');

  return (
    <View style={styles.shell}>
      <View style={styles.subbar}>
        <Text style={styles.subbarTitle}>Settings</Text>

        <Pressable
          onPress={() => router.push(BASE as any)}
          style={[styles.subLink, isGeneral && styles.subLinkActive]}
        >
          <SettingsIcon size={18} color={isGeneral ? '#dc8d3c' : '#666'} />
          <Text style={[styles.subLinkText, isGeneral && styles.subLinkTextActive]}>General</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push((BASE + '/locations') as any)}
          style={[styles.subLink, isLocations && styles.subLinkActive]}
        >
          <MapPin size={18} color={isLocations ? '#dc8d3c' : '#666'} />
          <Text style={[styles.subLinkText, isLocations && styles.subLinkTextActive]}>
            Locations
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push((BASE + '/ground-types') as any)}
          style={[styles.subLink, isGroundTypes && styles.subLinkActive]}
        >
          <Tag size={18} color={isGroundTypes ? '#dc8d3c' : '#666'} />
          <Text style={[styles.subLinkText, isGroundTypes && styles.subLinkTextActive]}>
            Ground types
          </Text>
        </Pressable>
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
  },
  subbar: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    padding: 14,
    ...Platform.select({
      web: { height: '100vh' as any, position: 'sticky' as any, top: 0 },
    }),
  },
  subbarTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 8,
  },
  subLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  subLinkActive: {
    backgroundColor: 'rgba(43,47,75,0.08)',
  },
  subLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  subLinkTextActive: {
    color: '#dc8d3c',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
});
