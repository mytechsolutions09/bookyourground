import React, { useEffect, useState } from 'react';
import {
  View,
  Text as RNText,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  useWindowDimensions,
  TextInput as RNTextInput,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Image } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { formatCurrency, formatDateDDMMYYYY } from '@/utils/helpers';
import { CreditCard, ShieldCheck, Clock, Calendar, MapPin, ChevronLeft, Wallet } from 'lucide-react-native';
import { hoursBetweenBooked, normalizeDbTimeToHHMM } from '@/utils/bookingSlots';

export default function CheckoutScreen() {
  const { id } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width > 480;
  
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingCash, setProcessingCash] = useState(false);
  const [activeGateways, setActiveGateways] = useState<any[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [isCouponsModalVisible, setIsCouponsModalVisible] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [fetchingCoupons, setFetchingCoupons] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [customCashAmount, setCustomCashAmount] = useState<string>('');

  useEffect(() => {
    fetchActiveGateways();
  }, []);

  const fetchActiveGateways = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      setActiveGateways(data || []);
      
      const razorpay = data?.find(g => g.name === 'razorpay');
      if (razorpay) setSelectedGateway('razorpay');
      else if (data?.length) setSelectedGateway(data[0].name);
    } catch (e) {
      console.error('Error fetching gateways:', e);
    }
  };

  useEffect(() => {
    if (id === 'new') {
      fetchNewBookingDetails();
    } else {
      fetchExistingBooking();
    }
  }, [id]);

  const params = useLocalSearchParams();

  const handleCashPayment = async () => {
    if (!booking) return;

    try {
      setProcessingCash(true);

      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('payment-gateway', {
        body: {
          action: 'confirm-cash',
          bookingId: booking.isNew ? null : booking.id,
          bookingDetails: booking.isNew ? {
            ground_id: booking.ground_id,
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            end_time: booking.end_time,
            team_type: booking.team_type,
            coupon_id: booking.coupon_id,
            total_hours: booking.total_hours,
            price_per_hour: booking.price_per_hour,
            total_amount: parseFloat(customCashAmount) || (booking.total_amount + (booking.discount_amount || 0)),
            discount_amount: booking.discount_amount || 0,
          } : {
            total_amount: parseFloat(customCashAmount) || booking.total_amount,
          },
        },
      });

      if (error) {
        console.error('Functions error:', error);
        let msg = error.message;
        
        if (error.context && typeof error.context.json === 'function') {
           try {
             const errBody = await error.context.json();
             if (errBody && errBody.error) msg = errBody.error;
           } catch (e) {}
        }
        throw new Error(msg || 'Edge Function call failed');
      }

      if (data && data.success) {
        Alert.alert('Success', 'Booking confirmed via Cash payment.');
        router.replace(`/bookings/${data.bookingId}` as any);
      } else {
        throw new Error(data?.error || 'The server could not confirm the cash payment.');
      }
    } catch (error: any) {
      console.error('Cash payment error:', error);
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setProcessingCash(false);
    }
  };

  const fetchNewBookingDetails = async () => {
    try {
      setLoading(true);
      const { groundId, date, time, teamType, couponId, discount, amount: passedAmount, endTime: passedEndTime, pricePerHour: passedPricePerHour } = params;
      
      const { data: ground, error: groundError } = await supabase
        .from('grounds')
        .select('*, ground_images(*)')
        .eq('id', groundId)
        .single();
        
      if (groundError) throw groundError;

      const isBox = (ground.pitch_type ?? '').toLowerCase().includes('box');
      
      // Use passed values from form if available, otherwise fall back to 1hr default
      let endTime = passedEndTime as string;
      if (!endTime) {
        const durationHours = 1;
        const startTimeMinutes = parseTimeToMinutes(time as string) || 540;
        const endMinutes = startTimeMinutes + (durationHours * 60);
        endTime = minutesToHHMM(endMinutes);
      }

      const startHHMM = normalizeDbTimeToHHMM(time as string);
      const endHHMM = normalizeDbTimeToHHMM(endTime);
      const totalHours = startHHMM && endHHMM ? hoursBetweenBooked(startHHMM, endHHMM) : null;

      let totalAmount = passedAmount ? parseFloat(passedAmount as string) : 0;
      const pricePerHour = passedPricePerHour ? parseFloat(passedPricePerHour as string) : 0;
      
      const discountVal = parseFloat(discount as string || '0');

      setBooking({
        id: 'pending',
        ground_id: groundId,
        booking_date: date,
        start_time: time,
        end_time: endTime,
        total_hours: totalHours || 1,
        price_per_hour: pricePerHour,
        total_amount: totalAmount - discountVal,
        discount_amount: discountVal,
        team_type: teamType,
        coupon_id: couponId,
        grounds: ground,
        isNew: true,
      });
    } catch (error: any) {
      console.error('Error fetching new booking details:', error);
      Alert.alert('Error', 'Could not load booking details.');
    } finally {
      setLoading(false);
    }
  };

  const minutesToHHMM = (total: number) => {
    const h = Math.floor((total % (24 * 60)) / 60);
    const m = total % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
  };

  const parseTimeToMinutes = (t: string) => {
    const parts = t.split(':');
    if (parts.length < 2) return null;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  const fetchExistingBooking = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select('*, grounds(*, ground_images(*))')
        .eq('id', id)
        .single();

      if (error) throw error;
      setBooking(data);
    } catch (error: any) {
      console.error('Error fetching booking:', error);
      Alert.alert('Error', 'Could not load booking details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCoupons = async () => {
    try {
      setFetchingCoupons(true);
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .or(`expiry_date.is.null,expiry_date.gt.${new Date().toISOString()}`);
      
      if (error) throw error;
      setAvailableCoupons(data || []);
    } catch (e) {
      console.error('Error fetching coupons:', e);
    } finally {
      setFetchingCoupons(false);
    }
  };

  const applyCouponCode = async (codeToApply: string) => {
    if (!codeToApply || !booking) return;
    
    try {
      setApplyingCoupon(true);
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: codeToApply,
        p_user_id: user?.id,
        p_booking_amount: booking.total_amount + (booking.discount_amount || 0)
      });

      if (error) throw error;

      if (data.valid) {
        let discount = 0;
        const baseAmount = booking.total_amount + (booking.discount_amount || 0);

        if (data.discount_type === 'percentage') {
          discount = (baseAmount * data.discount_value) / 100;
          if (data.max_discount) {
            discount = Math.min(discount, data.max_discount);
          }
        } else {
          discount = data.discount_value;
        }

        setBooking((prev: any) => ({
          ...prev,
          coupon_id: data.id,
          discount_amount: discount,
          total_amount: baseAmount - discount
        }));
        setCouponCode(data.code);
        setIsCouponsModalVisible(false);
        Alert.alert('Success', `Coupon '${data.code}' applied! You saved ${formatCurrency(discount)}`);
      } else {
        Alert.alert('Invalid Coupon', data.message);
      }
    } catch (e: any) {
      console.error('Error applying coupon:', e);
      Alert.alert('Error', e.message || 'Could not apply coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handlePayU = async () => {
    if (!booking) return;
    try {
      setProcessing(true);
      const txnid = 'PAYU_' + Date.now();
      const productinfo = `Booking for ${booking.grounds.name}`;
      const firstname = user?.user_metadata?.full_name || 'Guest';
      const email = user?.email || '';

      const { data: { session } } = await supabase.auth.getSession();
      const { data: hashData, error: hashError } = await supabase.functions.invoke('payment-gateway', {
        body: {
          action: 'create-payu-hash',
          txnid,
          amount: booking.total_amount,
          productinfo,
          firstname,
          email,
        },
      });

      if (hashError) throw hashError;

      if (Platform.OS === 'web') {
        const isProduction = true;
        const payuUrl = isProduction 
          ? 'https://secure.payu.in/_payment' 
          : 'https://test.payu.in/_payment';
        
        const merchantKey = process.env.EXPO_PUBLIC_PAYU_MERCHANT_KEY || '';

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = payuUrl;

        const params: any = {
          key: merchantKey,
          txnid: hashData.txnid,
          amount: hashData.amount,
          productinfo: hashData.productinfo,
          firstname: hashData.firstname,
          email: hashData.email,
          phone: user?.user_metadata?.phone || '9999999999',
          surl: `${window.location.origin}/bookings`, 
          furl: `${window.location.origin}/checkout/${id}`,
          hash: hashData.hash,
          service_provider: 'payu_paisa',
          udf1: '', udf2: '', udf3: '', udf4: '', udf5: '',
          udf6: '', udf7: '', udf8: '', udf9: '', udf10: '',
        };

        for (const key in params) {
          if (params.hasOwnProperty(key)) {
            const hiddenField = document.createElement('input');
            hiddenField.type = 'hidden';
            hiddenField.name = key;
            hiddenField.value = params[key];
            form.appendChild(hiddenField);
          }
        }

        document.body.appendChild(form);
        form.submit();
      } else {
        Alert.alert('Mobile Payment', 'PayU native integration coming soon.');
      }
    } catch (error: any) {
      console.error('PayU error:', error);
      Alert.alert('Error', error.message || 'PayU initiation failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRazorpay = async () => {
    if (!booking) return;
    try {
      setProcessing(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      // 1. Create Order
      const { data: order, error: orderError } = await supabase.functions.invoke('payment-gateway', {
        body: {
          action: 'create-razorpay-order',
          amount: booking.total_amount,
          receipt: `rcpt_${Date.now()}`,
        },
      });

      if (orderError) {
        let msg = orderError.message;
        if (orderError.context && typeof orderError.context.json === 'function') {
           try {
             const errBody = await orderError.context.json();
             if (errBody && errBody.error) msg = errBody.error;
           } catch (e) {}
        }
        throw new Error(msg);
      }

      if (order.success === false) {
        throw new Error(order.error || 'Failed to create Razorpay order');
      }

      if (Platform.OS === 'web') {
        // 2. Load Razorpay Script
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
          Alert.alert('Error', 'Razorpay SDK failed to load. Are you online?');
          return;
        }

        // 3. Open Checkout
        const options = {
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          name: 'Book Your Ground',
          description: `Booking for ${booking.grounds.name}`,
          order_id: order.id,
          handler: async function (response: any) {
            // 4. Verify Payment
            try {
              setProcessing(true);
              const { data: verifyData, error: verifyError } = await supabase.functions.invoke('payment-gateway', {
                body: {
                  action: 'verify-razorpay-payment',
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  bookingId: booking.isNew ? null : booking.id,
                  bookingDetails: booking.isNew ? {
                    ground_id: booking.ground_id,
                    booking_date: booking.booking_date,
                    start_time: booking.start_time,
                    end_time: booking.end_time,
                    team_type: booking.team_type,
                    coupon_id: booking.coupon_id,
                    total_hours: booking.total_hours,
                    price_per_hour: booking.price_per_hour,
                    total_amount: booking.total_amount + (booking.discount_amount || 0),
                    discount_amount: booking.discount_amount || 0,
                  } : null,
                },
              });

              if (verifyError) throw verifyError;
              
              if (verifyData && verifyData.success) {
                Alert.alert('Success', 'Payment successful! Your booking is confirmed.');
                router.replace(`/bookings/${verifyData.bookingId}` as any);
              } else {
                throw new Error(verifyData?.error || 'Payment verification failed.');
              }
            } catch (err: any) {
              Alert.alert('Payment Error', err.message);
              setProcessing(false);
            }
          },
          prefill: {
            name: user?.user_metadata?.full_name || '',
            email: user?.email || '',
            contact: user?.user_metadata?.phone || '',
          },
          theme: {
            color: '#10b981',
          },
          modal: {
            ondismiss: function() {
              setProcessing(false);
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        Alert.alert('Mobile Payment', 'Razorpay native integration coming soon.');
        setProcessing(false);
      }
    } catch (error: any) {
      console.error('Razorpay error:', error);
      Alert.alert('Error', error.message || 'Razorpay initiation failed.');
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (selectedGateway === 'razorpay') {
      return handleRazorpay();
    }
    if (selectedGateway === 'payu') {
      return handlePayU();
    }
    if (selectedGateway === 'cash') {
      return handleCashPayment();
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centered}>
        <RNText>Booking not found.</RNText>
        <Button title="Go Back" onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)');
        }} />
      </View>
    );
  }

  const isGroundOwnerOrAdmin = profile?.role === 'super_admin' || 
    (profile?.role === 'ground_owner' && (booking?.grounds?.owner_id === user?.id || booking?.ground_id === user?.id));

  const dynamicStyles = {
    content: {
      padding: Platform.OS === 'web' ? (width > 768 ? 24 : 16) : 12,
    },
    layout: {
      gap: isDesktop ? (width > 1024 ? 32 : 16) : 0,
    },
    productImg: {
      height: Platform.OS === 'web' && width > 768 ? 220 : 160,
    },
    productPlaceholder: {
      height: Platform.OS === 'web' && width > 768 ? 140 : 120,
    }
  };

  const isSmallScreen = width < 768;
  const themeBg = '#F8FAFC';
  const themeTextColor = '#111827';
  const themeBackBtnBg = '#FFFFFF';
  const themeBackBtnBorder = '#E2E8F0';
  const themeBackIconColor = '#475569';

  const content = (
    <ScrollView 
      style={[styles.container, { backgroundColor: themeBg }]} 
      contentContainerStyle={[styles.content, dynamicStyles.content]}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)');
          }} 
          style={[styles.backButton, { backgroundColor: themeBackBtnBg, borderColor: themeBackBtnBorder }]}
        >
          <ChevronLeft size={20} color={themeBackIconColor} />
        </TouchableOpacity>
        <RNText style={[styles.title, { color: themeTextColor }]}>Checkout</RNText>
      </View>

      <View style={[styles.layout, !isDesktop && styles.layoutMobile, dynamicStyles.layout]}>
        {/* Left Column: Items (Booking Details) */}
        <View style={styles.mainColumn}>
          <Card style={styles.itemProductCard}>
            {booking.grounds.ground_images?.[0]?.image_url ? (
              <Image 
                source={{ uri: booking.grounds.ground_images[0].image_url }} 
                style={[styles.productImg, dynamicStyles.productImg]}
              />
            ) : (
              <View style={[styles.productPlaceholder, dynamicStyles.productPlaceholder]}>
                 <Calendar size={48} color="#01b854" />
              </View>
            )}
            
            <View style={styles.productInfo}>
              <View style={styles.productHeaderRow}>
                <View>
                  <RNText style={styles.itemTitle}>{booking.grounds.name}</RNText>
                  <View style={styles.itemMetaRow}>
                    <MapPin size={14} color="#6B7280" />
                    <RNText style={styles.itemMetaText}>{booking.grounds.city}, {booking.grounds.state}</RNText>
                  </View>
                </View>
                <RNText style={styles.productPrice}>{formatCurrency(booking.total_amount + (booking.discount_amount || 0))}</RNText>
              </View>

              <View style={styles.itemDetailsFooter}>
                 <View style={styles.footerDetail}>
                    <Calendar size={16} color="#01b854" />
                    <View>
                       <RNText style={styles.detailTinyLabel}>MATCH DATE</RNText>
                       <RNText style={styles.footerDetailText}>{formatDateDDMMYYYY(booking.booking_date)}</RNText>
                    </View>
                 </View>
                 <View style={styles.footerDetail}>
                    <Clock size={16} color="#01b854" />
                    <View>
                       <RNText style={styles.detailTinyLabel}>SLOT TIME</RNText>
                       <RNText style={styles.footerDetailText}>{booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}</RNText>
                    </View>
                 </View>
              </View>

              <View style={styles.productActionsRow}>
                <TouchableOpacity style={styles.actionBtn}>
                  <RNText style={styles.actionBtnText}>Remove from Checkout</RNText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <RNText style={styles.actionBtnText}>Save Match details</RNText>
                </TouchableOpacity>
              </View>
            </View>
          </Card>

          <View style={[styles.securityInfo, { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5', borderWidth: 1 }]}>
            <ShieldCheck size={16} color="#01b854" />
            <RNText style={[styles.securityText, { color: '#065F46' }]}>
               Purchase protected by Book Your Ground Security
            </RNText>
          </View>
        </View>

        {/* Right Column: Order Summary */}
        <View style={styles.sideColumn}>
          <Card style={styles.summaryCard}>
            <RNText style={styles.summaryTitle}>Order Summary</RNText>
            
            <View style={styles.couponSection}>
               <RNTextInput 
                 style={styles.couponInput}
                 placeholder="Enter Coupon Code"
                 placeholderTextColor="#9CA3AF"
                 value={couponCode}
                 onChangeText={setCouponCode}
                 autoCapitalize="characters"
               />
               <TouchableOpacity 
                 style={styles.applyBtn}
                 onPress={() => applyCouponCode(couponCode)}
                 disabled={applyingCoupon}
               >
                  <RNText style={styles.applyBtnText}>{applyingCoupon ? '...' : 'Apply'}</RNText>
               </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.offersBtn}
              onPress={() => {
                setIsCouponsModalVisible(true);
                fetchAvailableCoupons();
              }}
            >
               <View style={styles.offersLeft}>
                  <ShieldCheck size={16} color="#01b854" />
                  <RNText style={styles.offersText}>View Available Offer</RNText>
               </View>
               <ChevronLeft size={16} color="#9CA3AF" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>

            <View style={styles.breakdown}>
              <View style={styles.breakdownRow}>
                <RNText style={styles.breakdownLabel}>Items (1)</RNText>
                <RNText style={styles.breakdownValue}>{formatCurrency(booking.total_amount + (booking.discount_amount || 0))}</RNText>
              </View>
              {booking.discount_amount > 0 && (
                <View style={styles.breakdownRow}>
                  <RNText style={styles.breakdownLabel}>Your savings</RNText>
                  <RNText style={styles.breakdownDiscountValue}>-{formatCurrency(booking.discount_amount)}</RNText>
                </View>
              )}
              <View style={styles.breakdownRow}>
                <RNText style={styles.breakdownLabel}>Estimated sales tax</RNText>
                <RNText style={styles.breakdownValue}>-</RNText>
              </View>
            </View>

            <View style={styles.subtotalRow}>
              <RNText style={styles.subtotalLabel}>Sub Total :</RNText>
              <RNText style={styles.subtotalValue}>{formatCurrency(booking.total_amount)}</RNText>
            </View>

            <View style={styles.paymentMethodSection}>
               <RNText style={styles.paymentMethodTitle}>Payment Method</RNText>
               <View style={styles.methodSelector}>
                {activeGateways.filter(g => {
                  if (g.name === 'cash') return isGroundOwnerOrAdmin;
                  return true;
                }).map(g => (
                  <TouchableOpacity 
                    key={g.name}
                    onPress={() => setSelectedGateway(g.name)}
                    style={[
                      styles.methodOption,
                      selectedGateway === g.name && styles.methodOptionActive
                    ]}
                  >
                    <View style={[styles.methodCircle, selectedGateway === g.name && styles.methodCircleActive]}>
                      {g.name === 'cash' ? (
                        <Wallet size={14} color={selectedGateway === g.name ? '#FFF' : '#9CA3AF'} />
                      ) : (
                        <CreditCard size={14} color={selectedGateway === g.name ? '#06392e' : '#9CA3AF'} />
                      )}
                    </View>
                    <RNText style={[styles.methodLabel, selectedGateway === g.name && styles.methodLabelActive]}>
                      {g.label}
                    </RNText>
                  </TouchableOpacity>
                ))}
               </View>
            </View>

            {selectedGateway === 'razorpay' || selectedGateway === 'payu' ? (
              <Button
                title={processing ? 'Processing...' : `Check Out`}
                onPress={handlePayment}
                disabled={processing}
                loading={processing}
                fullWidth
                style={styles.payButton}
              />
            ) : selectedGateway === 'cash' ? (
              <View style={{ gap: 12, marginBottom: 12 }}>
                <View style={styles.cashAmountSection}>
                  <RNText style={styles.cashAmountLabel}>Enter Received Amount (Cash)</RNText>
                  <RNTextInput
                    style={styles.cashAmountInput}
                    placeholder="Enter amount..."
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={customCashAmount}
                    onChangeText={setCustomCashAmount}
                  />
                </View>
                <Button
                  title={processingCash ? 'Confirming...' : 'Confirm Order'}
                  onPress={handleCashPayment}
                  disabled={processingCash || !customCashAmount || isNaN(parseFloat(customCashAmount)) || parseFloat(customCashAmount) <= 0}
                  loading={processingCash}
                  fullWidth
                  style={styles.payButton}
                />
              </View>
            ) : (
              <Button
                title="Select Payment Method"
                onPress={() => {}}
                disabled={true}
                fullWidth
                style={styles.payButton}
              />
            )}

            <View style={styles.trustFooter}>
               <View style={styles.trustBanner}>
                  <ShieldCheck size={14} color="#06392e" />
                  <RNText style={styles.trustFooterText}>Purchase protected by Book Your Ground Guarantee</RNText>
               </View>
            </View>

          </Card>
        </View>
      </View>

      <Modal
        visible={isCouponsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsCouponsModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setIsCouponsModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <RNText style={styles.modalTitle}>Available Offers</RNText>
              <TouchableOpacity onPress={() => setIsCouponsModalVisible(false)}>
                <RNText style={styles.closeBtnText}>Close</RNText>
              </TouchableOpacity>
            </View>

            {fetchingCoupons ? (
              <ActivityIndicator size="large" color="#01b854" style={{ padding: 40 }} />
            ) : availableCoupons.length === 0 ? (
              <View style={styles.emptyCoupons}>
                <RNText style={styles.emptyText}>No offers available right now.</RNText>
              </View>
            ) : (
              <FlatList
                data={availableCoupons}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.couponsList}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.couponItem}
                    onPress={() => applyCouponCode(item.code)}
                  >
                    <View style={styles.couponLeft}>
                      <RNText style={styles.couponCodeText}>{item.code}</RNText>
                      <RNText style={styles.couponDescText}>
                        {item.discount_type === 'percentage' 
                          ? `${item.discount_value}% OFF` 
                          : `${formatCurrency(item.discount_value)} FLAT OFF`}
                        {item.max_discount && ` up to ${formatCurrency(item.max_discount)}`}
                      </RNText>
                      {item.min_booking_amount > 0 && (
                        <RNText style={styles.couponMinText}>
                          Min booking: {formatCurrency(item.min_booking_amount)}
                        </RNText>
                      )}
                    </View>
                    <TouchableOpacity 
                      style={styles.applySmallBtn}
                      onPress={() => applyCouponCode(item.code)}
                    >
                      <RNText style={styles.applySmallText}>APPLY</RNText>
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return <WebLayout noCard>{content}</WebLayout>;
  }

  return (content);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: Platform.OS === 'web' ? 64 : 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: Platform.OS === 'web' ? 0 : 40,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
  },
  layout: {
    flexDirection: 'row',
  },
  layoutMobile: {
    flexDirection: 'column',
  },
  mainColumn: {
    flex: 1.8,
  },
  sideColumn: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 300 : '100%',
  },
  itemCard: {
    padding: 24,
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 0,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 20,
  },
  itemProductCard: {
    padding: 0,
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: '#FFF',
    borderWidth: 0,
    overflow: 'hidden',
  },
  productImg: {
    width: '100%',
    resizeMode: 'cover',
  },
  productPlaceholder: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    padding: 16,
  },
  productHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#06392e',
  },
  detailTinyLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
    marginBottom: 0,
  },
  productActionsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  itemMetaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  itemTags: {
    flexDirection: 'row',
    gap: 8,
  },
  itemTag: {
    fontSize: 11,
    color: '#01b854',
    fontWeight: '600',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  itemPriceCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  itemPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  itemPolicyRow: {
    gap: 4,
    marginTop: 8,
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  policyText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  itemDetailsFooter: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerDetailText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  securityText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  summaryCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#FFF',
    borderWidth: 0,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  couponSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  couponInput: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    fontSize: 12,
    color: '#111827',
    backgroundColor: '#FFF',
  },
  applyBtn: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#013a30',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  applyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#013a30',
  },
  offersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  offersLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offersText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  breakdown: {
    gap: 8,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '800',
  },
  breakdownDiscountLabel: {
    fontSize: 12,
    color: '#01b854',
    fontWeight: '600',
  },
  breakdownDiscountValue: {
    fontSize: 12,
    color: '#01b854',
    fontWeight: '800',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  subtotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  paymentMethodSection: {
    marginBottom: 12,
  },
  paymentMethodTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  methodSelector: {
    gap: 6,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  methodOptionActive: {
    borderColor: '#01b854',
    backgroundColor: '#ECFDF5',
  },
  methodCircle: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodCircleActive: {
    backgroundColor: '#01b854',
  },
  methodLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  methodLabelActive: {
    color: '#065F46',
  },
  payButton: {
    height: 44,
    borderRadius: 22,
    backgroundColor: '#01b854',
  },
  trustFooter: {
    marginTop: 16,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  trustFooterText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    minHeight: '40%',
    maxHeight: '80%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#01b854',
    fontWeight: '700',
  },
  couponsList: {
    gap: 16,
    paddingBottom: 20,
  },
  couponItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    borderStyle: 'dashed',
  },
  couponLeft: {
    flex: 1,
  },
  couponCodeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#06392e',
    marginBottom: 4,
  },
  couponDescText: {
    fontSize: 13,
    color: '#34d399',
    fontWeight: '700',
  },
  couponMinText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  applySmallBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#01b854',
  },
  applySmallText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
  emptyCoupons: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  cashAmountSection: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 8,
  },
  cashAmountLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  cashAmountInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 18,
    fontWeight: '800',
    color: '#14532D',
    fontFamily: 'Inter',
  },
});
