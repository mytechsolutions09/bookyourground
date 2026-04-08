import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import WebLayout from '@/components/web/WebLayout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/utils/helpers';
import { CreditCard, ShieldCheck, Clock, Calendar, MapPin, ChevronLeft } from 'lucide-react-native';

export default function CheckoutScreen() {
  const { id } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingCash, setProcessingCash] = useState(false);
  const [activeGateways, setActiveGateways] = useState<any[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);

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
      
      // Select first available (prefer Razorpay)
      const rzp = data?.find(g => g.name === 'razorpay');
      const payu = data?.find(g => g.name === 'payu');
      if (rzp) setSelectedGateway('razorpay');
      else if (payu) setSelectedGateway('payu');
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
    
    if (selectedGateway === 'razorpay' && Platform.OS === 'web' && !document.getElementById('rzp-script')) {
      const script = document.createElement('script');
      script.id = 'rzp-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [id, selectedGateway]);

  const params = useLocalSearchParams();

  const handleCashPayment = async () => {
    if (!booking) return;

    try {
      setProcessingCash(true);

      const { data, error } = await supabase.functions.invoke('razorpay-payment', {
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
          } : null,
        },
      });

      if (error) throw error;

      if (data.success) {
        Alert.alert('Success', 'Booking confirmed via Cash payment.');
        router.replace(`/bookings/${data.bookingId}` as any);
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
      const { groundId, date, time, teamType, couponId, discount } = params;
      
      // Fetch ground details
      const { data: ground, error: groundError } = await supabase
        .from('grounds')
        .select('*')
        .eq('id', groundId)
        .single();
        
      if (groundError) throw groundError;

      // Mock a booking object for the UI
      // We'll calculate the end time based on the ground type
      const isBox = (ground.pitch_type ?? '').toLowerCase().includes('box');
      const durationHours = 1; // Default
      const startTimeMinutes = parseTimeToMinutes(time as string) || 540;
      const endMinutes = startTimeMinutes + (durationHours * 60);
      const endTime = minutesToHHMM(endMinutes);

      // We need to fetch the price for this slot if it's box cricket
      let pricePerHour = ground.base_price_per_hour;
      // In a real app, we'd call an RPC or function to get the exact slot price
      // For now, use the base price or the discount passed from the form

      const totalAmount = isBox 
        ? pricePerHour 
        : teamType === 'one' ? (pricePerHour / 2) : pricePerHour;
      
      const discountVal = parseFloat(discount as string || '0');

      setBooking({
        id: 'pending',
        ground_id: groundId,
        booking_date: date,
        start_time: time,
        end_time: endTime,
        total_amount: totalAmount - discountVal,
        discount_amount: discountVal,
        team_type: teamType,
        coupon_id: couponId,
        grounds: ground,
        isNew: true, // Flag to indicate we need to create booking on success
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
        .select('*, grounds(*)')
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

  const handlePayU = async () => {
    if (!booking) return;
    try {
      setProcessing(true);
      const txnid = 'PAYU_' + Date.now();
      const productinfo = `Booking for ${booking.grounds.name}`;
      const firstname = user?.user_metadata?.full_name || 'Guest';
      const email = user?.email || '';

      const { data: hashData, error: hashError } = await supabase.functions.invoke('razorpay-payment', {
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

      // 2. Build form and submit (Web only for demo)
      if (Platform.OS === 'web') {
        const isProduction = true; // Set to true for live payments
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
          // Add UDF placeholders to match hash pipes
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

  const handlePayment = async () => {
    if (selectedGateway === 'payu') {
      return handlePayU();
    }
    if (selectedGateway === 'razorpay') {
      return handleRazorpay();
    }
    if (selectedGateway === 'cash') {
      return handleCashPayment();
    }
  };

  const handleRazorpay = async () => {
    if (!booking) return;

    try {
      setProcessing(true);

      // 1. Create Razorpay Order via Edge Function
      const { data, error } = await supabase.functions.invoke('razorpay-payment', {
        body: {
          action: 'create-order',
          bookingId: booking.isNew ? null : booking.id,
          bookingDetails: booking.isNew ? {
            ground_id: booking.ground_id,
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            end_time: booking.end_time,
            team_type: booking.team_type,
            coupon_id: booking.coupon_id,
          } : null,
        },
      });

      if (error) throw error;

      const order = data;

      if (Platform.OS === 'web') {
        const options = {
          key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_HERE',
          amount: order.amount,
          currency: order.currency,
          name: 'BookYourGround',
          description: `Booking for ${booking.grounds.name}`,
          order_id: order.id,
          handler: async function (response: any) {
            // 2. Verify Payment
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('razorpay-payment', {
              body: {
                action: 'verify-payment',
                bookingId: booking.isNew ? null : booking.id,
                bookingDetails: booking.isNew ? {
                    ground_id: booking.ground_id,
                    booking_date: booking.booking_date,
                    start_time: booking.start_time,
                    end_time: booking.end_time,
                    team_type: booking.team_type,
                    coupon_id: booking.coupon_id,
                  } : null,
                paymentDetails: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              },
            });

            if (verifyError) {
              Alert.alert('Payment Verification Failed', 'Please contact support if amount was deducted.');
            } else {
              const finalId = verifyData.bookingId || booking.id;
              router.replace(`/bookings/${finalId}` as any);
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
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // For Native, we'd typically use react-native-razorpay
        // Or redirect to a web-based checkout page
        Alert.alert(
          'Mobile Payment',
          'For mobile, please use our web interface or ensure native Razorpay is configured.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Payment Error', error.message || 'Something went wrong.');
    } finally {
      setProcessing(false);
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
        <Text>Booking not found.</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#043529" />
        </TouchableOpacity>
        <Text style={styles.title}>Secure Checkout</Text>
      </View>

      <View style={styles.layout}>
        {/* Left Column: Summary */}
        <View style={styles.mainColumn}>
          <Card style={styles.orderCard}>
            <View style={styles.groundInfo}>
              <View style={styles.groundText}>
                <Text style={styles.groundName}>{booking.grounds.name}</Text>
                <View style={styles.locationRow}>
                  <MapPin size={14} color="#6B7280" />
                  <Text style={styles.locationText}>{booking.grounds.city}, {booking.grounds.state}</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Calendar size={18} color="#10b981" />
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{booking.booking_date}</Text>
                </View>
              </View>
              <View style={styles.detailItem}>
                <Clock size={18} color="#10b981" />
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>{booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}</Text>
                </View>
              </View>
            </View>
          </Card>

          <View style={styles.securityInfo}>
            <ShieldCheck size={20} color="#065f46" />
            <Text style={styles.securityText}>
              Your payment is secured with industry-standard encryption.
            </Text>
          </View>
        </View>

        {/* Right Column: Payment Actions */}
        <View style={styles.sideColumn}>
          <Card style={styles.paymentCard}>
            <Text style={styles.paymentTitle}>Select Payment Method</Text>
            
            <View style={styles.methodSelector}>
              {activeGateways.filter(g => g.name !== 'cash').map(g => (
                <TouchableOpacity 
                  key={g.name}
                  onPress={() => setSelectedGateway(g.name)}
                  style={[
                    styles.methodOption,
                    selectedGateway === g.name && styles.methodOptionActive
                  ]}
                >
                  <View style={[styles.methodCircle, selectedGateway === g.name && styles.methodCircleActive]}>
                    <CreditCard size={14} color={selectedGateway === g.name ? '#FFF' : '#6B7280'} />
                  </View>
                  <Text style={[styles.methodLabel, selectedGateway === g.name && styles.methodLabelActive]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.divider, { marginVertical: 16 }]} />

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Booking Amount</Text>
              <Text style={styles.priceValue}>{formatCurrency(booking.total_amount + (booking.discount_amount || 0))}</Text>
            </View>
            
            {booking.discount_amount > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.discountLabel}>Discount</Text>
                <Text style={styles.discountValue}>-{formatCurrency(booking.discount_amount)}</Text>
              </View>
            )}

            <View style={[styles.divider, { marginVertical: 16 }]} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Payable</Text>
              <Text style={styles.totalValue}>{formatCurrency(booking.total_amount)}</Text>
            </View>

            <Button
              title={processing ? 'Processing...' : `Pay via ${activeGateways.find(g => g.name === selectedGateway)?.label || 'Gateway'}`}
              onPress={handlePayment}
              disabled={processing || !selectedGateway}
              loading={processing}
              fullWidth
              size="large"
              style={styles.payButton}
              icon={CreditCard}
            />

            {(profile?.role === 'ground_owner' || profile?.role === 'super_admin') && (
              <Button
                title={processingCash ? 'Confirming...' : 'Confirm (Cash Payment)'}
                onPress={handleCashPayment}
                disabled={processing || processingCash}
                loading={processingCash}
                fullWidth
                size="large"
                variant="outline"
                style={styles.cashButton}
              />
            )}

            <View style={styles.razorpayBadge}>
              <Text style={styles.poweredBy}>Powered by</Text>
              <Image 
                source={{ uri: 'https://cdn.razorpay.com/static/assets/logo/logo.png' }} 
                style={styles.razorpayLogo}
                resizeMode="contain"
              />
            </View>
          </Card>
        </View>
      </View>
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return (content);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: Platform.OS === 'web' ? 20 : 40,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  layout: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 24,
  },
  mainColumn: {
    flex: 2,
  },
  sideColumn: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 350 : '100%',
  },
  orderCard: {
    padding: 24,
    marginBottom: 16,
  },
  groundInfo: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  groundText: {
    flex: 1,
  },
  groundName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 150,
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  securityText: {
    fontSize: 14,
    color: '#065f46',
    flex: 1,
  },
  paymentCard: {
    padding: 24,
    borderTopWidth: 4,
    borderTopColor: '#10b981',
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  discountLabel: {
    fontSize: 14,
    color: '#10b981',
  },
  discountValue: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10b981',
  },
  payButton: {
    backgroundColor: '#111827',
    height: 56,
  },
  cashButton: {
    marginTop: 12,
    borderColor: '#059669',
    height: 56,
  },
  razorpayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  poweredBy: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  razorpayLogo: {
    width: 60,
    height: 16,
  },
  methodSelector: {
    gap: 10,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  methodOptionActive: {
    borderColor: '#10b981',
    backgroundColor: '#ECFDF5',
  },
  methodCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodCircleActive: {
    backgroundColor: '#10b981',
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  methodLabelActive: {
    color: '#047857',
  },
});
