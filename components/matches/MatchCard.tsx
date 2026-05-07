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
    <TouchableOpacity onPress={onJoin} activeOpacity={0.9} style={styles.touchable}>
      <Card style={[styles.card, styles.cardGlass]}>
        {/* Full Bleed Image */}
        <Image source={{ uri: primaryImage }} style={styles.imageFull} />
        <View style={styles.glassOverlayGradient} />
        
        {/* Top Badges */}
        <View style={styles.topBadgesRow}>
          <View style={styles.statusBadgeGlass}>
            <Users size={12} color="#FFFFFF" />
            <Text style={styles.statusTextGlass}>{teamsCount}</Text>
          </View>
          {(match as any).is_under_review && (
            <View style={[styles.statusBadgeGlass, { backgroundColor: '#EA580C', marginLeft: 8 }]}>
              <Text style={styles.statusTextGlass}>UNDER REVIEW</Text>
            </View>
          )}
        </View>

        {/* The "Film" (Glass Panel) */}
        <View style={styles.glassContent}>
          <View style={styles.glassHeaderRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.opponentTeamGlass}>
                OPPOSITION TEAM | {match.user?.team_name?.toUpperCase() || 'ANONYMOUS TEAM'}
              </Text>
              <Text style={styles.nameGlass}>
                {match.ground.name}
              </Text>
              <View style={styles.locationRowShort}>
                <MapPin size={12} color="rgba(15, 23, 42, 0.7)" />
                <Text style={styles.locationGlass} numberOfLines={1}>{match.ground.city}</Text>
              </View>
            </View>
            <View style={styles.glassPriceBlock}>
              <Text style={styles.priceGlass}>
                {formatCurrency(Number(match.total_amount))}
                <Text style={styles.priceUnitGlass}>/match</Text>
              </Text>
              
              {/* Date & Slot moved under price */}
              <View style={styles.matchMetaRowRight}>
                <View style={styles.scheduleBadge}>
                  <Calendar size={10} color="#0F172A" />
                  <Text style={styles.scheduleTextGlass}>
                    {formatDate(match.booking_date)}
                  </Text>
                </View>
                <View style={styles.scheduleBadge}>
                  <Clock size={10} color="#0F172A" />
                  <Text style={styles.scheduleTextGlass}>
                    {formatBookingSlotSummary(match.start_time, match.end_time, match.ground.pitch_type)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.glassDivider} />

          <View style={styles.actionRowGlass}>
            <TouchableOpacity 
              style={styles.joinButtonGlass}
              onPress={onJoin}
            >
              <Text style={styles.joinButtonTextGlass}>JOIN MATCH</Text>
            </TouchableOpacity>
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
  // Glass variant styles
  cardGlass: {
    height: 380,
    backgroundColor: '#000',
    borderRadius: 24,
    borderWidth: 0,
    borderColor: 'transparent', // Ensure no border color is visible
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
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
  topBadgesRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 20,
  },
  statusBadgeGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  statusTextGlass: {
    fontFamily: 'Inter',
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  glassContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      },
    }) as any,
  },
  glassHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  opponentTeamGlass: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46', // Dark emerald
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  nameGlass: {
    color: '#0F172A',
    fontSize: 16, // Reduced size
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  locationRowShort: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationGlass: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter',
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
  glassPriceBlock: {
    alignItems: 'flex-end',
    gap: 4,
  },
  matchMetaRowRight: {
    flexDirection: 'column', // Stack on small screens/generally
    alignItems: 'flex-end',
    gap: 4,
    marginTop: 6,
  },
  scheduleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scheduleTextGlass: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  actionRowGlass: {
    width: '100%',
    marginTop: 16,
  },
  joinButtonGlass: {
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(1, 184, 84, 0.4)',
    borderColor: 'rgba(0, 234, 107, 0.5)',
    borderWidth: 1,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)' }
    }) as any,
  },
  joinButtonTextGlass: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    letterSpacing: -0.3,
  },
});
