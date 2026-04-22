import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, TextInput, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { Tag, Percent, Scissors, Trash2 } from 'lucide-react-native';

import { useLocalSearchParams } from 'expo-router';

const IS_WEB = Platform.OS === 'web';

function OwnerSettingsInner() {
  const { user } = useAuth();
  const { tab } = useLocalSearchParams<{ tab: string }>();
  const [activeTab, setActiveTab] = useState<'payout' | 'bank' | 'coupons' | 'help'>((tab as any) || 'payout');
  const [amount, setAmount] = useState('');
  const [accountDetails, setAccountDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  // Coupon management state
  const [grounds, setGrounds] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCode, setNewCode] = useState('');
  const [discType, setDiscType] = useState<'percentage' | 'fixed'>('percentage');
  const [discValue, setDiscValue] = useState('');
  const [minSpend, setMinSpend] = useState('');
  const [selectedGroundForCoupon, setSelectedGroundForCoupon] = useState('all');
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  useEffect(() => {
    if (user && activeTab === 'coupons') {
      loadOwnerData();
    }
  }, [user, activeTab]);

  const loadOwnerData = async () => {
    if (!user) return;
    try {
      setLoadingCoupons(true);
      const [groundsRes, couponsRes] = await Promise.all([
        supabase.from('grounds').select('id, name').eq('owner_id', user.id),
        supabase.from('coupons').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
      ]);
      setGrounds(groundsRes.data || []);
      setCoupons(couponsRes.data || []);
    } catch (e) {
      console.error('Error loading coupon data', e);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleCreateCoupon = async () => {
    if (!user) return;
    if (!newCode.trim() || !discValue) {
      Alert.alert('Missing details', 'Please provide a code and discount value');
      return;
    }

    try {
      setCreatingCoupon(true);
      const { error } = await supabase.from('coupons').insert({
        code: newCode.toUpperCase().trim(),
        discount_type: discType,
        discount_value: Number(discValue),
        min_booking_amount: Number(minSpend) || 0,
        owner_id: user.id,
        ground_id: selectedGroundForCoupon === 'all' ? null : selectedGroundForCoupon,
        is_active: true
      });

      if (error) throw error;

      Alert.alert('Success', 'Coupon created successfully');
      setNewCode('');
      setDiscValue('');
      setMinSpend('');
      loadOwnerData();
    } catch (e: any) {
      console.error('Create coupon error', e);
      Alert.alert('Error', e.message || 'Failed to create coupon');
    } finally {
      setCreatingCoupon(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to request a withdrawal.');
      return;
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid withdrawal amount.');
      return;
    }

    if (!accountDetails.trim()) {
      Alert.alert('Missing details', 'Enter your UPI ID or bank details.');
      return;
    }

    try {
      setSubmitting(true);
      // This assumes a "withdrawals" table exists; if not, this will just log an error.
      const { error } = await supabase.from('withdrawals').insert({
        owner_id: user.id,
        amount: parsedAmount,
        payment_method: accountDetails.trim().toLowerCase().includes('bank') ? 'bank_transfer' : 'upi',
        account_details: { 
          raw_details: accountDetails.trim() 
        },
        status: 'pending',
      });

      if (error) {
        console.error('Error creating withdrawal request', error);
        Alert.alert('Error', 'Could not create withdrawal request. Please try again later.');
        return;
      }

      Alert.alert('Withdrawal requested', 'We have received your withdrawal request.');
      setAmount('');
      setAccountDetails('');
    } catch (e) {
      console.error('Unexpected withdrawal error', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <ScrollView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'payout' && styles.activeTabButton]} 
            onPress={() => setActiveTab('payout')}
          >
            <Text style={[styles.tabText, activeTab === 'payout' && styles.activeTabText]}>Payouts</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'bank' && styles.activeTabButton]} 
            onPress={() => setActiveTab('bank')}
          >
            <Text style={[styles.tabText, activeTab === 'bank' && styles.activeTabText]}>Bank</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'coupons' && styles.activeTabButton]} 
            onPress={() => setActiveTab('coupons')}
          >
            <Text style={[styles.tabText, activeTab === 'coupons' && styles.activeTabText]}>Coupons</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'help' && styles.activeTabButton]} 
            onPress={() => setActiveTab('help')}
          >
            <Text style={[styles.tabText, activeTab === 'help' && styles.activeTabText]}>Help</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'payout' && (
          <Card style={styles.panel}>
            <Text style={styles.sectionTitle}>Withdraw earnings</Text>
            <Text style={styles.sectionSubtitle}>
              Request a payout of your available earnings. Actual transfers are processed manually.
            </Text>

            <View style={styles.formRowHorizontal}>
              <View style={styles.formCol}>
                <Text style={styles.label}>Amount (₹)</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="Enter amount to withdraw"
                  style={styles.input}
                />
              </View>

              <View style={styles.formCol}>
                <Text style={styles.label}>UPI / bank details</Text>
                <TextInput
                  value={accountDetails}
                  onChangeText={setAccountDetails}
                  placeholder="Enter UPI ID or bank account details"
                  style={[styles.input, styles.multilineInput]}
                  multiline
                />
              </View>
            </View>

            <View style={styles.actionsRow}>
              <Button
                title={submitting ? 'Requesting...' : 'Request withdrawal'}
                onPress={handleWithdraw}
                loading={submitting}
                disabled={submitting}
                style={styles.submitButton}
              />
            </View>
          </Card>
        )}

        {activeTab === 'bank' && (
          <Card style={[styles.panel, { marginTop: IS_WEB ? 0 : 16 }]}>
            <Text style={styles.sectionTitle}>Add bank details</Text>
            <Text style={styles.sectionSubtitle}>
              Save your payout account details so we can use them for future withdrawals.
            </Text>

          <View style={styles.formRowHorizontal}>
            <View style={styles.formCol}>
              <Text style={styles.label}>Bank name</Text>
              <TextInput
                value={bankName}
                onChangeText={setBankName}
                placeholder="Enter bank name"
                style={styles.input}
              />
            </View>
            <View style={styles.formCol}>
              <Text style={styles.label}>Account number</Text>
              <TextInput
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="Enter account number"
                style={styles.input}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.formRowHorizontal}>
            <View style={styles.formCol}>
              <Text style={styles.label}>IFSC code</Text>
              <TextInput
                value={ifsc}
                onChangeText={setIfsc}
                placeholder="Enter IFSC"
                style={styles.input}
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.formCol}>
              <Text style={styles.label}>UPI ID (optional)</Text>
              <TextInput
                value={upiId}
                onChangeText={setUpiId}
                placeholder="Enter UPI ID"
                style={styles.input}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Button
              title={savingBank ? 'Saving...' : 'Save bank details'}
              onPress={async () => {
                if (!user) {
                  Alert.alert('Not signed in', 'Please sign in to save bank details.');
                  return;
                }

                if (!bankName.trim() || !accountNumber.trim() || !ifsc.trim()) {
                  Alert.alert('Missing details', 'Bank name, account number and IFSC are required.');
                  return;
                }

                try {
                  setSavingBank(true);
                  // This assumes an "owner_bank_details" table exists.
                  const { error } = await supabase
                    .from('owner_bank_details')
                    .upsert(
                      {
                        owner_id: user.id,
                        bank_name: bankName.trim(),
                        account_number: accountNumber.trim(),
                        ifsc: ifsc.trim(),
                        upi_id: upiId.trim() || null,
                      },
                      { onConflict: 'owner_id' },
                    );

                  if (error) {
                    console.error('Error saving bank details', error);
                    Alert.alert('Error', 'Could not save bank details. Please try again later.');
                    return;
                  }

                  Alert.alert('Saved', 'Your bank details have been saved.');
                } catch (e) {
                  console.error('Unexpected bank details error', e);
                  Alert.alert('Error', 'Something went wrong. Please try again.');
                } finally {
                  setSavingBank(false);
                }
              }}
              loading={savingBank}
              disabled={savingBank}
              style={styles.submitButton}
            />
          </View>
        </Card>
      )}
        {activeTab === 'coupons' && (
          <View style={styles.tabContentGap}>
            <Card style={styles.panel}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.sectionTitle}>Create New Coupon</Text>
                  <Text style={styles.sectionSubtitle}>Add a discount for all your grounds or a specific one.</Text>
                </View>
                <Tag size={24} color="#01b854" />
              </View>

              <View style={styles.formRowHorizontal}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Coupon Code</Text>
                  <TextInput
                    value={newCode}
                    onChangeText={(val) => setNewCode(val.toUpperCase())}
                    placeholder="e.g. SUMMER20"
                    style={styles.input}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Min Spend (₹)</Text>
                  <TextInput
                    value={minSpend}
                    onChangeText={setMinSpend}
                    placeholder="0"
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.formRowHorizontal}>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Discount Type</Text>
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      onPress={() => setDiscType('percentage')}
                      style={[styles.toggleBtn, discType === 'percentage' && styles.toggleBtnActive]}
                    >
                      <Percent size={14} color={discType === 'percentage' ? '#FFF' : '#64748B'} />
                      <Text style={[styles.toggleBtnText, discType === 'percentage' && styles.toggleBtnTextActive]}>Percent</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setDiscType('fixed')}
                      style={[styles.toggleBtn, discType === 'fixed' && styles.toggleBtnActive]}
                    >
                      <Text style={[styles.toggleBtnText, discType === 'fixed' && styles.toggleBtnTextActive]}>₹ Fixed</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.label}>Discount Value</Text>
                  <TextInput
                    value={discValue}
                    onChangeText={setDiscValue}
                    placeholder={discType === 'percentage' ? '20' : '100'}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.label}>Apply to Ground</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  <TouchableOpacity
                    onPress={() => setSelectedGroundForCoupon('all')}
                    style={[styles.groundChip, selectedGroundForCoupon === 'all' && styles.groundChipActive]}
                  >
                    <Text style={[styles.groundChipText, selectedGroundForCoupon === 'all' && styles.groundChipTextActive]}>All Grounds</Text>
                  </TouchableOpacity>
                  {grounds.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => setSelectedGroundForCoupon(g.id)}
                      style={[styles.groundChip, selectedGroundForCoupon === g.id && styles.groundChipActive]}
                    >
                      <Text style={[styles.groundChipText, selectedGroundForCoupon === g.id && styles.groundChipTextActive]}>{g.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.actionsRow}>
                <Button
                  title={creatingCoupon ? 'Creating...' : 'Create Coupon'}
                  onPress={handleCreateCoupon}
                  loading={creatingCoupon}
                  disabled={creatingCoupon}
                  style={styles.submitButton}
                />
              </View>
            </Card>

            <View style={{ marginTop: 24 }}>
              <Text style={styles.sectionTitle}>Your Active Coupons</Text>
              {loadingCoupons ? (
                <ActivityIndicator size="small" color="#01b854" style={{ marginTop: 20 }} />
              ) : coupons.length === 0 ? (
                <Text style={styles.emptyText}>You haven't created any coupons yet.</Text>
              ) : (
                <View style={styles.couponList}>
                  {coupons.map((c) => (
                    <View key={c.id} style={styles.couponItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.couponCodeText}>{c.code}</Text>
                        <Text style={styles.couponDetsText}>
                          {c.discount_type === 'percentage' ? `${c.discount_value}%` : `₹${c.discount_value}`} off • Min ₹{c.min_booking_amount || 0}
                        </Text>
                        {c.ground_id && (
                          <Text style={styles.couponTargetText}>
                            Target: {grounds.find((g) => g.id === c.ground_id)?.name || 'Ground'}
                          </Text>
                        )}
                      </View>
                      <View style={styles.couponStat}>
                        <Text style={styles.couponUsedCount}>{c.used_count || 0}</Text>
                        <Text style={styles.couponUsedLabel}>USED</Text>
                      </View>
                      <TouchableOpacity 
                        onPress={async () => {
                          const { error } = await supabase.from('coupons').delete().eq('id', c.id);
                          if (!error) loadOwnerData();
                        }}
                        style={styles.deleteBtn}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'help' && (
          <View style={styles.tabContentGap}>
            <Card style={styles.panel}>
              <Text style={styles.sectionTitle}>Dashboard Guide</Text>
              <Text style={styles.sectionSubtitle}>Understanding your bookings and occupancy diagnostics.</Text>
              
              <View style={styles.helpSection}>
                <Text style={styles.helpHeader}>"WHO" Column Labels</Text>
                
                <View style={styles.helpItem}>
                  <Text style={styles.helpTitle}>Self</Text>
                  <Text style={styles.helpText}>Visible when you book a slot on your own ground. Typically used for personal practice or internal inventory management.</Text>
                </View>

                <View style={styles.helpItem}>
                  <Text style={styles.helpTitle}>Another Ground</Text>
                  <Text style={styles.helpText}>Visible when you book a slot as a player on a ground owned by someone else. These are your personal games.</Text>
                </View>

                <View style={styles.helpItem}>
                  <Text style={styles.helpTitle}>Customer Name (e.g. Arpit)</Text>
                  <Text style={styles.helpText}>Visible when an external player books your ground. This dynamically shows their full name for easy identification.</Text>
                </View>
              </View>

              <View style={[styles.helpSection, { marginTop: 24 }]}>
                <Text style={styles.helpHeader}>Occupancy status</Text>
                
                <View style={styles.helpItem}>
                  <Text style={styles.helpTitle}>EMPTY</Text>
                  <Text style={styles.helpText}>Indicates no confirmed bookings for that slot yet.</Text>
                </View>

                <View style={styles.helpItem}>
                  <Text style={styles.helpTitle}>PARTIAL</Text>
                  <Text style={styles.helpText}>Indicates 1 team is booked, but the ground is still available for another team to join (Matchmaking Mode).</Text>
                </View>

                <View style={styles.helpItem}>
                  <Text style={styles.helpTitle}>FULL</Text>
                  <Text style={styles.helpText}>The ground is fully occupied by two teams or a full-ground booking. No more slots available.</Text>
                </View>
              </View>
            </Card>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
export default function OwnerSettingsScreen() {
  if (IS_WEB) {
    return (
      <WebLayout>
        <OwnerSettingsInner />
      </WebLayout>
    );
  }

  return (
    <View style={styles.nativeRoot}>
      <MobileAppNavbar title="Settings" titleColor="#01b854" />
      <OwnerSettingsInner />
    </View>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 0,
  },
  inner: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 24,
  },
  panel: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F5F9',
    borderWidth: 1,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    fontFamily: 'Inter',
  },
  formRow: {
    marginBottom: 12,
  },
  formRowHorizontal: {
    marginBottom: 12,
    flexDirection: 'row',
    gap: 12,
  },
  formCol: {
    flex: 1,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontFamily: 'Inter',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
  },
  multilineInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  submitButton: {
    backgroundColor: '#01b854',
    borderWidth: 0,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 6,
    marginBottom: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 16,
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  tabText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#01b854',
    fontWeight: '800',
  },
  tabContentGap: {
    gap: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 2,
    marginTop: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  toggleBtnActive: {
    backgroundColor: '#01b854',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  chipScroll: {
    marginTop: 8,
    paddingBottom: 4,
  },
  groundChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  groundChipActive: {
    backgroundColor: 'rgba(1,184,84,0.1)',
    borderColor: '#01b854',
  },
  groundChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  groundChipTextActive: {
    color: '#01b854',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 32,
    fontStyle: 'italic',
  },
  couponList: {
    gap: 12,
    marginTop: 12,
  },
  couponItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },

  couponCodeText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1,
  },
  couponDetsText: {
    fontSize: 12,
    color: '#01b854',
    fontWeight: '700',
    marginTop: 2,
  },
  couponTargetText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  couponStat: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  couponUsedCount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  couponUsedLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  helpSection: {
    gap: 12,
  },
  helpHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#01b854',
    marginBottom: 4,
  },
  helpItem: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 12,
    borderRadius: 12,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
});

