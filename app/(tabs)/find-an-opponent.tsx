import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
  useWindowDimensions,
  Pressable,
  ActivityIndicator,
  ScrollView,
  TextInput,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  DeviceEventEmitter,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useAnimatedScrollHandler,
  runOnJS
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUI } from '@/contexts/UIContext';
import { useAuth } from '@/contexts/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

import { BookingWithDetails } from '@/types';
import MobileAppNavbar from '../../components/MobileAppNavbar';
import WebLayout from '@/components/web/WebLayout';
import MatchCard from '@/components/matches/MatchCard';
import { Trophy, Swords, MapPin, Search, ChevronLeft, Menu, ChevronDown, Check } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { slugifyGroundSegment } from '@/utils/groundSlug';
import MatchmakingSkeleton from '@/components/matches/MatchmakingSkeleton';
import { getDayOfWeek } from '@/utils/helpers';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function FindAnOpponentScreen({ hideHeader = false, externalScrollHandler }: { hideHeader?: boolean, externalScrollHandler?: any }) {
  const [matches, setMatches] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const IS_DARK = !isWeb || (width < 900);
  const isWideWeb = Platform.OS === 'web' && width >= 1100;
  const isExtraWideWeb = Platform.OS === 'web' && width >= 1350;
  const isMediumWeb = Platform.OS === 'web' && width >= 768 && width < 1100;
  const isSmall = width < 900;
  const isUltraNarrow = width < 350;
  const isTablet = width >= 600;
  const numColumns = isWeb ? (isWideWeb || isExtraWideWeb ? 3 : isMediumWeb ? 2 : 1) : (isTablet ? 2 : 1);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  // Filters
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState((params.q as string) || '');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedPitch, setSelectedPitch] = useState('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState('All');
  const [activePicker, setActivePicker] = useState<'city' | 'date' | 'pitch' | null>(null);
  const insets = useSafeAreaInsets();
  const { setTabBarVisible } = useUI();

  const headerTranslateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const HEADER_HEIGHT = 160;
  const summaryTranslateY = useSharedValue(-50);
  const summaryOpacity = useSharedValue(0);
  const webTabsOpacity = useSharedValue(1);
  const webTabsTranslateY = useSharedValue(0);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
    position: 'absolute',
    top: hideHeader ? 110 + insets.top : 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  }));

  const webTabsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: webTabsOpacity.value,
    transform: [{ translateY: webTabsTranslateY.value }],
    zIndex: 500,
  }));

  const summaryAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: summaryTranslateY.value }],
    opacity: summaryOpacity.value,
    position: 'absolute',
    top: isWeb ? 64 : insets.top + 44,
    left: 0,
    right: 0,
    zIndex: 1100,
    backgroundColor: '#FFFFFF',
    height: 52,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  }));

  const verticalScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;

      if (isWeb) {
        runOnJS(DeviceEventEmitter.emit)('mainScroll', { y: currentY });
      }

      if (currentY > 80) {
        summaryTranslateY.value = withTiming(0, { duration: 300 });
        summaryOpacity.value = withTiming(1, { duration: 300 });
        webTabsOpacity.value = withTiming(0, { duration: 300 });
        webTabsTranslateY.value = withTiming(-20, { duration: 300 });
      } else {
        summaryTranslateY.value = withTiming(-50, { duration: 300 });
        summaryOpacity.value = withTiming(0, { duration: 300 });
        webTabsOpacity.value = withTiming(1, { duration: 300 });
        webTabsTranslateY.value = withTiming(0, { duration: 300 });
      }

      const diff = currentY - lastScrollY.value;
      if (diff > 1 && currentY > 50) {
        if (headerTranslateY.value === 0) {
          headerTranslateY.value = withTiming(-HEADER_HEIGHT - insets.top - 20, {
            duration: 400,
          });
          runOnJS(setTabBarVisible)(false);
        }
      } else if (diff < -2 || currentY < 20) {
        if (headerTranslateY.value < 0) {
          headerTranslateY.value = withTiming(0, {
            duration: 400,
          });
          runOnJS(setTabBarVisible)(true);
        }
      }
      lastScrollY.value = currentY;
    },
  });

  const onScrollWeb = (event: any) => {
    const currentY = event.nativeEvent.contentOffset.y;
    DeviceEventEmitter.emit('mainScroll', { y: currentY });

    if (currentY > 80) {
      summaryTranslateY.value = withTiming(0, { duration: 300 });
      summaryOpacity.value = withTiming(1, { duration: 300 });
      webTabsOpacity.value = withTiming(0, { duration: 300 });
      webTabsTranslateY.value = withTiming(-20, { duration: 300 });
    } else {
      summaryTranslateY.value = withTiming(-50, { duration: 300 });
      summaryOpacity.value = withTiming(0, { duration: 300 });
      webTabsOpacity.value = withTiming(1, { duration: 300 });
      webTabsTranslateY.value = withTiming(0, { duration: 300 });
    }

    const diff = currentY - lastScrollY.value;
    if (diff > 1 && currentY > 50) {
      if (headerTranslateY.value === 0) {
        headerTranslateY.value = withTiming(-HEADER_HEIGHT - insets.top - 20, { duration: 400 });
        setTabBarVisible(false);
      }
    } else if (diff < -2 || currentY < 20) {
      if (headerTranslateY.value < 0) {
        headerTranslateY.value = withTiming(0, { duration: 400 });
        setTabBarVisible(true);
      }
    }
    lastScrollY.value = currentY;
  };

  useEffect(() => {
    loadOpenSlots();
  }, []);

  const loadOpenSlots = async () => {
    try {
      setLoading(true);
      const todayISO = new Date().toISOString().split('T')[0];

      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      const { data, error } = await supabase
        .rpc('get_open_matchmaking_bookings', { p_today: todayISO })
        .select(`
          *,
          ground:grounds(
            *,
            ground_images(*),
            reviews(rating)
          ),
          user:profiles(*)
        `)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setMatches([]);
        return;
      }

      // 1. Get all ground IDs and days of week needed
      const pricingNeeds = data.map(m => {
        const parts = m.booking_date.split('-');
        const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const dow = getDayOfWeek(dateObj);
        return { ground_id: m.ground_id, dow, start_time: m.start_time };
      });

      const groundIds = Array.from(new Set(pricingNeeds.map(n => n.ground_id)));
      
      // 2. Fetch all relevant slots in one or two queries if possible
      // For simplicity and to handle the multiple criteria, we'll fetch for all grounds first
      const { data: slotDataList } = await supabase
        .from('time_slots')
        .select('ground_id, day_of_week, start_time, custom_price')
        .in('ground_id', groundIds)
        .eq('is_available', true);

      // 3. Map pricing back to matches
      const matchesWithPricing = (data as any[]).map(m => {
        try {
          const parts = m.booking_date.split('-');
          const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          const dow = getDayOfWeek(dateObj);
          
          const isBox = String(m.ground.pitch_type ?? '').toLowerCase().includes('box');

          // Find matching slot in our pre-fetched list
          const slotData = slotDataList?.find(s => 
            s.ground_id === m.ground_id && 
            s.day_of_week === dow && 
            s.start_time === m.start_time
          );

          let currentSlotPrice = slotData?.custom_price ?? m.ground.base_price_per_hour;

          const hours = m.total_hours || 1;
          const fullPrice = isBox ? currentSlotPrice * hours : currentSlotPrice;
          return { ...m, total_amount: Math.round((fullPrice / 2) * 100) / 100 };
        } catch (e) {
          console.warn('Error processing pricing for match:', m.id, e);
          return m;
        }
      });

      setMatches(matchesWithPricing);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      // Filter out Nets
      const isNets = String(match.ground?.pitch_type ?? '').toLowerCase().includes('nets') || 
                     String(match.ground?.name ?? '').toLowerCase().includes('nets');
      if (isNets) return false;

      const searchFields = [
        match.ground?.name,
        match.ground?.city,
        match.ground?.address,
        match.team_a_name,
        match.user?.full_name
      ].filter(Boolean).join(' ').toLowerCase();

      const matchesSearch = searchFields.includes(searchQuery.toLowerCase());

      const matchesCity = selectedCity === 'All' || match.ground.city === selectedCity;
      const matchesPitch = selectedPitch === 'All' || match.ground.pitch_type === selectedPitch;

      let matchesDate = true;
      if (selectedDateFilter === 'Today') {
        const today = new Date().toISOString().split('T')[0];
        matchesDate = match.booking_date === today;
      } else if (selectedDateFilter === 'Tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomStr = tomorrow.toISOString().split('T')[0];
        matchesDate = match.booking_date === tomStr;
      }

      const matchesTab = activeTab === 'all' || match.user_id === user?.id;

      return matchesSearch && matchesCity && matchesPitch && matchesDate && matchesTab;
    });
  }, [matches, searchQuery, selectedCity, selectedPitch, selectedDateFilter, activeTab, user]);

  const cities = useMemo(() => {
    const set = new Set(matches.map(m => m.ground.city).filter(Boolean));
    return ['All', ...Array.from(set)].sort() as string[];
  }, [matches]);

  const pitches = useMemo(() => {
    const set = new Set(matches.map(m => m.ground.pitch_type).filter(Boolean));
    return ['All', ...Array.from(set)].sort() as string[];
  }, [matches]);

  const handleJoinMatch = (match: BookingWithDetails) => {
    const citySlug = slugifyGroundSegment(match.ground.city);
    const groundSlug = slugifyGroundSegment(match.ground.name);

    router.push({
      pathname: `/ground/${citySlug}/${groundSlug}`,
      params: {
        date: match.booking_date,
        time: match.start_time.slice(0, 5),
        teams: 'one',
        lock: 'true'
      }
    } as any);
  };

  const containerStyle = [
    styles.container,
    isWeb && !IS_DARK && styles.webContainerRoot,
    !isWeb && isTablet && { alignSelf: 'center', width: '100%', maxWidth: 800 }
  ];

  const mainContent = (
    <View style={containerStyle}>
      {loading ? (
        <MatchmakingSkeleton isWeb={isWeb} IS_DARK={IS_DARK} />
      ) : (
        <Animated.FlatList
          key={`find-opponent-list-${isSmall ? 'small' : 'large'}-${numColumns}`}
          onScroll={isWeb ? onScrollWeb : (externalScrollHandler || verticalScrollHandler)}
          scrollEventThrottle={16}
          data={filteredMatches}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.webColumnWrapper : undefined}
          ListHeaderComponent={
            isWeb && !isSmall ? (
              <View style={styles.webFilterBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>City:</Text>
                    {cities.map(city => (
                      <Pressable
                        key={city}
                        onPress={() => setSelectedCity(city)}
                        style={[styles.filterTag, selectedCity === city && styles.filterTagActive]}
                      >
                        <Text style={[styles.filterTagText, selectedCity === city && styles.filterTagTextActive]}>{city}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.filterDivider} />
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>Date:</Text>
                    {['All', 'Today', 'Tomorrow'].map(date => (
                      <Pressable
                        key={date}
                        onPress={() => setSelectedDateFilter(date)}
                        style={[styles.filterTag, selectedDateFilter === date && styles.filterTagActive]}
                      >
                        <Text style={[styles.filterTagText, selectedDateFilter === date && styles.filterTagTextActive]}>{date}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.filterDivider} />
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>Ground Type:</Text>
                    {pitches.map(pitch => (
                      <Pressable
                        key={pitch}
                        onPress={() => setSelectedPitch(pitch)}
                        style={[styles.filterTag, selectedPitch === pitch && styles.filterTagActive]}
                      >
                        <Text style={[styles.filterTagText, selectedPitch === pitch && styles.filterTagTextActive]}>{pitch}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : (
              <View style={styles.nativeSearchContainer}>
                <View style={styles.nativeSearchWrapper}>
                  <Search size={18} color="#9CA3AF" />
                  <TextInput
                    placeholder="Search ground or city..."
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.nativeSearchInput}
                  />
                </View>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={isWeb && !isSmall ? styles.webItem : styles.nativeItem}>
              <MatchCard
                match={item}
                onJoin={() => handleJoinMatch(item)}
                buttonTitle="Join Match"
                teamsCount="1/2 Teams"
                lightMode={true}
              />
            </View>
          )}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          style={isWeb && !isSmall ? styles.webFlatList : undefined}
          contentContainerStyle={
            isWeb && !isSmall 
              ? styles.webList 
              : [styles.listNative, { paddingTop: isWeb ? (isSmall ? 160 + insets.top : 0) : 160 + insets.top, paddingBottom: isWeb ? 64 : 100 }]
          }
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadOpenSlots}
              tintColor="#01b854"
              colors={['#01b854']}
              progressViewOffset={isWeb ? 0 : 110 + insets.top}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Trophy size={64} color="#06392e" style={{ marginBottom: 16 }} />
              <Text style={isWeb && !isSmall ? styles.emptyText : styles.emptyTextNative}>
                {isWeb && !isSmall ? 'No teams are looking for opponents right now' : 'No slots found'}
              </Text>
              <Text style={isWeb && !isSmall ? styles.emptySubtext : styles.emptySubtextNative}>
                {isWeb && !isSmall ? 'Maybe create your own match by booking a ground for 1 Team!' : 'Try again later or book yourself!'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );

  return (
    <View style={styles.nativeScreen}>
      {isWeb && !hideHeader ? (
        <WebLayout hideHeader={isSmall} isPublicNoSidebar={isSmall}>
          {isSmall && (
            <Animated.View style={[styles.headerContainerFixed, { paddingTop: insets.top }, headerAnimatedStyle]}>
              <MobileAppNavbar
                title="Find an Opponent"
                titleColor="#0F172A"
                lightBg
              />
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={styles.tab}
                  onPress={() => router.push('/book-my-ground')}
                >
                  <Text style={styles.tabText}>Book a Venue</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, styles.activeTab]}
                >
                  <Text style={styles.activeTabText}>Find an Opposition</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.nativeFiltersDrawer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nativeFilterScroll}>
                  <TouchableOpacity
                    style={[styles.dropdownButton, isUltraNarrow && { paddingHorizontal: 8 }]}
                    onPress={() => setActivePicker('city')}
                  >
                    <Text style={styles.dropdownLabel}>City: </Text>
                    <Text style={styles.dropdownValue}>{selectedCity}</Text>
                    <ChevronDown size={14} color="#64748B" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dropdownButton, isUltraNarrow && { paddingHorizontal: 8 }]}
                    onPress={() => setActivePicker('date')}
                  >
                    <Text style={styles.dropdownLabel}>Date: </Text>
                    <Text style={styles.dropdownValue}>{selectedDateFilter}</Text>
                    <ChevronDown size={14} color="#64748B" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dropdownButton, isUltraNarrow && { paddingHorizontal: 8 }]}
                    onPress={() => setActivePicker('pitch')}
                  >
                    <Text style={styles.dropdownLabel}>Type: </Text>
                    <Text style={styles.dropdownValue}>{selectedPitch}</Text>
                    <ChevronDown size={14} color="#64748B" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </Animated.View>
          )}
          {mainContent}
        </WebLayout>
      ) : isWeb && hideHeader ? (
        mainContent
      ) : hideHeader ? (
        <View style={{ flex: 1 }}>
          <View style={styles.nativeBody}>
            {mainContent}
          </View>
        </View>
      ) : (
        <View style={styles.nativeScreen}>
          <Animated.View style={headerAnimatedStyle}>
            <MobileAppNavbar
              title="Find an Opponent"
              titleColor="#0F172A"
              lightBg
            />
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => router.push('/book-my-ground')}
              >
                <Text style={styles.tabText}>Book a Venue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, styles.activeTab]}
              >
                <Text style={styles.activeTabText}>Find an Opposition</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.nativeFiltersDrawer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nativeFilterScroll}>
                <TouchableOpacity
                  style={[styles.dropdownButton, isUltraNarrow && { paddingHorizontal: 8 }]}
                  onPress={() => setActivePicker('city')}
                >
                  <Text style={styles.dropdownLabel}>City: </Text>
                  <Text style={styles.dropdownValue}>{selectedCity}</Text>
                  <ChevronDown size={14} color="#64748B" style={{ marginLeft: 4 }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dropdownButton, isUltraNarrow && { paddingHorizontal: 8 }]}
                  onPress={() => setActivePicker('date')}
                >
                  <Text style={styles.dropdownLabel}>Date: </Text>
                  <Text style={styles.dropdownValue}>{selectedDateFilter}</Text>
                  <ChevronDown size={14} color="#64748B" style={{ marginLeft: 4 }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dropdownButton, isUltraNarrow && { paddingHorizontal: 8, marginRight: 0 }]}
                  onPress={() => setActivePicker('pitch')}
                >
                  <Text style={styles.dropdownLabel}>Type: </Text>
                  <Text style={styles.dropdownValue}>{selectedPitch}</Text>
                  <ChevronDown size={14} color="#64748B" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Animated.View>

          <Modal
            visible={activePicker !== null}
            onClose={() => setActivePicker(null)}
            title={`Select ${activePicker === 'city' ? 'City' : activePicker === 'date' ? 'Date' : 'Pitch Type'}`}
          >
            <ScrollView style={{ maxHeight: 400 }}>
              {(activePicker === 'city' ? cities : activePicker === 'date' ? ['All', 'Today', 'Tomorrow'] : pitches).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.pickerOption}
                  onPress={() => {
                    if (activePicker === 'city') setSelectedCity(option);
                    else if (activePicker === 'date') setSelectedDateFilter(option);
                    else setSelectedPitch(option);
                    setActivePicker(null);
                  }}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    (activePicker === 'city' ? selectedCity : activePicker === 'date' ? selectedDateFilter : selectedPitch) === option && styles.pickerOptionTextActive
                  ]}>
                    {option}
                  </Text>
                  {(activePicker === 'city' ? selectedCity : activePicker === 'date' ? selectedDateFilter : selectedPitch) === option && (
                    <Check size={18} color="#01b854" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Modal>

          <View style={styles.nativeBody}>
            {mainContent}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainerFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 0,
  },
  webContainerRoot: {
    backgroundColor: '#FFFFFF',
    paddingTop: 0,
  },
  nativeScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  nativeBody: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  backText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  nativeHero: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  heroText: {
    gap: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  heroBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(216, 247, 157, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeSearchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: 'transparent',
  },
  nativeSearchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nativeSearchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
  },
  nativeFilterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nativeFilterButtonActive: {
    backgroundColor: '#01b854',
    borderColor: '#01b854',
  },
  nativeFiltersDrawer: {
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  nativeFilterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  nativeFilterTag: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nativeFilterTagActive: {
    backgroundColor: 'rgba(1, 184, 84, 0.12)',
    borderColor: 'rgba(1, 184, 84, 0.4)',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  dropdownValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
  },
  pickerOptionTextActive: {
    color: '#01b854',
    fontWeight: '700',
  },
  nativeFilterTagText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  nativeFilterTagTextActive: {
    color: '#01b854',
    fontWeight: '700',
  },
  webCard: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    overflow: 'hidden',
    marginTop: 0,
  },
  webHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    height: 40,
    width: 250,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    outlineStyle: 'none',
  } as any,
  webFilterBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  filterScroll: {
    alignItems: 'center',
    gap: 20,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 2,
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  filterTag: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  filterTagActive: {
    backgroundColor: 'rgba(1, 184, 84, 0.12)',
    borderColor: 'rgba(1, 184, 84, 0.4)',
    borderWidth: 1.5,
    ...Platform.select({
      web: { backdropFilter: 'blur(8px)' }
    }) as any,
  },
  filterTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  filterTagTextActive: {
    color: '#01b854',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(216, 247, 157, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgePillNumber: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#01b854',
  },
  badgePillLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#01b854',
    textTransform: 'uppercase',
  },
  webList: {
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 80 : 20,
    gap: 16,
  },
  webFlatList: {
    flex: 1,
  },
  webItem: {
    flex: 1,
  },
  webColumnWrapper: {
    gap: 20,
  },
  listNative: {
    padding: 16,
  },
  nativeItem: {
    marginBottom: 4,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyTextNative: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtextNative: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 0,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  webTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 4,
    marginBottom: 0,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  desktopTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 4,
    marginBottom: 0,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tabText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  activeTabText: {
    color: '#01b854',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  summaryFilterScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  summaryFilterGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  summaryFilterTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  summaryFilterTagActive: {
    backgroundColor: 'rgba(1, 184, 84, 0.12)',
    borderColor: 'rgba(1, 184, 84, 0.4)',
    borderWidth: 1.5,
  },
  summaryFilterTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  summaryFilterTagTextActive: {
    color: '#01b854',
  },
  summaryFilterLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 4,
    alignSelf: 'center',
  },
  summaryFilterDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
});
