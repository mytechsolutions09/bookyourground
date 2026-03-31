import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert, Platform, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MapPin, Calendar, Clock, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BookingWithDetails } from '@/types';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/utils/helpers';
import { formatBookingSlotSummary } from '@/utils/bookingSlotFormat';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import WebLayout from '@/components/web/WebLayout';

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const { width } = useWindowDimensions();

  useEffect(() => {
    loadBooking();
  }, [id]);

  const loadBooking = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          ground:grounds(
            *,
            ground_images(*)
          ),
          user:profiles(full_name, phone)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setBooking(data);
    } catch (error) {
      console.error('Error loading booking:', error);
      Alert.alert('Error', 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleDummyPayment = async () => {
    if (!booking) return;
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to complete the payment.');
      return;
    }
    if (booking.status !== 'pending') {
      Alert.alert('Payment not required', 'This booking is already processed.');
      return;
    }

    try {
      setPaymentLoading(true);

      const { error: txError } = await supabase.from('transactions').insert({
        booking_id: booking.id,
        user_id: booking.user_id,
        amount: booking.total_amount,
        status: 'completed',
        payment_method: 'dummy',
        transaction_reference: `DUMMY-${Date.now()}`,
      });

      if (txError) throw txError;

      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
        })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      await loadBooking();

      router.replace(`/bookings/${booking.id}/confirmed` as any);
    } catch (error: any) {
      console.error('Error processing dummy payment:', error);
      Alert.alert('Payment failed', error.message || 'Unable to process payment.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('bookings')
                .update({
                  status: 'cancelled',
                  cancelled_at: new Date().toISOString(),
                })
                .eq('id', id);

              if (error) throw error;
              Alert.alert('Success', 'Booking cancelled successfully');
              loadBooking();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  if (loading || !booking) {
    const loadingContent = (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );

    if (Platform.OS === 'web') {
      return <WebLayout>{loadingContent}</WebLayout>;
    }

    return loadingContent;
  }

  const primaryImage = booking.ground.ground_images?.[0]?.image_url ||
    'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';

  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';

  const isNarrow = width < 900;

  const detailsSection = (
    // Left: booking details
    <View style={isNarrow ? styles.detailsColumnNarrow : styles.detailsColumn}>
      <View style={styles.detailsContent}>
          <Image source={{ uri: primaryImage }} style={styles.image} />

          <Card style={styles.section}>
            <Text style={styles.groundName}>{booking.ground.name}</Text>
            <View style={styles.locationRow}>
              <MapPin size={16} color="#666" />
              <Text style={styles.location}>
                {booking.ground.address}, {booking.ground.city}, {booking.ground.state}
              </Text>
            </View>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Information</Text>
            <View style={styles.infoRow}>
              <Calendar size={18} color={Platform.OS === 'web' ? '#dc8d3c' : '#2196F3'} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{formatDate(booking.booking_date)}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Clock size={18} color={Platform.OS === 'web' ? '#dc8d3c' : '#2196F3'} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>
                  {formatBookingSlotSummary(
                    booking.start_time,
                    booking.end_time,
                    booking.ground.pitch_type,
                  )}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Clock size={18} color={Platform.OS === 'web' ? '#dc8d3c' : '#2196F3'} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>{booking.total_hours} hours</Text>
              </View>
            </View>
          </Card>

        {booking.notes && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{booking.notes}</Text>
          </Card>
        )}
      </View>
    </View>
  );

  const isBoxCricket = (booking.ground.pitch_type ?? '').toLowerCase().includes('box');

  const paymentSection = (
    // Right: payment summary + options
    <View style={isNarrow ? styles.paymentColumnNarrow : styles.paymentColumn}>
      <Card style={styles.paymentCard}>
        <Text style={styles.sectionTitle}>Payment Summary</Text>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>
            {isBoxCricket ? 'Price per hour' : 'Price per match'}
          </Text>
          <Text style={styles.paymentValue}>{formatCurrency(booking.price_per_hour)}</Text>
        </View>
        {isBoxCricket && (
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Total hours</Text>
            <Text style={styles.paymentValue}>{booking.total_hours}</Text>
          </View>
        )}
        <View style={[styles.paymentRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>{formatCurrency(booking.total_amount)}</Text>
        </View>
      </Card>

      <Card style={styles.paymentCard}>
        <Text style={styles.sectionTitle}>Payment Options</Text>
        <View style={styles.paymentOptions}>
          <View style={styles.paymentOptionRow}>
            <View style={styles.paymentOptionBullet} />
            <Text style={styles.paymentOptionText}>UPI (coming soon)</Text>
          </View>
          <View style={styles.paymentOptionRow}>
            <View style={styles.paymentOptionBullet} />
            <Text style={styles.paymentOptionText}>Card (coming soon)</Text>
          </View>
          <View style={styles.paymentOptionRow}>
            <View style={styles.paymentOptionBullet} />
            <Text style={styles.paymentOptionText}>Pay at ground (cash/UPI)</Text>
          </View>
        </View>

        <Button
          title={booking.status === 'pending' ? 'Confirm Booking' : 'Booking Confirmed'}
          onPress={handleDummyPayment}
          fullWidth
          size="medium"
          style={styles.payNowButton}
          disabled={booking.status !== 'pending'}
          loading={paymentLoading}
        />

        <Text
          style={styles.backLink}
          onPress={() => {
            if (router.canGoBack?.()) router.back();
            else router.push('/book-my-ground' as any);
          }}
        >
          Go back
        </Text>
      </Card>
    </View>
  );

  const content = (
    <View style={styles.container}>
      {isNarrow ? (
        <ScrollView
          contentContainerStyle={styles.bodyColumn}
          showsVerticalScrollIndicator
        >
          <View style={styles.stackSection}>{detailsSection}</View>
          <View style={styles.stackSection}>{paymentSection}</View>
        </ScrollView>
      ) : (
        <View style={styles.body}>
          {detailsSection}
          {paymentSection}
        </View>
      )}
    </View>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    ...Platform.select({
      web: {
        paddingTop: 48,
        paddingHorizontal: 16,
        paddingBottom: 32,
        overflowX: 'hidden' as any,
      },
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  header: {
    // removed header bar from payment page; keep styles in case re-used
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 8,
    gap: 16,
  },
  bodyColumn: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  detailsColumn: {
    flex: 1.4,
    backgroundColor: '#F5F5F5',
    minWidth: 0,
    flexShrink: 1,
  },
  detailsColumnNarrow: {
    width: '100%',
    backgroundColor: '#F5F5F5',
  },
  detailsContent: {
    padding: 16,
    paddingBottom: 32,
  },
  paymentColumn: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
    borderLeftWidth: 0,
    borderLeftColor: '#E5E7EB',
    minWidth: 0,
    flexShrink: 1,
  },
  paymentColumnNarrow: {
    width: '100%',
    marginTop: 16,
    padding: 0,
    backgroundColor: 'transparent',
    borderLeftWidth: 0,
  },
  stackSection: {
    width: '100%',
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  groundName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Platform.OS === 'web' ? '#dc8d3c' : '#2196F3',
  },
  notes: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  paymentCard: {
    marginBottom: 16,
  },
  paymentOptions: {
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  paymentOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentOptionBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  paymentOptionText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  payNowButton: {
    marginTop: 8,
    alignSelf: 'stretch',
  },
  backLink: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
    textAlign: 'center',
  },
});
