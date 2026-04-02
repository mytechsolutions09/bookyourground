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
import { router, useLocalSearchParams } from 'expo-router';
import { MapPin, Star } from 'lucide-react-native';
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

  useEffect(() => {
    loadGround();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParam, cityParam]);

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
      <ScrollView style={styles.container}>
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
              <MapPin size={18} color="#666" />
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
                <Text style={styles.mapsLinkText}>View on Google Maps</Text>
              </Pressable>
            )}

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
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            {ground.has_floodlights ||
            ground.has_parking ||
            ground.has_changing_rooms ||
            ground.has_pavilion ||
            ground.has_washrooms ? (
              <View style={styles.amenitiesGrid}>
                {ground.has_floodlights ? (
                  <View style={styles.amenityChip}>
                    <Text style={styles.amenityText}>Floodlights</Text>
                  </View>
                ) : null}
                {ground.has_parking ? (
                  <View style={styles.amenityChip}>
                    <Text style={styles.amenityText}>Parking</Text>
                  </View>
                ) : null}
                {ground.has_changing_rooms ? (
                  <View style={styles.amenityChip}>
                    <Text style={styles.amenityText}>Changing Rooms</Text>
                  </View>
                ) : null}
                {ground.has_pavilion ? (
                  <View style={styles.amenityChip}>
                    <Text style={styles.amenityText}>Pavilion</Text>
                  </View>
                ) : null}
                {ground.has_washrooms ? (
                  <View style={styles.amenityChip}>
                    <Text style={styles.amenityText}>Washroom</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={styles.amenitiesEmpty}>None listed</Text>
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

          {ground.id ? (
            <LandingBookingForm
              initialGroundId={String(ground.id)}
              hideGroundPicker
              initialDate={typeof date === 'string' ? date : undefined}
              initialStartTime={typeof time === 'string' ? time : undefined}
              initialTeamType={
                teams === 'one' || teams === 'both' ? (teams as 'one' | 'both') : undefined
              }
              fullWidth
            />
          ) : null}
        </View>
      </ScrollView>
    );
  }

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  imageCard: {
    padding: 0,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 280,
    backgroundColor: '#E0E0E0',
  },
  thumbScroll: {
    maxHeight: 100,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
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
    backgroundColor: '#E0E0E0',
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
    }),
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  location: {
    flex: 1,
    fontSize: 15,
    color: '#666',
    lineHeight: 20,
  },
  mapsLinkWrap: {
    marginTop: 4,
    marginBottom: 8,
  },
  mapsLinkText: {
    fontSize: 13,
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  starsSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  rating: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 15,
    color: '#666',
  },
  detailValue: {
    fontSize: 15,
    color: '#333',
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
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  amenityText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  noReviewsText: {
    fontSize: 14,
    color: '#6B7280',
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
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  reviewAuthorText: {
    fontSize: 12,
    color: '#6B7280',
  },
  reviewCommentText: {
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
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 70,
    textAlignVertical: 'top',
    fontSize: 13,
    color: '#111827',
    marginBottom: 8,
  },
  reviewSubmitButton: {
    marginTop: 4,
  },
  reviewHintText: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
  },
  bookButton: {
    marginTop: 8,
    marginBottom: 32,
  },
});

