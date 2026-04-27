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
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { MapPin, Star, ArrowLeft, Phone, Navigation2, CheckCircle2, Heart, ChevronRight, Share2, Map as MapIcon } from 'lucide-react-native';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin,
  Marker,
  useMap,
  useMapsLibrary,
  InfoWindow
} from '@vis.gl/react-google-maps';
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
import { Share } from 'react-native';

const MAP_ID = "DEMO_MAP_ID";
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const IS_WEB = Platform.OS === 'web';
const Section = IS_WEB ? Card : View;

const CLEAN_MAP_STYLES = [
  {
    featureType: "all",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  }
];
export default function GroundDetailsPrettyUrlScreen() {
  const { city, slug, date, time, teams, lock } = useLocalSearchParams();
  const { user } = useAuth();
  const [ground, setGround] = useState<GroundWithImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [reviewSortOrder, setReviewSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [currentTotal, setCurrentTotal] = useState<number | null>(null);

  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  const isWeb = Platform.OS === 'web';
  const isLargeWeb = isWeb && !isCompact;

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
          reviews(rating, comment, created_at, user:profiles(full_name)),
          time_slots(custom_price, is_available)
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
    const { latitude, longitude, address, city, state, name } = ground;
    
    // Using directions API to show routing options directly
    const baseUrl = "https://www.google.com/maps/dir/?api=1";
    
    let destination;
    if (latitude && longitude) {
      destination = `${latitude},${longitude}`;
    } else {
      const parts = [address, city, state].map((v) => String(v ?? '').trim()).filter(Boolean);
      destination = encodeURIComponent(parts.join(', '));
    }
    
    if (!destination) return null;
    
    // travelmode=driving is a good default, but Google Maps allows switching easily
    return `${baseUrl}&destination=${destination}&travelmode=driving`;
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

  let content;

  if (isLoading || !ground) {
    content = (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading ground...</Text>
      </View>
    );
  }
  else {
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
          contentContainerStyle={isLargeWeb ? undefined : { paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >

        <View style={styles.content}>
          {/* ── Hero Gallery ── */}
          {IS_WEB ? (
            <WebHeroGallery 
              ground={ground} 
              heroIdx={heroIdx} 
              imageUrls={imageUrls} 
              setHeroImageIndex={setHeroImageIndex}
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
              favoriteLoading={favoriteLoading}
            />
          ) : (
            <View style={[styles.section, styles.imageCard]}>
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
                      style={[
                        styles.thumbPressable,
                        idx === heroIdx && styles.thumbPressableSelected,
                      ]}
                    >
                      <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </View>
          )}

          {/* webActionBar removed as requested */}

          {isLargeWeb ? (
            <View style={styles.webTwoColumnLayout}>
              <View style={styles.webLeftColumn}>
                <Card style={styles.section}>
                  <View style={styles.infoCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{ground.name}</Text>
                      <View style={styles.locationRow}>
                        <Text style={styles.location}>
                          {ground.address}, {ground.city}, {ground.state} - {ground.pincode}
                        </Text>
                      </View>
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
                    </View>
                    {isLargeWeb && (
                      <Button
                        title={isFavorite ? "Saved" : "Save"}
                        variant={isFavorite ? "primary" : "outline"}
                        icon={Heart}
                        onPress={toggleFavorite}
                        loading={favoriteLoading}
                        style={styles.inlineSaveBtn}
                      />
                    )}
                  </View>
                </Card>

                {/* Map Section - Expanded edge-to-edge */}
                <Card style={[styles.section, styles.mapSection]}>
                  <View style={styles.webMapContainer}>
                    <WebMap ground={ground} mapsUrl={mapsUrl} />
                  </View>
                  <View style={styles.mapActionsContainer}>
                    <Button
                      title="Directions"
                      variant="outline"
                      icon={Navigation2}
                      onPress={() => mapsUrl && Linking.openURL(mapsUrl)}
                      style={styles.mapActionBtn}
                      textStyle={{ color: '#01b854' }}
                    />
                    <Button
                      title="Share"
                      variant="outline"
                      icon={Share2}
                      onPress={() => {
                        const url = typeof window !== 'undefined' ? window.location.href : '';
                        Share.share({
                          message: `Check out ${ground.name} on BookYourGround!`,
                          url: url,
                          title: ground.name
                        });
                      }}
                      style={styles.mapActionBtn}
                      textStyle={{ color: '#01b854' }}
                    />
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
                      <Text style={[styles.detailValue, !String(ground.cricket_pitch_surface ?? '').trim() && styles.detailValueMuted]}>
                        {String(ground.cricket_pitch_surface ?? '').trim() ? String(ground.cricket_pitch_surface) : '—'}
                      </Text>
                    </View>
                  ) : null}
                  {ground.ground_size && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Ground Size</Text>
                      <Text style={styles.detailValue}>{ground.ground_size}</Text>
                    </View>
                  )}
                </Card>

                <Card style={styles.section}>
                  <Text style={styles.sectionTitle}>Amenities</Text>
                  <AmenitiesList ground={ground} />
                </Card>

                <ReviewsSection 
                  reviews={reviews} 
                  averageRating={averageRating} 
                  reviewSortOrder={reviewSortOrder} 
                  setReviewSortOrder={setReviewSortOrder}
                />
              </View>

              <View style={styles.webRightColumn}>
                <View style={styles.stickySidebar}>
                  <Card style={styles.sidebarBookingCard}>
                    <Text style={styles.sidebarPriceTitle}>Book Your Slot</Text>
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
                        <View style={styles.sidebarPriceRow}>
                          {currentTotal !== null ? (
                            <>
                              <Text style={styles.sidebarPriceUnit}>Total: </Text>
                              <Text style={styles.sidebarPriceValue}>₹{currentTotal.toLocaleString('en-IN')}</Text>
                            </>
                          ) : (
                            <>
                              <Text style={styles.sidebarPriceUnit}>{hasVariation ? 'Starting ' : 'Price '}</Text>
                              <Text style={styles.sidebarPriceValue}>₹{minPrice.toLocaleString('en-IN')}</Text>
                              <Text style={styles.sidebarPriceUnit}>
                                {String(ground.pitch_type ?? '').toLowerCase().includes('box') ? ' /hr' : ' /match'}
                              </Text>
                            </>
                          )}
                        </View>
                      );
                    })()}
                    
                    <View style={styles.formContainer}>
                      <LandingBookingForm
                        initialGroundId={String(ground.id)}
                        hideGroundPicker
                        initialDate={typeof date === 'string' ? date : undefined}
                        initialStartTime={typeof time === 'string' ? time : undefined}
                        initialTeamType={teams === 'one' || teams === 'both' ? (teams as 'one' | 'both') : undefined}
                        fullWidth
                        noCard
                        hideTitle
                        groundPageAccent
                        lightAppTheme
                        lockSlot={lock === 'true'}
                        onFinalAmountChange={setCurrentTotal}
                      />
                    </View>
                  </Card>
                  
                </View>
              </View>
            </View>
          ) : (
            <>
              {/* Mobile / Small-screen layout */}
              <View style={styles.section}>
                <Text style={styles.name}>{ground.name}</Text>
                <View style={styles.locationRow}>
                  <Text style={styles.location}>
                    {ground.address}, {ground.city}, {ground.state} - {ground.pincode}
                  </Text>
                </View>
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
                    {reviews.length > 0 ? `${averageRating.toFixed(1)} (${reviews.length})` : 'No reviews'}
                  </Text>
                </View>
                {mapsUrl && (
                  <Pressable onPress={() => Linking.openURL(mapsUrl)} style={styles.mapsLinkWrap}>
                    <MapPin size={14} color="#01b854" />
                    <Text style={styles.mapsLinkText}>Get Directions</Text>
                  </Pressable>
                )}
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
                      <Text style={styles.priceLabel}>{hasVariation ? 'Starting from' : 'Price'}</Text>
                      <Text style={styles.priceValue}>
                        ₹{minPrice.toLocaleString('en-IN')}
                        <Text style={styles.priceUnit}>
                          {String(ground.pitch_type ?? '').toLowerCase().includes('box') ? ' /hr' : ' /match'}
                        </Text>
                      </Text>
                    </View>
                  );
                })()}
                
                <View style={styles.formContainer}>
                  <LandingBookingForm
                    initialGroundId={String(ground.id)}
                    hideGroundPicker
                    fullWidth
                    noCard
                    hideTitle
                    groundPageAccent
                  />
                </View>
              </View>

              {ground.description && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>About</Text>
                  <Text style={styles.description}>{ground.description}</Text>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Details</Text>
                {ground.pitch_type && <Text style={styles.description}>Type: {ground.pitch_type}</Text>}
              </View>
              
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Location</Text>
                {Platform.OS === 'web' ? (
                <View style={{ height: 250, borderRadius: 16, overflow: 'hidden' }}>
                     <WebMap ground={ground} mapsUrl={mapsUrl} />
                  </View>
                ) : (
                  <View style={styles.mobileMapPlaceholder}>
                    <MapIcon size={40} color="#94A3B8" strokeWidth={1.5} />
                    <Text style={styles.mobileMapPlaceholderText}>Map preview available on Web</Text>
                    {mapsUrl && (
                      <Pressable onPress={() => Linking.openURL(mapsUrl)} style={styles.mapsLinkWrap}>
                        <Navigation2 size={16} color="#01b854" strokeWidth={2.5} />
                        <Text style={styles.mapsLinkText}>Get Directions</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            </>
          )}

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

// ── Custom Marker Component ──
function CustomMarker({ position }: { position: { lat: number, lng: number } }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !position) return;

    // Use the global google object safely
    if (typeof google === 'undefined') return;

    const newMarker = new google.maps.Marker({
      position,
      map,
      title: 'Ground Location',
      icon: {
        path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
        fillColor: "#01b854",
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#FFFFFF",
        scale: 1.5,
        anchor: new google.maps.Point(12, 24),
      },
    });

    // Center map on marker
    map.setCenter(position);
    map.setZoom(16);

    return () => {
      newMarker.setMap(null);
    };
  }, [map, position]);

  return null;
}

// ── Map Handler Component ──
function MapHandler({ coords }: { coords: { lat: number, lng: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (map && coords) {
      map.panTo(coords);
      map.setZoom(15);
    }
  }, [map, coords]);

  return null;
}

// ── Web Hero Gallery Component ──
function WebHeroGallery({ 
  ground, 
  heroIdx, 
  imageUrls, 
  setHeroImageIndex,
  isFavorite,
  toggleFavorite,
  favoriteLoading
}: any) {
  const { width } = useWindowDimensions();
  const isSmall = width < 768;

  return (
    <View style={[styles.webGalleryWrapper, isSmall && { height: 320, borderRadius: 20 }]}>
      <View style={styles.webGalleryMain}>
        <Image
          source={{ uri: imageUrls[heroIdx] }}
          style={styles.webHeroImage}
          resizeMode="cover"
        />

        {/* Floating Actions for Mobile Web */}
        {isSmall && (
          <View style={styles.webHeroFloatingActions}>
            <TouchableOpacity 
              style={styles.webHeroFloatingBtn}
              onPress={() => router.back()}
            >
              <ArrowLeft size={20} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.webHeroFloatingBtn, isFavorite && { backgroundColor: '#10b981' }]}
              onPress={toggleFavorite}
              disabled={favoriteLoading}
            >
              {favoriteLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Heart size={20} color="#FFFFFF" fill={isFavorite ? "#FFFFFF" : "none"} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {imageUrls.length > 1 && (
          <View style={[styles.webThumbnailsWrapper, isSmall && { bottom: 12 }]}>
            <View style={[styles.webThumbnailsOverlay, isSmall && { padding: 6, gap: 8, borderRadius: 12 }]}>
              {imageUrls.slice(0, isSmall ? 5 : 8).map((uri: string, idx: number) => (
                <Pressable
                  key={`${uri}-${idx}`}
                  onPress={() => setHeroImageIndex(idx)}
                  style={[
                    styles.webThumb,
                    isSmall && { width: 45, height: 32, borderRadius: 6 },
                    idx === heroIdx && styles.webThumbSelected
                  ]}
                >
                  <Image source={{ uri }} style={styles.webThumbImg} resizeMode="cover" />
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Web Map Component ──
function WebMap({ ground, mapsUrl }: { ground: GroundWithImages, mapsUrl: string | null }) {
  const geocodingLibrary = useMapsLibrary('geocoding');
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [infoWindowOpen, setInfoWindowOpen] = useState(false);

  useEffect(() => {
    if (ground.latitude && ground.longitude) {
      setCoords({ lat: parseFloat(ground.latitude), lng: parseFloat(ground.longitude) });
    } else if (geocodingLibrary) {
      const geocoder = new geocodingLibrary.Geocoder();
      const address = `${ground.address}, ${ground.city}, ${ground.state}`;
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          setCoords({ lat: loc.lat(), lng: loc.lng() });
        }
      });
    }
  }, [ground, geocodingLibrary]);

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <View style={{ flex: 1, position: 'relative', height: '100%' }}>
        {/* Global SVG Definitions to prevent insertBefore errors */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <linearGradient id="neonPinGradientDetail" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#d8f79d', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#bfff49', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#00fd73', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
        </svg>

        <Map
          defaultCenter={coords || { lat: 28.4595, lng: 77.0266 }}
          center={coords}
          defaultZoom={15}
          mapId={MAP_ID}
          style={{ width: '100%', height: '100%', borderRadius: 16 }}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          styles={CLEAN_MAP_STYLES}
        >
          {coords && (
            <>
              <AdvancedMarker position={coords} onClick={() => setInfoWindowOpen(true)}>
                <View style={{
                  width: 44,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="100%" height="100%" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                    <path 
                      d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" 
                      fill="url(#neonPinGradientDetail)"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    <circle cx="12" cy="8" r="3.2" fill="#FFFFFF" />
                  </svg>
                </View>
              </AdvancedMarker>
              
              {infoWindowOpen && (
                <InfoWindow 
                  position={coords} 
                  onCloseClick={() => setInfoWindowOpen(false)}
                >
                  <View style={{ padding: 4, maxWidth: 180 }}>
                    <Text style={{ fontWeight: '800', fontSize: 13, color: '#0F172A', marginBottom: 2 }}>
                      {ground.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>
                      {ground.address}, {ground.city}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => mapsUrl && Linking.openURL(mapsUrl)}
                      style={{ 
                        backgroundColor: '#10B981', 
                        paddingVertical: 6, 
                        paddingHorizontal: 12, 
                        borderRadius: 6,
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>DIRECTIONS</Text>
                    </TouchableOpacity>
                  </View>
                </InfoWindow>
              )}

              <MapHandler coords={coords} />
            </>
          )}
        </Map>
      </View>
    </APIProvider>
  );
}

// ── Sub-components for cleaner structure ──
function AmenitiesList({ ground }: { ground: GroundWithImages }) {
  const items: string[] = [];
  if (ground.has_floodlights) items.push('Floodlights');
  if (ground.has_parking) items.push('Parking');
  if (ground.has_changing_rooms) items.push('Changing Rooms');
  if (ground.has_pavilion) items.push('Pavilion');
  if (ground.has_washrooms) items.push('Washroom');

  if (!items.length) return <Text style={styles.amenitiesEmpty}>None listed</Text>;

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
}

function ReviewsSection({ reviews, averageRating, reviewSortOrder, setReviewSortOrder }: any) {
  return (
    <Section style={styles.section}>
      <View style={styles.reviewHeaderMain}>
        <Text style={styles.sectionTitle}>Reviews</Text>
        <View style={styles.reviewStatsSummary}>
          <Text style={styles.avgRatingValue}>{averageRating.toFixed(1)}</Text>
          <Text style={styles.reviewCountText}>({reviews.length} reviews)</Text>
        </View>
      </View>

      <View style={styles.sortContainer}>
        <View style={styles.sortChipsRow}>
          {['newest', 'highest', 'lowest'].map((id) => (
            <Pressable 
              key={id}
              onPress={() => setReviewSortOrder(id as any)}
              style={[styles.sortChip, reviewSortOrder === id && styles.sortChipActive]}
            >
              <Text style={[styles.sortChipText, reviewSortOrder === id && styles.sortChipTextActive]}>
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {reviews.length === 0 ? (
        <Text style={styles.noReviewsText}>No reviews yet.</Text>
      ) : (
        <View style={styles.reviewsList}>
          {reviews.slice(0, 5).map((r: any, idx: number) => (
            <View key={r.id ?? idx} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewRatingRow}>
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} size={12} color={s <= r.rating ? '#dcc093' : '#E5E7EB'} fill={s <= r.rating ? '#dcc093' : 'none'} />
                  ))}
                </View>
                <Text style={styles.reviewDateText}>{formatDate(r.created_at)}</Text>
              </View>
              <Text style={styles.reviewAuthorText}>{r.user?.full_name || 'Anonymous'}</Text>
              {r.comment && <Text style={styles.reviewCommentText}>{r.comment}</Text>}
            </View>
          ))}
        </View>
      )}
    </Section>
  );
}



const styles = StyleSheet.create({
  // ── Web Shell ──────────────────────────────────────────────
  webGalleryWrapper: {
    width: '100%',
    height: 520,
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  webGalleryMain: {
    flex: 1,
    position: 'relative',
  },
  webTwoColumnLayout: {
    flexDirection: 'row',
    gap: 32,
    width: '100%',
  },
  webLeftColumn: {
    flex: 1.8,
  },
  webRightColumn: {
    flex: 1,
    minWidth: 340,
  },
  stickySidebar: {
    position: 'sticky' as any,
    top: 100,
    gap: 20,
  },
  sidebarBookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  sidebarPriceTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sidebarPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 20,
  },
  sidebarPriceValue: {
    fontFamily: 'Inter',
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  sidebarPriceUnit: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  sidebarSupportCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  supportTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  supportDesc: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  mapSection: {
    padding: 0,
    overflow: 'hidden',
  },
  webMapContainer: {
    height: 400,
    width: '100%',
    overflow: 'hidden',
  },
  mapActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  mapActionBtn: {
    flex: 1,
    borderColor: '#01b854',
  },
  webHeroImage: {
    width: '100%',
    height: '100%',
  },
  webThumbnailsWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none' as any,
  },
  webThumbnailsOverlay: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 18,
    backdropFilter: 'blur(12px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  } as any,
  webThumb: {
    width: 60,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    cursor: 'pointer' as any,
  },
  webThumbSelected: {
    borderColor: '#01b854',
  },
  webThumbImg: {
    width: '100%',
    height: '100%',
  },
  webActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  webNameSection: {
    gap: 4,
  },
  webGroundName: {
    fontFamily: 'Inter',
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -1,
  },
  webLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  webLocationText: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  webButtonActions: {
    flexDirection: 'row',
    gap: 12,
  },
  webActionBtn: {
    minWidth: 120,
  },
  infoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
  },
  inlineSaveBtn: {
    minWidth: 100,
  },

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
    color: '#6B7280',
    fontWeight: '500',
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
  webHeroFloatingActions: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  webHeroFloatingBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(8px)',
  } as any,

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

