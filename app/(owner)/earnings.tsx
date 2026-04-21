import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, RefreshControl } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/helpers';
import Card from '@/components/ui/Card';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { Wallet, Landmark, TrendingUp, Calendar as CalendarIcon, History } from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';

interface EarningsStats {
  totalEarnings: number;
  cashEarnings: number;
  onlineEarnings: number;
  totalConfirmedBookings: number;
}

function OwnerEarningsScreenInner() {
  const { user } = useAuth();
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    cashEarnings: 0,
    onlineEarnings: 0,
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
          payment_method,
          ground:grounds!inner(owner_id, name, city, state)
        `,
        )
        .eq('ground.owner_id', user.id)
        .in('status', ['confirmed', 'completed']);

      if (error) throw error;

      let total = 0;
      let cash = 0;
      let online = 0;
      let count = 0;
      const rows = (data ?? []) as any[];
      rows.forEach((row) => {
        const amt = row.total_amount || 0;
        total += amt;
        if (row.payment_method === 'cash') {
          cash += amt;
        } else {
          online += amt;
        }
        count += 1;
      });

      setStats({
        totalEarnings: total,
        cashEarnings: cash,
        onlineEarnings: online,
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
              <View style={styles.cardHeader}>
                <TrendingUp size={16} color="#64748B" />
                <Text style={styles.cardLabel}>Total earnings</Text>
              </View>
              <Text style={styles.cardValue}>{formatCurrency(stats.totalEarnings)}</Text>
            </View>

            <View style={[styles.card, styles.highlightCard]}>
              <View style={styles.cardHeader}>
                <Wallet size={16} color="#10b981" />
                <Text style={styles.cardLabel}>Wallet Balance</Text>
              </View>
              <Text style={[styles.cardValue, { color: '#10b981' }]}>{formatCurrency(stats.onlineEarnings)}</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Landmark size={16} color="#f59e0b" />
                <Text style={styles.cardLabel}>Cash (On site)</Text>
              </View>
              <Text style={[styles.cardValue, { color: '#f59e0b' }]}>{formatCurrency(stats.cashEarnings)}</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <History size={16} color="#64748B" />
                <Text style={styles.cardLabel}>Total bookings</Text>
              </View>
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
                      padding: 10,
                      borderRadius: 10,
                      border: '1px solid #E2E8F0',
                      fontSize: 13,
                      fontFamily: 'Inter',
                      backgroundColor: '#F8FAFC',
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
                  <Text style={[styles.transactionsHeaderCell, styles.txColMethod]}>Method</Text>
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
                    <Text style={[styles.transactionsCell, styles.txColMethod]}>
                      {tx.payment_method === 'cash' ? 'CASH' : 'ONLINE'}
                    </Text>
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
      <WebLayout noCard>
        <OwnerEarningsScreenInner />
      </WebLayout>
    );
  }

  return (
    <View style={styles.nativeContainer}>
      <MobileAppNavbar title="Earnings" titleColor="#01b854" />
      <OwnerEarningsScreenInner />
    </View>
  );
}

const styles = StyleSheet.create({
  nativeContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 0 : 16,
    ...Platform.select({
      web: {
        paddingLeft: 0,
        paddingRight: 0,
        paddingTop: 0,
      },
    }),
  },
  inner: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  panel: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F5F9',
    borderWidth: 1,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  panelSecondary: {
    marginTop: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F5F9',
    borderWidth: 1,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '600',
    color: IS_WEB ? '#111827' : '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter',
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
    minWidth: IS_WEB ? 220 : '100%',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  cardValue: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  highlightCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
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
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
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
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transactionsRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: IS_WEB ? '#F3F4F6' : 'rgba(0,234,107,0.15)',
  },
  transactionsCell: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: IS_WEB ? '#111827' : '#E5E7EB',
    fontWeight: '500',
  },
  txColDate: {
    flex: 1,
  },
  txColGround: {
    flex: 2,
  },
  txColMethod: {
    width: 80,
  },
  txColAmount: {
    width: 100,
  },
  txColStatus: {
    width: 100,
    textTransform: 'capitalize',
  },
  txGroundSub: {
    fontSize: 12,
    color: IS_WEB ? '#6B7280' : '#9ca3af',
  },
  cardHighlighted: {
    borderColor: 'rgba(59, 130, 246, 0.3)',
    backgroundColor: IS_WEB ? '#f0f7ff' : '#043529',
  },
});

