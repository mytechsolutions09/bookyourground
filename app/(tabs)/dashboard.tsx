import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import WebLayout from '@/components/web/WebLayout';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

function DashboardContent() {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    const loadBookings = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('bookings')
          .select(
            `
            id,
            booking_date,
            start_time,
            end_time,
            ground_id,
            status,
            ground:grounds(
              id,
              name,
              city,
              state
            )
          `,
          )
          .eq('user_id', user.id)
          .order('booking_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) throw error;
        setBookings(data || []);
      } catch (err) {
        console.error('Error loading dashboard bookings:', err);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [user]);

  const todayIso = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const upcomingBookings = useMemo(
    () => bookings.filter((b) => b.booking_date >= todayIso),
    [bookings, todayIso],
  );

  const pastBookings = useMemo(
    () => bookings.filter((b) => b.booking_date < todayIso),
    [bookings, todayIso],
  );

  const nextBooking = upcomingBookings[0] ?? null;
  const lastBooking = pastBookings.length > 0 ? pastBookings[pastBookings.length - 1] : null;

  const favoriteGround = useMemo(() => {
    if (!bookings.length) return null;
    const counts: Record<
      string,
      {
        count: number;
        name: string | null;
      }
    > = {};

    for (const b of bookings) {
      const id = b.ground_id;
      if (!id) continue;
      if (!counts[id]) {
        counts[id] = { count: 0, name: b.ground?.name ?? null };
      }
      counts[id].count += 1;
    }

    let bestId: string | null = null;
    let bestCount = 0;
    Object.entries(counts).forEach(([id, value]) => {
      if (value.count > bestCount) {
        bestId = id;
        bestCount = value.count;
      }
    });

    if (!bestId) return null;
    const meta = counts[bestId];
    return {
      name: meta.name ?? 'Ground',
      count: meta.count,
    };
  }, [bookings]);

  const totalUniqueGrounds = useMemo(
    () => new Set(bookings.map((b) => b.ground_id)).size,
    [bookings],
  );

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <View style={styles.headerRowCompact}>
          <View>
            <Text style={styles.welcomeTitle}>Dashboard</Text>
            <Text style={styles.welcomeSubtitle}>
              Overview of your games and favorite grounds.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(tabs)/grounds' as any)}
          >
            <Text style={styles.primaryButtonText}>Book a ground</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>Total grounds booked</Text>
            <Text style={styles.statsValue}>
              {loading ? '—' : totalUniqueGrounds}
            </Text>
            <Text style={styles.statsCaption}>
              {loading
                ? 'Loading your history…'
                : totalUniqueGrounds === 0
                ? 'No bookings yet'
                : totalUniqueGrounds === 1
                ? 'You have booked 1 ground'
                : `You have booked ${totalUniqueGrounds} grounds`}
            </Text>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>Next booking</Text>
            {loading ? (
              <Text style={styles.statsCaption}>Loading…</Text>
            ) : nextBooking ? (
              <>
                <Text style={styles.statsValueHighlight}>
                  {nextBooking.ground?.name ?? 'Ground'}
                </Text>
                <Text style={styles.statsCaption}>
                  {nextBooking.booking_date} · {nextBooking.start_time}–
                  {nextBooking.end_time}
                </Text>
              </>
            ) : (
              <Text style={styles.statsCaption}>No upcoming bookings</Text>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>Last booking</Text>
            {loading ? (
              <Text style={styles.statsCaption}>Loading…</Text>
            ) : lastBooking ? (
              <>
                <Text style={styles.statsValueHighlight}>
                  {lastBooking.ground?.name ?? 'Ground'}
                </Text>
                <Text style={styles.statsCaption}>
                  {lastBooking.booking_date} · {lastBooking.start_time}–
                  {lastBooking.end_time}
                </Text>
              </>
            ) : (
              <Text style={styles.statsCaption}>No past bookings yet</Text>
            )}
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>Favorite ground</Text>
            {loading ? (
              <Text style={styles.statsCaption}>Loading…</Text>
            ) : favoriteGround ? (
              <>
                <Text style={styles.statsValueHighlight}>{favoriteGround.name}</Text>
                <Text style={styles.statsCaption}>
                  {favoriteGround.count === 1
                    ? 'Booked 1 time'
                    : `Booked ${favoriteGround.count} times`}
                </Text>
              </>
            ) : (
              <Text style={styles.statsCaption}>We will highlight it once you book</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  if (Platform.OS === 'web') {
    return (
      <WebLayout>
        <DashboardContent />
      </WebLayout>
    );
  }

  return <DashboardContent />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.9)',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  headerRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  welcomeSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  primaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#dc8d3c',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  statsCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#F9FAFB',
  },
  statsLabel: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: '#6B7280',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  statsValueHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statsCaption: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
});

