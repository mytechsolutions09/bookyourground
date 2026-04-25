import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, useWindowDimensions, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { ArrowUp, ArrowDown, ChevronDown } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/utils/helpers';

const THEME_BG = '#043529';
const ACCENT = '#c8f35c'; 

const MOCK_TRANSACTIONS: any[] = [];

export default function WalletScreen() {
  const { user, profile } = useAuth();
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickAdd, setQuickAdd] = useState('1600');
  const [summary, setSummary] = useState({ added: 0, spent: 0, refunded: 0 });
  const [stats, setStats] = useState({ bookingPercent: 0, shopPercent: 0, otherPercent: 0, avgMonthly: 0 });
  const [limit, setLimit] = useState(10);
  const [hasMore, setHasMore] = useState(true);

  const isOwner = profile?.role === 'ground_owner';

  useEffect(() => {
    if (user) {
      loadWalletData();
    }
  }, [user, profile?.role]);

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
        
        // 2. Fetch Wallet Transactions (Admin top-ups, etc.)
        const { data: wtxData } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('wallet_id', walletData.id)
          .order('created_at', { ascending: false })
          .limit(newLimit + 1);

        const walletTx = (wtxData || []).map(tx => ({
          id: tx.id,
          type: tx.type,
          title: tx.type === 'topup' ? 'Top-up Added' : (tx.description || 'Balance Adjustment'),
          sub: tx.type === 'topup' ? 'Added by Admin' : 'System Transaction',
          amount: tx.amount,
          date: new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + ', ' + new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          isPositive: Number(tx.amount) >= 0,
          rawDate: new Date(tx.created_at)
        }));

        let combined: any[] = [];
        if (isOwner) {
          const bookingTx = await loadOwnerTransactions(newLimit);
          combined = [...walletTx, ...bookingTx];
        } else {
          const bookingTx = await loadUserTransactions(newLimit);
          combined = [...walletTx, ...bookingTx];
        }

        combined.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
        
        setHasMore(combined.length > newLimit);
        setTransactions(combined.slice(0, newLimit));

        // Global Summary calculation from combined
        let earned = 0;
        let spent = 0;
        let refunded = 0;

        combined.forEach(tx => {
          if (tx.isPositive) {
             if (tx.type === 'refund') refunded += tx.amount;
             else earned += tx.amount;
          } else {
             spent += tx.amount;
          }
        });

        setSummary({
          added: earned,
          spent: spent,
          refunded: refunded
        });

        // Calculate Spending Stats
        if (spent > 0) {
          let spentOnBookings = 0;
          let spentOnShop = 0;
          combined.forEach(tx => {
            if (!tx.isPositive) {
              if (tx.type === 'payment') spentOnBookings += tx.amount;
              else if (tx.type === 'shop_payment') spentOnShop += tx.amount;
            }
          });
          
          const bookingPct = Math.round((spentOnBookings / spent) * 100);
          const shopPct = Math.round((spentOnShop / spent) * 100);
          const otherPct = 100 - bookingPct - shopPct;
          
          // Estimate avg monthly (very basic)
          const distinctMonths = new Set(combined.map(tx => tx.rawDate.getMonth() + '-' + tx.rawDate.getFullYear())).size || 1;
          const avg = Math.round(spent / distinctMonths);
          
          setStats({
            bookingPercent: bookingPct,
            shopPercent: shopPct,
            otherPercent: otherPct,
            avgMonthly: avg
          });
        }
      }
    } catch (err) {
      console.error('Wallet load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserTransactions = async (currentLimit: number) => {
    const [bookingsRes, ordersRes] = await Promise.all([
      supabase
        .from('bookings')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          ground:grounds(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(currentLimit),
      supabase
        .from('shop_orders')
        .select(`
          id,
          total_amount,
          status,
          created_at
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(currentLimit)
    ]);

    const bookingsTx = (bookingsRes.data || []).map(b => ({
      id: b.id,
      type: 'payment',
      title: `Payment for Booking`,
      sub: b.ground?.name || 'Booking',
      amount: b.total_amount,
      date: new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + ', ' + new Date(b.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      isPositive: false,
      rawDate: new Date(b.created_at)
    }));

    const ordersTx = (ordersRes.data || []).map(o => ({
       id: o.id,
       type: 'shop_payment',
       title: `Shop Order`,
       sub: `Order #${o.id.slice(0, 8).toUpperCase()}`,
       amount: o.total_amount,
       date: new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + ', ' + new Date(o.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
       isPositive: false,
       rawDate: new Date(o.created_at)
    }));

    return [...bookingsTx, ...ordersTx];
  };

  const loadOwnerTransactions = async (currentLimit: number) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          payment_method,
          ground:grounds!inner(name, city, owner_id)
        `)
        .eq('ground.owner_id', user.id)
        .in('status', ['confirmed', 'completed'])
        .order('created_at', { ascending: false })
        .limit(currentLimit);

      if (error) throw error;

      return (data || []).map(tx => ({
        id: tx.id,
        type: 'revenue',
        title: `Earning from ${tx.ground?.name}`,
        sub: `Booking #${tx.id.slice(0, 8).toUpperCase()}`,
        amount: tx.total_amount,
        date: new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + ', ' + new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        isPositive: true,
        rawDate: new Date(tx.created_at)
      }));
    } catch (err) {
      console.error('Wallet transactions error:', err);
      return [];
    }
  };

  const loadMore = () => {
    const newLimit = limit + 10;
    setLimit(newLimit);
    loadWalletData(newLimit);
  };

  const handleAddMoney = () => {
    const amount = parseInt(quickAdd) || 0;
    if (amount <= 0) return;
    
    setBalance(prev => prev + amount);
    setTransactions(prev => [
      {
        id: Date.now(),
        type: 'added',
        title: 'Money Added to Wallet',
        sub: 'Via Payment Gateway',
        amount: amount,
        date: 'Just now'
      },
      ...prev
    ]);
  };

  const renderRightPanel = () => (
    <View style={styles.rightPanel}>
      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Wallet Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Earnings</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary.added)}</Text>
        </View>
        {!isOwner && (
          <>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Spent</Text>
              <Text style={styles.summaryValue}>{formatCurrency(summary.spent)}</Text>
            </View>
            <View style={[styles.summaryRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Text style={styles.summaryLabel}>Total Refunded</Text>
              <Text style={styles.summaryValue}>{formatCurrency(summary.refunded)}</Text>
            </View>
          </>
        )}
      </View>



          {!isOwner && (
            <View style={styles.panelCard}>
              <Text style={styles.panelTitle}>Spending Stats</Text>
              <View style={styles.statsContainer}>
                 <View style={styles.donutWrapper}>
                  <View style={[styles.donutMock, { borderTopColor: '#043529', borderRightColor: stats.bookingPercent > 50 ? '#84cc16' : '#043529' }]} />
                  <View style={styles.donutInner}>
                     <Text style={styles.donutMainText}>Bookings</Text>
                     <Text style={styles.donutPercentText}>{stats.bookingPercent}%</Text>
                  </View>
                </View>
                <View style={styles.statsLegend}>
                  <View style={styles.legendRow}>
                     <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#84cc16'}]}/><Text style={styles.legendText}>Bookings</Text></View>
                     <Text style={styles.legendValue}>{stats.bookingPercent}%</Text>
                     <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#ef4444'}]}/><Text style={styles.legendText}>Shop</Text></View>
                     <Text style={styles.legendValue}>{stats.shopPercent}%</Text>
                  </View>
                </View>
                <Text style={styles.avgSpendText}>Avg. monthly spend: {formatCurrency(stats.avgMonthly)}</Text>
              </View>
            </View>
          )}
    </View>
  );

  const content = (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scrollContent, (Platform.OS === 'web' && !isCompact) && styles.scrollContentWeb]}
    >
      <View style={styles.mainLayout}>
        <View style={styles.centerContent}>

          
          <View style={styles.balanceCard}>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
              <Text style={styles.balanceSub}>Available for {isOwner ? 'withdrawal' : 'bookings'}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <View style={styles.transactionsList}>
            {loading ? (
              <ActivityIndicator color={THEME_BG} size="large" style={{ marginTop: 20 }} />
            ) : transactions.map(tx => {
               const isPos = tx.type === 'refund' || tx.type === 'reward' || tx.type === 'added' || tx.type === 'revenue' || tx.isPositive;
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
          </View>

          <View style={styles.viewAllWrapper}>
             {hasMore ? (
               <TouchableOpacity style={styles.viewAllBtn} onPress={loadMore} disabled={loading}>
                 <Text style={styles.viewAllTxt}>{loading ? 'Loading...' : 'Load More Transactions'}</Text>
               </TouchableOpacity>
             ) : transactions.length > 0 && (
               <Text style={styles.noMoreText}>No more transactions to show</Text>
             )}
          </View>
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
    padding: 0,
  },
  mainLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 32,
    maxWidth: 1400,
    width: '100%',
  },
  centerContent: {
    flex: 1,
  },
  rightPanel: {
    width: 340,
    flexShrink: 0,
    gap: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginBottom: 24,
  },
  balanceCard: {
    backgroundColor: ACCENT,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#043529',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: '#043529',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  balanceSub: {
    fontSize: 14,
    fontWeight: '500',
    color: '#043529',
    opacity: 0.8,
    fontFamily: 'Inter',
  },
  addMoneyBtn: {
    backgroundColor: '#043529',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  addMoneyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  sectionTitle: {
    fontSize: 20,
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
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  txIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconBoxPos: {
    backgroundColor: '#bbf7d0', // Light green tailwind
  },
  txIconBoxNeg: {
    backgroundColor: '#fecaca', // Light red tailwind
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginBottom: 2,
  },
  txSub: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  txValues: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  viewAllWrapper: {
    alignItems: 'center',
    marginTop: 24,
  },
  viewAllBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 99,
  },
  viewAllTxt: {
    color: '#043529',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  panelCard: {
    backgroundColor: '#E2E8F0', // Or a very light gray to match
    borderRadius: 20,
    padding: 20,
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
    borderBottomColor: '#CBD5E1',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  quickAddChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickAddChip: {
    backgroundColor: '#CBD5E1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 99,
  },
  quickAddChipActive: {
    backgroundColor: '#043529',
  },
  quickAddChipText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  quickAddChipTextActive: {
    color: '#FFFFFF',
  },
  quickAddInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingRight: 12,
  },
  quickAddInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
    outlineStyle: 'none' as any,
  },
  quickAddIconBox: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 4,
  },
  statsContainer: {
    alignItems: 'center',
  },
  donutWrapper: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
    position: 'relative',
  },
  donutMock: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 70,
    borderWidth: 15,
    borderColor: '#043529',
    borderTopColor: '#ef4444',
    borderRightColor: '#84cc16',
    borderBottomColor: '#043529',
    borderLeftColor: '#043529',
    transform: [{ rotate: '45deg' }],
  },
  donutInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutMainText: {
    fontSize: 12,
    color: '#0F172A',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  donutPercentText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  statsLegend: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginTop: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  legendValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    fontFamily: 'Inter',
    marginRight: 8,
  },
  avgSpendText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 16,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  noMoreText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
});
