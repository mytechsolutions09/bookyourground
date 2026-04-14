import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, useWindowDimensions, Platform, Linking } from 'react-native';
import { Calendar, Clock, MapPin, Users, Sword, Map as MapIcon, Star } from 'lucide-react-native';
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

const NATIVE_CARD_BG = '#043529';
const NATIVE_ACCENT = '#00ea6b';
const NATIVE_TEXT = '#dcc093';

export default function MatchCard({ match, onJoin, buttonTitle = 'Join Match', teamsCount = '1/2 Teams', lightMode }: MatchCardProps) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const IS_DARK = !isWeb || (width < 900);
  const isLight = lightMode || (!isWeb && !IS_DARK) || (isWeb && !IS_DARK);
  
  const primaryImage = match.ground.ground_images?.[0]?.image_url ||
    'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';

  const iconColor = isLight ? '#10b981' : NATIVE_ACCENT;
  const textColor = isLight ? '#4B5563' : NATIVE_TEXT;
  const titleColor = isLight ? '#111827' : NATIVE_TEXT;
  const pinColor = isLight ? '#666' : NATIVE_TEXT;
  const subtleTextColor = isLight ? '#9CA3AF' : NATIVE_TEXT;

  // Calculate rating
  const reviews = (match.ground as any).reviews || [];
  const reviewCount = reviews.length;
  const avgRating = reviewCount > 0
    ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviewCount
    : 0;

  return (
    <Card
      style={[
        styles.card,
        isWeb && !IS_DARK && styles.cardWeb,
        !isWeb && IS_DARK && !isLight && styles.cardNative,
        isLight && styles.cardLight,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: primaryImage }} style={styles.image} />
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.groundName, { color: titleColor }]}>{match.ground.name}</Text>
            <View style={[
              styles.statusBadge, 
              styles.statusBadgeInline,
              !IS_DARK && styles.statusBadgeWeb
            ]}>
              <Users size={12} color={IS_DARK ? '#fff' : '#6B7280'} />
              <Text style={[styles.statusText, !IS_DARK && styles.statusTextWeb]}>{teamsCount}</Text>
            </View>
          </View>

          {/* New Rating Row */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((i) => {
              const filled = reviewCount > 0 && i <= Math.round(avgRating);
              return (
                <Star
                  key={i}
                  size={12}
                  color={filled ? '#FFA000' : (isLight ? '#E5E7EB' : '#374151')}
                  fill={filled ? '#FFA000' : 'none'}
                />
              );
            })}
            <Text style={[styles.ratingText, { color: isLight ? '#6B7280' : '#9CA3AF' }]}>
              {reviewCount > 0
                ? `${avgRating.toFixed(1)} (${reviewCount} reviews)`
                : 'No reviews yet'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.locationRow}
            onPress={() => {
              const query = encodeURIComponent(`${match.ground.address}, ${match.ground.city}, ${match.ground.state}`);
              const url = Platform.select({
                ios: `maps:0,0?q=${query}`,
                android: `geo:0,0?q=${query}`,
                default: `https://www.google.com/maps/search/?api=1&query=${query}`
              });
              Linking.openURL(url);
            }}
          >
            <MapPin size={14} color={pinColor} />
            <Text style={[styles.location, { color: pinColor }]}>
              {match.ground.city}, {match.ground.state}
            </Text>
            <View style={styles.mapLink}>
              <MapIcon size={12} color={iconColor} />
              <Text style={[styles.mapLinkText, { color: iconColor }]}>View on Map</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.opponentRow}>
             <View style={styles.opponentAvatar}>
                <Users size={14} color={iconColor} />
             </View>
             <View style={styles.opponentInfo}>
                <Text style={[styles.opponentLabel, { color: isWeb && !IS_DARK ? '#9CA3AF' : textColor }]}>OPPONENT WAITING</Text>
                <Text style={[styles.opponentName, { color: titleColor }]}>
                   {(match.user?.full_name || 'Anonymous Player').toUpperCase()}
                   {match.user?.team_name && (
                      <Text style={styles.teamNameHighlight}> • {match.user.team_name.toUpperCase()}</Text>
                   )}
                </Text>
             </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Calendar size={16} color={iconColor} />
              <Text style={[styles.detailText, { color: textColor }]}>{formatDate(match.booking_date)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Clock size={16} color={iconColor} />
              <Text style={[styles.detailText, { color: textColor }]}>
                {formatBookingSlotSummary(
                  match.start_time,
                  match.end_time,
                  match.ground.pitch_type,
                )}
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>{teamsCount === '2/2 Teams' ? 'Total Paid' : 'Price to join'}</Text>
              <Text style={[styles.priceValue, isLight && styles.priceValueLight]}>{formatCurrency(Number(match.total_amount))}</Text>
            </View>
            
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
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardWeb: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardNative: {
    backgroundColor: '#06392e',
    borderColor: 'rgba(0,234,107,0.15)',
    borderWidth: 1,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  content: {
    flexDirection: 'column',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 150,
    backgroundColor: '#eee',
  },
  statusBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadgeInline: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeWeb: {
    backgroundColor: '#f3f4f6',
  },
  statusTextWeb: {
    color: '#6B7280',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    padding: 16,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  groundName: {
    ...Platform.select({
      web: { fontSize: 22 },
      default: { fontSize: 18 },
    }),
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
    marginTop: -2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
  location: {
    ...Platform.select({
      web: { fontSize: 15 },
      default: { fontSize: 14 },
    }),
  },
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    backgroundColor: 'rgba(0,234,107,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mapLinkText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    ...Platform.select({
      web: { fontSize: 15 },
      default: { fontSize: 14 },
    }),
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  priceContainer: {
    gap: 0,
  },
  priceLabel: {
    ...Platform.select({
      web: { fontSize: 12 },
      default: { fontSize: 11 },
    }),
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  priceValue: {
    ...Platform.select({
      web: { fontSize: 20 },
      default: { fontSize: 18 },
    }),
    fontWeight: '900',
    color: '#00ea6b',
  },
  priceValueLight: {
    color: '#02c259',
  },
  joinButton: {
    borderRadius: 10,
    ...Platform.select({
      web: { minWidth: 120, height: 36 },
      default: { minWidth: 110, height: 34 },
    }),
    backgroundColor: '#00ea6b',
  },
  joinButtonText: {
    color: '#043529',
    fontWeight: '700',
  },
  opponentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    backgroundColor: 'rgba(0,234,107,0.03)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.08)',
  },
  opponentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,234,107,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  opponentInfo: {
    flex: 1,
  },
  opponentLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  opponentName: {
    fontSize: 14,
    fontWeight: '700',
  },
  teamNameHighlight: {
    fontWeight: '800',
    color: '#10b981',
  },
});
