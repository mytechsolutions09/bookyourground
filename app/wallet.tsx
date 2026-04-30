import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, useWindowDimensions, ScrollView, ActivityIndicator } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { ArrowUp, ArrowDown, CreditCard } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/utils/helpers';

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
        
        // 2. Fetch Wallet Transactions
        const { data: wtxData } = await supabase
          .from('wallet_transactions')
          .select('*, booking:bookings(id, ground:grounds(name))')
          .eq('user_id', user.id)
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

          <Text style={styles.sectionTitle}>Transaction History</Text>
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

          {isCompact && (
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
  }
});
