import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { ShoppingBag, Package, ChevronRight, Search, Calendar, User, IndianRupee, Clock, Filter } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import Modal from '@/components/ui/Modal';
import { formatDate, formatDateTime } from '@/utils/helpers';

const IS_WEB = Platform.OS === 'web';

export default function AdminOrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [activeStatus, setActiveStatus] = useState<string>('all');

  useEffect(() => {
    loadOrders();
  }, []);

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

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = 
        (o.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = activeStatus === 'all' || o.status === activeStatus;
      
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
        <Text style={styles.orderIdText}>#{item.id.slice(0, 8).toUpperCase()}</Text>
        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
      </View>
      
      <View style={[styles.cell, { flex: 2 }]}>
        <View style={styles.userCellContent}>
          <Text style={styles.userName}>{item.user?.full_name || 'Guest User'}</Text>
          <View style={[styles.roleMiniBadge, item.user?.role === 'ground_owner' && styles.roleMiniBadgeOwner]}>
            <Text style={[styles.roleMiniBadgeText, item.user?.role === 'ground_owner' && styles.roleMiniBadgeTextOwner]}>
              {item.user?.role === 'ground_owner' ? 'OWNER' : 'USER'}
            </Text>
          </View>
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
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Shop Orders</Text>
          <Text style={styles.subtitle}>Manage customer orders and fulfillment</Text>
        </View>
        
        <View style={styles.headerActions}>
          <View style={styles.searchBar}>
            <Search size={18} color="#94A3B8" />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search by ID or customer..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </View>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
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

      <View style={styles.tableHeader}>
        <Text style={[styles.headerLabel, { flex: 1.5 }]}>Order ID</Text>
        <Text style={[styles.headerLabel, { flex: 2 }]}>Customer</Text>
        <Text style={[styles.headerLabel, { flex: 1 }]}>Items</Text>
        <Text style={[styles.headerLabel, { flex: 1.2 }]}>Total</Text>
        <Text style={[styles.headerLabel, { flex: 1.2 }]}>Status</Text>
        <View style={{ flex: 0.5 }} />
      </View>

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
                    <Text style={styles.detailValue}>{selectedOrder.user?.full_name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Mail size={16} color="#64748B" />
                    <Text style={styles.detailValue}>{selectedOrder.user?.email}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Phone size={16} color="#64748B" />
                    <Text style={styles.detailValue}>{selectedOrder.user?.phone || 'No phone provided'}</Text>
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
                <View key={item.id} style={styles.orderItem}>
                  <View style={styles.itemMain}>
                    <Text style={styles.itemName}>{item.product?.name}</Text>
                    <Text style={styles.itemMeta}>Qty: {item.quantity} × ₹{Number(item.price_at_purchase).toLocaleString('en-IN')}</Text>
                  </View>
                  <Text style={styles.itemTotal}>₹{Number(item.quantity * item.price_at_purchase).toLocaleString('en-IN')}</Text>
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

  return <WebLayout>{content}</WebLayout>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 24,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
    width: 300,
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
  filterRow: {
    marginBottom: 24,
  },
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
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
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
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    gap: 8,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cell: {
    justifyContent: 'center',
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
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
    fontSize: 12,
    color: '#6B7280',
  },
  itemCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#01b854',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
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
