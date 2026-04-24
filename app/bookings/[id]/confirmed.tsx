import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Image, Animated, ActivityIndicator, Alert } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { CheckCircle2, Calendar, Clock, MapPin, Ticket, CreditCard, ChevronRight, Share2, Download } from 'lucide-react-native';
import WebLayout from '@/components/web/WebLayout';
import Button from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { BookingWithDetails } from '@/types';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { formatBookingSlotSummary } from '@/utils/bookingSlotFormat';
import { cricketTeamsLabelFromBooking } from '@/utils/cricketGround';

export default function BookingConfirmedPage() {
  const { id } = useLocalSearchParams();
  const bookingId = Array.isArray(id) ? id[0] : id;
  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(
            `
            *,
            ground:grounds(
              *,
              ground_images(*)
            )
          `,
          )
          .eq('id', bookingId)
          .single();

        if (error) throw error;
        setBooking(data);
        
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      } catch (error: any) {
        console.error('Error loading confirmed booking:', error);
        Alert.alert('Error', 'Failed to load booking details: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const teamsLabel = useMemo(() => {
    if (!booking || !booking.ground) return null;
    try {
      return cricketTeamsLabelFromBooking(booking.ground.pitch_type, booking.notes);
    } catch (e) {
      console.warn('Error calculating teams label:', e);
      return null;
    }
  }, [booking]);

  const originalAmount = booking ? (Number(booking.total_amount) + Number(booking.discount_amount || 0)) : 0;
  const discountAmount = booking ? Number(booking.discount_amount || 0) : 0;
  const finalAmount = booking ? Number(booking.total_amount) : 0;

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={[styles.loadingText, { marginTop: 12 }]}>Loading your confirmation...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.loadingBox}>
        <Text style={styles.loadingText}>Booking not found.</Text>
        <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  const body = (
    <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
      <View style={styles.successHeader}>
        <View style={styles.iconContainer}>
          <View style={styles.iconPulse} />
          <CheckCircle2 size={64} color="#10b981" />
        </View>
        <Text style={styles.successTitle}>Booking Confirmed!</Text>
        <Text style={styles.successSubtitle}>
          Your ground has been reserved successfully. We've sent a confirmation to your email.
        </Text>
      </View>

      <View style={styles.receiptCard}>
        {/* Ground Image & Basic Info */}
        <View style={styles.groundInfoSection}>
          <Image 
            source={{ uri: booking?.ground?.ground_images?.[0]?.image_url || 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop' }} 
            style={styles.groundThumb}
          />
          <View style={styles.groundTextInfo}>
            <Text style={styles.groundName}>{booking?.ground?.name}</Text>
            <View style={styles.locationRow}>
              <MapPin size={14} color="#64748b" />
              <Text style={styles.locationText}>{booking?.ground?.city}, {booking?.ground?.state}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Booking Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <View style={styles.detailIconWrapper}>
              <Calendar size={18} color="#0f172a" />
            </View>
            <View>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(booking?.booking_date)}</Text>
            </View>
          </View>
          
          <View style={styles.detailItem}>
            <View style={styles.detailIconWrapper}>
              <Clock size={18} color="#0f172a" />
            </View>
            <View>
              <Text style={styles.detailLabel}>Time Slot</Text>
              <Text style={styles.detailValue}>
                {formatBookingSlotSummary(
                  booking?.start_time,
                  booking?.end_time,
                  booking?.ground?.pitch_type,
                )}
              </Text>
            </View>
          </View>

          {teamsLabel && (
            <View style={[styles.detailItem, { flexBasis: '100%' }]}>
              <View style={styles.detailIconWrapper}>
                <Ticket size={18} color="#0f172a" />
              </View>
              <View>
                <Text style={styles.detailLabel}>Match Type</Text>
                <Text style={styles.detailValue}>{teamsLabel}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Price Breakdown */}
        <View style={styles.priceSection}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Booking Price</Text>
            <Text style={styles.priceValue}>{formatCurrency(originalAmount)}</Text>
          </View>
          
          {discountAmount > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Discount Applied</Text>
              <Text style={styles.discountValue}>-{formatCurrency(discountAmount)}</Text>
            </View>
          )}
          
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>{formatCurrency(finalAmount)}</Text>
          </View>

          <View style={styles.paymentMethod}>
            <CreditCard size={14} color="#64748b" />
            <Text style={styles.paymentMethodText}>
              Paid via {booking?.payment_method?.toUpperCase() || 'ONLINE'}
            </Text>
          </View>
        </View>

        {/* Booking ID Footer */}
        <View style={styles.receiptFooter}>
          <Text style={styles.bookingIdLabel}>Booking ID</Text>
          <Text style={styles.bookingIdValue}>#{booking?.id?.substring(0, 8).toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title="View My Bookings"
          onPress={() => router.replace('/(tabs)/bookings' as any)}
          fullWidth
          size="large"
          style={styles.primaryButton}
        />
        <Button
          title="Book Another Ground"
          variant="outline"
          onPress={() => router.replace('/book-my-ground' as any)}
          fullWidth
          size="large"
          style={styles.secondaryButton}
          textStyle={styles.secondaryButtonText}
        />
      </View>

      <View style={styles.supportLink}>
        <Text style={styles.supportText}>Need help with your booking? </Text>
        <Text style={styles.supportAction}>Contact Support</Text>
      </View>
    </Animated.View>
  );

  const content = (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {body}
    </ScrollView>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      {Platform.OS === 'web' ? <WebLayout>{content}</WebLayout> : content}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  loadingBox: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  mainContent: {
    width: '100%',
    alignItems: 'center',
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  iconPulse: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10b981',
    opacity: 0.1,
    transform: [{ scale: 1.2 }],
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 400,
  },
  receiptCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  groundInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  groundThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  groundName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    width: '100%',
    marginVertical: 20,
    borderStyle: 'dashed',
    borderRadius: 1,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexBasis: '45%',
  },
  detailIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '600',
  },
  priceSection: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 15,
    color: '#64748b',
  },
  priceValue: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  discountValue: {
    fontSize: 15,
    color: '#10b981',
    fontWeight: '600',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10b981',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 6,
    fontWeight: '500',
  },
  receiptFooter: {
    marginTop: 24,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
  },
  bookingIdLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  bookingIdValue: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '700',
    letterSpacing: 1,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    height: 56,
  },
  secondaryButton: {
    borderColor: '#e2e8f0',
    borderRadius: 16,
    height: 56,
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  supportLink: {
    flexDirection: 'row',
    marginTop: 32,
    alignItems: 'center',
  },
  supportText: {
    fontSize: 14,
    color: '#64748b',
  },
  supportAction: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

