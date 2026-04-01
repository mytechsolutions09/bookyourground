import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Platform, TouchableOpacity } from 'react-native';
import { Building2, Calendar, IndianRupee } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import { router } from 'expo-router';

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
          .eq('ground.owner_id', user.id),
        // Bookings this owner made on OTHER grounds (not their own grounds) – needed for both
        // count and total spent.
        supabase
          .from('bookings')
          .select('id, total_amount, status, ground:grounds!inner(owner_id)')
          .eq('user_id', user.id)
          .neq('ground.owner_id', user.id),
        // Total earnings from bookings on this owner's grounds (exclude cancelled/rejected).
        supabase
          .from('bookings')
          .select('total_amount, status, ground:grounds!inner(owner_id)')
          .eq('ground.owner_id', user.id),
        // Sum of completed withdrawals requested by this owner.
        supabase
          .from('withdrawals')
          .select('amount, status')
          .eq('owner_id', user.id),
      ]);

      const earningsRows =
        (earningsRes.data as { total_amount: number | null; status: string }[] | null) ?? [];
      const totalEarningsOnMyGrounds = earningsRows
        .filter((b) => b.status !== 'cancelled' && b.status !== 'rejected')
        .reduce((sum, b) => sum + (b.total_amount ?? 0), 0);

      const otherGroundRows =
        (myBookingsRes.data as { id: string; total_amount: number | null; status: string }[] | null) ??
        [];
      const myOwnBookings = otherGroundRows.length;
      const totalSpentOnOtherGrounds = otherGroundRows
        .filter((b) => b.status !== 'cancelled' && b.status !== 'rejected')
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
        <View style={styles.headerCard}>
          <Text style={styles.title}>Ground owner dashboard</Text>
          <Text style={styles.subtitle}>Overview of your grounds and bookings</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <Card style={styles.statCard}>
          <View style={styles.iconCircle}>
            <Building2 size={22} color={Platform.OS === 'web' ? '#dc8d3c' : '#2196F3'} />
          </View>
          <Text style={styles.statValue}>{stats.totalGrounds}</Text>
          <Text style={styles.statLabel}>My grounds</Text>
        </Card>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(owner)/bookings' as any)}
        >
          <Card style={styles.statCard}>
            <View style={styles.iconCircle}>
              <Calendar size={22} color="#4CAF50" />
            </View>
            <Text style={styles.statValue}>{stats.totalBookingsOnMyGrounds}</Text>
            <Text style={styles.statLabel}>Bookings on my grounds</Text>
          </Card>
        </TouchableOpacity>

        <Card style={styles.statCard}>
          <View style={styles.iconCircle}>
            <Calendar size={22} color="#6366F1" />
          </View>
          <Text style={styles.statValue}>{stats.myOwnBookings}</Text>
          <Text style={styles.statLabel}>Other ground bookings</Text>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.iconCircle}>
            <IndianRupee size={22} color="#16A34A" />
          </View>
          <Text style={styles.statValue}>
            {stats.totalEarningsOnMyGrounds.toLocaleString('en-IN', {
              maximumFractionDigits: 0,
            })}
          </Text>
          <Text style={styles.statLabel}>Total earnings from my grounds</Text>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.iconCircle}>
            <IndianRupee size={22} color="#0EA5E9" />
          </View>
          <Text style={styles.statValue}>
            {stats.totalWithdrawn.toLocaleString('en-IN', {
              maximumFractionDigits: 0,
            })}
          </Text>
          <Text style={styles.statLabel}>Amount withdrawn</Text>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.iconCircle}>
            <IndianRupee size={22} color="#EA580C" />
          </View>
          <Text style={styles.statValue}>
            {stats.totalSpentOnOtherGrounds.toLocaleString('en-IN', {
              maximumFractionDigits: 0,
            })}
          </Text>
          <Text style={styles.statLabel}>Total spent on other grounds</Text>
        </Card>
      </View>
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    ...Platform.select({
      web: {
        paddingTop: 16,
      },
      default: {
        paddingTop: 48,
      },
    }),
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 220,
    alignItems: 'center',
    paddingVertical: 18,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});

