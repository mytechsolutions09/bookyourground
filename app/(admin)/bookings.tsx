import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { BookingWithDetails } from '@/types';
import BookingCard from '@/components/bookings/BookingCard';
import WebLayout from '@/components/web/WebLayout';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminBookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadBookings();
  }, [user]);

  const loadBookings = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          ground:grounds(
            *,
            ground_images(*)
          ),
          user:profiles(full_name, phone)
        `)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (e) {
      console.error('Error loading admin bookings:', e);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <View style={styles.container}>
      <View style={[styles.header, Platform.OS === 'web' && styles.webHeader]}>
        <Text style={styles.title}>All Bookings</Text>
        <Text style={styles.subtitle}>{bookings.length} total</Text>
      </View>

      <FlatList
        data={bookings}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onPress={() => router.push(`/bookings/${item.id}`)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadBookings} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No bookings found</Text>
          </View>
        }
      />
    </View>
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
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  webHeader: {
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
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
});

