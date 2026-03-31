import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BookingWithDetails } from '@/types';
import { BookingStatus } from '@/types/database';
import BookingCard from '@/components/bookings/BookingCard';
import WebLayout from '@/components/web/WebLayout';

export default function BookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | BookingStatus>('all');
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= 1200;

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
          ground:grounds(
            *,
            ground_images(*)
          )
        `)
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === filter);

  const filterOptions: Array<{ label: string; value: 'all' | BookingStatus }> = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Completed', value: 'completed' },
  ];

  const content = (
    <View style={[styles.container, Platform.OS === 'web' && styles.webContainer]}>
      {Platform.OS === 'web' ? (
        <View style={styles.webCard}>
          <View style={[styles.header, styles.webHeader]}>
            <Text style={styles.title}>My Bookings</Text>
            <View style={styles.filterContainer}>
              {filterOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterButton,
                    filter === option.value && styles.filterButtonActive,
                  ]}
                  onPress={() => setFilter(option.value)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      filter === option.value && styles.filterButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <FlatList
            data={filteredBookings}
            renderItem={({ item }) => (
              <BookingCard
                booking={item}
                onPress={() => router.push(`/bookings/${item.id}`)}
              />
            )}
            keyExtractor={item => item.id}
            key={isWideWeb ? 'bookings-2-cols' : 'bookings-1-col'}
            numColumns={isWideWeb ? 2 : 1}
            columnWrapperStyle={isWideWeb ? styles.webColumnWrapper : undefined}
            contentContainerStyle={styles.webList}
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
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>My Bookings</Text>
            <View style={styles.filterContainer}>
              {filterOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterButton,
                    filter === option.value && styles.filterButtonActive,
                  ]}
                  onPress={() => setFilter(option.value)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      filter === option.value && styles.filterButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <FlatList
            data={filteredBookings}
            renderItem={({ item }) => (
              <BookingCard
                booking={item}
                onPress={() => router.push(`/bookings/${item.id}`)}
              />
            )}
            keyExtractor={item => item.id}
            key="bookings-1-col"
            numColumns={1}
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
        </>
      )}
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
    paddingTop: 24,
    paddingHorizontal: 24,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 16,
  },
  webContainer: {
    paddingHorizontal: 16,
    paddingTop: 0,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  filterButtonActive: {
    backgroundColor: Platform.OS === 'web' ? '#2b2f4b' : '#2196F3',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  list: {
    padding: 16,
  },
  webList: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    width: '100%',
  },
  webColumnWrapper: {
    gap: 16,
  },
  webCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
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
