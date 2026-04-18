import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, useWindowDimensions, Platform, Linking } from 'react-native';
import { Calendar, Clock, MapPin, Users, Star, Map as MapIcon } from 'lucide-react-native';
import { BookingWithDetails } from '@/types';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { formatBookingSlotSummary } from '@/utils/bookingSlotFormat';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface MatchCardProps {
  match: BookingWithDetails;
  onJoin: () => void;
  buttonTitle?: string;
  teamsCount?: string;
  lightMode?: boolean;
}

const NATIVE_CARD_BG = '#06392e';
const NATIVE_BORDER = '#02c259';
const NATIVE_TEXT = '#dcc093';

export default function MatchCard({
  match,
  onJoin,
  buttonTitle = 'Join Match',
  teamsCount = '1/2 Teams',
  lightMode,
}: MatchCardProps) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const IS_DARK = !isWeb || width < 900;
  const isLight = lightMode || (!isWeb && !IS_DARK) || (isWeb && !IS_DARK);

  const primaryImage =
    match.ground.ground_images?.[0]?.image_url ||
    'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';

  const iconColor = isLight ? '#10b981' : NATIVE_BORDER;
  const textColor = isLight ? '#4B5563' : NATIVE_TEXT;
  const titleColor = isLight ? '#043529' : NATIVE_TEXT;
  const pinColor = isLight ? '#666' : NATIVE_TEXT;

  // Calculate rating
  const reviews = (match.ground as any).reviews || [];
  const reviewCount = reviews.length;
  const avgRating =
    reviewCount > 0
      ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviewCount
      : 0;

  const cardStyle = [
    styles.card,
    !isLight && styles.cardNative,
    isLight && styles.cardWeb,
  ];

  return (
    <TouchableOpacity onPress={onJoin} activeOpacity={0.8} style={styles.touchable}>
      <Card style={cardStyle}>
        <View style={styles.imageWrapper}>
          <Image source={{ uri: primaryImage }} style={styles.image} />
          <View style={styles.statusBadge}>
            <Users size={12} color="#FFFFFF" />
            <Text style={styles.statusText}>{teamsCount}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, { color: titleColor }]} numberOfLines={1}>
              {match.ground.name}
            </Text>
            <Text style={styles.price}>
              {formatCurrency(Number(match.total_amount))}
              <Text style={styles.priceUnit}> / match</Text>
            </Text>
          </View>

          <View style={styles.subTitleRow}>
            <View style={styles.ratingBlockRow}>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((i) => {
                  const filled = reviewCount > 0 && i <= Math.round(avgRating);
                  return (
                    <Star
                      key={i}
                      size={14}
                      color={filled ? '#FFA000' : '#D1D5DB'}
                      fill={filled ? '#FFA000' : 'none'}
                    />
                  );
                })}
              </View>
              <Text style={[styles.ratingText, { color: isLight ? '#666' : NATIVE_TEXT }]}>
                {reviewCount > 0
                  ? `${avgRating.toFixed(1)} (${reviewCount})`
                  : 'No reviews yet'}
              </Text>
            </View>
            <View style={styles.locationRowShort}>
              <MapPin size={12} color={pinColor} />
              <Text style={[styles.location, { color: pinColor }]} numberOfLines={1}>
                {match.ground.city}
              </Text>
            </View>
          </View>

          <View style={styles.opponentSection}>
            <View style={styles.opponentAvatar}>
              <Users size={14} color={iconColor} />
            </View>
            <View style={styles.opponentInfo}>
              <Text style={[styles.opponentLabel, { color: isLight ? '#9CA3AF' : textColor }]}>
                OPPONENT WAITING
              </Text>
              <Text style={[styles.opponentName, { color: titleColor }]}>
                {(match.user?.full_name || 'Anonymous Player').toUpperCase()}
                {match.user?.team_name && (
                  <Text style={styles.teamNameHighlight}> • {match.user.team_name.toUpperCase()}</Text>
                )}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.scheduleBlock}>
            <View style={styles.scheduleRow}>
              <Calendar size={13} color={iconColor} />
              <Text style={[styles.scheduleText, { color: textColor }]} numberOfLines={1}>
                {formatDate(match.booking_date)}
              </Text>
            </View>
            <View style={styles.scheduleRow}>
              <Clock size={13} color={iconColor} />
              <Text style={[styles.scheduleText, { color: textColor }]} numberOfLines={1}>
                {formatBookingSlotSummary(match.start_time, match.end_time, match.ground.pitch_type)}
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.mapsBtn, !isLight && styles.mapsBtnNative]}
              onPress={() => {
                const query = encodeURIComponent(
                  `${match.ground.address}, ${match.ground.city}, ${match.ground.state}`,
                );
                const url = Platform.select({
                  ios: `maps:0,0?q=${query}`,
                  android: `geo:0,0?q=${query}`,
                  default: `https://www.google.com/maps/search/?api=1&query=${query}`,
                });
                Linking.openURL(url!);
              }}
            >
              <MapIcon size={12} color={iconColor} />
              <Text style={[styles.mapsLink, { color: isLight ? '#6B7280' : NATIVE_BORDER }]}>
                View maps
              </Text>
            </TouchableOpacity>

            <Button
              title={buttonTitle}
              onPress={onJoin}
              variant="primary"
              size="small"
              style={styles.joinButton}
              textStyle={styles.joinButtonText}
            />
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
    marginBottom: 8,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 8,
    width: '100%',
    alignSelf: 'stretch',
  },
  cardNative: {
    backgroundColor: NATIVE_CARD_BG,
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.2)',
  },
  cardWeb: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
  },
  image: {
    width: '100%',
    height: undefined,
    aspectRatio: 16 / 9,
    backgroundColor: '#E0E0E0',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontFamily: 'Inter',
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
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
    fontFamily: 'Inter',
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
  },
  price: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#02c259',
  },
  priceUnit: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '400',
    color: '#6B7280',
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
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
  },
  locationRowShort: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  location: {
    fontFamily: 'Inter',
    fontSize: 14,
  },
  opponentSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    backgroundColor: 'rgba(0,234,107,0.03)',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.08)',
  },
  opponentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,234,107,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  opponentInfo: {
    flex: 1,
  },
  opponentLabel: {
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  opponentName: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '500',
  },
  teamNameHighlight: {
    fontFamily: 'Inter',
    fontWeight: '800',
    color: '#10b981',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 10,
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
    fontFamily: 'Inter',
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapsBtnNative: {
    gap: 6,
  },
  mapsLink: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  joinButton: {
    borderRadius: 10,
    minWidth: 100,
    height: 34,
    backgroundColor: '#00ea6b',
  },
  joinButtonText: {
    fontFamily: 'Inter',
    color: '#043529',
    fontWeight: '700',
    fontSize: 13,
  },
});
