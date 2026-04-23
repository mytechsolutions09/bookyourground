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
  ArrowRight,
  CircleUser,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { GroundWithImages } from '@/types';
import WebLayout from '@/components/web/WebLayout';
import LandingScrollContent from '@/components/landing/LandingScrollContent';
import LandingBookingForm from '@/components/landing/LandingBookingForm';
import { useAuth } from '@/contexts/AuthContext';

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
  { label: 'Multi-Sport', value: 'multi' },
];

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
        {isTop && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>🔥 Popular</Text>
          </View>
        )}
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
            ₹{Number(ground.base_price_per_hour || 0).toLocaleString('en-IN')}
            <Text style={styles.groundPriceUnit}>
              {String(ground.pitch_type ?? '').toLowerCase().includes('box') ? '/hr' : '/match'}
            </Text>
          </Text>
          <View style={styles.bookNowBtn}>
            <Text style={styles.bookNowText}>Book</Text>
            <ArrowRight size={13} color="#FFFFFF" strokeWidth={2.5} />
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
  const [sportFilter, setSportFilter] = useState('cricket');
  const { setTabBarVisible } = useUI();
  
  const lastScrollY = useSharedValue(0);

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
        .select(`*, ground_images(*), reviews(rating)`)
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

  if (Platform.OS === 'web') {
    // The web landing page is handled by the root app/index.tsx.
    // We don't want to render a second LandingScrollContent here.
    return null;
  }

  // ── Mobile Homepage ──────────────────────────────────────────────────────
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGrounds();
  }, [loadGrounds]);

  const primaryCta = user ? '/(tabs)/bookings' : '/(auth)/signup';

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        onScroll={verticalScrollHandler}
        scrollEventThrottle={16}
        style={styles.scroll}
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
        <View style={styles.premiumHero}>
          <View style={styles.heroGlowPrimary} />
          <View style={styles.heroGlowSecondary} />
          
          <View style={[styles.heroPadding, { paddingTop: insets.top + 20 }]}>
            <View style={styles.heroHeaderRow}>
              <View style={styles.heroBrandPill}>
                <View style={[styles.pulseDot, { backgroundColor: '#00ea6b' }]} />
                <Text style={styles.brandPillText}>BOOKYOURGROUND</Text>
                <View style={styles.brandPillDivider} />
                <Text style={styles.brandPillSub}>Slots ready to play</Text>
              </View>

              <TouchableOpacity 
                onPress={() => router.push('/(tabs)/profile')}
                style={styles.profileButton}
                activeOpacity={0.7}
              >
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profileIconPlaceholder}>
                    <CircleUser size={22} color="#FFFFFF" strokeWidth={1.8} />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.heroMainTitle}>
              Game-ready grounds,{'\n'}
              <Text style={{ color: '#00ea6b' }}>just a tap away.</Text>
            </Text>

            <Text style={styles.heroCopy}>
              Find, book, and play at curated venues near you with instant confirmation.
            </Text>

            <View style={styles.heroStatsContainer}>
              <View style={styles.heroStatBox}>
                <Text style={styles.heroStatValue}>4.9/5</Text>
                <Text style={styles.heroStatLabel}>Player Rating</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatBox}>
                <Text style={styles.heroStatValue}>10k+</Text>
                <Text style={styles.heroStatLabel}>Hours Booked</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatBox}>
                <Text style={styles.heroStatValue}>50+</Text>
                <Text style={styles.heroStatLabel}>Venues</Text>
              </View>
            </View>

            <View style={styles.floatingSearchContainer}>
              <Search size={18} color="#94A3B8" strokeWidth={2.5} />
              <TextInput
                style={styles.floatingSearchInput}
                placeholder="Search grounds, city..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={{ color: '#94A3B8', fontWeight: '600' }}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.heroCategories}
            >
              {SPORT_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  activeOpacity={0.8}
                  onPress={() => setSportFilter(cat.value)}
                  style={[
                    styles.heroCatChip,
                    sportFilter === cat.value && styles.heroCatChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.heroCatText,
                      sportFilter === cat.value && styles.heroCatTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* ── Quick Actions ───────────────────────────────── */}
        <View style={styles.quickActionsSection}>
          <TouchableOpacity 
            style={styles.findGroundBtn}
            onPress={() => router.push('/select-sport')}
            activeOpacity={0.9}
          >
            <View style={styles.findGroundIconBox}>
              <Search size={22} color="#00ea6b" strokeWidth={3} />
            </View>
            <View style={styles.findGroundTextBox}>
              <Text style={styles.findGroundBtnTitle}>Find a ground</Text>
              <Text style={styles.findGroundBtnSub}>Pick your sport & play</Text>
            </View>
            <ArrowRight size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>



        {/* ── Search Results (Show at top when active) ── */}
        {(searchQuery.trim() || sportFilter !== 'all') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionLabel}>Search Results</Text>
                <Text style={styles.sectionTitle}>{filteredGrounds.length} grounds found</Text>
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
                          ₹{Number(g.base_price_per_hour || 0).toLocaleString('en-IN')}
                        </Text>
                        <View style={styles.bookSmallBtn}>
                          <ArrowRight size={14} color="#FFFFFF" strokeWidth={2.5} />
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









        {/* ── CTA Banner ───────────────────────────────── */}
        <View style={styles.ctaBanner}>
          <View style={styles.ctaBannerGlow} />
          <Text style={[styles.ctaTitle, isWide && { fontSize: 36 }]}>Ready to play?</Text>
          <Text style={[styles.ctaSubtitle, isWide && { maxWidth: 500 }]}>
            Join thousands booking their favourite grounds every day.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.ctaButton, pressed && { opacity: 0.85 }]}
            onPress={() => router.push(primaryCta as any)}
          >
            <Text style={styles.ctaButtonText}>
              {user ? 'Book a Ground' : 'Get Started Free'}
            </Text>
            <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
          {!user && (
            <Pressable onPress={() => router.push('/(auth)/login' as any)} style={styles.ctaSignIn}>
              <Text style={styles.ctaSignInText}>Already have an account? Sign in</Text>
            </Pressable>
          )}
        </View>

        <View style={{ height: 32 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    backgroundColor: 'rgba(1, 184, 84, 0.08)',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroBrandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
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
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  brandPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00ea6b',
    letterSpacing: 1,
  },
  brandPillDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  brandPillSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
  heroMainTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 42,
    letterSpacing: -1,
    marginBottom: 12,
  },
  heroCopy: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: '90%',
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
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  heroStatLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '700',
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
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
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
    fontSize: 11,
    fontWeight: '800',
    color: '#01b854',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#01b854',
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
  bookNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#01b854',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  bookNowText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
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
    backgroundColor: 'rgba(1, 184, 84, 0.1)',
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
    backgroundColor: 'rgba(1, 184, 84, 0.15)',
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
