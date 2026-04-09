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
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { BookingWithDetails } from '@/types';
import MobileAppNavbar from '../components/MobileAppNavbar';
import WebLayout from '@/components/web/WebLayout';
import MatchCard from '@/components/matches/MatchCard';
import { Trophy, Swords, MapPin, Search, ChevronLeft } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import { slugifyGroundSegment } from '@/utils/groundSlug';
import MatchmakingSkeleton from '@/components/matches/MatchmakingSkeleton';

export default function FindAnOpponentScreen() {
  const [matches, setMatches] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const IS_DARK = !isWeb || (width < 900);
  const isWideWeb = Platform.OS === 'web' && width >= 1100;
  const isExtraWideWeb = Platform.OS === 'web' && width >= 1350;
  const isMediumWeb = Platform.OS === 'web' && width >= 768 && width < 1100;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedPitch, setSelectedPitch] = useState('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

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
      const matchSearch = (match.ground.name + ' ' + match.ground.city).toLowerCase();
      const matchesSearch = matchSearch.includes(searchQuery.toLowerCase());

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
                <Swords size={20} color="#00ea6b" />
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

          <FlatList
            data={filteredMatches}
            renderItem={({ item }) => (
              <View style={styles.webItem}>
                <MatchCard
                  match={item}
                  onJoin={() => handleJoinMatch(item)}
                  buttonTitle="Join Match"
                  teamsCount="1/2 Teams"
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
            showsVerticalScrollIndicator
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
          <View style={styles.nativeHero}>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Find an Opponent</Text>
              <Text style={styles.heroSubtitle}>Find teams looking for opponents</Text>
            </View>
            <View style={styles.heroBadge}>
              <Swords size={24} color="#00ea6b" />
            </View>
          </View>

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
              <MapPin size={20} color={showFilters ? "#043529" : "#00ea6b"} />
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

          {loading ? (
            <MatchmakingSkeleton isWeb={false} IS_DARK={true} />
          ) : (
            <FlatList
              data={filteredMatches}
              renderItem={({ item }) => (
                <View style={styles.nativeItem}>
                  <MatchCard
                    match={item}
                    onJoin={() => handleJoinMatch(item)}
                    buttonTitle="Join Match"
                    teamsCount="1/2 Teams"
                  />
                </View>
              )}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listNative}
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={loadOpenSlots}
                  tintColor="#00ea6b"
                  colors={['#00ea6b']}
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
    return <WebLayout>{content}</WebLayout>;
  }

  return (
    <View style={styles.nativeScreen}>
      <MobileAppNavbar title="Find an Opponent" titleColor="#00ea6b" />
      <View style={styles.nativeBody}>{content}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#043529',
  },
  webContainerRoot: {
    backgroundColor: '#F9FAFB',
  },
  nativeScreen: {
    flex: 1,
    backgroundColor: '#043529',
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
    backgroundColor: '#043529',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroText: {
    gap: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#00ea6b',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  heroBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,234,107,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeSearchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: '#043529',
  },
  nativeSearchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06392e',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.1)',
  },
  nativeSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  nativeFilterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#06392e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.1)',
  },
  nativeFilterButtonActive: {
    backgroundColor: '#00ea6b',
  },
  nativeFiltersDrawer: {
    paddingVertical: 8,
    backgroundColor: '#043529',
    gap: 8,
  },
  nativeFilterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  nativeFilterTag: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#06392e',
    borderWidth: 1,
    borderColor: 'rgba(220,192,147,0.1)',
  },
  nativeFilterTagActive: {
    backgroundColor: '#00ea6b',
    borderColor: '#00ea6b',
  },
  nativeFilterTagText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  nativeFilterTagTextActive: {
    color: '#043529',
  },
  webCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    margin: 12,
    flex: 1,
    overflow: 'hidden',
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
    backgroundColor: '#00ea6b',
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
    fontSize: 24,
    fontWeight: '900',
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
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgePillNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#166534',
  },
  badgePillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    textTransform: 'uppercase',
  },
  webList: {
    padding: 20,
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
    marginBottom: 8,
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
    fontSize: 18,
    fontWeight: '700',
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
    fontSize: 20,
    fontWeight: '800',
    color: '#00ea6b',
  },
  emptySubtextNative: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});
