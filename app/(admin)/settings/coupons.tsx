import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TextInput,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import Button from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import SettingsSubbar from '@/components/admin/SettingsSubbar';
import { Tag, Trash2, Plus, X, User, Shield, Pencil, Percent } from 'lucide-react-native';

export default function AdminCouponsScreen() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New/Edit coupon form
  const [newCode, setNewCode] = useState('');
  const [discType, setDiscType] = useState<'percentage' | 'fixed'>('percentage');
  const [discValue, setDiscValue] = useState('');
  const [minSpend, setMinSpend] = useState('');
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  useEffect(() => {
    loadAllCoupons();
  }, []);

  const loadAllCoupons = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coupons')
        .select('*, owner:profiles(full_name), ground:grounds(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Loaded coupons:', data?.length || 0);
      setCoupons(data || []);
    } catch (e) {
      console.error('Error loading coupons:', e);
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setNewCode('');
    setDiscValue('');
    setMinSpend('');
    setDiscType('percentage');
    setEditingCouponId(null);
    setShowModal(false);
  };

  const handleCreateOrUpdate = async () => {
    if (!newCode.trim() || !discValue) {
      if (Platform.OS === 'web') alert('Please enter a code and discount value.');
      else Alert.alert('Details missing', 'Please enter a code and discount value.');
      return;
    }

    try {
      setCreating(true);
      const payload: any = {
        code: newCode.toUpperCase().trim(),
        discount_type: discType,
        discount_value: Number(discValue),
        min_booking_amount: Number(minSpend) || 0,
        is_active: true
      };

      let res;
      if (editingCouponId) {
        res = await supabase
          .from('coupons')
          .update(payload)
          .eq('id', editingCouponId);
      } else {
        payload.owner_id = null; // Global if created by admin
        payload.ground_id = null;
        res = await supabase.from('coupons').insert(payload);
      }

      if (res.error) throw res.error;

      if (Platform.OS === 'web') alert(editingCouponId ? 'Coupon updated' : 'Global coupon created');
      else Alert.alert('Success', editingCouponId ? 'Coupon updated' : 'Global coupon created');
      
      clearForm();
      loadAllCoupons();
    } catch (e: any) {
      console.error('Save coupon error', e);
      if (Platform.OS === 'web') alert(e.message || 'Failed to save coupon');
      else Alert.alert('Error', e.message || 'Failed to save coupon');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    const run = async () => {
      try {
        const { error } = await supabase.from('coupons').delete().eq('id', id);
        if (error) throw error;
        loadAllCoupons();
      } catch (e) {
        console.error('Delete coupon error', e);
        if (Platform.OS === 'web') alert('Failed to delete coupon');
        else Alert.alert('Error', 'Failed to delete coupon');
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Delete this coupon?')) run();
    } else {
      Alert.alert('Delete Coupon', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: run },
      ]);
    }
  };

  const startEdit = (coupon: any) => {
    setNewCode(coupon.code);
    setDiscType(coupon.discount_type);
    setDiscValue(String(coupon.discount_value));
    setMinSpend(String(coupon.min_booking_amount || '0'));
    setEditingCouponId(coupon.id);
    setShowModal(true);
  };

  const renderListHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.title}>Coupons & Discounts</Text>
          <Text style={styles.subtitle}>Manage platform-wide promotional codes. {coupons.length} total</Text>
        </View>
        <Button
          title="Add Coupon"
          icon={Plus}
          size="small"
          onPress={() => setShowModal(true)}
        />
      </View>
    </View>
  );

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.columnHeader, { flex: 2.5 }]}>Code</Text>
      <Text style={[styles.columnHeader, { flex: 2 }]}>Discount</Text>
      <Text style={[styles.columnHeader, { flex: 2 }]}>Min Spend</Text>
      <Text style={[styles.columnHeader, { flex: 2 }]}>Scope</Text>
      <Text style={[styles.columnHeader, { flex: 1, textAlign: 'center' }]}>Uses</Text>
      <Text style={[styles.columnHeader, { flex: 1.5, textAlign: 'right' }]}>Actions</Text>
    </View>
  );

  const inner = (
    <View style={styles.container}>
      <FlatList
        data={coupons}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={() => (
          <View>
            {renderListHeader()}
            {coupons.length > 0 && renderTableHeader()}
          </View>
        )}
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl refreshing={loading} onRefresh={loadAllCoupons} />
          ) : undefined
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 60, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={{ marginTop: 12, color: '#6B7280', fontFamily: 'Inter' }}>Loading coupons...</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No coupons found — add one above</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            <View style={[styles.cell, { flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
              <Tag size={14} color="#10b981" />
              <Text style={styles.cellTextBold}>{item.code}</Text>
            </View>
            <Text style={[styles.cellText, { flex: 2 }]}>
              {item.discount_type === 'percentage' ? `${item.discount_value}%` : `₹${item.discount_value}`}
            </Text>
            <Text style={[styles.cellText, { flex: 2 }]}>₹{item.min_booking_amount || 0}</Text>
            <View style={[styles.cell, { flex: 2 }]}>
              {item.owner ? (
                <View style={styles.scopeBadge}>
                  <User size={10} color="#6B7280" />
                  <Text style={styles.scopeText} numberOfLines={1}>{item.owner?.full_name}</Text>
                </View>
              ) : (
                <View style={[styles.scopeBadge, styles.globalBadge]}>
                  <Shield size={10} color="#10b981" />
                  <Text style={[styles.scopeText, styles.globalText]}>Global</Text>
                </View>
              )}
            </View>
            <Text style={[styles.cellText, { flex: 1, textAlign: 'center' }]}>{item.used_count || 0}</Text>
            <View style={[styles.cell, { flex: 1.5, flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }]}>
              <TouchableOpacity onPress={() => startEdit(item)}>
                <Pencil size={14} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteCoupon(item.id)}>
                <Trash2 size={14} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal
        visible={showModal}
        animationType="fade"
        transparent={true}
        onRequestClose={clearForm}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBlur} 
            activeOpacity={1} 
            onPress={clearForm} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCouponId ? 'Edit Coupon' : 'New Global Coupon'}</Text>
              <TouchableOpacity onPress={clearForm}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView bounces={false}>
              <Text style={styles.label}>Coupon Code</Text>
              <TextInput
                value={newCode}
                onChangeText={(v) => setNewCode(v.toUpperCase())}
                placeholder="e.g. WELCOME50"
                style={styles.input}
              />

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>Discount Type</Text>
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      onPress={() => setDiscType('percentage')}
                      style={[styles.toggleBtn, discType === 'percentage' && styles.toggleBtnActive]}
                    >
                      <Percent size={12} color={discType === 'percentage' ? '#FFF' : '#6B7280'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setDiscType('fixed')}
                      style={[styles.toggleBtn, discType === 'fixed' && styles.toggleBtnActive]}
                    >
                      <Text style={[styles.toggleBtnText, discType === 'fixed' && styles.toggleBtnTextActive]}>₹</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>Value</Text>
                  <TextInput
                    value={discValue}
                    onChangeText={setDiscValue}
                    placeholder="0"
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
              </View>

              <Text style={styles.label}>Min Booking Spend (₹)</Text>
              <TextInput
                value={minSpend}
                onChangeText={setMinSpend}
                placeholder="0"
                keyboardType="numeric"
                style={styles.input}
              />

              <Button
                title={creating ? 'Saving...' : (editingCouponId ? 'Update Coupon' : 'Create Coupon')}
                onPress={handleCreateOrUpdate}
                loading={creating}
                disabled={creating}
                fullWidth
                style={{ marginTop: 12 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout noCard>
        <SettingsSubbar>
          {inner}
        </SettingsSubbar>
      </WebLayout>
    );
  }

  return (
    <SettingsSubbar>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        {inner}
      </View>
    </SettingsSubbar>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
    marginTop: 20,
  },
  columnHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cell: {
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#111827',
    fontFamily: 'Inter',
  },
  cellTextBold: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },
  scopeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  globalBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  scopeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    maxWidth: 80,
    fontFamily: 'Inter',
  },
  globalText: {
    color: '#10b981',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formHalf: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 2,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#10b981',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    fontFamily: 'Inter',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 20,
  },
  modalBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
});
