import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Platform } from 'react-native';
import { Building2, Calendar } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';

interface OwnerStats {
  totalGrounds: number;
  totalBookingsOnMyGrounds: number;
  myOwnBookings: number;
}

export default function OwnerDashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<OwnerStats>({
    totalGrounds: 0,
    totalBookingsOnMyGrounds: 0,
    myOwnBookings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [groundsRes, bookingsOnMyGroundsRes, myBookingsRes] = await Promise.all([
        supabase.from('grounds').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('ground.owner_id', user.id),
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);

      setStats({
        totalGrounds: groundsRes.count || 0,
        totalBookingsOnMyGrounds: bookingsOnMyGroundsRes.count || 0,
        myOwnBookings: myBookingsRes.count || 0,
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
        <Text style={styles.title}>Ground owner dashboard</Text>
        <Text style={styles.subtitle}>Overview of your grounds and bookings</Text>
      </View>

      <View style={styles.grid}>
        <Card style={styles.statCard}>
          <View style={styles.iconCircle}>
            <Building2 size={22} color={Platform.OS === 'web' ? '#dc8d3c' : '#2196F3'} />
          </View>
          <Text style={styles.statValue}>{stats.totalGrounds}</Text>
          <Text style={styles.statLabel}>My grounds</Text>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.iconCircle}>
            <Calendar size={22} color="#4CAF50" />
          </View>
          <Text style={styles.statValue}>{stats.totalBookingsOnMyGrounds}</Text>
          <Text style={styles.statLabel}>Bookings on my grounds</Text>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.iconCircle}>
            <Calendar size={22} color="#6366F1" />
          </View>
          <Text style={styles.statValue}>{stats.myOwnBookings}</Text>
          <Text style={styles.statLabel}>My own bookings</Text>
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
    paddingTop: 48,
    paddingBottom: 16,
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

