import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
import { MapPin, Star, Calendar, Clock, Heart } from 'lucide-react-native';
import { GroundWithImages } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import { getGroundBookingScheduleLines } from '@/utils/bookingSlots';
import Card from '@/components/ui/Card';

const NATIVE_CARD_BG = '#FFFFFF';
const NATIVE_BORDER = '#E2E8F0';
const NATIVE_TEXT = '#0F172A';

interface GroundCardProps {
  ground: GroundWithImages;
  onPress: () => void;

  /** Compact variant for owner dashboards (smaller tile). */
  compact?: boolean;
  /** Optional per-slot price to display instead of `ground.base_price_per_hour`. */
  displayPricePerUnit?: number | null;
  /** Optional text suffix for the unit, e.g. "/hr" or " / match". */
  unitLabelOverride?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  favoriteLoading?: boolean;
  /** Forced light theme. Default is true on Web, false on Native. */
  lightMode?: boolean;
  occupancyRate?: number | null;
}

export default function GroundCard({
  ground,
  onPress,
  compact = false,
  displayPricePerUnit,
  unitLabelOverride,
  isFavorite = false,
  onToggleFavorite,
  favoriteLoading = false,
  lightMode = Platform.OS === 'web',
  occupancyRate = null,
}: GroundCardProps) {
  const isWeb = Platform.OS === 'web';
  const isLight = lightMode;
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

  const pinColor = isLight ? '#6B7280' : NATIVE_TEXT;
  const scheduleIconColor = isLight ? '#10b981' : NATIVE_BORDER;
  
  const nameStyle = [styles.name, compact && styles.nameCompact, !isLight && styles.nameNative];
  const ratingStyle = [styles.rating, compact && styles.ratingCompact, !isLight && styles.ratingNative];
  const locationStyle = [styles.location, !isLight && styles.locationNative];
  const scheduleTextStyle = [styles.scheduleText, !isLight && styles.scheduleTextNative];
  const priceStyle = [styles.price, compact && styles.priceCompact, !isLight && styles.priceNative];
  const mapsLinkStyle = [styles.mapsLink, !isLight && styles.mapsLinkNative];
  const amenityStyle = [styles.amenity, !isLight && styles.amenityNative];

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
          !isLight && styles.cardNative,
          isLight && styles.cardWeb,
        ]}
      >
        <View style={styles.imageWrapper}>
          <Image source={{ uri: primaryImage }} style={[styles.image, compact && styles.imageCompact]} />
          {onToggleFavorite && (
            <TouchableOpacity
              style={[
                styles.favBtn, 
                isFavorite && styles.favBtnActive,
                isLight && styles.favBtnLight
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              disabled={favoriteLoading}
              activeOpacity={0.7}
            >
              <Heart
                size={compact ? 16 : 20}
                color={isFavorite ? '#10B981' : (isLight ? '#64748B' : '#f9fafb')}
                fill={isFavorite ? '#10B981' : (isLight ? 'transparent' : 'rgba(0,0,0,0.3)')}
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
            <Text style={priceStyle}>
              {formatCurrency(
                displayPricePerUnit != null
                  ? displayPricePerUnit
                  : ground.base_price_per_hour,
              )}
              <Text style={styles.priceUnit}>
                {unitLabelOverride ??
                  (String(ground.pitch_type ?? '').toLowerCase().includes('box')
                    ? '/hr'
                    : ' / match')}
              </Text>
            </Text>
          </View>

          <View style={styles.subTitleRow}>
            <View style={styles.ratingBlockRow}>
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
            <View style={styles.locationRowShort}>
              <MapPin size={12} color={pinColor} />
              <Text style={locationStyle} numberOfLines={1}>{ground.city}</Text>
            </View>
          </View>

          {occupancyRate !== null && (
            <View style={styles.occupancyContainer}>
              <View style={styles.occupancyHeader}>
                <Text style={styles.occupancyLabel}>Utilization</Text>
                <Text style={styles.occupancyValue}>{Math.round(occupancyRate)}%</Text>
              </View>
              <View style={styles.occupancyBarBg}>
                <View 
                  style={[
                    styles.occupancyBarFill, 
                    { width: `${Math.min(100, occupancyRate)}%` },
                    occupancyRate > 80 ? { backgroundColor: '#10B981' } : 
                    occupancyRate > 50 ? { backgroundColor: '#34D399' } : 
                    { backgroundColor: '#6EE7B7' }
                  ]} 
                />
              </View>
            </View>
          )}

          <View style={styles.footer}>
            <View style={styles.amenities}>
              {ground.has_floodlights ? <Text style={amenityStyle}>Lights</Text> : null}
              {ground.has_parking ? <Text style={amenityStyle}>Parking</Text> : null}
              {ground.has_changing_rooms ? (
                <Text style={amenityStyle}>Changing rooms</Text>
              ) : null}
            </View>
            {mapsUrl && (
              <TouchableOpacity
                style={[styles.mapsBtn, !isLight && styles.mapsBtnNative]}
                onPress={() => {
                  void Linking.openURL(mapsUrl);
                }}
              >
                <Text style={mapsLinkStyle}>View Maps</Text>
              </TouchableOpacity>
            )}
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardWeb: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
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
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  favBtnLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
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
  subTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ratingBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationRowShort: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  locationNative: {
    color: NATIVE_TEXT,
  },
  rating: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'right',
    fontFamily: 'Inter',
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
    color: '#64748B',
    lineHeight: 16,
    fontFamily: 'Inter',
  },
  scheduleTextNative: {
    color: '#475569',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  footerLeft: {
    flex: 1,
    minWidth: 0,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  priceUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  priceCompact: {
    fontSize: 13,
  },
  priceNative: {
    color: '#01b854',
    fontSize: 16,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  mapsBtnNative: {
    gap: 6,
  },
  mapsLink: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '800',
    fontFamily: 'Inter',
  },
  mapsLinkNative: {
    color: '#10B981',
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-start',
    flex: 1,
    minWidth: 120,
  },
  amenity: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    fontFamily: 'Inter',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  amenityNative: {
    color: '#475569',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  occupancyContainer: {
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  occupancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  occupancyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  occupancyValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
    fontFamily: 'Inter',
  },
  occupancyBarBg: {
    height: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  occupancyBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
