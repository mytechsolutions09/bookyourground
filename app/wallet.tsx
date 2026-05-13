import { View, Text, StyleSheet, Platform, TouchableOpacity, useWindowDimensions, ScrollView, ActivityIndicator, Modal, TextInput, Pressable } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { ArrowUp, ArrowDown, CreditCard, Calendar, Filter, X, Download } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/utils/helpers';
import { useUI } from '@/contexts/UIContext';
import { LinearGradient } from 'expo-linear-gradient';

const THEME_BG = '#043529';
const ACCENT = '#00ea6b'; 

export default function WalletScreen() {
  const { user, profile } = useAuth();
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ 
    added: 0, 
    spent: 0, 
    refunded: 0,
    referrals: 0,
    promos: 0,
    payouts: 0
  });
  const [limit, setLimit] = useState(15);
  const [hasMore, setHasMore] = useState(true);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'transactions' | 'summary'>('transactions');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [tempFromDate, setTempFromDate] = useState<string | null>(null);
  const [tempToDate, setTempToDate] = useState<string | null>(null);
  const [activeFilterType, setActiveFilterType] = useState<'from' | 'to' | null>(null);

  const { setTabBarVisible } = useUI();
  const lastScrollY = useRef(0);

  const onScroll = (event: any) => {
    if (Platform.OS === 'web') return;
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;

    if (diff > 10 && currentY > 50) {
      setTabBarVisible(false);
    } else if (diff < -10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentY;
  };

  const isOwner = profile?.role === 'ground_owner';

  useEffect(() => {
    if (user) {
      loadWalletData();
    }
  }, [user, profile?.role, fromDate, toDate]);

  const loadWalletData = async (newLimit = limit) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // 1. Fetch real Wallet Balance
      const { data: walletData } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .single();
      
      if (walletData) {
        let pendingAmount = 0;
        if (isOwner) {
          const { data: pendingWithdrawals } = await supabase
            .from('withdrawals')
            .select('amount')
            .eq('owner_id', user.id)
            .in('status', ['pending', 'processing']);
            
          pendingAmount = (pendingWithdrawals || []).reduce((acc, w) => acc + (w.amount || 0), 0);
        }
        
        setBalance(walletData.balance - pendingAmount);
        
        // 2. Fetch Wallet Transactions
        let query = supabase
          .from('wallet_transactions')
          .select('*, booking:bookings(id, ground:grounds(name))')
          .eq('user_id', user.id);

        if (fromDate) {
          query = query.gte('created_at', fromDate);
        }
        if (toDate) {
          const endOfDay = new Date(toDate);
          endOfDay.setHours(23, 59, 59, 999);
          query = query.lte('created_at', endOfDay.toISOString());
        }

        const { data: wtxData } = await query
          .order('created_at', { ascending: false })
          .limit(newLimit + 1);

        // 3. Fetch Withdrawals (Payouts) if Owner
        let payouts: any[] = [];
        if (isOwner) {
          let pQuery = supabase
            .from('withdrawals')
            .select('*')
            .eq('owner_id', user.id);
            
          if (fromDate) pQuery = pQuery.gte('created_at', fromDate);
          if (toDate) {
            const endOfDay = new Date(toDate);
            endOfDay.setHours(23, 59, 59, 999);
            pQuery = pQuery.lte('created_at', endOfDay.toISOString());
          }
          
          const { data: pData } = await pQuery
            .order('created_at', { ascending: false })
            .limit(newLimit);
          payouts = pData || [];
        }

        const processedTx = (wtxData || []).map(tx => {
          let title = tx.description || 'Wallet Transaction';
          let sub = 'Credit';
          
          if (title === 'Admin System Credit' || title === 'Credit') {
            title = 'Credit';
            sub = 'System Credit';
          } else if (tx.type === 'refund') {
            title = 'Refund Credited';
            sub = tx.booking?.ground?.name ? `Booking at ${tx.booking.ground.name}` : 'Booking Refund';
          } else if (tx.type === 'referral') {
            title = 'Referral Bonus';
            sub = 'Friend joined via your link';
          } else if (tx.type === 'promo') {
            title = 'Promotional Credit';
            sub = 'Special Offer / Rewards';
          } else if (tx.type === 'used' || tx.type === 'debit') {
            title = 'Payment via Wallet';
            sub = tx.booking?.ground?.name ? `Booking at ${tx.booking.ground.name}` : 'Order Payment';
          }

          return {
            id: tx.id,
            type: tx.type,
            title,
            sub,
            amount: Math.abs(tx.amount),
            date: new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + ', ' + new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            isPositive: tx.amount > 0,
            rawDate: new Date(tx.created_at)
          };
        });

        const processedPayouts = payouts.map(p => {
          let title = 'Payout Request';
          let statusText = '';
          
          if (p.status === 'completed') {
            title = 'Payout Approved';
          } else if (p.status === 'processing') {
            title = 'Payout Processing';
            statusText = ' • Processing';
          } else {
            statusText = ' • Pending';
          }

          return {
            id: p.id,
            type: 'payout',
            title,
            sub: (p.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'UPI') + statusText,
            amount: p.amount,
            date: new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + ', ' + new Date(p.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            isPositive: false,
            rawDate: new Date(p.created_at),
            status: p.status
          };
        });

        const combined = [...processedTx, ...processedPayouts]
          .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

        setHasMore(combined.length > newLimit);
        setTransactions(combined.slice(0, newLimit));

        // Calculate Summary
        let earned = 0;
        let spent = 0;
        let refunded = 0;
        let referrals = 0;
        let promos = 0;

        processedTx.forEach(tx => {
          if (tx.isPositive) {
            earned += tx.amount;
            if (tx.type === 'refund') refunded += tx.amount;
            if (tx.type === 'referral') referrals += tx.amount;
            if (tx.type === 'promo') promos += tx.amount;
          } else {
            spent += Math.abs(tx.amount);
          }
        });

        let totalPayouts = 0;
        payouts.forEach(p => {
          if (p.status === 'completed') {
            totalPayouts += p.amount;
          }
        });

        setSummary({
          added: earned,
          spent: spent,
          refunded: refunded,
          referrals,
          promos,
          payouts: totalPayouts
        });
      }
    } catch (err) {
      console.error('Wallet load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const newLimit = limit + 15;
    setLimit(newLimit);
    loadWalletData(newLimit);
  };

  const setQuickRange = (range: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (range) {
      case 'all':
        setTempFromDate(null);
        setTempToDate(null);
        return;
      case 'today':
        start = today;
        end = today;
        break;
      case 'yesterday':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case 'this_week':
        const day = today.getDay();
        start.setDate(today.getDate() - day);
        end.setDate(today.getDate() + (6 - day));
        break;
      case 'last_week':
        const lastWeekDay = today.getDay();
        start.setDate(today.getDate() - lastWeekDay - 7);
        end.setDate(today.getDate() - lastWeekDay - 1);
        break;
      case 'this_month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last_month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
    }
    setTempFromDate(start.toISOString().split('T')[0]);
    setTempToDate(end.toISOString().split('T')[0]);
  };

  const handleExport = () => {
    if (transactions.length === 0) {
      alert('No transactions to export');
      return;
    }

    // CSV Headers
    let csvContent = "Date,Description,Category,Type,Amount\n";
    
    // Add transaction rows
    transactions.forEach(tx => {
      const amount = tx.isPositive ? tx.amount : -tx.amount;
      const row = [
        tx.date,
        `"${tx.title.replace(/"/g, '""')}"`,
        `"${tx.sub.replace(/"/g, '""')}"`,
        tx.type,
        amount
      ].join(",");
      csvContent += row + "\n";
    });

    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `wallet_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Export error:', err);
        alert('Failed to export CSV. Please try again.');
      }
    } else {
      alert('Export feature is being optimized for mobile. Please try on web for instant download.');
    }
  };
  const handleDateClick = (dateStr: string) => {
    if (!tempFromDate || (tempFromDate && tempToDate)) {
      setTempFromDate(dateStr);
      setTempToDate(null);
    } else {
      if (dateStr < tempFromDate) {
        setTempToDate(tempFromDate);
        setTempFromDate(dateStr);
      } else {
        setTempToDate(dateStr);
      }
    }
  };

  const renderCalendar = (monthOffset: number) => {
    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const month = date.getMonth();
    const year = date.getFullYear();
    const monthName = date.toLocaleString('default', { month: 'long' });
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    
    return (
      <View style={styles.calMonth}>
        <Text style={styles.calMonthTitle}>{monthName} {year}</Text>
        <View style={styles.calGrid}>
           <View style={styles.calHeaderRow}>
             {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
               <Text key={d} style={styles.calHeaderCell}>{d}</Text>
             ))}
           </View>
           {weeks.map((week, wi) => (
             <View key={wi} style={styles.calRow}>
               {week.map((day, di) => {
                 if (!day) return <View key={di} style={styles.calCell} />;
                 
                 const dateStr = day.toISOString().split('T')[0];
                 const isSelected = tempFromDate === dateStr || tempToDate === dateStr;
                 const isInRange = tempFromDate && tempToDate && dateStr > tempFromDate && dateStr < tempToDate;
                 const isStart = tempFromDate === dateStr;
                 const isEnd = tempToDate === dateStr;
                 
                 return (
                   <TouchableOpacity 
                     key={di} 
                     style={[
                       styles.calCell,
                       isInRange && styles.calCellInRange,
                       isStart && styles.calCellStart,
                       isEnd && styles.calCellEnd,
                       isSelected && styles.calCellSelected
                     ]}
                     onPress={() => handleDateClick(dateStr)}
                   >
                     <Text style={[
                       styles.calDayText,
                       isInRange && styles.calDayTextInRange,
                       isSelected && styles.calDayTextSelected
                     ]}>
                       {day.getDate()}
                     </Text>
                   </TouchableOpacity>
                 );
               })}
             </View>
           ))}
        </View>
      </View>
    );
  };
  const renderRightPanel = () => (
    <View style={styles.rightPanel}>
      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Wallet Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Refunded</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary.refunded)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Referral Earnings</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary.referrals)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Promotional Credits</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary.promos)}</Text>
        </View>
        {isOwner && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Payouts</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.payouts)}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
          <Text style={styles.summaryLabel}>Total Spent</Text>
          <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{formatCurrency(summary.spent)}</Text>
        </View>
      </View>

      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>How it works</Text>
        <Text style={styles.infoText}>
          BookYourGround Wallet is a credit-only wallet. Money enters through refunds, referrals, and rewards.
        </Text>
        <View style={styles.infoList}>
          <View style={styles.infoItem}>
            <View style={styles.infoDot} />
            <Text style={styles.infoItemText}>Instant refunds on cancellations</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoDot} />
            <Text style={styles.infoItemText}>₹50 bonus for each referral</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoDot} />
            <Text style={styles.infoItemText}>Use for any booking or order</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const content = (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scrollContent, (Platform.OS === 'web' && !isCompact) && styles.scrollContentWeb]}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.mainLayout}>
        <View style={styles.centerContent}>
          <LinearGradient 
            colors={['#00ea6b', '#a5ff8a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.balanceCard}
          >
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Wallet Balance</Text>
              <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
              <Text style={styles.balanceSub}>100% Secure Platform Credits</Text>
            </View>
            <View style={styles.walletIconBox}>
               <CreditCard size={32} color="#043529" />
            </View>
          </LinearGradient>

          {isCompact && (
            <View style={styles.mobileTabs}>
              <TouchableOpacity 
                style={[styles.mobileTab, activeMainTab === 'transactions' && styles.mobileTabActive]}
                onPress={() => setActiveMainTab('transactions')}
              >
                <Text style={[styles.mobileTabText, activeMainTab === 'transactions' && styles.mobileTabTextActive]}>Transactions</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.mobileTab, activeMainTab === 'summary' && styles.mobileTabActive]}
                onPress={() => setActiveMainTab('summary')}
              >
                <Text style={[styles.mobileTabText, activeMainTab === 'summary' && styles.mobileTabTextActive]}>Wallet Summary</Text>
              </TouchableOpacity>
            </View>
          )}

          {(!isCompact || activeMainTab === 'transactions') && (
            <>
              {loading && transactions.length === 0 ? (
                <View style={[styles.transactionsList, { padding: 40, alignItems: 'center' }]}>
                  <ActivityIndicator color={THEME_BG} size="large" />
                </View>
              ) : (
                <View style={styles.transactionsList}>
                  <View style={styles.listHeader}>
                     <Text style={styles.sectionTitleInside}>Transaction History</Text>
                     <View style={{ flexDirection: 'row', gap: 10 }}>
                       <TouchableOpacity 
                         style={styles.exportBtn}
                         onPress={handleExport}
                       >
                         <Download size={18} color="#64748B" />
                         <Text style={styles.exportBtnText}>Export</Text>
                       </TouchableOpacity>
                       <TouchableOpacity 
                         style={styles.filterByDateBtn}
                         onPress={() => {
                           setTempFromDate(fromDate);
                           setTempToDate(toDate);
                           setIsDatePickerVisible(true);
                         }}
                       >
                         <Calendar size={18} color="#00ea6b" />
                         <Text style={styles.filterByDateText}>Filter by Date</Text>
                         <Filter size={14} color="#64748B" />
                       </TouchableOpacity>
                     </View>
                  </View>

                  {transactions.map((tx, index) => {
                     const isPos = tx.isPositive;
                     const isLast = index === transactions.length - 1;
                     return (
                       <View key={tx.id} style={[styles.txCard, isLast && { borderBottomWidth: 0 }]}>
                          <View style={[styles.txIconBox, isPos ? styles.txIconBoxPos : styles.txIconBoxNeg]}>
                             {isPos ? <ArrowUp size={20} color="#00ea6b" /> : <ArrowDown size={20} color="#dc2626" />}
                          </View>
                          <View style={styles.txInfo}>
                             <Text style={styles.txTitle}>{tx.title}</Text>
                             <Text style={styles.txSub}>{tx.sub}</Text>
                          </View>
                          <View style={styles.txValues}>
                             <Text style={[styles.txAmount, isPos ? styles.txAmountPos : styles.txAmountNeg]}>
                               {isPos ? '+' : '-'}{formatCurrency(tx.amount)}
                             </Text>
                             <Text style={styles.txDate}>{tx.date}</Text>
                          </View>
                       </View>
                     );
                  })}
                  {transactions.length === 0 && !loading && (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No transactions yet</Text>
                      <Text style={styles.emptyStateSub}>Refunds and rewards will appear here</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.viewAllWrapper}>
                 {hasMore ? (
                   <TouchableOpacity style={styles.viewAllBtn} onPress={loadMore} disabled={loading}>
                     <Text style={styles.viewAllTxt}>{loading ? 'Loading...' : 'Load More'}</Text>
                   </TouchableOpacity>
                 ) : transactions.length > 0 && (
                   <Text style={styles.noMoreText}>End of history</Text>
                 )}
              </View>
            </>
          )}

          {isCompact && activeMainTab === 'summary' && (
            <View style={styles.compactExtraInfo}>
              {renderRightPanel()}
            </View>
          )}
        </View>

        {!isCompact && renderRightPanel()}
      </View>
    </ScrollView>
  );

  const datePickerModal = (
      <Modal
        visible={isDatePickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDatePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsDatePickerVisible(false)} />
          <View style={styles.datePickerModalWrap}>
            <View style={styles.dpMain}>
              {/* Sidebar Quick Range */}
              <View style={styles.dpSidebar}>
                <Text style={styles.dpSidebarTitle}>Quick Range</Text>
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'this_week', label: 'This Week' },
                  { id: 'last_week', label: 'Last Week' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'last_month', label: 'Last Month' },
                  { id: 'custom', label: 'Custom Range' },
                ].map((range) => (
                  <TouchableOpacity 
                    key={range.id} 
                    style={[styles.quickRangeItem, range.id === 'custom' && styles.quickRangeItemActive]}
                    onPress={() => setQuickRange(range.id)}
                  >
                    <Calendar size={14} color={range.id === 'custom' ? '#059669' : '#64748B'} />
                    <Text style={[styles.quickRangeText, range.id === 'custom' && styles.quickRangeTextActive]}>
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Main Selection Area */}
              <View style={styles.dpSelectionArea}>
                <View style={styles.dpInputsRow}>
                  <View style={styles.dpInputBox}>
                    <Text style={styles.dpInputLabel}>Start Date</Text>
                    <View style={styles.dpInput}>
                      <Calendar size={16} color="#64748B" />
                      <Text style={styles.dpInputText}>
                        {tempFromDate ? new Date(tempFromDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select Date'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.dpArrow}>
                    <Text style={{ color: '#94A3B8', fontSize: 20 }}>→</Text>
                  </View>
                  <View style={styles.dpInputBox}>
                    <Text style={styles.dpInputLabel}>End Date</Text>
                    <View style={styles.dpInput}>
                      <Calendar size={16} color="#64748B" />
                      <Text style={styles.dpInputText}>
                        {tempToDate ? new Date(tempToDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select Date'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Calendar View */}
                <View style={styles.calendarPlaceholder}>
                   {renderCalendar(0)}
                   {renderCalendar(1)}
                </View>
                
                <Text style={styles.calHint}>Select range from the sidebar or click a date to begin</Text>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.dpFooter}>
              <TouchableOpacity onPress={() => { setTempFromDate(null); setTempToDate(null); }}>
                <Text style={styles.dpClearBtn}>Clear</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={styles.dpCancelBtn} onPress={() => setIsDatePickerVisible(false)}>
                  <Text style={styles.dpCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.dpApplyBtn} 
                  onPress={() => {
                    setFromDate(tempFromDate);
                    setToDate(tempToDate);
                    setIsDatePickerVisible(false);
                  }}
                >
                  <Text style={styles.dpApplyText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
  );

  if (Platform.OS === 'web' && !isCompact) {
    return (
      <WebLayout>
        {content}
        {datePickerModal}
      </WebLayout>
    );
  }

  return (
    <View style={styles.nativeWrapper}>
      <MobileAppNavbar title="Wallet" titleColor="#01b854" lightBg />
      {content}
      {datePickerModal}

      {Platform.OS !== 'web' && (
        <Modal
          visible={isFilterModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsFilterModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date Range</Text>
                <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalOptions}>
                <TouchableOpacity 
                  style={styles.modalOption}
                  onPress={() => {
                    setFromDate(null);
                    setToDate(null);
                    setIsFilterModalVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>All Time</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.modalOption}
                  onPress={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 7);
                    setFromDate(d.toISOString().split('T')[0]);
                    setToDate(new Date().toISOString().split('T')[0]);
                    setIsFilterModalVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>Last 7 Days</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.modalOption}
                  onPress={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 30);
                    setFromDate(d.toISOString().split('T')[0]);
                    setToDate(new Date().toISOString().split('T')[0]);
                    setIsFilterModalVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>Last 30 Days</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.modalOption}
                  onPress={() => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - 3);
                    setFromDate(d.toISOString().split('T')[0]);
                    setToDate(new Date().toISOString().split('T')[0]);
                    setIsFilterModalVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>Last 90 Days</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  nativeWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF', 
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 40,
  },
  scrollContentWeb: {
    padding: 24,
  },
  mainLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 32,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  centerContent: {
    flex: 1,
  },
  rightPanel: {
    width: Platform.OS === 'web' ? 340 : '100%',
    flexShrink: 0,
    gap: 24,
  },
  balanceCard: {
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#043529',
    marginBottom: 4,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: Platform.OS === 'web' ? 32 : 24,
    fontWeight: '600',
    color: '#043529',
    marginBottom: 4,
    fontFamily: 'Inter',
    letterSpacing: -0.5,
  },
  balanceSub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#043529',
    opacity: 0.7,
    fontFamily: 'Inter',
  },
  walletIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(4, 53, 41, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  transactionsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    marginTop: 24,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  sectionTitleInside: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  txCard: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txIconBoxPos: {
    backgroundColor: '#DCFCE7',
  },
  txIconBoxNeg: {
    backgroundColor: '#FEE2E2',
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginBottom: 1,
  },
  txSub: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '400',
  },
  txValues: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginBottom: 1,
  },
  txAmountPos: {
    color: '#00ea6b',
  },
  txAmountNeg: {
    color: '#dc2626',
  },
  txDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'Inter',
    fontWeight: '400',
  },
  viewAllWrapper: {
    alignItems: 'center',
    marginTop: 24,
  },
  viewAllBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewAllTxt: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  panelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.07,
    shadowRadius: 25,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  infoText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  infoItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'Inter',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  emptyStateSub: {
    fontSize: 13,
    color: '#94A3B8',
  },
  noMoreText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  compactExtraInfo: {
    marginTop: 32,
    gap: 24,
  },
  historyHeader: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  filterByDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterByDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  datePickerModalWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '95%',
    maxWidth: 800,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
    alignSelf: 'center',
    marginTop: '5%',
  },
  dpMain: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    minHeight: 400,
  },
  dpSidebar: {
    width: Platform.OS === 'web' ? 200 : '100%',
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightColor: '#F1F5F9',
    borderBottomWidth: Platform.OS === 'web' ? 0 : 1,
    borderBottomColor: '#F1F5F9',
    padding: 16,
    gap: 4,
  },
  dpSidebarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  quickRangeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 10,
  },
  quickRangeItemActive: {
    backgroundColor: '#F0FDF4',
  },
  quickRangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  quickRangeTextActive: {
    color: '#00ea6b',
  },
  dpSelectionArea: {
    flex: 1,
    padding: 24,
  },
  dpInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  dpInputBox: {
    flex: 1,
  },
  dpInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  dpInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00ea6b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  dpInputText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  dpArrow: {
    paddingTop: 18,
  },
  calendarPlaceholder: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
  },
  calMonth: {
    flex: 1,
  },
  calMonthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
  },
  calGrid: {
    width: '100%',
  },
  calHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  calRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  calCell: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  calCellSelected: {
    backgroundColor: '#00ea6b',
  },
  calCellInRange: {
    backgroundColor: '#ECFDF5',
    borderRadius: 0,
  },
  calCellStart: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  calCellEnd: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  calDayText: {
    fontSize: 14,
    color: '#334155',
  },
  calDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calDayTextInRange: {
    color: '#065F46',
    fontWeight: '600',
  },
  calHint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  dpFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  dpClearBtn: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 8,
  },
  dpCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  dpCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  dpApplyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#00ea6b',
  },
  dpApplyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mobileTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mobileTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  mobileTabActive: {
    backgroundColor: '#043529',
  },
  mobileTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  mobileTabTextActive: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
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
  modalOptions: {
    gap: 12,
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
});
