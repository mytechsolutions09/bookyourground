import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Platform,
  TextInput,
  Pressable,
  Linking,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { MapPin, Star, ArrowLeft, Phone, Navigation2, CheckCircle2, Heart } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { slugifyGroundSegment } from '@/utils/groundSlug';
import { isCricketGroundType } from '@/utils/cricketGround';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import WebLayout from '@/components/web/WebLayout';
import LandingBookingForm from '@/components/landing/LandingBookingForm';
export default function GroundDetailsPrettyUrlScreen() {
  const { city, slug, date, time, teams } = useLocalSearchParams();
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

  const slugParam = Array.isArray(slug) ? slug[0] : slug;
  const cityParam = Array.isArray(city) ? city[0] : city;

  const loadGround = async () => {
    try {
      if (!slugParam) throw new Error('Missing ground slug');

      const nameSlug = decodeURIComponent(String(slugParam)).trim();
      const citySlug = cityParam
        ? decodeURIComponent(String(cityParam)).trim()
        : '';

      const select = `
          *,
          ground_images(*),
          reviews(rating, comment, user:profiles(full_name))
        `;

      // Narrow by city when possible; links use slugify(city), not "name with spaces" from the slug.
      const cityWords = citySlug.replace(/-/g, ' ').trim();

      let candidates: any[] = [];

      if (cityWords) {
        const res = await supabase
          .from('grounds')
          .select(select)
          .eq('active', true)
          .eq('approved', true)
          .ilike('city', cityWords);
        if (res.error) throw res.error;
        candidates = res.data ?? [];
      }

      if (!candidates.length) {
        const res = await supabase
          .from('grounds')
          .select(select)
          .eq('active', true)
          .eq('approved', true);
        if (res.error) throw res.error;
        candidates = res.data ?? [];
      }

      const byCityAndName = candidates.find(
        (g) =>
          slugifyGroundSegment(String(g.city ?? '')) === citySlug &&
          slugifyGroundSegment(String(g.name ?? '')) === nameSlug,
      );
      const byNameOnly = candidates.find(
        (g) => slugifyGroundSegment(String(g.name ?? '')) === nameSlug,
      );
      const match = byCityAndName ?? byNameOnly;

      if (!match) {
        throw new Error('Ground not found');
      }

      setGround(match as GroundWithImages);
      setExistingReviewId(null);
      setReviewBookingId(null);
      setCanReview(false);
    } catch (error) {
      console.error('Error loading ground (pretty URL):', error);
      Alert.alert('Error', 'Failed to load ground details');
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    loadGround();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParam, cityParam]);

  useEffect(() => {
    if (ground?.id && user?.id) {
      checkFavorite();
    }
  }, [ground?.id, user?.id]);

  useEffect(() => {
    setHeroImageIndex(0);
  }, [ground?.id]);

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
    const parts = [ground.address, ground.city, ground.state]
      .map((v) => String(v ?? '').trim())
      .filter(Boolean);
    if (!parts.length) return null;
    const query = encodeURIComponent(parts.join(', '));
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }, [ground]);

  useEffect(() => {
    const checkEligibility = async () => {
      if (!ground?.id || !user?.id) {
        setCanReview(false);
        setReviewBookingId(null);
        setExistingReviewId(null);
        return;
      }

      try {
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
  };

  const isLoading = loading || !ground;
  const Section = Platform.OS === 'web' ? Card : View;

  let content: React.ReactNode;

  if (isLoading || !ground) {
    content = (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading ground...</Text>
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
      <>
        {/* Fixed Header Buttons (Mobile Only) */}
        {Platform.OS !== 'web' && (
          <View style={styles.fixedHeader}>
            <Pressable
              style={styles.backBtn}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={20} color="#f9fafb" strokeWidth={2.5} />
            </Pressable>

            {ground?.id && (
              <Pressable
                style={[styles.favBtn, isFavorite && styles.favBtnActive]}
                onPress={toggleFavorite}
                disabled={favoriteLoading}
                accessibilityRole="button"
                accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart
                  size={22}
                  color={isFavorite ? '#00ea6b' : '#f9fafb'}
                  fill={isFavorite ? '#00ea6b' : 'rgba(0,0,0,0.2)'}
                  strokeWidth={2}
                />
              </Pressable>
            )}
          </View>
        )}

        <ScrollView
          style={styles.container}
          contentContainerStyle={Platform.OS === 'web' ? undefined : { paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >

        <View style={styles.content}>
          {/* ── Hero image + thumbnails ── */}
          <Section style={[styles.section, styles.imageCard]}>
            <Image
              source={{ uri: imageUrls[heroIdx] }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            {/* ── Favorite Button (Web Only) ── */}
            {Platform.OS === 'web' && (
              <Pressable
                style={[styles.favBtn, isFavorite && styles.favBtnActive]}
                onPress={toggleFavorite}
                disabled={favoriteLoading}
                accessibilityRole="button"
                accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart
                  size={22}
                  color={isFavorite ? '#00ea6b' : '#f9fafb'}
                  fill={isFavorite ? '#00ea6b' : 'rgba(0,0,0,0.2)'}
                  strokeWidth={2}
                />
              </Pressable>
            )}
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
          </Section>

          {/* ── Name + location + rating ── */}
          <Section style={styles.section}>
            <Text style={styles.name}>{ground.name}</Text>

            <View style={styles.locationRow}>
              <MapPin size={16} color="#dcc093" strokeWidth={2} />
              <Text style={styles.location}>
                {ground.address}, {ground.city}, {ground.state} - {ground.pincode}
              </Text>
            </View>

            {mapsUrl && (
              <Pressable
                onPress={() => { void Linking.openURL(mapsUrl); }}
                style={styles.mapsLinkWrap}
              >
                <Navigation2 size={13} color="#00ea6b" strokeWidth={2} />
                <Text style={styles.mapsLinkText}>View on Google Maps</Text>
              </Pressable>
            )}

            <View style={styles.starsSummaryRow}>
              {[1, 2, 3, 4, 5].map((i) => {
                const filled = reviews.length > 0 && i <= Math.round(averageRating);
                return (
                  <Star
                    key={i}
                    size={16}
                    color={filled ? '#dcc093' : '#374151'}
                    fill={filled ? '#dcc093' : 'none'}
                  />
                );
              })}
              <Text style={styles.rating}>
                {reviews.length > 0
                  ? `${averageRating.toFixed(1)} (${reviews.length} reviews)`
                  : 'No reviews yet'}
              </Text>
            </View>

            {/* Price strip (mobile) */}
            {Platform.OS !== 'web' && ground.base_price_per_hour ? (
              <View style={styles.priceStrip}>
                <View>
                  <Text style={styles.priceLabel}>Starting from</Text>
                  <Text style={styles.priceValue}>
                    ₹{Number(ground.base_price_per_hour).toLocaleString('en-IN')}
                    <Text style={styles.priceUnit}>
                      {String(ground.pitch_type ?? '').toLowerCase().includes('box') ? ' /hr' : ' /match'}
                    </Text>
                  </Text>
                </View>
              </View>
            ) : null}
          </Section>

          {/* ── About ── */}
          {ground.description && (
            <Section style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{ground.description}</Text>
            </Section>
          )}

          {/* ── Details ── */}
          <Section style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            {ground.pitch_type && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ground type</Text>
                <Text style={styles.detailValue}>{ground.pitch_type}</Text>
              </View>
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
                    : '—'}
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
          </Section>

          {/* ── Amenities ── */}
          <Section style={styles.section}>
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
                  {items.map((label) => (
                    <View key={label} style={styles.amenityChip}>
                      <CheckCircle2 size={15} color="#00ea6b" strokeWidth={2.5} />
                      <Text style={styles.amenityText}>{label}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}
          </Section>

          {/* ── Reviews ── */}
          <Section style={styles.section}>
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
                        {[1,2,3,4,5].map((s) => (
                          <Star
                            key={s}
                            size={13}
                            color={s <= r.rating ? '#dcc093' : '#374151'}
                            fill={s <= r.rating ? '#dcc093' : 'none'}
                          />
                        ))}
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
                            size={22}
                            color={active ? '#dcc093' : '#374151'}
                            fill={active ? '#dcc093' : 'none'}
                          />
                        </Pressable>
                      );
                    })}
                  </View>

                  <TextInput
                    style={styles.reviewInput}
                    placeholder="Share your experience (optional)"
                    placeholderTextColor="#6b7280"
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
          </Section>

          {/* ── Booking form ── */}
          {ground.id ? (
            Platform.OS === 'web' ? (
              <LandingBookingForm
                initialGroundId={String(ground.id)}
                hideGroundPicker
                initialDate={typeof date === 'string' ? date : undefined}
                initialStartTime={typeof time === 'string' ? time : undefined}
                initialTeamType={
                  teams === 'one' || teams === 'both' ? (teams as 'one' | 'both') : undefined
                }
                fullWidth
                hideTitle
                groundPageAccent
              />
            ) : (
              <View style={styles.bookingStripNative}>
                <LandingBookingForm
                  initialGroundId={String(ground.id)}
                  hideGroundPicker
                  initialDate={typeof date === 'string' ? date : undefined}
                  initialStartTime={typeof time === 'string' ? time : undefined}
                  initialTeamType={
                    teams === 'one' || teams === 'both' ? (teams as 'one' | 'both') : undefined
                  }
                  fullWidth
                  noCard
                  hideTitle
                  groundPageAccent
                />
              </View>
            )
          ) : null}
        </View>
      </ScrollView>
    </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: ground?.name ?? 'Ground' }} />
      {Platform.OS === 'web' ? <WebLayout>{content}</WebLayout> : content}
    </>
  );
}

const IS_WEB = Platform.OS === 'web';

const styles = StyleSheet.create({
  // ── Shell ──────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: IS_WEB ? '#F5F5F5' : '#043529',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: IS_WEB ? '#F5F5F5' : '#043529',
  },
  loadingText: {
    fontSize: 15,
    color: IS_WEB ? '#6B7280' : '#9ca3af',
    fontWeight: '500',
  },

  // ── Fixed Header (mobile) ─────────────────────────────
  fixedHeader: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    height: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 100,
    pointerEvents: 'box-none' as any,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(4,53,41,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.3)',
  },
  favBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(4,53,41,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.15)',
    ...Platform.select({
      web: {
        position: 'absolute',
        top: 16,
        right: 16,
        cursor: 'pointer' as any,
        zIndex: 20,
      },
    }),
  },
  favBtnActive: {
    borderColor: 'rgba(0,234,107,0.6)',
  },

  // ── Content wrapper ───────────────────────────────────
  content: {
    ...Platform.select({
      web: {
        padding: 16,
        paddingTop: 80,
        maxWidth: 1120,
        marginHorizontal: 'auto',
        width: '100%',
      },
      default: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 0,
      },
    }),
  },

  // ── Image card ────────────────────────────────────────
  imageCard: {
    padding: 0,
    overflow: 'hidden',
    ...Platform.select({
      default: { marginHorizontal: -16, marginBottom: 0 },
      web: {},
    }),
  },
  heroImage: {
    width: '100%',
    height: IS_WEB ? 280 : 260,
    backgroundColor: '#06392e',
  },
  thumbScroll: {
    maxHeight: 96,
    backgroundColor: IS_WEB ? '#F0F0F0' : '#06392e',
    borderTopWidth: 1,
    borderTopColor: IS_WEB ? '#E0E0E0' : 'rgba(0,234,107,0.12)',
  },
  thumbScrollContent: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  thumbPressable: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbPressableSelected: {
    borderColor: IS_WEB ? '#2563EB' : '#00ea6b',
  },
  thumbPressablePressed: {
    opacity: 0.8,
  },
  thumbPressableWeb: {
    cursor: 'pointer' as any,
  },
  thumbImage: {
    width: 110,
    height: 72,
    borderRadius: 8,
    backgroundColor: IS_WEB ? '#E0E0E0' : '#043529',
  },

  // ── Section card ─────────────────────────────────────
  section: {
    marginBottom: 12,
    ...Platform.select({
      default: {
        backgroundColor: '#06392e',
        borderRadius: 20,
        padding: 18,
        marginTop: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,234,107,0.1)',
      },
      web: {},
    }),
  },

  // ── Name / location / rating ──────────────────────────
  name: {
    fontSize: IS_WEB ? 26 : 22,
    fontWeight: '800',
    color: IS_WEB ? '#212121' : '#f9fafb',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  location: {
    flex: 1,
    fontSize: 13,
    color: IS_WEB ? '#666' : '#9ca3af',
    lineHeight: 20,
  },
  mapsLinkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    marginBottom: 8,
  },
  mapsLinkText: {
    fontSize: 13,
    color: IS_WEB ? '#2563EB' : '#00ea6b',
    fontWeight: '600',
    textDecorationLine: IS_WEB ? 'underline' : 'none',
  },
  starsSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    color: IS_WEB ? '#333' : '#dcc093',
    fontWeight: '600',
  },

  // ── Price strip (mobile) ─────────────────────────────
  priceStrip: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,234,107,0.15)',
  },
  priceLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f9fafb',
    letterSpacing: -0.5,
  },
  priceUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },

  // ── Booking strip (native) ────────────────────────────
  bookingStripNative: {
    ...Platform.select({
      default: {
        backgroundColor: '#043529',
        marginHorizontal: -16,
        paddingHorizontal: 8,
        paddingTop: 16,
        paddingBottom: 0,
      },
      web: {},
    }),
  },

  // ── Section title ─────────────────────────────────────
  sectionTitle: {
    fontSize: IS_WEB ? 18 : 16,
    fontWeight: '700',
    color: IS_WEB ? '#212121' : '#f9fafb',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: IS_WEB ? '#666' : '#9ca3af',
    lineHeight: 22,
  },

  // ── Details table ─────────────────────────────────────
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: IS_WEB ? '#F0F0F0' : 'rgba(0,234,107,0.1)',
  },
  detailLabel: {
    fontSize: 14,
    color: IS_WEB ? '#666' : '#9ca3af',
  },
  detailValue: {
    fontSize: 14,
    color: IS_WEB ? '#333' : '#f9fafb',
    fontWeight: '600',
  },
  detailValueMuted: {
    color: '#6b7280',
    fontWeight: '400',
  },

  // ── Amenities ─────────────────────────────────────────
  amenitiesEmpty: {
    fontSize: 13,
    color: '#6b7280',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: IS_WEB ? '#043529' : 'rgba(0,234,107,0.1)',
    borderWidth: 1,
    borderColor: IS_WEB ? 'transparent' : 'rgba(0,234,107,0.25)',
  },
  amenityText: {
    fontSize: 13,
    color: IS_WEB ? '#FFFFFF' : '#e5e7eb',
    fontWeight: '600',
  },

  // ── Reviews ───────────────────────────────────────────
  noReviewsText: {
    fontSize: 13,
    color: '#6b7280',
  },
  reviewsList: {
    marginTop: 4,
    marginBottom: 8,
    gap: 10,
  },
  reviewItem: {
    paddingVertical: 10,
    paddingHorizontal: IS_WEB ? 0 : 12,
    borderRadius: IS_WEB ? 0 : 14,
    backgroundColor: IS_WEB ? 'transparent' : 'rgba(4,53,41,0.7)',
    borderWidth: IS_WEB ? 0 : 1,
    borderColor: 'rgba(0,234,107,0.08)',
    borderBottomWidth: IS_WEB ? 1 : 0,
    borderBottomColor: IS_WEB ? '#E5E7EB' : 'transparent',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  reviewRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: IS_WEB ? '#374151' : '#dcc093',
    marginLeft: 4,
  },
  reviewAuthorText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  reviewCommentText: {
    fontSize: 13,
    color: IS_WEB ? '#4B5563' : '#d1d5db',
    lineHeight: 20,
  },

  // ── Review form ───────────────────────────────────────
  reviewForm: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: IS_WEB ? '#E5E7EB' : 'rgba(0,234,107,0.15)',
  },
  reviewFormTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: IS_WEB ? '#111827' : '#f9fafb',
    marginBottom: 10,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  reviewStarPressable: {
    padding: 4,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: IS_WEB ? '#D1D5DB' : 'rgba(0,234,107,0.25)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 13,
    color: IS_WEB ? '#111827' : '#f9fafb',
    backgroundColor: IS_WEB ? '#FFFFFF' : 'rgba(4,53,41,0.6)',
    marginBottom: 10,
  },
  reviewSubmitButton: {
    marginTop: 4,
  },
  reviewHintText: {
    marginTop: 8,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },

  bookButton: {
    marginTop: 8,
    marginBottom: 32,
  },
});

