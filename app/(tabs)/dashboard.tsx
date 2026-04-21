import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, useWindowDimensions, ScrollView, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import WebLayout from '@/components/web/WebLayout';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { 
  LayoutDashboard, 
  Calendar, 
  Star, 
  Users, 
  IndianRupee, 
  ChevronRight, 
  Search, 
  Sun, 
  MapPin, 
  Heart,
  MessageSquare,
  Wallet,
  Bell,
  Clock,
  Maximize,
  Map as MapIcon,
  Info,
} from 'lucide-react-native';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { formatBookingSlotSummary } from '@/utils/bookingSlotFormat';
import BookingCard from '@/components/bookings/BookingCard';
import { useUI } from '@/contexts/UIContext';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [popularSlots, setPopularSlots] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { setTabBarVisible } = useUI();
  const lastScrollY = React.useRef(0);

  const onScroll = (event: any) => {
    if (Platform.OS === 'web') return;
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;

    if (diff > 10 && currentY > 50) {
      setTabBarVisible(false);
    } else if (diff < -10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentY;
  };

  const loadBookings = async (isRefresh = false) => {
    if (!user) return;
    try {
      if (isRefresh) setIsRefreshing(true);
      else setLoading(true);

      const { data, error } = await supabase
        .from('bookings')
        .select(`
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
            pitch_type,
            ground_images(image_url)
          )
        `)
        .in('status', ['confirmed', 'completed'])
        .eq('user_id', user.id)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
      
      // Fetch popular slots (mocking with actual ground availability for demo)
      const { data: groundsSlots } = await supabase
        .from('grounds')
        .select('*, ground_images(image_url)')
        .eq('active', true)
        .eq('approved', true)
        .limit(3);
      
      if (groundsSlots) {
        setPopularSlots(groundsSlots.map(g => ({
          id: g.id,
          name: g.name,
          time: '5:00',
          ampm: 'PM',
          slotsLeft: Math.floor(Math.random() * 5) + 1,
          type: g.pitch_type,
        })));
      }

    } catch (err) {
      console.error('Error loading dashboard bookings:', err);
      setBookings([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push({
        pathname: '/(tabs)/grounds',
        params: { q: searchQuery.trim() }
      });
    }
  };

  useEffect(() => {
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
    () => bookings.filter((b) => b.booking_date >= todayIso && b.status === 'confirmed'),
    [bookings, todayIso],
  );

  const pastBookings = useMemo(
    () => bookings.filter((b) => b.booking_date < todayIso || b.status === 'completed'),
    [bookings, todayIso],
  );

  const bookedDates = useMemo(() => {
    const dates = new Set();
    bookings.forEach(b => dates.add(b.booking_date));
    return dates;
  }, [bookings]);

  const statsPlayedThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let totalMinutes = 0;
    bookings.forEach(b => {
      if (b.status !== 'completed' && b.status !== 'confirmed') return;
      const bDate = new Date(b.booking_date);
      if (bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear) {
        // Simple 1hr per booking if end_time unavailable or manual calc
        totalMinutes += 60; 
      }
    });
    return Math.round(totalMinutes / 60);
  }, [bookings]);

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

  const IS_DARK = false; // Forced light theme for modern mobile UI

  const renderRightPanel = () => (
    <View style={styles.rightPanel}>
      <View style={styles.panelCard}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Quick Book</Text>
          <View style={styles.calendarNav}>
            <ChevronRight size={16} color="#64748B" style={{ transform: [{ rotate: '180deg' }] }} />
            <ChevronRight size={16} color="#64748B" />
          </View>
        </View>
        <Text style={styles.panelMonth}>
          {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Text>
        <View style={styles.calendarGrid}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <Text key={i} style={styles.calendarDayLabel}>{day}</Text>
          ))}
          {(() => {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const today = now.getDate();

            const items = [];
            // Padding for first day
            for (let p = 0; p < firstDay; p++) {
              items.push(<View key={`pad-${p}`} style={styles.calendarDay} />);
            }
            // Real days
            for (let d = 1; d <= daysInMonth; d++) {
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isToday = d === today;
              const isBooked = bookedDates.has(dateStr);
              items.push(
                <TouchableOpacity 
                  key={d} 
                  style={[
                    styles.calendarDay,
                    isToday && styles.calendarDayToday,
                    isBooked && styles.calendarDayBooked
                  ]}
                  onPress={() => {
                    router.push({
                      pathname: '/(tabs)/grounds',
                      params: { date: dateStr }
                    });
                  }}
                >
                  <Text style={[
                    styles.calendarDayText,
                    isToday && styles.calendarDayTextToday,
                    isBooked && styles.calendarDayTextBooked
                  ]}>{d}</Text>
                </TouchableOpacity>
              );
            }
            return items;
          })()}
        </View>

        <Text style={styles.panelSubTitle}>Popular slots today</Text>
        {popularSlots.length > 0 ? popularSlots.map((slot) => (
          <View key={slot.id} style={styles.slotItem}>
            <View style={styles.slotTimeBox}>
              <Text style={styles.slotTime}>{slot.time}</Text>
              <Text style={styles.slotAmPm}>{slot.ampm}</Text>
            </View>
            <View style={styles.slotInfo}>
              <Text style={styles.slotName} numberOfLines={1}>{slot.name}</Text>
              <Text style={styles.slotStatus}>{slot.slotsLeft} slots left</Text>
            </View>
            <TouchableOpacity 
              style={styles.slotAction}
              onPress={() => router.push(`/ground/${slot.id}` as any)}
            >
              <Text style={styles.slotActionText}>Book</Text>
            </TouchableOpacity>
          </View>
        )) : (
          <Text style={styles.emptyCardText}>No slots available right now</Text>
        )}
      </View>

      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Balance & Stats</Text>
        <View style={styles.statsDonutContainer}>
          <View style={[styles.donutPlaceholder, { 
            borderColor: THEME_ACCENT,
            borderLeftColor: '#F1F5F9',
            // Simple visual based on goal of 25hrs
            borderWidth: 10 
          }]}>
            <Text style={styles.donutPercent}>
              {Math.min(100, Math.round((statsPlayedThisMonth / 25) * 100))}%
            </Text>
          </View>
          <View style={styles.statsInfo}>
            <Text style={styles.statsValueMain}>{statsPlayedThisMonth} hrs</Text>
            <Text style={styles.statsLabelMain}>Played this month</Text>
            <View style={styles.tag}><Text style={styles.tagText}>{profile?.favorite_sport || 'CRICKET'}</Text></View>
          </View>
        </View>
      </View>
    </View>
  );

  const content = (
    <ScrollView
      style={[styles.root, IS_DARK && styles.rootDark]}
      contentContainerStyle={[styles.scrollContent, (Platform.OS === 'web' && !isCompact) && styles.scrollContentWeb]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadBookings} tintColor="#01b854" />}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.mainLayout}>
        <View style={styles.centerContent}>
          {/* Greeting Row */}
          <View style={styles.greetingRow}>
            <View>
              <Text style={styles.greetingText}>
                {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}, {profile?.full_name?.split(' ')[0] || 'Player'} 👋
              </Text>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <View style={styles.weatherBadge}>
              <Sun size={18} color="#F59E0B" />
              <Text style={styles.weatherText}>22°C • Clear • Gurgaon</Text>
            </View>
          </View>

          {/* Search Hero */}
          <View style={styles.searchHero}>
            <View style={styles.searchHeroText}>
              <Text style={styles.searchHeroTitle}>Book your next game</Text>
              <Text style={styles.searchHeroSub}>Search grounds near you...</Text>
              <View style={styles.dashboardSearch}>
                <Search size={18} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Football turf in Gurgaon"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                  <Text style={styles.searchBtnText}>Search</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.searchHeroImagePlaceholder}>
              <LayoutDashboard size={120} color="rgba(255,255,255,0.1)" />
            </View>
          </View>

          {/* Cards Row */}
          <View style={styles.cardsRow}>
            <View style={styles.contentCardLarge}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardHeaderTitle}>Upcoming Booking</Text>
                <TouchableOpacity><Text style={styles.cardActionText}>Cancel</Text></TouchableOpacity>
              </View>
              {nextBooking ? (
                <>
                  <Text style={styles.bookingTime}>{nextBooking.booking_date} • {nextBooking.start_time}</Text>
                  <View style={styles.bookingImagePlaceholder}>
                     <MapIcon size={40} color="#E2E8F0" />
                  </View>
                  <View style={styles.bookingFooter}>
                    <View>
                      <Text style={styles.bookingName}>{nextBooking.ground?.name}</Text>
                      <Text style={styles.bookingMeta}>{nextBooking.ground?.pitch_type} • {nextBooking.ground?.city}</Text>
                    </View>
                    <TouchableOpacity style={styles.qrButton}>
                      <Maximize size={18} color="#FFFFFF" />
                      <Text style={styles.qrButtonText}>View QR</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.emptyCardInner}>
                  <Calendar size={32} color="#CBD5E1" />
                  <Text style={styles.emptyCardText}>No upcoming bookings</Text>
                </View>
              )}
            </View>

            <View style={styles.contentCardSmall}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardHeaderTitle}>Recent Ground</Text>
                <TouchableOpacity><Text style={styles.cardActionText}>View</Text></TouchableOpacity>
              </View>
              {lastBooking ? (
                <View style={styles.recentGroundItem}>
                   <View style={styles.recentGroundImage}>
                      <MapIcon size={24} color="#CBD5E1" />
                   </View>
                   <View>
                      <Text style={styles.recentGroundName}>{lastBooking.ground?.name}</Text>
                      <Text style={styles.recentGroundPrice}>₹{lastBooking.total_amount?.toLocaleString()} total</Text>
                   </View>
                </View>
              ) : (
                 <View style={styles.emptyCardInner}>
                   <Star size={32} color="#CBD5E1" />
                   <Text style={styles.emptyCardText}>Explore venues</Text>
                 </View>
              )}
            </View>
          </View>

          {/* Map Placeholder */}
          <View style={styles.mapContainer}>
             <View style={styles.mapPlaceholder}>
                <MapPin size={40} color="#00ea6b" />
                <Text style={styles.mapLabel}>Explore venues near you (Map)</Text>
             </View>
          </View>
        </View>

        {!isCompact && renderRightPanel()}
      </View>
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
    backgroundColor: '#F8FAFC',
  },
  root: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? 'transparent' : '#F5F5F7',
  },
  rootDark: {
    backgroundColor: '#F5F5F7',
  },
  scrollContent: {
    padding: 0,
    width: '100%',
  },
  scrollContentWeb: {
    paddingTop: 0,
  },
  mainLayout: {
    flexDirection: 'row',
    width: '100%',
  },
  centerContent: {
    flex: 1,
    padding: 24,
  },
  rightPanel: {
    width: 340,
    padding: 24,
    paddingLeft: 0,
    gap: 20,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  dateText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  weatherText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  searchHero: {
    backgroundColor: '#043529',
    borderRadius: 24,
    padding: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    overflow: 'hidden',
  },
  searchHeroText: {
    flex: 1,
    zIndex: 2,
  },
  searchHeroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  searchHeroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 20,
    fontFamily: 'Inter',
  },
  dashboardSearch: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    maxWidth: 450,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontFamily: 'Inter',
    outlineStyle: 'none',
  } as any,
  searchBtn: {
    backgroundColor: '#00ea6b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchBtnText: {
    color: '#043529',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'Inter',
  },
  searchHeroImagePlaceholder: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    opacity: 0.8,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  contentCardLarge: {
    flex: 1.6,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
  },
  contentCardSmall: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
    fontFamily: 'Inter',
  },
  bookingTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  bookingImagePlaceholder: {
    height: 180,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  bookingMeta: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  qrButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  recentGroundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  recentGroundImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentGroundName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  recentGroundPrice: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  mapContainer: {
    height: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 8,
    borderColor: '#FFFFFF',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 16,
  },
  mapLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  rightPanel: {
    gap: 20,
  },
  panelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: 340,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  calendarNav: {
    flexDirection: 'row',
    gap: 8,
  },
  panelMonth: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    fontFamily: 'Inter',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calendarDayLabel: {
    width: 32,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  calendarDay: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  calendarDayToday: {
    backgroundColor: '#00ea6b',
  },
  calendarDayTextToday: {
    color: '#043529',
    fontWeight: '800',
  },
  calendarDayBooked: {
    backgroundColor: '#F1F5F9',
  },
  panelSubTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 24,
    marginBottom: 12,
    fontFamily: 'Inter',
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 16,
  },
  slotTimeBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 10,
    minWidth: 44,
  },
  slotTime: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  slotAmPm: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: 'Inter',
  },
  slotInfo: {
    flex: 1,
  },
  slotName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  slotStatus: {
    fontSize: 11,
    color: '#00ea6b',
    fontWeight: '600',
    marginTop: 1,
    fontFamily: 'Inter',
  },
  slotAction: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slotActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  statsDonutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 16,
  },
  donutPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 10,
    borderColor: '#00ea6b',
    borderLeftColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutPercent: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  statsInfo: {
    flex: 1,
  },
  statsValueMain: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  statsLabelMain: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    fontFamily: 'Inter',
  },
  emptyCardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  emptyCardText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
});


