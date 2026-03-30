import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MapPin, Star, Clock, Users } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import WebLayout from '@/components/web/WebLayout';
import LandingBookingForm from '@/components/landing/LandingBookingForm';

export default function GroundDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [ground, setGround] = useState<GroundWithImages | null>(null);
  const [loading, setLoading] = useState(true);

  const groundId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    loadGround();
  }, [id]);

  const loadGround = async () => {
    try {
      const { data, error } = await supabase
        .from('grounds')
        .select(`
          *,
          ground_images(*),
          reviews(rating, comment, user:profiles(full_name))
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setGround(data);
    } catch (error) {
      console.error('Error loading ground:', error);
      Alert.alert('Error', 'Failed to load ground details');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !ground) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const primaryImage = ground.ground_images?.find(img => img.is_primary)?.image_url ||
    ground.ground_images?.[0]?.image_url ||
    'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';

  const averageRating = ground.reviews?.length
    ? ground.reviews.reduce((sum, r) => sum + r.rating, 0) / ground.reviews.length
    : 0;

  const handleBookNow = () => {
    if (!user) {
      if (Platform.OS === 'web') {
        alert('Please login to book a ground');
      } else {
        Alert.alert('Login Required', 'Please login to book a ground');
      }
      router.push('/(auth)/login');
      return;
    }
    if (Platform.OS === 'web') {
      alert('Booking functionality will be available soon!');
    } else {
      Alert.alert('Coming Soon', 'Booking functionality will be available soon!');
    }
  };

  const content = (
    <ScrollView style={styles.container}>
      <Image source={{ uri: primaryImage }} style={styles.image} />

      <View style={styles.content}>
        <Text style={styles.name}>{ground.name}</Text>

        <View style={styles.locationRow}>
          <MapPin size={18} color="#666" />
          <Text style={styles.location}>
            {ground.address}, {ground.city}, {ground.state} - {ground.pincode}
          </Text>
        </View>

        {ground.reviews && ground.reviews.length > 0 && (
          <View style={styles.ratingRow}>
            <Star size={18} color="#FFA000" fill="#FFA000" />
            <Text style={styles.rating}>
              {averageRating.toFixed(1)} ({ground.reviews.length} reviews)
            </Text>
          </View>
        )}

        <Card style={styles.priceCard}>
          <Text style={styles.price}>{formatCurrency(ground.base_price_per_hour)}/hour</Text>
        </Card>

        {ground.description && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{ground.description}</Text>
          </Card>
        )}

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          {ground.pitch_type && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pitch Type</Text>
              <Text style={styles.detailValue}>{ground.pitch_type}</Text>
            </View>
          )}
          {ground.ground_size && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ground Size</Text>
              <Text style={styles.detailValue}>{ground.ground_size}</Text>
            </View>
          )}
          {ground.capacity && (
            <View style={styles.detailRow}>
              <Users size={16} color="#666" />
              <Text style={styles.detailValue}>Capacity: {ground.capacity} players</Text>
            </View>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenitiesGrid}>
            {ground.has_floodlights && (
              <View style={styles.amenityChip}>
                <Text style={styles.amenityText}>Floodlights</Text>
              </View>
            )}
            {ground.has_parking && (
              <View style={styles.amenityChip}>
                <Text style={styles.amenityText}>Parking</Text>
              </View>
            )}
            {ground.has_changing_rooms && (
              <View style={styles.amenityChip}>
                <Text style={styles.amenityText}>Changing Rooms</Text>
              </View>
            )}
            {ground.has_pavilion && (
              <View style={styles.amenityChip}>
                <Text style={styles.amenityText}>Pavilion</Text>
              </View>
            )}
          </View>
        </Card>

        {Platform.OS === 'web' && groundId && (
          <LandingBookingForm initialGroundId={String(groundId)} hideGroundPicker />
        )}

        {Platform.OS !== 'web' && (
          <Button
            title="Book Now"
            onPress={handleBookNow}
            fullWidth
            size="large"
            style={styles.bookButton}
          />
        )}
      </View>
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  image: {
    width: '100%',
    height: 280,
    backgroundColor: '#E0E0E0',
  },
  content: {
    padding: 16,
    ...Platform.select({
      web: {
        maxWidth: 800,
        marginHorizontal: 'auto',
        width: '100%',
      },
    }),
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  location: {
    flex: 1,
    fontSize: 15,
    color: '#666',
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  rating: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  priceCard: {
    backgroundColor: Platform.OS === 'web' ? '#2b2f4b' : '#E3F2FD',
    marginBottom: 16,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: Platform.OS === 'web' ? '#dc8d3c' : '#2196F3',
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 15,
    color: '#666',
  },
  detailValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  amenityText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bookButton: {
    marginTop: 8,
    marginBottom: 32,
  },
});
