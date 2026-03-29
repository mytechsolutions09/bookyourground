import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BookingWithDetails } from '@/types';
import BookingCard from '@/components/bookings/BookingCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function OwnerBookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          ground:grounds!inner(
            *,
            ground_images(*)
          ),
          user:profiles(full_name, phone)
        `)
        .eq('ground.owner_id', user.id)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: 'confirmed' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;

      Alert.alert('Success', `Booking ${status} successfully`);
      loadBookings();
      setSelectedBooking(null);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const renderBookingActions = (booking: BookingWithDetails) => {
    if (booking.status !== 'pending') return null;

    return (
      <Card style={styles.actionsCard}>
        <Text style={styles.actionsTitle}>Pending Approval</Text>
        <View style={styles.actionsButtons}>
          <Button
            title="Approve"
            onPress={() => updateBookingStatus(booking.id, 'confirmed')}
            variant="secondary"
            size="small"
            style={{ flex: 1 }}
          />
          <Button
            title="Reject"
            onPress={() => updateBookingStatus(booking.id, 'rejected')}
            variant="danger"
            size="small"
            style={{ flex: 1 }}
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ground Bookings</Text>
      </View>

      <FlatList
        data={bookings}
        renderItem={({ item }) => (
          <View>
            <BookingCard
              booking={item}
              onPress={() => setSelectedBooking(selectedBooking?.id === item.id ? null : item)}
            />
            {selectedBooking?.id === item.id && renderBookingActions(item)}
          </View>
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadBookings} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No bookings yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
  },
  list: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  actionsCard: {
    marginTop: -4,
    marginBottom: 12,
    backgroundColor: '#FFF9E6',
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 12,
  },
  actionsButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});
