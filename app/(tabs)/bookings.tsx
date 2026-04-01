import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Platform, useWindowDimensions } from 'react-native';
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
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= 1100;
  const isExtraWideWeb = Platform.OS === 'web' && width >= 1350;
  const isMediumWeb = Platform.OS === 'web' && width >= 768 && width < 1100;

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
    <View style={[styles.container, Platform.OS === 'web' && styles.webContainer]}>
      {Platform.OS === 'web' ? (
        <View style={styles.webCard}>
          <View style={[styles.header, styles.webHeader]}>
            <View>
              <Text style={styles.title}>My Bookings</Text>
              <Text style={styles.subtitle}>
                Track upcoming games, past sessions, and booking details in one place.
              </Text>
              <View style={styles.tabRow}>
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
            <View style={styles.badgePill}>
              <Text style={styles.badgePillNumber}>{bookings.length}</Text>
              <Text style={styles.badgePillLabel}>total bookings</Text>
            </View>
          </View>

          <FlatList
            data={visibleBookings}
            renderItem={({ item }) => (
              <View style={styles.webItem}>
                <BookingCard
                  booking={item}
                  onPress={() => router.push(`/bookings/${item.id}`)}
                />
              </View>
            )}
            keyExtractor={item => item.id}
            key={
              isExtraWideWeb
                ? 'bookings-4-cols'
                : isWideWeb
                ? 'bookings-3-cols'
                : isMediumWeb
                ? 'bookings-2-cols'
                : 'bookings-1-col'
            }
            numColumns={isExtraWideWeb ? 4 : isWideWeb ? 3 : isMediumWeb ? 2 : 1}
            columnWrapperStyle={
              isExtraWideWeb || isWideWeb || isMediumWeb ? styles.webColumnWrapper : undefined
            }
            style={styles.webFlatList}
            contentContainerStyle={styles.webList}
            showsVerticalScrollIndicator
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
            <Text style={styles.subtitle}>
              All your ground reservations and match history.
            </Text>
            <View style={styles.tabRow}>
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
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 0,
  },
  webHeader: {
    paddingTop: 22,
    paddingHorizontal: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229,231,235,0.9)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  webContainer: {
    paddingHorizontal: 20,
    paddingTop: 0,
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  list: {
    padding: 16,
  },
  webList: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 32,
    width: '100%',
  },
  webColumnWrapper: {
    gap: 16,
  },
  webItem: {
    flex: 1,
  },
  webCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.9)',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    ...Platform.select({
      web: {
        flex: 1,
        minHeight: 0,
      },
    }),
  },
  webFlatList: {
    ...Platform.select({
      web: {
        flex: 1,
      },
    }),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 72,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
  },
  badgePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(220,141,60,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220,141,60,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 78,
  },
  badgePillNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#dc8d3c',
  },
  badgePillLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: '#9CA3AF',
  },
  tabRow: {
    marginTop: 12,
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
