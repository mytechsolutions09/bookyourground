import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, Platform, TextInput, TouchableOpacity, Image } from 'react-native';
import { supabase } from '@/lib/supabase';
import { GroundWithImages } from '@/types';
import GroundCard from '@/components/grounds/GroundCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { useLocalSearchParams } from 'expo-router';
import { Search, X } from 'lucide-react-native';

export default function ApproveGroundsScreen() {
  const params = useLocalSearchParams();
  const ownerIdParam = Array.isArray(params.ownerId) ? params.ownerId[0] : params.ownerId;

  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGround, setSelectedGround] = useState<GroundWithImages | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadGrounds();
  }, [ownerIdParam]);

  const loadGrounds = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('grounds')
        .select(`
          *,
          ground_images(*),
          owner:profiles(full_name, phone, business_name)
        `)
        .eq('approved', false);

      if (ownerIdParam) query = query.eq('owner_id', ownerIdParam);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setGrounds(data || []);
    } catch (error) {
      console.error('Error loading grounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateGroundStatus = async (groundId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('grounds')
        .update({ approved })
        .eq('id', groundId);

      if (error) throw error;

      if (Platform.OS === 'web') {
        alert(`Ground ${approved ? 'approved' : 'rejected'} successfully`);
      } else {
        Alert.alert('Success', `Ground ${approved ? 'approved' : 'rejected'} successfully`);
      }
      loadGrounds();
      setSelectedGround(null);
    } catch (error: any) {
      if (Platform.OS === 'web') {
        alert('Error: ' + error.message);
      } else {
        Alert.alert('Error', error.message);
      }
    }
  };

  const filteredGrounds = grounds.filter(g => {
    const q = searchQuery.toLowerCase();
    return g.name.toLowerCase().includes(q) || 
           (g.owner?.business_name || '').toLowerCase().includes(q) ||
           (g.owner?.full_name || '').toLowerCase().includes(q) ||
           g.city.toLowerCase().includes(q);
  });

  const content = (
    <View style={styles.container}>
      {Platform.OS === 'web' && (
        <View style={[styles.header, styles.webHeader]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.title}>Approve Grounds</Text>
              <Text style={styles.subtitle}>
                {grounds.length} pending approval{grounds.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.searchContainer}>
              <Search size={16} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search grounds or owners..."
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
      )}

      {Platform.OS === 'web' && grounds.length > 0 && (
        <View style={styles.tableHeaderContainer}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Ground</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Owner</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Location</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Actions</Text>
          </View>
        </View>
      )}

      <FlatList
        data={filteredGrounds}
        renderItem={({ item }) => {
          const isSelected = selectedGround?.id === item.id;
          const primaryImage =
            item.ground_images?.find((img: any) => img.is_primary)?.image_url ||
            item.ground_images?.[0]?.image_url ||
            'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';

          if (Platform.OS === 'web') {
            return (
              <View>
                <TouchableOpacity
                  onPress={() => setSelectedGround(isSelected ? null : item)}
                  style={[styles.tableRow, isSelected && styles.tableRowSelected]}
                >
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <View style={styles.tableGroundInfo}>
                      <Image source={{ uri: primaryImage }} style={styles.tableThumb} />
                      <View>
                        <Text style={styles.groundName}>{item.name}</Text>
                        <Text style={styles.groundType}>{item.pitch_type}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.tableCell, { flex: 1.5 }]}>
                    <Text style={styles.ownerName}>{item.owner?.business_name || item.owner?.full_name || '—'}</Text>
                    <Text style={styles.ownerPhone}>{item.owner?.phone || '—'}</Text>
                  </View>

                  <View style={[styles.tableCell, { flex: 1.5 }]}>
                    <Text style={styles.locationText}>{item.city}, {item.state}</Text>
                  </View>

                  <View style={[styles.tableCell, { flex: 1.2 }]}>
                    <View style={styles.tableRowActions}>
                      <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: '#dcfce7' }]}
                        onPress={() => updateGroundStatus(item.id, true)}
                      >
                        <Text style={{ color: '#16a34a', fontWeight: '800', fontSize: 10, fontFamily: 'Inter' }}>APPROVE</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: '#fee2e2' }]}
                        onPress={() => updateGroundStatus(item.id, false)}
                      >
                        <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 10, fontFamily: 'Inter' }}>REJECT</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>

                {isSelected && (
                  <View style={styles.tableDetailsSection}>
                    <Text style={styles.detailsTitle}>Pending Review Details</Text>
                    <Text style={styles.detailsText}>Address: {item.address}, {item.pincode}</Text>
                    <Text style={styles.detailsText}>Description: {item.description || 'No description provided.'}</Text>
                  </View>
                )}
              </View>
            );
          }

          return (
            <View>
              <GroundCard
                ground={item}
                showBookingSchedule
                onPress={() => setSelectedGround(isSelected ? null : item)}
              />
              {isSelected && (
                <Card style={styles.actionsCard}>
                  <Text style={styles.actionsTitle}>Review Ground</Text>
                  {item.owner && (
                    <View style={styles.ownerInfo}>
                      <Text style={styles.ownerLabel}>Owner</Text>
                      <Text style={styles.ownerText}>
                        {item.owner.business_name || item.owner.full_name}
                      </Text>
                      {item.owner.phone && (
                        <Text style={styles.ownerContact}>{item.owner.phone}</Text>
                      )}
                    </View>
                  )}
                  <View style={styles.actionsButtons}>
                    <Button
                      title="Approve"
                      onPress={() => updateGroundStatus(item.id, true)}
                      variant="secondary"
                      size="small"
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Reject"
                      onPress={() => updateGroundStatus(item.id, false)}
                      variant="danger"
                      size="small"
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              )}
            </View>
          );
        }}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadGrounds} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No grounds pending approval</Text>
          </View>
        }
      />
    </View>
  );

  return (
    <>
      {Platform.OS === 'web' ? (
        <WebLayout>{content}</WebLayout>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
          <MobileAppNavbar title="APPROVE GROUNDS" titleColor="#10b981" />
          {content}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  webHeader: {
    paddingTop: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'Inter',
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
    width: 300,
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
  list: {
    padding: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter',
  },
  tableHeaderContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    fontFamily: 'Inter',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableRowSelected: {
    backgroundColor: '#F9FAFB',
  },
  tableCell: {
    paddingRight: 12,
  },
  tableGroundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tableThumb: {
    width: 44,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  groundName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },
  groundType: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
    fontFamily: 'Inter',
  },
  ownerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Inter',
  },
  ownerPhone: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  locationText: {
    fontSize: 12,
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  tableRowActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tableDetailsSection: {
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 13,
    color: '#374151',
    fontFamily: 'Inter',
    marginBottom: 6,
  },
  // Mobile styles
  actionsCard: {
    marginTop: -4,
    marginBottom: 12,
    backgroundColor: '#FFF9E6',
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 12,
  },
  ownerInfo: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  ownerLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  ownerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  ownerContact: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  actionsButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});
