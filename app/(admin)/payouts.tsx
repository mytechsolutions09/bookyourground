import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Platform, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  TextInput,
  useWindowDimensions,
  ScrollView
} from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDateDDMMYY } from '@/utils/helpers';
import { Search, IndianRupee, Calendar, Building2, User, CheckCircle2, AlertCircle, Eye } from 'lucide-react-native';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { router } from 'expo-router';

interface PayoutGroup {
  id: string;
  payoutDate: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  groundName: string;
  groundCity: string;
  matchCount: number;
  onlineRevenue: number;
  offlineFees: number;
  totalFees: number;
  netPayout: number;
  status: string;
  bookingIds: string[];
}

function AdminPayoutsInner() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isSmallWeb = isWeb && width < 1024;
  const isMobile = width < 768;

  const [bookings, setBookings] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [payoutSubTab, setPayoutSubTab] = useState<'requests' | 'history'>('requests');

  const loadData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          ground_price,
          platform_fee_owner,
          gst_owner,
          owner_settlement,
          payout_status,
          payout_processed_at,
          payment_method,
          ground:grounds(
            name, 
            city, 
            owner_id,
            owner:profiles!owner_id(full_name, email)
          ),
          user:profiles!user_id(full_name, email)
        `)
        .eq('payout_status', 'completed')
        .order('payout_processed_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);

      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from('withdrawals')
        .select(`
          id,
          created_at,
          amount,
          status,
          owner_id,
          owner:profiles!owner_id(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (withdrawalError) throw withdrawalError;
      setWithdrawals(withdrawalData || []);
    } catch (e) {
      console.error('Error loading payouts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Group bookings by Date and Owner/Ground
  const payoutGroups = useMemo(() => {
    const groups: Record<string, PayoutGroup> = {};

    bookings.forEach(b => {
      const date = b.payout_processed_at ? new Date(b.payout_processed_at).toISOString().split('T')[0] : 'Unknown';
      const ownerId = b.ground?.owner_id || 'Unknown';
      const groundName = b.ground?.name || 'Unknown';
      const key = `${date}_${ownerId}_${groundName}`;

      if (!groups[key]) {
        groups[key] = {
          id: key,
          payoutDate: date,
          ownerId: ownerId,
          ownerName: b.ground?.owner?.full_name || 'Unknown',
          ownerEmail: b.ground?.owner?.email || '',
          groundName: groundName,
          groundCity: b.ground?.city || '',
          matchCount: 0,
          onlineRevenue: 0,
          offlineFees: 0,
          totalFees: 0,
          netPayout: 0,
          status: 'completed',
          bookingIds: []
        };
      }

      const isOnline = b.payment_method === 'razorpay';
      const fee = (Number(b.platform_fee_owner || 0) + Number(b.gst_owner || 0));

      groups[key].matchCount += 1;
      groups[key].totalFees += fee;
      
      if (isOnline) {
        groups[key].onlineRevenue += Number(b.ground_price || 0);
        groups[key].netPayout += (Number(b.ground_price || 0) - fee);
      } else {
        groups[key].offlineFees += fee;
        groups[key].netPayout -= fee;
      }
      
      groups[key].bookingIds.push(b.id);
    });

    // Add completed manual withdrawals to the payout history
    withdrawals.forEach(w => {
      if (w.status === 'completed') {
        const date = w.created_at ? new Date(w.created_at).toISOString().split('T')[0] : 'Unknown';
        const ownerId = w.owner_id || 'Unknown';
        const key = `${date}_${ownerId}_withdrawal_${w.id}`;

        groups[key] = {
          id: key,
          payoutDate: date,
          ownerId: ownerId,
          ownerName: w.owner?.full_name || 'Unknown',
          ownerEmail: w.owner?.email || '',
          groundName: 'Manual Withdrawal',
          groundCity: '',
          matchCount: 0,
          onlineRevenue: 0,
          offlineFees: 0,
          totalFees: 0,
          netPayout: Number(w.amount || 0),
          status: 'completed',
          bookingIds: []
        };
      }
    });

    return Object.values(groups).sort((a, b) => b.payoutDate.localeCompare(a.payoutDate));
  }, [bookings, withdrawals]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return payoutGroups;
    const q = searchQuery.toLowerCase();
    return payoutGroups.filter(g => 
      g.ownerName.toLowerCase().includes(q) || 
      g.groundName.toLowerCase().includes(q) ||
      g.payoutDate.includes(q)
    );
  }, [payoutGroups, searchQuery]);

  const filteredWithdrawals = useMemo(() => {
    // Only show pending and processing requests in the Requests tab
    const list = withdrawals.filter(w => w.status === 'pending' || w.status === 'processing');
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(w => 
      (w.owner?.full_name || '').toLowerCase().includes(q) || 
      w.status.toLowerCase().includes(q) ||
      new Date(w.created_at).toLocaleDateString().includes(q)
    );
  }, [withdrawals, searchQuery]);

  const renderHeader = () => (
    <View style={[styles.header, (isMobile || isSmallWeb) && { padding: 16 }]}>
      <View style={[
        styles.headerTop,
        (isMobile || isSmallWeb) && { flexDirection: 'column', alignItems: 'stretch', gap: 12 }
      ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
          <Text style={styles.title}>Payout History</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              style={[
                { paddingVertical: 12, paddingHorizontal: 16 }, 
                payoutSubTab === 'requests' ? { borderBottomWidth: 3, borderBottomColor: '#10B981', backgroundColor: '#F9FAFB' } : {}
              ]}
              onPress={() => setPayoutSubTab('requests')}
            >
              <Text style={[{ fontSize: 13, fontWeight: '700', textTransform: 'uppercase' }, payoutSubTab === 'requests' ? { color: '#10B981' } : { color: '#6B7280' }]}>Payout Request</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                { paddingVertical: 12, paddingHorizontal: 16 }, 
                payoutSubTab === 'history' ? { borderBottomWidth: 3, borderBottomColor: '#10B981', backgroundColor: '#F9FAFB' } : {}
              ]}
              onPress={() => setPayoutSubTab('history')}
            >
              <Text style={[{ fontSize: 13, fontWeight: '700', textTransform: 'uppercase' }, payoutSubTab === 'history' ? { color: '#10B981' } : { color: '#6B7280' }]}>Payout</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.searchContainer, (isMobile || isSmallWeb) && { maxWidth: '100%' }]}>
          <Search size={16} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by owner, ground or date..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
              <X size={14} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );


  const content = (
    <View style={styles.container}>
      {Platform.OS === 'web' && renderHeader()}

      {isWeb && !isSmallWeb && (
        <View style={styles.tableHeaderContainer}>
          {payoutSubTab === 'requests' ? (
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { width: 130 }]}>Request Date</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Owner</Text>
              <Text style={[styles.tableHeaderCell, { width: 120 }]}>Amount</Text>
              <Text style={[styles.tableHeaderCell, { width: 110 }]}>Status</Text>
            </View>
          ) : (
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, styles.colDate]}>Payout Date</Text>
              <Text style={[styles.tableHeaderCell, styles.colOwner]}>Owner & Ground</Text>
              <Text style={[styles.tableHeaderCell, styles.colMatches]}>Matches</Text>
              <Text style={[styles.tableHeaderCell, styles.colAmount]}>Online Rev</Text>
              <Text style={[styles.tableHeaderCell, styles.colAmount]}>Offline Fees</Text>
              <Text style={[styles.tableHeaderCell, styles.colAmount]}>Net Payout</Text>
              <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
            </View>
          )}
        </View>
      )}

      <FlatList
        data={payoutSubTab === 'requests' ? filteredWithdrawals : filteredGroups}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          payoutSubTab === 'requests' ? (
            !isSmallWeb ? (
              <View style={[styles.tableRow]}>
                <View style={[styles.tableCell, { width: 130 }]}>
                  <View style={styles.dateBadge}>
                    <Calendar size={14} color="#6B7280" />
                    <Text style={styles.dateText}>{formatDateDDMMYY(item.created_at)}</Text>
                  </View>
                </View>
                <View style={[styles.tableCell, { flex: 2 }]}>
                  <Text style={styles.ownerName}>{item.owner?.full_name || 'Unknown'}</Text>
                  <Text style={styles.groundName}>{item.owner?.email || ''}</Text>
                </View>
                <View style={[styles.tableCell, { width: 120 }]}>
                  <Text style={styles.amountGross}>{formatCurrency(item.amount)}</Text>
                </View>
                <View style={[styles.tableCell, { width: 110 }]}>
                  {Platform.OS === 'web' ? (
                    <select
                      value={item.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        
                        if (newStatus === 'completed') {
                          // Check if already deducted
                          const { data: existingTx } = await supabase
                            .from('wallet_transactions')
                            .select('id')
                            .eq('reference_type', 'withdrawal')
                            .eq('reference_id', item.id)
                            .maybeSingle();
                            
                          if (!existingTx) {
                            // Check wallet balance first to ensure it never goes negative
                            const { data: wallet } = await supabase
                              .from('wallets')
                              .select('balance')
                              .eq('user_id', item.owner_id)
                              .single();
                              
                            if (wallet && wallet.balance < item.amount) {
                              alert('Error: Insufficient wallet balance to complete this payout.');
                              return;
                            }

                            // Deduct money from wallet
                            const { error: walletError } = await supabase.rpc('add_money_to_wallet', {
                              target_user_id: item.owner_id,
                              amount_to_add: -item.amount,
                              description_text: `Payout completed for request #${item.id.split('-')[0].toUpperCase()}`,
                              ref_type: 'withdrawal',
                              ref_id: item.id
                            });
                            
                            if (walletError) {
                              console.error('Failed to deduct wallet balance:', walletError);
                              alert('Failed to update wallet balance');
                              return;
                            }
                          }
                        }

                        const { error } = await supabase
                          .from('withdrawals')
                          .update({ status: newStatus })
                          .eq('id', item.id);
                        if (!error) {
                          setWithdrawals(prev => prev.map(w => w.id === item.id ? { ...w, status: newStatus } : w));
                        } else {
                          alert('Failed to update status');
                        }
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '20px',
                        backgroundColor: item.status === 'completed' ? '#ECFDF5' : '#FEF3C7',
                        color: item.status === 'completed' ? '#059669' : '#D97706',
                        border: 'none',
                        fontWeight: '800',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                    </select>
                  ) : (
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? '#ECFDF5' : '#FEF3C7' }]}>
                      {item.status === 'completed' ? <CheckCircle2 size={14} color="#10B981" /> : <AlertCircle size={14} color="#D97706" />}
                      <Text style={[styles.statusText, { color: item.status === 'completed' ? '#059669' : '#D97706', textTransform: 'capitalize' }]}>{item.status}</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
                <View style={[styles.tableRow, { minWidth: 700 }]}>
                  <View style={[styles.tableCell, { width: 130 }]}>
                    <View style={styles.dateBadge}>
                      <Calendar size={14} color="#6B7280" />
                      <Text style={styles.dateText}>{formatDateDDMMYY(item.created_at)}</Text>
                    </View>
                  </View>
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <Text style={styles.ownerName}>{item.owner?.full_name || 'Unknown'}</Text>
                    <Text style={styles.groundName}>{item.owner?.email || ''}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: 120 }]}>
                    <Text style={styles.amountGross}>{formatCurrency(item.amount)}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: 110 }]}>
                    {Platform.OS === 'web' ? (
                      <select
                        value={item.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          
                          if (newStatus === 'completed') {
                            // Check if already deducted
                            const { data: existingTx } = await supabase
                              .from('wallet_transactions')
                              .select('id')
                              .eq('reference_type', 'withdrawal')
                              .eq('reference_id', item.id)
                              .maybeSingle();
                              
                            if (!existingTx) {
                              // Check wallet balance first to ensure it never goes negative
                              const { data: wallet } = await supabase
                                .from('wallets')
                                .select('balance')
                                .eq('user_id', item.owner_id)
                                .single();
                                
                              if (wallet && wallet.balance < item.amount) {
                                alert('Error: Insufficient wallet balance to complete this payout.');
                                return;
                              }

                              // Deduct money from wallet
                              const { error: walletError } = await supabase.rpc('add_money_to_wallet', {
                                target_user_id: item.owner_id,
                                amount_to_add: -item.amount,
                                description_text: `Payout completed for request #${item.id.split('-')[0].toUpperCase()}`,
                                ref_type: 'withdrawal',
                                ref_id: item.id
                              });
                              
                              if (walletError) {
                                console.error('Failed to deduct wallet balance:', walletError);
                                alert('Failed to update wallet balance');
                                return;
                              }
                            }
                          }

                          const { error } = await supabase
                            .from('withdrawals')
                            .update({ status: newStatus })
                            .eq('id', item.id);
                          if (!error) {
                            setWithdrawals(prev => prev.map(w => w.id === item.id ? { ...w, status: newStatus } : w));
                          } else {
                            alert('Failed to update status');
                          }
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '20px',
                          backgroundColor: item.status === 'completed' ? '#ECFDF5' : '#FEF3C7',
                          color: item.status === 'completed' ? '#059669' : '#D97706',
                          border: 'none',
                          fontWeight: '800',
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                      </select>
                    ) : (
                      <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? '#ECFDF5' : '#FEF3C7' }]}>
                        {item.status === 'completed' ? <CheckCircle2 size={14} color="#10B981" /> : <AlertCircle size={14} color="#D97706" />}
                        <Text style={[styles.statusText, { color: item.status === 'completed' ? '#059669' : '#D97706', textTransform: 'capitalize' }]}>{item.status}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            )
          ) : (
            !isSmallWeb ? (
              <TouchableOpacity 
                style={[styles.tableRow]}
                activeOpacity={0.7}
                onPress={() => {
                    // Future: show details of all matches in this payout
                }}
              >
                <View style={[styles.tableCell, styles.colDate]}>
                  <View style={styles.dateBadge}>
                    <Calendar size={14} color="#6B7280" />
                    <Text style={styles.dateText}>{formatDateDDMMYY(item.payoutDate)}</Text>
                  </View>
                </View>

                <View style={[styles.tableCell, styles.colOwner]}>
                  <Text style={styles.ownerName}>{item.ownerName}</Text>
                  <View style={styles.groundInfo}>
                    <Building2 size={12} color="#9CA3AF" />
                    <Text style={styles.groundName}>{item.groundName}</Text>
                  </View>
                </View>

                <View style={[styles.tableCell, styles.colMatches]}>
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchCountText}>{item.matchCount} Matches</Text>
                  </View>
                </View>

                <View style={[styles.tableCell, styles.colAmount]}>
                  <Text style={styles.amountGross}>₹{Math.round(item.onlineRevenue)}</Text>
                </View>

                <View style={[styles.tableCell, styles.colAmount]}>
                  <Text style={styles.amountFees}>-₹{Math.round(item.offlineFees)}</Text>
                </View>

                <View style={[styles.tableCell, styles.colAmount]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={[styles.amountNet, item.netPayout <= 0 && { color: '#EF4444' }]}>
                      ₹{Math.max(0, Math.round(item.netPayout))}
                    </Text>
                    {item.netPayout < 0 && (
                       <View style={styles.debtBadge}>
                         <Text style={styles.debtText}>DEBT</Text>
                       </View>
                    )}
                  </View>
                </View>

                <View style={[styles.tableCell, styles.colStatus]}>
                  <View style={styles.statusBadge}>
                    <CheckCircle2 size={14} color="#10B981" />
                    <Text style={styles.statusText}>{item.netPayout <= 0 ? 'ADJUSTED' : 'SETTLED'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
                <TouchableOpacity 
                  style={[styles.tableRow, { minWidth: 700 }]}
                  activeOpacity={0.7}
                  onPress={() => {
                      // Future: show details of all matches in this payout
                  }}
                >
                  <View style={[styles.tableCell, styles.colDate]}>
                    <View style={styles.dateBadge}>
                      <Calendar size={14} color="#6B7280" />
                      <Text style={styles.dateText}>{formatDateDDMMYY(item.payoutDate)}</Text>
                    </View>
                  </View>

                  <View style={[styles.tableCell, styles.colOwner]}>
                    <Text style={styles.ownerName}>{item.ownerName}</Text>
                    <View style={styles.groundInfo}>
                      <Building2 size={12} color="#9CA3AF" />
                      <Text style={styles.groundName}>{item.groundName}</Text>
                    </View>
                  </View>

                  <View style={[styles.tableCell, styles.colMatches]}>
                    <View style={styles.matchBadge}>
                      <Text style={styles.matchCountText}>{item.matchCount} Matches</Text>
                    </View>
                  </View>

                  <View style={[styles.tableCell, styles.colAmount]}>
                    <Text style={styles.amountGross}>₹{Math.round(item.onlineRevenue)}</Text>
                  </View>

                  <View style={[styles.tableCell, styles.colAmount]}>
                    <Text style={styles.amountFees}>-₹{Math.round(item.offlineFees)}</Text>
                  </View>

                  <View style={[styles.tableCell, styles.colAmount]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={[styles.amountNet, item.netPayout <= 0 && { color: '#EF4444' }]}>
                        ₹{Math.max(0, Math.round(item.netPayout))}
                      </Text>
                      {item.netPayout < 0 && (
                         <View style={styles.debtBadge}>
                           <Text style={styles.debtText}>DEBT</Text>
                         </View>
                      )}
                    </View>
                  </View>

                  <View style={[styles.tableCell, styles.colStatus]}>
                    <View style={styles.statusBadge}>
                      <CheckCircle2 size={14} color="#10B981" />
                      <Text style={styles.statusText}>{item.netPayout <= 0 ? 'ADJUSTED' : 'SETTLED'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            )
          )
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <AlertCircle size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No payouts found</Text>
            </View>
          )
        }
      />
    </View>
  );

  return isWeb ? <WebLayout>{content}</WebLayout> : (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <MobileAppNavbar title="PAYOUTS" titleColor="#00ea6b" />
      {content}
    </View>
  );
}

export default AdminPayoutsInner;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 36,
    flex: 1,
    maxWidth: 400,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#111827',
    paddingVertical: 0,
    height: '100%',
    ...Platform.select({
      web: { outlineStyle: 'none' }
    }) as any,
  },
  searchClearBtn: {
    padding: 4,
  },
  tableHeaderContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderRow: {
    flexDirection: 'row',
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  list: {
    padding: 16,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    ...Platform.select({
      web: {
        transition: 'all 0.2s',
      }
    }) as any,
  },
  tableCell: {
    paddingRight: 16,
  },
  colDate: {
    width: 130,
  },
  colOwner: {
    flex: 2,
  },
  colMatches: {
    width: 110,
  },
  colAmount: {
    width: 120,
  },
  colStatus: {
    width: 110,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },
  groundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  groundName: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  matchBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  matchCountText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '700',
  },
  amountGross: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  amountFees: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  amountNet: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '800',
    fontFamily: 'Inter',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '600',
  },
});
