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
      <Card style={cardStyle}>
        {/* Top Image Section with Overlay */}
        <View style={styles.imageWrapper}>
          <Image source={{ uri: primaryImage }} style={styles.image} />
          <View style={styles.imageGradientOverlay} />
          <View style={styles.imageContentOverlay}>
            <View style={styles.statusBadge}>
              <Users size={12} color="#FFFFFF" />
              <Text style={styles.statusText}>{teamsCount}</Text>
            </View>
            <View style={styles.imageBottomText}>
              <Text style={styles.overlayName}>{match.ground.name.toUpperCase()}</Text>
              <View style={styles.overlayLocationRow}>
                <MapPin size={14} color="#FFFFFF" />
                <Text style={styles.overlayLocationText}>{match.ground.city}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Schedule & Price Info Bar */}
        <View style={styles.infoBar}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.infoBarText}>
              {formatDate(match.booking_date)} | {formatBookingSlotSummary(match.start_time, match.end_time, match.ground.pitch_type)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.infoBarPrice}>
              {formatCurrency(Number(match.total_amount))}
            </Text>
            <Text style={styles.infoBarPriceUnit}>/match</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionLabel}>MATCH DETAILS</Text>
          
          {/* Details Box */}
          <View style={styles.detailsBox}>
            <View style={styles.detailsHeader}>
              <Text style={styles.reviewsLabel}>
                {reviewCount > 0 ? `${avgRating.toFixed(1)} RATING` : 'NO REVIEWS YET'}
              </Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((i) => {
                  const filled = reviewCount > 0 && i <= Math.round(avgRating);
                  return (
                    <Star
                      key={i}
                      size={16}
                      color={filled ? '#94A3B8' : '#94A3B8'}
                      fill={filled ? '#94A3B8' : 'none'}
                    />
                  );
                })}
              </View>
            </View>
            
            <View style={styles.opponentRow}>
              <Text style={styles.matchTypeLabel}>EXHIBITION MATCHES</Text>
              <Text style={styles.opponentNames}>
                {(match.user?.full_name || 'Anonymous Player').toUpperCase()} | {match.user?.team_name?.toUpperCase() || 'NO TEAM'}
              </Text>
            </View>
          </View>

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>SPOTS FILLING FAST!</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '50%' }]} />
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.joinButtonLarge}
              onPress={onJoin}
            >
              <Text style={styles.joinButtonLargeText}>JOIN MATCH</Text>
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
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(0,0,0,0.4)', // Simplified overlay, would be a LinearGradient in production
  },
  imageContentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    justifyContent: 'space-between',
  },
  imageBottomText: {
    gap: 2,
  },
  overlayName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'Inter',
    letterSpacing: -0.5,
  },
  overlayLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overlayLocationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontFamily: 'Inter',
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginTop: 8,
    marginHorizontal: 12,
  },
  infoBarText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  infoBarPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
    fontFamily: 'Inter',
  },
  infoBarPriceUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748B',
  },
  content: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    fontFamily: 'Inter',
    letterSpacing: 0.5,
  },
  detailsBox: {
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.3)',
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(0,234,107,0.02)',
    marginBottom: 16,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewsLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  opponentRow: {
    gap: 4,
  },
  matchTypeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  opponentNames: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  progressSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    fontFamily: 'Inter',
    letterSpacing: 0.5,
  },
  progressBarBg: {
    height: 6,
    width: '100%',
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00ea6b', // Would be gradient in production
    borderRadius: 3,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  joinButtonLarge: {
    flex: 1,
    height: 48,
    backgroundColor: '#00ea6b', // Would be gradient in production
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  joinButtonLargeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  walletIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pricePillText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
});
