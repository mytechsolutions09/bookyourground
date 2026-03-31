import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, Platform, TouchableOpacity } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BookingWithDetails } from '@/types';
import BookingCard from '@/components/bookings/BookingCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import { router } from 'expo-router';

export default function OwnerBookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const isWeb = Platform.OS === 'web';
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // 1) Bookings on grounds owned by this user
      const ownedPromise = supabase
        .from('bookings')
        .select(
          `
          *,
          ground:grounds!inner(
            *,
            ground_images(*)
          ),
          user:profiles(full_name, phone)
        `,
        )
        .eq('ground.owner_id', user.id);

      // 2) Bookings this user made as a player (any ground)
      const selfPromise = supabase
        .from('bookings')
        .select(
          `
          *,
          ground:grounds(
            *,
            ground_images(*)
          ),
          user:profiles(full_name, phone)
        `,
        )
        .eq('user_id', user.id);

      const [{ data: ownedData, error: ownedError }, { data: selfData, error: selfError }] =
        await Promise.all([ownedPromise, selfPromise]);

      if (ownedError) throw ownedError;
      if (selfError) throw selfError;

      const map = new Map<string, BookingWithDetails>();
      (ownedData as BookingWithDetails[] | null)?.forEach((b) => map.set(b.id, b));
      (selfData as BookingWithDetails[] | null)?.forEach((b) => map.set(b.id, b));

      const merged = Array.from(map.values()).sort((a, b) =>
        a.booking_date < b.booking_date ? 1 : a.booking_date > b.booking_date ? -1 : 0,
      );

      setBookings(merged);
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
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const renderBookingActions = (booking: BookingWithDetails) => {
    if (booking.status !== 'pending') return null;
    const groundApproved = !!booking.ground?.approved;

    if (!groundApproved) {
      return (
        <Card style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Waiting for admin approval</Text>
          <Text style={styles.actionsSubtext}>
            This ground is not approved by the platform yet.
          </Text>
        </Card>
      );
    }

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

  const availableDates = useMemo(
    () => Array.from(new Set(bookings.map((b) => b.booking_date))).sort(),
    [bookings],
  );

  const filteredBookings = useMemo(
    () =>
      !selectedDate
        ? bookings
        : bookings.filter((b) => b.booking_date === selectedDate),
    [bookings, selectedDate],
  );

  const content = (
    <View style={styles.container}>
      {!isWeb && (
        <View style={styles.header}>
          <Text style={styles.title}>Ground Bookings</Text>
        </View>
      )}

      {isWeb && bookings.length > 0 && (
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Filter by date</Text>
          {/* Web-only native date input */}
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          {
            // @ts-ignore web only element
            <input
              type="date"
              value={selectedDate ?? ''}
              onChange={(e: any) =>
                setSelectedDate(e.target.value ? e.target.value : null)
              }
              style={{
                padding: 6,
                borderRadius: 6,
                border: '1px solid #E5E7EB',
                fontSize: 12,
              }}
            />
          }
          {selectedDate && (
            <TouchableOpacity onPress={() => setSelectedDate(null)}>
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isWeb && bookings.length > 0 && (
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, styles.colGround]}>Ground</Text>
          <Text style={[styles.tableHeaderCell, styles.colDateTime]}>Date & time</Text>
          <Text style={[styles.tableHeaderCell, styles.colAmount]}>Amount & status</Text>
          <Text style={[styles.tableHeaderCell, styles.colWho]}>Who</Text>
        </View>
      )}

      <FlatList
        data={filteredBookings}
        renderItem={({ item }) => {
          const meta =
            item.ground.owner_id === user?.id
              ? item.user_id === user?.id
                ? 'Self booking on your own ground'
                : `Customer: ${item.user?.full_name ?? 'Unknown'}`
              : 'Your booking on another ground';

          if (isWeb) {
            return (
              <TouchableOpacity
                onPress={() => router.push(`/bookings/${item.id}`)}
                activeOpacity={0.8}
                style={styles.tableRow}
              >
                <View style={[styles.tableCell, styles.colGround]}>
                  <Text style={styles.groundName}>{item.ground.name}</Text>
                  <Text style={styles.groundLocation}>
                    {item.ground.city}, {item.ground.state}
                  </Text>
                </View>

                <View style={[styles.tableCell, styles.colDateTime]}>
                  <Text style={styles.dateText}>{item.booking_date}</Text>
                  <Text style={styles.timeText}>
                    {`${item.start_time} – ${item.end_time}`}
                  </Text>
                </View>

                <View style={[styles.tableCell, styles.colAmount]}>
                  <Text style={styles.amount}>{item.total_amount}</Text>
                  <Text style={styles.statusTextInline}>{item.status}</Text>
                </View>

                <View style={[styles.tableCell, styles.colWho]}>
                  <Text style={styles.metaInline}>{meta}</Text>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <View>
              <BookingCard
                booking={item}
                onPress={() => router.push(`/bookings/${item.id}`)}
                showGroundDetails={false}
                metaText={meta}
              />
              {renderBookingActions(item)}
            </View>
          );
        }}
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
    paddingTop: Platform.OS === 'web' ? 16 : 48,
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
  actionsSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  actionsButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  tableCell: {
    paddingRight: 8,
  },
  colGround: {
    flex: 2,
  },
  colDateTime: {
    flex: 2,
  },
  colAmount: {
    flex: 1.2,
  },
  colWho: {
    flex: 2,
  },
  groundName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  groundLocation: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  dateText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusTextInline: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  metaInline: {
    fontSize: 12,
    color: '#6B7280',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc8d3c',
  },
});
