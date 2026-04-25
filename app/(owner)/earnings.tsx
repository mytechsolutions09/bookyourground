import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Modal, TextInput as RNTextInput } from 'react-native';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import WebLayout from '@/components/web/WebLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/helpers';
import { TrendingUp, Download, ArrowRight, Wallet, History, Info, ChevronRight, X } from 'lucide-react-native';
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

interface WalletData {
  id: string;
  balance: number;
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
  const [wallet, setWallet] = useState<WalletData | null>(null);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
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

  useEffect(() => {
    if (user) {
      loadEarnings();
    }
  }, [user]);

  const loadEarnings = async (newLimit = limit) => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data: walletData } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .single();
      
      if (walletData) {
        setWallet(walletData);
      }

      const { data, error } = await supabase
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
          ground:grounds!inner(name, city, owner_id)
        `)
        .eq('ground.owner_id', user.id)
        .in('status', ['confirmed', 'completed'])
        .order('created_at', { ascending: false })
        .limit(newLimit + 1);

      if (error) throw error;

      const rows = (data ?? []) as any[];
      const limitedRows = rows.slice(0, newLimit);
      setHasMore(rows.length > newLimit);
      setTransactions(limitedRows);

      const { data: allData } = await supabase
        .from('bookings')
        .select('total_amount, created_at, ground:grounds!inner(name, city, owner_id)')
        .eq('ground.owner_id', user.id)
        .in('status', ['confirmed', 'completed']);

      const allRows = (allData ?? []) as any[];
      let total = 0;
      let thisMonthTotal = 0;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const venueMap = new Map<string, number>();
      const monthMap = new Map<string, number>();

      allRows.forEach((row) => {
        const amt = row.total_amount || 0;
        total += amt;
        
        const date = new Date(row.created_at);
        const m = date.getMonth();
        const y = date.getFullYear();
        
        if (m === currentMonth && y === currentYear) {
          thisMonthTotal += amt;
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
        venueMap.set(safeName, (venueMap.get(safeName) || 0) + amt);

        const monthKey = `${y}-${m}`;
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + amt);
      });

      setStats({
        totalEarnings: total,
        thisMonthEarnings: thisMonthTotal,
        totalConfirmedBookings: allRows.length,
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
        feed.push({
          id: `b-${b.id}`,
          type: 'booking',
          date: b.created_at,
          text: `New booking received for ${gName} (₹${b.total_amount})`,
          color: '#3B82F6'
        });
      });

      if (withdrawalData) {
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

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (amount > wallet.balance) {
      alert('Withdrawal amount cannot exceed your current balance.');
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
      const { error } = await supabase
        .from('withdrawals')
        .insert({
          owner_id: user.id,
          amount,
          payment_method: payoutMethod === 'bank' ? 'bank_transfer' : 'upi',
          account_details: payoutMethod === 'bank' ? {
            bank_name: bankName,
            account_number: accountNumber,
            ifsc_code: ifscCode,
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

  const renderLeftColumn = () => (
    <View style={styles.leftCol}>
      <View style={styles.totalEarningsCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.totalEarningsLabel}>Transferable Balance</Text>
          <Text style={styles.totalEarningsValue}>{formatCurrency(Number(wallet?.balance || 0))}</Text>
          <Text style={styles.monthlySubtext}>
            Lifetime Earnings: <Text style={{ fontWeight: '700' }}>{formatCurrency(Number(stats.totalEarnings))}</Text>
          </Text>
        </View>
        <Wallet size={64} color="#043529" strokeWidth={1} style={{ opacity: 0.2 }} />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { width: 120 }]}>Date & Time</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>Description</Text>
            <Text style={[styles.headerText, { width: 80, textAlign: 'right' }]}>Amount</Text>
          </View>
          {transactions.map((tx) => (
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
              <Text style={[styles.cellText, { width: 80, textAlign: 'right', fontWeight: '700' }]}>
                {formatCurrency(tx.total_amount)}
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
        </View>
          <View style={styles.transactionActions}>
            <TouchableOpacity 
              style={styles.statementBtn}
              onPress={() => setShowStatementModal(true)}
            >
              <History size={16} color="#64748B" />
              <Text style={styles.statementBtnText}>View Full Statement</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.withdrawBtnInline}
              onPress={() => setShowWithdrawModal(true)}
            >
              <Wallet size={16} color="#043529" />
              <Text style={styles.withdrawBtnTextInline}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Upcoming Payouts</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { width: 140 }]}>Scheduled Date</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>Amount</Text>
            <Text style={[styles.headerText, { width: 100, textAlign: 'right' }]}>Status</Text>
          </View>
          {upcomingPayouts.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ color: '#64748B', fontSize: 14 }}>No upcoming payouts scheduled</Text>
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
                 <Text style={styles.venueName} numberOfLines={1}>
                   {typeof v.name === 'string' ? v.name : 'Venue'}:
                 </Text>
                 <Text style={styles.venueAmount}>{formatCurrency(Number(v.amount))} ({Math.round(Number(v.percent))}%)</Text>
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
          {activityFeed.length === 0 ? (
             <Text style={[styles.activityText, { textAlign: 'center', opacity: 0.5 }]}>No recent activity</Text>
          ) : (
            activityFeed.map((item) => (
              <View key={item.id} style={styles.activityItem}>
                <View style={[styles.activityDot, { backgroundColor: item.color }]} />
                <Text style={styles.activityText}>
                  <Text style={{ fontWeight: '700' }}>
                    {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {new Date(item.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}:
                  </Text>{' '}
                  {item.text}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
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
          Platform.OS === 'web' && { scrollbarWidth: 'none', msOverflowStyle: 'none' } as any
        ]}
      >
        <View style={[styles.layoutRow, !IS_WEB && { flexDirection: 'column' }]}>
          {renderLeftColumn()}
          {renderRightColumn()}
        </View>
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
                <Text style={styles.modalSubtitle}>Available: {formatCurrency(wallet?.balance || 0)}</Text>
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
                      <Text style={[styles.cellTextSub, { color: '#22C55E' }]}>Confirmed</Text>
                    </View>
                    <Text style={[styles.cellTextMain, { width: 80, textAlign: 'right', fontWeight: '700' }]}>
                      {formatCurrency(tx.total_amount)}
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
               <TouchableOpacity style={styles.downloadBtnFull} onPress={() => {}}>
                 <Download size={18} color="#043529" />
                 <Text style={styles.downloadBtnFullText}>Export as PDF</Text>
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
    fontSize: 20,
    fontWeight: '800',
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
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
    marginBottom: 2,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    fontFamily: 'Inter',
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
    fontSize: 15,
    fontWeight: '800',
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
    fontWeight: '600',
    color: '#64748B',
  },
  methodTextActive: {
    color: '#0F172A',
  },
  cellTextMain: {
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  withdrawBtnInline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#d9f99d',
  },
  withdrawBtnTextInline: {
    fontSize: 14,
    fontWeight: '700',
    color: '#043529',
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
});


