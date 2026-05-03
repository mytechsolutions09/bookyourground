import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, Linking, useWindowDimensions } from 'react-native';
import { MapPin, Star, Calendar, Clock, Heart, Users, BarChart2, ChevronRight, Map as MapIcon } from 'lucide-react-native';
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
  showBookButton?: boolean;
  /** Enable premium glass effect with full image background. */
  glass?: boolean;
  onUtilizationPress?: () => void;
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
  showBookButton = false,
  glass = false,
  onUtilizationPress,
}: GroundCardProps) {
  const { width } = useWindowDimensions();
  const isUltraNarrow = width < 350;
  
  const basePrice = displayPricePerUnit ?? ground.base_price_per_hour ?? 0;
  const teamPrice = Math.round(basePrice / 2);
  const showTeamPrice = !(String(ground.pitch_type ?? '').toLowerCase().includes('box'));

  const isWeb = Platform.OS === 'web';
  const isLight = glass ? false : lightMode;
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

  const pinColor = isLight ? '#6B7280' : (glass ? 'rgba(255,255,255,0.7)' : NATIVE_TEXT);
  
  const scheduleIconColor = isLight ? '#10b981' : NATIVE_BORDER;
  
  const nameStyle = [styles.name, compact && styles.nameCompact, !isLight && styles.nameNative, glass && styles.nameGlass];
  const ratingStyle = [styles.rating, compact && styles.ratingCompact, !isLight && styles.ratingNative, glass && styles.ratingGlass];
  const locationStyle = [styles.location, !isLight && styles.locationNative, glass && styles.locationGlass];
  const priceStyle = [styles.price, compact && styles.priceCompact, !isLight && styles.priceNative, glass && styles.priceGlass];
  const mapsLinkStyle = [styles.mapsLink, !isLight && styles.mapsLinkNative, glass && styles.mapsLinkGlass];

  // Combined render logic to avoid hook violations with early returns
  const renderCardContent = () => {
    if (glass) {
      return (
        <Card style={[styles.card, styles.cardGlass]}>
          <Image source={{ uri: primaryImage }} style={styles.imageFull} />
          <View style={styles.glassOverlayGradient} />
          
          {/* Top Floating Badges */}
          <View style={styles.topBadgesRow}>
             <View style={styles.glassRatingBadge}>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((i) => {
                    const filled = reviewCount > 0 && i <= Math.round(averageRating);
                    return (
                      <Star
                        key={i}
                        size={10}
                        color={filled ? '#01b854' : 'rgba(0,0,0,0.2)'}
                        fill={filled ? '#01b854' : 'none'}
                      />
                    );
                  })}
                </View>
                <Text style={styles.ratingTextGlassBadge}>
                  {reviewCount > 0 ? averageRating.toFixed(1) : 'NEW'}
                </Text>
             </View>

             {onToggleFavorite && (
                <TouchableOpacity
                  style={styles.favBtnGlass}
                  onPress={(e) => {
                    e.stopPropagation();
                    onToggleFavorite();
                  }}
                  disabled={favoriteLoading}
                >
                  <Heart
                    size={18}
                    color={isFavorite ? '#01b854' : '#0F172A'}
                    fill={isFavorite ? '#01b854' : 'transparent'}
                    strokeWidth={2.5}
                  />
                </TouchableOpacity>
              )}
          </View>
          
          <View style={styles.glassContent}>
            <View style={styles.glassHeaderRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={nameStyle}>
                  {ground.name}
                </Text>
              </View>
              <View style={styles.glassPriceBlock}>
                <Text style={priceStyle}>
                  {formatCurrency(displayPricePerUnit ?? ground.base_price_per_hour ?? 0)}
                  <Text style={styles.priceUnitGlass}>
                    {unitLabelOverride ?? (String(ground.pitch_type ?? '').toLowerCase().includes('box') ? '/hr' : ' / match')}
                  </Text>
                </Text>
              </View>
            </View>

            <View style={styles.locationRowShort}>
              <MapPin size={12} color={pinColor} />
              <Text style={locationStyle} numberOfLines={1}>{ground.city}</Text>
            </View>
          </View>
        </Card>
      );
    }

    return (
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

        <View style={[styles.content, isUltraNarrow && { padding: 12 }]}>
          <View style={[
            styles.titlePriceRow, 
            (isUltraNarrow || compact) && { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }
          ]}>
            <Text 
              style={[
                styles.name, 
                Platform.OS !== 'web' && styles.nameNative,
                compact && styles.nameCompact,
                isUltraNarrow && { fontSize: 18 }
              ]} 
              numberOfLines={2}
            >
              {ground.name}
            </Text>
            <View style={styles.priceBlock}>
              {!isUltraNarrow && <Text style={styles.priceFromLabel}>from</Text>}
              <Text style={[styles.priceValueNew, compact && { fontSize: 16 }]}>₹{basePrice}</Text>
              <Text style={styles.priceUnitNew}>/slot</Text>
            </View>
          </View>

          <View style={[
            styles.locationBadgeRow,
            isUltraNarrow && { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }
          ]}>
            <View style={styles.locationRowShort}>
              <MapPin size={isUltraNarrow ? 14 : 16} color="#64748B" />
              <Text style={[styles.locationTextNew, isUltraNarrow && { fontSize: 13 }]}>
                {ground.city}, {ground.state}
              </Text>
            </View>
            
            {showTeamPrice && (
              <View style={[styles.teamPriceBadge, isUltraNarrow && { paddingHorizontal: 6, paddingVertical: 4 }]}>
                <Users size={isUltraNarrow ? 12 : 14} color="#059669" />
                <Text style={[styles.teamPriceBadgeText, isUltraNarrow && { fontSize: 11 }]}>
                  ₹{teamPrice}/team
                </Text>
              </View>
            )}
          </View>

          {/* Rating Row */}
          <View style={styles.ratingRowNew}>
            <View style={styles.ratingBadgeNew}>
              <Star size={14} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.ratingTextNew}>
                {reviewCount > 0 ? averageRating.toFixed(1) : '4.5'}
              </Text>
            </View>
            <View style={styles.ratingDivider} />
            <Text style={styles.reviewCountText}>
              {reviewCount > 0 ? `${reviewCount} Reviews` : 'No reviews yet'}
            </Text>
          </View>

          {/* Utilization Card */}
          {occupancyRate !== null && (
            <TouchableOpacity 
              activeOpacity={onUtilizationPress ? 0.7 : 1}
              onPress={(e) => {
                if (onUtilizationPress) {
                  e.stopPropagation();
                  onUtilizationPress();
                }
              }}
              style={[styles.utilizationCard, compact && { padding: 12, marginBottom: 12 }]}
            >
              <View style={[styles.utilizationHeader, compact && { marginBottom: 8 }]}>
                <View style={[styles.utilizationIconBox, compact && { width: 28, height: 28, borderRadius: 6 }]}>
                  <BarChart2 size={compact ? 14 : 16} color="#059669" />
                </View>
                <Text style={[styles.utilizationTitle, compact && { fontSize: 14 }]}>Utilization</Text>
                <Text style={[styles.utilizationPercentage, compact && { fontSize: 16 }]}>{Math.round(occupancyRate)}%</Text>
              </View>
              
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${Math.min(100, occupancyRate)}%` }
                    ]} 
                  />
                </View>
              </View>
              
              <Text style={[styles.utilizationSub, compact && { fontSize: 11 }, isUltraNarrow && { fontSize: 10 }]}>
                Usually busy on evenings and weekends
              </Text>
            </TouchableOpacity>
          )}

          {/* Bottom Action: View Maps */}
          {mapsUrl && (
            <TouchableOpacity
              style={styles.viewMapsAction}
              onPress={() => {
                void Linking.openURL(mapsUrl);
              }}
            >
              <View style={styles.viewMapsLeft}>
                <View style={styles.viewMapsIconBox}>
                  <MapIcon size={18} color="#059669" />
                </View>
                <Text style={styles.viewMapsText}>View Maps</Text>
              </View>
              <ChevronRight size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}

          {showBookButton && (
            <View style={styles.bookButtonWrapper}>
              <TouchableOpacity style={styles.bookButton} onPress={onPress}>
                <Text style={styles.bookButtonText}>Book this slot</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Card>
    );
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={glass ? 0.9 : 0.8}
      style={[styles.touchable, compact && styles.touchableCompact, glass && styles.touchableGlass]}
    >
      {renderCardContent()}
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
    padding: 16,
  },
  titlePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  nameCompact: {
    fontSize: 14,
  },
  nameNative: {
    color: NATIVE_TEXT,
  },
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceFromLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  priceValueNew: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
    fontFamily: 'Inter',
  },
  priceUnitNew: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  locationBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationRowShort: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationTextNew: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  teamPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  teamPriceBadgeText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  ratingRowNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  ratingBadgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingTextNew: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  ratingDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E2E8F0',
  },
  reviewCountText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  utilizationCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
  },
  utilizationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  utilizationIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  utilizationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  utilizationPercentage: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
    fontFamily: 'Inter',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  utilizationSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  viewMapsAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  viewMapsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewMapsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewMapsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    fontFamily: 'Inter',
  },
  bookButtonWrapper: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  bookButton: {
    width: '100%',
    height: 44,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(1, 184, 84, 0.4)',
    borderColor: 'rgba(0, 234, 107, 0.5)',
    borderWidth: 1,
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    letterSpacing: -0.3,
  },
  // Glass variant styles
  touchableGlass: {
    marginBottom: 20,
  },
  cardGlass: {
    height: 320,
    backgroundColor: '#000',
    borderRadius: 24,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  imageFull: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 1,
  },
  glassOverlayGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  glassContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      },
    }) as any,
  },
  topBadgesRow: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
  },
  glassRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
  },
  ratingTextGlassBadge: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'Inter',
  },
  glassHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameGlass: {
    color: '#0F172A',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  locationGlass: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  favBtnGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  glassPriceBlock: {
    alignItems: 'flex-end',
  },
  priceGlass: {
    color: '#06392e',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Inter',
  },
  priceUnitGlass: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
    fontFamily: 'Inter',
  },
});
