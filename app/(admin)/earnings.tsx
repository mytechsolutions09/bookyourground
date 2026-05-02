import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, RefreshControl, TextInput, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { Search, TrendingUp, Users, Filter, Download, ArrowRight, Wallet, History, ChevronRight } from 'lucide-react-native';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

const IS_WEB = Platform.OS === 'web';

interface EarningStats {
  totalEarnings: number;
  thisMonthEarnings: number;
  totalBookings: number;
}

interface OwnerOption {
  id: string;
  full_name: string;
  business_name?: string;
  email: string;
}

interface ChartPoint {
  label: string;
  value: number;
}

function LineChart({ data, height = 150 }: { data: ChartPoint[], height?: number }) {
  const [containerWidth, setContainerWidth] = useState(300);
  if (data.length === 0) return null;

  const padding = { top: 24, bottom: 36, left: 0, right: 16 };

  const maxValue = Math.max(...data.map(d => d.value), 1000);
  const lastDay = parseInt(data[data.length - 1].label);
  const firstDay = 1;
  const dayRange = Math.max(lastDay - firstDay, 1);

  const chartW = containerWidth - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const toX = (day: number) => padding.left + ((day - firstDay) / dayRange) * chartW;
  const toY = (val: number) => padding.top + chartH - (val / maxValue) * chartH;

  const points = data.map(d => ({
    x: toX(parseInt(d.label)),
    y: toY(d.value),
  }));

  const smoothPath = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpX = (prev.x + p.x) / 2;
    return acc + ` C ${cpX} ${prev.y}, ${cpX} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const areaPath = smoothPath + ` L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;
  const lastPt = points[points.length - 1];

  return (
    <View style={{ flexDirection: 'row', width: '100%' }}>
      <View style={{ height, width: 82, position: 'relative' }}>
        <View style={{ position: 'absolute', top: padding.top - 10, right: 8, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 9, color: '#01b854', fontWeight: '800' }}>Max</Text>
          <Text style={{ fontSize: 10, color: '#0F172A', fontWeight: '700' }}>{formatCurrency(maxValue)}</Text>
        </View>
        <View style={{ position: 'absolute', top: padding.top + chartH - 7, right: 8, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 9, color: '#64748B', fontWeight: '600' }}>₹0</Text>
        </View>
      </View>
      <View style={{ flex: 1, height }} onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}>
        <Svg width={containerWidth} height={height}>
          <Defs>
            <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#01b854" stopOpacity="0.18" />
              <Stop offset="100%" stopColor="#01b854" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path d={areaPath} fill="url(#areaGrad)" />
          <Path d={smoothPath} fill="none" stroke="#01b854" strokeWidth="3" strokeLinecap="round" />
          {points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r="3" fill="#01b854" />)}
          <Circle cx={lastPt.x} cy={lastPt.y} r="8" fill="#01b854" fillOpacity="0.15" />
          <Circle cx={lastPt.x} cy={lastPt.y} r="4" fill="#01b854" />
        </Svg>
      </View>
    </View>
  );
}

import { useAuth } from '@/contexts/AuthContext';

function AdminEarningsInner() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('all');
  const [stats, setStats] = useState<any>({ 
    totalEarnings: 0, 
    thisMonthEarnings: 0, 
    totalBookings: 0,
    totalFees: 0,
    totalNet: 0 
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [venueBreakdown, setVenueBreakdown] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'overview' | 'transactions' | 'analytics' | 'payouts'>('overview');
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      // 1. Load Owners
      const { data: ownersData } = await supabase
        .from('profiles')
        .select('id, full_name, business_name, email')
        .in('role', ['ground_owner', 'super_admin'])
        .order('full_name');
      setOwners(ownersData || []);

      // 2. Load Bookings based on filter
      let query = supabase
        .from('bookings')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          payment_method,
          platform_fee_owner,
          gst_owner,
          owner_settlement,
          ground:grounds!inner(id, name, owner_id)
        `)
        .in('status', ['confirmed', 'completed']);

      if (selectedOwnerId !== 'all') {
        query = query.eq('ground.owner_id', selectedOwnerId);
      }

      const { data: bookings, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      // 3. Load Withdrawals
      let wQuery = supabase
        .from('withdrawals')
        .select('*');
      if (selectedOwnerId !== 'all') {
        wQuery = wQuery.eq('owner_id', selectedOwnerId);
      }
      const { data: wData } = await wQuery.order('created_at', { ascending: false });
      setWithdrawals(wData || []);

      // 4. Process Stats
      let total = 0;
      let monthTotal = 0;
      let totalFees = 0;
      let totalNet = 0;
      const now = new Date();
      const curMonth = now.getMonth();
      const curYear = now.getFullYear();
      const dayMap = new Map<number, number>();
      const venueMap = new Map<string, number>();

      bookings?.forEach(b => {
        const amt = b.total_amount || 0;
        const fee = (b.platform_fee_owner || 0) + (b.gst_owner || 0);
        const net = b.owner_settlement || (amt - fee);

        total += amt;
        totalFees += fee;
        totalNet += net;

        const date = new Date(b.created_at);
        if (date.getMonth() === curMonth && date.getFullYear() === curYear) {
          monthTotal += amt;
          dayMap.set(date.getDate(), (dayMap.get(date.getDate()) || 0) + amt);
        }

        const gName = b.ground?.name || 'Unknown';
        venueMap.set(gName, (venueMap.get(gName) || 0) + amt);
      });

      setStats({
        totalEarnings: total,
        thisMonthEarnings: monthTotal,
        totalBookings: bookings?.length || 0,
        totalFees,
        totalNet
      });

      setTransactions(bookings || []);

      // 5. Process Chart
      const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
      const todayDay = now.getDate();
      const trend: ChartPoint[] = [];
      let running = 0;
      for (let i = 1; i <= todayDay; i++) {
        running += (dayMap.get(i) || 0);
        trend.push({ label: i.toString(), value: running });
      }
      setChartData(trend);

      // 6. Venue Breakdown
      const breakdown = Array.from(venueMap.entries())
        .map(([name, amount]) => ({ name, amount, percent: total > 0 ? (amount / total) * 100 : 0 }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
      setVenueBreakdown(breakdown);

    } catch (e) {
      console.error('Error loading admin earnings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [selectedOwnerId, user, authLoading]);

  const renderOverview = () => {
    const isFiltered = selectedOwnerId !== 'all';
    const selectedOwner = owners.find(o => o.id === selectedOwnerId);
    
    return (
      <View style={styles.layoutRow}>
        <View style={styles.mainCol}>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#d9f99d' }]}>
              <Text style={styles.statLabel}>{isFiltered ? 'Owner Gross Revenue' : 'Total Platform Volume'}</Text>
              <Text style={styles.statValue}>{formatCurrency(stats.totalEarnings)}</Text>
              <View style={styles.statTrend}>
                 <TrendingUp size={14} color="#043529" />
                 <Text style={styles.statTrendText}>{isFiltered ? selectedOwner?.full_name : 'Platform Wide'}</Text>
              </View>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.statLabel, { color: '#991B1B' }]}>{isFiltered ? 'Your Commission' : 'Platform Earnings'}</Text>
              <Text style={[styles.statValue, { color: '#991B1B' }]}>{formatCurrency(stats.totalFees)}</Text>
              <View style={styles.statTrend}>
                 <TrendingUp size={14} color="#991B1B" />
                 <Text style={[styles.statTrendText, { color: '#991B1B' }]}>Fees & Taxes</Text>
              </View>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#F0F9FF' }]}>
              <Text style={[styles.statLabel, { color: '#0369A1' }]}>{isFiltered ? 'Net Settlement' : 'Owner Net Pool'}</Text>
              <Text style={[styles.statValue, { color: '#0369A1' }]}>{formatCurrency(stats.totalNet)}</Text>
              <View style={styles.statTrend}>
                 <TrendingUp size={14} color="#0369A1" />
                 <Text style={[styles.statTrendText, { color: '#0369A1' }]}>Payable to Owners</Text>
              </View>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#F5F3FF' }]}>
              <Text style={[styles.statLabel, { color: '#6D28D9' }]}>Total Bookings</Text>
              <Text style={[styles.statValue, { color: '#6D28D9' }]}>{stats.totalBookings}</Text>
              <View style={styles.statTrend}>
                 <TrendingUp size={14} color="#6D28D9" />
                 <Text style={[styles.statTrendText, { color: '#6D28D9' }]}>Completed</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Performance Analytics</Text>
            <LineChart data={chartData} />
          </View>
        </View>

      <View style={styles.sideCol}>
         <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Revenue by Venue</Text>
            <View style={styles.venueList}>
              {venueBreakdown.map((v, i) => (
                <View key={i} style={styles.venueItem}>
                  <View style={styles.venueInfo}>
                    <Text style={styles.venueName} numberOfLines={1}>{v.name}</Text>
                    <Text style={styles.venueAmount}>{formatCurrency(v.amount)}</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${v.percent}%`, backgroundColor: '#d9f99d' }]} />
                  </View>
                </View>
              ))}
            </View>
         </View>
      </View>
    </View>
    );
  };

  const renderTransactions = () => (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        <Download size={18} color="#64748B" />
      </View>
      
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, { width: 120 }]}>Date & Time</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Venue</Text>
          <Text style={[styles.headerText, { width: 80, textAlign: 'right' }]}>Gross</Text>
          <Text style={[styles.headerText, { width: 80, textAlign: 'right' }]}>Fee</Text>
          <Text style={[styles.headerText, { width: 100, textAlign: 'right' }]}>Net</Text>
        </View>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>No data for this selection</Text>
        ) : (
          transactions.map(tx => (
            <View key={tx.id} style={styles.tableRow}>
               <View style={{ width: 120 }}>
                <Text style={styles.cellTextMain}>{new Date(tx.created_at).toLocaleDateString()}</Text>
                <Text style={styles.cellTextSub}>{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {tx.payment_method?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cellTextMain, { color: '#01b854' }]} numberOfLines={1}>{tx.ground?.name}</Text>
                <Text style={styles.cellTextSub}>ID: #{tx.id.substring(0,8).toUpperCase()}</Text>
              </View>
              <Text style={[styles.cellTextMain, { width: 80, textAlign: 'right' }]}>{formatCurrency(tx.total_amount)}</Text>
              <Text style={[styles.cellTextSub, { width: 80, textAlign: 'right', color: '#EF4444' }]}>
                -{formatCurrency((tx.platform_fee_owner || 0) + (tx.gst_owner || 0))}
              </Text>
              <Text style={[styles.cellTextMain, { width: 100, textAlign: 'right', color: '#01b854' }]}>
                {formatCurrency(tx.owner_settlement || tx.total_amount)}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );

  const renderPayouts = () => (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Payouts & Withdrawals</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, { width: 120 }]}>Date</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Method</Text>
          <Text style={[styles.headerText, { width: 100, textAlign: 'right' }]}>Amount</Text>
          <Text style={[styles.headerText, { width: 100, textAlign: 'right' }]}>Status</Text>
        </View>
        {withdrawals.length === 0 ? (
          <Text style={styles.emptyText}>No payout history found.</Text>
        ) : (
          withdrawals.map(w => (
            <View key={w.id} style={styles.tableRow}>
              <Text style={[styles.cellTextMain, { width: 120 }]}>{new Date(w.created_at).toLocaleDateString()}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cellTextMain}>{w.payment_method?.toUpperCase()}</Text>
                <Text style={styles.cellTextSub}>{w.account_details?.upi_id || w.account_details?.account_number || 'N/A'}</Text>
              </View>
              <Text style={[styles.cellTextMain, { width: 100, textAlign: 'right' }]}>{formatCurrency(w.amount)}</Text>
              <View style={{ width: 100, alignItems: 'flex-end' }}>
                <View style={[styles.statusBadge, { backgroundColor: w.status === 'completed' ? '#DCFCE7' : '#FEF3C7' }]}>
                  <Text style={[styles.statusBadgeText, { color: w.status === 'completed' ? '#15803D' : '#92400E' }]}>
                    {w.status?.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
    >
      <View style={styles.content}>
        {/* Header Row: Filter + Tabs */}
        <View style={styles.headerRow}>
          <View style={styles.filterCard}>
            <View style={styles.ownerPickerContainer}>
              {IS_WEB ? (
                <select
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  style={styles.webSelect}
                >
                  <option value="all">All Ground Owners</option>
                  {owners.map(o => (
                    <option key={o.id} value={o.id}>{o.full_name} {o.business_name ? `(${o.business_name})` : ''}</option>
                  ))}
                </select>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ownerPills}>
                  <TouchableOpacity 
                    style={[styles.ownerPill, selectedOwnerId === 'all' && styles.ownerPillActive]}
                    onPress={() => setSelectedOwnerId('all')}
                  >
                    <Text style={[styles.ownerPillText, selectedOwnerId === 'all' && styles.ownerPillTextActive]}>All Owners</Text>
                  </TouchableOpacity>
                  {owners.map(o => (
                    <TouchableOpacity 
                      key={o.id}
                      style={[styles.ownerPill, selectedOwnerId === o.id && styles.ownerPillActive]}
                      onPress={() => setSelectedOwnerId(o.id)}
                    >
                      <Text style={[styles.ownerPillText, selectedOwnerId === o.id && styles.ownerPillTextActive]}>{o.full_name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>

          <View style={styles.tabBar}>
            <TouchableOpacity 
              style={[styles.tabButton, viewMode === 'overview' && styles.tabButtonActive]}
              onPress={() => setViewMode('overview')}
            >
              <Text style={[styles.tabButtonText, viewMode === 'overview' && styles.tabButtonTextActive]}>Overview</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, viewMode === 'transactions' && styles.tabButtonActive]}
              onPress={() => setViewMode('transactions')}
            >
              <Text style={[styles.tabButtonText, viewMode === 'transactions' && styles.tabButtonTextActive]}>Transactions</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, viewMode === 'analytics' && styles.tabButtonActive]}
              onPress={() => setViewMode('analytics')}
            >
              <Text style={[styles.tabButtonText, viewMode === 'analytics' && styles.tabButtonTextActive]}>Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, viewMode === 'payouts' && styles.tabButtonActive]}
              onPress={() => setViewMode('payouts')}
            >
              <Text style={[styles.tabButtonText, viewMode === 'payouts' && styles.tabButtonTextActive]}>Payouts</Text>
            </TouchableOpacity>
          </View>
        </View>

        {viewMode === 'overview' && renderOverview()}
        {viewMode === 'transactions' && renderTransactions()}
        {viewMode === 'analytics' && renderOverview()} {/* Reusing for now, can expand later */}
        {viewMode === 'payouts' && renderPayouts()}
      </View>
    </ScrollView>
  );
}

export default function AdminEarningsScreen() {
  return (
    <>
      {Platform.OS === 'web' ? (
        <WebLayout>
          <AdminEarningsInner />
        </WebLayout>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <MobileAppNavbar title="PLATFORM EARNINGS" titleColor="#043529" lightBg />
          <AdminEarningsInner />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  content: {
    width: '100%',
    paddingVertical: 24,
    paddingRight: 24,
    paddingLeft: 40,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
    width: '100%',
  },
  filterCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: 280,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ownerPickerContainer: {
    width: '100%',
  },
  webSelect: {
    width: '100%',
    padding: 8,
    borderRadius: 8,
    border: '1px solid #E2E8F0',
    backgroundColor: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#0F172A',
    outline: 'none',
  },
  ownerPills: {
    gap: 8,
    paddingRight: 20,
  },
  ownerPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ownerPillActive: {
    backgroundColor: '#d9f99d',
    borderColor: '#d9f99d',
  },
  ownerPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  ownerPillTextActive: {
    color: '#043529',
  },
  layoutRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 24,
  },
  mainCol: {
    flex: 1.5,
    gap: 24,
  },
  sideCol: {
    flex: 1,
    gap: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 200,
    borderRadius: 24,
    padding: 24,
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#043529',
    marginBottom: 4,
    opacity: 0.8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#043529',
    marginBottom: 8,
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statTrendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#043529',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  cellTextMain: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  cellTextSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '600',
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
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  activityFeed: {
    gap: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#01b854',
  },
  activityText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
    lineHeight: 18,
  },
  emptyText: {
    textAlign: 'center',
    padding: 40,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  tabBar: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 16,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  tabButtonTextActive: {
    color: '#01b854',
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-end',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
