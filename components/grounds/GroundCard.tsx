import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MapPin, Star, Calendar, Clock } from 'lucide-react-native';
import { GroundWithImages } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import { getGroundBookingScheduleLines } from '@/utils/bookingSlots';
import Card from '@/components/ui/Card';

interface GroundCardProps {
  ground: GroundWithImages;
  onPress: () => void;
  /** When true, show booking dates + slot pattern (admin / owner). Default true. */
  showBookingSchedule?: boolean;
}

export default function GroundCard({
  ground,
  onPress,
  showBookingSchedule = true,
}: GroundCardProps) {
  const schedule = useMemo(
    () => getGroundBookingScheduleLines(ground.pitch_type),
    [ground.pitch_type],
  );
  const primaryImage = ground.ground_images?.find(img => img.is_primary)?.image_url ||
    ground.ground_images?.[0]?.image_url ||
    'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';

  const averageRating = ground.reviews?.length
    ? ground.reviews.reduce((sum, r) => sum + r.rating, 0) / ground.reviews.length
    : 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.card}>
        <Image source={{ uri: primaryImage }} style={styles.image} />
        <View style={styles.content}>
          <Text style={styles.name}>{ground.name}</Text>
          <View style={styles.locationRow}>
            <MapPin size={14} color="#666" />
            <Text style={styles.location}>{ground.city}, {ground.state}</Text>
          </View>
          {ground.reviews && ground.reviews.length > 0 && (
            <View style={styles.ratingRow}>
              <Star size={14} color="#FFA000" fill="#FFA000" />
              <Text style={styles.rating}>
                {averageRating.toFixed(1)} ({ground.reviews.length})
              </Text>
            </View>
          )}
          {showBookingSchedule ? (
            <View style={styles.scheduleBlock}>
              <View style={styles.scheduleRow}>
                <Calendar size={13} color="#6B7280" />
                <Text style={styles.scheduleText} numberOfLines={2}>
                  {schedule.datesLine}
                </Text>
              </View>
              <View style={styles.scheduleRow}>
                <Clock size={13} color="#6B7280" />
                <Text style={styles.scheduleText} numberOfLines={3}>
                  {schedule.slotsLine}
                </Text>
              </View>
            </View>
          ) : null}
          <View style={styles.footer}>
            <Text style={styles.price}>{formatCurrency(ground.base_price_per_hour)}/hr</Text>
            <View style={styles.amenities}>
              {ground.has_floodlights && <Text style={styles.amenity}>Lights</Text>}
              {ground.has_parking && <Text style={styles.amenity}>Parking</Text>}
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#E0E0E0',
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  rating: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
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
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: Platform.OS === 'web' ? '#dc8d3c' : '#2196F3',
  },
  amenities: {
    flexDirection: 'row',
    gap: 6,
  },
  amenity: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
});
