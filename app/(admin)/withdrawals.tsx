import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, RefreshControl } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/utils/helpers';

interface WithdrawalRow {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  account_details: string;
  owner: {
    full_name: string | null;
    email: string | null;
  } | null;
}

function AdminWithdrawalsInner() {
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('withdrawals')
        .select(
          `
          id,
          amount,
          status,
          created_at,
          account_details,
          owner:profiles!inner(full_name,email)
        `,
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRows((data ?? []) as any);
    } catch (e) {
      console.error('Error loading withdrawals for admin:', e);
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
          <Text style={styles.title}>Withdrawals</Text>
          <Text style={styles.subtitle}>List of withdrawal requests from ground owners.</Text>

          {rows.length === 0 ? (
            <Text style={styles.emptyText}>No withdrawal requests yet.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.headerRow}>
                <Text style={[styles.headerCell, styles.colOwner]}>Owner</Text>
                <Text style={[styles.headerCell, styles.colAmount]}>Amount</Text>
                <Text style={[styles.headerCell, styles.colStatus]}>Status</Text>
                <Text style={[styles.headerCell, styles.colDate]}>Requested at</Text>
              </View>

              {rows.map((row) => (
                <View key={row.id} style={styles.row}>
                  <View style={[styles.cell, styles.colOwner]}>
                    <Text style={styles.ownerName}>
                      {row.owner?.full_name || 'Unknown owner'}
                    </Text>
                    <Text style={styles.ownerEmail}>{row.owner?.email}</Text>
                  </View>
                  <Text style={[styles.cell, styles.colAmount]}>
                    {formatCurrency(row.amount || 0)}
                  </Text>
                  <Text style={[styles.cell, styles.colStatus]}>{row.status}</Text>
                  <Text style={[styles.cell, styles.colDate]}>
                    {new Date(row.created_at).toLocaleString()}
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

export default function AdminWithdrawalsScreen() {
  if (Platform.OS === 'web') {
    return (
      <WebLayout>
        <AdminWithdrawalsInner />
      </WebLayout>
    );
  }

  return <AdminWithdrawalsInner />;
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
  colAmount: {
    flex: 1,
  },
  colStatus: {
    flex: 1,
    textTransform: 'capitalize',
  },
  colDate: {
    flex: 1.4,
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

