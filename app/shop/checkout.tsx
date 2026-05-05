import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, MapPin, CreditCard, ShoppingBag, Truck, ShieldCheck, ChevronDown, Smartphone, Globe } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { Modal, FlatList, Pressable } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebLayout from '@/components/web/WebLayout';
import SiteFooter from '@/components/web/SiteFooter';

export default function CheckoutScreen() {
  const { width } = useWindowDimensions();
  const isSmall = width < 768;
  const isCompact = width < 1024;
  const router = useRouter();
  const { user } = useAuth();
  const { setTabBarVisible } = useUI();
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Delhi');
  const [pinCode, setPinCode] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('Delhi');
  const [billingPinCode, setBillingPinCode] = useState('');
  const [sameAsDelivery, setSameAsDelivery] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [saveInfo, setSaveInfo] = useState(true);
  const [useWallet, setUseWallet] = useState(false);

  const [isStateModalVisible, setIsStateModalVisible] = useState(false);
  const [pickingFor, setPickingFor] = useState<'delivery' | 'billing'>('delivery');
  const [walletBalance, setWalletBalance] = useState(0);

  const walletAmountToUse = useWallet ? Math.min(walletBalance, totalAmount) : 0;
  const remainingPayable = totalAmount - walletAmountToUse;

  const [showRazorpayWebView, setShowRazorpayWebView] = useState(false);
  const [razorpayOrderData, setRazorpayOrderData] = useState<any>(null);

  const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
    'Uttarakhand', 'West Bengal', 'Delhi', 'Chandigarh', 'Jammu and Kashmir', 'Ladakh', 'Puducherry'
  ].sort();

  useEffect(() => {
    setTabBarVisible(false);
    if (user?.id) {
      loadCart();
      loadSavedInfo();
      fetchWalletBalance();
    }
    return () => setTabBarVisible(true);
  }, [user?.id]);

  const loadSavedInfo = async () => {
    try {
      const savedData = await AsyncStorage.getItem('checkout_saved_info');
      if (savedData) {
        const info = JSON.parse(savedData);
        setFullName(info.fullName || '');
        setPhoneNumber(info.phoneNumber || '');
        setAddress(info.address || '');
        setCity(info.city || '');
        setState(info.state || 'Delhi');
        setPinCode(info.pinCode || '');
      }
    } catch (err) {
      console.error('Error loading saved info:', err);
    }
  };

  const loadCart = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('shop_cart')
        .select(`
          id,
          quantity,
          selected_attributes,
          product:shop_products(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setCartItems(data || []);
      
      const total = (data || []).reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
      setTotalAmount(total);
    } catch (err) {
      console.error('Error loading cart:', err);
    }
  };
  const fetchWalletBalance = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      if (data) setWalletBalance(data.balance);
    } catch (err) {
      console.error('Error fetching wallet balance:', err);
    }
  };

  const handlePlaceOrder = async () => {
    if (!fullName || !phoneNumber || !address || !city || !pinCode) {
      Alert.alert('Missing Info', 'Please fill in all contact and delivery details');
      return;
    }

    try {
      setLoading(true);

      const orderDetails = {
        total_amount: totalAmount,
        wallet_amount: walletAmountToUse,
        remaining_amount: remainingPayable,
        payment_method: remainingPayable > 0 ? paymentMethod : 'wallet',
        shipping_address: `${address}, ${city}, ${state}, ${pinCode}`,
        billing_address: sameAsDelivery ? `${address}, ${city}, ${state}, ${pinCode}` : `${billingAddress}, ${billingCity}, ${billingState}, ${billingPinCode}`,
        customer_name: fullName,
        customer_phone: phoneNumber,
        save_info: saveInfo
      };

      // 1. Process via Edge Function
      const { data, error } = await supabase.functions.invoke('payment-gateway', {
        body: {
          action: remainingPayable > 0 ? 'create-razorpay-shop-order' : 'confirm-wallet-shop',
          orderDetails,
          cartItems
        }
      });

      if (error) throw error;

      if (data && data.success) {
        if (remainingPayable === 0) {
          // Success for full wallet payment
          Alert.alert('Success', 'Order placed successfully using wallet balance!');
          router.replace('/(tabs)/shop');
        } else {
          // Proceed to Razorpay for remaining amount
          if (Platform.OS === 'web') {
            await openRazorpayWeb(data.razorpayOrder, orderDetails);
          } else {
            // Native logic
            setRazorpayOrderData(data.razorpayOrder);
            setShowRazorpayWebView(true);
          }
        }
      } else {
        throw new Error(data?.error || 'Failed to initialize payment');
      }

    } catch (err: any) {
      console.error('Checkout error:', err);
      Alert.alert('Error', err.message || 'Could not place order');
    } finally {
      setLoading(false);
    }
  };

  const openRazorpayWeb = async (order: any, orderDetails: any) => {
    const loadScript = (src: string) => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.id = 'razorpay-sdk';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        if (!document.getElementById('razorpay-sdk')) {
          document.body.appendChild(script);
        } else {
          resolve(true);
        }
      });
    };

    const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
    if (!res) {
      Alert.alert('Error', 'Razorpay SDK failed to load');
      return;
    }

    const options = {
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: 'Book Your Ground Shop',
      description: `Order Payment for ${fullName}`,
      order_id: order.id,
      prefill: {
        name: fullName,
        contact: phoneNumber,
      },
      handler: async function (response: any) {
        try {
          setLoading(true);
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke('payment-gateway', {
            body: {
              action: 'verify-razorpay-shop-payment',
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderDetails,
              cartItems
            },
          });

          if (verifyError) throw verifyError;
          
          if (verifyData && verifyData.success) {
            Alert.alert('Success', 'Payment successful! Order placed.');
            router.replace('/(tabs)/shop');
          } else {
            throw new Error(verifyData?.error || 'Payment verification failed.');
          }
        } catch (err: any) {
          Alert.alert('Payment Error', err.message);
        } finally {
          setLoading(false);
        }
      },
      theme: { color: '#f8688a' }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const handleRazorpayMobileMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.status === 'success') {
        setShowRazorpayWebView(false);
        setLoading(true);
        
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke('payment-gateway', {
          body: {
            action: 'verify-razorpay-shop-payment',
            razorpay_order_id: data.response.razorpay_order_id,
            razorpay_payment_id: data.response.razorpay_payment_id,
            razorpay_signature: data.response.razorpay_signature,
            orderDetails: {
              total_amount: totalAmount,
              wallet_amount: walletAmountToUse,
              remaining_amount: remainingPayable,
              payment_method: paymentMethod,
              shipping_address: `${address}, ${city}, ${state}, ${pinCode}`,
              billing_address: sameAsDelivery ? `${address}, ${city}, ${state}, ${pinCode}` : `${billingAddress}, ${billingCity}, ${billingState}, ${billingPinCode}`,
              customer_name: fullName,
              customer_phone: phoneNumber,
              save_info: saveInfo
            },
            cartItems
          },
        });

        if (verifyError) throw verifyError;
        
        if (verifyData && verifyData.success) {
          Alert.alert('Success', 'Payment successful! Order placed.');
          router.replace('/(tabs)/shop');
        } else {
          throw new Error(verifyData?.error || 'Payment verification failed.');
        }
      } else if (data.status === 'dismissed' || data.status === 'failed') {
        setShowRazorpayWebView(false);
        if (data.status === 'failed') {
          Alert.alert('Payment Failed', data.response?.error?.description || 'Payment was unsuccessful.');
        }
      }
    } catch (err: any) {
      setShowRazorpayWebView(false);
      Alert.alert('Payment Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const razorpayMobileHtml = razorpayOrderData ? `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body { background-color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: -apple-system, system-ui; }
          .loader { border: 4px solid #f3f3f3; border-top: 4px solid #f8688a; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="loader"></div>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <script>
          var options = {
            "key": "${razorpayOrderData.key_id}",
            "amount": "${razorpayOrderData.amount}",
            "currency": "${razorpayOrderData.currency}",
            "name": "Book Your Ground Shop",
            "description": "Payment for ${fullName}",
            "order_id": "${razorpayOrderData.id}",
            "prefill": {
              "name": "${fullName}",
              "contact": "${phoneNumber}"
            },
            "theme": { "color": "#f8688a" },
            "handler": function (response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                status: 'success',
                response: response
              }));
            },
            "modal": {
              "ondismiss": function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  status: 'dismissed'
                }));
              }
            }
          };
          var rzp = new Razorpay(options);
          rzp.on('payment.failed', function (response){
            window.ReactNativeWebView.postMessage(JSON.stringify({
              status: 'failed',
              response: response
            }));
          });
          setTimeout(function() { rzp.open(); }, 500);
        </script>
      </body>
    </html>
  ` : '';

  const content = (
    <View style={[styles.container, Platform.OS === 'web' && styles.webContainer]}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      {Platform.OS !== 'web' && (
        <MobileAppNavbar 
          title="Checkout" 
          titleColor="#FFFFFF"
          bgColor="#f8688a"
        />
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={Platform.OS === 'web' ? [styles.webLayoutRow, isCompact && styles.webLayoutRowCompact] : null}>
          <View style={Platform.OS === 'web' ? styles.webLayoutMain : null}>
            {/* Contact Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Contact Information</Text>
              </View>
              <View style={styles.card}>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#9CA3AF"
                  value={fullName}
                  onChangeText={setFullName}
                />
                <TextInput
                  style={[styles.input, { marginBottom: 0 }]}
                  placeholder="Phone Number"
                  placeholderTextColor="#9CA3AF"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Delivery Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Delivery Address</Text>
              </View>
              <View style={styles.card}>
                <TextInput
                  style={styles.input}
                  placeholder="House / Street / Area"
                  placeholderTextColor="#9CA3AF"
                  value={address}
                  onChangeText={setAddress}
                />
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                    placeholder="City"
                    placeholderTextColor="#9CA3AF"
                    value={city}
                    onChangeText={setCity}
                  />
                  <TouchableOpacity 
                    style={[styles.input, styles.dropdownInput, { flex: 1.2 }]}
                    onPress={() => { setPickingFor('delivery'); setIsStateModalVisible(true); }}
                  >
                    <Text style={[styles.dropdownText, !state && { color: '#9CA3AF' }]}>{state || 'State'}</Text>
                    <ChevronDown size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, { marginBottom: 0 }]}
                  placeholder="PIN Code"
                  placeholderTextColor="#9CA3AF"
                  value={pinCode}
                  onChangeText={setPinCode}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Billing Address Toggle */}
            <TouchableOpacity 
              style={styles.checkboxRow} 
              onPress={() => setSameAsDelivery(!sameAsDelivery)}
            >
              <View style={[styles.checkbox, sameAsDelivery && styles.checkboxChecked]}>
                {sameAsDelivery && <ShieldCheck size={12} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>Billing address same as delivery</Text>
            </TouchableOpacity>

            {/* Save Info Toggle */}
            <TouchableOpacity 
              style={styles.checkboxRow} 
              onPress={() => setSaveInfo(!saveInfo)}
            >
              <View style={[styles.checkbox, saveInfo && styles.checkboxChecked]}>
                {saveInfo && <ShieldCheck size={12} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>Save info for future references</Text>
            </TouchableOpacity>


            {/* Billing Section (Conditional) */}
            {!sameAsDelivery && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Billing Address</Text>
                </View>
                <View style={styles.card}>
                  <TextInput
                    style={styles.input}
                    placeholder="Billing House / Street"
                    placeholderTextColor="#9CA3AF"
                    value={billingAddress}
                    onChangeText={setBillingAddress}
                  />
                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginRight: 8 }]}
                      placeholder="City"
                      placeholderTextColor="#9CA3AF"
                      value={billingCity}
                      onChangeText={setBillingCity}
                    />
                    <TouchableOpacity 
                      style={[styles.input, styles.dropdownInput, { flex: 1.2 }]}
                      onPress={() => { setPickingFor('billing'); setIsStateModalVisible(true); }}
                    >
                      <Text style={[styles.dropdownText, !billingState && { color: '#9CA3AF' }]}>{billingState || 'State'}</Text>
                      <ChevronDown size={16} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.input, { marginBottom: 0 }]}
                    placeholder="PIN"
                    placeholderTextColor="#9CA3AF"
                    value={billingPinCode}
                    onChangeText={setBillingPinCode}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            )}

            {/* Payment Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Payment Method</Text>
              </View>
              
              {/* Wallet Option */}
              {walletBalance > 0 && (
                <TouchableOpacity 
                  style={[styles.walletToggle, useWallet && styles.walletToggleActive]}
                  onPress={() => setUseWallet(!useWallet)}
                >
                  <View style={styles.walletInfo}>
                    <ShoppingBag size={20} color={useWallet ? '#f8688a' : '#64748B'} />
                    <View>
                      <Text style={styles.walletTitle}>Use Wallet Balance</Text>
                      <Text style={styles.walletSubtitle}>Available: ₹{walletBalance.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>
                  <View style={[styles.checkbox, useWallet && styles.checkboxChecked]}>
                    {useWallet && <ShieldCheck size={12} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
              )}

              {remainingPayable > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.subSectionTitle}>Pay remaining ₹{remainingPayable.toLocaleString('en-IN')} via:</Text>
                  <View style={styles.paymentGrid}>
                    <TouchableOpacity 
                      style={[styles.paymentCard, paymentMethod === 'upi' && styles.paymentCardActive]}
                      onPress={() => setPaymentMethod('upi')}
                    >
                      <Smartphone size={20} color={paymentMethod === 'upi' ? '#f8688a' : '#9CA3AF'} />
                      <Text style={[styles.paymentText, paymentMethod === 'upi' && styles.paymentTextActive]}>UPI</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.paymentCard, paymentMethod === 'card' && styles.paymentCardActive]}
                      onPress={() => setPaymentMethod('card')}
                    >
                      <CreditCard size={20} color={paymentMethod === 'card' ? '#f8688a' : '#9CA3AF'} />
                      <Text style={[styles.paymentText, paymentMethod === 'card' && styles.paymentTextActive]}>Card</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.paymentCard, paymentMethod === 'netbanking' && styles.paymentCardActive]}
                      onPress={() => setPaymentMethod('netbanking')}
                    >
                      <Globe size={20} color={paymentMethod === 'netbanking' ? '#f8688a' : '#9CA3AF'} />
                      <Text style={[styles.paymentText, paymentMethod === 'netbanking' && styles.paymentTextActive]}>Net Banking</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={Platform.OS === 'web' ? styles.webLayoutSide : null}>
            {/* Order Summary */}
            <View style={[styles.section, { marginBottom: 12 }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Order Summary</Text>
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal ({cartItems.length} items)</Text>
                  <Text style={styles.summaryValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shipping</Text>
                  <Text style={[styles.summaryValue, { color: '#f8688a' }]}>FREE</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
                </View>
                
                {Platform.OS === 'web' && (
                  <View>
                    <TouchableOpacity 
                      style={[styles.placeOrderBtn, { marginTop: 24 }, loading && { opacity: 0.7 }]}
                      onPress={handlePlaceOrder}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.placeOrderText}>
                          {remainingPayable === 0 ? 'Pay via Wallet' : 'Place Order'}
                        </Text>
                      )}
                    </TouchableOpacity>
                    <View style={styles.webTermsContainer}>
                      <Text style={styles.smallTermsText}>By placing this order, you agree to our </Text>
                      <TouchableOpacity onPress={() => router.push('/shop/terms')}>
                        <Text style={styles.smallTermsLink}>Terms & Conditions</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Trust Badges */}
            <View style={styles.trustRow}>
              <View style={styles.trustItem}>
                <ShieldCheck size={16} color="#6B7280" />
                <Text style={styles.trustText}>Secure Checkout</Text>
              </View>
            </View>
          </View>
        </View>

        {Platform.OS !== 'web' && (
          <View style={styles.mobileTermsContainer}>
            <Text style={styles.smallTermsText}>By placing this order, you agree to our </Text>
            <TouchableOpacity onPress={() => router.push('/shop/terms')}>
              <Text style={styles.smallTermsLink}>Terms & Conditions</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom Action (Mobile Only) */}
      {Platform.OS !== 'web' && (
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={[styles.placeOrderBtn, loading && { opacity: 0.7 }]}
            onPress={handlePlaceOrder}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.placeOrderText}>
                {remainingPayable === 0 ? 'Pay via Wallet' : 'Place Order'} • ₹{totalAmount.toLocaleString('en-IN')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      
      {/* State Selection Modal */}
      <Modal
        visible={isStateModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsStateModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setIsStateModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setIsStateModalVisible(false)}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={INDIAN_STATES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.stateItem}
                  onPress={() => {
                    if (pickingFor === 'delivery') setState(item);
                    else setBillingState(item);
                    setIsStateModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.stateItemText,
                    (pickingFor === 'delivery' ? state === item : billingState === item) && styles.stateItemTextActive
                  ]}>{item}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Razorpay WebView Modal */}
      <Modal
        visible={showRazorpayWebView}
        animationType="slide"
        onRequestClose={() => setShowRazorpayWebView(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={{ height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <TouchableOpacity onPress={() => setShowRazorpayWebView(false)}>
              <ChevronLeft size={24} color="#2b2f4b" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '600', marginLeft: 16, color: '#2b2f4b' }}>Secure Payment</Text>
          </View>
          <WebView
            source={{ html: razorpayMobileHtml }}
            onMessage={handleRazorpayMobileMessage}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
          />
        </View>
      </Modal>
    </View>
  );

  if (Platform.OS === 'web') {
    return <WebLayout hideHeader={isSmall}>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  webContainer: {
    backgroundColor: '#F3F4F6',
  },
  webLayoutRow: {
    flexDirection: 'row',
    gap: 24,
  },
  webLayoutRowCompact: {
    flexDirection: 'column',
  },
  webLayoutMain: {
    flex: 2,
  },
  webLayoutSide: {
    flex: 1,
  },
  input: {
    height: 44,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#2b2f4b',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 14,
    color: '#2b2f4b',
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#f8688a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#f8688a',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  termsTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  termsLink: {
    color: '#f8688a',
    textDecorationLine: 'underline',
  },
  mobileTermsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  webTermsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  smallTermsText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
  smallTermsLink: {
    fontSize: 11,
    color: '#f8688a',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2b2f4b',
  },
  closeBtnText: {
    color: '#f8688a',
    fontWeight: '600',
    fontSize: 14,
  },
  stateItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  stateItemText: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '500',
  },
  stateItemTextActive: {
    color: '#f8688a',
    fontWeight: '600',
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  walletToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  walletToggleActive: {
    borderColor: '#f8688a',
    backgroundColor: 'rgba(248, 104, 138, 0.05)',
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  walletTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2b2f4b',
  },
  walletSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  paymentGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  paymentCardActive: {
    borderColor: '#f8688a',
    backgroundColor: 'rgba(248, 104, 138, 0.05)',
  },
  paymentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  paymentTextActive: {
    color: '#f8688a',
  },
  upiIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: '#9CA3AF',
  },
  upiIconActive: {
    color: '#f8688a',
  },
  summaryCard: {
    backgroundColor: '#2b2f4b',
    borderRadius: 16,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 12,
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
  },
  totalValue: {
    color: '#f8688a',
    fontSize: 20,
    fontWeight: '600',
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 8,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  bottomBar: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  placeOrderBtn: {
    backgroundColor: '#f8688a',
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f8688a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  placeOrderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
