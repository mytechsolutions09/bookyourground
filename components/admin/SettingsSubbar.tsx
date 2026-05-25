import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Settings as SettingsIcon, MapPin, Tag, LifeBuoy, Ticket, CreditCard, FileText, UserX } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

const BASE = '/(admin)/settings';

export default function SettingsSubbar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingContractsCount, setPendingContractsCount] = React.useState(0);
  const [pendingDeletionsCount, setPendingDeletionsCount] = React.useState(0);

  React.useEffect(() => {
    async function fetchCounts() {
      const [{ count: contractsCount }, { count: deletionsCount }] = await Promise.all([
        supabase
          .from('contract_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('account_deletion_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
      ]);
      if (contractsCount) setPendingContractsCount(contractsCount);
      if (deletionsCount) setPendingDeletionsCount(deletionsCount);
    }
    fetchCounts();
  }, []);

  const isGeneral =
    !pathname.includes('/settings/') && String(pathname).includes('settings');
  const isLocations = pathname.includes('/settings/locations');
  const isGroundTypes = pathname.includes('/settings/ground-types');
  const isSupport = pathname.includes('/settings/support');
  const isCoupons = pathname.includes('/settings/coupons');
  const isPayment = pathname.includes('/settings/payment');
  const isPlatformFees = pathname.includes('/settings/platform-fees');
  const isContracts = pathname.includes('/settings/contract-submissions');
  const isDeletions = pathname.includes('/settings/deletion-requests');

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
            {pendingContractsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingContractsCount}</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/deletion-requests') as any)}
            style={[styles.subLink, isDeletions && styles.subLinkActive]}
          >
            <UserX size={16} color={isDeletions ? '#FFFFFF' : '#666'} />
            <Text style={[styles.subLinkText, isDeletions && styles.subLinkTextActive]}>
              Deletions
            </Text>
            {pendingDeletionsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingDeletionsCount}</Text>
              </View>
            )}
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
  badge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
