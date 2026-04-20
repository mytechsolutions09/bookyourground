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
import { MapPin, Star, ArrowLeft, Phone, Navigation2, CheckCircle2, Heart, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/utils/helpers';
import { slugifyGroundSegment } from '@/utils/groundSlug';
import { isCricketGroundType } from '@/utils/cricketGround';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import WebLayout from '@/components/web/WebLayout';
import LandingBookingForm from '@/components/landing/LandingBookingForm';
export default function GroundDetailsPrettyUrlScreen() {
  const { city, slug, date, time, teams, lock } = useLocalSearchParams();
  const { user } = useAuth();
  const [ground, setGround] = useState<GroundWithImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [reviewSortOrder, setReviewSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

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
          reviews(rating, comment, created_at, user:profiles(full_name))
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
      setLoading(false);
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
    const list = ((ground as any).reviews || []) as {
      id?: string;
      rating: number;
      comment?: string | null;
      created_at?: string;
      user?: { full_name?: string | null };
      user_id?: string;
    }[];

    return [...list].sort((a, b) => {
      if (reviewSortOrder === 'newest') {
        return (b.created_at || '').localeCompare(a.created_at || '');
      }
      if (reviewSortOrder === 'oldest') {
        return (a.created_at || '').localeCompare(b.created_at || '');
      }
      if (reviewSortOrder === 'highest') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (reviewSortOrder === 'lowest') {
        return (a.rating || 0) - (b.rating || 0);
      }
      return 0;
    });
  }, [ground, reviewSortOrder]);

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
        {/* Header buttons moved to Stack.Screen options */}

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
                  color={isFavorite ? '#01b854' : '#f9fafb'}
                  fill={isFavorite ? '#01b854' : 'rgba(0,0,0,0.2)'}
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
              <Text style={styles.location}>
                {ground.address}, {ground.city}, {ground.state} - {ground.pincode}
              </Text>
            </View>

            {mapsUrl && (
              <Pressable
                onPress={() => { void Linking.openURL(mapsUrl); }}
                style={styles.mapsLinkWrap}
              >
                <MapPin size={14} color="#01b854" strokeWidth={2.5} />
                <Text style={styles.mapsLinkText}>Get Directions</Text>
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
                  fullWidth
                  noCard
                  hideTitle
                  groundPageAccent
                  lightAppTheme
                  lockSlot={lock === 'true'}
                />
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
                      <CheckCircle2 size={15} color="#01b854" strokeWidth={2.5} />
                      <Text style={styles.amenityText}>{label}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}
          </Section>




          {/* ── Reviews ── */}
          <Section style={styles.section}>
            <View style={styles.reviewHeaderMain}>
              <Text style={styles.sectionTitle}>Customer Reviews</Text>
              
              <View style={styles.reviewStatsSummary}>
                <View style={styles.avgRatingBadge}>
                  <Text style={styles.avgRatingValue}>{averageRating.toFixed(1)}</Text>
                  <Text style={styles.avgRatingText}> out of 5</Text>
                </View>
                <Text style={styles.reviewCountText}>({reviews.length} reviews)</Text>
              </View>

              <Pressable 
                style={styles.writeReviewBtn}
                onPress={() => router.push('/(tabs)/bookings' as any)}
              >
                <Star size={14} color="#6B7280" />
                <Text style={styles.writeReviewText}>Write a Review</Text>
              </Pressable>
            </View>

            <View style={styles.sortContainer}>
              <Text style={styles.sortByLabel}>Sort by:</Text>
              <View style={styles.sortChipsRow}>
                {[
                  { id: 'newest', label: 'Most Recent' },
                  { id: 'oldest', label: 'Oldest' },
                  { id: 'highest', label: 'Highest Rated' },
                  { id: 'lowest', label: 'Lowest Rated' },
                ].map((opt) => (
                  <Pressable 
                    key={opt.id}
                    onPress={() => setReviewSortOrder(opt.id as any)}
                    style={[styles.sortChip, reviewSortOrder === opt.id && styles.sortChipActive]}
                  >
                    <Text style={[styles.sortChipText, reviewSortOrder === opt.id && styles.sortChipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {reviews.length === 0 ? (
              <Text style={styles.noReviewsText}>
                No reviews yet. Go to your past bookings to leave a review.
              </Text>
            ) : (
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

                      <View style={styles.reviewAuthorDateColumn}>
                        {r.user?.full_name && (
                          <Text style={styles.reviewAuthorText}>{r.user.full_name.toUpperCase()}</Text>
                        )}
                        {r.created_at && (
                          <Text style={styles.reviewDateText}>{formatDate(r.created_at)}</Text>
                        )}
                      </View>
                    </View>
                    {r.comment ? (
                      <Text style={styles.reviewCommentText}>{r.comment}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </Section>
        </View>
      </ScrollView>
    </>
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
                  color={isFavorite ? '#01b854' : '#64748B'}
                  fill={isFavorite ? '#01b854' : 'none'}
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

const IS_WEB = Platform.OS === 'web';

const styles = StyleSheet.create({
  // ── Shell ──────────────────────────────────────────────
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
  loadingText: {
    fontSize: 15,
    color: '#6B7280',
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
    borderColor: 'rgba(1, 184, 84, 0.3)',
  },
  favBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(4,53,41,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(1, 184, 84, 0.15)',
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
    borderColor: 'rgba(1, 184, 84, 0.6)',
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
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      default: { marginBottom: 12 },
      web: {},
    }),
  },
  heroImage: {
    width: '100%',
    height: IS_WEB ? 280 : 260,
    backgroundColor: '#F1F5F9',
  },
  thumbScroll: {
    maxHeight: 96,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
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
    borderColor: IS_WEB ? '#2563EB' : '#01b854',
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
    backgroundColor: '#EDF2F7',
  },

  // ── Section card ─────────────────────────────────────
  section: {
    marginBottom: 12,
    ...Platform.select({
      default: {
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
      web: {},
    }),
  },

  // ── Name / location / rating ──────────────────────────
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
    marginBottom: 6,
  },
  location: {
    fontFamily: 'Inter',
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  mapsLinkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    marginBottom: 8,
  },
  mapsLinkText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#01b854',
    fontWeight: '600',
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
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },

  // ── Price strip (mobile) ─────────────────────────────
  priceStrip: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(1, 184, 84, 0.15)',
  },
  priceLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
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
    fontWeight: '500',
    color: '#64748B',
  },

  // ── Booking strip (native) ────────────────────────────
  formSection: {
    padding: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    marginTop: 0,
  },

  // ── Section title ─────────────────────────────────────
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },

  // ── Details table ─────────────────────────────────────
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
    fontSize: 14,
    color: '#374151',
  },
  detailValue: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#111827',
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
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  amenityText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#334155',
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
    paddingVertical: 12,
    paddingHorizontal: IS_WEB ? 0 : 16,
    borderRadius: IS_WEB ? 0 : 16,
    backgroundColor: IS_WEB ? 'transparent' : '#F8FAFC',
    borderWidth: IS_WEB ? 0 : 1,
    borderColor: '#F1F5F9',
    borderBottomWidth: IS_WEB ? 1 : 0,
    borderBottomColor: '#E5E7EB',
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
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 4,
  },
  reviewAuthorText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  reviewCommentText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },

  // ── Review form ───────────────────────────────────────
  reviewForm: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  reviewFormTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
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
    marginBottom: 10,
  },
  reviewSubmitButton: {
    marginTop: 4,
  },
  reviewHintText: {
    fontFamily: 'Inter',
    marginTop: 8,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
  reviewAuthorDateColumn: {
    alignItems: 'flex-end',
    gap: 2,
  },
  reviewDateText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  reviewHeaderMain: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  reviewStatsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  avgRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avgRatingValue: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  avgRatingText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#6b7280',
  },
  reviewCountText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 8,
  },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF',
  },
  writeReviewText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sortByLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  sortChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sortChipActive: {
    backgroundColor: '#01b854',
    borderColor: '#01b854',
  },
  sortChipText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  sortChipTextActive: {
    color: '#FFFFFF',
  },

  bookButton: {
    marginTop: 8,
    marginBottom: 32,
  },
});

