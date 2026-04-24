import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert, Platform, useWindowDimensions, TextInput, Pressable, Animated, Alert as RNAlert, ActivityIndicator } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { MapPin, Calendar, Clock, User, Users, Star, CheckCircle2, CreditCard, ShieldCheck, Info, ChevronLeft, Share2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { BookingWithDetails } from '@/types';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { formatBookingSlotSummary } from '@/utils/bookingSlotFormat';
import { cricketTeamsLabelFromBooking } from '@/utils/cricketGround';
import { getBookingDisplayAmount } from '@/utils/bookingPricing';
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const bookingId = Array.isArray(id) ? id[0] : id;
  const { user, profile: userProfile } = useAuth();
  
  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const [fadeAnim] = useState(new Animated.Value(0));
  
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const isWeb = Platform.OS === 'web';
  const isDesktop = width > 1024;
  const isTablet = width > 768;

  useEffect(() => {
    if (bookingId) {
      loadBooking();
      fetchReview();
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

  const fetchReview = async () => {
    if (!bookingId || !user) return;
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, comment')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setExistingReviewId(data.id);
        setReviewRating(data.rating || 5);
        setReviewComment(data.comment || '');
      }
    } catch (e) {
      console.warn('Error fetching review:', e);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      const msg = 'Please log in to submit a review.';
      if (isWeb) alert(msg);
      else RNAlert.alert('Login Required', msg);
      return;
    }
    if (!booking) return;

    try {
      setSubmittingReview(true);
      if (existingReviewId) {
        const { error } = await supabase
          .from('reviews')
          .update({
            rating: reviewRating,
            comment: reviewComment.trim() || null,
          })
          .eq('id', existingReviewId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reviews')
          .insert({
            user_id: user.id,
            ground_id: booking.ground_id,
            booking_id: bookingId,
            rating: reviewRating,
            comment: reviewComment.trim() || null,
          });
        if (error) throw error;
      }
      
      setSuccessModalVisible(true);
      await fetchReview();
    } catch (e: any) {
      console.error('Error saving review:', e);
      const errMsg = e.message || 'Failed to save review';
      if (isWeb) alert(errMsg);
      else RNAlert.alert('Error', errMsg);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Priority: Use the actual stored amount from the DB if available (> 0), 
  // otherwise fall back to the utility's recalculation logic (mostly for drafts).
  const storedTotal = Number(booking?.total_amount || 0);
  const discountAmount = Number(booking?.discount_amount || 0);
  
  const displayTotalAmount = useMemo(() => {
    if (storedTotal > 0) return storedTotal;
    return getBookingDisplayAmount(booking);
  }, [booking, storedTotal]);

  const originalAmount = useMemo(() => {
    // If we have a stored total, the original price is total + discount
    if (storedTotal > 0) return storedTotal + discountAmount;
    // Fallback to utility recalculation
    return getBookingDisplayAmount(booking) + discountAmount;
  }, [booking, storedTotal, discountAmount]);
  
  const isPastBooking = useMemo(() => {
    if (!booking) return false;
    const today = new Date().toISOString().split('T')[0];
    return booking.booking_date < today;
  }, [booking]);

  const cricketTeamsLabel = useMemo(() => {
    if (!booking) return null;
    return cricketTeamsLabelFromBooking(booking.ground.pitch_type, booking.notes);
  }, [booking]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={[styles.loadingText, { marginTop: 12 }]}>Loading details...</Text>
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
    'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1200&auto=format&fit=crop';

  const content = (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={[styles.mainWrapper, { opacity: fadeAnim }]}>
        {/* Banner Section */}
        <View style={styles.bannerContainer}>
          <Image source={{ uri: primaryImage }} style={styles.bannerImage} />
          <View style={styles.bannerOverlay}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color="#FFF" />
            </Pressable>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>{booking.status === 'confirmed' ? (isPastBooking ? 'COMPLETED' : 'UPCOMING') : booking.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.contentLayout, isDesktop && styles.contentLayoutDesktop]}>
          {/* Main Details Column */}
          <View style={styles.detailsColumn}>
            <Card style={styles.mainInfoCard}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groundName}>{booking.ground.name}</Text>
                  <View style={styles.locationRow}>
                    <MapPin size={16} color="#64748b" />
                    <Text style={styles.locationText}>{booking.ground.address}, {booking.ground.city}</Text>
                  </View>
                </View>
                <View style={styles.bookingIdBox}>
                   <Text style={styles.bookingIdLabel}>BOOKING ID</Text>
                   <Text style={styles.bookingIdValue}>#{bookingId.substring(0, 8).toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <View style={styles.infoIconWrapper}>
                    <Calendar size={20} color="#10b981" />
                  </View>
                  <View>
                    <Text style={styles.infoItemLabel}>Date</Text>
                    <Text style={styles.infoItemValue}>{formatDate(booking.booking_date)}</Text>
                  </View>
                </View>
                <View style={styles.infoItem}>
                  <View style={styles.infoIconWrapper}>
                    <Clock size={20} color="#10b981" />
                  </View>
                  <View>
                    <Text style={styles.infoItemLabel}>Time Slot</Text>
                    <Text style={styles.infoItemValue}>
                      {formatBookingSlotSummary(booking.start_time, booking.end_time, booking.ground.pitch_type)}
                    </Text>
                  </View>
                </View>
                {cricketTeamsLabel && (
                  <View style={styles.infoItem}>
                    <View style={styles.infoIconWrapper}>
                      <Users size={20} color="#10b981" />
                    </View>
                    <View>
                      <Text style={styles.infoItemLabel}>Match Type</Text>
                      <Text style={styles.infoItemValue}>{cricketTeamsLabel}</Text>
                    </View>
                  </View>
                )}
              </View>
            </Card>

            <Card style={styles.rulesCard}>
              <View style={styles.cardHeader}>
                <Info size={20} color="#0f172a" />
                <Text style={styles.cardTitle}>Venue Rules</Text>
              </View>
              <View style={styles.rulesList}>
                 <Text style={styles.ruleItem}>• Please arrive 15 minutes before your slot.</Text>
                 <Text style={styles.ruleItem}>• Proper footwear is mandatory for the pitch.</Text>
                 <Text style={styles.ruleItem}>• Respect the ground staff and other players.</Text>
                 <Text style={styles.ruleItem}>• No littering or smoking allowed inside the premises.</Text>
              </View>
            </Card>

            {isPastBooking && (booking.status === 'confirmed' || booking.status === 'completed') && (
              <Card style={styles.reviewCard}>
                <View style={styles.cardHeader}>
                  <Star size={20} color="#0f172a" />
                  <Text style={styles.cardTitle}>Rate Your Experience</Text>
                </View>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable key={star} onPress={() => setReviewRating(star)} style={styles.starBtn}>
                      <Star
                        size={32}
                        color={reviewRating >= star ? "#10b981" : "#e2e8f0"}
                        fill={reviewRating >= star ? "#10b981" : "none"}
                      />
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Tell us about the ground conditions, amenities, and staff..."
                  placeholderTextColor="#94a3b8"
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                />
                <Button
                  title={submittingReview ? "Submitting..." : (existingReviewId ? "Update Review" : "Post Review")}
                  onPress={handleSubmitReview}
                  disabled={submittingReview}
                  style={styles.reviewSubmitBtn}
                />
              </Card>
            )}
          </View>

          {/* Payment Sidebar */}
          <View style={styles.sidebarColumn}>
            <Card style={styles.paymentCard}>
              <Text style={styles.paymentTitle}>Payment Summary</Text>
              
              <View style={styles.priceBreakdown}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>
                    Booking Price {cricketTeamsLabel ? `(${cricketTeamsLabel === '1 team' ? '1 Team' : 'Both Teams'})` : ''}
                  </Text>
                  <Text style={styles.priceValue}>{formatCurrency(originalAmount)}</Text>
                </View>
                
                {discountAmount > 0 && (
                  <View style={styles.priceRow}>
                    <Text style={styles.discountLabel}>Discount Applied</Text>
                    <Text style={styles.discountValue}>-{formatCurrency(discountAmount)}</Text>
                  </View>
                )}

                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Taxes & Fees</Text>
                  <Text style={styles.priceValue}>₹0.00</Text>
                </View>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Grand Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(displayTotalAmount)}</Text>
              </View>

              <View style={styles.paymentMethodBox}>
                <View style={styles.methodIconWrapper}>
                   {booking.payment_method === 'cash' ? <CreditCard size={18} color="#64748b" /> : <ShieldCheck size={18} color="#10b981" />}
                </View>
                <View>
                   <Text style={styles.methodLabel}>PAYMENT METHOD</Text>
                   <Text style={styles.methodValue}>
                     {booking.payment_method === 'cash' ? 'Cash at Ground' : (booking.payment_method?.toUpperCase() || 'PAID ONLINE')}
                   </Text>
                </View>
              </View>

              <View style={styles.trustBadge}>
                <ShieldCheck size={14} color="#10b981" />
                <Text style={styles.trustText}>Secure booking via Book Your Ground</Text>
              </View>
            </Card>

            <View style={styles.actionsBox}>
               <Button 
                 title="Share Booking" 
                 variant="outline" 
                 icon={Share2} 
                 onPress={() => {}}
                 fullWidth
                 style={styles.actionBtn}
               />
               <Button 
                 title="View Receipt" 
                 variant="outline" 
                 onPress={() => {}}
                 fullWidth
                 style={styles.actionBtn}
               />
            </View>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {isWeb ? <WebLayout>{content}</WebLayout> : content}

      <Modal
        visible={successModalVisible}
        onClose={() => setSuccessModalVisible(false)}
        title="Review Submitted"
        maxWidth={400}
      >
        <View style={styles.modalBody}>
          <View style={styles.modalIcon}>
            <CheckCircle2 size={48} color="#10b981" />
          </View>
          <Text style={styles.modalText}>Thank you for your feedback! It helps other players choose the best grounds.</Text>
          <Button
            title="CLOSE"
            onPress={() => setSuccessModalVisible(false)}
            fullWidth
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
  },
  mainWrapper: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 1200,
    paddingBottom: 60,
  },
  bannerContainer: {
    width: '100%',
    height: Platform.OS === 'web' ? 400 : 250,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
  },
  bannerBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  contentLayout: {
    flexDirection: 'column',
    padding: 20,
    gap: 24,
    marginTop: Platform.OS === 'web' ? -60 : 0,
  },
  contentLayoutDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailsColumn: {
    flex: 1.8,
    gap: 24,
  },
  sidebarColumn: {
    flex: 1,
    gap: 24,
  },
  mainInfoCard: {
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
  },
  groundName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 16,
    color: '#64748b',
  },
  bookingIdBox: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'flex-end',
  },
  bookingIdLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bookingIdValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 32,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  infoIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoItemLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoItemValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  rulesCard: {
    padding: 32,
    borderRadius: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  rulesList: {
    gap: 16,
  },
  ruleItem: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
  },
  reviewCard: {
    padding: 32,
    borderRadius: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  starBtn: {
    padding: 4,
  },
  reviewInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    color: '#1e293b',
    fontSize: 16,
    height: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reviewSubmitBtn: {
    marginTop: 20,
    height: 56,
    borderRadius: 16,
  },
  paymentCard: {
    padding: 32,
    borderRadius: 24,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 24,
  },
  priceBreakdown: {
    gap: 16,
    marginBottom: 24,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 15,
    color: '#64748b',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  discountLabel: {
    fontSize: 15,
    color: '#10b981',
    fontWeight: '600',
  },
  discountValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10b981',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginBottom: 32,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#10b981',
  },
  paymentMethodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  methodIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  methodLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  methodValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  trustText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  actionsBox: {
    gap: 12,
  },
  actionBtn: {
    height: 52,
    borderRadius: 12,
  },
  modalBody: {
    alignItems: 'center',
    padding: 24,
  },
  modalIcon: {
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
});
