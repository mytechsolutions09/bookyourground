import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, RefreshControl } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/helpers';
import Card from '@/components/ui/Card';
import MobileAppNavbar from '@/components/MobileAppNavbar';

const IS_WEB = Platform.OS === 'web';

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
          {Platform.OS === 'web' && (
            <Text style={styles.title}>Earnings</Text>
          )}
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
                    <View style={styles.txColGround}>
                      <Text style={styles.transactionsCell}>{tx.ground?.name ?? 'Unknown ground'}</Text>
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

  return (
    <View style={styles.nativeContainer}>
      <MobileAppNavbar title="Earnings" titleColor="#00ea6b" />
      <OwnerEarningsScreenInner />
    </View>
  );
}

const styles = StyleSheet.create({
  nativeContainer: {
    flex: 1,
    backgroundColor: '#043529',
  },
  container: {
    flex: 1,
    backgroundColor: IS_WEB ? '#F5F5F5' : '#043529',
    padding: 16,
    paddingTop: IS_WEB ? 0 : 16,
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
    backgroundColor: IS_WEB ? '#FFFFFF' : '#06392e',
    borderColor: IS_WEB ? '#E5E7EB' : 'rgba(0,234,107,0.2)',
    borderWidth: 1,
  },
  panelSecondary: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: IS_WEB ? '#FFFFFF' : '#06392e',
    borderColor: IS_WEB ? '#E5E7EB' : 'rgba(0,234,107,0.2)',
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: IS_WEB ? '#111827' : '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: IS_WEB ? '#6B7280' : '#9ca3af',
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
    color: '#10b981',
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
    backgroundColor: IS_WEB ? '#FFFFFF' : '#043529',
    borderColor: IS_WEB ? '#E5E7EB' : 'rgba(0,234,107,0.3)',
    borderWidth: 1,
  },
  cardLabel: {
    fontSize: 13,
    color: IS_WEB ? '#6B7280' : '#9ca3af',
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: IS_WEB ? '#111827' : '#00ea6b',
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
    color: IS_WEB ? '#111827' : '#FFFFFF',
  },
  transactionsEmpty: {
    fontSize: 13,
    color: IS_WEB ? '#6B7280' : '#9ca3af',
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
    color: IS_WEB ? '#6B7280' : '#00ea6b',
    textTransform: 'uppercase',
  },
  transactionsRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: IS_WEB ? '#F3F4F6' : 'rgba(0,234,107,0.15)',
  },
  transactionsCell: {
    fontSize: 13,
    color: IS_WEB ? '#111827' : '#E5E7EB',
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
    color: IS_WEB ? '#6B7280' : '#9ca3af',
  },
});

