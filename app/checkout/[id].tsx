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
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import WebLayout from '@/components/web/WebLayout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/utils/helpers';
import { CreditCard, ShieldCheck, Clock, Calendar, MapPin, ChevronLeft, Wallet } from 'lucide-react-native';

export default function CheckoutScreen() {
  const { id } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  
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
          } : null,
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
      const { groundId, date, time, teamType, couponId, discount } = params;
      
      const { data: ground, error: groundError } = await supabase
        .from('grounds')
        .select('*')
        .eq('id', groundId)
        .single();
        
      if (groundError) throw groundError;

      const isBox = (ground.pitch_type ?? '').toLowerCase().includes('box');
      const durationHours = 1;
      const startTimeMinutes = parseTimeToMinutes(time as string) || 540;
      const endMinutes = startTimeMinutes + (durationHours * 60);
      const endTime = minutesToHHMM(endMinutes);

      const pricePerHour = ground.base_price_per_hour;
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
        <Text>Booking not found.</Text>
        <Button title="Go Back" onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)');
        }} />
      </View>
    );
  }

  const isGroundOwnerOrAdmin = profile?.role === 'super_admin' || 
    (profile?.role === 'ground_owner' && (booking?.grounds?.owner_id === user?.id || booking?.ground_id === user?.id));

  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)');
        }} style={styles.backButton}>
          <ChevronLeft size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
      </View>

      <View style={[styles.layout, !isDesktop && styles.layoutMobile]}>
        {/* Left Column: Summary */}
        <View style={styles.mainColumn}>
          <Card style={styles.orderCard}>
            <Text style={styles.sectionTitle}>Booking Summary</Text>
            
            <View style={styles.groundInfo}>
              <Text style={styles.groundName}>{booking.grounds.name}</Text>
              <View style={styles.locationRow}>
                <MapPin size={12} color="#6B7280" />
                <Text style={styles.locationText}>{booking.grounds.city}, {booking.grounds.state}</Text>
              </View>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Calendar size={16} color="#10b981" />
                <View>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{booking.booking_date}</Text>
                </View>
              </View>
              <View style={styles.detailItem}>
                <Clock size={16} color="#10b981" />
                <View>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>{booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}</Text>
                </View>
              </View>
            </View>
          </Card>

          <View style={styles.securityInfo}>
            <ShieldCheck size={16} color="#059669" />
            <Text style={styles.securityText}>
              Encrypted secure checkout.
            </Text>
          </View>
        </View>

        {/* Right Column: Payment */}
        <View style={styles.sideColumn}>
          <Card style={styles.paymentCard}>
            <Text style={styles.paymentTitle}>Payment Method</Text>
            
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
                      <Wallet size={14} color={selectedGateway === g.name ? '#FFF' : '#6B7280'} />
                    ) : (
                      <CreditCard size={14} color={selectedGateway === g.name ? '#FFF' : '#6B7280'} />
                    )}
                  </View>
                  <Text style={[styles.methodLabel, selectedGateway === g.name && styles.methodLabelActive]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.priceContainer}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal</Text>
                <Text style={styles.priceValue}>{formatCurrency(booking.total_amount + (booking.discount_amount || 0))}</Text>
              </View>
              
              {booking.discount_amount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.discountLabel}>Coupon Discount</Text>
                  <Text style={styles.discountValue}>-{formatCurrency(booking.discount_amount)}</Text>
                </View>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(booking.total_amount)}</Text>
              </View>
            </View>

            {selectedGateway === 'razorpay' || selectedGateway === 'payu' ? (
              <Button
                title={processing ? 'Processing...' : `Pay ${formatCurrency(booking.total_amount)}`}
                onPress={handlePayment}
                disabled={processing}
                loading={processing}
                fullWidth
                style={styles.payButton}
                icon={CreditCard}
              />
            ) : selectedGateway === 'cash' ? (
              <Button
                title={processingCash ? 'Confirming...' : 'Confirm Booking'}
                onPress={handleCashPayment}
                disabled={processingCash}
                loading={processingCash}
                fullWidth
                style={styles.payButton}
                icon={Wallet}
              />
            ) : (
              <Button
                title="Select Payment Method"
                onPress={() => {}}
                disabled={true}
                fullWidth
                style={styles.payButton}
              />
            )}

          </Card>
        </View>
      </View>
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
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: Platform.OS === 'web' ? 24 : 16,
    maxWidth: 900,
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
    marginBottom: 20,
    marginTop: Platform.OS === 'web' ? 0 : 40,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  layout: {
    flexDirection: 'row',
    gap: 16,
  },
  layoutMobile: {
    flexDirection: 'column',
  },
  mainColumn: {
    flex: 1.5,
  },
  sideColumn: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 320 : '100%',
  },
  orderCard: {
    padding: 20,
    marginBottom: 12,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  groundInfo: {
    marginBottom: 16,
  },
  groundName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailLabel: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
  },
  securityText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  paymentCard: {
    padding: 20,
    borderRadius: 16,
    borderTopWidth: 3,
    borderTopColor: '#10b981',
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  methodSelector: {
    gap: 8,
    marginBottom: 20,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  methodOptionActive: {
    borderColor: '#10b981',
    backgroundColor: '#ECFDF5',
  },
  methodCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodCircleActive: {
    backgroundColor: '#10b981',
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  methodLabelActive: {
    color: '#065F46',
  },
  priceContainer: {
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  discountLabel: {
    fontSize: 13,
    color: '#10b981',
  },
  discountValue: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10b981',
  },
  payButton: {
    height: 50,
    borderRadius: 12,
  },
  cashButton: {
    marginTop: 10,
    height: 50,
    borderRadius: 12,
    borderColor: '#10b981',
  },
});
