import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';

export default function CartScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { setTabBarVisible } = useUI();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    setTabBarVisible(false);
    return () => setTabBarVisible(true);
  }, []);

  useEffect(() => {
    if (user) loadCart();
  }, [user]);

  const loadCart = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shop_cart')
        .select(`
          id,
          quantity,
          product:shop_products(*)
        `)
        .eq('user_id', user?.id);

      if (error) throw error;
      setCartItems(data || []);
    } catch (err) {
      console.error('Error loading cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (cartId: string, delta: number) => {
    const item = cartItems.find(i => i.id === cartId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty < 1) return;

    try {
      const { error } = await supabase
        .from('shop_cart')
        .update({ quantity: newQty })
        .eq('id', cartId);

      if (error) throw error;
      setCartItems(prev => prev.map(i => i.id === cartId ? { ...i, quantity: newQty } : i));
    } catch (err) {
      console.error('Error updating quantity:', err);
    }
  };

  const removeItem = async (cartId: string) => {
    try {
      const { error } = await supabase
        .from('shop_cart')
        .delete()
        .eq('id', cartId);

      if (error) throw error;
      setCartItems(prev => prev.filter(i => i.id !== cartId));
    } catch (err) {
      console.error('Error removing item:', err);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (!user || cartItems.length === 0) return;
    
    try {
      setIsCheckingOut(true);
      const total = calculateTotal();
      
      // 1. Create order
      const { data: order, error: orderError } = await supabase
        .from('shop_orders')
        .insert({
          user_id: user.id,
          total_amount: total,
          status: 'pending',
          payment_status: 'paid', // Assuming wallet payment for now or just mock
          payment_method: 'wallet'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_purchase: item.product.price
      }));

      const { error: itemsError } = await supabase
        .from('shop_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. Clear cart
      const { error: clearError } = await supabase
        .from('shop_cart')
        .delete()
        .eq('user_id', user.id);

      if (clearError) throw clearError;

      Alert.alert('Success', 'Order placed successfully!');
      router.push('/(tabs)/shop');
    } catch (err: any) {
      console.error('Checkout error:', err);
      Alert.alert('Checkout Failed', err.message || 'Something went wrong');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const content = (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator color="#01b854" style={{ marginTop: 100 }} />
        ) : cartItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ShoppingBag size={80} color="#D1D5DB" strokeWidth={1} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtitle}>Looks like you haven't added anything to your cart yet.</Text>
            <TouchableOpacity 
              style={styles.shopNowBtn}
              onPress={() => router.push('/(tabs)/shop')}
            >
              <Text style={styles.shopNowText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={styles.itemsSection}>
              {cartItems.map((item) => (
                <View key={item.id} style={styles.cartItem}>
                  <Image 
                    source={{ uri: item.product.images?.[0] || 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&q=80' }} 
                    style={styles.itemImage} 
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.product.name}</Text>
                    <Text style={styles.itemCategory}>{item.product.tag || 'Standard'}</Text>
                    <Text style={styles.itemPrice}>₹{item.product.price.toLocaleString('en-IN')}</Text>
                    
                    <View style={styles.qtyRow}>
                      <View style={styles.qtySelector}>
                        <TouchableOpacity 
                          onPress={() => updateQuantity(item.id, -1)}
                          style={styles.qtyBtn}
                        >
                          <Minus size={16} color="#043529" />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity 
                          onPress={() => updateQuantity(item.id, 1)}
                          style={styles.qtyBtn}
                        >
                          <Plus size={16} color="#043529" />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity 
                        onPress={() => removeItem(item.id)}
                        style={styles.removeBtn}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₹{calculateTotal().toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                <Text style={[styles.summaryValue, { color: '#01b854' }]}>FREE</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{calculateTotal().toLocaleString('en-IN')}</Text>
              </View>
              
              <TouchableOpacity 
                style={[styles.checkoutBtn, isCheckingOut && { opacity: 0.7 }]}
                onPress={handleCheckout}
                disabled={isCheckingOut}
              >
                <Text style={styles.checkoutBtnText}>{isCheckingOut ? 'Processing...' : 'Checkout'}</Text>
                {!isCheckingOut && <ArrowRight size={20} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout>
        <Stack.Screen options={{ title: 'Shopping Cart' }} />
        {content}
      </WebLayout>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <MobileAppNavbar 
        title="My Cart" 
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={28} color="#01b854" />
          </TouchableOpacity>
        }
      />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#043529',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 32,
    lineHeight: 20,
  },
  shopNowBtn: {
    backgroundColor: '#043529',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 999,
  },
  shopNowText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  itemsSection: {
    gap: 16,
    marginBottom: 32,
  },
  cartItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    gap: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#043529',
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#01b854',
    marginBottom: 12,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 4,
    gap: 12,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#043529',
    minWidth: 20,
    textAlign: 'center',
  },
  removeBtn: {
    padding: 8,
  },
  summaryCard: {
    backgroundColor: '#043529',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  totalLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  totalValue: {
    color: '#00ea6b',
    fontSize: 22,
    fontWeight: '900',
  },
  checkoutBtn: {
    backgroundColor: '#01b854',
    height: 60,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
