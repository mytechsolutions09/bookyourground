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
import { MapPin, Star, Clock, Users } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages } from '@/types';
import { formatCurrency } from '@/utils/helpers';
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

  const slugParam = Array.isArray(slug) ? slug[0] : slug;

  const loadGround = async () => {
    try {
      if (!slugParam) throw new Error('Missing ground slug');

      const decodedSlug = decodeURIComponent(String(slugParam));
      const nameFromSlug = decodedSlug.replace(/-/g, ' ').trim();

      const { data, error } = await supabase
        .from('grounds')
        .select(
          `
          *,
          ground_images(*),
          reviews(rating, comment, user:profiles(full_name))
        `,
        )
        .ilike('name', nameFromSlug)
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Ground not found');
      }

      setGround(data[0] as GroundWithImages);
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
  }, [slugParam]);

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
    const primaryImage =
      ground.ground_images?.find((img) => img.is_primary)?.image_url ||
      ground.ground_images?.[0]?.image_url ||
      'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';

    content = (
      <ScrollView style={styles.container}>
        <Image source={{ uri: primaryImage }} style={styles.image} />

        <View style={styles.content}>
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

          {reviews.length > 0 && (
            <View style={styles.ratingRow}>
              <Star size={18} color="#FFA000" fill="#FFA000" />
              <Text style={styles.rating}>
                {averageRating.toFixed(1)} ({reviews.length} reviews)
              </Text>
            </View>
          )}

          <Card style={styles.priceCard}>
            <Text style={styles.price}>
              {formatCurrency(ground.base_price_per_hour)}
              {String(ground.pitch_type ?? '').toLowerCase().includes('box')
                ? '/hour'
                : ' / match'}
            </Text>
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
                <Text style={styles.detailLabel}>Pitch Type</Text>
                <Text style={styles.detailValue}>{ground.pitch_type}</Text>
              </View>
            )}
            {ground.ground_size && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ground Size</Text>
                <Text style={styles.detailValue}>{ground.ground_size}</Text>
              </View>
            )}
            {ground.capacity && (
              <View style={styles.detailRow}>
                <Users size={16} color="#666" />
                <Text style={styles.detailValue}>Capacity: {ground.capacity} players</Text>
              </View>
            )}
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {ground.has_floodlights && (
                <View style={styles.amenityChip}>
                  <Text style={styles.amenityText}>Floodlights</Text>
                </View>
              )}
              {ground.has_parking && (
                <View style={styles.amenityChip}>
                  <Text style={styles.amenityText}>Parking</Text>
                </View>
              )}
              {ground.has_changing_rooms && (
                <View style={styles.amenityChip}>
                  <Text style={styles.amenityText}>Changing Rooms</Text>
                </View>
              )}
              {ground.has_pavilion && (
                <View style={styles.amenityChip}>
                  <Text style={styles.amenityText}>Pavilion</Text>
                </View>
              )}
            </View>
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
  image: {
    width: '100%',
    height: 280,
    backgroundColor: '#E0E0E0',
    ...Platform.select({
      web: {
        marginTop: 80,
      },
    }),
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  rating: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  priceCard: {
    backgroundColor: Platform.OS === 'web' ? '#2b2f4b' : '#E3F2FD',
    marginBottom: 16,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: Platform.OS === 'web' ? '#dc8d3c' : '#2196F3',
    textAlign: 'center',
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

