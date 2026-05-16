import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  Platform,
  Pressable,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing, 
  useAnimatedScrollHandler,
  runOnJS
} from 'react-native-reanimated';
import { useUI } from '@/contexts/UIContext';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import {
  Search,
  MapPin,
  Trophy,
  Star,
  ChevronRight,
  Shield,
  Clock,
  Zap,
  Users,
  CircleUser,
  ArrowRight,
} from 'lucide-react-native';
import { useLocation } from '@/contexts/LocationContext';
import { supabase } from '@/lib/supabase';
import { GroundWithImages } from '@/types';
import WebLayout from '@/components/web/WebLayout';
import LandingScrollContent from '@/components/landing/LandingScrollContent';
import LandingBookingForm from '@/components/landing/LandingBookingForm';
import { useAuth } from '@/contexts/AuthContext';
import HomeScreenSkeleton from '@/components/landing/HomeScreenSkeleton';
import HeroMobile from '@/components/landing/HeroMobile';
import ProfileScreen from './profile';
import { Gesture, GestureDetector, Directions } from 'react-native-gesture-handler';

function makeGroundPath(ground: GroundWithImages): string {
  const name = (ground.name ?? '').toString().toLowerCase().trim();
  const city = (ground.city ?? '').toString().toLowerCase().trim();
  const slugify = (value: string) =>
    (value || 'ground')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  const citySlug = slugify(city || 'city');
  const nameSlug = slugify(name);
  return `/ground/${encodeURIComponent(citySlug)}/${encodeURIComponent(nameSlug)}`;
}

/** True when the URL is the marketing home (not /bookings, /profile, etc.). */
function isWebLandingPath(pathname: string | undefined): boolean {
  if (pathname == null || pathname === '') return true;
  const p = pathname.split('?')[0];
  if (p === '/' || p === '') return true;
  if (p === '/(tabs)' || p === '/(tabs)/') return true;
  return false;
}

const SPORT_CATEGORIES = [
  { label: 'All', value: 'all' },
  { label: 'Football', value: 'football' },
  { label: 'Cricket', value: 'cricket' },
  { label: 'Box Cricket', value: 'box' },
  { label: 'Nets', value: 'nets' },
  { label: 'Multi-Sport', value: 'multi' },
];

const SPORT_SUFFIXES: Record<string, string> = {
  football: 'football fields',
  cricket: 'cricket grounds',
  box: 'box cricket venues',
  multi: 'multi-sport venues',
  nets: 'nets',
  all: 'grounds'
};

const FEATURES = [
  { icon: Search, label: 'Easy Discovery', desc: 'Find by sport, location, price' },
  { icon: Clock, label: 'Live Slots', desc: 'Real-time availability' },
  { icon: Shield, label: 'Verified', desc: 'All grounds are verified' },
  { icon: Zap, label: 'Instant Book', desc: 'No calls needed' },
];

function GroundCardMobile({ ground, index }: { ground: any; index: number }) {
  const primaryImage =
    ground.ground_images?.find((img: any) => img.is_primary)?.image_url ||
    ground.ground_images?.[0]?.image_url ||
    'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';

  const reviews = (ground.reviews || []) as { rating: number }[];
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s: number, r: { rating: number }) => s + (r.rating || 0), 0) / reviews.length
      : 0;

  const href = makeGroundPath(ground);
  const isTop = index < 3;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => router.push(href as any)}
      style={styles.groundCard}
    >
      <View style={styles.groundImageWrap}>
        <Image source={{ uri: primaryImage }} style={styles.groundImage} />
        <View style={styles.groundImageOverlay} />

        <View style={styles.groundImageContent}>
          <Text style={styles.groundName} numberOfLines={1}>
            {ground.name}
          </Text>
          <View style={styles.groundLocationRow}>
            <MapPin size={12} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.cardLocation} numberOfLines={1}>
              {ground.city}, {ground.state}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.groundCardBody}>
        <View style={styles.groundMeta}>
          <Text style={styles.groundType}>{ground.pitch_type || 'Standard'}</Text>
          {avgRating > 0 ? (
            <View style={styles.ratingRow}>
              <Star size={11} color="#FFA000" fill="#FFA000" />
              <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.groundFooter}>
          <Text style={styles.groundPrice}>
            {ground.min_price !== null && ground.min_price !== undefined
              ? `₹${ground.min_price}`
              : (ground.time_slots?.filter((s: any) => s.is_available && s.custom_price != null).length > 0
                ? `₹${Math.min(...ground.time_slots.filter((s: any) => s.is_available && s.custom_price != null).map((s: any) => Number(s.custom_price)))}`
                : 'See Slots')}
            <Text style={styles.groundPriceUnit}>
              {(() => {
                const isNetOrLane = String(ground.pitch_type ?? '').toLowerCase().includes('net') || 
                                    String(ground.pitch_type ?? '').toLowerCase().includes('lane') ||
                                    String(ground.name ?? '').toLowerCase().includes('lane');
                return isNetOrLane ? '/slot' : String(ground.pitch_type ?? '').toLowerCase().includes('box') ? '/hr' : '/match';
              })()}
            </Text>
          </Text>
          <View style={styles.bookLinkContainer}>
            <Text style={styles.bookLinkText}>Book Now</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();
  const isWide = width > 500;
  const isTablet = width > 768;

  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('all');
  const { setTabBarVisible } = useUI();
  const { cityName, refreshLocation } = useLocation();
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isModalActive, setIsModalActive] = useState(false);
  const slideAnim = useSharedValue(width);
  
  const lastScrollY = useSharedValue(0);

  const flingGesture = Gesture.Fling()
    .direction(Directions.LEFT)
    .runOnJS(true)
    .onStart(() => {
      setShowProfileModal(true);
    });

  useEffect(() => {
    return () => setTabBarVisible(true);
  }, []);

  const verticalScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      if (currentY <= 0) {
         runOnJS(setTabBarVisible)(true);
         return;
      }
      const diff = currentY - lastScrollY.value;
      
      if (diff > 1 && currentY > 50) {
         runOnJS(setTabBarVisible)(false);
      } else if (diff < -2) {
         runOnJS(setTabBarVisible)(true);
      }
      lastScrollY.value = currentY;
    },
  });

  const loadGrounds = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('grounds')
        .select(`*, ground_images(*), reviews(rating), time_slots(custom_price, is_available, day_of_week)`)
        .eq('active', true)
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGrounds(data || []);
    } catch (e) {
      console.error('Error loading grounds:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push({
        pathname: '/search',
        params: { q: searchQuery.trim() }
      });
    }
  };

  const stats = useMemo(() => {
    const venueCount = grounds.length;
    const cities = new Set(grounds.map(g => g.city).filter(Boolean));
    const cityCount = cities.size;
    
    let totalScore = 0;
    let totalReviews = 0;
    grounds.forEach((g: any) => {
      const reviews = (g.reviews || []) as { rating: number }[];
      reviews.forEach(r => {
        totalScore += (r.rating || 0);
        totalReviews += 1;
      });
    });
    const avgRating = totalReviews > 0 ? (totalScore / totalReviews).toFixed(1) : '0';
    
    return { venueCount, cityCount, avgRating };
  }, [grounds]);

  const popularGrounds = useMemo(() => {
    const scored = grounds.map((g: any) => {
      const reviews = (g.reviews || []) as { rating: number }[];
      const avg =
        reviews.length > 0
          ? reviews.reduce((s: number, r: { rating: number }) => s + (r.rating || 0), 0) / reviews.length
          : 0;
      return { ...g, _avg: avg, _count: reviews.length };
    });
    scored.sort((a: any, b: any) => {
      if (b._avg !== a._avg) return b._avg - a._avg;
      return b._count - a._count;
    });
    return scored.slice(0, 8);
  }, [grounds]);

  const cricketGrounds = useMemo(() => {
    return grounds.filter((g: any) => 
      (g.pitch_type || '').toLowerCase().includes('cricket') ||
      (g.name || '').toLowerCase().includes('cricket')
    ).slice(0, 8);
  }, [grounds]);

  const bookTodayGrounds = useMemo(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    console.log('Today is:', today);
    return grounds.filter((g: any) => {
      const hasSlotsToday = (g.time_slots || []).some((s: any) => 
        String(s.day_of_week || '').toLowerCase() === today && 
        (s.is_available === true || s.is_available === null)
      );
      return hasSlotsToday;
    }).slice(0, 8);
  }, [grounds]);

  const filteredGrounds = useMemo(() => {
    return grounds.filter((g: any) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (g.name || '').toLowerCase().includes(q) ||
        (g.city || '').toLowerCase().includes(q) ||
        (g.state || '').toLowerCase().includes(q) ||
        (g.pitch_type || '').toLowerCase().includes(q);

      const matchSport =
        sportFilter === 'all' ||
        (g.pitch_type || '').toLowerCase().includes(sportFilter.toLowerCase());

      return matchSearch && matchSport;
    });
  }, [grounds, searchQuery, sportFilter]);

  useEffect(() => {
    if (!isFocused && showProfileModal) {
      setShowProfileModal(false);
      setIsModalActive(false); // Immediate hide on tab switch
      slideAnim.value = width; // Reset position instantly
    }
  }, [isFocused, showProfileModal]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGrounds();
  }, [loadGrounds]);

  useEffect(() => {
    if (showProfileModal) {
      setIsModalActive(true);
      slideAnim.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.exp),
      });
    } else {
      slideAnim.value = withTiming(width, {
        duration: 350,
        easing: Easing.in(Easing.exp),
      }, (finished) => {
        if (finished) {
          runOnJS(setIsModalActive)(false);
        }
      });
    }
  }, [showProfileModal, width]);

  const profileAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideAnim.value }],
  }));

  const mainContentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (slideAnim.value - width) * 0.75 }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    const opacity = isFocused 
      ? withTiming(showProfileModal ? 1 : 0, { duration: 300 })
      : 0;
    return {
      opacity,
      pointerEvents: showProfileModal ? 'auto' : 'none' as any,
    };
  }, [isFocused, showProfileModal]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    loadGrounds();
  }, [loadGrounds]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!isFocused) return;
    if (isWebLandingPath(pathname)) return;
    router.replace('/');
  }, [isFocused, pathname]);

  const primaryCta = user ? '/(tabs)/bookings' : '/(auth)/signup';

  if (Platform.OS !== 'web' && loading && grounds.length === 0) {
    return <HomeScreenSkeleton />;
  }

  return Platform.OS === 'web' ? (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#00ea6b" />
    </View>
  ) : (
    <GestureDetector gesture={flingGesture}>
      <View style={styles.screen}>
        <Animated.ScrollView
        onScroll={Platform.OS === 'web' ? undefined : verticalScrollHandler}
        scrollEventThrottle={16}
        style={[styles.scroll, mainContentAnimatedStyle]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#01b854"
            colors={['#01b854']}
          />
        }
      >
        {/* ── Immersive Hero Section ─────────────────────────── */}
        <HeroMobile
          cityName={cityName}
          refreshLocation={refreshLocation}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleSearch={handleSearch}
          sportFilter={sportFilter}
          setSportFilter={setSportFilter}
          profile={profile}
          setShowProfileModal={setShowProfileModal}
        />

        {/* ── Book for Today ───────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>Quick Play</Text>
              <Text style={styles.sectionTitle}>Book for today</Text>
            </View>
            <Pressable
              style={styles.seeAllBtn}
              onPress={() => router.push('/(tabs)/grounds' as any)}
            >
              <Text style={styles.seeAllText}>View All</Text>
              <ChevronRight size={14} color="#01b854" strokeWidth={2.5} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color="#01b854" style={{ marginTop: 24, marginBottom: 8 }} />
          ) : bookTodayGrounds.length === 0 ? (
            <Text style={styles.emptyText}>No grounds available today</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {bookTodayGrounds.map((g: any, i: number) => (
                <View key={g.id} style={[styles.horizontalItem, isWide && { width: 300 }]}>
                  <GroundCardMobile ground={g} index={i} />
                </View>
              ))}
            </ScrollView>
          )}
        </View>





        {/* ── Search Results (Show at top when active) ── */}
        {(searchQuery.trim() || sportFilter !== 'all') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionLabel}>Search Results</Text>
                <Text style={styles.sectionTitle}>
                  {filteredGrounds.length} {SPORT_SUFFIXES[sportFilter] || 'grounds'} found
                </Text>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator color="#01b854" style={{ marginTop: 16 }} />
            ) : filteredGrounds.length === 0 ? (
              <Text style={styles.emptyText}>No grounds match your search.</Text>
            ) : (
              <View style={[styles.verticalList, isWide && styles.wideGrid]}>
                {filteredGrounds.map((g: any, i: number) => (
                  <TouchableOpacity
                    key={g.id}
                    activeOpacity={0.88}
                    onPress={() => router.push(makeGroundPath(g) as any)}
                    style={[styles.listRow, isWide && styles.gridItem]}
                  >
                    <Image
                      source={{
                        uri:
                          g.ground_images?.find((img: any) => img.is_primary)?.image_url ||
                          g.ground_images?.[0]?.image_url ||
                          'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg',
                      }}
                      style={isWide ? styles.gridRowImage : styles.listRowImage}
                    />
                    <View style={styles.listRowInfo}>
                      <Text style={styles.listRowName} numberOfLines={1}>
                        {g.name}
                      </Text>
                      <View style={styles.listRowMeta}>
                        <MapPin size={11} color="#9ca3af" strokeWidth={2} />
                        <Text style={styles.listRowCity} numberOfLines={1}>
                          {g.city}
                        </Text>
                      </View>
                      <Text style={styles.listRowType}>{g.pitch_type || 'Standard'}</Text>
                    </View>
                    {!isWide && (
                      <View style={styles.listRowRight}>
                        <Text style={styles.listRowPrice}>
                          {g.min_price !== null && g.min_price !== undefined
                            ? `₹${g.min_price}`
                            : (g.time_slots?.filter((s: any) => s.is_available && s.custom_price != null).length > 0
                              ? `₹${Math.min(...g.time_slots.filter((s: any) => s.is_available && s.custom_price != null).map((s: any) => Number(s.custom_price)))}`
                              : 'See Slots')}
                        </Text>
                        <View style={styles.bookLinkContainerSmall}>
                          <Text style={styles.bookLinkTextSmall}>Book Now</Text>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.sectionDivider} />
          </View>
        )}

        {/* ── Popular Grounds ───────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>Popular Grounds</Text>
              <Text style={styles.sectionTitle}>Trending near you</Text>
            </View>
            <Pressable
              style={styles.seeAllBtn}
              onPress={() => router.push('/(tabs)/grounds' as any)}
            >
              <Text style={styles.seeAllText}>See all</Text>
              <ChevronRight size={14} color="#01b854" strokeWidth={2.5} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color="#01b854" style={{ marginTop: 24, marginBottom: 8 }} />
          ) : popularGrounds.length === 0 ? (
            <Text style={styles.emptyText}>No grounds found</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {popularGrounds.map((g: any, i: number) => (
                <View key={g.id} style={[styles.horizontalItem, isWide && { width: 300 }]}>
                  <GroundCardMobile ground={g} index={i} />
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Cricket Grounds ───────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>Cricket Grounds</Text>
              <Text style={styles.sectionTitle}>Best for Cricket</Text>
            </View>
            <Pressable
              style={styles.seeAllBtn}
              onPress={() => router.push('/(tabs)/grounds' as any)}
            >
              <Text style={styles.seeAllText}>See all</Text>
              <ChevronRight size={14} color="#01b854" strokeWidth={2.5} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color="#01b854" style={{ marginTop: 24, marginBottom: 8 }} />
          ) : cricketGrounds.length === 0 ? (
            <Text style={styles.emptyText}>No cricket grounds found</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {cricketGrounds.map((g: any, i: number) => (
                <View key={g.id} style={[styles.horizontalItem, isWide && { width: 300 }]}>
                  <GroundCardMobile ground={g} index={i} />
                </View>
              ))}
            </ScrollView>
          )}
        </View>
        <View style={{ height: 30 }} />











        <View style={{ height: 32 }} />
      </Animated.ScrollView>

      {/* Profile Drawer Overlay */}
      {Platform.OS !== 'web' && isModalActive && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View 
            style={[styles.modalBackdrop, backdropAnimatedStyle]}
          >
            <TouchableOpacity 
              style={{ flex: 1 }} 
              activeOpacity={1} 
              onPress={() => setShowProfileModal(false)} 
            />
          </Animated.View>
          <Animated.View 
            style={[
              styles.profileModalContainer, 
              profileAnimatedStyle,
              { width: width * 0.75, height: '100%' }
            ]}
          >
            <ProfileScreen isModal onClose={() => setShowProfileModal(false)} />
          </Animated.View>
        </View>
      )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  profileModalContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8FAFC',
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9999,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // ── Quick Actions ─────────────────────────────
  quickActionsSection: {
    paddingHorizontal: 24,
    marginTop: -32, // Overlay slightly on hero
    marginBottom: 12,
    zIndex: 200,
  },
  findGroundBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  findGroundIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  findGroundTextBox: {
    flex: 1,
    gap: 2,
  },
  findGroundBtnTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  findGroundBtnSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    fontFamily: 'Inter',
  },

  // ── Premium Immersive Hero ────────────────────
  premiumHero: {
    backgroundColor: '#043529',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingBottom: 64,
    position: 'relative',
    zIndex: 100,
    overflow: 'visible',
  },
  heroPadding: {
    paddingHorizontal: 24,
  },
  heroGlowPrimary: {
    position: 'absolute',
    top: -100,
    right: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 234, 107, 0.12)',
  },
  heroGlowSecondary: {
    position: 'absolute',
    bottom: -50,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(216, 247, 157, 0.08)',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  locationTextSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    letterSpacing: 0.3,
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileIconPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroMainTitle: {
    fontSize: 24,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 32,
    marginBottom: 8,
    fontFamily: 'Inter',
    letterSpacing: -0.5,
  },
  heroCopy: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 24,
    lineHeight: 18,
    fontFamily: 'Inter',
  },
  heroStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    marginBottom: 28,
  },
  heroStatBox: {
    flex: 1,
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  heroStatLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '400',
    marginTop: 2,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
  floatingSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 20,
  },
  floatingSearchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  heroCategories: {
    paddingVertical: 4,
    gap: 10,
  },
  heroCatChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroCatChipActive: {
    backgroundColor: '#00ea6b',
    borderColor: '#00ea6b',
  },
  heroCatText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  heroCatTextActive: {
    color: '#043529',
  },

  // ── Sections ──────────────────────────────────
  section: {
    marginTop: 8,
    paddingTop: 20,
    paddingBottom: 4,
    backgroundColor: 'transparent',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '400',
    color: '#01b854',
    marginBottom: 2,
    fontFamily: 'Inter',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#01b854',
    fontFamily: 'Inter',
  },

  // ── Ground cards (horizontal) ─────────────────
  horizontalList: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 8,
  },
  horizontalItem: {
    width: 240,
  },
  groundCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  groundImageWrap: {
    position: 'relative',
    height: 130,
  },
  groundImage: {
    width: '100%',
    height: '100%',
  },
  groundImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
  },
  popularBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#01b854',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groundImageContent: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
  },
  groundName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  groundLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  cardLocation: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  groundCardBody: {
    padding: 12,
  },
  groundMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  groundType: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
    fontFamily: 'Inter',
  },
  groundFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groundPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  groundPriceUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  bookLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  bookLinkText: {
    color: '#01b854',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  bookLinkContainerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookLinkTextSmall: {
    color: '#01b854',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  // ── Vertical list (search results) ───────────
  verticalList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  listRowImage: {
    width: 80,
    height: 80,
  },
  listRowInfo: {
    flex: 1,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 4,
  },
  listRowName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
    fontFamily: 'Inter',
  },
  listRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 3,
  },
  listRowCity: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  listRowType: {
    fontSize: 11,
    color: '#01b854',
    fontWeight: '800',
    textTransform: 'capitalize',
    fontFamily: 'Inter',
  },
  listRowRight: {
    paddingRight: 14,
    alignItems: 'flex-end',
  },
  listRowPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  listRowPriceUnit: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  // ── Features ─────────────────────────────────
  featuresSection: {
    marginTop: 16,
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
  },
  featureCard: {
    width: '47%',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(216, 247, 157, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    fontFamily: 'Inter',
    textAlign: 'center',
  },

  // ── CTA ──────────────────────────────────────
  ctaBanner: {
    margin: 16,
    marginTop: 32,
    backgroundColor: '#0F172A',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  ctaBannerGlow: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: 'rgba(216, 247, 157, 0.15)',
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -0.6,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  ctaSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 280,
    fontFamily: 'Inter',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#01b854',
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: '#01b854',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  ctaSignIn: {
    marginTop: 20,
  },
  ctaSignInText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    fontFamily: 'Inter',
  },
  // Wide screen specific styles
  wideGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 16,
  },
  gridItem: {
    width: '48%',
    flexDirection: 'column',
    alignItems: 'stretch',
    height: 240,
  },
  gridRowImage: {
    width: '100%',
    height: 140,
  },
  gridRowPriceBox: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
});
