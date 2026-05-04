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
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Image as RNImage } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { formatCurrency, formatDateDDMMYYYY } from '@/utils/helpers';
import { CreditCard, ShieldCheck, Clock, Calendar, MapPin, ChevronLeft, Wallet, Users, X, Ticket, ShoppingBag, IndianRupee, Star, Zap, Smartphone, Globe } from 'lucide-react-native';
import { hoursBetweenBooked, normalizeDbTimeToHHMM } from '@/utils/bookingSlots';
import { useUI } from '@/contexts/UIContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CheckoutSkeleton from '@/components/landing/CheckoutSkeleton';

// Platform settings fetched from database

export default function CheckoutScreen() {
  const params = useLocalSearchParams();
  const { id } = params;
  const { user, profile } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width > 768;
  
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
  const [bookedForName, setBookedForName] = useState<string>('');
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [selectedSubMethod, setSelectedSubMethod] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Stable random counts for social proof (1-5) based on booking ID
  const { randomBookedCount, randomSlotsLeft } = React.useMemo(() => {
    if (!id) return { randomBookedCount: 3, randomSlotsLeft: 2 };
    
    const seed = String(id);
    let hash1 = 0;
    let hash2 = 0;
    
    for (let i = 0; i < seed.length; i++) {
      hash1 = seed.charCodeAt(i) + ((hash1 << 5) - hash1);
      // Use a slightly different hash for the second number
      hash2 = seed.charCodeAt(i) + ((hash2 << 7) - hash2);
    }
    
    return {
      randomBookedCount: (Math.abs(hash1) % 5) + 1,
      randomSlotsLeft: (Math.abs(hash2) % 5) + 1
    };
  }, [id]);
  
  const isGroundOwnerOrAdmin = profile?.role === 'super_admin' || 
    (profile?.role === 'ground_owner' && (booking?.grounds?.owner_id === user?.id || booking?.ground_id === user?.id));
  
  // Pricing Calculations
  const { baseGroundPrice, platformFeeIncGst, totalPayable, totalReceivable } = React.useMemo(() => {
    const bgp = ((selectedGateway === 'cash' || (selectedGateway === 'wallet' && isGroundOwnerOrAdmin)) && customCashAmount && !isNaN(parseFloat(customCashAmount)))
      ? parseFloat(customCashAmount)
      : (booking?.total_amount || 0);
    
    // Fallback to defaults if settings not yet loaded
    const rate = platformSettings?.user_platform_fee_rate ?? 0.05;
    const gstRate = platformSettings?.gst_rate ?? 0.18;
    const fixedFee = platformSettings?.cricket_owner_fee_fixed ?? 100;
    
    const isCricket = (booking?.grounds?.pitch_type ?? '').toLowerCase() === 'cricket ground';
    const isCash = selectedGateway === 'cash';
    
    // 1. Calculate User's Platform Fee (Always percentage for online bookings)
    const userPfRate = platformSettings?.user_platform_fee_rate ?? 0.05;
    const userPf = bgp * userPfRate;
    const userGst = userPf * gstRate;
    const userTotalPfGst = userPf + userGst;

    // 2. Calculate Owner's Platform Fee (Fixed for Cricket/Cash/Owner, Percentage otherwise)
    let ownerPf = 0;
    if (isCricket || isCash || isGroundOwnerOrAdmin) {
      const teamCount = booking?.team_type === 'one' ? 1 : 2;
      ownerPf = fixedFee * teamCount;
    } else {
      ownerPf = bgp * rate;
    }
    const ownerGst = ownerPf * gstRate;
    const ownerTotalPfGst = ownerPf + ownerGst;

    const tp = Math.round(bgp + (isCash ? 0 : userTotalPfGst)); 
    const tr = Math.round(bgp - ownerTotalPfGst); 
    
    return {
      baseGroundPrice: bgp,
      platformFeeIncGst: (isCash || isGroundOwnerOrAdmin) ? ownerTotalPfGst : userTotalPfGst,
      totalPayable: tp,
      totalReceivable: tr
    };
  }, [selectedGateway, customCashAmount, booking?.total_amount, booking?.team_type, booking?.grounds?.pitch_type, platformSettings, isGroundOwnerOrAdmin]);

  const [showRazorpayWebView, setShowRazorpayWebView] = useState(false);
  const [razorpayOrderData, setRazorpayOrderData] = useState<any>(null);

  const { setTabBarVisible } = useUI();

  useEffect(() => {
    fetchActiveGateways();
    fetchPlatformSettings();
    // Hide bottom tab bar on checkout for better focus
    setTabBarVisible(false);
    return () => {
      setTabBarVisible(true);
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchWalletBalance();
      setContactEmail(user.email || '');
      setContactPhone(profile?.phone || user.user_metadata?.phone || '');
    }
  }, [user, profile]);

  useEffect(() => {
    if (!profile || activeGateways.length === 0) return;
    
    const isOwner = profile?.role === 'super_admin' || profile?.role === 'ground_owner';
    const cash = activeGateways.find(g => g.name === 'cash');
    const razorpay = activeGateways.find(g => g.name === 'razorpay');

    if (isOwner && cash) {
      setSelectedGateway('cash');
    } else if (razorpay) {
      setSelectedGateway('razorpay');
      setSelectedSubMethod('upi');
    } else if (activeGateways.length > 0 && !selectedGateway) {
      setSelectedGateway(activeGateways[0].name);
    }
  }, [profile, activeGateways]);

  const fetchActiveGateways = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      setActiveGateways(data || []);
    } catch (e) {
      console.error('Error fetching gateways:', e);
    }
  };

  const fetchPlatformSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value');
      
      if (error) throw error;
      
      const settings: any = {};
      data?.forEach(s => {
        settings[s.key] = s.value;
      });
      setPlatformSettings(settings);
    } catch (e) {
      console.error('Error fetching platform settings:', e);
    }
  };

  const fetchWalletBalance = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      if (data) setWalletBalance(data.balance);
    } catch (e) {
      console.error('Error fetching wallet balance:', e);
    }
  };

  useEffect(() => {
    if (id === 'new') {
      fetchNewBookingDetails();
    } else {
      fetchExistingBooking();
    }
  }, [id]);



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
            price_per_hour: Number(booking.price_per_hour),
            total_amount: Number(parseFloat(customCashAmount) || (booking.total_amount + (booking.discount_amount || 0))),
            discount_amount: Number(booking.discount_amount || 0),
            total_hours: Number(booking.total_hours || 1),
            ground_id: booking.ground_id,
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            end_time: booking.end_time,
            team_type: booking.team_type,
            coupon_id: booking.coupon_id,
            booked_for_name: bookedForName,
            payment_method: 'cash',
          } : {
            total_amount: parseFloat(customCashAmount) || booking.total_amount,
            booked_for_name: bookedForName,
            payment_method: 'cash',
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
        // Direct update fallback to ensure name is saved even if edge function is stale
        if (bookedForName) {
           await supabase
            .from('bookings')
            .update({ booked_for_name: bookedForName })
            .eq('id', data.bookingId);
        }

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
        .or(`expiry_date.is.null,expiry_date.gt.${new Date().toISOString()}`)
        .or(`ground_id.is.null,ground_id.eq.${booking.ground_id}`);
      
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

    if (booking.coupon_id) {
      Alert.alert('Coupon already applied', 'Please remove the current coupon before applying a new one.');
      return;
    }

    try {
      setApplyingCoupon(true);
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: codeToApply,
        p_user_id: user?.id,
        p_booking_amount: booking.total_amount + (booking.discount_amount || 0),
        p_ground_id: booking.ground_id
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

  const removeCoupon = () => {
    if (!booking || !booking.coupon_id) return;
    
    const baseAmount = booking.total_amount + (booking.discount_amount || 0);
    setBooking((prev: any) => ({
      ...prev,
      coupon_id: null,
      discount_amount: 0,
      total_amount: baseAmount
    }));
    setCouponCode('');
    Alert.alert('Coupon Removed', 'The coupon has been removed from your booking.');
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
      
      // Use the pre-calculated totalPayable
      const finalAmount = totalPayable;

      // 1. Create Order
      const { data: order, error: orderError } = await supabase.functions.invoke('payment-gateway', {
        body: {
          action: 'create-razorpay-order',
          amount: finalAmount,
          receipt: `rcpt_${Date.now()}`,
          groundId: booking.ground_id,
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
          } : {
            total_amount: booking.total_amount
          },
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

      if (Platform.OS !== 'web') {
        setRazorpayOrderData(order);
        setShowRazorpayWebView(true);
        return;
      }

      // Web Logic
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
            name: user?.user_metadata?.full_name || profile?.full_name || '',
            email: contactEmail || user?.email || '',
            contact: contactPhone || profile?.phone || user?.user_metadata?.phone || '',
            method: selectedSubMethod || undefined,
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
      } catch (error: any) {
      console.error('Razorpay error:', error);
      Alert.alert('Error', error.message || 'Razorpay initiation failed.');
      setProcessing(false);
    }
  };

  const handleRazorpayMobileMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.status === 'success') {
        setShowRazorpayWebView(false);
        setProcessing(true);
        
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke('payment-gateway', {
          body: {
            action: 'verify-razorpay-payment',
            razorpay_order_id: data.response.razorpay_order_id,
            razorpay_payment_id: data.response.razorpay_payment_id,
            razorpay_signature: data.response.razorpay_signature,
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
            } : {
              total_amount: booking.total_amount
            },
          },
        });

        if (verifyError) throw verifyError;
        
        if (verifyData && verifyData.success) {
          Alert.alert('Success', 'Payment successful! Your booking is confirmed.');
          router.replace(`/bookings/${verifyData.bookingId}` as any);
        } else {
          throw new Error(verifyData?.error || 'Payment verification failed.');
        }
      } else if (data.status === 'dismissed' || data.status === 'failed') {
        setShowRazorpayWebView(false);
        setProcessing(false);
        if (data.status === 'failed') {
          Alert.alert('Payment Failed', data.response?.error?.description || 'Payment was unsuccessful.');
        }
      }
    } catch (err: any) {
      setShowRazorpayWebView(false);
      setProcessing(false);
      Alert.alert('Payment Error', err.message);
    }
  };

  const razorpayMobileHtml = razorpayOrderData ? `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body { background-color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: -apple-system, system-ui; }
          .loader { border: 4px solid #f3f3f3; border-top: 4px solid #10b981; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
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
            "name": "Book Your Ground",
            "description": "Booking for ${booking?.grounds?.name || 'your selected ground'}",
            "order_id": "${razorpayOrderData.id}",
            "prefill": {
              "name": "${user?.user_metadata?.full_name || profile?.full_name || ''}",
              "email": "${contactEmail || user?.email || ''}",
              "contact": "${contactPhone || profile?.phone || user?.user_metadata?.phone || ''}",
              "method": "${selectedSubMethod || ''}"
            },
            "theme": { "color": "#10b981" },
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

  const handleWalletPayment = async () => {
    if (!booking) return;
    if (walletBalance < totalPayable) {
      Alert.alert('Insufficient Balance', 'Your wallet balance is less than the total amount.');
      return;
    }

    try {
      setProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('payment-gateway', {
        body: {
          action: 'confirm-wallet',
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
            total_amount: totalPayable,
            discount_amount: booking.discount_amount || 0,
            booked_for_name: bookedForName,
            payment_method: 'wallet',
          } : {
            total_amount: totalPayable,
            booked_for_name: bookedForName,
            payment_method: 'wallet'
          },
        },
      });

      if (error) throw error;

      if (data && data.success) {
        Alert.alert('Success', 'Payment successful using Wallet balance!');
        router.replace(`/bookings/${data.bookingId}` as any);
      } else {
        throw new Error(data?.error || 'Wallet payment failed.');
      }
    } catch (error: any) {
      console.error('Wallet payment error:', error);
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (selectedGateway === 'wallet') {
      return handleWalletPayment();
    }
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
    if (Platform.OS !== 'web') {
      return <CheckoutSkeleton />;
    }
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

  // (Moved up to support pricing logic)
  
  // isCompactCheckout: native mobile OR small web (<768px) → no hero image, single-column clean layout
  // isLargeWebScreen: web only at ≥768px → dual column with hero image
  const isCompactCheckout = Platform.OS !== 'web' || width < 768;
  const isLargeWebScreen = Platform.OS === 'web' && width >= 768;

  const dynamicStyles = {
    content: {
      padding: isCompactCheckout ? 0 : 16,
    },
    layout: {
      gap: isLargeWebScreen ? (width > 1024 ? 24 : 16) : 0,
      flexDirection: isLargeWebScreen ? 'row' : 'column',
    },
    securityInfo: {
      marginTop: 12,
      padding: 16,
    },
    summaryCard: {
      padding: isLargeWebScreen ? 24 : 16,
    },
    productImg: {
      height: '100%',
    },
    groundImgContainer: {
      height: width > 1200 ? 500 : 400,
      width: '100%',
    },
    productInfo: {
      flex: 1,
    },
    mainColumn: {
      // Only shown on large web (dual-column) — hidden on mobile and small web
      flex: isLargeWebScreen ? (width < 1000 ? 1.5 : 1.8) : 0,
      display: isLargeWebScreen ? 'flex' : 'none',
    },
    sideColumn: {
      flex: isLargeWebScreen ? 1 : 0,
      width: '100%',
      padding: isCompactCheckout ? 0 : (width < 900 ? 12 : 24),
    },
    bookingDetailsCard: {
      padding: 16,
    },
    heroTitle: {
      fontSize: width < 900 ? 24 : 32,
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
      {/* ── Compact layout: native mobile + small web (<768px) ── */}
      {isCompactCheckout && (
        <>
          {/* Mini header: back + centered title */}
          <View style={[
            styles.checkoutMiniHeader,
            Platform.OS !== 'web' && { paddingTop: insets.top + 12, height: insets.top + 56 }
          ]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.checkoutMiniBackBtn}>
              <ChevronLeft size={20} color="#0F172A" />
            </TouchableOpacity>
            <RNText style={styles.checkoutMiniTitle}>Checkout</RNText>
            {/* Invisible spacer to balance the back button and keep title centered */}
            <View style={{ width: 36, height: 36 }} />
          </View>

          {/* Ground info banner: name + location + price */}
          <View style={styles.compactGroundBanner}>
            <View style={{ flex: 1 }}>
              <RNText style={styles.compactGroundName} numberOfLines={1}>
                {(booking.grounds || booking.ground)?.name}
              </RNText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <MapPin size={12} color="#059669" />
                <RNText style={styles.compactGroundLocation}>
                  {(booking.grounds || booking.ground)?.city}, {(booking.grounds || booking.ground)?.state}
                </RNText>
              </View>
            </View>
            <View style={styles.compactPriceBadge}>
              <RNText style={styles.compactPriceText}>{formatCurrency(baseGroundPrice)}</RNText>
              <RNText style={styles.compactPriceUnit}>/slot</RNText>
            </View>
          </View>

          {/* Inline booking details: date / time / teams */}
          <View style={styles.compactDetailsRow}>
            <View style={styles.compactDetailItem}>
              <Calendar size={16} color="#059669" />
              <View style={{ marginLeft: 8 }}>
                <RNText style={styles.compactDetailLabel}>Date</RNText>
                <RNText style={styles.compactDetailValue}>{formatDateDDMMYYYY(booking.booking_date)}</RNText>
              </View>
            </View>
            <View style={styles.compactDetailDivider} />
            <View style={styles.compactDetailItem}>
              <Clock size={16} color="#059669" />
              <View style={{ marginLeft: 8 }}>
                <RNText style={styles.compactDetailLabel}>Time</RNText>
                <RNText style={styles.compactDetailValue}>
                  {booking.start_time.substring(0, 5)} – {booking.end_time.substring(0, 5)}
                </RNText>
              </View>
            </View>
            <View style={styles.compactDetailDivider} />
            <View style={styles.compactDetailItem}>
              <Users size={16} color="#059669" />
              <View style={{ marginLeft: 8 }}>
                <RNText style={styles.compactDetailLabel}>Teams</RNText>
                <RNText style={styles.compactDetailValue}>
                  {booking.team_type === 'one' ? '1 Team' : 'Both'}
                </RNText>
              </View>
            </View>
          </View>
        </>
      )}

      <View style={[styles.layout, !isDesktop && Platform.OS !== 'web' && styles.layoutMobile, dynamicStyles.layout as any]}>
        {/* Left Column: Items (Booking Details) — Hidden on small web */}
        <View style={[styles.mainColumn, dynamicStyles.mainColumn as any]}>
          <Card style={[styles.itemProductCard, !isDesktop && { borderRadius: 0 }]}>
            <View style={[styles.groundImgContainer, dynamicStyles.groundImgContainer]}>
              {(booking.grounds || booking.ground)?.ground_images?.[0]?.image_url ? (
                  <View style={styles.heroImageWrapper}>
                    <RNImage 
                      source={{ uri: (booking.grounds || booking.ground).ground_images[0].image_url }} 
                      style={[styles.productImg, dynamicStyles.productImg]}
                    />
                    
                    {/* Hero Overlays */}
                    <LinearGradient
                      colors={['transparent', 'rgba(15, 23, 42, 0.9)']}
                      style={styles.heroOverlayGradient}
                    >
                      <RNText style={[styles.heroTitle, dynamicStyles.heroTitle]}>{(booking.grounds || booking.ground)?.name}</RNText>
                      <View style={styles.heroLocationRow}>
                        <MapPin size={16} color="rgba(255, 255, 255, 0.8)" />
                        <RNText style={styles.heroLocationText}>
                          {(booking.grounds || booking.ground)?.city}, {(booking.grounds || booking.ground)?.state}
                        </RNText>
                      </View>
                      
                      <View style={styles.heroBadgesRow}>
                        <View style={styles.ratingBadge}>
                          <Star size={14} color="#FFFFFF" fill="#FFFFFF" />
                          <RNText style={styles.ratingText}>4.5 (128)</RNText>
                        </View>
                        <View style={styles.priceBadgeOverlay}>
                          <RNText style={styles.priceBadgeText}>
                            {formatCurrency(baseGroundPrice)} <RNText style={styles.priceUnitText}>/ slot</RNText>
                          </RNText>
                        </View>
                      </View>
                    </LinearGradient>

                    <View style={styles.topRightBadge}>
                      <Users size={14} color="#FFFFFF" />
                      <RNText style={styles.topRightBadgeText}>Booked {randomBookedCount} times today</RNText>
                    </View>

                    {Platform.OS !== 'web' && (
                      <View style={styles.middleLeftBadge}>
                        <Zap size={14} color="#FFFFFF" fill="#FFFFFF" />
                        <RNText style={styles.middleLeftBadgeText}>Only {randomSlotsLeft} slots left</RNText>
                      </View>
                    )}

                    <TouchableOpacity onPress={() => router.back()} style={styles.imageBackBtn}>
                      <View style={styles.backBtnInner}>
                        <ChevronLeft size={24} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                  </View>
              ) : (
                <View style={[styles.productPlaceholder, dynamicStyles.productPlaceholder]}>
                   <Calendar size={48} color="#01b854" />
                </View>
              )}
            </View>
          </Card>

          {/* Booking Details Grid */}
          <View style={[styles.bookingDetailsCard, dynamicStyles.bookingDetailsCard]}>
            <View style={styles.bookingDetailsRow}>
              {/* Match Date */}
              <View style={styles.bookingDetailItem}>
                <View style={styles.detailIconBox}>
                  <Calendar size={20} color="#059669" />
                </View>
                <View style={styles.detailInfoContent}>
                  <RNText style={styles.detailLabel}>Match Date</RNText>
                  <RNText style={styles.detailValue}>{formatDateDDMMYYYY(booking.booking_date)}</RNText>
                  <RNText style={styles.detailSub}>
                    {new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'long' })}
                  </RNText>
                </View>
              </View>

              <View style={styles.detailDivider} />

              {/* Slot Time */}
              <View style={styles.bookingDetailItem}>
                <View style={styles.detailIconBox}>
                  <Clock size={20} color="#059669" />
                </View>
                <View style={styles.detailInfoContent}>
                  <RNText style={styles.detailLabel}>Slot Time</RNText>
                  <RNText style={styles.detailValue}>
                    {booking.start_time.substring(0, 5)} – {booking.end_time.substring(0, 5)}
                  </RNText>
                  <RNText style={styles.detailSub}>
                    {hoursBetweenBooked(booking.start_time, booking.end_time)} Hours
                  </RNText>
                </View>
              </View>

              <View style={styles.detailDivider} />

              {/* Booking For */}
              <View style={styles.bookingDetailItem}>
                <View style={styles.detailIconBox}>
                  <Users size={20} color="#059669" />
                </View>
                <View style={styles.detailInfoContent}>
                  <RNText style={styles.detailLabel}>Booking For</RNText>
                  <RNText style={styles.detailValue}>
                    {booking.team_type === 'one' ? '1 Team' : 'Both Teams'}
                  </RNText>
                  <RNText style={styles.detailSub}>(Max 12 Players)</RNText>
                </View>
              </View>
            </View>
          </View>

          {/* Trust Section */}
          <View style={styles.secureCardNew}>
            <View style={styles.secureIconBox}>
              <ShieldCheck size={28} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <RNText style={styles.secureTitleNew}>Safe & Secure Booking</RNText>
              <RNText style={styles.secureSubNew}>Your booking is protected. Get instant confirmation.</RNText>
            </View>
          </View>
        </View>
        {/* Right Column: Order Summary */}
        <View style={[styles.sideColumn, !isDesktop && Platform.OS !== 'web' && styles.sideColumnMobile, dynamicStyles.sideColumn as any]}>
          <Card style={[styles.summaryCard, dynamicStyles.summaryCard]}>
            {/* Order Summary Header — hidden on compact (we already show ground info above) */}
            {!isCompactCheckout && (
              <View style={[styles.summaryHeaderRow, { marginBottom: 16 }]}>
                {isDesktop && (
                  <TouchableOpacity onPress={() => router.back()} style={styles.summaryBackBtn}>
                    <ChevronLeft size={20} color="#0F172A" />
                  </TouchableOpacity>
                )}
                <View style={{ flex: 1, marginLeft: isDesktop ? 16 : 0 }}>
                  <RNText style={styles.summaryTitleNew}>Order Summary</RNText>
                  <RNText style={styles.summarySubtitle}>Review your booking and confirm</RNText>
                </View>
                <View style={styles.secureBadge}>
                  <ShieldCheck size={20} color="#059669" />
                </View>
              </View>
            )}
            {isCompactCheckout && (
              <RNText style={[styles.sectionTitleNew, { marginBottom: 12, marginTop: 4 }]}>Order Summary</RNText>
            )}
            
            {/* Coupon Section */}
            <View style={[styles.couponContainer, isCompactCheckout && { marginBottom: 12, padding: 4 }]}>
              <View style={[styles.couponIconBox, isCompactCheckout && { width: 30, height: 30 }]}>
                <Ticket size={isCompactCheckout ? 16 : 20} color="#059669" />
              </View>
              <RNTextInput 
                style={[styles.couponInputNew, isCompactCheckout && { height: 36, fontSize: 13 }]}
                placeholder="Enter coupon code"
                placeholderTextColor="#94A3B8"
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity 
                style={[styles.applyBtnNew, applyingCoupon && { opacity: 0.7 }, isCompactCheckout && { height: 30, paddingHorizontal: 12 }, booking.coupon_id && { backgroundColor: '#FEE2E2' }]}
                onPress={() => booking.coupon_id ? removeCoupon() : applyCouponCode(couponCode)}
                disabled={applyingCoupon}
              >
                 <RNText style={[styles.applyBtnTextNew, isCompactCheckout && { fontSize: 12 }, booking.coupon_id && { color: '#EF4444' }]}>
                   {applyingCoupon ? '...' : (booking.coupon_id ? 'Remove' : 'Apply')}
                 </RNText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.offersBtnNew}
                onPress={() => { setIsCouponsModalVisible(true); fetchAvailableCoupons(); }}
              >
                 <Ticket size={isCompactCheckout ? 14 : 20} color="#059669" />
                 <RNText style={[styles.offersBtnTextNew, isCompactCheckout && { fontSize: 12 }]}>Offers</RNText>
              </TouchableOpacity>
            </View>

            {/* Price Breakdown */}
            <View style={[styles.breakdownNew, isCompactCheckout && { padding: 12, marginBottom: 12 }]}>
              <View style={[styles.breakdownRowNew, isCompactCheckout && { marginBottom: 10 }]}>
                <View style={styles.breakdownLeftNew}>
                  <View style={[styles.breakdownIconBox, isCompactCheckout && { width: 26, height: 26, borderRadius: 6 }]}>
                    <ShoppingBag size={isCompactCheckout ? 13 : 16} color="#059669" />
                  </View>
                  <RNText style={[styles.breakdownLabelNew, isCompactCheckout && { fontSize: 13 }]}>Ground Price</RNText>
                </View>
                <RNText style={[styles.breakdownValueNew, isCompactCheckout && { fontSize: 13 }]}>{formatCurrency(baseGroundPrice)}</RNText>
              </View>
              
              <View style={[styles.breakdownRowNew, isCompactCheckout && { marginBottom: 10 }]}>
                <View style={styles.breakdownLeftNew}>
                  <View style={[styles.breakdownIconBox, isCompactCheckout && { width: 26, height: 26, borderRadius: 6 }]}>
                    <Ticket size={isCompactCheckout ? 13 : 16} color="#059669" />
                  </View>
                  <RNText style={[styles.breakdownLabelNew, isCompactCheckout && { fontSize: 13 }]}>Platform Fee</RNText>
                  <View style={styles.gstBadgeNew}>
                    <RNText style={styles.gstBadgeTextNew}>Inc. GST</RNText>
                  </View>
                </View>
                <RNText style={[styles.breakdownValueNew, isCompactCheckout && { fontSize: 13 }]}>{formatCurrency(platformFeeIncGst)}</RNText>
              </View>

              {booking.discount_amount > 0 && (
                <View style={styles.breakdownRowNew}>
                  <View style={styles.breakdownLeftNew}>
                    <View style={[styles.breakdownIconBox, { backgroundColor: '#ECFDF5' }]}>
                      <Ticket size={16} color="#10B981" />
                    </View>
                    <RNText style={[styles.breakdownLabelNew, { color: '#10B981' }]}>Your savings</RNText>
                  </View>
                  <RNText style={styles.breakdownDiscountValueNew}>-{formatCurrency(booking.discount_amount)}</RNText>
                </View>
              )}

              <View style={styles.dashedLine} />

              <View style={styles.totalRowNew}>
                <View>
                  <RNText style={[styles.totalLabelNew, isCompactCheckout && { fontSize: 14 }]}>Total Payable</RNText>
                  <RNText style={styles.totalSubtitleNew}>Incl. all taxes</RNText>
                </View>
                <RNText style={[styles.totalValueNew, isCompactCheckout && { fontSize: 20 }]}>
                  {formatCurrency(totalPayable)}
                </RNText>
              </View>
            </View>

            {/* Contact Information Section */}
            <View style={[styles.paymentSectionNew, isCompactCheckout && { marginBottom: 12 }]}>
              <RNText style={[styles.sectionTitleNew, isCompactCheckout && { fontSize: 13, marginBottom: 10 }]}>Confirm Contact Details</RNText>
              <View style={styles.contactInfoCard}>
                <View style={styles.contactInputRow}>
                  <Zap size={18} color="#64748B" />
                  <RNTextInput
                    style={styles.contactInput}
                    placeholder="Email Address"
                    value={contactEmail}
                    onChangeText={setContactEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={[styles.contactInputRow, { marginTop: 8 }]}>
                  <Smartphone size={18} color="#64748B" />
                  <RNTextInput
                    style={styles.contactInput}
                    placeholder="Phone Number"
                    value={contactPhone}
                    onChangeText={setContactPhone}
                    keyboardType="phone-pad"
                  />
                </View>
                <RNText style={styles.contactHint}>Required for payment receipt and confirmation.</RNText>
              </View>
            </View>

            {/* Payment Method Section */}
            <View style={[styles.paymentSectionNew, isCompactCheckout && { marginBottom: 12 }]}>
              <RNText style={[styles.sectionTitleNew, isCompactCheckout && { fontSize: 13, marginBottom: 10 }]}>Payment Method</RNText>
              <View style={[styles.methodListNew, isCompactCheckout && { gap: 8 }]}>
                {(walletBalance > 0 || isGroundOwnerOrAdmin) && (
                  <TouchableOpacity 
                    onPress={() => setSelectedGateway('wallet')}
                    style={[styles.methodItemNew, selectedGateway === 'wallet' && styles.methodItemActiveNew, isCompactCheckout && { padding: 10 }]}
                  >
                    <View style={[styles.methodIconBoxNew, isCompactCheckout && { width: 36, height: 36, borderRadius: 10, marginRight: 10 }]}>
                      <Wallet size={isCompactCheckout ? 16 : 20} color={selectedGateway === 'wallet' ? '#059669' : '#64748B'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <RNText style={[styles.methodLabelNew, selectedGateway === 'wallet' && styles.methodLabelActiveNew, isCompactCheckout && { fontSize: 13 }]}>
                        Wallet Balance
                      </RNText>
                      <RNText style={[styles.methodSubtitleNew, isCompactCheckout && { fontSize: 11 }]}>Bal: {formatCurrency(walletBalance)}</RNText>
                    </View>
                    <View style={[styles.radioOuter, selectedGateway === 'wallet' && styles.radioOuterActive]}>
                      {selectedGateway === 'wallet' && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                )}
                
                {activeGateways.filter(g => {
                  if (isGroundOwnerOrAdmin) return g.name === 'cash';
                  return g.name !== 'cash' && g.name !== 'razorpay'; 
                }).map(g => (
                  <TouchableOpacity 
                    key={g.name}
                    onPress={() => {
                      setSelectedGateway(g.name);
                      setSelectedSubMethod(null);
                    }}
                    style={[styles.methodItemNew, selectedGateway === g.name && styles.methodItemActiveNew, isCompactCheckout && { padding: 10 }]}
                  >
                    <View style={[styles.methodIconBoxNew, isCompactCheckout && { width: 36, height: 36, borderRadius: 10, marginRight: 10 }]}>
                      {g.name === 'cash' ? <Wallet size={isCompactCheckout ? 16 : 20} color={selectedGateway === 'cash' ? '#059669' : '#64748B'} /> : <CreditCard size={isCompactCheckout ? 16 : 20} color={selectedGateway === g.name ? '#059669' : '#64748B'} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <RNText style={[styles.methodLabelNew, selectedGateway === g.name && styles.methodLabelActiveNew, isCompactCheckout && { fontSize: 13 }]}>
                        {g.label}
                      </RNText>
                      <RNText style={[styles.methodSubtitleNew, isCompactCheckout && { fontSize: 11 }]}>{g.name === 'cash' ? 'Pay at the ground' : 'Secure Gateway'}</RNText>
                    </View>
                    <View style={[styles.radioOuter, selectedGateway === g.name && styles.radioOuterActive]}>
                      {selectedGateway === g.name && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Online Methods (Razorpay replacement) */}
                {activeGateways.some(g => g.name === 'razorpay') && !isGroundOwnerOrAdmin && (
                  <>
                    <TouchableOpacity 
                      onPress={() => {
                        setSelectedGateway('razorpay');
                        setSelectedSubMethod('upi');
                      }}
                      style={[styles.methodItemNew, (selectedGateway === 'razorpay' && selectedSubMethod === 'upi') && styles.methodItemActiveNew, isCompactCheckout && { padding: 10 }]}
                    >
                      <View style={[styles.methodIconBoxNew, isCompactCheckout && { width: 36, height: 36, borderRadius: 10, marginRight: 10 }]}>
                        <Smartphone size={isCompactCheckout ? 16 : 20} color={(selectedGateway === 'razorpay' && selectedSubMethod === 'upi') ? '#059669' : '#64748B'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <RNText style={[styles.methodLabelNew, (selectedGateway === 'razorpay' && selectedSubMethod === 'upi') && styles.methodLabelActiveNew, isCompactCheckout && { fontSize: 13 }]}>
                          UPI (PhonePe, GPay, etc)
                        </RNText>
                        <RNText style={[styles.methodSubtitleNew, isCompactCheckout && { fontSize: 11 }]}>Instant and Secure</RNText>
                      </View>
                      <View style={[styles.radioOuter, (selectedGateway === 'razorpay' && selectedSubMethod === 'upi') && styles.radioOuterActive]}>
                        {(selectedGateway === 'razorpay' && selectedSubMethod === 'upi') && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => {
                        setSelectedGateway('razorpay');
                        setSelectedSubMethod('card');
                      }}
                      style={[styles.methodItemNew, (selectedGateway === 'razorpay' && selectedSubMethod === 'card') && styles.methodItemActiveNew, isCompactCheckout && { padding: 10 }]}
                    >
                      <View style={[styles.methodIconBoxNew, isCompactCheckout && { width: 36, height: 36, borderRadius: 10, marginRight: 10 }]}>
                        <CreditCard size={isCompactCheckout ? 16 : 20} color={(selectedGateway === 'razorpay' && selectedSubMethod === 'card') ? '#059669' : '#64748B'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <RNText style={[styles.methodLabelNew, (selectedGateway === 'razorpay' && selectedSubMethod === 'card') && styles.methodLabelActiveNew, isCompactCheckout && { fontSize: 13 }]}>
                          Cards (Credit/Debit)
                        </RNText>
                        <RNText style={[styles.methodSubtitleNew, isCompactCheckout && { fontSize: 11 }]}>Visa, Mastercard, RuPay</RNText>
                      </View>
                      <View style={[styles.radioOuter, (selectedGateway === 'razorpay' && selectedSubMethod === 'card') && styles.radioOuterActive]}>
                        {(selectedGateway === 'razorpay' && selectedSubMethod === 'card') && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => {
                        setSelectedGateway('razorpay');
                        setSelectedSubMethod('netbanking');
                      }}
                      style={[styles.methodItemNew, (selectedGateway === 'razorpay' && selectedSubMethod === 'netbanking') && styles.methodItemActiveNew, isCompactCheckout && { padding: 10 }]}
                    >
                      <View style={[styles.methodIconBoxNew, isCompactCheckout && { width: 36, height: 36, borderRadius: 10, marginRight: 10 }]}>
                        <Globe size={isCompactCheckout ? 16 : 20} color={(selectedGateway === 'razorpay' && selectedSubMethod === 'netbanking') ? '#059669' : '#64748B'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <RNText style={[styles.methodLabelNew, (selectedGateway === 'razorpay' && selectedSubMethod === 'netbanking') && styles.methodLabelActiveNew, isCompactCheckout && { fontSize: 13 }]}>
                          Net Banking
                        </RNText>
                        <RNText style={[styles.methodSubtitleNew, isCompactCheckout && { fontSize: 11 }]}>All Indian Banks</RNText>
                      </View>
                      <View style={[styles.radioOuter, (selectedGateway === 'razorpay' && selectedSubMethod === 'netbanking') && styles.radioOuterActive]}>
                        {(selectedGateway === 'razorpay' && selectedSubMethod === 'netbanking') && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* Split Bill UI (Owner Only) */}
            {(selectedGateway === 'cash' || (selectedGateway === 'wallet' && isGroundOwnerOrAdmin)) && (
              <View style={styles.splitSectionNew}>
                <RNText style={styles.sectionTitleNew}>Add players to split the bill <RNText style={{fontWeight: '400', color: '#94A3B8'}}>(Optional)</RNText></RNText>
                <View style={styles.splitRowNew}>
                  <View style={styles.splitInputBoxNew}>
                    <Users size={18} color="#94A3B8" />
                    <RNTextInput
                      style={styles.splitInputNew}
                      placeholder="Player Name"
                      placeholderTextColor="#94A3B8"
                      value={bookedForName}
                      onChangeText={setBookedForName}
                    />
                  </View>
                  <View style={styles.splitInputBoxNew}>
                    <IndianRupee size={18} color="#94A3B8" />
                    <RNTextInput
                      style={styles.splitInputNew}
                      placeholder="Amount (₹)"
                      placeholderTextColor="#94A3B8"
                      value={customCashAmount}
                      onChangeText={(text) => setCustomCashAmount(text.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Premium Action Button */}
            <TouchableOpacity 
              style={[
                styles.confirmBtnNew, 
                (!isGroundOwnerOrAdmin && selectedGateway === 'wallet' && walletBalance < totalPayable) && { opacity: 0.5 },
                ((isGroundOwnerOrAdmin || selectedGateway === 'cash') && (!bookedForName.trim() || !customCashAmount.trim())) && { backgroundColor: 'rgba(1, 184, 84, 0.4)', shadowOpacity: 0 }
              ]}
              onPress={() => {
                if (selectedGateway === 'wallet') handleWalletPayment();
                else if (selectedGateway === 'cash') handleCashPayment();
                else handlePayment();
              }}
              disabled={
                processing || 
                (selectedGateway === 'wallet' 
                  ? (walletBalance < totalPayable || (isGroundOwnerOrAdmin && (!bookedForName.trim() || !customCashAmount.trim())))
                  : (selectedGateway === 'cash' 
                      ? (!bookedForName.trim() || !customCashAmount.trim() || isNaN(parseFloat(customCashAmount)) || parseFloat(customCashAmount) <= 0)
                      : false))
              }
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <ShieldCheck size={20} color="#FFFFFF" />
                <RNText style={styles.confirmBtnTextNew}>
                  {processing ? 'Processing...' : (selectedGateway === 'wallet' ? 'Confirm via Wallet' : `Confirm & Pay ${formatCurrency(totalPayable)}`)}
                </RNText>
              </View>
              <ChevronLeft size={20} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>

            {/* Security Footer Icons */}
            <View style={styles.securityFooterNew}>
              <View style={styles.securityItemNew}>
                <ShieldCheck size={16} color="#64748B" />
                <RNText style={styles.securityTextNew}>Secure Payment</RNText>
              </View>
              <View style={styles.securityItemNew}>
                <Clock size={16} color="#64748B" />
                <RNText style={styles.securityTextNew}>Instant Confirmation</RNText>
              </View>
              <View style={styles.securityItemNew}>
                <Users size={16} color="#64748B" />
                <RNText style={styles.securityTextNew}>24/7 Support</RNText>
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

      <Modal visible={showRazorpayWebView} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ height: 60, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#EEE', marginTop: Platform.OS === 'ios' ? 40 : 0 }}>
            <TouchableOpacity onPress={() => { setShowRazorpayWebView(false); setProcessing(false); }} style={{ padding: 8 }}>
              <X size={24} color="#333" />
            </TouchableOpacity>
            <RNText style={{ fontSize: 18, fontWeight: '700', marginLeft: 16 }}>Secure Payment</RNText>
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
    paddingBottom: 24,
    maxWidth: 1440,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  layout: {
    flexDirection: 'row',
    gap: 0,
    paddingHorizontal: 0,
  },
  layoutMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  mainColumn: {
    flex: 1.8,
  },
  mainColumnMobile: {
    flex: 0,
    width: '100%',
  },
  sideColumn: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  sideColumnMobile: {
    padding: 16,
    width: '100%',
    flex: 0,
  },
  itemProductCard: {
    flex: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    padding: 0,
  },
  groundImgContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
    borderRadius: 32,
    overflow: 'hidden',
  },
  productImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 32,
  },
  productPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  productHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  itemTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginBottom: 6,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemMetaText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  itemDetailsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 120,
  },
  detailTinyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
  },
  footerDetailText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'Inter',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    marginTop: 0,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  securityText: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '600',
    fontFamily: 'Inter',
    flex: 1,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  summaryTitleNew: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  secureBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 24,
  },
  couponIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  couponInputNew: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#0F172A',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  applyBtnNew: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  applyBtnTextNew: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  offersBtnNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
    paddingLeft: 12,
  },
  offersBtnTextNew: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  breakdownNew: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 24,
  },
  breakdownRowNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  breakdownLeftNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownLabelNew: {
    fontSize: 15,
    color: '#475569',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  breakdownValueNew: {
    fontSize: 15,
    color: '#0F172A',
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  gstBadgeNew: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  gstBadgeTextNew: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  dashedLine: {
    height: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginVertical: 16,
  },
  totalRowNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabelNew: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  totalSubtitleNew: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  totalValueNew: {
    fontSize: 24,
    fontWeight: '800',
    color: '#059669',
    fontFamily: 'Inter',
  },
  paymentSectionNew: {
    marginBottom: 24,
  },
  sectionTitleNew: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  methodListNew: {
    gap: 12,
  },
  methodItemNew: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  methodItemActiveNew: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  methodIconBoxNew: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  methodLabelNew: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  methodLabelActiveNew: {
    color: '#059669',
  },
  methodSubtitleNew: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: '#059669',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669',
  },
  splitSectionNew: {
    marginBottom: 24,
  },
  splitRowNew: {
    flexDirection: 'row',
    gap: 12,
  },
  splitInputBoxNew: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10,
  },
  splitInputNew: {
    flex: 1,
    height: 52,
    fontSize: 14,
    color: '#0F172A',
    fontFamily: 'Inter',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  confirmBtnNew: {
    height: 60,
    borderRadius: 18,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 24,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  confirmBtnTextNew: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  securityFooterNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  securityItemNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityTextNew: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  contactInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 12,
  },
  contactInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#0F172A',
  },
  contactHint: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#F8FAFC',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponsList: {
    gap: 16,
  },
  couponItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  couponCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  couponDescText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  couponMinText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'Inter',
    marginTop: 4,
  },
  applySmallBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  applySmallText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  cashFieldsContainer: {
    padding: 0,
    marginTop: 12,
    gap: 12,
  },
  cashFieldsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cashFieldColumn: {
    flex: 1,
  },
  cashAmountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 6,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
  },
  cashAmountInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 15,
    fontWeight: '700',
    color: '#14532D',
    fontFamily: 'Inter',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  gstTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gstTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  // New Premium Left Section Styles
  heroImageWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  heroOverlayGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
    padding: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  topRightBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  topRightBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  middleLeftBadge: {
    position: 'absolute',
    top: '60%',
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  middleLeftBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  heroLocationText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  heroBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  priceBadgeOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  priceBadgeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  priceUnitText: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  bookingDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  bookingDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 20,
  },
  bookingDetailItem: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  detailIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailInfoContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginBottom: 2,
  },
  detailSub: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  detailDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 12,
  },
  secureCardNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F0FDFA',
    padding: 20,
    borderRadius: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  secureIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  secureTitleNew: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F766E',
    fontFamily: 'Inter',
    marginBottom: 2,
  },
  secureSubNew: {
    fontSize: 14,
    color: '#0D9488',
    fontFamily: 'Inter',
    fontWeight: '500',
    opacity: 0.8,
  },
  // Minimal checkout header for small web screens
  checkoutMiniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  checkoutMiniBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkoutMiniTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
    letterSpacing: -0.3,
  },
  checkoutMiniSecureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  checkoutMiniSecureText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    fontFamily: 'Inter',
  },
  // Compact small-web banner (replaces hero image)
  compactGroundBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  compactBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactGroundName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  compactGroundLocation: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  compactPriceBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  compactPriceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
    fontFamily: 'Inter',
  },
  compactPriceUnit: {
    fontSize: 11,
    color: '#059669',
    fontFamily: 'Inter',
  },
  // Compact pill-style detail row
  compactDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  compactDetailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactDetailDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  compactDetailLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  compactDetailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginTop: 1,
  },
});
