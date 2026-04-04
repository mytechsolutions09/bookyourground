import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Platform, TouchableOpacity } from 'react-native';
import { Building2, Calendar, IndianRupee } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import { router } from 'expo-router';
import MobileAppNavbar from '@/components/MobileAppNavbar';

interface OwnerStats {
  totalGrounds: number;
  totalBookingsOnMyGrounds: number;
  myOwnBookings: number;
  totalEarningsOnMyGrounds: number;
  totalSpentOnOtherGrounds: number;
  totalWithdrawn: number;
}

export default function OwnerDashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<OwnerStats>({
    totalGrounds: 0,
    totalBookingsOnMyGrounds: 0,
    myOwnBookings: 0,
    totalEarningsOnMyGrounds: 0,
    totalSpentOnOtherGrounds: 0,
    totalWithdrawn: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [
        groundsRes,
        bookingsOnMyGroundsRes,
        myBookingsRes,
        earningsRes,
        withdrawalsRes,
      ] = await Promise.all([
        supabase.from('grounds').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
        // All bookings on any ground owned by this user (including self bookings).
        supabase
          .from('bookings')
          .select('id, ground:grounds!inner(owner_id)', { count: 'exact', head: true })
          .eq('ground.owner_id', user.id)
          .eq('status', 'confirmed'),
        // Bookings this owner made on OTHER grounds (not their own grounds) – needed for both
        // count and total spent.
        supabase
          .from('bookings')
          .select('id, total_amount, status, ground:grounds!inner(owner_id)')
          .eq('user_id', user.id)
          .neq('ground.owner_id', user.id)
          .eq('status', 'confirmed'),
        // Total earnings from bookings on this owner's grounds (exclude cancelled/rejected).
        supabase
          .from('bookings')
          .select('total_amount, status, ground:grounds!inner(owner_id)')
          .eq('ground.owner_id', user.id)
          .eq('status', 'confirmed'),
        // Sum of completed withdrawals requested by this owner.
        supabase
          .from('withdrawals')
          .select('amount, status')
          .eq('owner_id', user.id),
      ]);

      const earningsRows =
        (earningsRes.data as { total_amount: number | null; status: string }[] | null) ?? [];
      const totalEarningsOnMyGrounds = earningsRows
        .reduce((sum, b) => sum + (b.total_amount ?? 0), 0);

      const otherGroundRows =
        (myBookingsRes.data as { id: string; total_amount: number | null; status: string }[] | null) ??
        [];
      const myOwnBookings = otherGroundRows.length;
      const totalSpentOnOtherGrounds = otherGroundRows
        .reduce((sum, b) => sum + (b.total_amount ?? 0), 0);

      const withdrawalRows =
        (withdrawalsRes.data as { amount: number | null; status: string }[] | null) ?? [];
      const totalWithdrawn = withdrawalRows
        .filter((w) => (w.status || '').toLowerCase() === 'completed')
        .reduce((sum, w) => sum + (w.amount ?? 0), 0);

      setStats({
        totalGrounds: groundsRes.count || 0,
        totalBookingsOnMyGrounds: bookingsOnMyGroundsRes.count || 0,
        myOwnBookings,
        totalEarningsOnMyGrounds,
        totalSpentOnOtherGrounds,
        totalWithdrawn,
      });
    } catch (e) {
      console.error('Error loading owner stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} />}
    >
      <View style={styles.header}>
        {Platform.OS === 'web' ? (
          <View style={styles.headerCard}>
            <Text style={styles.title}>Ground owner dashboard</Text>
            <Text style={styles.subtitle}>Overview of your grounds and bookings</Text>
          </View>
        ) : (
          <View style={styles.headerCard}>
            <Text style={styles.subtitle}>Overview of your grounds and bookings</Text>
          </View>
        )}
      </View>

      <View style={styles.grid}>
        <View style={styles.statCardWrapper}>
          <Card style={styles.statCard}>
            <View style={styles.iconCircle}>
              <Building2 size={22} color={Platform.OS === 'web' ? '#dc8d3c' : '#00ea6b'} />
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{stats.totalGrounds}</Text>
            <Text style={styles.statLabel}>My grounds</Text>
          </Card>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.statCardWrapper}
          onPress={() => router.push('/(owner)/bookings' as any)}
        >
          <Card style={styles.statCard}>
            <View style={styles.iconCircle}>
              <Calendar size={22} color={Platform.OS === 'web' ? '#4CAF50' : '#00ea6b'} />
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{stats.totalBookingsOnMyGrounds}</Text>
            <Text style={styles.statLabel}>Bookings on my grounds</Text>
          </Card>
        </TouchableOpacity>

        <View style={styles.statCardWrapper}>
          <Card style={styles.statCard}>
            <View style={styles.iconCircle}>
              <Calendar size={22} color={Platform.OS === 'web' ? '#6366F1' : '#00ea6b'} />
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{stats.myOwnBookings}</Text>
            <Text style={styles.statLabel}>Other ground bookings</Text>
          </Card>
        </View>

        <View style={styles.statCardWrapper}>
          <Card style={styles.statCard}>
            <View style={styles.iconCircle}>
              <IndianRupee size={22} color={Platform.OS === 'web' ? '#16A34A' : '#00ea6b'} />
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
              {stats.totalEarningsOnMyGrounds.toLocaleString('en-IN', {
                maximumFractionDigits: 0,
              })}
            </Text>
            <Text style={styles.statLabel}>Total earnings from my grounds</Text>
          </Card>
        </View>

        <View style={styles.statCardWrapper}>
          <Card style={styles.statCard}>
            <View style={styles.iconCircle}>
              <IndianRupee size={22} color={Platform.OS === 'web' ? '#0EA5E9' : '#00ea6b'} />
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
              {stats.totalWithdrawn.toLocaleString('en-IN', {
                maximumFractionDigits: 0,
              })}
            </Text>
            <Text style={styles.statLabel}>Amount withdrawn</Text>
          </Card>
        </View>

        <View style={styles.statCardWrapper}>
          <Card style={styles.statCard}>
            <View style={styles.iconCircle}>
              <IndianRupee size={22} color={Platform.OS === 'web' ? '#EA580C' : '#00ea6b'} />
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
              {stats.totalSpentOnOtherGrounds.toLocaleString('en-IN', {
                maximumFractionDigits: 0,
              })}
            </Text>
            <Text style={styles.statLabel}>Total spent on other grounds</Text>
          </Card>
        </View>
      </View>
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return (
    <View style={styles.nativeContainer}>
      <MobileAppNavbar title="Ground owner dashboard" titleColor="#00ea6b" />
      {content}
    </View>
  );
}

const IS_WEB = Platform.OS === 'web';

const styles = StyleSheet.create({
  nativeContainer: {
    flex: 1,
    backgroundColor: '#043529',
  },
  container: {
    flex: 1,
    backgroundColor: IS_WEB ? '#F5F5F5' : '#043529',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    ...Platform.select({
      web: {
        paddingTop: 16,
      },
      default: {
        paddingTop: 16,
      },
    }),
  },
  headerCard: {
    backgroundColor: IS_WEB ? '#FFFFFF' : '#06392e',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: IS_WEB ? 0 : 1,
    borderColor: 'rgba(0,234,107,0.15)',
    shadowColor: '#000',
    shadowOpacity: IS_WEB ? 0.04 : 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: IS_WEB ? '#111827' : '#f9fafb',
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: IS_WEB ? '#6B7280' : '#9ca3af',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 12,
    paddingHorizontal: 16,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  statCardWrapper: {
    width: '48%',
  },
  statCard: {
    flex: 1, 
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
    backgroundColor: IS_WEB ? '#FFFFFF' : '#06392e',
    borderRadius: 16,
    borderWidth: IS_WEB ? 0 : 1,
    borderColor: 'rgba(0,234,107,0.1)',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: IS_WEB ? '#FEF3C7' : 'rgba(0,234,107,0.1)',
    marginBottom: 12,
  },
  statValue: {
    fontSize: IS_WEB ? 24 : 20,
    fontWeight: '800',
    color: IS_WEB ? '#111827' : '#f9fafb',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: IS_WEB ? '#6B7280' : '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});

