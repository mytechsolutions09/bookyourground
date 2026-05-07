import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, ActivityIndicator, Image, ScrollView, Modal, Pressable } from 'react-native';
import { ShoppingBag, ChevronRight, Package, Calendar, Clock, MapPin, CreditCard, ChevronLeft, Truck, Hourglass, Box, Filter, HelpCircle, ChevronDown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { router, Stack } from 'expo-router';
import { formatDate, formatDateTime } from '@/utils/helpers';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import WebLayout from '@/components/web/WebLayout';
import { StatusBar } from 'expo-status-bar';

const IS_WEB = Platform.OS === 'web';

export default function UserOrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [tempFromDate, setTempFromDate] = useState<string | null>(null);
  const [tempToDate, setTempToDate] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadOrders();
  }, [user, statusFilter, fromDate, toDate]);

  const statuses = [
    { label: 'All Orders', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Processing', value: 'processing' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  const loadOrders = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('shop_orders')
        .select(`
          *,
          items:shop_order_items(
            *,
            product:shop_products(*)
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (fromDate) {
        query = query.gte('created_at', fromDate);
      }
      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const setQuickRange = (range: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (range) {
      case 'all':
        setTempFromDate(null);
        setTempToDate(null);
        return;
      case 'today':
        start = today;
        end = today;
        break;
      case 'yesterday':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case 'this_week':
        const day = today.getDay();
        start.setDate(today.getDate() - day);
        end.setDate(today.getDate() + (6 - day));
        break;
      case 'last_week':
        const lastWeekDay = today.getDay();
        start.setDate(today.getDate() - lastWeekDay - 7);
        end.setDate(today.getDate() - lastWeekDay - 1);
        break;
      case 'this_month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last_month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
    }

    setTempFromDate(start.toISOString().split('T')[0]);
    setTempToDate(end.toISOString().split('T')[0]);
  };

  const handleDateClick = (dateStr: string) => {
    if (!tempFromDate || (tempFromDate && tempToDate)) {
      setTempFromDate(dateStr);
      setTempToDate(null);
    } else {
      if (dateStr < tempFromDate) {
        setTempToDate(tempFromDate);
        setTempFromDate(dateStr);
      } else {
        setTempToDate(dateStr);
      }
    }
  };

  const renderCalendar = (monthOffset: number) => {
    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const month = date.getMonth();
    const year = date.getFullYear();
    
    const monthName = date.toLocaleString('en-US', { month: 'long' });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const weeks = [];
    let days = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
      if (days.length === 7) {
        weeks.push(days);
        days = [];
      }
    }
    if (days.length > 0) {
      while (days.length < 7) days.push(null);
      weeks.push(days);
    }

    return (
      <View style={styles.calMonth}>
        <Text style={styles.calMonthTitle}>{monthName} {year}</Text>
        <View style={styles.calGrid}>
          <View style={styles.calHeaderRow}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <Text key={d} style={styles.calHeaderCell}>{d}</Text>
            ))}
          </View>
          {weeks.map((week, wi) => (
             <View key={wi} style={styles.calRow}>
               {week.map((day, di) => {
                 if (!day) return <View key={di} style={styles.calCell} />;
                 
                 const dateStr = day.toISOString().split('T')[0];
                 const isSelected = tempFromDate === dateStr || tempToDate === dateStr;
                 const isInRange = tempFromDate && tempToDate && dateStr > tempFromDate && dateStr < tempToDate;
                 const isStart = tempFromDate === dateStr;
                 const isEnd = tempToDate === dateStr;
                 
                 return (
                   <TouchableOpacity 
                     key={di} 
                     style={[
                       styles.calCell,
                       isInRange && styles.calCellInRange,
                       isStart && styles.calCellStart,
                       isEnd && styles.calCellEnd,
                       isSelected && styles.calCellSelected
                     ]}
                     onPress={() => handleDateClick(dateStr)}
                   >
                     <Text style={[
                       styles.calDayText,
                       isInRange && styles.calDayTextInRange,
                       isSelected && styles.calDayTextSelected
                     ]}>
                       {day.getDate()}
                     </Text>
                   </TouchableOpacity>
                 );
               })}
             </View>
          ))}
        </View>
      </View>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'processing': return '#3B82F6';
      case 'shipped': return '#6366F1';
      case 'delivered': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    const isDelivered = item.status === 'delivered';
    const isShipped = item.status === 'shipped';
    const isPending = item.status === 'pending';
    
    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => router.push({ pathname: '/(tabs)/profile/order-details', params: { id: item.id } })}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderMetaRow}>
            <View style={[styles.typeIconBox, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
              <Box size={18} color={getStatusColor(item.status)} />
            </View>
            <View>
              <Text style={styles.orderDate}>Placed on {formatDate(item.created_at)} • {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.itemsMainRow}>
          <View style={styles.itemsListContainer}>
             <View style={styles.thumbsRow}>
                {item.items?.slice(0, 2).map((oi: any) => (
                  <Image 
                    key={oi.id}
                    source={{ uri: oi.product?.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&q=80' }} 
                    style={styles.previewThumb} 
                  />
                ))}
                {item.items?.length > 2 && (
                  <View style={styles.moreThumbsBadge}>
                    <Text style={styles.moreThumbsText}>+{item.items.length - 2}</Text>
                  </View>
                )}
             </View>
             <View style={styles.itemDetailsCol}>
                <Text style={styles.itemCountText}>
                  {item.items?.length || 0} {item.items?.length === 1 ? 'Item' : 'Items'}
                </Text>
                <Text style={styles.itemNamesText} numberOfLines={1}>
                  {item.items?.map((oi: any) => oi.product?.name).join(', ')}
                </Text>
                <Text style={styles.totalAmount}>₹{Number(item.total_amount).toLocaleString('en-IN')}</Text>
             </View>
          </View>

          <View style={styles.verticalDivider} />

          <View style={styles.deliveryStatusCol}>
             {isDelivered ? (
               <>
                 <Calendar size={20} color="#64748B" />
                 <View>
                   <Text style={styles.deliveryLabel}>Delivered on</Text>
                   <Text style={styles.deliveryValue}>{formatDate(item.delivered_at || item.updated_at)}</Text>
                 </View>
               </>
             ) : isShipped ? (
               <>
                 <Truck size={20} color="#64748B" />
                 <View>
                   <Text style={styles.deliveryLabel}>Expected Delivery</Text>
                   <Text style={styles.deliveryValue}>{formatDate(new Date(new Date(item.created_at).getTime() + 4 * 86400000))}</Text>
                 </View>
               </>
             ) : (
               <>
                 <Hourglass size={20} color="#64748B" />
                 <View>
                   <Text style={styles.deliveryLabel}>Expected Delivery</Text>
                   <Text style={styles.deliveryValue}>{formatDate(new Date(new Date(item.created_at).getTime() + 7 * 86400000))}</Text>
                 </View>
               </>
             )}
          </View>
        </View>

        <View style={styles.cardActionRow}>
          <Text style={[styles.viewDetails, { color: getStatusColor(item.status) }]}>View Order Details</Text>
          <Text style={styles.ticketNo}>Ticket no : {item.id.slice(0, 8).toUpperCase()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const content = (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#dc8d3c" />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ShoppingBag size={64} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySubtitle}>When you buy gear from our shop, your orders will appear here.</Text>
              <TouchableOpacity 
                style={styles.shopBtn}
                onPress={() => router.push('/shop')}
              >
                <Text style={styles.shopBtnText}>Start Shopping</Text>
              </TouchableOpacity>
            </View>
          }
          onRefresh={loadOrders}
          refreshing={loading}
        />
      )}
    </View>
  );

  if (IS_WEB) {
    return (
      <WebLayout>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.webContainer}>
            <View style={styles.webHeader}>
               <View style={styles.webHeaderLeft}>
                  <Text style={styles.webTitle}>My Orders</Text>
                  <Text style={styles.webSubtitle}>Track, view and manage all your orders</Text>
               </View>
               <View style={styles.filterRow}>
                 <TouchableOpacity 
                   style={styles.filterDropdown}
                   onPress={() => setShowFilterMenu(!showFilterMenu)}
                 >
                    <Filter size={16} color="#64748B" />
                    <Text style={styles.filterText}>{statuses.find(s => s.value === statusFilter)?.label}</Text>
                    <ChevronDown size={14} color="#64748B" />
                 </TouchableOpacity>

                 <TouchableOpacity 
                   style={styles.dateFilterBtn}
                   onPress={() => {
                     setTempFromDate(fromDate);
                     setTempToDate(toDate);
                     setIsDatePickerVisible(true);
                   }}
                 >
                    <Calendar size={16} color="#059669" />
                    <Text style={styles.filterText}>
                      {fromDate ? (
                        toDate ? `${formatDate(fromDate)} - ${formatDate(toDate)}` : `From ${formatDate(fromDate)}`
                      ) : 'Filter by Date'}
                    </Text>
                    <ChevronDown size={14} color="#64748B" />
                 </TouchableOpacity>

                 {showFilterMenu && (
                   <View style={styles.dropdownMenu}>
                     {statuses.map((status) => (
                       <TouchableOpacity 
                         key={status.value}
                         style={[styles.dropdownItem, statusFilter === status.value && styles.dropdownItemActive]}
                         onPress={() => {
                           setStatusFilter(status.value);
                           setShowFilterMenu(false);
                         }}
                       >
                         <Text style={[styles.dropdownItemText, statusFilter === status.value && styles.dropdownItemTextActive]}>
                           {status.label}
                         </Text>
                       </TouchableOpacity>
                     ))}
                   </View>
                 )}
               </View>
            </View>
            
            {loading ? (
              <View style={[styles.center, { paddingVertical: 100 }]}>
                <ActivityIndicator size="large" color="#059669" />
              </View>
            ) : (
              <>
                <View style={{ gap: 20 }}>
                  {orders.map(order => (
                    <React.Fragment key={order.id}>
                      {renderOrderItem({ item: order })}
                    </React.Fragment>
                  ))}
                </View>

                {orders.length === 0 && (
                  <View style={[styles.emptyState, { paddingVertical: 100 }]}>
                    <ShoppingBag size={64} color="#E5E7EB" />
                    <Text style={styles.emptyTitle}>No orders yet</Text>
                    <Text style={styles.emptySubtitle}>When you buy gear from our shop, your orders will appear here.</Text>
                    <TouchableOpacity 
                      style={styles.shopBtn}
                      onPress={() => router.push('/shop')}
                    >
                      <Text style={styles.shopBtnText}>Start Shopping</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

          <Modal
            visible={isDatePickerVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsDatePickerVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsDatePickerVisible(false)} />
              <View style={styles.datePickerModalWrap}>
                <View style={styles.dpMain}>
                  <View style={styles.dpSidebar}>
                    <Text style={styles.dpSidebarTitle}>Quick Range</Text>
                    {[
                      { id: 'all', label: 'All Time' },
                      { id: 'today', label: 'Today' },
                      { id: 'yesterday', label: 'Yesterday' },
                      { id: 'this_week', label: 'This Week' },
                      { id: 'last_week', label: 'Last Week' },
                      { id: 'this_month', label: 'This Month' },
                      { id: 'last_month', label: 'Last Month' },
                      { id: 'custom', label: 'Custom Range' },
                    ].map((range) => (
                      <TouchableOpacity 
                        key={range.id} 
                        style={[styles.quickRangeItem, ((range.id === 'all' && !tempFromDate) || (range.id === 'custom' && tempFromDate)) && styles.quickRangeItemActive]}
                        onPress={() => setQuickRange(range.id)}
                      >
                        <Calendar size={14} color={((range.id === 'all' && !tempFromDate) || (range.id === 'custom' && tempFromDate)) ? '#059669' : '#64748B'} />
                        <Text style={[styles.quickRangeText, ((range.id === 'all' && !tempFromDate) || (range.id === 'custom' && tempFromDate)) && styles.quickRangeTextActive]}>
                          {range.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.dpSelectionArea}>
                    <View style={styles.dpInputsRow}>
                      <View style={styles.dpInputBox}>
                        <Text style={styles.dpInputLabel}>Start Date</Text>
                        <View style={styles.dpInput}>
                          <Calendar size={16} color="#64748B" />
                          <Text style={styles.dpInputText}>
                            {tempFromDate ? new Date(tempFromDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select Date'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.dpArrow}>
                        <Text style={{ color: '#94A3B8', fontSize: 20 }}>→</Text>
                      </View>
                      <View style={styles.dpInputBox}>
                        <Text style={styles.dpInputLabel}>End Date</Text>
                        <View style={styles.dpInput}>
                          <Calendar size={16} color="#64748B" />
                          <Text style={styles.dpInputText}>
                            {tempToDate ? new Date(tempToDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select Date'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.calendarPlaceholder}>
                       {renderCalendar(0)}
                       {renderCalendar(1)}
                    </View>
                    
                    <Text style={styles.calHint}>Select range from the sidebar or click a date to begin</Text>
                  </View>
                </View>

                <View style={styles.dpFooter}>
                  <TouchableOpacity onPress={() => { setTempFromDate(null); setTempToDate(null); }}>
                    <Text style={styles.dpClearBtn}>Clear</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity style={styles.dpCancelBtn} onPress={() => setIsDatePickerVisible(false)}>
                      <Text style={styles.dpCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.dpApplyBtn} 
                      onPress={() => {
                        setFromDate(tempFromDate);
                        setToDate(tempToDate);
                        setIsDatePickerVisible(false);
                      }}
                    >
                      <Text style={styles.dpApplyText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </Modal>

          {/* Help Section */}
          {!loading && orders.length > 0 && (
            <View style={styles.helpSection}>
               <View style={styles.helpIconBox}>
                  <ShoppingBag size={20} color="#10B981" />
               </View>
               <View style={styles.helpContent}>
                  <Text style={styles.helpTitle}>Can’t find your order?</Text>
                  <Text style={styles.helpSubtitle}>Try using a different filter or check your email for order confirmation.</Text>
               </View>
            </View>
          )}
          </View>
        </ScrollView>
      </WebLayout>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <MobileAppNavbar 
        title="My Orders" 
        titleColor="#111827"
        lightBg
      />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
  },
  webContainer: {
    padding: 20,
    width: '100%',
  },
  backBtnWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  backTextWeb: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 32,
    zIndex: 100,
  },
  webHeaderLeft: {
    gap: 4,
  },
  webTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  webSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '400',
    fontFamily: 'Inter',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    position: 'relative',
    zIndex: 101,
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    width: 200,
    zIndex: 102,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    padding: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  dropdownItemActive: {
    backgroundColor: '#F8FAFC',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  dropdownItemTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  dateFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  datePickerModalWrap: {
    width: 800,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  dpMain: {
    flexDirection: 'row',
    height: 480,
  },
  dpSidebar: {
    width: 200,
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    padding: 20,
  },
  dpSidebarTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  quickRangeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  quickRangeItemActive: {
    backgroundColor: '#ECFDF5',
  },
  quickRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  quickRangeTextActive: {
    color: '#059669',
  },
  dpSelectionArea: {
    flex: 1,
    padding: 24,
  },
  dpInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  dpInputBox: {
    flex: 1,
  },
  dpInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  dpInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  dpInputText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  dpArrow: {
    paddingTop: 18,
  },
  calendarPlaceholder: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
  },
  calMonth: {
    flex: 1,
  },
  calMonthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
  },
  calGrid: {
    width: '100%',
  },
  calHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  calRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  calCell: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  calCellSelected: {
    backgroundColor: '#059669',
  },
  calCellInRange: {
    backgroundColor: '#ECFDF5',
    borderRadius: 0,
  },
  calCellStart: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  calCellEnd: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  calDayText: {
    fontSize: 14,
    color: '#334155',
  },
  calDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calDayTextInRange: {
    color: '#065F46',
    fontWeight: '600',
  },
  calHint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  dpFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  dpClearBtn: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 8,
  },
  dpCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  dpCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  dpApplyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#059669',
  },
  dpApplyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
    fontFamily: 'Inter',
  },
  list: {
    paddingBottom: 40,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 3,
    overflow: 'hidden',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  orderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderId: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Inter',
  },
  orderDate: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '400',
    fontFamily: 'Inter',
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  itemsMainRow: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    gap: 24,
  },
  itemsListContainer: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  thumbsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  previewThumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  moreThumbsBadge: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
  },
  moreThumbsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  itemDetailsCol: {
    flex: 1,
    gap: 2,
  },
  itemCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Inter',
  },
  itemNamesText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '400',
    fontFamily: 'Inter',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 4,
    fontFamily: 'Inter',
  },
  verticalDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#F1F5F9',
  },
  deliveryStatusCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deliveryLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: '#94A3B8',
    fontFamily: 'Inter',
  },
  deliveryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'Inter',
    marginTop: 1,
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  viewDetails: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  ticketNo: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  helpIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpContent: {
    gap: 2,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'Inter',
  },
  helpSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    maxWidth: 300,
  },
  shopBtn: {
    marginTop: 32,
    backgroundColor: '#0F172A',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  shopBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
