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
  TextInput
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
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
          ground:grounds(name, city, owner_id),
          user:profiles!user_id(full_name, email),
          owner:profiles!owner_id(full_name, email)
        `)
        .eq('payout_status', 'completed')
        .order('payout_processed_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
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
          ownerName: b.owner?.full_name || 'Unknown',
          ownerEmail: b.owner?.email || '',
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

    return Object.values(groups).sort((a, b) => b.payoutDate.localeCompare(a.payoutDate));
  }, [bookings]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return payoutGroups;
    const q = searchQuery.toLowerCase();
    return payoutGroups.filter(g => 
      g.ownerName.toLowerCase().includes(q) || 
      g.groundName.toLowerCase().includes(q) ||
      g.payoutDate.includes(q)
    );
  }, [payoutGroups, searchQuery]);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.title}>Automated Payouts</Text>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={18} color="#9CA3AF" />
            <TextInput
              placeholder="Search by owner, ground or date..."
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </View>
    </View>
  );

  const isWeb = Platform.OS === 'web';

  const content = (
    <View style={styles.container}>
      {renderHeader()}

      {isWeb && (
        <View style={styles.tableHeaderContainer}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.colDate]}>Payout Date</Text>
            <Text style={[styles.tableHeaderCell, styles.colOwner]}>Owner & Ground</Text>
            <Text style={[styles.tableHeaderCell, styles.colMatches]}>Matches</Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount]}>Online Rev</Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount]}>Offline Fees</Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount]}>Net Payout</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
          </View>
        </View>
      )}

      <FlatList
        data={filteredGroups}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.tableRow}
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
                <Text style={styles.groundName}>{item.groundName}, {item.groundCity}</Text>
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
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <MobileAppNavbar title="PAYOUTS" titleColor="#10b981" />
      {content}
    </View>
  );
}

export default AdminPayoutsInner;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Inter',
  },
  searchContainer: {
    flex: 1,
    maxWidth: 400,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#111827',
    fontFamily: 'Inter',
  },
  tableHeaderContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableHeaderRow: {
    flexDirection: 'row',
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    padding: 16,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  groundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  groundName: {
    fontSize: 12,
    color: '#6B7280',
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
    fontSize: 11,
    color: '#059669',
    fontWeight: '800',
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
