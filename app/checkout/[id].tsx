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
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Image } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { formatCurrency, formatDateDDMMYYYY } from '@/utils/helpers';
import { CreditCard, ShieldCheck, Clock, Calendar, MapPin, ChevronLeft, Wallet, Users, X } from 'lucide-react-native';
import { hoursBetweenBooked, normalizeDbTimeToHHMM } from '@/utils/bookingSlots';
import { useUI } from '@/contexts/UIContext';

// Platform settings fetched from database

export default function CheckoutScreen() {
  const params = useLocalSearchParams();
  const { id } = params;
  const { user, profile } = useAuth();
  const { width } = useWindowDimensions();
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
    }
  }, [user]);

  useEffect(() => {
    if (!profile || activeGateways.length === 0) return;
    
    const isOwner = profile?.role === 'super_admin' || profile?.role === 'ground_owner';
    const cash = activeGateways.find(g => g.name === 'cash');
    const razorpay = activeGateways.find(g => g.name === 'razorpay');

    if (isOwner && cash) {
      setSelectedGateway('cash');
    } else if (razorpay) {
      setSelectedGateway('razorpay');
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
              "name": "${user?.user_metadata?.full_name || ''}",
              "email": "${user?.email || ''}",
              "contact": "${user?.user_metadata?.phone || ''}"
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
  
  const dynamicStyles = {
    content: {
      padding: Platform.OS === 'web' ? (width > 768 ? 16 : 8) : 8,
    },
    layout: {
      gap: isDesktop ? (width > 1024 ? 24 : 16) : 12,
    },
    securityInfo: {
      marginTop: isDesktop ? 20 : 12,
      padding: isDesktop ? 20 : 16,
    },
    summaryCard: {
      padding: isDesktop ? 24 : 16,
    },
    productImg: {
      height: Platform.OS === 'web' && width > 768 ? 220 : 160,
    },
    productPlaceholder: {
      height: Platform.OS === 'web' && width > 768 ? 140 : 120,
    },
    mainColumn: {
      flex: isDesktop ? 1.8 : undefined,
    },
    sideColumn: {
      flex: isDesktop ? 1 : undefined,
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
        <RNText style={[styles.title, { color: themeTextColor }]}>Confirm Booking</RNText>
      </View>

      <View style={[styles.layout, !isDesktop && styles.layoutMobile, dynamicStyles.layout]}>
        {/* Left Column: Items (Booking Details) */}
        <View style={[styles.mainColumn, !isDesktop && styles.mainColumnMobile, dynamicStyles.mainColumn]}>
          <Card style={styles.itemProductCard}>
            {(booking.grounds || booking.ground)?.ground_images?.[0]?.image_url ? (
              <Image 
                source={{ uri: (booking.grounds || booking.ground).ground_images[0].image_url }} 
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
                  <RNText style={styles.itemTitle}>{(booking.grounds || booking.ground)?.name}</RNText>
                  <View style={styles.itemMetaRow}>
                    <MapPin size={14} color="#6B7280" />
                    <RNText style={styles.itemMetaText}>{(booking.grounds || booking.ground)?.city}, {(booking.grounds || booking.ground)?.state}</RNText>
                  </View>
                </View>
                <RNText style={styles.productPrice}>
                  {formatCurrency(
                    (selectedGateway === 'cash' && customCashAmount && !isNaN(parseFloat(customCashAmount)))
                      ? parseFloat(customCashAmount) + (booking.discount_amount || 0)
                      : booking.total_amount + (booking.discount_amount || 0)
                  )}
                </RNText>
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
                 <View style={styles.footerDetail}>
                    <Users size={16} color="#01b854" />
                    <View>
                       <RNText style={styles.detailTinyLabel}>BOOKING FOR</RNText>
                       <RNText style={styles.footerDetailText}>{booking.team_type === 'one' ? '1 Team' : 'Both Teams'}</RNText>
                    </View>
                 </View>
              </View>


            </View>
          </Card>

          <View style={[styles.securityInfo, dynamicStyles.securityInfo, { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5', borderWidth: 1 }]}>
            <ShieldCheck size={16} color="#01b854" />
            <RNText style={[styles.securityText, { color: '#065F46' }]}>
               Purchase protected by Book Your Ground Security
            </RNText>
          </View>
        </View>

        {/* Right Column: Order Summary */}
        <View style={[styles.sideColumn, !isDesktop && styles.sideColumnMobile, dynamicStyles.sideColumn]}>
          <Card style={[styles.summaryCard, dynamicStyles.summaryCard]}>
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

               <TouchableOpacity 
                 style={styles.offersSmallBtn}
                 onPress={() => {
                   setIsCouponsModalVisible(true);
                   fetchAvailableCoupons();
                 }}
               >
                  <ShieldCheck size={16} color="#01b854" />
                  <RNText style={styles.offersSmallText}>Offers</RNText>
               </TouchableOpacity>
            </View>

            <View style={styles.breakdown}>
              <View style={styles.breakdownRow}>
                <RNText style={styles.breakdownLabel}>Ground Price</RNText>
                <RNText style={styles.breakdownValue}>
                  {formatCurrency(baseGroundPrice)}
                </RNText>
              </View>
              
              <View style={styles.breakdownRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <RNText style={styles.breakdownLabel}>Platform Fee</RNText>
                  <View style={styles.gstTag}>
                    <RNText style={styles.gstTagText}>inc. GST</RNText>
                  </View>
                </View>
                <RNText style={styles.breakdownValue}>{formatCurrency(platformFeeIncGst)}</RNText>
              </View>

              {booking.discount_amount > 0 && (
                <View style={styles.breakdownRow}>
                  <RNText style={styles.breakdownLabel}>Your savings</RNText>
                  <RNText style={styles.breakdownDiscountValue}>-{formatCurrency(booking.discount_amount)}</RNText>
                </View>
              )}
            </View>

            <View style={styles.subtotalRow}>
              <RNText style={styles.subtotalLabel}>
                {(selectedGateway === 'cash' || isGroundOwnerOrAdmin) ? 'Total Receivable :' : 'Total Payable :'}
              </RNText>
              <RNText style={styles.subtotalValue}>
                {formatCurrency((selectedGateway === 'cash' || isGroundOwnerOrAdmin) ? totalReceivable : totalPayable)}
              </RNText>
            </View>

            {(isGroundOwnerOrAdmin || walletBalance > 0) && (
              <View style={styles.paymentMethodSection}>
                <RNText style={styles.paymentMethodTitle}>Payment Method</RNText>
                <View style={styles.methodSelector}>
                  {(walletBalance > 0 || isGroundOwnerOrAdmin) && (
                    <TouchableOpacity 
                      onPress={() => setSelectedGateway('wallet')}
                      style={[
                        styles.methodOption,
                        selectedGateway === 'wallet' && styles.methodOptionActive
                      ]}
                    >
                      <View style={[styles.methodCircle, selectedGateway === 'wallet' && styles.methodCircleActive]}>
                        <Wallet size={14} color={selectedGateway === 'wallet' ? '#FFF' : '#9CA3AF'} />
                      </View>
                      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <RNText style={[styles.methodLabel, selectedGateway === 'wallet' && styles.methodLabelActive]}>
                          Wallet Balance
                        </RNText>
                        <RNText style={{ fontSize: 16, fontWeight: '800', color: selectedGateway === 'wallet' ? '#065F46' : '#1E293B' }}>
                          {formatCurrency(walletBalance)}
                        </RNText>
                      </View>
                    </TouchableOpacity>
                  )}
                  {activeGateways.filter(g => {
                    if (isGroundOwnerOrAdmin) return g.name === 'cash';
                    return g.name !== 'cash'; 
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
            )}

            {(selectedGateway === 'wallet' && !isGroundOwnerOrAdmin) ? (
              <Button
                title={processing ? 'Processing...' : `Pay via Wallet`}
                onPress={handleWalletPayment}
                disabled={processing || walletBalance < totalPayable}
                loading={processing}
                fullWidth
                size="large"
                variant="secondary"
                style={[styles.payButton, { backgroundColor: '#00ea6b' }]}
                textStyle={styles.payButtonText}
              />
            ) : (selectedGateway === 'razorpay' || selectedGateway === 'payu') ? (
              <Button
                title={processing ? 'Processing...' : `Check Out`}
                onPress={handlePayment}
                disabled={processing}
                loading={processing}
                fullWidth
                size="large"
                variant="secondary"
                style={styles.payButton}
                textStyle={styles.payButtonText}
              />
            ) : (selectedGateway === 'cash' || (selectedGateway === 'wallet' && isGroundOwnerOrAdmin)) ? (
              <View style={{ gap: 12, marginBottom: 12 }}>
              <View style={styles.cashFieldsContainer}>
                <View style={styles.cashFieldsRow}>
                  <View style={styles.cashFieldColumn}>
                    <RNText style={styles.cashAmountLabel}>Player Name</RNText>
                    <RNTextInput
                      style={styles.cashAmountInput}
                      placeholder="Name..."
                      placeholderTextColor="#9CA3AF"
                      value={bookedForName}
                      onChangeText={setBookedForName}
                    />
                  </View>

                  <View style={styles.cashFieldColumn}>
                    <RNText style={styles.cashAmountLabel}>Price</RNText>
                    <RNTextInput
                      style={styles.cashAmountInput}
                      placeholder="Amount..."
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      value={customCashAmount}
                      onChangeText={setCustomCashAmount}
                    />
                  </View>
                </View>
              </View>
                <Button
                  title={selectedGateway === 'wallet' ? (processing ? 'Processing...' : 'Confirm via Wallet') : (processingCash ? 'Confirming...' : 'Confirm Order')}
                  onPress={selectedGateway === 'wallet' ? handleWalletPayment : handleCashPayment}
                  disabled={selectedGateway === 'wallet' ? (processing || walletBalance < totalPayable) : (processingCash || !customCashAmount || isNaN(parseFloat(customCashAmount)) || parseFloat(customCashAmount) <= 0)}
                  loading={selectedGateway === 'wallet' ? processing : processingCash}
                  fullWidth
                  size="large"
                  variant="secondary"
                  style={styles.payButton}
                />
              </View>
            ) : (
              <Button
                title="Select Payment Method"
                onPress={() => {}}
                disabled={true}
                fullWidth
                size="large"
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
    paddingVertical: 24,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
    paddingHorizontal: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  layout: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    gap: 20,
  },
  layoutMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  mainColumn: {
    flex: 1.8,
  },
  sideColumn: {
    flex: 1,
  },
  itemProductCard: {
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  productImg: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
  },
  productPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    padding: 24,
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
    flex: 1,
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
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 24,
    fontFamily: 'Inter',
  },
  couponSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  couponInput: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    fontFamily: 'Inter',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  applyBtn: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  offersSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  offersSmallText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  offersLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offersText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  breakdown: {
    gap: 8,
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '400',
    fontFamily: 'Inter',
  },
  breakdownValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '400',
    fontFamily: 'Inter',
  },
  breakdownDiscountLabel: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  breakdownDiscountValue: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  subtotalLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  subtotalValue: {
    fontSize: 22,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  paymentMethodSection: {
    marginBottom: 24,
  },
  paymentMethodTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 12,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  methodSelector: {
    gap: 8,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  methodOptionActive: {
    backgroundColor: 'rgba(1, 184, 84, 0.12)',
    borderColor: 'rgba(1, 184, 84, 0.4)',
    borderWidth: 1.5,
    ...Platform.select({
      web: { backdropFilter: 'blur(8px)' }
    }) as any,
  },
  methodCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodCircleActive: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  methodLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    fontFamily: 'Inter',
  },
  methodLabelActive: {
    color: '#065F46',
    fontWeight: '700',
  },
  payButton: {
    height: 52,
    borderRadius: 100,
    backgroundColor: 'rgba(1, 184, 84, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.5)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(1, 184, 84, 0.3)',
        transition: 'all 0.3s ease',
      },
      ios: {
        shadowColor: '#00ea6b',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }) as any,
  },
  payButtonText: {
    fontWeight: '500',
    fontSize: 18,
    fontFamily: 'Inter',
    letterSpacing: -0.2,
  },
  trustFooter: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  trustFooterText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    fontFamily: 'Inter',
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
});
