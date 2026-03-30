import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import {
  Users,
  Building2,
  Calendar,
  TrendingUp,
  ChevronRight,
  Settings,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';

interface Stats {
  totalUsers: number;
  totalGrounds: number;
  totalBookings: number;
  pendingApprovals: number;
}

export default function AdminDashboardScreen() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalGrounds: 0,
    totalBookings: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);

      const [usersRes, groundsRes, bookingsRes, pendingRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('grounds').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
        supabase.from('grounds').select('id', { count: 'exact', head: true }).eq('approved', false),
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalGrounds: groundsRes.count || 0,
        totalBookings: bookingsRes.count || 0,
        pendingApprovals: pendingRes.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <Card style={styles.statCard}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Icon size={28} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );

  const content = (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} />}
    >
      <View style={[styles.header, Platform.OS === 'web' && styles.webHeader]}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Platform Overview</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statsGrid}>
          <StatCard
            icon={Users}
            label="Total Users"
            value={stats.totalUsers}
            color={Platform.OS === 'web' ? '#dc8d3c' : '#2196F3'}
          />
          <StatCard
            icon={Building2}
            label="Total Grounds"
            value={stats.totalGrounds}
            color="#4CAF50"
          />
          <StatCard
            icon={Calendar}
            label="Total Bookings"
            value={stats.totalBookings}
            color="#FF9800"
          />
          <StatCard
            icon={TrendingUp}
            label="Pending Approvals"
            value={stats.pendingApprovals}
            color="#F44336"
          />
        </View>

        <Card style={styles.quickActionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push('/(admin)/manage-users')}
          >
            <View style={styles.actionContent}>
              <Users size={20} color={Platform.OS === 'web' ? '#dc8d3c' : '#2196F3'} />
              <Text style={styles.actionText}>Manage Users</Text>
            </View>
            <ChevronRight size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push('/(admin)/bookings')}
          >
            <View style={styles.actionContent}>
              <Calendar size={20} color="#FF9800" />
              <Text style={styles.actionText}>Bookings</Text>
            </View>
            <ChevronRight size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push('/(admin)/grounds')}
          >
            <View style={styles.actionContent}>
              <Building2 size={20} color="#4CAF50" />
              <Text style={styles.actionText}>Grounds</Text>
            </View>
            <ChevronRight size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push('/(admin)/settings' as any)}
          >
            <View style={styles.actionContent}>
              <Settings size={20} color="#6B7280" />
              <Text style={styles.actionText}>Settings</Text>
            </View>
            <ChevronRight size={20} color="#666" />
          </TouchableOpacity>
        </Card>

        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Platform Health</Text>
          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>System Status</Text>
            <View style={styles.healthBadge}>
              <Text style={styles.healthText}>Operational</Text>
            </View>
          </View>
          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>Database</Text>
            <View style={styles.healthBadge}>
              <Text style={styles.healthText}>Connected</Text>
            </View>
          </View>
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
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  webHeader: {
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    alignItems: 'center',
    paddingVertical: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  quickActionsCard: {
    marginBottom: 16,
    paddingBottom: 4,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoCard: {
    marginBottom: 16,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  healthLabel: {
    fontSize: 16,
    color: '#333',
  },
  healthBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  healthText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
});
