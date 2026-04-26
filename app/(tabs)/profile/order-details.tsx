import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ChevronLeft, Package, Calendar, Clock, MapPin, CreditCard, ShieldCheck, Mail, Phone, ShoppingBag } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { formatDateTime } from '@/utils/helpers';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import WebLayout from '@/components/web/WebLayout';
import { StatusBar } from 'expo-status-bar';

const IS_WEB = Platform.OS === 'web';

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { setTabBarVisible } = useUI();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTabBarVisible(false);
    if (id) loadOrderDetails();
    return () => setTabBarVisible(true);
  }, [id]);

  const loadOrderDetails = async () => {
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
        .eq('id', id)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (err) {
      console.error('Error loading order details:', err);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#dc8d3c" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <ShoppingBag size={64} color="#E5E7EB" />
        <Text style={styles.errorTitle}>Order not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.orderMeta}>
          <Text style={styles.orderId}>Order no : {order.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.orderDate}>{formatDateTime(order.created_at)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
            {order.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Items Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items Ordered</Text>
        <View style={styles.card}>
          {order.items?.map((item: any, index: number) => (
            <View key={item.id} style={[styles.itemRow, index === order.items.length - 1 && { borderBottomWidth: 0 }]}>
              <Image 
                source={{ uri: item.product?.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80' }} 
                style={styles.itemImage} 
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product?.name}</Text>
                <Text style={styles.itemQty}>Qty: {item.quantity} × ₹{Number(item.price_at_purchase).toLocaleString('en-IN')}</Text>
              </View>
              <Text style={styles.itemTotal}>₹{Number(item.quantity * item.price_at_purchase).toLocaleString('en-IN')}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Shipping & Payment Grid */}
      <View style={styles.grid}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <MapPin size={18} color="#64748B" />
              <Text style={styles.infoText}>{order.shipping_address || 'No address provided'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing Details</Text>
          <View style={styles.card}>
             <View style={[styles.infoRow, { marginBottom: 12 }]}>
               <CreditCard size={18} color="#64748B" />
               <Text style={styles.infoText}>Payment: {order.payment_method?.toUpperCase() || 'RAZORPAY'}</Text>
             </View>
             <View style={styles.infoRow}>
               <ShieldCheck size={18} color="#10B981" />
               <Text style={[styles.infoText, { color: '#10B981', fontWeight: '700' }]}>Status: {order.payment_status?.toUpperCase() || 'PAID'}</Text>
             </View>
          </View>
        </View>
      </View>

      {/* Summary Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{Number(order.total_amount).toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>FREE</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>₹{Number(order.total_amount).toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  if (IS_WEB) {
    return (
      <WebLayout>
        <View style={styles.webContainer}>
          <TouchableOpacity style={styles.backBtnWeb} onPress={() => router.back()}>
            <ChevronLeft size={20} color="#64748B" />
            <Text style={styles.backTextWeb}>Back to My Orders</Text>
          </TouchableOpacity>
          {content}
        </View>
      </WebLayout>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <MobileAppNavbar 
        title="Order Details" 
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  webContainer: {
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  orderMeta: {
    gap: 4,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    fontFamily: 'Inter',
  },
  orderDate: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
    paddingHorizontal: 4,
    fontFamily: 'Inter',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    resizeMode: 'cover',
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    fontFamily: 'Inter',
  },
  itemQty: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'Inter',
  },
  grid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: Platform.OS === 'web' ? 24 : 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  summaryCard: {
    backgroundColor: '#2b2f4b',
    borderRadius: 24,
    padding: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  totalValue: {
    color: '#dc8d3c',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  backBtnWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  backTextWeb: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 24,
  },
  backBtn: {
    backgroundColor: '#2b2f4b',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
