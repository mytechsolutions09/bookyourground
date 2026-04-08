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
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import Button from '@/components/ui/Button';

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user, profile: userProfile } = useAuth();
  
  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const { width } = useWindowDimensions();
  const Section = View;


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
  const IS_DARK = !isWeb || (width < 900);

  const detailsSection = (
    <View style={isNarrow ? styles.detailsColumnNarrow : styles.detailsColumn}>
      <View style={isWeb ? [styles.detailsContentWeb, !IS_DARK && styles.detailsContentWebLight] : styles.detailsContentMobileOuter}>
        <View style={isWeb ? styles.detailsBodyWeb : styles.detailsBodyNative}>
          <Section style={[styles.sectionHeaderCard, !IS_DARK && styles.sectionHeaderCardLight]}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.badgeRow}>
                   <View style={[
                    styles.statusBadge,
                    booking.status === 'confirmed' && styles.statusBadgeConfirmed,
                    booking.status === 'pending' && styles.statusBadgePending,
                    (booking.status === 'cancelled' || booking.status === 'rejected') && styles.statusBadgeCancelled,
                  ]}>
                    <Text style={[
                      styles.statusText,
                      booking.status === 'confirmed' && (IS_DARK ? styles.statusTextConfirmed : styles.statusTextConfirmedLight),
                      booking.status === 'pending' && styles.statusTextPending,
                      (booking.status === 'cancelled' || booking.status === 'rejected') && styles.statusTextCancelled,
                    ]}>
                      {booking.status === 'confirmed' ? 'ACTIVE' : booking.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.bookingId, !IS_DARK && styles.bookingIdLight]}>ID: {id?.toString().substring(0,8).toUpperCase()}</Text>
                </View>

                <Text style={[styles.groundName, !IS_DARK && styles.groundNameLight]}>{booking.ground.name}</Text>
                <View style={[styles.locationRow, { marginTop: 4 }]}>
                  <MapPin size={16} color={IS_DARK ? "#00ea6b" : "#10b981"} />
                  <Text style={[styles.location, !IS_DARK && styles.locationLight]}>
                    {booking.ground.address}, {booking.ground.city}, {booking.ground.state}
                  </Text>
                </View>
              </View>
            </View>
          </Section>

          <View style={[styles.infoGrid, !isNarrow && styles.infoGridDesktop]}>
            <Section style={[styles.infoCard, !IS_DARK && styles.infoCardLight]}>
              <View style={styles.infoIconBox}>
                <Calendar size={20} color={IS_DARK ? "#00ea6b" : "#10b981"} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, !IS_DARK && styles.infoLabelLight]}>Date</Text>
                <Text style={[styles.infoValue, !IS_DARK && styles.infoValueLight]}>{formatDate(booking.booking_date)}</Text>
              </View>
            </Section>

            <Section style={[styles.infoCard, !IS_DARK && styles.infoCardLight]}>
              <View style={styles.infoIconBox}>
                <Clock size={20} color={IS_DARK ? "#00ea6b" : "#10b981"} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, !IS_DARK && styles.infoLabelLight]}>Time Slot</Text>
                <Text style={[styles.infoValue, !IS_DARK && styles.infoValueLight]}>
                  {formatBookingSlotSummary(
                    booking.start_time,
                    booking.end_time,
                    booking.ground.pitch_type,
                  )}
                </Text>
              </View>
            </Section>


          </View>



          <Section style={[styles.section, !IS_DARK && styles.sectionLight, { marginTop: 16 }]}>
             <Text style={[styles.sectionTitle, !IS_DARK && styles.sectionTitleLight]}>Venue Rules</Text>
             <View style={styles.rulesList}>
                <Text style={[styles.ruleItem, !IS_DARK && styles.ruleItemLight]}>• Please arrive 15 minutes before your slot.</Text>
                <Text style={[styles.ruleItem, !IS_DARK && styles.ruleItemLight]}>• Proper footwear is mandatory for the pitch.</Text>
                <Text style={[styles.ruleItem, !IS_DARK && styles.ruleItemLight]}>• Respect the ground staff and other players.</Text>
             </View>
          </Section>
        </View>
      </View>
    </View>
  );

  const isBoxCricket = (booking.ground.pitch_type ?? '').toLowerCase().includes('box');

  const paymentSection = (
    <View style={isNarrow ? styles.paymentColumnNarrow : styles.paymentColumn}>
      <Section style={[styles.paymentCard, !IS_DARK && styles.paymentCardLight]}>
        <Text style={[styles.paymentTitle, !IS_DARK && styles.paymentTitleLight]}>Payment Summary</Text>
        
        <View style={styles.priceBreakdown}>
           <View style={styles.paymentRow}>
              <Text style={[styles.paymentLabel, !IS_DARK && styles.paymentLabelLight]}>Base Price</Text>
              <Text style={[styles.paymentValue, !IS_DARK && styles.paymentValueLight]}>{formatCurrency(booking.total_amount)}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={[styles.paymentLabel, !IS_DARK && styles.paymentLabelLight]}>Taxes & Fees</Text>
              <Text style={[styles.paymentValue, !IS_DARK && styles.paymentValueLight]}>₹0.00</Text>
            </View>
        </View>

        <View style={[styles.paymentRow, styles.totalRow, !IS_DARK && styles.totalRowLight]}>
          <Text style={[styles.totalLabel, !IS_DARK && styles.totalLabelLight]}>Grand Total</Text>
          <Text style={[styles.totalValue, !IS_DARK && styles.totalValueLight]}>{formatCurrency(booking.total_amount)}</Text>
        </View>

        <View style={styles.paymentDivider} />

        {booking.payment_method && (
          <View style={styles.infoRow}>
             <Clock size={16} color={IS_DARK ? "#9ca3af" : "#6B7280"} />
             <View>
                <Text style={[styles.infoLabel, !IS_DARK && styles.infoLabelLight]}>Payment Method</Text>
                <Text style={[styles.paymentValue, !IS_DARK && styles.paymentValueLight]}>
                  {booking.payment_method === 'cash' ? 'Cash at Ground' : 'Prepaid Online'}
                </Text>
             </View>
          </View>
        )}
      </Section>

    </View>
  );

  const content = (
    <ScrollView
      style={[styles.container, !IS_DARK && styles.webContainerRoot]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator
    >
      <View style={isNarrow ? styles.narrowWrapper : styles.wideWrapper}>
         <Image source={{ uri: primaryImage }} style={[styles.image, !isWeb && styles.imageMobile, !IS_DARK && styles.imageWeb, { width: '100%' }]} />

         <View style={isNarrow ? styles.bodyColumn : styles.body}>
           {detailsSection}
           {paymentSection}
         </View>
      </View>
    </ScrollView>
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
    backgroundColor: '#043529',
  },
  webContainerRoot: {
    backgroundColor: '#F8F9FA',
    paddingTop: 40,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#043529',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  wideWrapper: {
     maxWidth: 1100,
     width: '100%',
     alignSelf: 'center',
  },
  narrowWrapper: {
     width: '100%',
  },
  body: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 24,
  },
  bodyColumn: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  detailsColumn: {
    flex: 1.6,
  },
  detailsColumnNarrow: {
    width: '100%',
  },
  detailsContentWeb: {
    padding: 0,
  },
  detailsContentWebLight: {
    backgroundColor: 'transparent',
  },
  image: {
    width: '100%',
    height: 380,
    borderRadius: 24,
    marginBottom: 24,
  },
  imageWeb: {
     height: 450,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 10 },
     shadowOpacity: 0.1,
     shadowRadius: 20,
  },
  imageMobile: {
    borderRadius: 0,
    height: 250,
  },
  detailsBodyWeb: {
    width: '100%',
  },
  detailsBodyNative: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeaderCard: {
    backgroundColor: '#06392e',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.15)',
    marginBottom: 24,
  },
  sectionHeaderCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  bookingId: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 1,
  },
  bookingIdLight: {
    color: '#6B7280',
  },
  groundName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  groundNameLight: {
    color: '#111827',
    fontSize: 28,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  location: {
    fontSize: 15,
    color: '#9ca3af',
    lineHeight: 22,
  },
  locationLight: {
    color: '#4B5563',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(156,163,175,0.1)',
  },
  statusBadgeConfirmed: {
    backgroundColor: 'rgba(0,234,107,0.12)',
  },
  statusBadgePending: {
    backgroundColor: 'rgba(255,193,7,0.12)',
  },
  statusBadgeCancelled: {
    backgroundColor: 'rgba(244,67,54,0.12)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#9ca3af',
  },
  statusTextConfirmed: { color: '#00ea6b' },
  statusTextConfirmedLight: { color: '#10b981' },
  statusTextPending: { color: '#FFC107' },
  statusTextCancelled: { color: '#F44336' },

  infoGrid: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     gap: 16,
  },
  infoGridDesktop: {
     flexWrap: 'nowrap',
  },
  infoCard: {
     flex: 1,
     minWidth: 150,
     backgroundColor: '#06392e',
     borderRadius: 20,
     padding: 20,
     flexDirection: 'row',
     alignItems: 'center',
     gap: 16,
     borderWidth: 1,
     borderColor: 'rgba(0,234,107,0.1)',
  },
  infoCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  infoIconBox: {
     width: 44,
     height: 44,
     borderRadius: 12,
     backgroundColor: 'rgba(0,234,107,0.08)',
     alignItems: 'center',
     justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoLabelLight: { color: '#6B7280' },
  infoValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  infoValueLight: { color: '#111827' },

  section: {
    backgroundColor: '#06392e',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.1)',
  },
  sectionLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00ea6b',
    marginBottom: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionTitleLight: { color: '#10b981' },
  
  notes: {
    fontSize: 15,
    color: '#e5e7eb',
    lineHeight: 24,
  },
  notesLight: { color: '#374151' },

  rulesList: { gap: 10 },
  ruleItem: { fontSize: 14, color: '#9ca3af', lineHeight: 20 },
  ruleItemLight: { color: '#4B5563' },

  paymentColumn: {
    flex: 1,
  },
  paymentCard: {
    backgroundColor: '#06392e',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  paymentCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  paymentTitle: {
     fontSize: 18,
     fontWeight: '800',
     color: '#FFFFFF',
     marginBottom: 20,
  },
  paymentTitleLight: { color: '#111827' },
  priceBreakdown: { marginBottom: 20 },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  paymentLabel: { fontSize: 14, color: '#9ca3af' },
  paymentLabelLight: { color: '#6B7280' },
  paymentValue: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
  paymentValueLight: { color: '#111827' },
  
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    marginTop: 10,
    paddingTop: 20,
  },
  totalRowLight: { borderTopColor: '#F3F4F6' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  totalLabelLight: { color: '#111827' },
  totalValue: { fontSize: 28, fontWeight: '900', color: '#00ea6b' },
  totalValueLight: { color: '#10b981' },
  
  paymentDivider: {
     height: 1,
     backgroundColor: 'rgba(255,255,255,0.05)',
     marginVertical: 20,
  },

  backButtonLarge: {
     marginTop: 24,
     height: 56,
     borderRadius: 16,
     backgroundColor: '#111827',
  },
  backButtonTextLarge: {
     fontSize: 14,
     fontWeight: '800',
     letterSpacing: 2,
  },
  detailsContentMobileOuter: {
    padding: 0,
  },
  paymentColumnNarrow: {
    width: '100%',
    marginTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stackSection: {
    width: '100%',
  },
});
