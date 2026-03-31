import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, RefreshControl } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/helpers';
import Card from '@/components/ui/Card';

interface EarningsStats {
  totalEarnings: number;
  totalConfirmedBookings: number;
}

function OwnerEarningsScreenInner() {
  const { user } = useAuth();
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    totalConfirmedBookings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadEarnings();
    }
  }, [user]);

  const loadEarnings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(
          `
          total_amount,
          status,
          booking_date,
          ground:grounds!inner(owner_id)
        `,
        )
        .eq('ground.owner_id', user.id)
        .in('status', ['confirmed', 'completed']);

      if (error) throw error;

      let total = 0;
      let count = 0;
      const rows = (data ?? []) as any[];
      rows.forEach((row) => {
        total += row.total_amount || 0;
        count += 1;
      });

      setStats({
        totalEarnings: total,
        totalConfirmedBookings: count,
      });
      setTransactions(rows);
    } catch (e) {
      console.error('Error loading owner earnings:', e);
    } finally {
      setLoading(false);
    }
  };

  const visibleTransactions = selectedDate
    ? transactions.filter((tx) => {
        const date = (tx.booking_date || '').slice(0, 10);
        return date === selectedDate;
      })
    : transactions;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadEarnings} />}
    >
      <View style={styles.inner}>
        <Card style={styles.panel}>
          <Text style={styles.title}>Earnings</Text>
          <Text style={styles.subtitle}>
            Confirmed and completed bookings on your grounds.
          </Text>

          <View style={styles.cardsRow}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Total earnings</Text>
              <Text style={styles.cardValue}>{formatCurrency(stats.totalEarnings)}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Total bookings</Text>
              <Text style={styles.cardValue}>{stats.totalConfirmedBookings}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.panelSecondary}>
          <View style={styles.transactionsSection}>
            <View style={styles.transactionsHeader}>
              <Text style={styles.transactionsTitle}>Transactions</Text>
              {Platform.OS === 'web' ? (
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Filter by date</Text>
                  {
                    // @ts-ignore - web-only input
                  }
                  <input
                    type="date"
                    value={selectedDate ?? ''}
                    onChange={(e: any) => setSelectedDate(e.target.value || null)}
                    style={{
                      padding: 6,
                      borderRadius: 6,
                      border: '1px solid #D1D5DB',
                      fontSize: 12,
                    }}
                  />
                  {selectedDate && (
                    <Text style={styles.clearFilter} onPress={() => setSelectedDate(null)}>
                      Clear
                    </Text>
                  )}
                </View>
              ) : null}
            </View>
            {visibleTransactions.length === 0 ? (
              <Text style={styles.transactionsEmpty}>
                {selectedDate ? 'No transactions for this date.' : 'No transactions yet.'}
              </Text>
            ) : (
              <View style={styles.transactionsTable}>
                <View style={styles.transactionsHeaderRow}>
                  <Text style={[styles.transactionsHeaderCell, styles.txColDate]}>Date</Text>
                  <Text style={[styles.transactionsHeaderCell, styles.txColGround]}>Ground</Text>
                  <Text style={[styles.transactionsHeaderCell, styles.txColAmount]}>Amount</Text>
                  <Text style={[styles.transactionsHeaderCell, styles.txColStatus]}>Status</Text>
                </View>

                {visibleTransactions.map((tx) => (
                  <View key={tx.id} style={styles.transactionsRow}>
                    <Text style={[styles.transactionsCell, styles.txColDate]}>
                      {tx.booking_date}
                    </Text>
                    <View style={[styles.transactionsCell, styles.txColGround]}>
                      <Text>{tx.ground?.name ?? 'Unknown ground'}</Text>
                      <Text style={styles.txGroundSub}>
                        {tx.ground?.city}, {tx.ground?.state}
                      </Text>
                    </View>
                    <Text style={[styles.transactionsCell, styles.txColAmount]}>
                      {formatCurrency(tx.total_amount)}
                    </Text>
                    <Text style={[styles.transactionsCell, styles.txColStatus]}>
                      {tx.status}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

export default function OwnerEarningsScreen() {
  if (Platform.OS === 'web') {
    return (
      <WebLayout>
        <OwnerEarningsScreenInner />
      </WebLayout>
    );
  }

  return <OwnerEarningsScreenInner />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
    paddingTop: 48,
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
  panelSecondary: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  clearFilter: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc8d3c',
  },
  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    paddingRight: 16,
  },
  card: {
    flex: 1,
    minWidth: 220,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  cardLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  transactionsSection: {
    marginTop: 20,
  },
  transactionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  transactionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  transactionsEmpty: {
    fontSize: 13,
    color: '#6B7280',
  },
  transactionsTable: {
    marginTop: 4,
  },
  transactionsHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  transactionsHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  transactionsRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  transactionsCell: {
    fontSize: 13,
    color: '#111827',
  },
  txColDate: {
    flex: 1,
  },
  txColGround: {
    flex: 2,
  },
  txColAmount: {
    flex: 1,
  },
  txColStatus: {
    flex: 1,
    textTransform: 'capitalize',
  },
  txGroundSub: {
    fontSize: 12,
    color: '#6B7280',
  },
});

