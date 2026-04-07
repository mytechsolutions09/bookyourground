import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import SettingsSubbar from '@/components/admin/SettingsSubbar';
import { Tag, Percent, Trash2, Plus, Filter, Info, User, Shield, Ticket, Pencil } from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';

export default function AdminCouponsScreen() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New/Edit coupon form
  const [newCode, setNewCode] = useState('');
  const [discType, setDiscType] = useState<'percentage' | 'fixed'>('percentage');
  const [discValue, setDiscValue] = useState('');
  const [minSpend, setMinSpend] = useState('');
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
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
    setShowForm(false);
  };

  const handleCreateOrUpdate = async () => {
    if (!newCode.trim() || !discValue) {
      Alert.alert('Details missing', 'Please enter a code and discount value.');
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

      Alert.alert('Success', editingCouponId ? 'Coupon updated' : 'Global coupon created');
      clearForm();
      loadAllCoupons();
    } catch (e: any) {
      console.error('Save coupon error', e);
      Alert.alert('Error', e.message || 'Failed to save coupon');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (Platform.OS === 'web') {
      if (!confirm('Are you sure you want to delete this coupon?')) return;
    }

    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      loadAllCoupons();
    } catch (e) {
      console.error('Delete coupon error', e);
      Alert.alert('Error', 'Failed to delete coupon');
    }
  };

  const startEdit = (coupon: any) => {
    setNewCode(coupon.code);
    setDiscType(coupon.discount_type);
    setDiscValue(String(coupon.discount_value));
    setMinSpend(String(coupon.min_booking_amount || '0'));
    setEditingCouponId(coupon.id);
    setShowForm(true);
  };

  const renderCoupon = ({ item }: { item: any }) => (
    <View style={styles.couponCard}>
      <View style={styles.couponInfo}>
        <View style={styles.codeRow}>
          <Text style={styles.couponCode}>{item.code}</Text>
          {item.owner ? (
            <View style={styles.ownerBadge}>
              <User size={10} color="#6B7280" />
              <Text style={styles.ownerText} numberOfLines={1}>{item.owner?.full_name}</Text>
            </View>
          ) : (
            <View style={[styles.ownerBadge, styles.globalBadge]}>
              <Shield size={10} color="#10b981" />
              <Text style={[styles.ownerText, styles.globalText]}>Platform Global</Text>
            </View>
          )}
        </View>
        <Text style={styles.couponDetail}>
          {item.discount_type === 'percentage' ? `${item.discount_value}%` : `₹${item.discount_value}`} off 
          {item.min_booking_amount > 0 ? ` • Min ₹${item.min_booking_amount}` : ' • No min spend'}
        </Text>
        {item.ground && (
          <Text style={styles.targetGround}>Target: {item.ground.name}</Text>
        )}
      </View>
      <View style={styles.couponStats}>
        <Text style={styles.statVal}>{item.used_count || 0}</Text>
        <Text style={styles.statLabel}>USED</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity 
          onPress={() => startEdit(item)}
          style={styles.editBtn}
        >
          <Pencil size={16} color="#10b981" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleDeleteCoupon(item.id)}
          style={styles.deleteBtn}
        >
          <Trash2 size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const inner = (
    <SettingsSubbar>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Coupons & Discounts</Text>
            <Text style={styles.subtitle}>Manage platform-wide and owner-specific promotional codes.</Text>
          </View>
          <Button
            title={showForm ? 'Cancel' : 'New Global Coupon'}
            onPress={() => showForm ? clearForm() : setShowForm(true)}
            variant={showForm ? 'outline' : 'primary'}
            size="small"
            icon={showForm ? undefined : Plus}
          />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {showForm ? (
            <Card style={styles.formCard}>
              <Text style={styles.formTitle}>{editingCouponId ? 'Edit Coupon' : 'Create Platform Coupon'}</Text>
              <Text style={styles.formSubtitle}>{editingCouponId ? 'Update the details of this coupon code.' : 'This coupon will be valid across all grounds on the platform.'}</Text>
              
              <View style={styles.formGrid}>
                <View style={styles.field}>
                  <Text style={styles.label}>Coupon Code</Text>
                  <TextInput
                    value={newCode}
                    onChangeText={(v) => setNewCode(v.toUpperCase())}
                    placeholder="PLATFORM50"
                    style={styles.input}
                  />
                </View>
                <View style={styles.field}>
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

              <View style={styles.formGrid}>
                <View style={styles.field}>
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
                <View style={styles.field}>
                  <Text style={styles.label}>Discount Value</Text>
                  <TextInput
                    value={discValue}
                    onChangeText={setDiscValue}
                    placeholder={discType === 'percentage' ? '15' : '100'}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
              </View>

              <Button
                title={creating ? 'Saving...' : (editingCouponId ? 'Save Changes' : 'Create Global Coupon')}
                onPress={handleCreateOrUpdate}
                loading={creating}
                disabled={creating}
                fullWidth
                style={{ marginTop: 12 }}
              />
            </Card>
          ) : (
            <View>
              {loading ? (
                <ActivityIndicator size="small" color="#10b981" style={{ marginTop: 40 }} />
              ) : coupons.length === 0 ? (
                <View style={styles.empty}>
                  <Ticket size={48} color="#E5E7EB" style={{ marginBottom: 12 }} />
                  <Text style={styles.emptyText}>No coupons found on the platform</Text>
                </View>
              ) : (
                <FlatList
                  data={coupons}
                  renderItem={renderCoupon}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </SettingsSubbar>
  );

  if (IS_WEB) {
    return <WebLayout noCard>{inner}</WebLayout>;
  }
  return inner;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  scroll: {
    padding: 24,
  },
  formCard: {
    padding: 24,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  formSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 20,
    marginTop: 4,
  },
  formGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  field: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#10b981',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  couponCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  couponInfo: {
    flex: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  couponCode: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 1,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  globalBadge: {
    backgroundColor: '#ECFDF5',
  },
  ownerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    maxWidth: 100,
  },
  globalText: {
    color: '#10b981',
  },
  couponDetail: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '700',
  },
  targetGround: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  couponStats: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 50,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
