import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, useWindowDimensions, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import WebLayout from '@/components/web/WebLayout';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { LayoutDashboard, Calendar, Star, Users, IndianRupee, ChevronRight } from 'lucide-react-native';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { formatBookingSlotSummary } from '@/utils/bookingSlotFormat';
import BookingCard from '@/components/bookings/BookingCard';
import { ActivityIndicator } from 'react-native';

const THEME_BG = '#043529';
const THEME_CARD_BG = '#06392e';
const THEME_ACCENT = '#00ea6b';
const THEME_TEXT = '#FFFFFF';
const THEME_GOLD = '#dcc093';

function DashboardContent() {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
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
            total_amount,
            status,
            ground:grounds(
              id,
              name,
              city,
              state,
              pitch_type
            )
          `,
          )
          .eq('status', 'confirmed')
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

  const IS_DARK = Platform.OS !== 'web' || isCompact;

  const content = (
    <ScrollView
      style={[styles.root, IS_DARK && styles.rootDark]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.welcomeTitle, IS_DARK && styles.welcomeTitleDark]}>Dashboard</Text>
          <Text style={[styles.welcomeSubtitle, IS_DARK && styles.welcomeSubtitleDark]}>
            Overview of your games and favorite grounds.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, IS_DARK && styles.primaryButtonDark]}
          onPress={() => router.push('/book-my-ground' as any)}
        >
          <Text style={[styles.primaryButtonText, IS_DARK && styles.primaryButtonTextDark]}>Book a ground</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
          <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
            <Users size={20} color="#01b854" />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Total Bookings</Text>
            <Text style={[styles.statsValue, IS_DARK && styles.statsValueDark]}>
              {loading ? '—' : bookings.length}
            </Text>
          </View>
        </View>

        <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
          <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
            <IndianRupee size={20} color="#01b854" />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Total Spent</Text>
            <Text style={[styles.statsValueSmall, IS_DARK && styles.statsValueSmallDark]}>
              {loading ? '—' : `₹${bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0).toLocaleString('en-IN')}`}
            </Text>
          </View>
        </View>

        <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
          <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
            <Calendar size={20} color="#01b854" />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Next booking</Text>
            {loading ? (
              <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>Loading…</Text>
            ) : nextBooking ? (
              <>
                <Text style={[styles.statsValueSmall, IS_DARK && styles.statsValueSmallDark]} numberOfLines={1}>
                  {nextBooking.ground?.name ?? 'Ground'}
                </Text>
                <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>
                  {nextBooking.booking_date}
                </Text>
              </>
            ) : (
              <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>No upcoming</Text>
            )}
          </View>
        </View>

        <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
          <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
            <Calendar size={20} color="#01b854" />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Last booking</Text>
            {loading ? (
              <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>Loading…</Text>
            ) : lastBooking ? (
              <>
                <Text style={[styles.statsValueSmall, IS_DARK && styles.statsValueSmallDark]} numberOfLines={1}>
                  {lastBooking.ground?.name ?? 'Ground'}
                </Text>
                <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>
                  {lastBooking.booking_date}
                </Text>
              </>
            ) : (
              <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>None yet</Text>
            )}
          </View>
        </View>

        <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
          <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
            <Star size={20} color="#01b854" />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Favorite</Text>
            {loading ? (
              <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>Loading…</Text>
            ) : favoriteGround ? (
              <>
                <Text style={[styles.statsValueSmall, IS_DARK && styles.statsValueSmallDark]} numberOfLines={1}>
                  {favoriteGround.name}
                </Text>
                <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>
                  {favoriteGround.count} {favoriteGround.count === 1 ? 'visit' : 'visits'}
                </Text>
              </>
            ) : (
              <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>TBD</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, IS_DARK && styles.sectionTitleDark]}>Upcoming Matches</Text>
        <TouchableOpacity onPress={() => router.push('/bookings')}>
          <Text style={[styles.seeAllText, IS_DARK && styles.seeAllTextDark]}>See all</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#01b854" style={{ marginTop: 40 }} />
      ) : upcomingBookings.length > 0 ? (
        <View style={styles.matchesGrid}>
          {upcomingBookings.slice(0, 3).map((b) => (
            <View 
              key={b.id} 
              style={[
                styles.dashboardMatchItem,
                { maxWidth: isCompact ? '100%' : width < 1200 ? '48.5%' : '32.5%'}
              ]}
            >
              <BookingCard
                booking={b}
                lightMode={!IS_DARK}
                onPress={() => router.push(`/bookings/${b.id}`)}
              />
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyMatches, IS_DARK && styles.emptyMatchesDark]}>
          <Calendar size={40} color={IS_DARK ? 'rgba(255,255,255,0.1)' : '#E5E7EB'} />
          <Text style={[styles.emptyMatchesText, IS_DARK && styles.emptyMatchesTextDark]}>
            No upcoming games scheduled.
          </Text>
          <TouchableOpacity 
            style={styles.bookNowLink}
            onPress={() => router.push('/book-my-ground' as any)}
          >
            <Text style={styles.bookNowLinkText}>Book your first ground</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>

  );

  if (Platform.OS === 'web' && !isCompact) {
    return (
      <WebLayout>
        {content}
      </WebLayout>
    );
  }

  return (
    <View style={styles.nativeWrapper}>
      <MobileAppNavbar title="Dashboard" titleColor={THEME_ACCENT} />
      {content}
    </View>
  );
}

export default function DashboardScreen() {
  return <DashboardContent />;
}

const styles = StyleSheet.create({
  nativeWrapper: {
    flex: 1,
    backgroundColor: THEME_BG,
  },
  root: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  rootDark: {
    backgroundColor: THEME_BG,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
    flexWrap: 'wrap',
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 200,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  welcomeTitleDark: {
    color: THEME_TEXT,
  },
  welcomeSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  welcomeSubtitleDark: {
    color: '#9ca3af',
  },
  primaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#10b981',
  },
  primaryButtonDark: {
    backgroundColor: THEME_ACCENT,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  primaryButtonTextDark: {
    color: '#043529',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: 160,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  statBoxDark: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(0,234,107,0.1)',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  iconCircleDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  statsLabelDark: {
    color: '#9ca3af',
    opacity: 0.8,
  },
  statsValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  statsValueDark: {
    color: THEME_TEXT,
  },
  statsValueSmall: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
  },
  statsValueSmallDark: {
    color: THEME_GOLD,
  },
  statsCaption: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  statsCaptionDark: {
    color: '#9ca3af',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 32,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  sectionTitleDark: {
    color: THEME_TEXT,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#01b854',
  },
  seeAllTextDark: {
    color: THEME_ACCENT,
  },
  matchesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    width: '100%',
  },
  dashboardMatchItem: {
    flex: 1,
    minWidth: 300,
    maxWidth: Platform.OS === 'web' ? '32.5%' : '100%',
  },
  emptyMatches: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 8,
  },
  emptyMatchesDark: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyMatchesText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyMatchesTextDark: {
    color: '#9CA3AF',
  },
  bookNowLink: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
  },
  bookNowLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#01b854',
  },
});


