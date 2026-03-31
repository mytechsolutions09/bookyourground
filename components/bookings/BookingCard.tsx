import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, Clock, MapPin } from 'lucide-react-native';
import { Platform } from 'react-native';
import { BookingWithDetails } from '@/types';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/utils/helpers';
import { formatBookingSlotSummary } from '@/utils/bookingSlotFormat';
import Card from '@/components/ui/Card';

interface BookingCardProps {
  booking: BookingWithDetails;
  onPress: () => void;
  showGroundDetails?: boolean;
  metaText?: string;
}

export default function BookingCard({
  booking,
  onPress,
  showGroundDetails = true,
  metaText,
}: BookingCardProps) {
  const primaryImage = booking.ground.ground_images?.[0]?.image_url ||
    'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={[styles.card, Platform.OS === 'web' && styles.cardWeb]}>
        <View style={styles.content}>
          {showGroundDetails && (
            <>
              <Image source={{ uri: primaryImage }} style={styles.image} />
              <Text style={styles.groundName}>{booking.ground.name}</Text>
              <View style={styles.locationRow}>
                <MapPin size={14} color="#666" />
                <Text style={styles.location}>{booking.ground.city}</Text>
              </View>
            </>
          )}

          {!showGroundDetails && (
            <View style={styles.compactHeader}>
              <Text style={styles.compactGroundName}>{booking.ground.name}</Text>
              <Text style={styles.compactGroundLocation}>
                {booking.ground.city}, {booking.ground.state}
              </Text>
            </View>
          )}

          <View style={styles.detailsRow}>
            <View style={styles.detail}>
              <Calendar size={16} color="#dc8d3c" />
              <Text style={styles.detailText}>{formatDate(booking.booking_date)}</Text>
            </View>
            <View style={styles.detail}>
              <Clock size={16} color="#dc8d3c" />
              <Text style={styles.detailText}>
                {formatBookingSlotSummary(
                  booking.start_time,
                  booking.end_time,
                  booking.ground.pitch_type,
                )}
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Text style={styles.amount}>{formatCurrency(booking.total_amount)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
              <Text style={styles.statusText}>{getStatusLabel(booking.status)}</Text>
            </View>
          </View>

          {metaText ? <Text style={styles.metaText}>{metaText}</Text> : null}
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 14,
    color: '#666',
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
    fontSize: 17,
    fontWeight: '700',
    color: '#dc8d3c',
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
  compactGroundLocation: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  metaText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
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
