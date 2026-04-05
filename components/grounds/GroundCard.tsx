import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
import { MapPin, Star, Calendar, Clock, Heart } from 'lucide-react-native';
import { GroundWithImages } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import { getGroundBookingScheduleLines } from '@/utils/bookingSlots';
import Card from '@/components/ui/Card';

const NATIVE_CARD_BG = '#043529';
const NATIVE_BORDER = '#02c259';
const NATIVE_TEXT = '#dcc093';

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
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  favoriteLoading?: boolean;
}

export default function GroundCard({
  ground,
  onPress,
  showBookingSchedule = true,
  compact = false,
  displayPricePerUnit,
  unitLabelOverride,
  isFavorite = false,
  onToggleFavorite,
  favoriteLoading = false,
}: GroundCardProps) {
  const isWeb = Platform.OS === 'web';
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

  const pinColor = NATIVE_TEXT;
  const scheduleIconColor = NATIVE_BORDER;
  const nameStyle = [styles.name, compact && styles.nameCompact, styles.nameNative];
  const ratingStyle = [styles.rating, compact && styles.ratingCompact, styles.ratingNative];
  const locationStyle = [styles.location, styles.locationNative];
  const scheduleTextStyle = [styles.scheduleText, styles.scheduleTextNative];
  const priceStyle = [styles.price, compact && styles.priceCompact, styles.priceNative];
  const mapsLinkStyle = [styles.mapsLink, styles.mapsLinkNative];
  const amenityStyle = [styles.amenity, styles.amenityNative];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.touchable, compact && styles.touchableCompact]}
    >
      <Card
        style={[
          styles.card,
          compact && styles.cardCompact,
          styles.cardNative,
        ]}
      >
        <View style={styles.imageWrapper}>
          <Image source={{ uri: primaryImage }} style={[styles.image, compact && styles.imageCompact]} />
          {onToggleFavorite && (
            <TouchableOpacity
              style={[styles.favBtn, isFavorite && styles.favBtnActive]}
              onPress={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              disabled={favoriteLoading}
              activeOpacity={0.7}
            >
              <Heart
                size={compact ? 16 : 20}
                color={isFavorite ? '#00ea6b' : '#f9fafb'}
                fill={isFavorite ? '#00ea6b' : 'rgba(0,0,0,0.3)'}
                strokeWidth={2.5}
              />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={nameStyle} numberOfLines={2}>
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
              <Text style={ratingStyle} numberOfLines={1}>
                {reviewCount > 0
                  ? `${averageRating.toFixed(1)} (${reviewCount})`
                  : 'No reviews yet'}
              </Text>
            </View>
          </View>
          <View style={styles.locationRow}>
            <MapPin size={14} color={pinColor} />
            <Text style={locationStyle}>{ground.city}, {ground.state}</Text>
          </View>
          {showBookingSchedule ? (
            <View style={styles.scheduleBlock}>
              <View style={styles.scheduleRow}>
                <Calendar size={13} color={scheduleIconColor} />
                <Text style={scheduleTextStyle} numberOfLines={2}>
                  {schedule.datesLine}
                </Text>
              </View>
              <View style={styles.scheduleRow}>
                <Clock size={13} color={scheduleIconColor} />
                <Text style={scheduleTextStyle} numberOfLines={3}>
                  {schedule.slotsLine}
                </Text>
              </View>
            </View>
          ) : null}
            <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Text style={priceStyle}>
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
                  <Text style={mapsLinkStyle}>View on Google Maps</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.amenities}>
              {ground.has_floodlights ? <Text style={amenityStyle}>Lights</Text> : null}
              {ground.has_parking ? <Text style={amenityStyle}>Parking</Text> : null}
              {ground.has_changing_rooms ? (
                <Text style={amenityStyle}>Changing rooms</Text>
              ) : null}
              {ground.has_pavilion ? <Text style={amenityStyle}>Pavilion</Text> : null}
              {ground.has_washrooms ? <Text style={amenityStyle}>Washroom</Text> : null}
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
  cardNative: {
    backgroundColor: '#06392e',
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.2)',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
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
  imageWrapper: {
    position: 'relative',
    width: '100%',
  },
  favBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(4,53,41,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.2)',
  },
  favBtnActive: {
    borderColor: 'rgba(0,234,107,0.5)',
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
    color: '#043529',
  },
  nameCompact: {
    fontSize: 14,
  },
  nameNative: {
    color: NATIVE_TEXT,
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
  locationNative: {
    color: NATIVE_TEXT,
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
  ratingNative: {
    color: NATIVE_TEXT,
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
  scheduleTextNative: {
    color: NATIVE_TEXT,
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
    fontSize: 17,
    fontWeight: '700',
    color: '#02c259',
  },
  priceCompact: {
    fontSize: 13,
  },
  priceNative: {
    color: NATIVE_BORDER,
  },
  mapsLink: {
    marginTop: 2,
    fontSize: 12,
    color: Platform.OS === 'web' ? '#2563EB' : '#1D4ED8',
    textDecorationLine: 'underline',
  },
  mapsLinkNative: {
    color: NATIVE_BORDER,
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
  amenityNative: {
    color: NATIVE_TEXT,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: NATIVE_BORDER,
  },
});
