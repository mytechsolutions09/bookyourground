import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import { router, usePathname } from 'expo-router';
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

  const isGeneral = !pathname.includes('/settings/') && String(pathname).includes('settings');
  const isLocations = pathname.includes('/settings/locations');
  const isGroundTypes = pathname.includes('/settings/ground-types');
  const isSupport = pathname.includes('/settings/support');
  const isCoupons = pathname.includes('/settings/coupons');
  const isPayment = pathname.includes('/settings/payment');
  const isPlatformFees = pathname.includes('/settings/platform-fees');
  const isContracts = pathname.includes('/settings/contract-submissions');
  const isDeletions = pathname.includes('/settings/deletion-requests');
  const isSkills = pathname.includes('/settings/skills');
  const isBlogs = pathname.includes('/settings/blogs');
  const isFetchGrounds = pathname.includes('/settings/fetch-grounds');

  return (
    <View style={styles.shell}>
      <View style={styles.subbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subbarScroll}
        >
          <Pressable
            onPress={() => router.push((BASE + '/locations') as any)}
            style={[styles.subLink, isLocations && styles.subLinkActive]}
          >
            <Text style={[styles.subLinkText, isLocations && styles.subLinkTextActive]}>
              Locations
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/ground-types') as any)}
            style={[styles.subLink, isGroundTypes && styles.subLinkActive]}
          >
            <Text style={[styles.subLinkText, isGroundTypes && styles.subLinkTextActive]}>
              Ground types
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/coupons') as any)}
            style={[styles.subLink, isCoupons && styles.subLinkActive]}
          >
            <Text style={[styles.subLinkText, isCoupons && styles.subLinkTextActive]}>
              Coupons
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/payment') as any)}
            style={[styles.subLink, isPayment && styles.subLinkActive]}
          >
            <Text style={[styles.subLinkText, isPayment && styles.subLinkTextActive]}>
              Payment
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/platform-fees') as any)}
            style={[styles.subLink, isPlatformFees && styles.subLinkActive]}
          >
            <Text style={[styles.subLinkText, isPlatformFees && styles.subLinkTextActive]}>
              Platform Fees
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/contract-submissions') as any)}
            style={[styles.subLink, isContracts && styles.subLinkActive]}
          >
            <View style={styles.textWithBadge}>
              <Text style={[styles.subLinkText, isContracts && styles.subLinkTextActive]}>
                Contracts
              </Text>
              {pendingContractsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingContractsCount}</Text>
                </View>
              )}
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/deletion-requests') as any)}
            style={[styles.subLink, isDeletions && styles.subLinkActive]}
          >
            <View style={styles.textWithBadge}>
              <Text style={[styles.subLinkText, isDeletions && styles.subLinkTextActive]}>
                Deletions
              </Text>
              {pendingDeletionsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingDeletionsCount}</Text>
                </View>
              )}
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/skills') as any)}
            style={[styles.subLink, isSkills && styles.subLinkActive]}
          >
            <Text style={[styles.subLinkText, isSkills && styles.subLinkTextActive]}>
              Skills
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/blogs') as any)}
            style={[styles.subLink, isBlogs && styles.subLinkActive]}
          >
            <Text style={[styles.subLinkText, isBlogs && styles.subLinkTextActive]}>
              Blogs
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push((BASE + '/fetch-grounds') as any)}
            style={[styles.subLink, isFetchGrounds && styles.subLinkActive]}
          >
            <Text style={[styles.subLinkText, isFetchGrounds && styles.subLinkTextActive]}>
              Fetch Grounds
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
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 0,
    ...Platform.select({
      web: { position: 'sticky' as any, top: 0, zIndex: 100 },
    }),
  },
  subbarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subLink: {
    paddingHorizontal: 4,
    paddingVertical: 14,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subLinkActive: {
    borderBottomColor: '#10b981',
  },
  subLinkText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  subLinkTextActive: {
    color: '#10b981',
  },
  textWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
