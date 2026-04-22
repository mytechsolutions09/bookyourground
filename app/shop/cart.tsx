import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    router.push('/shop/checkout');
  };

  const content = (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator color="#dc8d3c" style={{ marginTop: 100 }} />
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
                          <Minus size={16} color="#2b2f4b" />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity 
                          onPress={() => updateQuantity(item.id, 1)}
                          style={styles.qtyBtn}
                        >
                          <Plus size={16} color="#2b2f4b" />
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
                <Text style={[styles.summaryValue, { color: '#dc8d3c' }]}>FREE</Text>
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
                <Text style={styles.checkoutBtnText}>{isCheckingOut ? 'Processing...' : 'Proceed to Checkout'}</Text>
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
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <MobileAppNavbar 
        title="My Cart" 
        titleColor="#FFFFFF"
        bgColor="#dc8d3c"
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
    padding: 12,
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2b2f4b',
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
    backgroundColor: '#2b2f4b',
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
    gap: 8,
    marginBottom: 20,
  },
  cartItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2b2f4b',
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#dc8d3c',
    marginBottom: 8,
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
    color: '#2b2f4b',
    minWidth: 20,
    textAlign: 'center',
  },
  removeBtn: {
    padding: 8,
  },
  summaryCard: {
    backgroundColor: '#2b2f4b',
    borderRadius: 20,
    padding: 16,
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
    marginVertical: 12,
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
    color: '#dc8d3c',
    fontSize: 22,
    fontWeight: '900',
  },
  checkoutBtn: {
    backgroundColor: '#dc8d3c',
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
