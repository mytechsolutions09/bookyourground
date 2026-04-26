import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert, Platform, useWindowDimensions, TextInput, Pressable, Animated, Alert as RNAlert, ActivityIndicator, Share, Modal } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { MapPin, Calendar, Clock, User, Users, Star, CheckCircle2, CreditCard, ShieldCheck, Info, ChevronLeft, Share2, Globe, FileText, Copy, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { BookingWithDetails } from '@/types';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { formatBookingSlotSummary } from '@/utils/bookingSlotFormat';
import { cricketTeamsLabelFromBooking } from '@/utils/cricketGround';
import { getBookingDisplayAmount } from '@/utils/bookingPricing';
import { useAuth } from '@/contexts/AuthContext';
import WebLayout from '@/components/web/WebLayout';
import Button from '@/components/ui/Button';

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const bookingId = Array.isArray(id) ? id[0] : id;
  const { user } = useAuth();
  
  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const [fadeAnim] = useState(new Animated.Value(0));
  
  const [copied, setCopied] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const isWeb = Platform.OS === 'web';
  const isDesktop = width > 900;

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      setLoading(true);
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
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      setBooking(data);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Error loading booking:', error);
      Alert.alert('Error', 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (isWeb) {
      navigator.clipboard?.writeText(bookingId);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!booking) return;
    try {
      const message = `Booking at ${booking.ground.name} on ${formatDate(booking.booking_date)} at ${formatBookingSlotSummary(booking.start_time, booking.end_time, booking.ground.pitch_type)}. Booking ID: #${bookingId.substring(0, 8).toUpperCase()}`;
      if (isWeb) {
        if (navigator.share) {
          await navigator.share({
            title: 'Booking Details',
            text: message,
            url: window.location.href,
          });
        } else {
          await navigator.clipboard.writeText(`${message}\n${window.location.href}`);
          alert('Booking details copied to clipboard!');
        }
      } else {
        await Share.share({
          message,
        });
      }
    } catch (error: any) {
      console.error('Error sharing:', error);
    }
  };

  const storedTotal = Number(booking?.total_amount || 0);
  const displayTotalAmount = useMemo(() => {
    if (storedTotal > 0) return storedTotal;
    return getBookingDisplayAmount(booking);
  }, [booking, storedTotal]);

  const cricketTeamsLabel = useMemo(() => {
    if (!booking) return null;
    return cricketTeamsLabelFromBooking(booking.ground.pitch_type, booking.notes);
  }, [booking]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#01C45A" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Booking not found.</Text>
        <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  const primaryImage = booking.ground.ground_images?.[0]?.image_url ||
    'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg?auto=compress&cs=tinysrgb&w=1200';

  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Hero */}
      <View style={styles.heroContainer}>
        <View style={styles.hero}>
          <Image source={{ uri: primaryImage }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={20} color="#FFF" />
          </Pressable>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
          </View>
          <View style={styles.heroBottom}>
            <View style={{ flex: 1, marginRight: 20 }}>
              <Text style={styles.groundTitle} numberOfLines={1}>{booking.ground.name}</Text>
              <View style={styles.groundSport}>
                <Globe size={12} color="#FFF" />
                <Text style={styles.sportText}>{booking.ground.pitch_type || 'Cricket'}</Text>
              </View>
            </View>
            <Pressable style={styles.bookingIdChip} onPress={handleCopy}>
              <Text style={styles.idLabel}>Booking ID</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.idValue}>#{bookingId.substring(0, 8).toUpperCase()}</Text>
                {copied ? <Check size={12} color="#01C45A" /> : <Copy size={12} color="rgba(255,255,255,0.6)" />}
              </View>
              {copied && <Text style={styles.copiedBadge}>Copied ✓</Text>}
            </Pressable>
          </View>
        </View>
      </View>

      {/* Body */}
      <View style={[styles.pageBody, isDesktop && styles.pageBodyDesktop]}>
        {/* Left Column */}
        <View style={styles.leftColumn}>
          {/* Slot Card */}
          <View style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.addressRow}>
                <MapPin size={14} color="#01C45A" />
                <Text style={styles.addressText}>{booking.ground.address}, {booking.ground.city}</Text>
              </View>
              <View style={styles.slotGrid}>
                <View style={styles.slotItem}>
                  <View style={styles.slotLabel}>
                    <Calendar size={11} color="#01C45A" strokeWidth={2.5} />
                    <Text style={styles.slotLabelText}>Date</Text>
                  </View>
                  <Text style={styles.slotValue}>{formatDate(booking.booking_date)}</Text>
                </View>
                <View style={styles.slotItem}>
                  <View style={styles.slotLabel}>
                    <Clock size={11} color="#01C45A" strokeWidth={2.5} />
                    <Text style={styles.slotLabelText}>Time slot</Text>
                  </View>
                  <Text style={styles.slotValue}>
                    {formatBookingSlotSummary(booking.start_time, booking.end_time, booking.ground.pitch_type)}
                  </Text>
                </View>
                <View style={styles.slotItem}>
                  <View style={styles.slotLabel}>
                    <Users size={11} color="#01C45A" strokeWidth={2.5} />
                    <Text style={styles.slotLabelText}>Teams</Text>
                  </View>
                  <Text style={styles.slotValue}>{cricketTeamsLabel || '1 Team'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Venue Rules */}
          <View style={styles.card}>
            <View style={styles.cardInner}>
              <Text style={styles.sectionTitle}>Venue rules</Text>
              {[
                "Please arrive 15 minutes before your slot.",
                "Proper footwear is mandatory for the pitch.",
                "Respect the ground staff and other players.",
                "No littering or smoking allowed inside the premises.",
              ].map((rule, i) => (
                <View key={i} style={styles.ruleItem}>
                  <View style={styles.ruleDot} />
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Right Column */}
        <View style={styles.rightColumn}>
          <View style={styles.card}>
            <View style={styles.cardInner}>
              <Text style={styles.sectionTitle}>Payment summary</Text>

              <View style={styles.summaryRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.summaryLabel}>Booking price</Text>
                  <View style={styles.teamTag}>
                    <Text style={styles.teamTagText}>{cricketTeamsLabel || '1 team'}</Text>
                  </View>
                </View>
                <Text style={styles.summaryValue}>₹{Number(displayTotalAmount).toLocaleString('en-IN')}.00</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Taxes & fees</Text>
                <Text style={styles.summaryValueMuted}>₹0.00</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Grand total</Text>
                <Text style={styles.totalValue}>₹{Number(displayTotalAmount).toLocaleString('en-IN')}.00</Text>
              </View>

              <View style={styles.paymentMethodCard}>
                <View style={styles.pmIcon}>
                  <CreditCard size={18} color="#5A6555" strokeWidth={1.5} />
                </View>
                <View>
                  <Text style={styles.pmLabel}>Payment method</Text>
                  <Text style={styles.pmValue}>{booking.payment_method === 'cash' ? 'Cash at Ground' : (booking.payment_method?.toUpperCase() || 'PAID ONLINE')}</Text>
                </View>
              </View>

              <View style={styles.secureNote}>
                <ShieldCheck size={12} color="#01C45A" strokeWidth={2} />
                <Text style={styles.secureNoteText}>Secure booking via Book Your Ground</Text>
              </View>
            </View>
          </View>

          <Pressable style={[styles.actionBtn, styles.btnOutline]} onPress={handleShare}>
            <Share2 size={14} color="#01A34B" strokeWidth={2} />
            <Text style={styles.btnOutlineText}>Share booking</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, styles.btnSolid]} onPress={() => setReceiptOpen(true)}>
            <FileText size={14} color="#FFF" strokeWidth={2} />
            <Text style={styles.btnSolidText}>View receipt</Text>
          </Pressable>
        </View>
      </View>

      {/* Receipt Modal */}
      <Modal visible={receiptOpen} transparent animationType="fade" onRequestClose={() => setReceiptOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setReceiptOpen(false)}>
          <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>
            <View style={styles.receiptHeader}>
              <View>
                <Text style={styles.receiptHeaderSub}>Booking confirmed</Text>
                <Text style={styles.receiptTitle}>Book Your Ground</Text>
              </View>
              <View style={styles.receiptCheck}>
                <CheckCircle2 size={18} color="#FFF" strokeWidth={2.5} />
              </View>
            </View>
            <View style={styles.receiptBody}>
              {[
                ["Ground", booking.ground.name],
                ["Booking ID", `#${bookingId.substring(0, 8).toUpperCase()}`],
                ["Date", formatDate(booking.booking_date)],
                ["Slot", formatBookingSlotSummary(booking.start_time, booking.end_time, booking.ground.pitch_type)],
                ["Teams", cricketTeamsLabel || '1 Team'],
                ["Payment", booking.payment_method === 'cash' ? 'Cash at Ground' : 'Online'],
                ["Amount", `₹${Number(displayTotalAmount).toLocaleString('en-IN')}.00`],
              ].map(([k, v]) => (
                <View key={k} style={styles.receiptRow}>
                  <Text style={styles.receiptKey}>{k}</Text>
                  <Text style={styles.receiptVal}>{v}</Text>
                </View>
              ))}
              <Pressable style={styles.closeBtn} onPress={() => setReceiptOpen(false)}>
                <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {isWeb ? <WebLayout noCard>{content}</WebLayout> : content}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6F0',
  },
  loadingText: {
    fontSize: 16,
    color: '#8A9580',
    fontFamily: 'Inter',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  heroContainer: {
    width: '100%',
    backgroundColor: '#000',
    alignItems: 'center',
  },
  hero: {
    height: Platform.OS === 'web' ? 380 : 300,
    width: '100%',
    maxWidth: 1200,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backBtn: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#01C45A',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    fontFamily: 'Inter',
  },
  heroBottom: {
    position: 'absolute',
    bottom: 20,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  groundTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    fontFamily: 'Inter',
    letterSpacing: -0.5,
  },
  groundSport: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  sportText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  bookingIdChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'flex-end',
  },
  idLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  idValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
    fontFamily: 'monospace',
  },
  copiedBadge: {
    position: 'absolute',
    bottom: -18,
    right: 0,
    fontSize: 10,
    color: '#01C45A',
    fontWeight: '700',
  },
  pageBody: {
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    padding: 24,
    gap: 20,
  },
  pageBodyDesktop: {
    flexDirection: 'row',
  },
  leftColumn: {
    flex: 1,
    gap: 16,
  },
  rightColumn: {
    width: Platform.OS === 'web' ? 340 : '100%',
    gap: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDE4',
    overflow: 'hidden',
  },
  cardInner: {
    padding: 22,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  addressText: {
    fontSize: 12,
    color: '#7A8575',
    flex: 1,
    fontFamily: 'Inter',
  },
  slotGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  slotItem: {
    flex: 1,
    backgroundColor: '#F4F6F0',
    padding: 12,
    borderRadius: 12,
  },
  slotLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  slotLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A9580',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  slotValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2215',
    fontFamily: 'Inter',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A9580',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
    fontFamily: 'Inter',
  },
  ruleItem: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3EC',
  },
  ruleDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#01C45A',
    marginTop: 6,
  },
  ruleText: {
    fontSize: 13,
    color: '#3A4535',
    lineHeight: 18,
    fontFamily: 'Inter',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#7A8575',
    fontFamily: 'Inter',
  },
  teamTag: {
    backgroundColor: '#F4F6F0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  teamTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5A6555',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A2215',
  },
  summaryValueMuted: {
    fontSize: 13,
    color: '#B0B8AA',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEF1EA',
    marginVertical: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2215',
    fontFamily: 'Inter',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#01A34B',
    letterSpacing: -0.5,
    fontFamily: 'Inter',
  },
  paymentMethodCard: {
    backgroundColor: '#F4F6F0',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 16,
  },
  pmIcon: {
    width: 36,
    height: 36,
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E5DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pmLabel: {
    fontSize: 10,
    color: '#8A9580',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  pmValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2215',
  },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  secureNoteText: {
    fontSize: 11,
    color: '#8A9580',
    fontFamily: 'Inter',
  },
  actionBtn: {
    width: '100%',
    padding: 13,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: '#01C45A',
  },
  btnOutlineText: {
    color: '#01A34B',
    fontSize: 13,
    fontWeight: '700',
  },
  btnSolid: {
    backgroundColor: '#01C45A',
    borderWidth: 1.5,
    borderColor: '#01C45A',
    shadowColor: '#01C45A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 4,
  },
  btnSolidText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
  },
  receiptHeader: {
    backgroundColor: '#01C45A',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptHeaderSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    fontFamily: 'Inter',
  },
  receiptCheck: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptBody: {
    padding: 20,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3EC',
  },
  receiptKey: {
    fontSize: 12,
    color: '#8A9580',
    fontFamily: 'Inter',
  },
  receiptVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A2215',
    fontFamily: 'monospace',
  },
  closeBtn: {
    backgroundColor: '#F4F6F0',
    padding: 13,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#3A4535',
    fontSize: 13,
    fontWeight: '700',
  },
});

