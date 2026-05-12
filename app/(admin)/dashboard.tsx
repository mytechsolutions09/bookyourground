import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import {
  Users,
  Building2,
  Calendar,
  TrendingUp,
  ChevronRight,
  Settings,
  Mail,
  LifeBuoy,
  Package,
  ShoppingBag,
  IndianRupee,
  Star,
  AlertCircle
} from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';

import { useAuth } from '@/contexts/AuthContext';

interface Stats {
  totalUsers: number;
  totalGrounds: number;
  totalBookings: number;
  pendingApprovals: number;
}

export default function AdminDashboardScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;
  const isMobile = width <= 768;

  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalGrounds: 0,
    totalBookings: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      loadStats();
    }
  }, [user, authLoading]);

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
    <View style={[
      styles.statCard,
      { minWidth: isDesktop ? '23.5%' : (isTablet || (isMobile && Platform.OS === 'web')) ? '48%' : '100%' }
    ]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Icon size={18} color={color} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const content = (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} />}
    >
      <View style={styles.content}>
        <View style={[
          styles.headerRow,
          isDesktop && { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
        ]}>
          <View>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Platform Overview</Text>
          </View>
          
          <View style={[
            styles.statsGrid,
            isDesktop && { marginBottom: 0, flex: 1, justifyContent: 'flex-end', marginLeft: 24 }
          ]}>
            <StatCard
              icon={Users}
              label="Total Users"
              value={stats.totalUsers}
              color="#10b981"
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
        </View>

        {/* User & Owner Management */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.sectionTitle}>User & Partner Management</Text>
          <View style={styles.actionsGrid}>
            {[
              { label: 'Manage Users', icon: Users, color: '#2196F3', path: '/(admin)/manage-users' },
              { label: 'Manage Owners', icon: Users, color: '#10b981', path: '/(admin)/manage-ground-owners' },
              { label: 'Approve Grounds', icon: Building2, color: '#F59E0B', path: '/(admin)/approve-grounds' },
            ].map((action, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.actionCard, { width: isMobile ? '100%' : isTablet ? '48%' : '31.5%' }]}
                onPress={() => router.push(action.path as any)}
              >
                <View style={styles.actionContent}>
                  <View style={[styles.actionIconBox, { backgroundColor: action.color + '10' }]}>
                    <action.icon size={20} color={action.color} />
                  </View>
                  <Text style={styles.actionText}>{action.label}</Text>
                </View>
                <ChevronRight size={18} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Financials & Compliance */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.sectionTitle}>Financials & Compliance</Text>
          <View style={styles.actionsGrid}>
            {[
              { label: 'Platform Earnings', icon: TrendingUp, color: '#10b981', path: '/(admin)/earnings' },
              { label: 'Payouts & Bank Details', icon: IndianRupee, color: '#059669', path: '/(admin)/payouts' },
            ].map((action, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.actionCard, { width: isMobile ? '100%' : isTablet ? '48%' : '48.5%' }]}
                onPress={() => router.push(action.path as any)}
              >
                <View style={styles.actionContent}>
                  <View style={[styles.actionIconBox, { backgroundColor: action.color + '10' }]}>
                    <action.icon size={20} color={action.color} />
                  </View>
                  <Text style={styles.actionText}>{action.label}</Text>
                </View>
                <ChevronRight size={18} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Operations & Inventory */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.sectionTitle}>Platform Operations</Text>
          <View style={styles.actionsGrid}>
            {[
              { label: 'Bookings', icon: Calendar, color: '#FF9800', path: '/(admin)/bookings' },
              { label: 'Grounds Inventory', icon: Building2, color: '#4CAF50', path: '/(admin)/grounds' },
              { label: 'Inventory & Occupancy', icon: Package, color: '#6366F1', path: '/(admin)/inventory' },
              { label: 'Categories', icon: ShoppingBag, color: '#EC4899', path: '/(admin)/categories' },
              { label: 'Locations', icon: LifeBuoy, color: '#3B82F6', path: '/(admin)/locations' },
              { label: 'Reviews', icon: Star, color: '#F59E0B', path: '/(admin)/reviews' },
            ].map((action, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.actionCard, { width: isMobile ? '100%' : isTablet ? '48%' : '31.5%' }]}
                onPress={() => router.push(action.path as any)}
              >
                <View style={styles.actionContent}>
                  <View style={[styles.actionIconBox, { backgroundColor: action.color + '10' }]}>
                    <action.icon size={20} color={action.color} />
                  </View>
                  <Text style={styles.actionText}>{action.label}</Text>
                </View>
                <ChevronRight size={18} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Shop & Commerce */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.sectionTitle}>Shop & Commerce</Text>
          <View style={styles.actionsGrid}>
            {[
              { label: 'Products', icon: Package, color: '#8B5CF6', path: '/(admin)/products' },
              { label: 'Orders', icon: ShoppingBag, color: '#059669', path: '/(admin)/orders' },
              { label: 'Returns', icon: AlertCircle, color: '#EF4444', path: '/(admin)/returns' },
              { label: 'Support Tickets', icon: LifeBuoy, color: '#6366F1', path: '/(admin)/messages' },
              { label: 'Settings', icon: Settings, color: '#6B7280', path: '/(admin)/settings' },
            ].map((action, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.actionCard, { width: isMobile ? '100%' : isTablet ? '48%' : '31.5%' }]}
                onPress={() => router.push(action.path as any)}
              >
                <View style={styles.actionContent}>
                  <View style={[styles.actionIconBox, { backgroundColor: action.color + '10' }]}>
                    <action.icon size={20} color={action.color} />
                  </View>
                  <Text style={styles.actionText}>{action.label}</Text>
                </View>
                <ChevronRight size={18} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.infoCard}>
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
        </View>
      </View>
    </ScrollView>
  );

  return (
    <>
      {Platform.OS === 'web' ? (
        <WebLayout>{content}</WebLayout>
      ) : (
        <View style={{ flex: 1 }}>
          <MobileAppNavbar title="ADMIN DASHBOARD" titleColor="#10b981" />
          {content}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  webHeader: {
    paddingTop: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  content: {
    padding: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? '23%' : '47%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  quickActionsCard: {
    marginBottom: 16,
    paddingBottom: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#1E293B',
  },
  headerRow: {
    marginBottom: 24,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
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
    fontSize: 14,
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
    fontWeight: '500',
    color: '#4CAF50',
  },
});
