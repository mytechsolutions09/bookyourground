import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Modal, TextInput as RNTextInput, useWindowDimensions, Animated, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import WebLayout from '@/components/web/WebLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/helpers';
import { TrendingUp, Download, ArrowRight, Wallet, History, Info, ChevronRight, X, CheckCircle2, AlertCircle } from 'lucide-react-native';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";

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

interface WalletData {
  id: string;
  balance: number;
}

function LineChart({ data, height = 150 }: { data: ChartPoint[], height?: number }) {
  const [containerWidth, setContainerWidth] = useState(300);
  if (data.length === 0) return null;

  if (Platform.OS === 'web') {
    return (
      <View style={{ height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e2" />
            <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
            <RechartsTooltip
              formatter={(value: any) => `₹${Number(value).toFixed(2)}`}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e5ece7",
                backgroundColor: "#ffffff",
                fontSize: 11,
                padding: "8px 12px",
              }}
              itemStyle={{ fontSize: 11, padding: 0 }}
              labelStyle={{ fontSize: 11, fontWeight: 'bold', marginBottom: 2 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#01b854"
              strokeWidth={2}
              dot={{ r: 4, fill: "#a5ff8a", stroke: "#01b854", strokeWidth: 1.5 }}
              activeDot={{ r: 6 }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </View>
    );
  }

  const padding = { top: 24, bottom: 36, left: 0, right: 16 };

  const maxValue = Math.max(...data.map(d => d.value), 1000);

  // Use ACTUAL day range: day 1 → last data point day
  const lastDay = parseInt(data[data.length - 1].label);
  const firstDay = 1;
  const dayRange = Math.max(lastDay - firstDay, 1);

  const chartW = containerWidth - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const toX = (day: number) =>
    padding.left + ((day - firstDay) / dayRange) * chartW;
  const toY = (val: number) =>
    padding.top + chartH - (val / maxValue) * chartH;

  const points = data.map(d => ({
    x: toX(parseInt(d.label)),
    y: toY(d.value),
  }));

  // Smooth bezier path
  const smoothPath = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpX = (prev.x + p.x) / 2;
    return acc + ` C ${cpX} ${prev.y}, ${cpX} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  // Closed area path for gradient fill
  const areaPath =
    smoothPath +
    ` L ${points[points.length - 1].x} ${padding.top + chartH}` +
    ` L ${points[0].x} ${padding.top + chartH} Z`;

  // X-axis label days: spread across actual range
  const labelDays = Array.from(new Set([
    firstDay,
    ...Array.from({ length: 4 }, (_, i) => Math.round(firstDay + ((lastDay - firstDay) * (i + 1)) / 5)),
    lastDay,
  ]));

  const lastPt = points[points.length - 1];

  return (
    <View style={{ flexDirection: 'row', width: '100%' }}>
      {/* Y Axis labels */}
      <View style={{ height, width: 82, position: 'relative' }}>
        <View style={{ position: 'absolute', top: padding.top - 10, right: 8, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 9, color: '#01b854', fontWeight: '800' }}>Total</Text>
          <Text style={{ fontSize: 10, color: '#0F172A', fontWeight: '700' }}>{formatCurrency(maxValue)}</Text>
        </View>
        <View style={{ position: 'absolute', top: padding.top + chartH / 2 - 7, right: 8, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 9, color: '#64748B', fontWeight: '600' }}>{formatCurrency(maxValue / 2)}</Text>
        </View>
        <View style={{ position: 'absolute', top: padding.top + chartH - 7, right: 8, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 9, color: '#64748B', fontWeight: '600' }}>₹0</Text>
        </View>
      </View>

      {/* Chart */}
      <View
        style={{ flex: 1, height }}
        onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <Svg width={containerWidth} height={height}>
          <Defs>
            <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#01b854" stopOpacity="0.18" />
              <Stop offset="100%" stopColor="#01b854" stopOpacity="0" />
            </SvgGradient>
          </Defs>

          {/* Grid lines */}
          {[0, 0.5, 1].map((frac, i) => {
            const y = padding.top + chartH * frac;
            return (
              <Path
                key={i}
                d={`M ${padding.left} ${y} L ${containerWidth - padding.right} ${y}`}
                stroke="#E2E8F0"
                strokeWidth="1"
                strokeDasharray={i === 2 ? undefined : '4,4'}
              />
            );
          })}

          {/* Area fill */}
          <Path d={areaPath} fill="url(#areaGrad)" />

          {/* Line */}
          <Path
            d={smoothPath}
            fill="none"
            stroke="#01b854"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots on each point */}
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r="4" fill="#01b854" />
          ))}

          {/* Pulse ring on last point */}
          <Circle cx={lastPt.x} cy={lastPt.y} r="9" fill="#01b854" fillOpacity="0.15" />
          <Circle cx={lastPt.x} cy={lastPt.y} r="5" fill="#01b854" />

          {/* X-axis labels */}
          {labelDays.map(day => (
            <SvgText
              key={day}
              x={toX(day)}
              y={height - 4}
              fontSize="10"
              fill="#64748B"
              textAnchor="middle"
              fontWeight="500"
            >
              {day}
            </SvgText>
          ))}
        </Svg>
      </View>
    </View>
  );
}

function OwnerEarningsScreenInner() {
  const { user, profile } = useAuth();
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  
  useEffect(() => {
    if (profile?.role === 'super_admin') {
      router.replace('/(admin)/earnings');
    }
  }, [profile]);
  const isStacking = width < 768; // Stack columns below this width
  const isUltraNarrow = width < 350;

  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  const isTablet = width >= 600 && width < 900;
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    thisMonthEarnings: 0,
    totalConfirmedBookings: 0,
  });
  const [venueBreakdown, setVenueBreakdown] = useState<VenueBreakdown[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [onlineEarnings, setOnlineEarnings] = useState(0);
  const [offlineEarnings, setOfflineEarnings] = useState(0);
  const [storeCredits, setStoreCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isBankVerified, setIsBankVerified] = useState(false);
  const [bankDetailsLoaded, setBankDetailsLoaded] = useState(false);
  const { tab } = useLocalSearchParams<{ tab: string }>();
  const [viewMode, setViewMode] = useState<'preview' | 'summary' | 'analytics' | 'payouts'>((tab as any) || 'preview');
  const [payoutSubTab, setPayoutSubTab] = useState<'requests' | 'history'>('requests');
  const [analyticsFilter, setAnalyticsFilter] = useState<'hours' | 'days' | 'weeks'>('days');

  useEffect(() => {
    if (tab && (tab === 'preview' || tab === 'summary' || tab === 'analytics' || tab === 'payouts')) {
      setViewMode(tab as any);
    }
  }, [tab]);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'upi'>('bank');
  const [upiId, setUpiId] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [upcomingPayouts, setUpcomingPayouts] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [limit, setLimit] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [filterVenueId, setFilterVenueId] = useState<string | null>(null);
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<'all' | 'online' | 'cash'>('all');
  const [filterDateRange, setFilterDateRange] = useState<'all' | '7days' | '30days' | 'month'>('all');
  const [ownerGrounds, setOwnerGrounds] = useState<any[]>([]);

  const pendingAmount = upcomingPayouts.reduce((acc, w) => acc + (w.amount || 0), 0);
  const withdrawableBalance = (wallet?.balance || 0) - pendingAmount;

  useEffect(() => {
    if (user) {
      const fetchGrounds = async () => {
        const { data } = await supabase
          .from('grounds')
          .select('id, name')
          .eq('owner_id', user.id);
        if (data) setOwnerGrounds(data);
      };
      fetchGrounds();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadEarnings(limit, filterVenueId, filterPaymentMethod, filterDateRange);
    }
  }, [filterVenueId, filterPaymentMethod, filterDateRange, analyticsFilter]);

  const handleDownloadReport = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          created_at,
          total_amount,
          platform_fee_owner,
          gst_owner,
          payment_method,
          status,
          ground:grounds!inner(name, city, owner_id)
        `)
        .eq('ground.owner_id', user.id)
        .in('status', ['confirmed', 'completed'])
        .gte('created_at', firstDay)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        alert('No confirmed earnings found for this month.');
        return;
      }

      // Generate CSV
      const headers = ['Date', 'Venue', 'Location', 'Payment Method', 'Gross Amount', 'Platform Fee & GST', 'Net Earnings'];
      const rows = data.map(tx => {
        const fees = Number(tx.platform_fee_owner || 0) + Number(tx.gst_owner || 0);
        const net = tx.total_amount - fees;
        return [
          new Date(tx.created_at).toLocaleDateString(),
          tx.ground?.name || 'Unknown',
          tx.ground?.city || 'N/A',
          tx.payment_method || 'Online',
          tx.total_amount.toString(),
          fees.toString(),
          net.toString()
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `earnings_report_${now.toLocaleString('default', { month: 'short' })}_${now.getFullYear()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Report generated! (Native sharing integration coming soon)');
      }
    } catch (err) {
      console.error('Error downloading report:', err);
      alert('Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch is now handled by the filter-dependent useEffect below
  }, [user]);

  const loadEarnings = async (
    newLimit = limit, 
    venueId = filterVenueId, 
    method = filterPaymentMethod, 
    dateRange = filterDateRange
  ) => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data: walletData } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .single();

      // Check bank verification status
      const { data: bankData } = await supabase
        .from('owner_bank_details')
        .select('is_approved, bank_name, account_number, ifsc, upi_id')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      if (bankData) {
        setIsBankVerified(!!bankData.is_approved);
        setBankName(bankData.bank_name || '');
        setAccountNumber(bankData.account_number || '');
        setIfscCode(bankData.ifsc || '');
        setUpiId(bankData.upi_id || '');
      }
      setBankDetailsLoaded(true);
      
      if (walletData) {
        setWallet(walletData);
      }

      let query = supabase
        .from('bookings')
        .select(`
          id,
          total_amount,
          status,
          booking_date,
          start_time,
          end_time,
          created_at,
          payment_method,
          platform_fee_owner,
          gst_owner,
          payout_status,
          payout_processed_at,
          ground_price,
          payment_received,
          ground:grounds!inner(name, city, owner_id)
        `)
        .eq('ground.owner_id', user.id)
        .in('status', ['confirmed', 'completed']);

      if (venueId) {
        query = query.eq('ground_id', venueId);
      }
      if (method === 'online') {
        query = query.neq('payment_method', 'cash');
      } else if (method === 'cash') {
        query = query.eq('payment_method', 'cash');
      }

      if (dateRange === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        query = query.gte('created_at', d.toISOString());
      } else if (dateRange === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        query = query.gte('created_at', d.toISOString());
      } else if (dateRange === 'month') {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        query = query.gte('created_at', firstDay);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(newLimit + 1);

      if (error) throw error;

      const rows = (data ?? []) as any[];
      const limitedRows = rows.slice(0, newLimit);
      setHasMore(rows.length > newLimit);
      setTransactions(limitedRows);

      const { data: allData } = await supabase
        .from('bookings')
        .select('total_amount, platform_fee_owner, gst_owner, created_at, payment_method, payment_received, status, ground_price, ground:grounds!inner(name, city, owner_id)')
        .eq('ground.owner_id', user.id)
        .in('status', ['confirmed', 'completed']);

      const allRows = (allData ?? []) as any[];
      let total = 0;
      let onlineEarningsTotal = 0;
      let offlineEarningsTotal = 0;
      let storeCreditsTotal = 0;
      let thisMonthTotal = 0;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const venueMap = new Map<string, number>();
      const dayMap = new Map<number, number>();
      const hourMap = new Map<number, number>();
      const weekMap = new Map<number, number>();

      let withdrawablePool = 0;
      allRows.forEach((row) => {
        const netAmt = (row.total_amount || 0) - (Number(row.platform_fee_owner || 0) + Number(row.gst_owner || 0));
        const fee = (Number(row.platform_fee_owner || 0) + Number(row.gst_owner || 0));
        total += netAmt;

        if (row.payment_method === 'cash') {
          if (row.payment_received) {
            offlineEarningsTotal += netAmt;
          }
        } else if (row.payment_method === 'wallet' || row.payment_method === 'credits') {
          storeCreditsTotal += netAmt;
        } else {
          // Online payments are considered received if they are confirmed/completed
          onlineEarningsTotal += netAmt;
        }

        // Withdrawable balance calculation: only for "completed" events
        if (row.status === 'completed') {
          const isOnline = row.payment_method && row.payment_method !== 'cash';
          const revenue = Number(row.ground_price || row.total_amount || 0);
          
          if (isOnline) {
            withdrawablePool += (revenue - fee);
          } else {
            // Offline event: deduct fee from online pool
            withdrawablePool -= fee;
          }
        }
        
        const date = new Date(row.created_at);
        const h = date.getHours();
        const d = date.getDate();
        const m = date.getMonth();
        const y = date.getFullYear();
        
        if (m === currentMonth && y === currentYear) {
          thisMonthTotal += netAmt;
          dayMap.set(d, (dayMap.get(d) || 0) + netAmt);
          
          hourMap.set(h, (hourMap.get(h) || 0) + netAmt);
          
          const week = Math.ceil(d / 7);
          weekMap.set(week, (weekMap.get(week) || 0) + netAmt);
        }

        let groundName = 'Other';
        if (row.ground) {
          if (Array.isArray(row.ground)) {
            groundName = row.ground[0]?.name || 'Other';
          } else if (typeof row.ground.name === 'object' && row.ground.name !== null) {
            groundName = row.ground.name.name || 'Other';
          } else {
            groundName = row.ground.name || 'Other';
          }
        }
        
        const safeName = typeof groundName === 'string' ? groundName : 'Other';
        venueMap.set(safeName, (venueMap.get(safeName) || 0) + netAmt);
      });

      const newStats = {
        totalEarnings: total,
        thisMonthEarnings: thisMonthTotal,
        totalConfirmedBookings: allRows.length,
      };

      setStats(newStats);
      setVenueBreakdown(
        Array.from(venueMap.entries())
          .map(([name, amount]) => ({ name, amount, percent: total > 0 ? (amount / total) * 100 : 0 }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 4)
      );
      setOnlineEarnings(onlineEarningsTotal);
      setOfflineEarnings(offlineEarningsTotal);
      setStoreCredits(storeCreditsTotal);

      // --- AUTOMATIC WALLET SYNC LOGIC ---
      // Calculate what the balance SHOULD be: (All Online Earnings) - (All Completed Withdrawals)
      const { data: completedWithdrawals } = await supabase
        .from('withdrawals')
        .select('amount')
        .eq('owner_id', user.id)
        .eq('status', 'completed');
      
      const totalWithdrawn = (completedWithdrawals || []).reduce((acc, w) => acc + (w.amount || 0), 0);
      const expectedBalance = withdrawablePool - totalWithdrawn;
      
      const currentWalletBalance = walletData?.balance || 0;

      // FIX: If the balance is exactly double (common symptom of double-sync), deduct the extra
      if (currentWalletBalance === (onlineEarningsTotal * 2) - totalWithdrawn && onlineEarningsTotal > 0) {
          console.log("Correcting double-sync error...");
          await supabase.rpc('add_money_to_wallet', {
            target_user_id: user.id,
            amount_to_add: -onlineEarningsTotal,
            description_text: 'Correction: Double-sync deduction',
            ref_type: 'system_correction',
            ref_id: user.id
          });
          setWallet({ id: walletData?.id || '', balance: onlineEarningsTotal - totalWithdrawn });
      }
      // Normal Sync: If the wallet balance is out of sync (lower than expected), update it
      else if (Math.abs(currentWalletBalance - expectedBalance) > 0.01) {
        const difference = expectedBalance - currentWalletBalance;
        console.log(`Syncing wallet: Adjusting by ${difference} to match expected balance.`);
        
        // Use a reference that is unique to this balance state to prevent duplicate syncs for the same state
        const syncRef = `${user.id}_bal_${expectedBalance.toFixed(2)}`; 
        
        const { error: syncError } = await supabase.rpc('add_money_to_wallet', {
          target_user_id: user.id,
          amount_to_add: difference,
          description_text: 'Automatic Wallet-Earnings Synchronization',
          ref_type: 'system_sync',
          ref_id: syncRef
        });

        if (!syncError) {
          setWallet({ id: walletData?.id || '', balance: expectedBalance });
        } else {
          console.error('Wallet sync RPC failed:', syncError);
          if (walletData) setWallet(walletData);
        }
      } else if (walletData) {
        setWallet(walletData);
      }
      // ------------------------------------

      const trend: ChartPoint[] = [];
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const todayDay = now.getDate();
      
      if (analyticsFilter === 'days') {
        let runningTotal = 0;
        for (let i = 1; i <= daysInMonth; i++) {
          runningTotal += (dayMap.get(i) || 0);
          if (i <= todayDay) {
            trend.push({
              label: i.toString(),
              value: runningTotal
            });
          }
        }
      } else if (analyticsFilter === 'weeks') {
        let runningTotal = 0;
        for (let i = 1; i <= 5; i++) {
          runningTotal += (weekMap.get(i) || 0);
          trend.push({
            label: `Week ${i}`,
            value: runningTotal
          });
        }
      } else if (analyticsFilter === 'hours') {
        let runningTotal = 0;
        for (let i = 0; i < 24; i++) {
          runningTotal += (hourMap.get(i) || 0);
          trend.push({
            label: `${i}:00`,
            value: runningTotal
          });
        }
      }
      setChartData(trend);

      const { data: withdrawalData } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      const feed: any[] = [];
      limitedRows.slice(0, 5).forEach(b => {
        let gName = 'Venue';
        if (b.ground) {
          gName = Array.isArray(b.ground) ? (b.ground[0]?.name || 'Venue') : (b.ground.name || 'Venue');
        }
        const netB = (b.total_amount || 0) - (Number(b.platform_fee_owner || 0) + Number(b.gst_owner || 0));
        feed.push({
          id: `b-${b.id}`,
          type: 'booking',
          date: b.created_at,
          text: `New booking received for ${gName} (₹${netB})`,
          color: '#3B82F6'
        });
      });

      if (withdrawalData) {
        setWithdrawals(withdrawalData);
        setUpcomingPayouts(withdrawalData.filter(w => w.status === 'pending' || w.status === 'processing'));
        withdrawalData.slice(0, 5).forEach(w => {
          feed.push({
            id: `w-${w.id}`,
            type: 'withdrawal',
            date: w.created_at,
            text: `Payout of ₹${w.amount} ${w.status === 'completed' ? 'processed' : 'is ' + w.status}`,
            color: w.status === 'completed' ? '#22C55E' : '#F59E0B'
          });
        });
      }
      setActivityFeed(feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8));
    } catch (e) {
      console.error('Error loading earnings:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const newLimit = limit + 10;
    setLimit(newLimit);
    loadEarnings(newLimit);
  };

  const handleWithdrawRequest = async () => {
    if (!user || !wallet) return;

    if (!withdrawAmount || isNaN(parseFloat(withdrawAmount)) || parseFloat(withdrawAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (parseFloat(withdrawAmount) > (wallet?.balance || 0)) {
      alert('Withdrawal amount cannot exceed your current balance.');
      return;
    }

    if (!isBankVerified) {
      alert('Your bank details are not yet verified by Book your ground. Please contact support or check your settings.');
      return;
    }

    if (payoutMethod === 'bank') {
      if (!bankName || !accountNumber || !ifscCode) {
        alert('Please fill in all bank details.');
        return;
      }
    } else {
      if (!upiId) {
        alert('Please enter your UPI ID.');
        return;
      }
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.from('withdrawals').insert({
        owner_id: user?.id,
        amount: parseFloat(withdrawAmount),
        payment_method: payoutMethod === 'bank' ? 'bank_transfer' : 'upi',
        account_details: payoutMethod === 'bank' ? {
          bank_name: bankName,
          account_number: accountNumber,
          ifsc_code: ifscCode
        } : {
          upi_id: upiId
        }
      });

      if (error) throw error;

      alert('Withdrawal request submitted successfully!');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      // Refresh balance
      loadEarnings();
    } catch (err) {
      console.error('Error submitting withdrawal:', err);
      alert('Failed to submit withdrawal request.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSummaryTable = () => (
    <View style={styles.summaryTableWrapper}>
      <View style={styles.filterRow}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Venue</Text>
          <View style={styles.pickerContainer}>
            {Platform.OS === 'web' ? (
              <select
                value={filterVenueId || ''}
                onChange={(e) => setFilterVenueId(e.target.value || null)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: 14,
                  color: '#0F172A',
                  padding: '8px 4px',
                  width: '100%',
                  outline: 'none'
                }}
              >
                <option value="">All Venues</option>
                {ownerGrounds.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            ) : (
              <TouchableOpacity 
                style={styles.mobilePicker}
                onPress={() => {
                  const nextIdx = ownerGrounds.findIndex(g => g.id === filterVenueId) + 1;
                  if (nextIdx >= ownerGrounds.length) setFilterVenueId(null);
                  else setFilterVenueId(ownerGrounds[nextIdx].id);
                }}
              >
                <Text style={styles.pickerText}>
                  {ownerGrounds.find(g => g.id === filterVenueId)?.name || 'All Venues'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Method</Text>
          <View style={styles.pickerContainer}>
            {Platform.OS === 'web' ? (
              <select
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value as any)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: 14,
                  color: '#0F172A',
                  padding: '8px 4px',
                  width: '100%',
                  outline: 'none'
                }}
              >
                <option value="all">All Methods</option>
                <option value="online">Online</option>
                <option value="cash">Cash</option>
              </select>
            ) : (
              <TouchableOpacity 
                style={styles.mobilePicker}
                onPress={() => {
                  const methods: any[] = ['all', 'online', 'cash'];
                  const nextIdx = (methods.indexOf(filterPaymentMethod) + 1) % methods.length;
                  setFilterPaymentMethod(methods[nextIdx]);
                }}
              >
                <Text style={styles.pickerText}>
                  {filterPaymentMethod.toUpperCase()}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Period</Text>
          <View style={styles.pickerContainer}>
            {Platform.OS === 'web' ? (
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value as any)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: 14,
                  color: '#0F172A',
                  padding: '8px 4px',
                  width: '100%',
                  outline: 'none'
                }}
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="month">This Month</option>
              </select>
            ) : (
              <TouchableOpacity 
                style={styles.mobilePicker}
                onPress={() => {
                  const periods: any[] = ['all', '7days', '30days', 'month'];
                  const nextIdx = (periods.indexOf(filterDateRange) + 1) % periods.length;
                  setFilterDateRange(periods[nextIdx]);
                }}
              >
                <Text style={styles.pickerText}>
                  {filterDateRange === 'all' ? 'ALL TIME' : filterDateRange.toUpperCase()}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.filterGroup, { flex: 0.6, minWidth: 140, justifyContent: 'flex-end' }]}>
          <TouchableOpacity 
            style={[styles.downloadReportBtn, { height: 42, justifyContent: 'center' }]} 
            onPress={handleDownloadReport}
            disabled={loading}
          >
            <Download size={16} color="#043529" />
            <Text style={styles.downloadReportBtnText}>Download CSV</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.table}>
        <View style={[styles.tableHeader, { borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingHorizontal: 16 }]}>
          <Text style={[styles.headerText, { width: 100 }]}>Date & Time</Text>
          <Text style={[styles.headerText, { flex: 1 }]}>Venue & Customer</Text>
          <Text style={[styles.headerText, { width: 80 }]}>Payment</Text>
          <Text style={[styles.headerText, { width: 80, textAlign: 'right' }]}>Gross</Text>
          <Text style={[styles.headerText, { width: 80, textAlign: 'right' }]}>Fee</Text>
          <Text style={[styles.headerText, { width: 100, textAlign: 'right' }]}>Net</Text>
        </View>
        
        {(() => {
          const combined = [
            ...(transactions || []).map(tx => ({ ...tx, type: 'booking' })),
            ...(withdrawals || [])
              .filter(w => w.status === 'completed')
              .map(w => ({
                id: `w-${w.id}`,
                created_at: w.created_at,
                total_amount: Number(w.amount || 0),
                payment_method: w.payment_method,
                status: w.status,
                type: 'withdrawal'
              }))
          ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          return combined.length === 0 ? (
            <View style={styles.emptyTable}>
              <Text style={styles.emptyTableText}>No transactions found.</Text>
            </View>
          ) : (
            combined.map((item) => (
              <View key={item.id} style={[styles.tableRow, { paddingHorizontal: 16 }]}>
                <View style={{ width: 100 }}>
                  <Text style={styles.cellTextMain}>
                    {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                  </Text>
                  <Text style={styles.cellTextSub}>
                    {new Date(item.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cellTextMain, item.type === 'withdrawal' ? { color: '#64748B' } : { color: '#1E293B' }]} numberOfLines={1}>
                    {item.type === 'withdrawal' ? 'Manual Withdrawal' : (item.ground?.name || 'Venue')}
                  </Text>
                  <Text style={[styles.cellTextSub, { fontSize: 10, color: '#94A3B8' }]} numberOfLines={1}>
                    ID: #{item.id.startsWith('w-') ? item.id.split('-')[1] : item.id.split('-')[0]}
                  </Text>
                </View>

                <View style={{ width: 80 }}>
                  <View style={[
                    styles.methodBadge, 
                    { backgroundColor: item.type === 'withdrawal' ? '#E0F2FE' : (item.payment_method === 'cash' ? (item.payment_received ? '#F1F5F9' : '#FEF3C7') : '#F1F5F9') }
                  ]}>
                    <Text style={[
                      styles.methodBadgeText,
                      { color: item.type === 'withdrawal' ? '#0369A1' : (item.payment_method === 'cash' ? (item.payment_received ? '#475569' : '#92400E') : '#475569') }
                    ]}>
                      {item.type === 'withdrawal' ? 'PAYOUT' : (item.payment_method === 'cash' ? (item.payment_received ? 'PAID' : 'CASH') : 'ONLINE')}
                    </Text>
                  </View>
                </View>

                <View style={{ width: 80, alignItems: 'flex-end' }}>
                  <Text style={[styles.cellTextMain, { fontSize: 13, color: item.type === 'withdrawal' ? '#EF4444' : '#64748B' }]}>
                    {item.type === 'withdrawal' ? `-${formatCurrency(item.total_amount)}` : formatCurrency(item.total_amount)}
                  </Text>
                </View>

                <View style={{ width: 80, alignItems: 'flex-end' }}>
                  <Text style={[styles.cellTextMain, { fontSize: 13, color: '#64748B' }]}>
                    {item.type === 'withdrawal' ? '-' : `-${formatCurrency((Number(item.platform_fee_owner || 0) + Number(item.gst_owner || 0)))}`}
                  </Text>
                </View>

                <View style={{ width: 100, alignItems: 'flex-end' }}>
                  <Text style={[styles.cellTextMain, { fontSize: 13, fontWeight: '500', color: item.type === 'withdrawal' ? '#EF4444' : '#1E293B' }]}>
                    {item.type === 'withdrawal' ? `-${formatCurrency(item.total_amount)}` : formatCurrency(item.total_amount - (Number(item.platform_fee_owner || 0) + Number(item.gst_owner || 0)))}
                  </Text>
                </View>
              </View>
            ))
          );
        })()}
        
        {hasMore && (
          <TouchableOpacity 
            style={[styles.statementBtn, { marginTop: 12, borderStyle: 'dashed' }]}
            onPress={loadMore}
            disabled={loading}
          >
            <Text style={styles.statementBtnText}>{loading ? 'Loading...' : 'Load More Transactions'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderAnalyticsView = () => (
    <View style={styles.analyticsWrapper}>
      <View style={[styles.layoutRow, isStacking && { flexDirection: 'column', gap: 16 }]}>
        <View style={[styles.leftCol, isStacking && { paddingRight: 0 }]}>
          <View style={styles.sectionCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View>
                <Text style={styles.sectionTitle}>Earnings Analytics</Text>
                <Text style={styles.sectionSubtitle}>Revenue trends based on selection</Text>
              </View>
              
              <View style={styles.filterContainer}>
                {['hours', 'days', 'weeks'].map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.filterButton,
                      analyticsFilter === f && styles.filterButtonActive
                    ]}
                    onPress={() => setAnalyticsFilter(f as 'hours' | 'days' | 'weeks')}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      analyticsFilter === f && styles.filterButtonTextActive
                    ]}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <LineChart data={chartData || []} height={250} />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Breakdown by Venue</Text>
            <View style={[styles.venueList, { marginTop: 12 }]}>
              {venueBreakdown.map((v, i) => (
                <View key={i} style={styles.venueItem}>
                   <View style={styles.venueInfo}>
                     <Text style={styles.venueName} numberOfLines={1}>
                       {typeof v.name === 'string' ? v.name : 'Venue'}
                     </Text>
                     <Text style={styles.venueAmount}>{formatCurrency(Number(v.amount))} ({Math.round(Number(v.percent))}%)</Text>
                   </View>
                   <View style={styles.progressBg}>
                     <View style={[styles.progressFill, { width: `${v.percent}%`, backgroundColor: i === 0 ? '#01b854' : (i === 1 ? '#3B82F6' : '#64748B') }]} />
                   </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.rightCol}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Earnings Bifurcation</Text>
            <View style={styles.bifurcationRow}>
               <View style={styles.bifurcationItem}>
                  <Text style={styles.bifurcationLabel}>Online</Text>
                  <Text style={[styles.bifurcationValue, { color: '#01b854' }]}>{formatCurrency(onlineEarnings)}</Text>
               </View>
               <View style={styles.bifurcationDivider} />
               <View style={styles.bifurcationItem}>
                  <Text style={styles.bifurcationLabel}>Offline</Text>
                  <Text style={[styles.bifurcationValue, { color: '#F59E0B' }]}>{formatCurrency(offlineEarnings)}</Text>
               </View>
               <View style={styles.bifurcationDivider} />
               <View style={styles.bifurcationItem}>
                  <Text style={styles.bifurcationLabel}>Store Credits</Text>
                  <Text style={[styles.bifurcationValue, { color: '#3B82F6' }]}>{formatCurrency(storeCredits)}</Text>
               </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
             <Text style={styles.sectionTitle}>Monthly Stats</Text>
             <View style={{ marginTop: 16, gap: 12 }}>
                <View style={styles.statLine}>
                   <Text style={styles.statLabel}>Total Bookings</Text>
                   <Text style={styles.statValue}>{stats.totalConfirmedBookings}</Text>
                </View>
                <View style={styles.statLine}>
                   <Text style={styles.statLabel}>Avg. Order Value</Text>
                   <Text style={styles.statValue}>{formatCurrency(stats.totalEarnings / (stats.totalConfirmedBookings || 1))}</Text>
                </View>
                <View style={styles.statLine}>
                   <Text style={styles.statLabel}>Highest Day</Text>
                   <Text style={styles.statValue}>{formatCurrency(Math.max(...chartData.map(d => d.value), 0))}</Text>
                </View>
             </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPayoutsHistory = () => {
    // Group transactions by payout date
    const payouts = transactions
      .filter(tx => tx.payout_status === 'completed' || tx.payout_status === 'processing')
      .reduce((acc: any[], tx) => {
        const date = tx.payout_processed_at ? new Date(tx.payout_processed_at).toISOString().split('T')[0] : 'Processing';
        const existing = acc.find(p => p.date === date);
        
        const isOnline = tx.payment_method && tx.payment_method !== 'cash';
        const fee = (Number(tx.platform_fee_owner || 0) + Number(tx.gst_owner || 0));
        
        // Net amount logic: 
        // If Online: revenue - fee
        // If Offline: -fee (deducted from online pool)
        const revenue = Number(tx.ground_price || tx.total_amount || 0);
        const netContribution = isOnline ? (revenue - fee) : -fee;

        if (existing) {
          existing.net += netContribution;
          existing.fees += fee;
          existing.matches += 1;
        } else {
          acc.push({ date, net: netContribution, fees: fee, matches: 1, type: 'booking' });
        }
        return acc;
      }, []);

    // Add completed manual withdrawals to the list
    withdrawals.forEach(w => {
      if (w.status === 'completed') {
        const date = w.created_at ? new Date(w.created_at).toISOString().split('T')[0] : 'Unknown';
        payouts.push({
          date,
          net: Number(w.amount || 0),
          fees: 0,
          matches: 0,
          type: 'withdrawal'
        });
      }
    });

    // Sort by date
    payouts.sort((a, b) => b.date.localeCompare(a.date));

    return (
      <View style={styles.summaryTableWrapper}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <View style={[styles.viewToggleContainer, { flex: 1, marginBottom: 0, marginTop: 0, borderBottomWidth: 0 }]}>
            <TouchableOpacity 
              style={[styles.viewToggleBtn, payoutSubTab === 'requests' && styles.viewToggleBtnActive]}
              onPress={() => setPayoutSubTab('requests')}
            >
              <Text style={[styles.viewToggleBtnText, payoutSubTab === 'requests' && styles.viewToggleBtnTextActive]}>Payout Request</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.viewToggleBtn, payoutSubTab === 'history' && styles.viewToggleBtnActive]}
              onPress={() => setPayoutSubTab('history')}
            >
              <Text style={[styles.viewToggleBtnText, payoutSubTab === 'history' && styles.viewToggleBtnTextActive]}>Payout</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ width: 140 }}>
            <View style={styles.pickerContainer}>
              {Platform.OS === 'web' ? (
                <select
                  value={filterDateRange}
                  onChange={(e) => setFilterDateRange(e.target.value as any)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: 14,
                    color: '#0F172A',
                    padding: '8px 4px',
                    width: '100%',
                    outline: 'none'
                  }}
                >
                  <option value="all">All Time</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="month">This Month</option>
                </select>
              ) : (
                <TouchableOpacity 
                  style={styles.mobilePicker}
                  onPress={() => {
                    const periods: any[] = ['all', '7days', '30days', 'month'];
                    const nextIdx = (periods.indexOf(filterDateRange) + 1) % periods.length;
                    setFilterDateRange(periods[nextIdx]);
                  }}
                >
                  <Text style={styles.pickerText}>
                    {filterDateRange === 'all' ? 'ALL TIME' : filterDateRange.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {payoutSubTab === 'requests' ? (
          <View style={{ paddingVertical: 8 }}>
            <Text style={styles.sectionTitle}>Payout Requests</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerText, { width: 140 }]}>Request Date</Text>
                <Text style={[styles.headerText, { flex: 1 }]}>Amount</Text>
                <Text style={[styles.headerText, { width: 100, textAlign: 'right' }]}>Status</Text>
              </View>
              {upcomingPayouts.length === 0 ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#64748B', fontSize: 14 }}>No payout requests found</Text>
                </View>
              ) : (
                upcomingPayouts.map((p) => (
                  <View key={p.id} style={styles.tableRow}>
                    <Text style={[styles.cellText, { width: 140 }]}>
                      {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                    </Text>
                    <Text style={[styles.cellText, { flex: 1 }]}>{formatCurrency(p.amount)}</Text>
                    <View style={[styles.statusBadge, { width: 100 }]}>
                      <View style={[styles.statusDot, { backgroundColor: p.status === 'processing' ? '#3B82F6' : '#F59E0B' }]} />
                      <Text style={[styles.statusText, { textTransform: 'capitalize' }]}>{p.status}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        ) : (
          <View style={{ paddingVertical: 8 }}>
            <Text style={styles.sectionTitle}>Payout History</Text>

            <View style={[styles.table, { marginTop: 12 }]}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerText, { width: 120 }]}>Settled Date</Text>
                <Text style={[styles.headerText, { flex: 1 }]}>Matches</Text>
                <Text style={[styles.headerText, { width: 100, textAlign: 'right' }]}>Total Fees</Text>
                <Text style={[styles.headerText, { width: 100, textAlign: 'right' }]}>Net Payout</Text>
              </View>

              {payouts.length === 0 ? (
                <View style={styles.emptyTable}>
                  <Text style={styles.emptyTableText}>No payout history found yet.</Text>
                </View>
              ) : (
                payouts.map((p, i) => (
                  <View key={i} style={styles.tableRow}>
                    <View style={{ width: 120 }}>
                      <Text style={styles.cellTextMain}>
                        {p.date === 'Processing' ? 'Processing' : new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cellTextMain, { color: '#64748B' }]}>
                        {p.type === 'withdrawal' ? 'Manual Withdrawal' : `${p.matches} ${p.matches === 1 ? 'Match' : 'Matches'}`}
                      </Text>
                    </View>
                    <View style={{ width: 100, alignItems: 'flex-end' }}>
                      <Text style={[styles.cellTextMain, { color: '#64748B' }]}>
                        {p.type === 'withdrawal' ? '-' : `-₹${Math.round(p.fees)}`}
                      </Text>
                    </View>
                    <View style={{ width: 100, alignItems: 'flex-end' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[styles.cellTextMain, { color: p.net <= 0 ? '#94A3B8' : '#059669', fontWeight: '800' }]}>
                          {formatCurrency(Math.max(0, p.net))}
                        </Text>
                        {p.net < 0 && (
                           <View style={styles.debtBadge}>
                             <Text style={styles.debtText}>ADJ</Text>
                           </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderLeftColumn = () => {
    return (
      <View style={styles.leftCol}>
        <LinearGradient 
          colors={['#00ea6b', '#a5ff8a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.totalEarningsCard, isUltraNarrow && { padding: 20 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.totalEarningsLabel}>Withdrawable Balance</Text>
            {loading ? (
              <Animated.Text style={[styles.totalEarningsValue, isUltraNarrow && { fontSize: 28 }, { opacity: pulseAnim }]}>
                ...
              </Animated.Text>
            ) : (
              <Text style={[styles.totalEarningsValue, isUltraNarrow && { fontSize: 28 }]}>
                {formatCurrency(Math.max(0, withdrawableBalance))}
              </Text>
            )}
          <Pressable 
            style={({ hovered }: { hovered: boolean }) => [
              styles.withdrawBtnInline,
              hovered && { backgroundColor: 'rgba(255, 255, 255, 0.4)', transform: [{ scale: 1.02 }] }
            ]}
            onPress={() => setShowWithdrawModal(true)}
          >
            <Text style={styles.withdrawBtnTextInline}>Request Payout</Text>
          </Pressable>
        </View>
        {!isUltraNarrow && <Wallet size={64} color="#043529" strokeWidth={1} style={{ opacity: 0.2 }} />}
      </LinearGradient>

      {!isBankVerified && bankDetailsLoaded && (
        <View style={[styles.sectionCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <AlertCircle size={20} color="#DC2626" />
            <Text style={[styles.sectionTitle, { color: '#991B1B', marginBottom: 0 }]}>Bank Verification Required</Text>
          </View>
          <Text style={{ fontSize: 14, color: '#991B1B', lineHeight: 20 }}>
            Your bank details must be verified by an admin before you can request payouts. Please ensure your details are correct in <Text style={{ fontWeight: '700' }} onPress={() => router.push('/(owner)/settings?tab=bank')}>Settings</Text>.
          </Text>
        </View>
      )}

  

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { width: 120 }]}>Date & Time</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>Description</Text>
            <Text style={[styles.headerText, { width: 80, textAlign: 'right' }]}>Amount</Text>
          </View>
            {transactions.map((tx) => {
              const netTx = (tx.total_amount || 0) - (Number(tx.platform_fee_owner || 0) + Number(tx.gst_owner || 0));
              return (
                <View key={tx.id} style={styles.tableRow}>
                  <View style={{ width: 120 }}>
                    <Text style={styles.cellTextMain}>
                      {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                    </Text>
                    <Text style={styles.cellTextSub}>
                      {new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </Text>
                  </View>
                  <Text style={[styles.cellText, { flex: 1 }]} numberOfLines={1}>
                    {tx.ground?.name || 'Venue'}
                  </Text>
                  <Text style={[styles.cellText, { width: 80, textAlign: 'right', fontWeight: '400', color: '#1E293B' }]}>
                    {formatCurrency(netTx)}
                  </Text>
                </View>
              );
            })}
          {hasMore && (
            <TouchableOpacity 
              style={[styles.statementBtn, { marginTop: 12, borderStyle: 'dashed' }]}
              onPress={loadMore}
              disabled={loading}
            >
              <Text style={styles.statementBtnText}>{loading ? 'Loading...' : 'Load More Transactions'}</Text>
            </TouchableOpacity>
          )}
        </View>
          <View style={styles.transactionActions}>
            <TouchableOpacity 
              style={[styles.statementBtn, { flex: 1 }]}
              onPress={() => setShowStatementModal(true)}
            >
              <History size={16} color="#64748B" />
              <Text style={styles.statementBtnText}>View Full Statement</Text>
            </TouchableOpacity>
          </View>
        </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Payout Requests</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { width: 140 }]}>Request Date</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>Amount</Text>
            <Text style={[styles.headerText, { width: 100, textAlign: 'right' }]}>Status</Text>
          </View>
          {upcomingPayouts.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ color: '#64748B', fontSize: 14 }}>No payout requests found</Text>
            </View>
          ) : (
            upcomingPayouts.map((p) => (
              <View key={p.id} style={styles.tableRow}>
                <Text style={[styles.cellText, { width: 140 }]}>
                  {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                </Text>
                <Text style={[styles.cellText, { flex: 1 }]}>{formatCurrency(p.amount)}</Text>
                <View style={[styles.statusBadge, { width: 100 }]}>
                  <View style={[styles.statusDot, { backgroundColor: p.status === 'processing' ? '#3B82F6' : '#F59E0B' }]} />
                  <Text style={[styles.statusText, { textTransform: 'capitalize' }]}>{p.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
    );
  };

  const renderRightColumn = () => (
    <View style={styles.rightCol}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Earnings Bifurcation</Text>
        <View style={styles.bifurcationRow}>
           <View style={styles.bifurcationItem}>
              <Text style={styles.bifurcationLabel}>Online Earnings (Net)</Text>
              <Text style={[styles.bifurcationValue, { color: '#01b854' }]}>{formatCurrency(onlineEarnings)}</Text>
           </View>
           <View style={styles.bifurcationDivider} />
           <View style={styles.bifurcationItem}>
              <Text style={styles.bifurcationLabel}>Offline Earnings (Net)</Text>
              <Text style={[styles.bifurcationValue, { color: '#64748B' }]}>{formatCurrency(offlineEarnings)}</Text>
              <Text style={styles.bifurcationSubtext}>Cash / On-venue</Text>
           </View>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.sectionCard}
        onPress={() => setShowChartModal(true)}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Earnings Analytics</Text>
          <ChevronRight size={20} color="#64748B" />
        </View>
        <LineChart data={chartData || []} />
        
        <View style={styles.divider} />
        
        <Text style={styles.sectionTitle}>Breakdown by Venue</Text>
        <View style={styles.venueList}>
          {venueBreakdown.map((v, i) => (
            <View key={i} style={styles.venueItem}>
               <View style={styles.venueInfo}>
                 <Text style={styles.venueName} numberOfLines={1}>
                   {typeof v.name === 'string' ? v.name : 'Venue'}:
                 </Text>
                 <Text style={styles.venueAmount}>{formatCurrency(Number(v.amount))} ({Math.round(Number(v.percent))}%)</Text>
               </View>
               <View style={styles.progressBg}>
                 <View style={[styles.progressFill, { width: `${v.percent}%`, backgroundColor: i === 0 ? '#01b854' : (i === 1 ? '#3B82F6' : (i === 2 ? '#8B5CF6' : '#64748B')) }]} />
               </View>
            </View>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.downloadBtn} 
          onPress={handleDownloadReport}
          disabled={loading}
        >
          <Text style={styles.downloadBtnText}>
            {loading ? 'Generating...' : 'Download Report'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recent Activity Feed</Text>
        <View style={styles.activityFeed}>
          {activityFeed.length === 0 ? (
             <Text style={[styles.activityText, { textAlign: 'center', opacity: 0.5 }]}>No recent activity</Text>
          ) : (
            activityFeed.map((item) => (
              <View key={item.id} style={styles.activityItem}>
                <View style={[styles.activityDot, { backgroundColor: item.color }]} />
                <Text style={styles.activityText}>
                  <Text style={{ fontWeight: '500' }}>
                    {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {new Date(item.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}:
                  </Text>{' '}
                  {item.text}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Chart Enlarged Modal */}
      <Modal
        visible={showChartModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChartModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowChartModal(false)} 
          />
          <View style={[styles.modalContent, { maxWidth: 900, width: '95%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Detailed Earnings Analytics</Text>
                <Text style={styles.modalSubtitle}>Daily revenue trends for the current month</Text>
              </View>
              <TouchableOpacity onPress={() => setShowChartModal(false)} style={styles.closeBtn}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <View style={{ padding: 24, paddingBottom: 40 }}>
              <LineChart 
                data={chartData} 
                height={350} 
                totalDays={new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()} 
              />
              
              <View style={{ marginTop: 40, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Info size={16} color="#64748B" />
                  <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '500' }}>
                    Showing performance overview based on confirmed bookings.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  return (
    <>
    <ScrollView 
      style={styles.root}
      showsVerticalScrollIndicator={false}
      // @ts-ignore - web-only style to hide scrollbar
      contentContainerStyle={[
        styles.scrollContent,
        { flexGrow: 1, paddingBottom: 24 },
        Platform.OS === 'web' && { scrollbarWidth: 'none', msOverflowStyle: 'none' } as any
      ]}
    >
      <View style={[styles.viewToggleContainer, isUltraNarrow && { marginHorizontal: 12, padding: 4 }]}>
        <TouchableOpacity 
          style={[styles.viewToggleBtn, viewMode === 'preview' && styles.viewToggleBtnActive]}
          onPress={() => router.push('/(owner)/earnings?tab=preview')}
        >
          <Text style={[styles.viewToggleBtnText, viewMode === 'preview' && styles.viewToggleBtnTextActive]}>Preview</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.viewToggleBtn, viewMode === 'summary' && styles.viewToggleBtnActive]}
          onPress={() => router.push('/(owner)/earnings?tab=summary')}
        >
          <Text style={[styles.viewToggleBtnText, viewMode === 'summary' && styles.viewToggleBtnTextActive]}>Summary</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.viewToggleBtn, viewMode === 'analytics' && styles.viewToggleBtnActive]}
          onPress={() => router.push('/(owner)/earnings?tab=analytics')}
        >
          <Text style={[styles.viewToggleBtnText, viewMode === 'analytics' && styles.viewToggleBtnTextActive]}>Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.viewToggleBtn, viewMode === 'payouts' && styles.viewToggleBtnActive]}
          onPress={() => router.push('/(owner)/earnings?tab=payouts')}
        >
          <Text style={[styles.viewToggleBtnText, viewMode === 'payouts' && styles.viewToggleBtnTextActive]}>Payouts</Text>
        </TouchableOpacity>
      </View>

        {viewMode === 'preview' ? (
          <View style={[
            styles.layoutRow, 
            isStacking && { flexDirection: 'column', gap: 16 }
          ]}>
            <View style={[styles.leftCol, isStacking && { paddingRight: 0, paddingTop: 16 }]}>
              {renderLeftColumn()}
            </View>
            <View style={[styles.rightCol, isStacking && { paddingTop: 0 }]}>
              {renderRightColumn()}
            </View>
          </View>
        ) : viewMode === 'summary' ? (
          renderSummaryTable()
        ) : viewMode === 'analytics' ? (
          renderAnalyticsView()
        ) : (
          renderPayoutsHistory()
        )}
      </ScrollView>

      {/* Withdrawal Modal */}
      <Modal
        visible={showWithdrawModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowWithdrawModal(false)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Withdraw Funds</Text>
                <Text style={styles.modalSubtitle}>Available: {formatCurrency(Math.max(0, withdrawableBalance))}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)} style={styles.closeBtn}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.modalForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Amount (₹)</Text>
                  <RNTextInput
                    style={styles.formInput}
                    placeholder="Enter amount"
                    keyboardType="numeric"
                    value={withdrawAmount}
                    onChangeText={setWithdrawAmount}
                  />
                </View>

                <View style={[styles.inputGroup, { marginBottom: 8 }]}>
                  <Text style={styles.inputLabel}>Payout Method</Text>
                  <View style={[styles.methodSelector, { flexDirection: 'row', display: 'flex' }]}>
                    <TouchableOpacity 
                      activeOpacity={0.8}
                      style={[styles.methodOption, payoutMethod === 'bank' && styles.methodOptionActive]}
                      onPress={() => setPayoutMethod('bank')}
                    >
                      <Text style={[styles.methodText, payoutMethod === 'bank' && styles.methodTextActive]}>Bank Transfer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      activeOpacity={0.8}
                      style={[styles.methodOption, payoutMethod === 'upi' && styles.methodOptionActive]}
                      onPress={() => setPayoutMethod('upi')}
                    >
                      <Text style={[styles.methodText, payoutMethod === 'upi' && styles.methodTextActive]}>UPI</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {payoutMethod === 'bank' ? (
                  <>
                    <Text style={styles.formSectionTitle}>Bank Details</Text>
                    
                    <View style={[styles.formRow, !IS_WEB && { flexDirection: 'column' }]}>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>Bank Name</Text>
                        <RNTextInput
                          style={styles.formInput}
                          placeholder="e.g. HDFC"
                          value={bankName}
                          onChangeText={setBankName}
                        />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>IFSC Code</Text>
                        <RNTextInput
                          style={styles.formInput}
                          placeholder="IFSC"
                          autoCapitalize="characters"
                          value={ifscCode}
                          onChangeText={setIfscCode}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Account Number</Text>
                      <RNTextInput
                        style={styles.formInput}
                        placeholder="Enter account number"
                        keyboardType="numeric"
                        value={accountNumber}
                        onChangeText={setAccountNumber}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.formSectionTitle}>UPI Details</Text>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>UPI ID</Text>
                      <RNTextInput
                        style={styles.formInput}
                        placeholder="username@bank / mobile@upi"
                        autoCapitalize="none"
                        value={upiId}
                        onChangeText={setUpiId}
                      />
                    </View>
                  </>
                )}

                <TouchableOpacity 
                  style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                  onPress={handleWithdrawRequest}
                  disabled={submitting}
                >
                  <Text style={styles.submitBtnText}>
                    {submitting ? 'Submitting...' : 'Request Payout'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Full Statement Modal */}
      <Modal
        visible={showStatementModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatementModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowStatementModal(false)} 
          />
          <View style={[styles.modalContent, { maxWidth: 800, height: '80%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Financial Statement</Text>
                <Text style={styles.modalSubtitle}>All confirmed bookings and earnings</Text>
              </View>
              <TouchableOpacity onPress={() => setShowStatementModal(false)} style={styles.closeBtn}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: 24 }}>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerText, { width: 120 }]}>Date & Time</Text>
                  <Text style={[styles.headerText, { flex: 1 }]}>Ground / Details</Text>
                  <Text style={[styles.headerText, { width: 100 }]}>Payment</Text>
                  <Text style={[styles.headerText, { width: 80, textAlign: 'right' }]}>Amount</Text>
                </View>
                
                {transactions.map((tx) => (
                  <View key={tx.id} style={styles.tableRow}>
                    <View style={{ width: 120 }}>
                      <Text style={styles.cellTextMain}>
                        {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                      </Text>
                      <Text style={styles.cellTextSub}>
                        {new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cellTextMain}>{tx.ground?.name || 'Venue'}</Text>
                      <Text style={styles.cellTextSub}>{tx.ground?.city || 'Location'}</Text>
                    </View>
                    <View style={{ width: 100 }}>
                      <Text style={[styles.cellTextMain, { textTransform: 'capitalize' }]}>{tx.payment_method || 'Other'}</Text>
                      <Text style={[styles.cellTextSub, { color: tx.payment_received ? '#22C55E' : '#64748B' }]}>
                        {tx.payment_received ? 'Payment Received' : (tx.payment_method === 'cash' ? 'Pending Cash' : 'Confirmed')}
                      </Text>
                    </View>
                    <Text style={[styles.cellTextMain, { width: 80, textAlign: 'right', fontWeight: '700', color: '#01b854' }]}>
                      {formatCurrency((tx.total_amount || 0) - (Number(tx.platform_fee_owner || 0) + Number(tx.gst_owner || 0)))}
                    </Text>
                  </View>
                ))}

                {hasMore && (
                  <TouchableOpacity 
                    style={[styles.statementBtn, { marginTop: 12, borderStyle: 'dashed' }]}
                    onPress={loadMore}
                    disabled={loading}
                  >
                    <Text style={styles.statementBtnText}>{loading ? 'Loading...' : 'Load More Transactions'}</Text>
                  </TouchableOpacity>
                )}

                {transactions.length === 0 && (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Text style={{ color: '#64748B' }}>No transactions found</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
               <TouchableOpacity 
                 style={styles.downloadBtnFull} 
                 onPress={handleDownloadReport}
                 disabled={loading}
               >
                 <Download size={18} color="#043529" />
                 <Text style={styles.downloadBtnFullText}>
                   {loading ? 'Exporting...' : 'Export as PDF (CSV)'}
                 </Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
      <MobileAppNavbar title="Earnings" titleColor="#01b854" lightBg />
      <OwnerEarningsScreenInner />
    </View>
  );
}

const styles = StyleSheet.create({
  nativeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    // Moved padding to individual columns
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  layoutRow: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 8,
  },
  leftCol: {
    flex: 1.5,
    gap: 24,
    paddingTop: 8,
  },
  rightCol: {
    flex: 1,
    gap: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  totalEarningsCard: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalEarningsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#043529',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  totalEarningsValue: {
    fontSize: 36,
    fontWeight: '700',
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
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 16,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  debtBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  debtText: {
    fontSize: 8,
    color: '#B91C1C',
    fontWeight: '900',
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
    fontWeight: '500',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  cellText: {
    fontSize: 14,
    fontWeight: '400',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#043529',
    fontFamily: 'Inter',
  },
  downloadBtn: {
    backgroundColor: '#d9f99d',
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  downloadBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#043529',
    fontFamily: 'Inter',
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
    fontWeight: '400',
    color: '#1E293B',
    flex: 1,
  },
  venueAmount: {
    fontSize: 14,
    fontWeight: '500',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    ...Platform.select({
      web: {
        maxWidth: 440,
        width: '95%',
        alignSelf: 'center',
        marginBottom: 'auto',
        marginTop: 'auto',
        borderRadius: 24,
        maxHeight: '90vh',
        padding: 20,
      }
    })
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  modalScroll: {
    flex: 1,
  },
  modalForm: {
    gap: 12,
    paddingTop: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 4,
    marginBottom: 2,
    fontFamily: 'Inter',
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  formInput: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    fontFamily: 'Inter',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      }
    })
  },
  submitBtn: {
    backgroundColor: '#01b854',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 99,
    backgroundColor: '#F1F5F9',
  },
  methodSelector: {
    flexDirection: 'row',
    display: 'flex',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginTop: 4,
    width: '100%',
    overflow: 'hidden',
  },
  methodOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      }
    })
  },
  methodOptionActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  methodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  methodTextActive: {
    color: '#0F172A',
  },
  cellTextMain: {
    fontSize: 14,
    fontWeight: '400',
    color: '#1E293B',
    fontFamily: 'Inter',
  },
  cellTextSub: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  transactionActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  statementBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  statementBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
   withdrawBtnInline: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawBtnTextInline: {
    fontSize: 13,
    fontWeight: '600',
    color: '#043529',
    fontFamily: 'Inter',
  },
  modalFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  downloadBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#d9f99d',
    paddingVertical: 14,
    borderRadius: 16,
  },
  downloadBtnFullText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#043529',
  },
  bifurcationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  bifurcationItem: {
    flex: 1,
    alignItems: 'center',
  },
  bifurcationLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '400',
    marginBottom: 4,
  },
  bifurcationValue: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  bifurcationSubtext: {
    fontSize: 10,
    color: '#94A3B8',
  },
  bifurcationDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    marginBottom: 0,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  viewToggleBtnActive: {
    borderBottomColor: '#01b854',
  },
  viewToggleBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  viewToggleBtnTextActive: {
    color: '#01b854',
    fontWeight: '600',
  },
  summaryTableWrapper: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 40,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  filterGroup: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 180 : 140,
    gap: 6,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  mobilePicker: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  downloadReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#d9f99d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  downloadReportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#043529',
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  methodBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyTable: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTableText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  analyticsWrapper: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFFFFF',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e7ece8',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#01b854',
  },
  filterButtonText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
});


