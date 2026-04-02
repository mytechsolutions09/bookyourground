import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
import { MapPin, Star, Calendar, Clock } from 'lucide-react-native';
import { GroundWithImages } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import { getGroundBookingScheduleLines } from '@/utils/bookingSlots';
import Card from '@/components/ui/Card';

interface GroundCardProps {
  ground: GroundWithImages;
  onPress: () => void;
  /** When true, show booking dates + slot pattern (admin / owner). Default true. */
  showBookingSchedule?: boolean;
  /** Compact variant for owner dashboards (smaller tile). */
  compact?: boolean;
  /** Optional per-slot price to display instead of `ground.base_price_per_hour`. */
  displayPricePerUnit?: number | null;
  /** Optional text suffix for the unit, e.g. "/hr" or " / match". */
  unitLabelOverride?: string;
}

export default function GroundCard({
  ground,
  onPress,
  showBookingSchedule = true,
  compact = false,
  displayPricePerUnit,
  unitLabelOverride,
}: GroundCardProps) {
  const schedule = useMemo(
    () => getGroundBookingScheduleLines(ground.pitch_type),
    [ground.pitch_type],
  );
  const primaryImage = ground.ground_images?.find(img => img.is_primary)?.image_url ||
    ground.ground_images?.[0]?.image_url ||
    'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';

  const reviewCount = ground.reviews?.length ?? 0;
  const averageRating =
    reviewCount > 0
      ? (ground.reviews ?? []).reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0;

  const mapsUrl = useMemo(() => {
    const parts = [ground.address, ground.city, ground.state]
      .map((v) => String(v ?? '').trim())
      .filter(Boolean);
    if (!parts.length) return null;
    const query = encodeURIComponent(parts.join(', '));
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }, [ground.address, ground.city, ground.state]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.touchable, compact && styles.touchableCompact]}
    >
      <Card style={[styles.card, compact && styles.cardCompact]}>
        <Image source={{ uri: primaryImage }} style={[styles.image, compact && styles.imageCompact]} />
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.name, compact && styles.nameCompact]}
              numberOfLines={2}
            >
              {ground.name}
            </Text>
            <View style={styles.ratingBlock}>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((i) => {
                  const filled = reviewCount > 0 && i <= Math.round(averageRating);
                  return (
                    <Star
                      key={i}
                      size={compact ? 12 : 14}
                      color={filled ? '#FFA000' : '#D1D5DB'}
                      fill={filled ? '#FFA000' : 'none'}
                    />
                  );
                })}
              </View>
              <Text style={[styles.rating, compact && styles.ratingCompact]} numberOfLines={1}>
                {reviewCount > 0
                  ? `${averageRating.toFixed(1)} (${reviewCount})`
                  : 'No reviews yet'}
              </Text>
            </View>
          </View>
          <View style={styles.locationRow}>
            <MapPin size={14} color="#666" />
            <Text style={styles.location}>{ground.city}, {ground.state}</Text>
          </View>
          {showBookingSchedule ? (
            <View style={styles.scheduleBlock}>
              <View style={styles.scheduleRow}>
                <Calendar size={13} color="#6B7280" />
                <Text style={styles.scheduleText} numberOfLines={2}>
                  {schedule.datesLine}
                </Text>
              </View>
              <View style={styles.scheduleRow}>
                <Clock size={13} color="#6B7280" />
                <Text style={styles.scheduleText} numberOfLines={3}>
                  {schedule.slotsLine}
                </Text>
              </View>
            </View>
          ) : null}
            <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Text style={[styles.price, compact && styles.priceCompact]}>
                {formatCurrency(
                  displayPricePerUnit != null
                    ? displayPricePerUnit
                    : ground.base_price_per_hour,
                )}
                {unitLabelOverride ??
                  (String(ground.pitch_type ?? '').toLowerCase().includes('box')
                    ? '/hr'
                    : ' / match')}
              </Text>
              {mapsUrl && (
                <TouchableOpacity
                  onPress={() => {
                    void Linking.openURL(mapsUrl);
                  }}
                >
                  <Text style={styles.mapsLink}>View on Google Maps</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.amenities}>
              {ground.has_floodlights ? <Text style={styles.amenity}>Lights</Text> : null}
              {ground.has_parking ? <Text style={styles.amenity}>Parking</Text> : null}
              {ground.has_changing_rooms ? (
                <Text style={styles.amenity}>Changing rooms</Text>
              ) : null}
              {ground.has_pavilion ? <Text style={styles.amenity}>Pavilion</Text> : null}
              {ground.has_washrooms ? <Text style={styles.amenity}>Washroom</Text> : null}
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    width: '100%',
    alignSelf: 'stretch',
  },
  touchableCompact: {
    marginBottom: 8,
    paddingHorizontal: 0,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 16,
    width: '100%',
    alignSelf: 'stretch',
  },
  cardCompact: {
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: undefined,
    aspectRatio: 16 / 9,
    backgroundColor: '#E0E0E0',
  },
  imageCompact: {
    aspectRatio: 16 / 6,
  },
  content: {
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  nameCompact: {
    fontSize: 14,
  },
  ratingBlock: {
    alignItems: 'flex-end',
    flexShrink: 0,
    maxWidth: '46%',
    gap: 2,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  rating: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textAlign: 'right',
  },
  ratingCompact: {
    fontSize: 11,
  },
  scheduleBlock: {
    marginBottom: 10,
    gap: 6,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  scheduleText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  footerLeft: {
    flex: 1,
    minWidth: 0,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: Platform.OS === 'web' ? '#dc8d3c' : '#2196F3',
  },
  priceCompact: {
    fontSize: 14,
  },
  mapsLink: {
    marginTop: 2,
    fontSize: 12,
    color: Platform.OS === 'web' ? '#2563EB' : '#1D4ED8',
    textDecorationLine: 'underline',
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
    flex: 1,
    minWidth: 120,
  },
  amenity: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
});
