import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, RefreshControl, TextInput, TouchableOpacity } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/utils/helpers';
import { Search, TrendingUp, Users } from 'lucide-react-native';

interface GroundEarning {
  ground_id: string;
  ground_name: string;
  city: string | null;
  state: string | null;
  total_earnings: number;
  booking_count: number;
}

interface OwnerEarningRow {
  owner_id: string;
  owner_name: string | null;
  owner_email: string | null;
  business_name?: string | null;
  total_earnings: number;
  booking_count: number;
  grounds: GroundEarning[];
}

function AdminEarningsInner() {
  const [rows, setRows] = useState<OwnerEarningRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOwnerId, setExpandedOwnerId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('bookings')
        .select(
          `
          id,
          total_amount,
          status,
          ground:grounds!inner(
            id,
            name,
            city,
            state,
            owner_id,
            owner:profiles!inner(
              id,
              full_name,
              email,
              business_name
            )
          )
        `,
        )
        .in('status', ['confirmed', 'completed']);

      if (error) throw error;

      const map = new Map<string, OwnerEarningRow>();
      (data ?? []).forEach((row: any) => {
        const owner = row.ground?.owner;
        const ground = row.ground;
        if (!owner || !ground) return;
        
        const ownerKey = owner.id as string;
        const groundKey = ground.id as string;
        const amount = row.total_amount || 0;

        let ownerRow = map.get(ownerKey);
        if (!ownerRow) {
          ownerRow = {
            owner_id: ownerKey,
            owner_name: owner.full_name ?? null,
            owner_email: owner.email ?? null,
            business_name: owner.business_name ?? null,
            total_earnings: 0,
            booking_count: 0,
            grounds: [],
          };
          map.set(ownerKey, ownerRow);
        }

        ownerRow.total_earnings += amount;
        ownerRow.booking_count += 1;

        let groundEarning = ownerRow.grounds.find(g => g.ground_id === groundKey);
        if (!groundEarning) {
          groundEarning = {
            ground_id: groundKey,
            ground_name: ground.name || 'Unnamed Ground',
            city: ground.city ?? null,
            state: ground.state ?? null,
            total_earnings: 0,
            booking_count: 0,
          };
          ownerRow.grounds.push(groundEarning);
        }
        groundEarning.total_earnings += amount;
        groundEarning.booking_count += 1;
      });

      const list = Array.from(map.values()).sort(
        (a, b) => (b.total_earnings || 0) - (a.total_earnings || 0),
      );
      setRows(list);
    } catch (e) {
      console.error('Error loading admin earnings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRows = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return rows;
    return rows.filter(r => 
      r.owner_name?.toLowerCase().includes(query) || 
      r.owner_email?.toLowerCase().includes(query) || 
      r.business_name?.toLowerCase().includes(query)
    );
  }, [rows, searchQuery]);

  const totalEarnings = useMemo(() => rows.reduce((sum, r) => sum + r.total_earnings, 0), [rows]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Earnings by Owner</Text>
            <View style={styles.totalBadge}>
                <TrendingUp size={14} color="#10b981" />
                <Text style={styles.totalText}>Platform Total: {formatCurrency(totalEarnings)}</Text>
            </View>
          </View>
          
          <View style={styles.searchContainer}>
            <Search size={16} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search owners or business..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerLabel, styles.colOwner]}>Ground Owner</Text>
          <Text style={[styles.headerLabel, styles.colBookings]}>No. of Bookings</Text>
          <Text style={[styles.headerLabel, styles.colAmount]}>Total Earnings</Text>
        </View>

        {filteredRows.length === 0 ? (
          <View style={styles.emptyView}>
            <Users size={32} color="#D1D5DB" />
            <Text style={styles.emptyText}>No earnings data available for this search.</Text>
          </View>
        ) : (
          filteredRows.map((row) => (
            <View key={row.owner_id}>
              <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={() => setExpandedOwnerId(expandedOwnerId === row.owner_id ? null : row.owner_id)}
                style={[styles.row, expandedOwnerId === row.owner_id && styles.rowExpanded]}
              >
                <View style={[styles.cell, styles.colOwner]}>
                    <Text style={styles.ownerName}>{row.owner_name || 'Unknown'}</Text>
                    <Text style={styles.ownerSubtitle}>{row.business_name || row.owner_email}</Text>
                </View>

                <View style={[styles.cell, styles.colBookings]}>
                    <View style={styles.bookingBadge}>
                      <Text style={styles.bookingCount}>{row.booking_count}</Text>
                    </View>
                </View>

                <View style={[styles.cell, styles.colAmount]}>
                  <Text style={styles.amountText}>{formatCurrency(row.total_earnings)}</Text>
                  <View style={styles.percentRow}>
                      <TrendingUp size={10} color="#10b981" />
                      <Text style={styles.percentText}>{( (row.total_earnings / (totalEarnings || 1)) * 100).toFixed(1)}% of total</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {expandedOwnerId === row.owner_id && (
                <View style={styles.groundsList}>
                  <View style={styles.groundHeaderRow}>
                      <Text style={styles.groundHeaderLabel}>Owner's Grounds Performance</Text>
                  </View>
                  {row.grounds.map((g) => (
                    <View key={g.ground_id} style={styles.groundRow}>
                      <View style={{ flex: 1.5 }}>
                        <Text style={styles.groundNameText}>{g.ground_name}</Text>
                        <Text style={styles.groundMetaText}>
                          {g.city && g.state ? `${g.city}, ${g.state} • ` : ''}{g.booking_count} bookings
                        </Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                        <Text style={styles.groundAmountText}>{formatCurrency(g.total_earnings)}</Text>
                        <View style={styles.groundContribution}>
                            <Text style={styles.groundContributionText}>{( (g.total_earnings / (row.total_earnings || 1)) * 100).toFixed(1)}% share</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

export default function AdminEarningsScreen() {
  if (Platform.OS === 'web') {
    return (
      <WebLayout>
        <AdminEarningsInner />
      </WebLayout>
    );
  }

  return <AdminEarningsInner />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  totalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  totalText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  searchContainer: {
    flex: 1,
    minWidth: 300,
    maxWidth: 450,
    height: 42,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  table: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    marginBottom: 10,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colOwner: { flex: 2, paddingRight: 12 },
  colBookings: { flex: 1, alignItems: 'center', textAlign: 'center' },
  colAmount: { flex: 1.2, alignItems: 'flex-end', textAlign: 'right' },
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  rowExpanded: {
    borderColor: '#10b981',
    backgroundColor: '#F0F9FF',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  cell: {
    justifyContent: 'center',
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  ownerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  bookingBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 36,
    alignItems: 'center',
  },
  bookingCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  groundsList: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#10b981',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: 10,
    marginTop: -1,
  },
  groundHeaderRow: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 8,
  },
  groundHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  groundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  groundNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  groundMetaText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  groundAmountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  groundContribution: {
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 4,
  },
  groundContributionText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  emptyView: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
