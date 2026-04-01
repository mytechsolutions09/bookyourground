import React, { useEffect, useMemo, useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

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

  const todayIso = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const upcomingBookings = useMemo(
    () => bookings.filter(b => b.booking_date >= todayIso),
    [bookings, todayIso],
  );

  const pastBookings = useMemo(
    () => bookings.filter(b => b.booking_date < todayIso),
    [bookings, todayIso],
  );

  const visibleBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  const content = (
    <View style={styles.container}>
      <View style={[styles.header, Platform.OS === 'web' && styles.webHeader]}>
        <Text style={styles.title}>All Bookings</Text>
        <View style={styles.tabsRow}>
          <View
            style={[
              styles.tabChip,
              activeTab === 'upcoming' && styles.tabChipActive,
            ]}
          >
            <Text
              style={[
                styles.tabChipText,
                activeTab === 'upcoming' && styles.tabChipTextActive,
              ]}
              onPress={() => setActiveTab('upcoming')}
            >
              {`Upcoming (${upcomingBookings.length})`}
            </Text>
          </View>
          <View
            style={[
              styles.tabChip,
              activeTab === 'past' && styles.tabChipActive,
            ]}
          >
            <Text
              style={[
                styles.tabChipText,
                activeTab === 'past' && styles.tabChipTextActive,
              ]}
              onPress={() => setActiveTab('past')}
            >
              {`Past (${pastBookings.length})`}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={visibleBookings}
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
  tabsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#111827',
  },
  tabChipActive: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F9FAFB',
  },
  tabChipText: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  tabChipTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
});

