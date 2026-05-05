import { View, Text, StyleSheet, Platform, TouchableOpacity, useWindowDimensions, ScrollView, ActivityIndicator, Modal, TextInput } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { ArrowUp, ArrowDown, CreditCard, Calendar, Filter, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/utils/helpers';
import { useUI } from '@/contexts/UIContext';

const THEME_BG = '#043529';
const ACCENT = '#c8f35c'; 

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
    promos: 0
  });
  const [limit, setLimit] = useState(15);
  const [hasMore, setHasMore] = useState(true);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'transactions' | 'summary'>('transactions');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
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
        setBalance(walletData.balance);
        
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

        const processedTx = (wtxData || []).map(tx => {
          let title = tx.description || 'Wallet Transaction';
          let sub = 'System Credit';
          
          if (tx.type === 'refund') {
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

        setHasMore(processedTx.length > newLimit);
        setTransactions(processedTx.slice(0, newLimit));

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

        setSummary({
          added: earned,
          spent: spent,
          refunded: refunded,
          referrals,
          promos
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
          <View style={styles.balanceCard}>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Wallet Balance</Text>
              <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
              <Text style={styles.balanceSub}>100% Secure Platform Credits</Text>
            </View>
            <View style={styles.walletIconBox}>
               <CreditCard size={32} color="#043529" />
            </View>
          </View>

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
              <View style={styles.historyHeader}>
                <Text style={styles.sectionTitle}>Transaction History</Text>
                
                <View style={styles.filterContainer}>
                  <View style={styles.dateFilterGroup}>
                    <View style={styles.datePickerInput}>
                       <Calendar size={14} color="#64748B" />
                       <Text style={[styles.dateTextLabel, fromDate && styles.dateTextActive]}>
                         {fromDate ? new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'From Date'}
                       </Text>
                       {Platform.OS === 'web' && (
                         <input
                           type="date"
                           value={fromDate || ''}
                           onChange={(e: any) => setFromDate(e.target.value || null)}
                           style={{
                             position: 'absolute',
                             top: 0,
                             left: 0,
                             right: 0,
                             bottom: 0,
                             opacity: 0,
                             width: '100%',
                             height: '100%',
                             cursor: 'pointer',
                             zIndex: 2,
                             border: 'none',
                             appearance: 'none',
                             WebkitAppearance: 'none'
                           }}
                         />
                       )}
                       {Platform.OS !== 'web' && (
                         <TouchableOpacity 
                           style={StyleSheet.absoluteFill} 
                           onPress={() => {
                             setActiveFilterType('from');
                             setIsFilterModalVisible(true);
                           }} 
                         />
                       )}
                    </View>

                    <Text style={styles.dateSeparator}>TO</Text>

                    <View style={styles.datePickerInput}>
                       <Calendar size={14} color="#64748B" />
                       <Text style={[styles.dateTextLabel, toDate && styles.dateTextActive]}>
                         {toDate ? new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'To Date'}
                       </Text>
                       {Platform.OS === 'web' && (
                         <input
                           type="date"
                           value={toDate || ''}
                           onChange={(e: any) => setToDate(e.target.value || null)}
                           style={{
                             position: 'absolute',
                             top: 0,
                             left: 0,
                             right: 0,
                             bottom: 0,
                             opacity: 0,
                             width: '100%',
                             height: '100%',
                             cursor: 'pointer',
                             zIndex: 2,
                             border: 'none',
                             appearance: 'none',
                             WebkitAppearance: 'none'
                           }}
                         />
                       )}
                       {Platform.OS !== 'web' && (
                         <TouchableOpacity 
                           style={StyleSheet.absoluteFill} 
                           onPress={() => {
                             setActiveFilterType('to');
                             setIsFilterModalVisible(true);
                           }} 
                         />
                       )}
                    </View>

                    {(fromDate || toDate) && (
                      <TouchableOpacity 
                        onPress={() => { setFromDate(null); setToDate(null); }} 
                        style={styles.clearBtn}
                      >
                        <X size={14} color="#dc2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.transactionsList}>
                {loading && transactions.length === 0 ? (
                  <ActivityIndicator color={THEME_BG} size="large" style={{ marginTop: 20 }} />
                ) : transactions.map(tx => {
                   const isPos = tx.isPositive;
                   return (
                     <View key={tx.id} style={styles.txCard}>
                        <View style={[styles.txIconBox, isPos ? styles.txIconBoxPos : styles.txIconBoxNeg]}>
                           {isPos ? <ArrowUp size={20} color="#15803d" /> : <ArrowDown size={20} color="#dc2626" />}
                        </View>
                        <View style={styles.txInfo}>
                           <Text style={styles.txTitle} numberOfLines={1}>{tx.title}</Text>
                           <Text style={styles.txSub} numberOfLines={1}>{tx.sub}</Text>
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

  if (Platform.OS === 'web' && !isCompact) {
    return <WebLayout>{content}</WebLayout>;
  }

  return (
    <View style={styles.nativeWrapper}>
      <MobileAppNavbar title="Wallet" titleColor="#043529" lightBg />
      {content}

      {/* Mobile Date Filter Modal */}
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
    backgroundColor: '#F8FAFC',
  },
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC', 
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
    backgroundColor: ACCENT,
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#043529',
    marginBottom: 4,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: Platform.OS === 'web' ? 42 : 32,
    fontWeight: '800',
    color: '#043529',
    marginBottom: 4,
    fontFamily: 'Inter',
    letterSpacing: -1,
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
    gap: 12,
  },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  txIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginBottom: 2,
  },
  txSub: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  txValues: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Inter',
    marginBottom: 2,
  },
  txAmountPos: {
    color: '#15803d',
  },
  txAmountNeg: {
    color: '#dc2626',
  },
  txDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'Inter',
    fontWeight: '600',
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
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
  dateFilterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    minWidth: Platform.OS === 'web' ? 320 : '100%',
  },
  datePickerInput: {
    flex: 1,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
  },
  dateTextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  dateTextActive: {
    color: '#0F172A',
  },
  dateSeparator: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    width: 32,
    textAlign: 'center',
    letterSpacing: 0.5,
    backgroundColor: '#FFFFFF',
    height: '100%',
    textAlignVertical: 'center',
    display: Platform.OS === 'web' ? 'flex' : undefined,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
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
    justifyContent: 'flex-end',
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
