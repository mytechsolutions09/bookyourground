import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, ActivityIndicator, Image, ScrollView } from 'react-native';
import { ShoppingBag, ChevronRight, Package, Calendar, Clock, MapPin, CreditCard, ChevronLeft } from 'lucide-react-native';
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

  useEffect(() => {
    if (user) loadOrders();
  }, [user]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
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

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
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

  const renderOrderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => router.push({ pathname: '/(tabs)/profile/order-details', params: { id: item.id } })}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderMeta}>
          <Text style={styles.orderId}>Order no : {item.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.itemsPreview}>
        {item.items?.slice(0, 3).map((oi: any, idx: number) => (
          <View key={oi.id} style={styles.previewItem}>
            <Image 
              source={{ uri: oi.product?.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&q=80' }} 
              style={styles.previewThumb} 
            />
            {idx === 2 && item.items.length > 3 && (
              <View style={styles.moreOverlay}>
                <Text style={styles.moreText}>+{item.items.length - 2}</Text>
              </View>
            )}
          </View>
        ))}
        <View style={styles.orderInfo}>
          <Text style={styles.itemSummary}>
            {item.items?.length || 0} {item.items?.length === 1 ? 'Item' : 'Items'}
          </Text>
          <Text style={styles.totalAmount}>₹{Number(item.total_amount).toLocaleString('en-IN')}</Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.viewDetails}>View Order Details</Text>
        <ChevronRight size={16} color="#dc8d3c" />
      </View>
    </TouchableOpacity>
  );

  const content = (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
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
        <View style={styles.webContainer}>
          <View style={styles.webHeader}>

             <Text style={styles.webTitle}>My Orders</Text>
          </View>
          {content}
        </View>
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
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  webHeader: {
    marginBottom: 24,
  },
  webTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
    fontFamily: 'Inter',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderMeta: {
    gap: 2,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Inter',
  },
  orderDate: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  itemsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  previewItem: {
    width: 50,
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  previewThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  orderInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  itemSummary: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewDetails: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc8d3c',
    fontFamily: 'Inter',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  shopBtn: {
    marginTop: 24,
    backgroundColor: '#2b2f4b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shopBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
