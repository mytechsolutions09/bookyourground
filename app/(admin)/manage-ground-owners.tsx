import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Platform, TextInput, Switch, Alert, Modal, ScrollView as RNScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import { router } from 'expo-router';
import { Building2, Search, Users, ExternalLink, Mail, Phone, ChevronRight, Check, Clock, X } from 'lucide-react-native';
import MobileAppNavbar from '@/components/MobileAppNavbar';

type OwnerRow = Profile & {
  totalGroundsCount: number;
  pendingGroundsCount: number;
  charge_platform_fee?: boolean;
  bankDetails?: {
    bank_name: string;
    account_number: string;
    ifsc: string;
    upi_id: string;
    is_approved?: boolean;
    rejected_at?: string | null;
    rejection_reason?: string | null;
  };
};

export default function ManageGroundOwnersScreen() {
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<OwnerRow | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

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

      const { data: bankRes } = await supabase.from('owner_bank_details').select('*');
      const bankMap = (bankRes || []).reduce((acc: any, b: any) => {
        acc[b.owner_id] = b;
        return acc;
      }, {});

      const merged = (res || []).map((o: any) => {
        const grounds = o.grounds || [];
        return {
          ...o,
          totalGroundsCount: grounds.length,
          pendingGroundsCount: grounds.filter((g: any) => !g.approved).length,
          bankDetails: bankMap[o.id] || null,
        };
      });

      setOwners(merged);
    } catch (e) {
      console.error('Error loading ground owners:', e);
    } finally {
      setLoading(false);
    }
  };

  const togglePlatformFee = async (owner: OwnerRow) => {
    try {
      const newVal = !owner.charge_platform_fee;
      const { error } = await supabase
        .from('profiles')
        .update({ charge_platform_fee: newVal })
        .eq('id', owner.id);
      
      if (error) throw error;
      
      setOwners(prev => prev.map(o => o.id === owner.id ? { ...o, charge_platform_fee: newVal } : o));
    } catch (e: any) {
      console.error('Error toggling platform fee:', e);
      Alert.alert('Error', 'Could not update platform fee setting: ' + e.message);
    }
  };

  const approveBankDetails = async (ownerId: string) => {
    try {
      const { error } = await supabase
        .from('owner_bank_details')
        .update({ 
          is_approved: true,
          approved_at: new Date().toISOString(),
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          rejected_at: null,
          rejected_by: null,
          rejection_reason: null,
        })
        .eq('owner_id', ownerId);
      
      if (error) throw error;
      
      Alert.alert('Success', 'Bank details approved successfully');
      loadOwners();
    } catch (e: any) {
      console.error('Error approving bank details:', e);
      Alert.alert('Error', 'Could not approve bank details: ' + e.message);
    }
  };

  const rejectBankDetails = async (ownerId: string, reason: string) => {
    const trimmed = reason.trim();
    if (!trimmed) {
      Alert.alert('Missing reason', 'Please enter a rejection reason so the owner can fix it.');
      return;
    }

    try {
      setRejecting(true);
      const authUser = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase
        .from('owner_bank_details')
        .update({
          is_approved: false,
          approved_at: null,
          approved_by: null,
          rejected_at: new Date().toISOString(),
          rejected_by: authUser?.id,
          rejection_reason: trimmed,
        })
        .eq('owner_id', ownerId);

      if (error) throw error;

      Alert.alert('Rejected', 'Bank details rejected. The owner will be asked to update details.');
      setShowRejectModal(false);
      setRejectReason('');
      loadOwners();
    } catch (e: any) {
      console.error('Error rejecting bank details:', e);
      Alert.alert('Error', 'Could not reject bank details: ' + e.message);
    } finally {
      setRejecting(false);
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

    if (Platform.OS === 'web') {
      const feeEnabled = item.charge_platform_fee !== false;
      return (
        <>
          <TouchableOpacity 
            activeOpacity={0.7} 
            style={styles.tableRow}
            onPress={() => setSelectedOwner(item)}
          >
            <View style={[styles.tableCell, styles.colOwner]}>
              <View style={styles.ownerPrimaryInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                   <Text style={styles.ownerNameText}>{item.business_name || item.full_name}</Text>
                </View>
                {item.business_name && <Text style={styles.ownerSubText}>{item.full_name}</Text>}
                {(item.address || item.state) && (
                  <Text style={styles.locationText} numberOfLines={1}>
                    {[item.address, item.state].filter(Boolean).join(', ')}
                  </Text>
                )}
              </View>
            </View>

            <View style={[styles.tableCell, styles.colContact]}>
              <Text style={styles.contactEmail}>{item.email}</Text>
              <Text style={styles.contactPhone}>{item.phone || 'No phone'}</Text>
            </View>

            <View style={[styles.tableCell, styles.colGrounds]}>
              <View style={styles.groundsBadgeRow}>
                <View style={styles.countBadge}>
                  <Text style={styles.countNum}>{item.totalGroundsCount}</Text>
                  <Text style={styles.countLabel}>Total</Text>
                </View>
              </View>
            </View>

            <View style={[styles.tableCell, styles.colFee]}>
              <Switch
                value={feeEnabled}
                onValueChange={() => togglePlatformFee(item)}
                trackColor={{ false: '#CBD5E1', true: '#00ea6b' }}
                thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                onStartShouldSetResponder={() => true}
                onTouchEnd={(e) => e.stopPropagation()}
              />
            </View>

            <View style={[styles.tableCell, styles.colJoined]}>
               <Text style={styles.joinedDateText}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
               </Text>
            </View>

            <View style={[styles.tableCell, styles.colActions]}>
              <TouchableOpacity
                style={styles.webIconButton}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(`/(admin)/grounds?ownerId=${item.id}`);
                }}
              >
                <ExternalLink size={14} color="#00ea6b" />
                <Text style={styles.webIconButtonText}>Grounds</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

        </>
      );
    }

    return (
      <View style={styles.ownerCard}>
        <View style={styles.ownerHeader}>
          <View style={styles.iconPill}>
            <Users size={18} color="#00ea6b" />
          </View>
          <View style={styles.ownerInfo}>
            <Text style={styles.ownerName}>{item.business_name || item.full_name}</Text>
            {(item.address || item.state) && (
              <Text style={styles.locationTextMobile} numberOfLines={1}>
                {[item.address, item.state].filter(Boolean).join(', ')}
              </Text>
            )}
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
          onPress={() => setSelectedOwner(item)}
        >
          <Building2 size={18} color="#05291f" />
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const content = (
    <View style={styles.container}>
      {Platform.OS === 'web' && (
        <View style={styles.headerArea}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Venue Owners</Text>
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
      )}

      {Platform.OS === 'web' && (
        <View style={styles.tableHeaderContainer}>
           <Text style={[styles.headerLabel, styles.colOwner]}>Business / Owner</Text>
           <Text style={[styles.headerLabel, styles.colContact]}>Contact Details</Text>
           <Text style={[styles.headerLabel, styles.colGrounds]}>Grounds</Text>
           <Text style={[styles.headerLabel, styles.colFee]}>Fee Setting</Text>
           <Text style={[styles.headerLabel, styles.colJoined]}>Joined</Text>
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
            <Text style={styles.emptyText}>No venue owners found matching your criteria.</Text>
          </View>
        }
        renderItem={renderOwnerItem}
      />

      <Modal
        visible={!!selectedOwner}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedOwner(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedOwner?.business_name || selectedOwner?.full_name}</Text>
                <Text style={styles.modalSubtitle}>
                  {[selectedOwner?.full_name, selectedOwner?.address, selectedOwner?.state].filter(Boolean).join(' • ')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedOwner(null)} style={styles.closeBtn}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <RNScrollView style={styles.modalBody}>
              <View style={styles.modalSection}>
                <View style={styles.bankHeaderRow}>
                  <Text style={styles.modalLabel}>Banking Information</Text>
                  {selectedOwner?.bankDetails && (
                    <View style={[
                      styles.statusBadge,
                      selectedOwner.bankDetails.is_approved
                        ? styles.approvedBadge
                        : selectedOwner.bankDetails.rejected_at
                          ? styles.rejectedBadge
                          : styles.pendingBadge
                    ]}>
                      {selectedOwner.bankDetails.is_approved ? (
                        <Check size={10} color="#059669" />
                      ) : selectedOwner.bankDetails.rejected_at ? (
                        <X size={10} color="#DC2626" />
                      ) : (
                        <Clock size={10} color="#D97706" />
                      )}
                      <Text style={[
                        styles.statusBadgeText,
                        selectedOwner.bankDetails.is_approved
                          ? styles.approvedText
                          : selectedOwner.bankDetails.rejected_at
                            ? styles.rejectedText
                            : styles.pendingText
                      ]}>
                        {selectedOwner.bankDetails.is_approved ? 'APPROVED' : selectedOwner.bankDetails.rejected_at ? 'REJECTED' : 'PENDING'}
                      </Text>
                    </View>
                  )}
                </View>

                {selectedOwner?.bankDetails ? (
                  <View style={styles.bankInfoGrid}>
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoLabel}>Bank Name</Text>
                      <Text style={styles.infoValue}>{selectedOwner.bankDetails.bank_name}</Text>
                    </View>
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoLabel}>Account Number</Text>
                      <Text style={styles.infoValue}>{selectedOwner.bankDetails.account_number}</Text>
                    </View>
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoLabel}>IFSC Code</Text>
                      <Text style={styles.infoValue}>{selectedOwner.bankDetails.ifsc}</Text>
                    </View>
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoLabel}>UPI ID</Text>
                      <Text style={[styles.infoValue, { color: '#00ea6b' }]}>{selectedOwner.bankDetails.upi_id || '—'}</Text>
                    </View>
                    
                    {!selectedOwner.bankDetails.is_approved && (
                      <View style={{ width: '100%' as any }}>
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                          <TouchableOpacity
                            style={[styles.approveButton, { flex: 1, minWidth: 180 } as any]}
                            onPress={() => approveBankDetails(selectedOwner.id)}
                          >
                            <Check size={14} color="#05291f" />
                            <Text style={styles.approveButtonText}>Approve Bank Details</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.rejectButton, { flex: 1, minWidth: 180 } as any]}
                            onPress={() => {
                              setRejectReason(selectedOwner.bankDetails?.rejection_reason || '');
                              setShowRejectModal(true);
                            }}
                          >
                            <X size={14} color="#7F1D1D" />
                            <Text style={styles.rejectButtonText}>Reject</Text>
                          </TouchableOpacity>
                        </View>

                        {selectedOwner.bankDetails.rejected_at && selectedOwner.bankDetails.rejection_reason ? (
                          <View style={styles.rejectionBox}>
                            <Text style={styles.rejectionTitle}>Previous rejection reason</Text>
                            <Text style={styles.rejectionReason}>{selectedOwner.bankDetails.rejection_reason}</Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={styles.noInfoText}>No banking details provided yet.</Text>
                )}
              </View>

              <View style={[styles.modalSection, { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 20 }]}>
                <Text style={styles.modalLabel}>Contact Details</Text>
                <View style={styles.modalContactGrid}>
                  <View style={styles.modalContactItem}>
                    <Mail size={16} color="#6B7280" />
                    <Text style={styles.modalContactText}>{selectedOwner?.email}</Text>
                  </View>
                  <View style={styles.modalContactItem}>
                    <Phone size={16} color="#6B7280" />
                    <Text style={styles.modalContactText}>{selectedOwner?.phone || 'No phone provided'}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.modalSection, { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 20, marginBottom: 0 }]}>
                <Text style={styles.modalLabel}>Partner Stats</Text>
                <View style={styles.modalStatsRow}>
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatValue}>{selectedOwner?.totalGroundsCount}</Text>
                    <Text style={styles.modalStatLabel}>Total Grounds</Text>
                  </View>
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatValue}>{selectedOwner?.pendingGroundsCount}</Text>
                    <Text style={styles.modalStatLabel}>Pending Review</Text>
                  </View>
                  <View style={styles.modalStatItem}>
                     <Switch
                      value={selectedOwner?.charge_platform_fee !== false}
                      onValueChange={() => selectedOwner && togglePlatformFee(selectedOwner)}
                      trackColor={{ false: '#CBD5E1', true: '#00ea6b' }}
                    />
                    <Text style={styles.modalStatLabel}>Platform Fee</Text>
                  </View>
                </View>
              </View>
            </RNScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setSelectedOwner(null)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalPrimaryButton}
                onPress={() => {
                  if (selectedOwner) {
                    router.push(`/(admin)/grounds?ownerId=${selectedOwner.id}`);
                    setSelectedOwner(null);
                  }
                }}
              >
                <Building2 size={16} color="#05291f" />
                <Text style={styles.modalPrimaryButtonText}>Manage Grounds</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRejectModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 520 } as any]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Reject bank details</Text>
                <Text style={styles.modalSubtitle}>Write a short reason so the owner can correct it.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowRejectModal(false)} style={styles.closeBtn}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 24, paddingTop: 0 }}>
              <Text style={[styles.modalLabel, { marginBottom: 10 }]}>Rejection reason</Text>
              <TextInput
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="e.g. Account number does not match bank name / IFSC invalid / UPI ID missing"
                multiline
                style={styles.rejectInput}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowRejectModal(false)}
                disabled={rejecting}
              >
                <Text style={styles.modalCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryButton, { backgroundColor: '#FEE2E2' } as any]}
                onPress={() => selectedOwner && rejectBankDetails(selectedOwner.id, rejectReason)}
                disabled={rejecting || !selectedOwner}
              >
                <X size={16} color="#7F1D1D" />
                <Text style={[styles.modalPrimaryButtonText, { color: '#7F1D1D' } as any]}>
                  {rejecting ? 'Rejecting...' : 'Reject'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  return (
    <>
      {Platform.OS === 'web' ? (
        <WebLayout>{content}</WebLayout>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <MobileAppNavbar title="MANAGE OWNERS" titleColor="#00ea6b" />
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
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  searchContainer: {
    flex: 1,
    minWidth: 300,
    maxWidth: 450,
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  tableHeaderContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  colOwner: { flex: 1.8 },
  colContact: { flex: 1.5 },
  colGrounds: { width: 120 },
  colFee: { width: 110 },
  colJoined: { width: 110 },
  colActions: { width: 140 },
  
  list: {
    padding: 16,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowExpanded: {
    borderColor: '#00ea6b',
    backgroundColor: '#F0F9FF',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  tableCell: {
    paddingRight: 12,
    justifyContent: 'center',
  },
  ownerPrimaryInfo: {
    gap: 2,
  },
  ownerNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },
  ownerSubText: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  contactEmail: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Inter',
  },
  contactPhone: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'Inter',
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
    fontSize: 12,
    fontWeight: '600',
    color: '#00ea6b',
    fontFamily: 'Inter',
  },
  expandedContent: {
    backgroundColor: '#F0FDF4', // Matches the light green theme of active rows
    marginHorizontal: 0, // Removed margin to align perfectly with the row
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#00ea6b',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: 10,
    marginTop: -1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
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
    backgroundColor: '#00ea6b',
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  primaryActionButtonText: {
    color: '#05291f',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  bankInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  infoBlock: {
    minWidth: 140,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  noInfoText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
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
    marginBottom: 0,
    padding: 10,
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  ownerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
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
    marginBottom: 10,
  },
  metaItem: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  metaItemPending: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  metaLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
    fontFamily: 'Inter',
  },
  metaValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  metaValuePending: {
    color: '#EF4444',
  },
  actionButton: {
    backgroundColor: '#00ea6b',
    borderRadius: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionButtonText: {
    color: '#05291f',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  settingDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  joinedDateText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  feeStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  feeEnabledBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  feeDisabledBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  feeStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  feeEnabledText: {
    color: '#047857',
  },
  feeDisabledText: {
    color: '#C2410C',
  },
  bankHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  approvedBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  pendingBadge: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  approvedText: {
    color: '#059669',
  },
  pendingText: {
    color: '#D97706',
  },
  rejectedBadge: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  rejectedText: {
    color: '#DC2626',
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00ea6b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  approveButtonText: {
    color: '#05291f',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectButtonText: {
    color: '#7F1D1D',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Inter',
  },
  rejectInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 90,
    backgroundColor: '#F9FAFB',
    fontSize: 13,
    color: '#111827',
    fontFamily: 'Inter',
  },
  rejectionBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991B1B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    fontFamily: 'Inter',
  },
  rejectionReason: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
    fontFamily: 'Inter',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  modalBody: {
    padding: 24,
  },
  modalSection: {
    marginBottom: 32,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  modalContactGrid: {
    gap: 12,
  },
  modalContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
  },
  modalContactText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Inter',
  },
  modalStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalStatItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  modalStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  modalStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  modalCloseButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  modalPrimaryButton: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#00ea6b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  modalPrimaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#05291f',
    fontFamily: 'Inter',
  },
  locationText: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Inter',
    marginTop: 1,
  },
  locationTextMobile: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Inter',
    marginBottom: 2,
  },
});
