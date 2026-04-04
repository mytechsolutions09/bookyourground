import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert, Platform, useWindowDimensions } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { MapPin, Calendar, Clock, User, Users } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { BookingWithDetails } from '@/types';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { formatBookingSlotSummary } from '@/utils/bookingSlotFormat';
import { hoursBetweenBooked, normalizeDbTimeToHHMM } from '@/utils/bookingSlots';
import { cricketTeamsLabelFromBooking } from '@/utils/cricketGround';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const Section = Platform.OS === 'web' ? Card : View;

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

  const durationHoursLabel = useMemo(() => {
    if (!booking) return '';
    const st = normalizeDbTimeToHHMM(booking.start_time);
    const et = normalizeDbTimeToHHMM(booking.end_time);
    if (st && et) {
      const h = hoursBetweenBooked(st, et);
      if (h != null && Number.isFinite(h) && h > 0) {
        return `${Math.round(h * 100) / 100}`;
      }
    }
    return String(booking.total_hours ?? '');
  }, [booking]);

  if (loading || !booking) {
    const loadingContent = (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );

    return (
      <>
        <Stack.Screen options={{ title: 'Booking' }} />
        {Platform.OS === 'web' ? <WebLayout>{loadingContent}</WebLayout> : loadingContent}
      </>
    );
  }

  const primaryImage = booking.ground.ground_images?.[0]?.image_url ||
    'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';

  const isNarrow = width < 900;



  const cricketTeamsLabel = cricketTeamsLabelFromBooking(
    booking.ground.pitch_type,
    booking.notes,
  );

  const isWeb = Platform.OS === 'web';

  const detailsSection = (
    // Left: booking details
    <View style={isNarrow ? styles.detailsColumnNarrow : styles.detailsColumn}>
      <View style={isWeb ? styles.detailsContentWeb : styles.detailsContentMobileOuter}>
        <Image source={{ uri: primaryImage }} style={[styles.image, !isWeb && styles.imageMobile]} />

        <View style={isWeb ? styles.detailsBodyWeb : styles.detailsBodyNative}>
          <Section style={styles.sectionHeaderCard}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.groundName}>{booking.ground.name}</Text>
                <View style={styles.locationRow}>
                  <MapPin size={14} color="#00ea6b" />
                  <Text style={styles.location}>
                    {booking.ground.city}, {booking.ground.state}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.statusBadge,
                booking.status === 'confirmed' && styles.statusBadgeConfirmed,
                booking.status === 'pending' && styles.statusBadgePending,
                (booking.status === 'cancelled' || booking.status === 'rejected') && styles.statusBadgeCancelled,
              ]}>
                <Text style={[
                  styles.statusText,
                  booking.status === 'confirmed' && styles.statusTextConfirmed,
                  booking.status === 'pending' && styles.statusTextPending,
                  (booking.status === 'cancelled' || booking.status === 'rejected') && styles.statusTextCancelled,
                ]}>
                  {booking.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </Section>

          <Section style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Information</Text>
            <View style={styles.infoRow}>
              <Calendar size={18} color="#00ea6b" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{formatDate(booking.booking_date)}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Clock size={18} color="#00ea6b" />
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
              <Clock size={18} color="#00ea6b" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>{durationHoursLabel} hours</Text>
              </View>
            </View>
            {cricketTeamsLabel ? (
              <View style={styles.infoRow}>
                <Users size={18} color="#00ea6b" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Teams</Text>
                  <Text style={styles.infoValue}>{cricketTeamsLabel}</Text>
                </View>
              </View>
            ) : null}
          </Section>

          {booking.notes && (
            <Section style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notes}>{booking.notes}</Text>
            </Section>
          )}
        </View>
      </View>
    </View>
  );

  const isBoxCricket = (booking.ground.pitch_type ?? '').toLowerCase().includes('box');

  const paymentSection = (
    <View style={isNarrow ? styles.paymentColumnNarrow : styles.paymentColumn}>
      <Section style={styles.paymentCard}>
        <Text style={styles.sectionTitle}>Payment Summary</Text>
        {(Platform.OS === 'web' || isBoxCricket) && (
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>
              {isBoxCricket ? 'Price per hour' : 'Price per match'}
            </Text>
            <Text style={styles.paymentValue}>{formatCurrency(booking.price_per_hour)}</Text>
          </View>
        )}
        {isBoxCricket && (
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Total hours</Text>
            <Text style={styles.paymentValue}>{durationHoursLabel}</Text>
          </View>
        )}
        <View style={[styles.paymentRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>{formatCurrency(booking.total_amount)}</Text>
        </View>
      </Section>

      <Text
        style={styles.backLink}
        onPress={() => {
          if (router.canGoBack?.()) router.back();
          else router.push('/book-my-ground' as any);
        }}
      >
        Go back
      </Text>
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

  return (
    <>
      <Stack.Screen options={{ title: booking.ground.name ?? 'Booking' }} />
      {Platform.OS === 'web' ? <WebLayout>{content}</WebLayout> : content}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...Platform.select({
      web: {
        backgroundColor: '#F5F5F5',
        paddingTop: 48,
        paddingHorizontal: 16,
        paddingBottom: 32,
        overflowX: 'hidden' as any,
      },
      default: {
        backgroundColor: '#043529',
      },
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    ...Platform.select({
      web: { backgroundColor: '#F5F5F5' },
      default: { backgroundColor: '#043529' },
    }),
  },
  blockedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
    textAlign: 'center',
  },
  blockedSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
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
    ...Platform.select({
      web: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 32,
      },
      default: {
        paddingHorizontal: 0,
        paddingTop: 0,
        paddingBottom: 16,
      },
    }),
  },
  detailsColumn: {
    flex: 1.4,
    ...Platform.select({
      web: { backgroundColor: '#F5F5F5' },
      default: { backgroundColor: '#043529' },
    }),
    minWidth: 0,
    flexShrink: 1,
  },
  detailsColumnNarrow: {
    width: '100%',
    ...Platform.select({
      web: { backgroundColor: '#F5F5F5' },
      default: { backgroundColor: '#043529' },
    }),
  },
  detailsContentWeb: {
    padding: 16,
    paddingBottom: 32,
  },
  detailsContentMobileOuter: {
    padding: 0,
  },
  detailsBodyWeb: {
    alignSelf: 'stretch',
  },
  detailsBodyNative: {
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
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
    backgroundColor: 'transparent',
    borderLeftWidth: 0,
    ...Platform.select({
      web: { padding: 0 },
      default: { paddingHorizontal: 16, paddingBottom: 0 },
    }),
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
  /** Native: full-bleed under stack header, no side padding / rounding */
  section: {
    marginBottom: 16,
    ...Platform.select({
      default: {
        backgroundColor: '#06392e',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,234,107,0.12)',
      },
    }),
  },
  sectionHeaderCard: {
    marginBottom: 20,
    ...Platform.select({
      default: {
        backgroundColor: '#06392e',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,234,107,0.2)',
      },
      web: {
        marginBottom: 16,
      }
    }),
  },
  imageMobile: {
    borderRadius: 0,
    marginBottom: 0,
    height: 200,
  },
  groundName: {
    fontSize: 24,
    fontWeight: '700',
    color:Platform.OS === 'web' ? '#212121' : '#FFFFFF',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 13,
    color: Platform.OS === 'web' ? '#666' : '#9ca3af',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(156,163,175,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(156,163,175,0.2)',
  },
  statusBadgeConfirmed: {
    backgroundColor: 'rgba(0,234,107,0.12)',
    borderColor: 'rgba(0,234,107,0.3)',
  },
  statusBadgePending: {
    backgroundColor: 'rgba(255,193,7,0.12)',
    borderColor: 'rgba(255,193,7,0.3)',
  },
  statusBadgeCancelled: {
    backgroundColor: 'rgba(244,67,54,0.12)',
    borderColor: 'rgba(244,67,54,0.3)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#9ca3af',
  },
  statusTextConfirmed: {
    color: '#00ea6b',
  },
  statusTextPending: {
    color: '#FFC107',
  },
  statusTextCancelled: {
    color: '#F44336',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Platform.OS === 'web' ? '#212121' : '#00ea6b',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    color: Platform.OS === 'web' ? '#666' : '#9ca3af',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: Platform.OS === 'web' ? '#333' : '#FFFFFF',
    fontWeight: '600',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: Platform.OS === 'web' ? '#666' : '#9ca3af',
  },
  paymentValue: {
    fontSize: 14,
    color: Platform.OS === 'web' ? '#333' : '#FFFFFF',
    fontWeight: '600',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Platform.OS === 'web' ? '#212121' : '#FFFFFF',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Platform.OS === 'web' ? '#dc8d3c' : '#00ea6b',
  },
  notes: {
    fontSize: 14,
    color: Platform.OS === 'web' ? '#666' : '#FFFFFF',
    lineHeight: 22,
    opacity: 0.9,
  },
  paymentCard: {
    marginBottom: 16,
    ...Platform.select({
      default: {
        backgroundColor: '#06392e',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,234,107,0.15)',
      }
    })
  },
  backLink: {
    marginTop: 24,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    ...Platform.select({
      web: {
        color: '#2563EB',
      },
      default: {
        color: '#043529',
        backgroundColor: '#00ea6b',
        borderWidth: 1,
        borderColor: '#00ea6b',
      },
    }),
  },
});
