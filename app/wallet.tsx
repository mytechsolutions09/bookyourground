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

const MOCK_TRANSACTIONS = [
  { id: 1, type: 'refund', title: 'Refund from Cancelled Booking #G48291', sub: 'Riverside Cricket Ground', amount: 1800, date: 'Today, 10:30 AM' },
  { id: 2, type: 'payment', title: 'Payment for Booking #G48288', sub: 'Hoops Hub - Jayanagar', amount: 1800, date: 'Yesterday, 7:15 PM' },
  { id: 3, type: 'reward', title: 'BMG Rewards Credited', sub: 'For inviting 3 friends', amount: 150, date: 'Dec 12, 2024' },
  { id: 4, type: 'payment', title: 'Payment for Booking #G48275', sub: 'GreenWave Turf', amount: 2400, date: 'Dec 11, 2024' },
];

export default function WalletScreen() {
  const { user, profile } = useAuth();
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  
  const [balance, setBalance] = useState(2840);
  const [transactions, setTransactions] = useState<any[]>(MOCK_TRANSACTIONS);
  const [loading, setLoading] = useState(false);
  const [quickAdd, setQuickAdd] = useState('1600');
  const [summary, setSummary] = useState({ added: 15000, spent: 12160, refunded: 2500 });

  const isOwner = profile?.role === 'ground_owner';

  useEffect(() => {
    if (user && isOwner) {
      loadOwnerData();
    }
  }, [user, isOwner]);

  const loadOwnerData = async () => {
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

      const rows = data || [];
      let totalOnline = 0;
      let totalCash = 0;
      
      const realTx = rows.map(tx => ({
        id: tx.id,
        type: 'revenue',
        title: `Earning from ${tx.ground?.name}`,
        sub: `Booking #${tx.id.slice(0, 8).toUpperCase()}`,
        amount: tx.total_amount,
        date: new Date(tx.booking_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        isPositive: true
      }));

      rows.forEach(tx => {
        if (tx.payment_method === 'cash') totalCash += tx.total_amount;
        else totalOnline += tx.total_amount;
      });

      setBalance(totalOnline);
      setTransactions(realTx.length > 0 ? realTx : MOCK_TRANSACTIONS);
      setSummary({
        added: totalOnline + totalCash,
        spent: 0,
        refunded: 0
      });
    } catch (err) {
      console.error('Wallet load error:', err);
    } finally {
      setLoading(false);
    }
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
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Spent</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary.spent)}</Text>
        </View>
        <View style={[styles.summaryRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
          <Text style={styles.summaryLabel}>Total Refunded</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary.refunded)}</Text>
        </View>
      </View>

      {!isOwner && (
        <>
          <View style={styles.panelCard}>
            <Text style={styles.panelTitle}>Quick Add</Text>
            <View style={styles.quickAddChips}>
              {['500', '1000', '2000', '1600'].map(amount => {
                const isSelected = quickAdd === amount;
                return (
                  <TouchableOpacity 
                    key={amount} 
                    style={[styles.quickAddChip, isSelected && styles.quickAddChipActive]}
                    onPress={() => setQuickAdd(amount)}
                  >
                    <Text style={[styles.quickAddChipText, isSelected && styles.quickAddChipTextActive]}>
                      +₹{amount}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <View style={styles.quickAddInputBox}>
              <TextInput 
                style={styles.quickAddInput} 
                value={quickAdd}
                onChangeText={text => setQuickAdd(text.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#94A3B8"
              />
              <View style={styles.quickAddIconBox}>
                 <ChevronDown size={16} color="#64748B" />
              </View>
            </View>
          </View>

          <View style={styles.panelCard}>
            <Text style={styles.panelTitle}>Spending Stats</Text>
            <View style={styles.statsContainer}>
              <View style={styles.donutWrapper}>
                <View style={styles.donutMock} />
                <View style={styles.donutInner}>
                   <Text style={styles.donutMainText}>Bookings</Text>
                   <Text style={styles.donutPercentText}>85%</Text>
                </View>
              </View>
              <View style={styles.statsLegend}>
                <View style={styles.legendRow}>
                   <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#043529'}]}/><Text style={styles.legendText}>Refunds</Text></View>
                   <Text style={styles.legendValue}>85%</Text>
                   <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#EF4444'}]}/><Text style={styles.legendText}>Rewards</Text></View>
                   <Text style={styles.legendValue}>5%</Text>
                </View>
              </View>
              <Text style={styles.avgSpendText}>Avg. monthly spend: ₹4,000</Text>
            </View>
          </View>
        </>
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
            {!isOwner && (
              <TouchableOpacity style={styles.addMoneyBtn} onPress={handleAddMoney}>
                <Text style={styles.addMoneyBtnText}>Add Money</Text>
              </TouchableOpacity>
            )}
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
             <TouchableOpacity style={styles.viewAllBtn}>
               <Text style={styles.viewAllTxt}>View All Transactions</Text>
             </TouchableOpacity>
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
});
