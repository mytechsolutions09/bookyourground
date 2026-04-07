import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, useWindowDimensions, Platform, Linking } from 'react-native';
import { Calendar, Clock, MapPin, Users, Sword, Map as MapIcon } from 'lucide-react-native';
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
}

const NATIVE_CARD_BG = '#043529';
const NATIVE_ACCENT = '#00ea6b';
const NATIVE_TEXT = '#dcc093';

export default function MatchCard({ match, onJoin, buttonTitle = 'Join Match', teamsCount = '1/2 Teams' }: MatchCardProps) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const IS_DARK = !isWeb || (width < 900);
  
  const primaryImage = match.ground.ground_images?.[0]?.image_url ||
    'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';

  const iconColor = IS_DARK ? NATIVE_ACCENT : '#10b981';
  const textColor = IS_DARK ? NATIVE_TEXT : '#4B5563';
  const titleColor = IS_DARK ? NATIVE_TEXT : '#111827';

  return (
    <Card
      style={[
        styles.card,
        !IS_DARK && styles.cardWeb,
        IS_DARK && styles.cardNative,
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
            <MapPin size={14} color={IS_DARK ? NATIVE_TEXT : '#6B7280'} />
            <Text style={[styles.location, { color: IS_DARK ? NATIVE_TEXT : '#6B7280' }]}>
              {match.ground.city}, {match.ground.state}
            </Text>
            <View style={styles.mapLink}>
              <MapIcon size={12} color={iconColor} />
              <Text style={[styles.mapLinkText, { color: iconColor }]}>View on Map</Text>
            </View>
          </TouchableOpacity>

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
              <Text style={styles.priceValue}>{formatCurrency(Number(match.total_amount))}</Text>
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
});
