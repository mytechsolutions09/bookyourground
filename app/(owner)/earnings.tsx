import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import WebLayout from '@/components/web/WebLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/helpers';
import { TrendingUp, Download, ArrowRight, Wallet, History, Info, ChevronRight } from 'lucide-react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const IS_WEB = Platform.OS === 'web';

interface EarningsStats {
  totalEarnings: number;
  thisMonthEarnings: number;
  totalConfirmedBookings: number;
}

interface VenueBreakdown {
  name: string;
  amount: number;
  percent: number;
}

interface ChartPoint {
  label: string;
  value: number;
}

function LineChart({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) return null;

  const [containerWidth, setContainerWidth] = useState(300);
  const height = 150;
  const padding = 30;
  
  const maxValue = Math.max(...data.map(d => d.value), 1000);
  const points = data.map((d, i) => ({
    x: padding + (i * (containerWidth - 2 * padding)) / (data.length - 1),
    y: height - padding - (d.value / maxValue) * (height - 2 * padding)
  }));

  const pathData = points.reduce((acc, p, i) => 
    acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), ''
  );

  return (
    <View 
      style={styles.chartContainer} 
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Svg width={containerWidth} height={height}>
        <Defs>
          <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#01b854" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#01b854" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path
          d={pathData}
          fill="none"
          stroke="#01b854"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r="5" fill="#01b854" />
        ))}
      </Svg>
      <View style={styles.chartLabels}>
        {data.map((d, i) => (
          <Text key={i} style={styles.chartLabelText}>{d.label}</Text>
        ))}
      </View>
    </View>
  );
}

function OwnerEarningsScreenInner() {
  const { user } = useAuth();
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    thisMonthEarnings: 0,
    totalConfirmedBookings: 0,
  });
  const [venueBreakdown, setVenueBreakdown] = useState<VenueBreakdown[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);

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
        .select(`
          id,
          total_amount,
          status,
          booking_date,
          payment_method,
          ground:grounds!inner(name, city, owner_id)
        `)
        .eq('ground.owner_id', user.id)
        .in('status', ['confirmed', 'completed'])
        .order('booking_date', { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as any[];
      let total = 0;
      let thisMonthTotal = 0;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const venueMap = new Map<string, number>();
      const monthMap = new Map<string, number>();

      rows.forEach((row) => {
        const amt = row.total_amount || 0;
        total += amt;
        
        const date = new Date(row.booking_date);
        const m = date.getMonth();
        const y = date.getFullYear();
        
        if (m === currentMonth && y === currentYear) {
          thisMonthTotal += amt;
        }

        const groundName = row.ground?.name || 'Other';
        venueMap.set(groundName, (venueMap.get(groundName) || 0) + amt);

        const monthKey = `${y}-${m}`;
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + amt);
      });

      setStats({
        totalEarnings: total,
        thisMonthEarnings: thisMonthTotal,
        totalConfirmedBookings: rows.length,
      });

      setVenueBreakdown(
        Array.from(venueMap.entries())
          .map(([name, amount]) => ({ name, amount, percent: total > 0 ? (amount / total) * 100 : 0 }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 4)
      );

      const trend: ChartPoint[] = [];
      for (let i = 4; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mk = `${d.getFullYear()}-${d.getMonth()}`;
        trend.push({
          label: d.toLocaleString('default', { month: 'short' }),
          value: monthMap.get(mk) || 0
        });
      }
      setChartData(trend);
      setTransactions(rows.slice(0, 5));
    } catch (e) {
      console.error('Error loading earnings:', e);
    } finally {
      setLoading(false);
    }
  };

  const renderLeftColumn = () => (
    <View style={styles.leftCol}>
      <View style={styles.totalEarningsCard}>
        <View>
          <Text style={styles.totalEarningsLabel}>Total Earnings</Text>
          <Text style={styles.totalEarningsValue}>{formatCurrency(stats.totalEarnings)}</Text>
          <Text style={styles.monthlySubtext}>
            This Month: <Text style={{ fontWeight: '700' }}>{formatCurrency(stats.thisMonthEarnings)}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { width: 100 }]}>Date</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>Description</Text>
            <Text style={[styles.headerText, { width: 80, textAlign: 'right' }]}>Status</Text>
          </View>
          {transactions.map((tx) => (
            <View key={tx.id} style={styles.tableRow}>
              <Text style={[styles.cellText, { width: 100 }]}>
                {new Date(tx.booking_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
              </Text>
              <Text style={[styles.cellText, { flex: 1 }]} numberOfLines={1}>
                Booking - {tx.ground?.name}
              </Text>
              <View style={[styles.statusBadge, { width: 80 }]}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Paid</Text>
              </View>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.withdrawBtn}>
          <Text style={styles.withdrawBtnText}>Withdraw Funds</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Upcoming Payouts</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { width: 140 }]}>Scheduled Date</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>Amount</Text>
            <Text style={[styles.headerText, { width: 100, textAlign: 'right' }]}>Status</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.cellText, { width: 140 }]}>Nov 15, 2024</Text>
            <Text style={[styles.cellText, { flex: 1 }]}>₹15,000</Text>
            <View style={[styles.statusBadge, { width: 100 }]}>
              <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.statusText}>Pending</Text>
            </View>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.cellText, { width: 140 }]}>Dec 01, 2024</Text>
            <Text style={[styles.cellText, { flex: 1 }]}>₹28,500</Text>
            <View style={[styles.statusBadge, { width: 100 }]}>
              <View style={[styles.statusDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.statusText}>Scheduled</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderRightColumn = () => (
    <View style={styles.rightCol}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Earnings Analytics</Text>
        <LineChart data={chartData} />
        
        <View style={styles.divider} />
        
        <Text style={styles.sectionTitle}>Breakdown by Venue</Text>
        <View style={styles.venueList}>
          {venueBreakdown.map((v, i) => (
            <View key={i} style={styles.venueItem}>
               <View style={styles.venueInfo}>
                 <Text style={styles.venueName} numberOfLines={1}>{v.name}:</Text>
                 <Text style={styles.venueAmount}>{formatCurrency(v.amount)} ({Math.round(v.percent)}%)</Text>
               </View>
               <View style={styles.progressBg}>
                 <View style={[styles.progressFill, { width: `${v.percent}%`, backgroundColor: i === 3 ? '#EF4444' : '#01b854' }]} />
               </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.downloadBtn}>
          <Text style={styles.downloadBtnText}>Download Report</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recent Activity Feed</Text>
        <View style={styles.activityFeed}>
          <View style={styles.activityItem}>
            <View style={styles.activityDot} />
            <Text style={styles.activityText}>
              <Text style={{ fontWeight: '700' }}>Today, 11:23 AM:</Text> New booking received for Metro Sports Complex (₹3,500)
            </Text>
          </View>
          <View style={styles.activityItem}>
            <View style={styles.activityDot} />
            <Text style={styles.activityText}>
              <Text style={{ fontWeight: '700' }}>Yesterday, 08:15 PM:</Text> Payout of ₹10,000 processed to your bank account
            </Text>
          </View>
          <View style={styles.activityItem}>
            <View style={styles.activityDot} />
            <Text style={styles.activityText}>
              <Text style={{ fontWeight: '700' }}>Nov 01, 2024:</Text> Lakeside Turf maintenance scheduled for next week
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView 
      style={styles.root}
      showsVerticalScrollIndicator={false}
      // @ts-ignore - web-only style to hide scrollbar
      contentContainerStyle={[
        styles.scrollContent,
        Platform.OS === 'web' && { scrollbarWidth: 'none', msOverflowStyle: 'none' } as any
      ]}
    >
      <View style={[styles.layoutRow, !IS_WEB && { flexDirection: 'column' }]}>
        {renderLeftColumn()}
        {renderRightColumn()}
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
      <MobileAppNavbar title="Earnings" titleColor="#043529" lightBg />
      <ScrollView refreshControl={<RefreshControl refreshing={false} />}>
        <OwnerEarningsScreenInner />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  root: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  scrollContent: {
    // Moved padding to individual columns
    paddingBottom: 60,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 24,
    fontFamily: 'Inter',
  },
  layoutRow: {
    flexDirection: 'row',
    gap: 24,
  },
  leftCol: {
    flex: 1.5,
    gap: 24,
    paddingLeft: 0,
    paddingTop: 0,
    paddingRight: 12, // Half of gap to keep spacing even
  },
  rightCol: {
    flex: 1,
    gap: 24,
    paddingTop: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingBottom: IS_WEB ? 24 : 16,
  },
  totalEarningsCard: {
    backgroundColor: '#d9f99d', // Light lime green
    borderRadius: 24,
    padding: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalEarningsLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#043529',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  totalEarningsValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#043529',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  monthlySubtext: {
    fontSize: 16,
    color: '#043529',
    opacity: 0.8,
    fontFamily: 'Inter',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
    fontFamily: 'Inter',
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  cellText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    fontFamily: 'Inter',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  withdrawBtn: {
    backgroundColor: '#d9f99d',
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  withdrawBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#043529',
  },
  downloadBtn: {
    backgroundColor: '#d9f99d',
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  downloadBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#043529',
  },
  chartContainer: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  chartLabelText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 24,
  },
  venueList: {
    gap: 16,
  },
  venueItem: {
    gap: 8,
  },
  venueInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  venueName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  venueAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  progressBg: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  activityFeed: {
    gap: 16,
    backgroundColor: '#fefce8', // Very light greenish/yellow tint like mockup
    padding: 16,
    borderRadius: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  activityText: {
    fontSize: 14,
    color: '#1E293B',
    fontFamily: 'Inter',
    lineHeight: 20,
    flex: 1,
  },
});


