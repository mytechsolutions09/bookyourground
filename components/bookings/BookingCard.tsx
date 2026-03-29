import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, Clock, MapPin } from 'lucide-react-native';
import { BookingWithDetails } from '@/types';
import { formatCurrency, formatDate, formatTime, getStatusColor, getStatusLabel } from '@/utils/helpers';
import Card from '@/components/ui/Card';

interface BookingCardProps {
  booking: BookingWithDetails;
  onPress: () => void;
  showGroundDetails?: boolean;
}

export default function BookingCard({ booking, onPress, showGroundDetails = true }: BookingCardProps) {
  const primaryImage = booking.ground.ground_images?.[0]?.image_url ||
    'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.card}>
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

          <View style={styles.detailsRow}>
            <View style={styles.detail}>
              <Calendar size={16} color="#2196F3" />
              <Text style={styles.detailText}>{formatDate(booking.booking_date)}</Text>
            </View>
            <View style={styles.detail}>
              <Clock size={16} color="#2196F3" />
              <Text style={styles.detailText}>
                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.amount}>{formatCurrency(booking.total_amount)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
              <Text style={styles.statusText}>{getStatusLabel(booking.status)}</Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  content: {
    gap: 8,
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    marginBottom: 4,
  },
  groundName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
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
    gap: 8,
    marginTop: 4,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2196F3',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
