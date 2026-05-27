import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Users } from 'lucide-react-native';
import { BookingWithDetails } from '@/types';
import Card from '@/components/ui/Card';
import { useLocation } from '@/contexts/LocationContext';

interface MatchCardProps {
  match: BookingWithDetails;
  onJoin: () => void;
  buttonTitle?: string;
  teamsCount?: string;
  lightMode?: boolean;
}

export default function MatchCard({
  match,
  onJoin,
  buttonTitle = 'Join Match',
  teamsCount = '1/2 Teams',
  lightMode,
}: MatchCardProps) {
  const { latitude: userLat, longitude: userLng } = useLocation();

  const distance = useMemo(() => {
    if (userLat != null && userLng != null && match.ground?.latitude != null && match.ground?.longitude != null) {
      const lat1 = userLat;
      const lon1 = userLng;
      const lat2 = Number(match.ground.latitude);
      const lon2 = Number(match.ground.longitude);

      if (!isNaN(lat2) && !isNaN(lon2)) {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d.toFixed(1);
      }
    }
    const seed = match.ground?.id ? match.ground.id.charCodeAt(0) + match.ground.id.charCodeAt(match.ground.id.length - 1) : 47;
    return (1.2 + (seed % 89) * 0.1).toFixed(1);
  }, [userLat, userLng, match.ground?.latitude, match.ground?.longitude, match.ground?.id]);

  if (!match.ground) {
    return null;
  }

  const primaryImage =
    match.ground.ground_images?.[0]?.image_url ||
    'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';

  const formattedDateTime = (() => {
    let datePart = match.booking_date;
    if (match.booking_date && match.booking_date.includes('-')) {
      const p = match.booking_date.split('-');
      if (p.length === 3) {
        datePart = `${p[2]}/${p[1]}/${p[0].slice(2)}`;
      }
    }
    const timeStr = match.start_time?.slice(0, 5);
    return `${datePart} / ${timeStr}`;
  })();

  const teamName = match.user?.team_name || 'Anonymous Team';
  const captainName = match.user?.full_name || 'Anonymous';
  const formattedCaptainName = captainName
    .split(' ')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return (
    <TouchableOpacity onPress={onJoin} activeOpacity={0.9} style={styles.touchable}>
      <Card style={styles.premiumMatchCard}>
        <View style={styles.premiumImageWrapper}>
          <Image source={{ uri: primaryImage }} style={styles.premiumImage} />
          <View style={styles.bookableBadge}>
            <Users size={12} color="#06392e" style={{ marginRight: 4 }} />
            <Text style={styles.bookableBadgeText}>{teamsCount}</Text>
          </View>
        </View>

        <View style={styles.premiumContent}>
          <View style={styles.premiumTitleRow}>
            <Text style={styles.premiumMatchName} numberOfLines={1}>{teamName.toUpperCase()}</Text>
            <Text style={styles.premiumPriceText}>
              ₹{match.total_amount || '---'}
              <Text style={styles.premiumPriceUnitText}>/team</Text>
            </Text>
          </View>

          <View style={styles.premiumLocationRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <Text style={styles.premiumLocation} numberOfLines={1}>
                {match.ground.name} ({match.ground.city})
              </Text>
            </View>
            <Text style={styles.premiumDistance}>
              ~ {distance} km
            </Text>
          </View>

          <View style={[styles.premiumSportsRow, { gap: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 80 }}>
              <Text style={styles.premiumVenueType} numberOfLines={1}>
                {formattedCaptainName}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', shrink: 0 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#01e669', fontFamily: 'Inter' }}>
                {formattedDateTime}
              </Text>
            </View>
          </View>

          <View style={styles.premiumActionRow}>
            <TouchableOpacity 
              style={styles.premiumJoinBtn}
              onPress={onJoin}
            >
              <Text style={styles.premiumJoinBtnText}>{buttonTitle.toUpperCase()}</Text>
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
  premiumMatchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 0,
  },
  premiumImageWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
  },
  premiumImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E0E0',
  },
  premiumContent: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  premiumTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  premiumMatchName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginRight: 8,
  },
  premiumPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3450',
    fontFamily: 'Inter',
  },
  premiumPriceUnitText: {
    fontSize: 10,
    fontWeight: '400',
    color: '#64748B',
  },
  premiumLocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumLocation: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  premiumDistance: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '500',
    textAlign: 'right',
  },
  premiumSportsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumVenueType: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  bookableBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#01e669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopLeftRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookableBadgeText: {
    color: '#06392e',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    fontFamily: 'Inter',
    letterSpacing: 0.5,
  },
  premiumActionRow: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  premiumJoinBtn: {
    width: '100%',
    height: 44,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#475569',
    borderColor: '#475569',
    borderWidth: 1,
  },
  premiumJoinBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    letterSpacing: -0.3,
  },
});
