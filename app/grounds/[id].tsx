import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert, Platform, TextInput, Pressable, Linking } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { MapPin, Star, Heart, Navigation2, Map as MapIcon } from 'lucide-react-native';
import NativeMap from '@/components/grounds/NativeMap';
import { supabase } from '@/lib/supabase';
import { slugifyGroundSegment } from '@/utils/groundSlug';
import { isCricketGroundType } from '@/utils/cricketGround';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import WebLayout from '@/components/web/WebLayout';
import LandingBookingForm from '@/components/landing/LandingBookingForm';
function looksLikeUuid(value: string | undefined | null): boolean {
  if (!value) return false;
  const v = String(value).trim();
  // Basic UUID v4 shape check: 8-4-4-4-12 hex segments.
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    v,
  );
}

export default function GroundDetailsScreen() {
  const { id, date, time, teams } = useLocalSearchParams();
  const { user } = useAuth();
  const [ground, setGround] = useState<GroundWithImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const idParam = Array.isArray(id) ? id[0] : id;

  const checkFavorite = async () => {
    if (!user?.id || !ground?.id) {
      setIsFavorite(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('ground_id', ground.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setIsFavorite(!!data);
    } catch (e) {
      console.warn('Error checking favorite:', e);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      Alert.alert('Login required', 'Please sign in to favorite grounds.');
      router.push('/(auth)/login' as any);
      return;
    }
    if (!ground?.id || favoriteLoading) return;

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('ground_id', ground.id);
        if (error) throw error;
        setIsFavorite(false);
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, ground_id: ground.id });
        if (error) throw error;
        setIsFavorite(true);
      }
    } catch (e: any) {
      console.error('Error toggling favorite:', e);
      Alert.alert('Error', e.message ?? 'Failed to update favorites');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const loadGround = async () => {
    try {
      if (!idParam) throw new Error('Missing ground identifier');

      // First, try to treat `id` as a primary key (legacy URLs with UUID).
      let data: any | null = null;

      if (looksLikeUuid(idParam)) {
        const byId = await supabase
          .from('grounds')
          .select(
            `
            *,
            ground_images(*),
            reviews(rating, comment, user:profiles(full_name)),
            time_slots(custom_price, is_available, overs_count, start_time, end_time)
          `,
          )
          .eq('id', idParam)
          .limit(1);

        if (byId.error) throw byId.error;
        if (byId.data && byId.data.length > 0) {
          data = byId.data[0];
        }
      }

      // If not found by id, fall back to matching name slug (same rules as /ground/[city]/[slug]).
      if (!data) {
        const nameSlug = decodeURIComponent(idParam).trim();

        const byName = await supabase
          .from('grounds')
          .select(
            `
            *,
            ground_images(*),
            reviews(rating, comment, user:profiles(full_name)),
            time_slots(custom_price, is_available, overs_count, start_time, end_time)
          `,
          )
          .eq('active', true)
          .eq('approved', true);

        if (byName.error) throw byName.error;
        const match = (byName.data ?? []).find(
          (g: any) => slugifyGroundSegment(String(g.name ?? '')) === nameSlug,
        );
        if (match) {
          data = match;
        }
      }

      if (!data) {
        throw new Error('Ground not found');
      }

      const groundData = data as GroundWithImages;
      setGround(groundData);
      setExistingReviewId(null);
      setReviewBookingId(null);
      setCanReview(false);
    } catch (error) {
      console.error('Error loading ground:', error);
      Alert.alert('Error', 'Failed to load ground details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGround();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idParam]);

  useEffect(() => {
    if (ground?.id && user?.id) {
      checkFavorite();
    }
  }, [ground?.id, user?.id]);

  useEffect(() => {
    setHeroImageIndex(0);
  }, [ground?.id]);

  // Derive reviews array with relaxed typing so we can safely read extra fields
  const reviews = useMemo(() => {
    if (!ground) return [] as any[];
    return ((ground as any).reviews || []) as {
      id?: string;
      rating: number;
      comment?: string | null;
      user?: { full_name?: string | null };
      user_id?: string;
    }[];
  }, [ground]);

  const averageRating = useMemo(
    () =>
      reviews.length
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
        : 0,
    [reviews],
  );

  const mapsUrl = useMemo(() => {
    if (!ground) return null;
    const { latitude, longitude, address, city, state } = ground;
    const baseUrl = "https://www.google.com/maps/dir/?api=1";
    
    let destination;
    if (latitude && longitude) {
      destination = `${latitude},${longitude}`;
    } else {
      const parts = [address, city, state].map((v) => String(v ?? '').trim()).filter(Boolean);
      destination = encodeURIComponent(parts.join(', '));
    }
    
    if (!destination) return null;
    return `${baseUrl}&destination=${destination}&travelmode=driving`;
  }, [ground]);

  // When ground + user change, check if user can review this ground.
  useEffect(() => {
    const checkEligibility = async () => {
      if (!ground?.id || !user?.id) {
        setCanReview(false);
        setReviewBookingId(null);
        setExistingReviewId(null);
        return;
      }

      try {
        // Does user already have a review for this ground?
        const { data: existing, error: existingErr } = await supabase
          .from('reviews')
          .select('id, rating, comment, booking_id')
          .eq('ground_id', ground.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingErr && existingErr.code !== 'PGRST116') {
          console.warn('checkEligibility existing review error', existingErr);
        }

        if (existing) {
          setExistingReviewId(existing.id);
          setReviewRating(existing.rating ?? 5);
          setReviewComment(existing.comment ?? '');
          setReviewBookingId(existing.booking_id ?? null);
          setCanReview(true);
          return;
        }

        // Otherwise, require at least one completed booking.
        const { data: booking, error: bookingErr } = await supabase
          .from('bookings')
          .select('id')
          .eq('ground_id', ground.id)
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('booking_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (bookingErr && bookingErr.code !== 'PGRST116') {
          console.warn('checkEligibility booking error', bookingErr);
          setCanReview(false);
          setReviewBookingId(null);
          return;
        }

        if (booking) {
          setCanReview(true);
          setReviewBookingId(booking.id);
          setExistingReviewId(null);
          setReviewRating(5);
          setReviewComment('');
        } else {
          setCanReview(false);
          setReviewBookingId(null);
          setExistingReviewId(null);
        }
      } catch (e) {
        console.warn('checkEligibility unexpected error', e);
        setCanReview(false);
        setReviewBookingId(null);
        setExistingReviewId(null);
      }
    };

    checkEligibility();
  }, [ground?.id, user?.id]);

  const handleSubmitReview = async () => {
    if (!user) {
      Alert.alert('Login required', 'Please sign in to add a review.');
      router.push('/(auth)/login' as any);
      return;
    }
    if (!ground?.id) return;
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      Alert.alert('Invalid rating', 'Please select a rating between 1 and 5 stars.');
      return;
    }

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
        if (!reviewBookingId) {
          Alert.alert(
            'Not eligible yet',
            'You can review this ground after your booking is marked as completed.',
          );
          return;
        }

        const { error } = await supabase.from('reviews').insert({
          user_id: user.id,
          ground_id: ground.id,
          booking_id: reviewBookingId,
          rating: reviewRating,
          comment: reviewComment.trim() || null,
        });

        if (error) throw error;
      }

      await loadGround();
      Alert.alert('Thank you!', 'Your review has been saved.');
    } catch (e: any) {
      console.error('Error saving review:', e);
      Alert.alert('Error', e?.message ?? 'Failed to save review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleBookNow = () => {
    if (!user) {
      if (Platform.OS === 'web') alert('Please login to book a ground');
      else Alert.alert('Login Required', 'Please login to book a ground');
      router.push('/(auth)/login');
      return;
    }
    // Booking is handled by `LandingBookingForm` below on all platforms.
  };

  const isLoading = loading || !ground;

  let content: React.ReactNode;

  if (isLoading || !ground) {
    content = (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  } else {
    const fallbackUri = 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';
    const rawImages = (ground.ground_images ?? []).filter((img) => img.image_url);
    const sortedImages = [...rawImages].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    });
    const imageUrls = sortedImages.length
      ? sortedImages.map((img) => img.image_url)
      : [fallbackUri];

    const heroIdx = Math.min(heroImageIndex, Math.max(0, imageUrls.length - 1));

    content = (
      <ScrollView
        style={styles.container}
        contentContainerStyle={Platform.OS === 'web' ? undefined : { paddingBottom: 0 }}
      >
        <View style={styles.content}>
          <Card style={[styles.section, styles.imageCard]}>
            <Image
              source={{ uri: imageUrls[heroIdx] }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            {imageUrls.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbScroll}
                contentContainerStyle={styles.thumbScrollContent}
              >
                {imageUrls.map((uri, idx) => (
                  <Pressable
                    key={`${uri}-${idx}`}
                    onPress={() => setHeroImageIndex(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={`Show image ${idx + 1} of ${imageUrls.length}`}
                    style={({ pressed }) => [
                      styles.thumbPressable,
                      idx === heroIdx && styles.thumbPressableSelected,
                      pressed && styles.thumbPressablePressed,
                      Platform.OS === 'web' && styles.thumbPressableWeb,
                    ]}
                  >
                    <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </Card>

          <Card style={styles.section}>
            <Text style={styles.name}>{ground.name}</Text>

            <View style={styles.locationRow}>
              <MapPin size={18} color="#64748B" />
              <Text style={styles.location}>
                {ground.address}, {ground.city}, {ground.state} - {ground.pincode}
              </Text>
            </View>

            {mapsUrl && (
              <Pressable
                onPress={() => {
                  void Linking.openURL(mapsUrl);
                }}
                style={styles.mapsLinkWrap}
              >
                <Text style={styles.mapsLinkText}>Get Directions</Text>
              </Pressable>
            )}

            {/* Price strip - Priority info */}
            {(() => {
              const slots = (ground as any).time_slots || [];
              const prices = slots
                .filter((s: any) => s.is_available && s.custom_price != null)
                .map((s: any) => Number(s.custom_price));
              
              if (prices.length === 0) return null;
              const minPrice = Math.min(...prices);
              const maxPrice = Math.max(...prices);
              const hasVariation = minPrice !== maxPrice;

              return (
                <View style={styles.priceStrip}>
                  <View>
                    <Text style={styles.priceLabel}>{hasVariation ? 'Starting from' : 'Price'}</Text>
                    <Text style={styles.priceValue}>
                      ₹{minPrice.toLocaleString('en-IN')}
                      <Text style={styles.priceUnit}>
                        {String(ground.pitch_type ?? '').toLowerCase().includes('box') ? ' /hr' : ' /match'}
                      </Text>
                    </Text>
                  </View>
                </View>
              );
            })()}

            {/* Rating summary - Now moved below price */}
            <View style={styles.starsSummaryRow}>
              {[1, 2, 3, 4, 5].map((i) => {
                const filled = reviews.length > 0 && i <= Math.round(averageRating);
                return (
                  <Star
                    key={i}
                    size={18}
                    color={filled ? '#FFA000' : '#D1D5DB'}
                    fill={filled ? '#FFA000' : 'none'}
                  />
                );
              })}
              <Text style={styles.rating}>
                {reviews.length > 0
                  ? `${averageRating.toFixed(1)} (${reviews.length} reviews)`
                  : 'No reviews yet'}
              </Text>
            </View>

            {/* ── Booking form (Now part of the main container) ── */}
            {ground.id ? (
              <View style={styles.formContainer}>
                <LandingBookingForm
                  initialGroundId={String(ground.id)}
                  hideGroundPicker
                  initialDate={typeof date === 'string' ? date : undefined}
                  initialStartTime={typeof time === 'string' ? time : undefined}
                  initialTeamType={
                    teams === 'one' || teams === 'both' ? (teams as 'one' | 'both') : undefined
                  }
                  lockSlot={!!(date && time)}
                  fullWidth
                  noCard
                  hideTitle
                  groundPageAccent
                  lightAppTheme
                />
              </View>
            ) : null}
          </Card>

          {ground.description && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{ground.description}</Text>
            </Card>
          )}

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            {ground.pitch_type && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{ground.pitch_type?.toLowerCase().includes('nets') ? 'Type' : 'Ground type'}</Text>
                <Text style={styles.detailValue}>{ground.pitch_type}</Text>
              </View>
            )}
            {ground.pitch_type?.toLowerCase().includes('nets') && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{ground.pricing_model === 'overs' ? 'Overs per slot' : 'Time per slot'}</Text>
                  <Text style={styles.detailValue}>
                    {ground.pricing_model === 'overs' 
                      ? (ground.time_slots?.find((s: any) => s.overs_count != null)?.overs_count || '—')
                      : '1 Hour'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Duration</Text>
                  <Text style={styles.detailValue}>
                    {(() => {
                      const slot = ground.time_slots?.[0];
                      if (!slot?.start_time || !slot?.end_time) return '—';
                      const [h1, m1] = slot.start_time.split(':').map(Number);
                      const [h2, m2] = slot.end_time.split(':').map(Number);
                      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                      if (diff < 0) diff += 24 * 60;
                      const hrs = Math.floor(diff / 60);
                      const mins = diff % 60;
                      if (hrs > 0 && mins > 0) return `${hrs} hr ${mins} min`;
                      if (hrs > 0) return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
                      return `${mins} min`;
                    })()}
                  </Text>
                </View>
              </>
            )}
            {isCricketGroundType(ground.pitch_type) ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pitch surface</Text>
                <Text
                  style={[
                    styles.detailValue,
                    !String(ground.cricket_pitch_surface ?? '').trim() && styles.detailValueMuted,
                  ]}
                >
                  {String(ground.cricket_pitch_surface ?? '').trim()
                    ? String(ground.cricket_pitch_surface)
                    : '-'}
                </Text>
              </View>
            ) : null}
            {ground.ground_size && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ground Size</Text>
                <Text style={styles.detailValue}>{ground.ground_size}</Text>
              </View>
            )}
            {ground.capacity && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Capacity</Text>
                <Text style={styles.detailValue}>{ground.capacity} players</Text>
              </View>
            )}
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            {(() => {
              const items: string[] = [];
              if (ground.has_floodlights) items.push('Floodlights');
              if (ground.has_parking) items.push('Parking');
              if (ground.has_changing_rooms) items.push('Changing Rooms');
              if (ground.has_pavilion) items.push('Pavilion');
              if (ground.has_washrooms) items.push('Washroom');

              if (!items.length) {
                return <Text style={styles.amenitiesEmpty}>None listed</Text>;
              }

              return (
                <View style={styles.amenitiesGrid}>
                  {items.map((label, index) => (
                    <View
                      key={label}
                      style={[
                        styles.amenityChip,
                        index % 2 === 0 ? styles.amenityChipDark : styles.amenityChipGreen,
                      ]}
                    >
                      <Text style={styles.amenityText}>{label}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            {Platform.OS === 'web' ? (
              <View style={styles.webMapPlaceholder}>
                <Text style={styles.description}>
                  {ground.address}, {ground.city}, {ground.state}
                </Text>
                {mapsUrl && (
                  <Pressable onPress={() => Linking.openURL(mapsUrl)} style={styles.mapsLinkWrap}>
                    <Text style={styles.mapsLinkText}>Open in Google Maps</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={{ height: 200, borderRadius: 16, overflow: 'hidden', backgroundColor: '#F1F5F9', marginBottom: 12 }}>
                <NativeMap ground={ground} />
                {mapsUrl && (
                  <Pressable 
                    onPress={() => Linking.openURL(mapsUrl)} 
                    style={[styles.mapsLinkWrap, { position: 'absolute', bottom: 12, right: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }]}
                  >
                    <Navigation2 size={14} color="#01b854" strokeWidth={2.5} />
                    <Text style={[styles.mapsLinkText, { marginBottom: 0 }]}>Directions</Text>
                  </Pressable>
                )}
              </View>
            )}
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Reviews</Text>

            {reviews.length === 0 && (
              <Text style={styles.noReviewsText}>
                No reviews yet. Be the first to review this ground.
              </Text>
            )}

            {reviews.length > 0 && (
              <View style={styles.reviewsList}>
                {reviews.map((r, idx) => (
                  <View key={r.id ?? idx} style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewRatingRow}>
                        <Star size={14} color="#FFA000" fill="#FFA000" />
                        <Text style={styles.reviewRatingText}>{r.rating}/5</Text>
                      </View>
                      {r.user?.full_name && (
                        <Text style={styles.reviewAuthorText}>{r.user.full_name}</Text>
                      )}
                    </View>
                    {r.comment ? (
                      <Text style={styles.reviewCommentText}>{r.comment}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}

            {user ? (
              canReview ? (
                <View style={styles.reviewForm}>
                  <Text style={styles.reviewFormTitle}>
                    {existingReviewId ? 'Update your review' : 'Add your review'}
                  </Text>

                  <View style={styles.reviewStarsRow}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = reviewRating >= star;
                      return (
                        <Pressable
                          key={star}
                          onPress={() => setReviewRating(star)}
                          style={styles.reviewStarPressable}
                        >
                          <Star
                            size={20}
                            color={active ? '#FFA000' : '#D1D5DB'}
                            fill={active ? '#FFA000' : 'none'}
                          />
                        </Pressable>
                      );
                    })}
                  </View>

                  <TextInput
                    style={styles.reviewInput}
                    placeholder="Share your experience (optional)"
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    multiline
                    numberOfLines={3}
                    editable={!submittingReview}
                  />

                  <Button
                    title={
                      submittingReview
                        ? 'Saving...'
                        : existingReviewId
                        ? 'Update review'
                        : 'Submit review'
                    }
                    onPress={handleSubmitReview}
                    loading={submittingReview}
                    disabled={submittingReview}
                    style={styles.reviewSubmitButton}
                  />
                </View>
              ) : (
                <Text style={styles.reviewHintText}>
                  You can review this ground after your booking is marked as completed.
                </Text>
              )
            ) : (
              <Text style={styles.reviewHintText}>
                Sign in and complete a booking to leave a review.
              </Text>
            )}
          </Card>

        </View>
      </ScrollView>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: (ground?.name ?? 'Ground').toUpperCase(),
          headerTitleStyle: { 
            fontFamily: 'Inter', 
            fontSize: 16, 
            fontWeight: '700', 
            color: '#111827',
            letterSpacing: 1.2,
          },
          headerLeft: () => null,
          headerRight: () => (
            Platform.OS !== 'web' && ground?.id ? (
              <Pressable
                onPress={toggleFavorite}
                disabled={favoriteLoading}
                style={{ marginRight: 15 }}
                accessibilityRole="button"
                accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart
                  size={22}
                  color={isFavorite ? '#518167' : '#64748B'}
                  fill={isFavorite ? '#518167' : 'none'}
                  strokeWidth={2}
                />
              </Pressable>
            ) : null
          )
        }} 
      />
      {Platform.OS === 'web' ? <WebLayout>{content}</WebLayout> : content}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  mobileMapPlaceholder: {
    height: 200,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    gap: 8,
  },
  mobileMapPlaceholderText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 8,
  },
  imageCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 12,
  },
  heroImage: {
    width: '100%',
    height: 280,
    backgroundColor: '#F1F5F9',
  },
  thumbScroll: {
    maxHeight: 100,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  thumbScrollContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  thumbPressable: {
    marginRight: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbPressableSelected: {
    borderColor: '#2563EB',
  },
  thumbPressablePressed: {
    opacity: 0.85,
  },
  thumbPressableWeb: {
    cursor: 'pointer' as any,
  },
  thumbImage: {
    width: 120,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#EDF2F7',
  },
  content: {
    padding: 16,
    ...Platform.select({
      web: {
        maxWidth: 1120,
        marginHorizontal: 'auto',
        width: '100%',
        paddingTop: 80,
      },
      default: {
        paddingBottom: 0,
      },
    }),
  },
  name: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  formContainer: {
    marginTop: 16,
    paddingTop: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  location: {
    fontFamily: 'Inter',
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 20,
  },
  mapsLinkWrap: {
    marginTop: 4,
    marginBottom: 8,
  },
  mapsLinkText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#518167',
    fontWeight: '600',
  },
  starsSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  rating: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '600',
  },
  section: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#374151',
  },
  detailValue: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
  },
  detailValueMuted: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  amenitiesEmpty: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  amenityChipDark: {
    backgroundColor: '#043529',
  },
  amenityChipGreen: {
    backgroundColor: '#02c259',
  },
  amenityText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  noReviewsText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#6B7280',
  },
  priceStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '500',
  },
  priceValue: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  priceUnit: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  reviewsList: {
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
  },
  reviewItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewRatingText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  reviewAuthorText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
  },
  reviewCommentText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  reviewForm: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  reviewFormTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reviewStarPressable: {
    padding: 4,
  },
  reviewInput: {
    fontFamily: 'Inter',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  reviewSubmitButton: {
    marginTop: 4,
  },
  reviewHintText: {
    fontFamily: 'Inter',
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
  },
  bookButton: {
    marginTop: 8,
    marginBottom: 32,
  },
  webMapPlaceholder: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
});
