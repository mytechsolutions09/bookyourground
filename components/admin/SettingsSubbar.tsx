import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Settings as SettingsIcon, MapPin, Tag, LifeBuoy, Ticket, CreditCard, FileText } from 'lucide-react-native';

const BASE = '/(admin)/settings';

export default function SettingsSubbar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isGeneral =
    !pathname.includes('/settings/') && String(pathname).includes('settings');
  const isLocations = pathname.includes('/settings/locations');
  const isGroundTypes = pathname.includes('/settings/ground-types');
  const isSupport = pathname.includes('/settings/support');
  const isCoupons = pathname.includes('/settings/coupons');
  const isPayment = pathname.includes('/settings/payment');
  const isPlatformFees = pathname.includes('/settings/platform-fees');
  const isContracts = pathname.includes('/settings/contract-submissions');

  return (
    <View style={styles.shell}>
      <View style={styles.subbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subbarScroll}
        >
          <Pressable
            onPress={() => router.push(BASE as any)}
            style={[styles.subLink, isGeneral && styles.subLinkActive]}
          >
            <SettingsIcon size={16} color={isGeneral ? '#FFFFFF' : '#666'} />
            <Text style={[styles.subLinkText, isGeneral && styles.subLinkTextActive]}>General</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/locations') as any)}
            style={[styles.subLink, isLocations && styles.subLinkActive]}
          >
            <MapPin size={16} color={isLocations ? '#FFFFFF' : '#666'} />
            <Text style={[styles.subLinkText, isLocations && styles.subLinkTextActive]}>
              Locations
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/ground-types') as any)}
            style={[styles.subLink, isGroundTypes && styles.subLinkActive]}
          >
            <Tag size={16} color={isGroundTypes ? '#FFFFFF' : '#666'} />
            <Text style={[styles.subLinkText, isGroundTypes && styles.subLinkTextActive]}>
              Ground types
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/coupons') as any)}
            style={[styles.subLink, isCoupons && styles.subLinkActive]}
          >
            <Ticket size={16} color={isCoupons ? '#FFFFFF' : '#666'} />
            <Text style={[styles.subLinkText, isCoupons && styles.subLinkTextActive]}>
              Coupons
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/payment') as any)}
            style={[styles.subLink, isPayment && styles.subLinkActive]}
          >
            <CreditCard size={16} color={isPayment ? '#FFFFFF' : '#666'} />
            <Text style={[styles.subLinkText, isPayment && styles.subLinkTextActive]}>
              Payment
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/platform-fees') as any)}
            style={[styles.subLink, isPlatformFees && styles.subLinkActive]}
          >
            <SettingsIcon size={16} color={isPlatformFees ? '#FFFFFF' : '#666'} />
            <Text style={[styles.subLinkText, isPlatformFees && styles.subLinkTextActive]}>
              Platform Fees
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/support') as any)}
            style={[styles.subLink, isSupport && styles.subLinkActive]}
          >
            <LifeBuoy size={16} color={isSupport ? '#FFFFFF' : '#666'} />
            <Text style={[styles.subLinkText, isSupport && styles.subLinkTextActive]}>
              Support
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/contract-submissions') as any)}
            style={[styles.subLink, isContracts && styles.subLinkActive]}
          >
            <FileText size={16} color={isContracts ? '#FFFFFF' : '#666'} />
            <Text style={[styles.subLinkText, isContracts && styles.subLinkTextActive]}>
              Contracts
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
  },
  subbar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    ...Platform.select({
      web: { position: 'sticky' as any, top: 0, zIndex: 100 },
    }),
  },
  subbarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  subLinkActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  subLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  subLinkTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
});
