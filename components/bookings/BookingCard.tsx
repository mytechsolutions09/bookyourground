import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, Clock, MapPin, Users } from 'lucide-react-native';
import { Platform } from 'react-native';
import { BookingWithDetails } from '@/types';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/utils/helpers';
import { formatBookingSlotSummary } from '@/utils/bookingSlotFormat';
import { cricketTeamsLabelFromBooking } from '@/utils/cricketGround';
import Card from '@/components/ui/Card';

interface BookingCardProps {
  booking: BookingWithDetails;
  onPress: () => void;
  showGroundDetails?: boolean;
  metaText?: string;
}

const NATIVE_CARD_BG = '#043529';
const NATIVE_ACCENT = '#02c259';
const NATIVE_TEXT = '#dcc093';

export default function BookingCard({
  booking,
  onPress,
  showGroundDetails = true,
  metaText,
}: BookingCardProps) {
  const isWeb = Platform.OS === 'web';
  const primaryImage = booking.ground.ground_images?.[0]?.image_url ||
    'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';

  const cricketTeamsLabel = cricketTeamsLabelFromBooking(
    booking.ground.pitch_type,
    booking.notes,
  );

  const iconDetail = isWeb ? '#dc8d3c' : NATIVE_ACCENT;
  const pinColor = isWeb ? '#666' : NATIVE_TEXT;
  const groundNameStyle = [styles.groundName, !isWeb && styles.groundNameNative];
  const locationStyle = [styles.location, !isWeb && styles.locationNative];
  const detailTextStyle = [styles.detailText, !isWeb && styles.detailTextNative];
  const compactNameStyle = [styles.compactGroundName, !isWeb && styles.compactGroundNameNative];
  const compactLocStyle = [styles.compactGroundLocation, !isWeb && styles.compactGroundLocationNative];
  const amountStyle = [styles.amount, !isWeb && styles.amountNative];
  const metaStyle = [styles.metaText, !isWeb && styles.metaTextNative];
  const badgeBg = isWeb ? getStatusColor(booking.status) : NATIVE_ACCENT;
  const statusLabelStyle = styles.statusText;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card
        style={[
          styles.card,
          isWeb && styles.cardWeb,
          !isWeb && styles.cardNative,
        ]}
      >
        <View style={styles.content}>
          {showGroundDetails && (
            <>
              <Image source={{ uri: primaryImage }} style={styles.image} />
              <Text style={groundNameStyle}>{booking.ground.name}</Text>
              <View style={styles.locationRow}>
                <MapPin size={14} color={pinColor} />
                <Text style={locationStyle}>{booking.ground.city}</Text>
              </View>
            </>
          )}

          {!showGroundDetails && (
            <View style={styles.compactHeader}>
              <Text style={compactNameStyle}>{booking.ground.name}</Text>
              <Text style={compactLocStyle}>
                {booking.ground.city}, {booking.ground.state}
              </Text>
            </View>
          )}

          <View style={styles.detailsRow}>
            <View style={styles.detail}>
              <Calendar size={16} color={iconDetail} />
              <Text style={detailTextStyle}>{formatDate(booking.booking_date)}</Text>
            </View>
            <View style={styles.detail}>
              <Clock size={16} color={iconDetail} />
              <Text style={detailTextStyle}>
                {formatBookingSlotSummary(
                  booking.start_time,
                  booking.end_time,
                  booking.ground.pitch_type,
                )}
              </Text>
            </View>
            {cricketTeamsLabel ? (
              <View style={styles.detail}>
                <Users size={16} color={iconDetail} />
                <Text style={detailTextStyle}>{cricketTeamsLabel}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Text style={amountStyle}>{formatCurrency(booking.total_amount)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
              <Text style={statusLabelStyle}>{getStatusLabel(booking.status)}</Text>
            </View>
          </View>

          {metaText ? <Text style={metaStyle}>{metaText}</Text> : null}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    borderRadius: 18,
    overflow: 'hidden',
    flex: 1,
  },
  cardWeb: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.9)',
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
  content: {
    gap: 8,
    padding: 10,
  },
  image: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    marginBottom: 4,
  },
  groundName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  groundNameNative: {
    color: NATIVE_TEXT,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  locationNative: {
    color: NATIVE_TEXT,
  },
  detailsRow: {
    gap: 6,
    marginTop: 4,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#4B5563',
  },
  detailTextNative: {
    color: NATIVE_TEXT,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  footerLeft: {
    gap: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#dc8d3c',
  },
  amountNative: {
    color: NATIVE_ACCENT,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  compactHeader: {
    marginBottom: 4,
  },
  compactGroundName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  compactGroundNameNative: {
    color: NATIVE_TEXT,
  },
  compactGroundLocation: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  compactGroundLocationNative: {
    color: NATIVE_TEXT,
  },
  metaText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
  metaTextNative: {
    color: NATIVE_TEXT,
  },
  metaMuted: {
    fontSize: 12,
    color: '#6B7280',
  },
  ownerListCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  ownerCol: {
    flex: 1,
    minWidth: 0,
  },
  ownerAmountCol: {
    alignItems: 'flex-start',
    gap: 4,
  },
});
