import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, ActivityIndicator, TextInput, ScrollView, DeviceEventEmitter } from 'react-native';
import { ShoppingBag, Package, ChevronRight, Search, Calendar, User, IndianRupee, Clock, Filter, Mail, Phone, MapPin, RotateCcw } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import Modal from '@/components/ui/Modal';
import ShopSubbar from '@/components/admin/ShopSubbar';
import { formatDate, formatDateTime } from '@/utils/helpers';
import { useLocalSearchParams, router } from 'expo-router';

const IS_WEB = Platform.OS === 'web';

export default function AdminOrdersScreen() {
  const params = useLocalSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const activeStatus = (params.filter as string) || 'all';

  useEffect(() => {
    loadOrders();
  }, []);

  const setActiveStatus = (status: string) => {
    router.setParams({ filter: status });
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shop_orders')
        .select(`
          *,
          user:profiles(*),
          items:shop_order_items(
            *,
            product:shop_products(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('shop_orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const updateReturnStatus = async (itemId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('shop_order_items')
        .update({ return_status: newStatus })
        .eq('id', itemId);

      if (error) throw error;
      
      // Update local state
      const updatedOrders = orders.map(o => ({
        ...o,
        items: o.items.map((i: any) => i.id === itemId ? { ...i, return_status: newStatus } : i)
      }));
      setOrders(updatedOrders);
      
      if (selectedOrder) {
        const updatedItems = selectedOrder.items.map((i: any) => 
          i.id === itemId ? { ...i, return_status: newStatus } : i
        );
        setSelectedOrder({ ...selectedOrder, items: updatedItems });
      }
    } catch (err) {
      console.error('Error updating return status:', err);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = 
        (o.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = activeStatus === 'all' || 
        (activeStatus === 'returns' ? o.items?.some((i: any) => i.return_status !== null) : o.status === activeStatus);
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, activeStatus]);

  const StatusBadge = ({ status }: { status: string }) => {
    const getStatusStyle = () => {
      switch (status) {
        case 'pending': return { bg: '#FEF3C7', text: '#92400E' };
        case 'processing': return { bg: '#DBEAFE', text: '#1E40AF' };
        case 'shipped': return { bg: '#E0E7FF', text: '#3730A3' };
        case 'delivered': return { bg: '#D1FAE5', text: '#065F46' };
        case 'cancelled': return { bg: '#FEE2E2', text: '#991B1B' };
        default: return { bg: '#F3F4F6', text: '#374151' };
      }
    };
    const style = getStatusStyle();
    return (
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>
          {status.toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderOrderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.orderRow} 
      onPress={() => setSelectedOrder(item)}
    >
      <View style={[styles.cell, { flex: 1.5 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.orderIdText}>#{item.id.slice(0, 8).toUpperCase()}</Text>
          {item.items?.some((i: any) => i.return_status === 'requested') && (
            <View style={styles.miniReturnBadge}>
              <RotateCcw size={10} color="#92400E" />
              <Text style={styles.miniReturnBadgeText}>RETURN</Text>
            </View>
          )}
        </View>
        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
      </View>
      
      <View style={[styles.cell, { flex: 2 }]}>
        <View style={styles.userCellContent}>
          <Text style={styles.userName}>{item.customer_name || item.user?.full_name || 'Guest User'}</Text>
        </View>
        <Text style={styles.userEmail}>{item.user?.email || 'No email'}</Text>
      </View>

      <View style={[styles.cell, { flex: 1 }]}>
        <Text style={styles.itemCount}>{item.items?.length || 0} Items</Text>
      </View>

      <View style={[styles.cell, { flex: 1.2 }]}>
        <Text style={styles.amountText}>₹{Number(item.total_amount).toLocaleString('en-IN')}</Text>
      </View>

      <View style={[styles.cell, { flex: 1.2 }]}>
        <StatusBadge status={item.status} />
      </View>

      <View style={[styles.cell, { flex: 0.5, alignItems: 'flex-end' }]}>
        <ChevronRight size={18} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );

  const content = (
    <View style={styles.container}>
      {Platform.OS === 'web' && (
        <View style={styles.combinedRow}>
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returns'].map(status => (
                <TouchableOpacity 
                  key={status}
                  style={[styles.filterChip, activeStatus === status && styles.filterChipActive]}
                  onPress={() => setActiveStatus(status)}
                >
                  <Text style={[styles.filterChipText, activeStatus === status && styles.filterChipTextActive]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.searchBar}>
            <Search size={18} color="#94A3B8" />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search ID or customer..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      )}

      {Platform.OS === 'web' && (
        <View style={styles.tableHeader}>
          <Text style={[styles.headerLabel, { flex: 1.5 }]}>Order ID</Text>
          <Text style={[styles.headerLabel, { flex: 2 }]}>Customer</Text>
          <Text style={[styles.headerLabel, { flex: 1 }]}>Items</Text>
          <Text style={[styles.headerLabel, { flex: 1.2 }]}>Total</Text>
          <Text style={[styles.headerLabel, { flex: 1.2 }]}>Status</Text>
          <View style={{ flex: 0.5 }} />
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#01b854" style={{ marginTop: 100 }} />
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ShoppingBag size={64} color="#E5E7EB" />
              <Text style={styles.emptyText}>No orders found.</Text>
            </View>
          }
        />
      )}

      {/* Order Detail Modal */}
      <Modal
        visible={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title="Order Details"
        maxWidth={700}
      >
        {selectedOrder && (
          <View style={styles.modalBody}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalOrderId}>Order #{selectedOrder.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={styles.modalDate}>{formatDateTime(selectedOrder.created_at)}</Text>
              </View>
              <StatusBadge status={selectedOrder.status} />
            </View>

            <View style={styles.modalGrid}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Customer Details</Text>
                <View style={styles.detailBox}>
                  <View style={styles.detailRow}>
                    <User size={16} color="#64748B" />
                    <Text style={styles.detailValue}>{selectedOrder.customer_name || selectedOrder.user?.full_name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Mail size={16} color="#64748B" />
                    <Text style={styles.detailValue}>{selectedOrder.user?.email}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Phone size={16} color="#64748B" />
                    <Text style={styles.detailValue}>{selectedOrder.customer_phone || selectedOrder.user?.phone || 'No phone provided'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MapPin size={16} color="#64748B" />
                    <Text style={styles.detailValue}>{selectedOrder.billing_address || 'No address provided'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Payment Info</Text>
                <View style={styles.detailBox}>
                  <View style={styles.detailRow}>
                    <IndianRupee size={16} color="#64748B" />
                    <Text style={styles.detailValue}>Total: ₹{Number(selectedOrder.total_amount).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Package size={16} color="#64748B" />
                    <Text style={styles.detailValue}>Method: {selectedOrder.payment_method?.toUpperCase() || 'WALLET'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Clock size={16} color="#64748B" />
                    <Text style={[styles.detailValue, { color: '#01b854' }]}>Status: {selectedOrder.payment_status?.toUpperCase() || 'PAID'}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.itemsSection}>
              <Text style={styles.modalSectionTitle}>Ordered Items</Text>
              {selectedOrder.items?.map((item: any) => (
                <View key={item.id} style={styles.orderItemContainer}>
                  <View style={styles.orderItem}>
                    <View style={styles.itemMain}>
                      <Text style={styles.itemName}>{item.product?.name}</Text>
                      <Text style={styles.itemMeta}>Qty: {item.quantity} × ₹{Number(item.price_at_purchase).toLocaleString('en-IN')}</Text>
                    </View>
                    <Text style={styles.itemTotal}>₹{Number(item.quantity * item.price_at_purchase).toLocaleString('en-IN')}</Text>
                  </View>
                  
                  {item.return_status && (
                    <View style={styles.returnRequestBox}>
                      <View style={styles.returnHeader}>
                        <View style={styles.returnLabelGroup}>
                          <RotateCcw size={14} color="#dc8d3c" />
                          <Text style={styles.returnRequestLabel}>Return Requested</Text>
                        </View>
                        <View style={[styles.returnStatusBadge, { backgroundColor: item.return_status === 'requested' ? '#FEF3C7' : item.return_status === 'approved' ? '#D1FAE5' : '#F3F4F6' }]}>
                          <Text style={[styles.returnStatusText, { color: item.return_status === 'requested' ? '#92400E' : item.return_status === 'approved' ? '#065F46' : '#374151' }]}>
                            {item.return_status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.returnReasonText}>Reason: {item.return_reason || 'No reason provided'}</Text>
                      
                      {item.return_status === 'requested' && (
                        <View style={styles.returnActions}>
                          <TouchableOpacity 
                            style={[styles.returnActionBtn, styles.approveBtn]}
                            onPress={() => updateReturnStatus(item.id, 'approved')}
                          >
                            <Text style={styles.approveBtnText}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.returnActionBtn, styles.rejectBtn]}
                            onPress={() => updateReturnStatus(item.id, 'rejected')}
                          >
                            <Text style={styles.rejectBtnText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {item.return_status === 'approved' && (
                        <TouchableOpacity 
                          style={[styles.returnActionBtn, styles.completeBtn]}
                          onPress={() => updateReturnStatus(item.id, 'completed')}
                        >
                          <Text style={styles.completeBtnText}>Mark as Completed</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.statusActionSection}>
              <Text style={styles.modalSectionTitle}>Update Status</Text>
              <View style={styles.statusButtons}>
                {['processing', 'shipped', 'delivered', 'cancelled'].map(status => (
                  <TouchableOpacity 
                    key={status}
                    style={[styles.statusBtn, selectedOrder.status === status && styles.statusBtnActive]}
                    onPress={() => updateOrderStatus(selectedOrder.id, status)}
                  >
                    <Text style={[styles.statusBtnText, selectedOrder.status === status && styles.statusBtnTextActive]}>
                      {status.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );

  return (
    <>
      {Platform.OS === 'web' ? (
        <WebLayout>
          <ShopSubbar>
            {content}
          </ShopSubbar>
        </WebLayout>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
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
    padding: 24,
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  combinedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  filterRow: {
    flex: 1,
    marginRight: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
    width: 280,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    outlineStyle: 'none',
  } as any,
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 8,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  list: {
    gap: 0,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cell: {
    justifyContent: 'center',
  },
  orderIdText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },
  userCellContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleMiniBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleMiniBadgeOwner: {
    backgroundColor: '#ECFDF5',
  },
  roleMiniBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#6B7280',
  },
  roleMiniBadgeTextOwner: {
    color: '#059669',
  },
  userEmail: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  addressText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  itemCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  amountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#01b854',
    fontFamily: 'Inter',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  miniReturnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#F59E0B',
  },
  miniReturnBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#92400E',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
  modalBody: {
    padding: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  modalOrderId: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
  },
  modalDate: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  modalGrid: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 32,
  },
  modalSection: {
    flex: 1,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  detailBox: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  itemsSection: {
    marginBottom: 32,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemMain: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  itemMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  orderItemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 12,
  },
  returnRequestBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  returnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  returnLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  returnRequestLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  returnStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  returnStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  returnReasonText: {
    fontSize: 12,
    color: '#4B5563',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  returnActions: {
    flexDirection: 'row',
    gap: 10,
  },
  returnActionBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  approveBtn: {
    backgroundColor: '#D1FAE5',
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  rejectBtn: {
    backgroundColor: '#FEE2E2',
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  completeBtn: {
    backgroundColor: '#E0E7FF',
    width: '100%',
  },
  completeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3730A3',
  },
  statusActionSection: {
    marginTop: 8,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusBtnActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  statusBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  statusBtnTextActive: {
    color: '#FFFFFF',
  },
});
