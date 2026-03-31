import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, RefreshControl } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/utils/helpers';

interface OwnerEarningRow {
  owner_id: string;
  owner_name: string | null;
  owner_email: string | null;
  total_earnings: number;
  booking_count: number;
}

function AdminEarningsInner() {
  const [rows, setRows] = useState<OwnerEarningRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);

      // Aggregate earnings per ground owner from confirmed/completed bookings
      const { data, error } = await supabase
        .from('bookings')
        .select(
          `
          id,
          total_amount,
          status,
          ground:grounds!inner(
            owner_id,
            owner:profiles!inner(
              id,
              full_name,
              email
            )
          )
        `,
        )
        .in('status', ['confirmed', 'completed']);

      if (error) throw error;

      const map = new Map<string, OwnerEarningRow>();
      (data ?? []).forEach((row: any) => {
        const owner = row.ground?.owner;
        if (!owner) return;
        const key = owner.id as string;
        const existing = map.get(key);
        const amount = row.total_amount || 0;

        if (existing) {
          existing.total_earnings += amount;
          existing.booking_count += 1;
        } else {
          map.set(key, {
            owner_id: key,
            owner_name: owner.full_name ?? null,
            owner_email: owner.email ?? null,
            total_earnings: amount,
            booking_count: 1,
          });
        }
      });

      const list = Array.from(map.values()).sort(
        (a, b) => (b.total_earnings || 0) - (a.total_earnings || 0),
      );
      setRows(list);
    } catch (e) {
      console.error('Error loading admin earnings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
    >
      <View style={styles.inner}>
        <Card style={styles.panel}>
          <Text style={styles.title}>Earnings by owner</Text>
          <Text style={styles.subtitle}>
            Aggregated earnings from confirmed and completed bookings per ground owner.
          </Text>

          {rows.length === 0 ? (
            <Text style={styles.emptyText}>No earnings data yet.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.headerRow}>
                <Text style={[styles.headerCell, styles.colOwner]}>Owner</Text>
                <Text style={[styles.headerCell, styles.colBookings]}>Bookings</Text>
                <Text style={[styles.headerCell, styles.colAmount]}>Total earnings</Text>
              </View>

              {rows.map((row) => (
                <View key={row.owner_id} style={styles.row}>
                  <View style={[styles.cell, styles.colOwner]}>
                    <Text style={styles.ownerName}>{row.owner_name || 'Unknown owner'}</Text>
                    <Text style={styles.ownerEmail}>{row.owner_email}</Text>
                  </View>
                  <Text style={[styles.cell, styles.colBookings]}>{row.booking_count}</Text>
                  <Text style={[styles.cell, styles.colAmount]}>
                    {formatCurrency(row.total_earnings || 0)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

export default function AdminEarningsScreen() {
  if (Platform.OS === 'web') {
    return (
      <WebLayout>
        <AdminEarningsInner />
      </WebLayout>
    );
  }

  return <AdminEarningsInner />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
    ...Platform.select({
      web: {
        paddingLeft: 0,
        paddingRight: 0,
        paddingTop: 0,
      },
    }),
  },
  inner: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  panel: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  table: {
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cell: {
    fontSize: 13,
    color: '#111827',
  },
  colOwner: {
    flex: 2,
  },
  colBookings: {
    flex: 0.8,
  },
  colAmount: {
    flex: 1.2,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  ownerEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
});

