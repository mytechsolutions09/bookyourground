import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Star } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { GroundWithImages } from '@/types';
import GroundCard from '@/components/grounds/GroundCard';
import { router } from 'expo-router';

export default function PopularGrounds() {
  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('grounds')
          .select(`
            *,
            ground_images(*),
            reviews(rating)
          `)
          .eq('active', true)
          .eq('approved', true)
          .limit(8);

        if (error) throw error;

        const withScore = ((data ?? []) as GroundWithImages[]).map((g: any) => {
          const reviews = (g.reviews || []) as { rating: number }[];
          const avg =
            reviews.length > 0
              ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
              : 0;
          return { ...g, _avgRating: avg, _reviewsCount: reviews.length };
        });

        withScore.sort((a, b) => {
          if (b._avgRating === a._avgRating) {
            return (b._reviewsCount || 0) - (a._reviewsCount || 0);
          }
          return (b._avgRating || 0) - (a._avgRating || 0);
        });

        setGrounds(withScore.slice(0, 6));
      } catch (e) {
        console.error('Error loading popular grounds:', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading && grounds.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.label}>Popular grounds</Text>
          <Text style={styles.title}>Trending near you</Text>
          <ActivityIndicator
            style={{ marginTop: 24 }}
            color={Platform.OS === 'web' ? '#2b2f4b' : '#2196F3'}
          />
        </View>
      </View>
    );
  }

  if (!grounds.length) {
    return null;
  }

  const makeGroundPath = (ground: any): string => {
    const name = (ground.name ?? '').toString().toLowerCase().trim();
    const city = (ground.city ?? '').toString().toLowerCase().trim();
    const slugify = (value: string) =>
      (value || 'ground')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
    const citySlug = slugify(city || 'city');
    const nameSlug = slugify(name);
    return `/ground/${encodeURIComponent(citySlug)}/${encodeURIComponent(nameSlug)}`;
  };

  const renderCard = (g: any, index: number) => {
    const primaryImage =
      g.ground_images?.find((img: any) => img.is_primary)?.image_url ||
      g.ground_images?.[0]?.image_url ||
      'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';

    const isPopularBadge = index < 3;
    const href = makeGroundPath(g);
    const avgRating = g._avgRating ?? 0;
    const reviewCount = g._reviewsCount ?? 0;

    return (
      <TouchableOpacity
        key={g.id}
        activeOpacity={0.9}
        onPress={() => router.push(href as any)}
        style={styles.cardOuter}
      >
        <View style={styles.imageWrap}>
          <Image source={{ uri: primaryImage }} style={styles.image} />
          <View style={styles.imageOverlay} />
          {isPopularBadge && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularBadgeText}>POPULAR</Text>
            </View>
          )}
          <View style={styles.imageContent}>
            <View style={styles.titleRatingRow}>
              <Text style={styles.cardTitleText} numberOfLines={1}>
                {g.name}
              </Text>
              {reviewCount > 0 && (
                <View style={styles.ratingBadge}>
                  <Star size={10} color="#FFA000" fill="#FFA000" />
                  <Text style={styles.ratingBadgeText}>{avgRating.toFixed(1)}</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardLocationText} numberOfLines={1}>
              {g.city}, {g.state}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Type</Text>
            <Text style={styles.metaValue}>{g.pitch_type || 'Standard ground'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Reviews</Text>
            <Text style={styles.metaValue}>
              {reviewCount > 0 ? `${reviewCount} reviews` : 'No reviews yet'}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Facilities</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {[
                g.has_parking ? 'Parking' : null,
                g.has_changing_rooms ? 'Changing rooms' : null,
                g.has_washrooms ? 'Washroom' : null,
                g.has_floodlights ? 'Floodlights' : null,
              ]
                .filter(Boolean)
                .join(', ') || 'Basic amenities'}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>
              ₹{Number(g.base_price_per_hour || 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.priceUnitText}>
              {String(g.pitch_type ?? '').toLowerCase().includes('box') ? '/hour' : '/match'}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.bookButton}
            onPress={() => router.push(href as any)}
          >
            <Text style={styles.bookButtonText}>Book now</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Popular grounds</Text>
        <Text style={styles.title}>Trending near you</Text>
        <Text style={styles.subtitle}>
          See what other players are booking most often this week.
        </Text>

        {Platform.OS === 'web' ? (
          <View style={styles.grid}>
            {grounds.map((g, index) => (
              <View key={g.id} style={styles.gridItem}>
                {renderCard(g, index)}
              </View>
            ))}
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {grounds.map((g, index) => (
              <View key={g.id} style={styles.horizontalItem}>
                {renderCard(g, index)}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: Platform.OS === 'web' ? 72 : 48,
    paddingHorizontal: 24,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Inter',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 36 : 28,
    fontWeight: '800',
    fontFamily: 'Inter',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 520,
    alignSelf: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  gridItem: {
    width: 360,
    maxWidth: '100%',
  },
  horizontalList: {
    paddingHorizontal: 4,
    gap: 12,
  },
  horizontalItem: {
    width: 280,
  },
  cardOuter: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  imageWrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 150,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
  },
  popularBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  imageContent: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
  },
  titleRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,160,0,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFA000',
  },
  cardTitleText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  cardLocationText: {
    marginTop: 2,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Inter',
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  metaValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    maxWidth: 160,
    textAlign: 'right',
    fontFamily: 'Inter',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  pricePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  priceUnitText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  bookButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  bookButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    fontFamily: 'Inter',
  },
});

