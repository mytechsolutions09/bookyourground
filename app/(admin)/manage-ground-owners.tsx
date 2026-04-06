import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Platform, TextInput } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import { router } from 'expo-router';
import { Building2, Search, Users, ExternalLink, Mail, Phone, ChevronRight } from 'lucide-react-native';

type OwnerRow = Profile & {
  totalGroundsCount: number;
  pendingGroundsCount: number;
};

export default function ManageGroundOwnersScreen() {
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOwnerId, setExpandedOwnerId] = useState<string | null>(null);

  useEffect(() => {
    loadOwners();
  }, []);

  const loadOwners = async () => {
    try {
      setLoading(true);

      // Fetch profiles with their associated grounds in one query
      const { data: res, error: ownersError } = await supabase
        .from('profiles')
        .select(`
          *,
          grounds:grounds(
            id,
            approved
          )
        `)
        .eq('role', 'ground_owner')
        .order('created_at', { ascending: false });

      if (ownersError) throw ownersError;

      const merged = (res || []).map((o: any) => {
        const grounds = o.grounds || [];
        return {
          ...o,
          totalGroundsCount: grounds.length,
          pendingGroundsCount: grounds.filter((g: any) => !g.approved).length,
        };
      });

      setOwners(merged);
    } catch (e) {
      console.error('Error loading ground owners:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredOwners = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return owners;
    return owners.filter(o => 
      o.full_name?.toLowerCase().includes(query) || 
      o.business_name?.toLowerCase().includes(query) || 
      o.email?.toLowerCase().includes(query) ||
      o.phone?.includes(query)
    );
  }, [owners, searchQuery]);

  const renderOwnerItem = ({ item }: { item: OwnerRow }) => {
    const isExpanded = expandedOwnerId === item.id;

    if (Platform.OS === 'web') {
      return (
        <View key={item.id}>
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => setExpandedOwnerId(isExpanded ? null : item.id)}
            style={[styles.webRow, isExpanded && styles.rowExpanded]}
          >
            <View style={[styles.cell, styles.colOwner]}>
              <View style={styles.ownerPrimaryInfo}>
                <Text style={styles.ownerNameText}>{item.business_name || item.full_name}</Text>
                {item.business_name && <Text style={styles.ownerSubText}>{item.full_name}</Text>}
              </View>
            </View>

            <View style={[styles.cell, styles.colContact]}>
              <Text style={styles.contactEmail}>{item.email}</Text>
              <Text style={styles.contactPhone}>{item.phone || 'No phone'}</Text>
            </View>

            <View style={[styles.cell, styles.colGrounds]}>
              <View style={styles.groundsBadgeRow}>
                <View style={styles.countBadge}>
                  <Text style={styles.countNum}>{item.totalGroundsCount}</Text>
                  <Text style={styles.countLabel}>Total</Text>
                </View>
                {item.pendingGroundsCount > 0 && (
                  <View style={[styles.countBadge, styles.pendingCountBadge]}>
                    <Text style={[styles.countNum, styles.pendingCountNum]}>{item.pendingGroundsCount}</Text>
                    <Text style={[styles.countLabel, styles.pendingCountLabel]}>Pending</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={[styles.cell, styles.colActions]}>
              <TouchableOpacity
                style={styles.webIconButton}
                onPress={() => router.push(`/(admin)/grounds?ownerId=${item.id}`)}
              >
                <ExternalLink size={16} color="#10b981" />
                <Text style={styles.webIconButtonText}>View Grounds</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.expandedContent}>
              <View style={styles.expandedGrid}>
                <View style={styles.expandedCol}>
                  <Text style={styles.expandedLabel}>Owner Details</Text>
                  <View style={styles.infoRow}>
                    <Mail size={14} color="#6B7280" />
                    <Text style={styles.infoValue}>{item.email}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Phone size={14} color="#6B7280" />
                    <Text style={styles.infoValue}>{item.phone || 'Not provided'}</Text>
                  </View>
                </View>
                <View style={styles.expandedCol}>
                  <Text style={styles.expandedLabel}>Registration</Text>
                  <Text style={styles.infoValue}>Joined: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}</Text>
                </View>
                <View style={styles.expandedActions}>
                    <TouchableOpacity 
                      style={styles.primaryActionButton}
                      onPress={() => router.push(`/(admin)/grounds?ownerId=${item.id}`)}
                    >
                        <Text style={styles.primaryActionButtonText}>Manage Business Grounds</Text>
                        <ChevronRight size={16} color="#FFF" />
                    </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      );
    }

    return (
      <Card style={styles.ownerCard}>
        <View style={styles.ownerHeader}>
          <View style={styles.iconPill}>
            <Users size={18} color="#10b981" />
          </View>
          <View style={styles.ownerInfo}>
            <Text style={styles.ownerName}>{item.business_name || item.full_name}</Text>
            {item.phone && <Text style={styles.ownerPhone}>{item.phone}</Text>}
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Total Grounds</Text>
            <Text style={styles.metaValue}>{item.totalGroundsCount}</Text>
          </View>
          <View style={[styles.metaItem, item.pendingGroundsCount > 0 && styles.metaItemPending]}>
            <Text style={styles.metaLabel}>Pending</Text>
            <Text style={[styles.metaValue, item.pendingGroundsCount > 0 && styles.metaValuePending]}>
                {item.pendingGroundsCount}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/(admin)/grounds?ownerId=${item.id}`)}
        >
          <Building2 size={18} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Review Grounds</Text>
        </TouchableOpacity>
      </Card>
    );
  };

  const content = (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Ground Owners</Text>
            <Text style={styles.subtitle}>{owners.length} registered partners</Text>
          </View>
          
          <View style={styles.searchContainer}>
            <Search size={18} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search owners or business name..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </View>

      {Platform.OS === 'web' && (
        <View style={styles.tableHeader}>
           <Text style={[styles.headerLabel, styles.colOwner]}>Business / Owner</Text>
           <Text style={[styles.headerLabel, styles.colContact]}>Contact Details</Text>
           <Text style={[styles.headerLabel, styles.colGrounds]}>Grounds Portfolio</Text>
           <Text style={[styles.headerLabel, styles.colActions, { textAlign: 'right' }]}>Actions</Text>
        </View>
      )}

      <FlatList
        data={filteredOwners}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadOwners} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No ground owners found matching your criteria.</Text>
          </View>
        }
        renderItem={renderOwnerItem}
      />
    </View>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerArea: {
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
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
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
  tableHeader: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colOwner: { flex: 2 },
  colContact: { flex: 1.5 },
  colGrounds: { flex: 1.5 },
  colActions: { flex: 1 },
  
  list: {
    padding: 16,
  },
  webRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
  ownerPrimaryInfo: {
    gap: 2,
  },
  ownerNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  ownerSubText: {
    fontSize: 12,
    color: '#6B7280',
  },
  contactEmail: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  contactPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  groundsBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  countLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  pendingCountBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  pendingCountNum: {
    color: '#EF4444',
  },
  pendingCountLabel: {
    color: '#B91C1C',
  },
  webIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  webIconButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
  },
  expandedContent: {
    backgroundColor: '#F0FDF4', // Matches the light green theme of active rows
    marginHorizontal: 0, // Removed margin to align perfectly with the row
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#10b981',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: 10,
    marginTop: -1,
  },
  expandedGrid: {
    flexDirection: 'row',
    gap: 32,
    alignItems: 'flex-start',
  },
  expandedCol: {
    flex: 1,
  },
  expandedLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  expandedActions: {
    width: 240,
  },
  primaryActionButton: {
    backgroundColor: '#10b981',
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  primaryActionButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  ownerCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
  },
  ownerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  ownerPhone: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  iconPill: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metaItem: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  metaItemPending: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  metaLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  metaValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  metaValuePending: {
    color: '#EF4444',
  },
  actionButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
