import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, useWindowDimensions, ScrollView, RefreshControl, ActivityIndicator, TextInput, Image } from 'react-native';
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
  Cloud,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudDrizzle,
  QrCode,
  Activity as ActivityIcon,
} from 'lucide-react-native';
import { Svg, Circle } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing, 
  useAnimatedScrollHandler,
  runOnJS
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
import * as ExpoLocation from 'expo-location';
import { fetchWeather, fetchCityName } from '@/utils/weather';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { makeGroundPath } from '@/utils/groundSlug';
import BookingCard from '@/components/bookings/BookingCard';
import { useUI } from '@/contexts/UIContext';
import { useLocation } from '@/contexts/LocationContext';
import DashboardMap from '@/components/maps/DashboardMap';
import GlassButton from '@/components/web/GlassButton';

const THEME_BG = '#F8FAFC';
const THEME_CARD_BG = '#FFFFFF';
const THEME_ACCENT = '#01b854';
const THEME_TEXT = '#0F172A';
const THEME_MUTED = '#64748B';
const THEME_BORDER = '#F1F5F9';

function DashboardContent() {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  const isUltraNarrow = width < 350;
  const isTablet = width >= 600 && width < 900;
  const { profile, user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  // Redirect ground owners to owner dashboard on web
  useEffect(() => {
    if (!authLoading && Platform.OS === 'web' && profile?.role === 'ground_owner') {
      router.replace('/(owner)/owner-dashboard');
    }
  }, [profile, authLoading]);

  const [bookings, setBookings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [popularSlots, setPopularSlots] = useState<any[]>([]);
  const { cityName, weather: globalWeather, refreshLocation } = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [weather, setWeather] = useState<{ temp: number; condition: string } | null>(null);
  const [locationName, setLocationName] = useState<string>('Gurgaon');

  const { setTabBarVisible } = useUI();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'overview' | 'activity'>('overview');
  
  const horizontalPagerRef = React.useRef<Animated.ScrollView>(null);
  const lastScrollY = useSharedValue(0);
  const headerTranslateY = useSharedValue(0);
  const HEADER_HEIGHT = 100;

  // Now we can safely early return if needed, as all hooks have been called.
  // We will check for the ground_owner role after all hooks are called to avoid hook violation.

  const onTabPress = (tab: 'overview' | 'activity') => {
    setActiveTab(tab);
    horizontalPagerRef.current?.scrollTo({ x: tab === 'overview' ? 0 : width, animated: true });
  };

  const horizontalScrollHandler = useAnimatedScrollHandler({
    onMomentumEnd: (event) => {
      const idx = Math.round(event.contentOffset.x / width);
      runOnJS(setActiveTab)(idx === 0 ? 'overview' : 'activity');
    },
  });

  const verticalScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const diff = currentY - lastScrollY.value;

      if (diff > 10 && currentY > 50) {
        headerTranslateY.value = withTiming(-HEADER_HEIGHT - insets.top, { duration: 600, easing: Easing.out(Easing.exp) });
        runOnJS(setTabBarVisible)(false);
      } else if (diff < -10 || currentY < 20) {
        headerTranslateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.exp) });
        runOnJS(setTabBarVisible)(true);
      }
      lastScrollY.value = currentY;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: THEME_BG,
  }));

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
        setPopularSlots(groundsSlots.map(g => {
          // Generate a semi-realistic slot based on current hour
          const currentHour = new Date().getHours();
          const slotHour = (currentHour + Math.floor(Math.random() * 4) + 1) % 24;
          const ampm = slotHour >= 12 ? 'PM' : 'AM';
          const displayHour = slotHour % 12 || 12;
          
          return {
            id: g.id,
            name: g.name,
            time: `${displayHour}:00`,
            ampm: ampm,
            slotsLeft: Math.floor(Math.random() * 5) + 1,
            type: g.pitch_type,
            ground: g
          };
        }));
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

  useEffect(() => {
    if (globalWeather) {
      setWeather({ temp: globalWeather.temp, condition: globalWeather.conditionText });
    }
    if (cityName && cityName !== 'Checking...') {
      setLocationName(cityName);
    }
  }, [globalWeather, cityName]);



  const WeatherIcon = useMemo(() => {
    if (!weather) return Sun;
    const cond = weather.condition.toLowerCase();
    if (cond.includes('rain')) return CloudRain;
    if (cond.includes('cloud')) return Cloud;
    if (cond.includes('thunder')) return CloudLightning;
    if (cond.includes('snow')) return CloudSnow;
    if (cond.includes('drizzle')) return CloudDrizzle;
    return Sun;
  }, [weather]);

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
    <View style={[styles.rightPanel, isCompact && { width: '100%', paddingLeft: 24 }, isUltraNarrow && { paddingLeft: 12, paddingRight: 12 }]}>
      <View style={[styles.panelCard, styles.noContainer]}>


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
              onPress={() => router.push(makeGroundPath(slot.ground) as any)}
            >
              <Text style={styles.slotActionText}>Book</Text>
            </TouchableOpacity>
          </View>
        )) : (
          <Text style={styles.emptyCardText}>No slots available right now</Text>
        )}
      </View>

      <View style={[styles.panelCard, styles.noContainer]}>
        <Text style={styles.panelTitle}>Balance & Stats</Text>
        <View style={styles.statsDonutContainer}>
          <View style={styles.donutContainer}>
            <Svg width="80" height="80" viewBox="0 0 100 100">
              {/* Background Circle */}
              <Circle
                cx="50"
                cy="50"
                r="40"
                stroke="#F1F5F9"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Progress Circle */}
              <Circle
                cx="50"
                cy="50"
                r="40"
                stroke={THEME_ACCENT}
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(100, Math.round((statsPlayedThisMonth / 25) * 100)) / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </Svg>
            <View style={styles.donutTextOverlay}>
              <Text style={styles.donutPercent}>
                {Math.min(100, Math.round((statsPlayedThisMonth / 25) * 100))}%
              </Text>
            </View>
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
  
  // Early return for ground owners on web after all hooks are called
  if (Platform.OS === 'web' && profile?.role === 'ground_owner') {
    return null;
  }

  if (Platform.OS === 'web' && !isCompact) {
    return (
      <WebLayout>
        <ScrollView
          style={[styles.root, IS_DARK && styles.rootDark]}
          contentContainerStyle={[styles.scrollContent, styles.scrollContentWeb]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadBookings} tintColor="#00ea6b" />}
          showsVerticalScrollIndicator
        >
          <View style={styles.mainLayout}>
            <View style={styles.centerContent}>
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
                  <WeatherIcon size={18} color={weather?.condition.toLowerCase().includes('clear') ? "#F59E0B" : "#64748B"} />
                  <Text style={styles.weatherText}>
                    {weather ? `${weather.temp}°C • ${weather.condition} • ` : '22°C • Clear • '}
                    {locationName}
                  </Text>
                </View>
              </View>
              <View style={styles.mapContainer}>
                 <DashboardMap />
              </View>
              <View style={styles.cardsRow}>
                <View style={styles.contentCardLarge}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardHeaderTitle}>Upcoming Booking</Text>

                  </View>
                  {nextBooking ? (
                    <>
                      <Text style={styles.bookingTime}>
                        {new Date(nextBooking.booking_date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} • {nextBooking.start_time?.slice(0, 5)}
                      </Text>
                      <TouchableOpacity 
                        onPress={() => router.push(`/(tabs)/bookings` as any)}
                        style={{ width: '100%' }}
                      >
                        <View style={styles.bookingImagePlaceholder}>
                          {nextBooking.ground?.ground_images?.[0]?.image_url ? (
                            <Image 
                              source={{ uri: nextBooking.ground.ground_images[0].image_url }} 
                              style={StyleSheet.absoluteFill}
                              resizeMode="cover"
                            />
                          ) : (
                            <LayoutDashboard size={48} color="#CBD5E1" />
                          )}
                        </View>
                        <View style={styles.bookingFooter}>
                          <View>
                            <Text style={styles.bookingName}>{nextBooking.ground?.name}</Text>
                            <Text style={styles.bookingMeta}>{nextBooking.ground?.city}, {nextBooking.ground?.state}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity 
                      style={styles.emptyCardInner}
                      onPress={() => router.push('/book-my-ground' as any)}
                    >
                      <Calendar size={32} color="#CBD5E1" />
                      <Text style={styles.emptyCardText}>No upcoming bookings</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.contentCardSmall}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardHeaderTitle}>Recent Ground</Text>
                    <TouchableOpacity onPress={() => router.push('/book-my-ground' as any)}>
                      <Text style={styles.cardActionText}>View</Text>
                    </TouchableOpacity>
                  </View>
                  {lastBooking ? (
                    <TouchableOpacity 
                      style={styles.recentGroundItem}
                      onPress={() => router.push(makeGroundPath(lastBooking.ground) as any)}
                    >
                       <View style={styles.recentGroundImage}>
                          {lastBooking.ground?.ground_images?.[0]?.image_url ? (
                            <Image 
                              source={{ uri: lastBooking.ground.ground_images[0].image_url }} 
                              style={{ width: '100%', height: '100%', borderRadius: 16 }}
                            />
                          ) : (
                            <MapIcon size={24} color="#CBD5E1" />
                          )}
                       </View>
                       <View>
                          <Text style={styles.recentGroundName}>{lastBooking.ground?.name}</Text>
                          <Text style={styles.recentGroundPrice}>₹{lastBooking.total_amount?.toLocaleString()} total</Text>
                       </View>
                    </TouchableOpacity>
                  ) : (
                     <TouchableOpacity 
                        style={styles.emptyCardInner}
                        onPress={() => router.push('/book-my-ground' as any)}
                      >
                       <Star size={32} color="#CBD5E1" />
                       <Text style={styles.emptyCardText}>Explore venues</Text>
                     </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
            {renderRightPanel()}
          </View>
        </ScrollView>
      </WebLayout>
    );
  }

  return (
    <View style={styles.nativeWrapper}>
      <Animated.View style={headerAnimatedStyle}>
        <MobileAppNavbar title="Dashboard" titleColor="#01b854" />
        <View style={[styles.tabContainer, Platform.OS === 'web' && { backgroundColor: 'transparent', borderWidth: 0 } as any]}>
          <GlassButton
            variant={activeTab === 'overview' ? 'white' : 'clear'}
            size="sm"
            pill
            onClick={() => onTabPress('overview')}
            style={{ flex: 1, height: 40 }}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
          </GlassButton>
          <GlassButton
            variant={activeTab === 'activity' ? 'white' : 'clear'}
            size="sm"
            pill
            onClick={() => onTabPress('activity')}
            style={{ flex: 1, height: 40 }}
          >
            <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>Activity</Text>
          </GlassButton>
        </View>
      </Animated.View>

      <AnimatedScrollView
        ref={horizontalPagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Platform.OS === 'web' ? undefined : horizontalScrollHandler}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {/* Slide 1: Overview */}
        <View style={{ width }}>
          <AnimatedScrollView
            onScroll={Platform.OS === 'web' ? undefined : verticalScrollHandler}
            scrollEventThrottle={16}
            style={styles.root}
            contentContainerStyle={[styles.scrollContent, { paddingTop: HEADER_HEIGHT + insets.top + 16 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadBookings} tintColor="#00ea6b" />}
          >
            <View style={[styles.centerContentNative, width > 768 && styles.centerContentWide, isUltraNarrow && { padding: 12 }]}>
               {/* Compact Greeting */}
               <View style={[styles.greetingRowCompact, styles.noContainer, isUltraNarrow && { paddingHorizontal: 12, paddingVertical: 10 }]}>
                <View style={styles.greetingTextGroup}>
                  <Text style={styles.greetingTextSmall}>
                    Hi, {profile?.full_name?.split(' ')[0] || 'Player'} 👋
                  </Text>
                  <Text style={styles.dateTextSmall}>
                    {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
              </View>

              <View style={[styles.responsiveRow, width > 768 && styles.responsiveRowWide]}>
                {/* Live Map */}
                <View style={[styles.mapContainer, width > 768 && styles.mapContainerWide]}>
                   <DashboardMap />
                </View>

                {/* Upcoming Booking */}
                <View style={[styles.contentCardLarge, styles.noContainer, width > 768 && styles.contentCardWide]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardHeaderTitle}>Upcoming Booking</Text>
                  </View>
                  {nextBooking ? (
                    <>
                      <Text style={styles.bookingTime}>
                        {new Date(nextBooking.booking_date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} • {nextBooking.start_time?.slice(0, 5)}
                      </Text>
                      <TouchableOpacity 
                        onPress={() => router.push(`/(tabs)/bookings` as any)}
                        style={{ width: '100%' }}
                      >
                        <View style={styles.bookingImagePlaceholder}>
                          {nextBooking.ground?.ground_images?.[0]?.image_url ? (
                            <Image 
                              source={{ uri: nextBooking.ground.ground_images[0].image_url }} 
                              style={StyleSheet.absoluteFill}
                              resizeMode="cover"
                            />
                          ) : (
                            <LayoutDashboard size={48} color="#CBD5E1" />
                          )}
                        </View>
                        <View style={styles.bookingFooter}>
                          <View>
                            <Text style={styles.bookingName}>{nextBooking.ground?.name}</Text>
                            <Text style={styles.bookingMeta}>{nextBooking.ground?.city}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity 
                      style={styles.emptyCardInner}
                      onPress={() => router.push('/book-my-ground' as any)}
                    >
                      <Calendar size={32} color="#CBD5E1" />
                      <Text style={styles.emptyCardText}>No upcoming bookings</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </AnimatedScrollView>
        </View>

        {/* Slide 2: Activity/Stats */}
        <View style={{ width }}>
          <AnimatedScrollView
            onScroll={Platform.OS === 'web' ? undefined : verticalScrollHandler}
            scrollEventThrottle={16}
            style={styles.root}
            contentContainerStyle={[styles.scrollContent, { paddingTop: HEADER_HEIGHT + insets.top + 16, paddingHorizontal: 16 }]}
            showsVerticalScrollIndicator={false}
          >
            {renderRightPanel()}
          </AnimatedScrollView>
        </View>
      </AnimatedScrollView>
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
    backgroundColor: Platform.OS === 'web' ? 'transparent' : '#F8FAFC',
  },
  rootDark: {
    backgroundColor: '#F5F5F7',
  },
  scrollContent: {
    padding: 0,
    width: '100%',
    paddingBottom: 120,
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
    paddingBottom: 120,
  },
  rightPanel: {
    width: 400,
    padding: 24,
    paddingLeft: 0,
    paddingBottom: 120,
    gap: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 6,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
      }
    }) as any,
  },
  tabText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  activeTabText: {
    color: '#00ea6b',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  noContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginBottom: 24,
  },
  centerContentNative: {
    padding: 16,
  },
  centerContentWide: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  responsiveRow: {
    flexDirection: 'column',
    gap: 16,
  },
  responsiveRowWide: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  greetingRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }
    }) as any,
  },
  greetingTextGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  greetingTextSmall: {
    fontSize: 15,
    fontWeight: '400',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  dateTextSmall: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '400',
  },
  weatherBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  weatherTextSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  dateText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }
    }) as any,
  },
  weatherText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  searchHero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  searchHeroText: {
    flex: 1,
    zIndex: 2,
  },
  searchHeroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  searchHeroSub: {
    fontSize: 13,
    color: '#64748B',
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
    backgroundColor: THEME_ACCENT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchBtnText: {
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    padding: 24,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
      }
    }) as any,
  },
  contentCardWide: {
    flex: 1,
  },
  contentCardSmall: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    padding: 24,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
      }
    }) as any,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '400',
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
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 8,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }
    }) as any,
  },
  mapContainerWide: {
    flex: 1.5,
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
  panelCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
      }
    }) as any,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '400',
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
    width: '100%',
  },
  calendarDayLabel: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 10,
    fontFamily: 'Inter',
  },
  calendarDay: {
    width: '14.28%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginBottom: 4,
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  calendarDayToday: {
    backgroundColor: THEME_ACCENT,
  },
  calendarDayTextToday: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  calendarDayBooked: {
    backgroundColor: '#F1F5F9',
  },
  panelSubTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
    marginTop: 24,
    marginBottom: 12,
    fontFamily: 'Inter',
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
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
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  slotAmPm: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '500',
    textTransform: 'uppercase',
    fontFamily: 'Inter',
  },
  slotInfo: {
    flex: 1,
  },
  slotName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  slotStatus: {
    fontSize: 11,
    color: THEME_ACCENT,
    fontWeight: '500',
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
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  statsDonutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 16,
  },
  donutContainer: {
    width: 80,
    height: 80,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutTextOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  statsInfo: {
    flex: 1,
  },
  statsValueMain: {
    fontSize: 16,
    fontWeight: '700',
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


