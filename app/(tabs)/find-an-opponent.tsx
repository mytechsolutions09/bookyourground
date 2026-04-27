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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { BookingWithDetails } from '@/types';
import MobileAppNavbar from '../../components/MobileAppNavbar';
import WebLayout from '@/components/web/WebLayout';
import MatchCard from '@/components/matches/MatchCard';
import { Trophy, Swords, MapPin, Search, ChevronLeft, Menu } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import { slugifyGroundSegment } from '@/utils/groundSlug';
import MatchmakingSkeleton from '@/components/matches/MatchmakingSkeleton';

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

  // Filters
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState((params.q as string) || '');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedPitch, setSelectedPitch] = useState('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const insets = useSafeAreaInsets();
  const { setTabBarVisible } = useUI();
  
  const headerTranslateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const HEADER_HEIGHT = 100;
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
          headerTranslateY.value = withTiming(-HEADER_HEIGHT - (isWeb ? 0 : insets.top), { 
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

  useEffect(() => {
    loadOpenSlots();
  }, []);

  const loadOpenSlots = async () => {
    try {
      setLoading(true);
      const todayISO = new Date().toISOString().split('T')[0];

      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      // Fetch matchmaking candidates using our DB function (optimized for scale)
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

      if (!data) {
        setMatches([]);
        return;
      }

      setMatches(data as any[]);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
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

      return matchesSearch && matchesCity && matchesPitch && matchesDate;
    });
  }, [matches, searchQuery, selectedCity, selectedPitch, selectedDateFilter]);

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

  const content = (
    <View style={[styles.container, isWeb && !IS_DARK && styles.webContainerRoot]}>
      {isWeb && !IS_DARK ? (
        <View style={styles.webCard}>
          <FlatList
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <>
                <View style={width >= 900 ? styles.desktopTabContainer : styles.webTabContainer}>
                  <TouchableOpacity 
                    style={styles.tab}
                    onPress={() => router.push('/book-my-ground' as any)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tabText}>Book a Ground</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.tab, styles.activeTab]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.activeTabText}>Find an Opponent</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.header, styles.webHeader]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Find an Opponent</Text>
                    <Text style={styles.subtitle}>
                      Slots with one team waiting for a match.
                    </Text>
                  </View>

                  <View style={styles.webHeaderActions}>
                    <View style={styles.searchWrapper}>
                      <Search size={18} color="#9CA3AF" />
                      <TextInput
                        placeholder="Search grounds or cities..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchInput}
                      />
                    </View>

                    <View style={styles.badgePill}>
                      <Swords size={20} color="#01b854" />
                      <Text style={styles.badgePillNumber}>{filteredMatches.length}</Text>
                      <Text style={styles.badgePillLabel}>Available</Text>
                    </View>
                  </View>
                </View>

                {/* Web Filter Bar */}
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
              </>
            }
            onScroll={Platform.OS === 'web' ? undefined : verticalScrollHandler}
            scrollEventThrottle={16}
            data={filteredMatches}
            renderItem={({ item }) => (
              <View style={styles.webItem}>
                <MatchCard
                  match={item}
                  onJoin={() => handleJoinMatch(item)}
                  buttonTitle="Join Match"
                  teamsCount="1/2 Teams"
                  lightMode={isWeb && !IS_DARK}
                />
              </View>
            )}
            keyExtractor={item => item.id}
            numColumns={isWideWeb || isExtraWideWeb ? 3 : isMediumWeb ? 2 : 1}
            columnWrapperStyle={
              isWideWeb || isExtraWideWeb || isMediumWeb ? styles.webColumnWrapper : undefined
            }
            style={styles.webFlatList}
            contentContainerStyle={styles.webList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadOpenSlots} />
            }
            ListEmptyComponent={
              loading ? (
                <MatchmakingSkeleton isWeb={true} IS_DARK={IS_DARK} />
              ) : (
                <View style={styles.emptyContainer}>
                  <Trophy size={48} color="#E5E7EB" style={{ marginBottom: 16 }} />
                  <Text style={styles.emptyText}>No teams are looking for opponents right now</Text>
                  <Text style={styles.emptySubtext}>Maybe create your own match by booking a ground for 1 Team!</Text>
                </View>
              )
            }
          />
        </View>
      ) : (
        <>
          {loading ? (
            <MatchmakingSkeleton isWeb={false} IS_DARK={true} />
          ) : (
            <FlatList
              onScroll={Platform.OS === 'web' ? undefined : (externalScrollHandler || verticalScrollHandler)}
              scrollEventThrottle={16}
              data={filteredMatches}
              renderItem={({ item }) => (
                <View style={styles.nativeItem}>
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
              contentContainerStyle={[styles.listNative, { paddingTop: HEADER_HEIGHT + insets.top + (showFilters ? 110 : 60), paddingBottom: 100 }]}
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={loadOpenSlots}
                  tintColor="#01b854"
                  colors={['#01b854']}
                  progressViewOffset={HEADER_HEIGHT + insets.top + 20}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Trophy size={64} color="#06392e" style={{ marginBottom: 16 }} />
                  <Text style={styles.emptyTextNative}>No slots found</Text>
                  <Text style={styles.emptySubtextNative}>Try again later or book yourself!</Text>
                </View>
              }
            />
          )}
        </>
      )}
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout hideHeader={isSmall} isPublicNoSidebar={isSmall}>
        {isSmall && (
          <View style={[styles.headerContainerFixed, { paddingTop: insets.top }]}>
            <MobileAppNavbar 
              title="Find an Opponent" 
              titleColor="#0F172A"
              lightBg
            />
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={styles.tab}
                onPress={() => router.push('/book-my-ground' as any)}
                activeOpacity={0.7}
              >
                <Text style={styles.tabText}>Book a Ground</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, styles.activeTab]}
                activeOpacity={0.7}
              >
                <Text style={styles.activeTabText}>Find an Opponent</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {content}
      </WebLayout>
    );
  }



  if (hideHeader) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.nativeBody}>
          {loading ? (
            <MatchmakingSkeleton isWeb={false} IS_DARK={true} />
          ) : (
            <FlatList
              onScroll={Platform.OS === 'web' ? undefined : (externalScrollHandler || verticalScrollHandler)}
              scrollEventThrottle={16}
              data={filteredMatches}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={{ backgroundColor: '#F9FAFB' }}>
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
                    <Pressable
                      onPress={() => setShowFilters(!showFilters)}
                      style={[styles.nativeFilterButton, showFilters && styles.nativeFilterButtonActive]}
                    >
                      <MapPin size={20} color={showFilters ? "#FFFFFF" : "#6B7280"} />
                    </Pressable>
                  </View>

                  {showFilters && (
                    <View style={styles.nativeFiltersDrawer}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nativeFilterScroll}>
                        {cities.map(city => (
                          <Pressable
                            key={city}
                            onPress={() => setSelectedCity(city)}
                            style={[styles.nativeFilterTag, selectedCity === city && styles.nativeFilterTagActive]}
                          >
                            <Text style={[styles.nativeFilterTagText, selectedCity === city && styles.nativeFilterTagTextActive]}>{city}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nativeFilterScroll}>
                        {pitches.map(pitch => (
                          <Pressable
                            key={pitch}
                            onPress={() => setSelectedPitch(pitch)}
                            style={[styles.nativeFilterTag, selectedPitch === pitch && styles.nativeFilterTagActive]}
                          >
                            <Text style={[styles.nativeFilterTagText, selectedPitch === pitch && styles.nativeFilterTagTextActive]}>{pitch}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.nativeItem}>
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
              contentContainerStyle={[styles.listNative, { paddingTop: 110 + insets.top, paddingBottom: 100 }]}
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={loadOpenSlots}
                  tintColor="#01b854"
                  colors={['#01b854']}
                  progressViewOffset={110 + insets.top}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Trophy size={64} color="#06392e" style={{ marginBottom: 16 }} />
                  <Text style={styles.emptyTextNative}>No slots found</Text>
                  <Text style={styles.emptySubtextNative}>Try again later or book yourself!</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.nativeScreen}>
      <Animated.View style={summaryAnimatedStyle}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryFilterScroll}>
          <View style={styles.summaryFilterGroup}>
            <Text style={styles.summaryFilterLabel}>City:</Text>
            {cities.map(city => (
              <Pressable
                key={city}
                onPress={() => setSelectedCity(city)}
                style={[styles.summaryFilterTag, selectedCity === city && styles.summaryFilterTagActive]}
              >
                <Text style={[styles.summaryFilterTagText, selectedCity === city && styles.summaryFilterTagTextActive]}>{city}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.summaryFilterDivider} />
          <View style={styles.summaryFilterGroup}>
            <Text style={styles.summaryFilterLabel}>Date:</Text>
            {['All', 'Today', 'Tomorrow'].map(date => (
              <Pressable
                key={date}
                onPress={() => setSelectedDateFilter(date)}
                style={[styles.summaryFilterTag, selectedDateFilter === date && styles.summaryFilterTagActive]}
              >
                <Text style={[styles.summaryFilterTagText, selectedDateFilter === date && styles.summaryFilterTagTextActive]}>{date}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.summaryFilterDivider} />
          <View style={styles.summaryFilterGroup}>
            <Text style={styles.summaryFilterLabel}>Type:</Text>
            {pitches.map(pitch => (
              <Pressable
                key={pitch}
                onPress={() => setSelectedPitch(pitch)}
                style={[styles.summaryFilterTag, selectedPitch === pitch && styles.summaryFilterTagActive]}
              >
                <Text style={[styles.summaryFilterTagText, selectedPitch === pitch && styles.summaryFilterTagTextActive]}>{pitch}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </Animated.View>

      <Animated.View style={headerAnimatedStyle}>
        <MobileAppNavbar 
          title="Find an Opponent" 
          titleColor="#0F172A"
          lightBg
        />

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => {
              if (Platform.OS !== 'web' && LayoutAnimation) {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              }
              router.push('/(tabs)/grounds');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.tabText}>Book a Ground</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, styles.activeTab]}
            activeOpacity={0.7}
          >
            <Text style={styles.activeTabText}>Find an Opponent</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <View style={styles.nativeBody}>
        <FlatList
          onScroll={Platform.OS === 'web' ? undefined : verticalScrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          data={filteredMatches}
          ListHeaderComponent={
            <View style={{ backgroundColor: '#F9FAFB' }}>
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
                <Pressable
                  onPress={() => setShowFilters(!showFilters)}
                  style={[styles.nativeFilterButton, showFilters && styles.nativeFilterButtonActive]}
                >
                  <MapPin size={20} color={showFilters ? "#FFFFFF" : "#6B7280"} />
                </Pressable>
              </View>

              {showFilters && (
                <View style={styles.nativeFiltersDrawer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nativeFilterScroll}>
                    {cities.map(city => (
                      <Pressable
                        key={city}
                        onPress={() => setSelectedCity(city)}
                        style={[styles.nativeFilterTag, selectedCity === city && styles.nativeFilterTagActive]}
                      >
                        <Text style={[styles.nativeFilterTagText, selectedCity === city && styles.nativeFilterTagTextActive]}>{city}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nativeFilterScroll}>
                    {pitches.map(pitch => (
                      <Pressable
                        key={pitch}
                        onPress={() => setSelectedPitch(pitch)}
                        style={[styles.nativeFilterTag, selectedPitch === pitch && styles.nativeFilterTagActive]}
                      >
                        <Text style={[styles.nativeFilterTagText, selectedPitch === pitch && styles.nativeFilterTagTextActive]}>{pitch}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.nativeItem}>
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
          contentContainerStyle={[styles.listNative, { paddingTop: 100 + insets.top, paddingBottom: 100 }]}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadOpenSlots}
              tintColor="#01b854"
              colors={['#01b854']}
              progressViewOffset={100 + insets.top}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Trophy size={64} color="#06392e" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTextNative}>No slots found</Text>
              <Text style={styles.emptySubtextNative}>Try again later or book yourself!</Text>
            </View>
          }
        />
      </View>
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
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    paddingVertical: 8,
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
    backgroundColor: '#01b854',
    borderColor: '#01b854',
  },
  nativeFilterTagText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  nativeFilterTagTextActive: {
    color: '#FFFFFF',
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
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  filterTagActive: {
    backgroundColor: '#01b854',
  },
  filterTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    paddingVertical: 2,
  },
  filterTagTextActive: {
    color: '#043529',
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
    padding: 6,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    width: '90%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  webTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 6,
    marginBottom: 12,
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
    padding: 6,
    marginBottom: 12,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
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
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tabText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  activeTabText: {
    color: '#01b854',
    fontSize: 12,
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
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryFilterTagActive: {
    backgroundColor: '#01b854',
    borderColor: '#01b854',
  },
  summaryFilterTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  summaryFilterTagTextActive: {
    color: '#FFFFFF',
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
