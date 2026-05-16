import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  useWindowDimensions,
  Pressable,
  ActivityIndicator,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import { Calendar as RNCalendar, LocaleConfig } from 'react-native-calendars';

LocaleConfig.locales['en'] = {
  monthNames: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  monthNamesShort: ['Jan.','Feb.','Mar.','Apr.','May','Jun.','Jul.','Aug.','Sep.','Oct.','Nov.','Dec.'],
  dayNames: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  dayNamesShort: ['S','M','T','W','T','F','S'],
  today: 'Today'
};
LocaleConfig.defaultLocale = 'en';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '../components/MobileAppNavbar';
import { Search, MapPin, Building2, Swords, Trophy, Star, ArrowRight, ChevronDown, ChevronRight, Calendar, Clock, IndianRupee } from 'lucide-react-native';
import GroundCard from '@/components/grounds/GroundCard';
import { makeGroundPath } from '@/utils/groundSlug';
import { formatCurrency } from '@/utils/helpers';
import Button from '@/components/ui/Button';
import { Location, GroundType } from '@/types';

type SearchTab = 'all' | 'grounds' | 'matches';
const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: 20000 },
  { label: 'Under ₹500', min: 0, max: 500 },
  { label: '₹500 - ₹1000', min: 500, max: 1000 },
  { label: '₹1000 - ₹2000', min: 1000, max: 2000 },
  { label: 'Over ₹2000', min: 2000, max: 20000 },
];

export default function SearchScreen() {
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isCompact = width < 900;
  const IS_DARK = !isWeb || isCompact;
  
  const [query, setQuery] = useState((params.q as string) || '');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const labels: Record<string, string> = {
    all: 'All',
    grounds: 'Grounds',
    matches: 'Find Opposition'
  };
  const [results, setResults] = useState<{ grounds: any[], matches: any[] }>({ grounds: [], matches: [] });
  const [loading, setLoading] = useState(false);

  const [locationKey, setLocationKey] = useState<string>((params.location as string) || '');
  const [typeKey, setTypeKey] = useState<string>((params.type as string) || '');
  const [dateKey, setDateKey] = useState<string>((params.date as string) || 'All');
  const [timeKey, setTimeKey] = useState<string>((params.time as string) || '');
  const [locations, setLocations] = useState<Location[]>([]);
  const [types, setTypes] = useState<GroundType[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceRange, setPriceRange] = useState(PRICE_RANGES[0]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  useEffect(() => {
    const loadFilters = async () => {
      const [locs, typs] = await Promise.all([
        supabase.from('locations').select('*').eq('active', true).order('sort_order'),
        supabase.from('ground_types').select('*').eq('active', true).order('sort_order')
      ]);
      setLocations(locs.data || []);
      
      const typesData = typs.data || [];
      if (!typesData.some((t: any) => t.name.toLowerCase() === 'nets')) {
        typesData.push({ id: 'fallback-nets', name: 'Nets', label: 'Nets', active: true, sort_order: 99 });
      }
      setTypes(typesData);
    };
    loadFilters();
  }, []);

  // Sync state with URL params when they change (important for hero-to-search or internal navigation)
  useEffect(() => {
    if (params.q !== undefined) setQuery((params.q as string) || '');
    if (params.location !== undefined) setLocationKey((params.location as string) || '');
    if (params.type !== undefined) setTypeKey((params.type as string) || '');
    if (params.date !== undefined) {
      const d = params.date as string;
      setDateKey(d || 'All');
    }
    if (params.time !== undefined) setTimeKey((params.time as string) || '');
  }, [params.q, params.location, params.type, params.date, params.time]);

  useEffect(() => {
    performSearch(query, locationKey, typeKey, dateKey, timeKey, priceRange);
  }, [query, locationKey, typeKey, dateKey, timeKey, priceRange]);

  useEffect(() => {
    const fetchAvailableTimes = async () => {
      try {
        let query = supabase
          .from('time_slots')
          .select('start_time, grounds!inner(city, state, pitch_type)')
          .eq('is_available', true);

        if (locationKey) {
          const [city, state] = locationKey.split('__');
          query = query.eq('grounds.city', city).eq('grounds.state', state);
        }

        if (typeKey) {
          query = query.eq('grounds.pitch_type', typeKey);
        }

        if (dateKey && dateKey !== 'All') {
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          let dow = '';
          if (dateKey === 'Today') {
            dow = days[new Date().getDay()];
          } else if (dateKey === 'Tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dow = days[tomorrow.getDay()];
          } else {
            dow = days[new Date(dateKey).getDay()];
          }
          query = query.eq('day_of_week', dow);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data) {
          const uniqueTimes = Array.from(new Set(data.map(item => item.start_time.slice(0, 5)))).sort();
          setAvailableTimes(uniqueTimes);
          
          // If current timeKey is not in available times, reset it (but keep "All" option logic)
          if (timeKey && !uniqueTimes.includes(timeKey)) {
            // setTimeKey(''); // Optional: auto-reset if slot vanishes
          }
        }
      } catch (e) {
        console.error('Error fetching available times:', e);
      }
    };

    fetchAvailableTimes();
  }, [locationKey, typeKey, dateKey]);

  const performSearch = async (s: string, locKey?: string, typKey?: string, date?: string, time?: string, price?: { min: number, max: number }) => {
    setLoading(true);
    try {
      const ts = `%${(s || '').trim()}%`;

      // 1. Search Grounds
      let gQuery = supabase
        .from('grounds')
        .select(`*, ground_images(*), reviews(rating), time_slots${(date !== 'All' || time) ? '!inner' : ''}(custom_price, is_available, day_of_week, start_time)`)
        .eq('active', true)
        .eq('approved', true);

      if (s.trim()) {
        gQuery = gQuery.or(`name.ilike.${ts},city.ilike.${ts},state.ilike.${ts},address.ilike.${ts},pitch_type.ilike.${ts}`);
      }

      if (locKey) {
        const [city, state] = locKey.split('__');
        gQuery = gQuery.eq('city', city).eq('state', state);
      }

      if (typKey) {
        gQuery = gQuery.eq('pitch_type', typKey);
      }

      if (price && price.label !== 'All Prices') {
        if (price.min > 0) gQuery = gQuery.gte('min_price', price.min);
        if (price.max < 20000) gQuery = gQuery.lte('min_price', price.max);
      }

      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      let dow = '';
      let rpcDate = date;

      if (date && date !== 'All') {
        if (date === 'Today') {
          rpcDate = new Date().toISOString().split('T')[0];
          dow = days[new Date().getDay()];
        } else if (date === 'Tomorrow') {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          rpcDate = tomorrow.toISOString().split('T')[0];
          dow = days[tomorrow.getDay()];
        } else {
          rpcDate = date;
          dow = days[new Date(date).getDay()];
        }
        gQuery = gQuery.eq('time_slots.day_of_week', dow).eq('time_slots.is_available', true);
      }

      let { data: gs } = await gQuery.limit(30);

      // 1.5 Filter grounds by slot if date and time are provided
      if (rpcDate && rpcDate !== 'All' && time && gs && gs.length > 0) {
        try {
          const { data: allowedData } = await supabase.rpc('available_ground_ids_for_slot', {
            p_ground_ids: gs.map(g => g.id),
            p_booking_date: rpcDate,
            p_start_time: `${time}:00`,
          });

          if (allowedData) {
            const allowedSet = new Set((allowedData as any[]).map(r => r.ground_id));
            gs = gs.filter((g: any) => allowedSet.has(g.id));
          }
        } catch (e) {
          console.error('Error filtering grounds by slot:', e);
        }
      }

      // 2. Search Matches using the same logic as "Find an Opponent"
      const todayISO = new Date().toISOString().split('T')[0];
      const { data: ms, error: mError } = await supabase
        .rpc('get_open_matchmaking_bookings', { p_today: todayISO })
        .select(`
          *,
          ground:grounds!inner(*, ground_images(*)),
          user:profiles(*)
        `);

      if (mError) console.error('Match search error:', mError);

      // Filter out nets from matchmaking results
      let filteredMs = (ms || []).filter((m: any) => 
        !String(m.ground?.pitch_type ?? '').toLowerCase().includes('nets')
      );

      // Manual filtering for keywords/location/type on match results
      if (s.trim() || locKey || typKey) {
        filteredMs = filteredMs.filter((m: any) => {
          const matchesKeyword = !s.trim() || 
            (m.ground?.name?.toLowerCase().includes(s.toLowerCase())) ||
            (m.ground?.city?.toLowerCase().includes(s.toLowerCase())) ||
            (m.user?.team_name?.toLowerCase().includes(s.toLowerCase())) ||
            (m.user?.full_name?.toLowerCase().includes(s.toLowerCase())) ||
            (m.opponent_team_name?.toLowerCase().includes(s.toLowerCase())) ||
            (m.opponent_captain_name?.toLowerCase().includes(s.toLowerCase())) ||
            (m.notes?.toLowerCase().includes(s.toLowerCase())) ||
            (m.ground?.pitch_type?.toLowerCase().includes(s.toLowerCase()));
          
          const matchesLoc = !locKey || `${m.ground?.city}__${m.ground?.state}` === locKey;
          const matchesTyp = !typKey || m.ground?.pitch_type === typKey;

          return matchesKeyword && matchesLoc && matchesTyp;
        });
      }

      const { data: ps } = await supabase
        .from('profiles')
        .select(`
          team_name,
          full_name,
          bookings!user_id(
            *,
            ground:grounds(*, ground_images(*))
          )
        `)
        .or(`team_name.ilike.${ts},full_name.ilike.${ts}`)
        .limit(10);

      const additionalMs = (ps || [])
        .flatMap(p => (p.bookings || []).map(b => ({ ...b, user: { team_name: p.team_name, full_name: p.full_name } })))
        .filter(b => b.ground);

      // 3. Enhance matches with precise pricing logic
      const enhancedMatches = await Promise.all((ms || []).map(async (m: any) => {
        try {
          const parts = m.booking_date.split('-');
          const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          const dow = dateObj.getDay(); // Simple fallback for DOW

          const { data: slotData } = await supabase
            .from('time_slots')
            .select('custom_price')
            .eq('ground_id', m.ground_id)
            .eq('day_of_week', ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dow])
            .eq('start_time', m.start_time)
            .maybeSingle();

          const currentSlotPrice = slotData?.custom_price ?? m.ground?.base_price_per_hour ?? 0;
          const isBox = String(m.ground?.pitch_type ?? '').toLowerCase().includes('box');
          
          let totalMatchPrice = currentSlotPrice;
          if (isBox) {
            const hours = m.total_hours || 1;
            totalMatchPrice = currentSlotPrice * hours;
          }

          return { ...m, total_amount: Math.round((totalMatchPrice / 2) * 100) / 100 };
        } catch (e) {
          return m;
        }
      }));

      setResults({
        grounds: gs || [],
        matches: [...enhancedMatches, ...additionalMs].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMatch = (item: any) => {
    const citySlug = (item.ground?.city || 'city').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const nameSlug = (item.ground?.name || 'ground').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    router.push({
      pathname: `/ground/${citySlug}/${nameSlug}`,
      params: {
        date: item.booking_date,
        time: item.start_time?.slice(0, 5),
        teams: 'one',
        lock: 'true'
      }
    } as any);
  };

  const renderGround = ({ item }: { item: any }) => {
    const displayPrice = (() => {
      if (dateKey !== 'All' && timeKey && item.time_slots) {
        const dateObj = new Date(dateKey);
        const dow = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()];
        const slot = item.time_slots.find((s: any) => 
          s.day_of_week === dow && 
          s.start_time?.slice(0, 5) === timeKey.slice(0, 5)
        );
        if (slot && slot.custom_price != null) {
          return Number(slot.custom_price);
        }
      }
      
      if (item.min_price !== null && item.min_price !== undefined) {
        return Number(item.min_price);
      }

      const availablePrices = item.time_slots
        ?.filter((s: any) => s.is_available && s.custom_price != null)
        .map((s: any) => Number(s.custom_price));

      if (availablePrices && availablePrices.length > 0) {
        return Math.min(...availablePrices);
      }
      
      return Number(item.base_price_per_hour) || 0;
    })();

    const isBox = String(item.pitch_type || '').toLowerCase().includes('box');
    const unitLabel = isBox ? '/hr' : ' / match';

    return (
      <View style={{ flex: 1, marginBottom: 16 }}>
        <GroundCard
          ground={item}
          glass={true}
          displayPricePerUnit={displayPrice}
          unitLabelOverride={unitLabel}
          onPress={() => {
            const path = makeGroundPath(item);
            const params: any = {};
            if (dateKey !== 'All') params.date = dateKey;
            if (timeKey) params.time = timeKey;
            router.push({ pathname: path as any, params });
          }}
        />
      </View>
    );
  };

  const renderMatch = ({ item }: { item: any }) => {
    const img = item.ground?.ground_images?.[0]?.image_url || 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';
    const teamName = item.user?.team_name || 'Anonymous Team';
    const captainName = item.user?.full_name || 'Anonymous';
    
    return (
      <Pressable 
        style={styles.premiumCard} 
        onPress={() => handleJoinMatch(item)}
      >
        <Image source={{ uri: img }} style={styles.premiumCardImage} />
        <View style={styles.premiumOverlay}>
          <View style={styles.premiumMatchHeader}>
            <Text style={[styles.premiumTitle, { fontSize: 24, marginBottom: 2 }]}>Opposition - {teamName}</Text>
            <Text style={styles.premiumCaptainText}>Capt: {captainName}</Text>
          </View>
          
          <View style={styles.premiumInfoCard}>
            <View style={styles.premiumLocationRow}>
              <Swords size={16} color="#01b854" />
              <Text style={styles.premiumLocationText}>{item.ground?.name}</Text>
            </View>
            
            <View style={styles.premiumPriceRow}>
              <Text style={styles.premiumPriceText}>₹{item.total_amount || '---'}</Text>
              <Text style={styles.premiumPriceUnit}> / match</Text>
            </View>

            <View style={styles.premiumMatchMeta}>
                 <Text style={styles.premiumMatchMetaText}>{item.booking_date} @ {item.start_time?.slice(0, 5)}</Text>
            </View>
          </View>

          <View style={styles.premiumBottomRow}>
            <View style={styles.premiumLocationLink}>
              <MapPin size={10} color="#FFFFFF" />
              <Text style={styles.premiumLocationLinkText}>{item.ground?.city}</Text>
            </View>
            <Button 
                title="JOIN NOW" 
                onPress={() => handleJoinMatch(item)} 
                variant="primary"
                style={styles.premiumJoinBtnAction}
                textStyle={styles.premiumJoinBtnText}
            />
          </View>
        </View>
      </Pressable>
    );
  };

  const combinedResults = useMemo(() => {
    // Filter out nets and past slots from matches
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMins = now.getHours() * 60 + now.getMinutes();

    let filteredMatches = results.matches.filter((m: any) => {
      // Basic type filter
      if (String(m.ground?.pitch_type ?? '').toLowerCase().includes('nets')) return false;

      // Temporal filter: hide if date is past
      if (m.booking_date < todayStr) return false;

      // If date is today, hide if start_time is past
      if (m.booking_date === todayStr) {
        const [h, min] = (m.start_time || '00:00').split(':').map(Number);
        const slotMins = h * 60 + min;
        return slotMins > currentMins;
      }

      return true;
    });

    if (dateKey !== 'All') {
      const today = new Date().toISOString().split('T')[0];
      if (dateKey === 'Today') {
        filteredMatches = filteredMatches.filter(m => m.booking_date === today);
      } else if (dateKey === 'Tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        filteredMatches = filteredMatches.filter(m => m.booking_date === tomorrowStr);
      } else {
        // Specific date string (YYYY-MM-DD)
        filteredMatches = filteredMatches.filter(m => m.booking_date === dateKey);
      }
    }

    if (activeTab === 'grounds') return results.grounds.map(g => ({ ...g, _type: 'ground' }));
    if (activeTab === 'matches') return filteredMatches.map(m => ({ ...m, _type: 'match' }));
    return [
      ...results.grounds.map(g => ({ ...g, _type: 'ground' })),
      ...filteredMatches.map(m => ({ ...m, _type: 'match' }))
    ];
  }, [results, activeTab, dateKey]);

  const content = (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        {/* Sidebar */}
        {!isCompact && (
          <View style={styles.sidebar}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarScroll}>
              <View style={styles.sidebarSection}>
                <Text style={styles.sidebarSectionTitle}>Search</Text>
                <View style={styles.sidebarSearchBox}>
                  <Search size={16} color="#9CA3AF" />
                  <TextInput
                    style={styles.sidebarSearchInput}
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Keywords..."
                    placeholderTextColor="#9CA3AF"
                    onSubmitEditing={() => performSearch(query, locationKey, typeKey)}
                    returnKeyType="search"
                  />
                </View>
              </View>

              <View style={styles.sidebarSection}>
                <Text style={styles.sidebarSectionTitle}>Venue Type</Text>
                <Pressable style={styles.filterButton} onPress={() => setShowTypeModal(!showTypeModal)}>
                  <Building2 size={14} color="#01b854" />
                  <Text style={styles.filterButtonText} numberOfLines={1}>
                    {activeTab === 'matches' ? 'Find Opposition' : (typeKey || 'All Types')}
                  </Text>
                  <ChevronDown size={12} color="#9CA3AF" />
                </Pressable>
                {showTypeModal && (
                  <View style={styles.dropdownInline}>
                    <ScrollView style={{ maxHeight: 200 }}>
                      <Pressable 
                        style={styles.dropdownOption} 
                        onPress={() => { setActiveTab('matches'); setTypeKey(''); setShowTypeModal(false); }}
                      >
                        <Text style={styles.dropdownOptionText}>Find Opposition</Text>
                      </Pressable>
                      {types.map(t => (
                        <Pressable 
                          key={t.id} 
                          style={styles.dropdownOption} 
                          onPress={() => { setActiveTab('grounds'); setTypeKey(t.name); setShowTypeModal(false); }}
                        >
                          <Text style={styles.dropdownOptionText}>{t.label || t.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

                <View style={styles.sidebarSection}>
                  <Text style={styles.sidebarSectionTitle}>Date</Text>
                  <Pressable style={styles.filterButton} onPress={() => setShowDateModal(!showDateModal)}>
                    <Calendar size={14} color="#01b854" />
                    <Text style={styles.filterButtonText} numberOfLines={1}>
                      {dateKey === 'All' || dateKey === 'Today' || dateKey === 'Tomorrow' ? dateKey : new Date(dateKey).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                    <ChevronDown size={12} color="#9CA3AF" />
                  </Pressable>
                  {showDateModal && (
                    <View style={styles.dropdownInline}>
                      <ScrollView style={{ maxHeight: 400 }}>
                        {['All', 'Today', 'Tomorrow'].map(d => (
                          <Pressable 
                            key={d} 
                            style={styles.dropdownOption} 
                            onPress={() => { setDateKey(d); setShowDateModal(false); }}
                          >
                            <Text style={styles.dropdownOptionText}>{d}</Text>
                          </Pressable>
                        ))}
                        <View style={styles.calendarWrapper}>
                          <RNCalendar
                            current={dateKey && dateKey !== 'All' && dateKey !== 'Today' && dateKey !== 'Tomorrow' ? dateKey : new Date().toISOString().split('T')[0]}
                            minDate={new Date().toISOString().split('T')[0]}
                            onDayPress={(day: any) => {
                              setDateKey(day.dateString);
                              setShowDateModal(false);
                            }}
                            hideArrows={false}
                            renderArrow={(direction) => (
                              <ChevronRight 
                                size={14} 
                                color="#01b854" 
                                style={{ transform: [{ rotate: direction === 'left' ? '180deg' : '0deg' }] }} 
                              />
                            )}
                            markedDates={{
                              [dateKey && dateKey !== 'All' && dateKey !== 'Today' && dateKey !== 'Tomorrow' ? dateKey : '']: {
                                selected: true,
                                disableTouchEvent: true,
                                selectedColor: '#01b854',
                                selectedTextColor: '#ffffff'
                              }
                            }}
                            theme={{
                              todayTextColor: '#01b854',
                              arrowColor: '#01b854',
                              selectedDayBackgroundColor: '#01b854',
                              selectedDayTextColor: '#ffffff',
                              textDayFontFamily: 'Inter',
                              textMonthFontFamily: 'Inter',
                              textDayHeaderFontFamily: 'Inter',
                              textDayFontWeight: '500',
                              textMonthFontWeight: '600',
                              textDayHeaderFontWeight: '600',
                              textDayFontSize: 11,
                              textMonthFontSize: 11,
                              textDayHeaderFontSize: 10,
                              calendarBackground: '#ffffff',
                              monthTextColor: '#111827',
                              dayTextColor: '#4B5563',
                              textSectionTitleColor: '#9CA3AF',
                              // @ts-ignore
                              'stylesheet.calendar.header': {
                                header: {
                                  flexDirection: 'row',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  paddingLeft: 0,
                                  paddingRight: 0,
                                  marginTop: 6,
                                  gap: 12,
                                },
                                monthText: {
                                  fontSize: 11,
                                  fontWeight: '600',
                                  fontFamily: 'Inter',
                                  color: '#111827',
                                }
                              }
                            }}
                          />
                        </View>
                      </ScrollView>
                    </View>
                  )}
                </View>

              <View style={styles.sidebarSection}>
                <Text style={styles.sidebarSectionTitle}>Location</Text>
                <Pressable style={styles.filterButton} onPress={() => setShowLocationModal(!showLocationModal)}>
                  <MapPin size={14} color="#01b854" />
                  <Text style={styles.filterButtonText} numberOfLines={1}>
                    {locationKey ? locations.find(l => `${l.city}__${l.state}` === locationKey)?.label || locationKey.split('__')[0] : 'All Locations'}
                  </Text>
                  <ChevronDown size={12} color="#9CA3AF" />
                </Pressable>
                {showLocationModal && (
                  <View style={styles.dropdownInline}>
                    <ScrollView style={{ maxHeight: 200 }}>
                      <Pressable style={styles.dropdownOption} onPress={() => { setLocationKey(''); setShowLocationModal(false); }}>
                        <Text style={styles.dropdownOptionText}>All Locations</Text>
                      </Pressable>
                      {locations.map(l => (
                        <Pressable key={`${l.city}__${l.state}`} style={styles.dropdownOption} onPress={() => { setLocationKey(`${l.city}__${l.state}`); setShowLocationModal(false); }}>
                          <Text style={styles.dropdownOptionText}>{l.label || l.city}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>



              <View style={styles.sidebarSection}>
                <Text style={styles.sidebarSectionTitle}>Price</Text>
                <Pressable style={styles.filterButton} onPress={() => setShowPriceModal(!showPriceModal)}>
                  <IndianRupee size={14} color="#01b854" />
                  <Text style={styles.filterButtonText} numberOfLines={1}>
                    {priceRange.label}
                  </Text>
                  <ChevronDown size={12} color="#9CA3AF" />
                </Pressable>
                {showPriceModal && (
                  <View style={styles.dropdownInline}>
                    <ScrollView style={{ maxHeight: 200 }}>
                      {PRICE_RANGES.map(p => (
                        <Pressable 
                          key={p.label} 
                          style={styles.dropdownOption} 
                          onPress={() => { setPriceRange(p); setShowPriceModal(false); }}
                        >
                          <Text style={styles.dropdownOptionText}>{p.label}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.sidebarSection}>
                <Text style={styles.sidebarSectionTitle}>Time</Text>
                <Pressable style={styles.filterButton} onPress={() => setShowTimeModal(!showTimeModal)}>
                  <Clock size={14} color="#01b854" />
                  <Text style={styles.filterButtonText} numberOfLines={1}>
                    {timeKey || 'All Times'}
                  </Text>
                  <ChevronDown size={12} color="#9CA3AF" />
                </Pressable>
                {showTimeModal && (
                  <View style={styles.dropdownInline}>
                    <ScrollView style={{ maxHeight: 200 }}>
                      <Pressable style={styles.dropdownOption} onPress={() => { setTimeKey(''); setShowTimeModal(false); }}>
                        <Text style={styles.dropdownOptionText}>All Times</Text>
                      </Pressable>
                      {availableTimes.length > 0 ? availableTimes.map(t => (
                        <Pressable key={t} style={styles.dropdownOption} onPress={() => { setTimeKey(t); setShowTimeModal(false); }}>
                          <Text style={styles.dropdownOptionText}>{t}</Text>
                        </Pressable>
                      )) : (
                        <View style={{ padding: 10 }}>
                          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>No available slots for selected filters</Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Results Area */}
        <View style={styles.resultsArea}>
          {isCompact && (
            <View style={styles.mobileHeader}>
              <View style={styles.sidebarSearchBox}>
                <Search size={16} color="#9CA3AF" />
                <TextInput
                  style={styles.sidebarSearchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search city, venue or team..."
                  placeholderTextColor="#9CA3AF"
                  onSubmitEditing={() => performSearch(query, locationKey, typeKey)}
                  returnKeyType="search"
                />
              </View>

              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.mobileFiltersSlider}
                style={styles.filtersScrollView}
              >
                <Pressable style={styles.mobileFilterPill} onPress={() => setShowLocationModal(true)}>
                  <MapPin size={12} color={locationKey ? '#01b854' : '#6B7280'} />
                  <Text style={[styles.mobileFilterPillText, locationKey && styles.mobileFilterPillTextActive]}>
                    {locationKey ? locationKey.split('__')[0] : 'Location'}
                  </Text>
                </Pressable>

                <Pressable style={styles.mobileFilterPill} onPress={() => setShowDateModal(true)}>
                  <Calendar size={12} color={dateKey !== 'All' ? '#01b854' : '#6B7280'} />
                  <Text style={[styles.mobileFilterPillText, dateKey !== 'All' && styles.mobileFilterPillTextActive]}>
                    {dateKey === 'All' || dateKey === 'Today' || dateKey === 'Tomorrow' ? dateKey : new Date(dateKey).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                </Pressable>

                <Pressable style={styles.mobileFilterPill} onPress={() => setShowTypeModal(true)}>
                  <Building2 size={12} color={typeKey ? '#01b854' : '#6B7280'} />
                  <Text style={[styles.mobileFilterPillText, typeKey && styles.mobileFilterPillTextActive]}>
                    {typeKey || 'Venue'}
                  </Text>
                </Pressable>

                <Pressable style={styles.mobileFilterPill} onPress={() => setShowPriceModal(true)}>
                  <IndianRupee size={12} color={priceRange.label !== 'All Prices' ? '#01b854' : '#6B7280'} />
                  <Text style={[styles.mobileFilterPillText, priceRange.label !== 'All Prices' && styles.mobileFilterPillTextActive]}>
                    {priceRange.label === 'All Prices' ? 'Price' : priceRange.label}
                  </Text>
                </Pressable>

                <Pressable style={styles.mobileFilterPill} onPress={() => setShowTimeModal(true)}>
                  <Clock size={12} color={timeKey ? '#01b854' : '#6B7280'} />
                  <Text style={[styles.mobileFilterPillText, timeKey && styles.mobileFilterPillTextActive]}>
                    {timeKey || 'Time'}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          )}

          {/* Inline Modals for Mobile */}
          {isCompact && (showLocationModal || showTypeModal || showTimeModal || showDateModal) && (
            <View style={styles.mobileFilterDropdownOverlay}>
              <View style={styles.mobileFilterDropdownContent}>
                <View style={styles.mobileDropdownHeader}>
                  <Text style={styles.mobileDropdownTitle}>
                    {showLocationModal ? 'Select Location' : showTypeModal ? 'Select Venue' : showDateModal ? 'Select Date' : showPriceModal ? 'Select Price' : 'Select Time'}
                  </Text>
                  <Pressable onPress={() => { setShowLocationModal(false); setShowTypeModal(false); setShowTimeModal(false); setShowDateModal(false); setShowPriceModal(false); }}>
                    <Text style={styles.closeText}>Done</Text>
                  </Pressable>
                </View>
                <ScrollView style={{ maxHeight: 300 }}>
                  {showLocationModal ? (
                    <>
                      <Pressable style={styles.dropdownOption} onPress={() => { setLocationKey(''); setShowLocationModal(false); }}>
                        <Text style={styles.dropdownOptionText}>All Locations</Text>
                      </Pressable>
                      {locations.map(l => (
                        <Pressable key={`${l.city}__${l.state}`} style={styles.dropdownOption} onPress={() => { setLocationKey(`${l.city}__${l.state}`); setShowLocationModal(false); }}>
                          <Text style={styles.dropdownOptionText}>{l.label || l.city}</Text>
                        </Pressable>
                      ))}
                    </>
                  ) : showTypeModal ? (
                    <>
                      <Pressable style={styles.dropdownOption} onPress={() => { setTypeKey(''); setShowTypeModal(false); }}>
                        <Text style={styles.dropdownOptionText}>All</Text>
                      </Pressable>
                      {types.map(t => (
                        <Pressable key={t.id} style={styles.dropdownOption} onPress={() => { setTypeKey(t.name); setShowTypeModal(false); }}>
                          <Text style={styles.dropdownOptionText}>{t.label || t.name}</Text>
                        </Pressable>
                      ))}
                    </>
                  ) : showDateModal ? (
                    <>
                      {['All', 'Today', 'Tomorrow'].map(d => (
                        <Pressable 
                          key={d} 
                          style={styles.dropdownOption} 
                          onPress={() => { setDateKey(d); setShowDateModal(false); }}
                        >
                          <Text style={styles.dropdownOptionText}>{d} {d === 'All' ? 'Dates' : ''}</Text>
                        </Pressable>
                      ))}
                      <View style={styles.calendarWrapper}>
                        <RNCalendar
                          current={dateKey && dateKey !== 'All' && dateKey !== 'Today' && dateKey !== 'Tomorrow' ? dateKey : new Date().toISOString().split('T')[0]}
                          minDate={new Date().toISOString().split('T')[0]}
                          onDayPress={(day: any) => {
                            setDateKey(day.dateString);
                            setShowDateModal(false);
                          }}
                          markedDates={{
                            [dateKey && dateKey !== 'All' && dateKey !== 'Today' && dateKey !== 'Tomorrow' ? dateKey : '']: {
                              selected: true,
                              disableTouchEvent: true,
                              selectedColor: '#01b854',
                              selectedTextColor: '#ffffff'
                            }
                          }}
                          theme={{
                            todayTextColor: '#01b854',
                            arrowColor: '#01b854',
                            selectedDayBackgroundColor: '#01b854',
                            selectedDayTextColor: '#ffffff',
                            textDayFontFamily: 'Inter',
                            textMonthFontFamily: 'Inter',
                            textDayHeaderFontFamily: 'Inter',
                            textDayFontWeight: '600',
                            textMonthFontWeight: '800',
                            textDayHeaderFontWeight: '800',
                          }}
                        />
                      </View>
                    </>
                  ) : showPriceModal ? (
                    <>
                      {PRICE_RANGES.map(p => (
                        <Pressable 
                          key={p.label} 
                          style={styles.dropdownOption} 
                          onPress={() => { setPriceRange(p); setShowPriceModal(false); }}
                        >
                          <Text style={styles.dropdownOptionText}>{p.label}</Text>
                        </Pressable>
                      ))}
                    </>
                  ) : (
                    <>
                      <Pressable style={styles.dropdownOption} onPress={() => { setTimeKey(''); setShowTimeModal(false); }}>
                        <Text style={styles.dropdownOptionText}>All Times</Text>
                      </Pressable>
                      {availableTimes.length > 0 ? availableTimes.map(t => (
                        <Pressable key={t} style={styles.dropdownOption} onPress={() => { setTimeKey(t); setShowTimeModal(false); }}>
                          <Text style={styles.dropdownOptionText}>{t}</Text>
                        </Pressable>
                      )) : (
                        <View style={{ padding: 10 }}>
                          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>No available slots</Text>
                        </View>
                      )}
                    </>
                  )}
                </ScrollView>
              </View>
            </View>
          )}

          {loading ? (
            <ActivityIndicator color="#01b854" style={{ marginTop: 40 }} />
          ) : combinedResults.length === 0 ? (
            <View style={styles.empty}>
              <Trophy size={48} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtitle}>Adjust your filters or try a different search term.</Text>
            </View>
          ) : (
            <FlatList
              data={combinedResults}
              key={isWeb && width > 1200 ? 'cols-2' : 'cols-1'}
              keyExtractor={item => item.id}
              renderItem={({ item }) => item._type === 'ground' ? renderGround({ item }) : renderMatch({ item })}
              contentContainerStyle={styles.list}
              numColumns={isWeb && width > 1200 ? 2 : 1}
              columnWrapperStyle={isWeb && width > 1200 ? { gap: 16 } : undefined}
            />
          )}
        </View>
      </View>
    </View>
  );

  if (isWeb) {
    return <WebLayout hideHeader={isCompact}>{content}</WebLayout>;
  }

  return (
    <View style={styles.container}>
      <MobileAppNavbar title="Search" />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pillActive: {
    backgroundColor: 'rgba(1,184,84,0.1)',
    borderColor: '#01b854',
  },
  pillText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#01b854',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 64,
        height: 'calc(100vh - 64px)' as any,
      }
    }) as any,
  },
  sidebarScroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  sidebarSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  sidebarSearchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '400',
    ...Platform.select({
      web: { outlineStyle: 'none' }
    }) as any,
  },
  sidebarSection: {
    gap: 8,
  },
  sidebarSectionTitle: {
    fontSize: 10,
    fontWeight: '500',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  sidebarTab: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  sidebarTabActive: {
    backgroundColor: 'rgba(216, 247, 157, 0.08)',
  },
  sidebarTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  sidebarTabTextActive: {
    color: '#01b854',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
    fontFamily: 'Inter',
  },
  dropdownInline: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
    padding: 4,
  },
  dropdownOption: {
    padding: 10,
    borderRadius: 8,
  },
  dropdownOptionText: {
    fontSize: 12,
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  mobileFiltersSlider: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
  },
  mobileFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  mobileFilterPillText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  mobileFilterPillTextActive: {
    color: '#01b854',
  },
  mobileFilterDropdownOverlay: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    justifyContent: 'flex-end',
  },
  mobileFilterDropdownContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  mobileDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mobileDropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  closeText: {
    fontSize: 14,
    color: '#01b854',
    fontWeight: '700',
  },
  calendarWrapper: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  resultsArea: {
    flex: 1,
  },
  mobileHeader: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  filtersScrollView: {
    marginTop: 4,
    marginHorizontal: -16, // Bleed out to edges for better scroll feel
  },
  mobileFiltersSlider: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 8,
  },
  mobileTabs: {
    marginTop: 4,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: '#01b854',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  list: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 80,
    gap: 16,
  },
  premiumCard: {
    flex: 1,
    height: 380,
    backgroundColor: '#111827',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  premiumCardImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  premiumOverlay: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  premiumMatchHeader: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 6,
    fontFamily: 'Inter',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  premiumCaptainText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  premiumInfoCard: {
    backgroundColor: 'rgba(25, 25, 25, 0.85)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    marginBottom: 24,
  },
  premiumLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
    width: '100%',
  },
  premiumLocationText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  premiumPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
    width: '100%',
  },
  premiumPriceText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#01b854',
    textAlign: 'center',
  },
  premiumPriceUnit: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  premiumAmenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  premiumAmenityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  premiumAmenityText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  premiumRatingContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  premiumStars: {
    flexDirection: 'row',
    gap: 2,
  },
  premiumMatchMeta: {
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumMatchMetaText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
  },
  premiumDateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(1, 184, 84, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(1, 184, 84, 0.3)',
  },
  premiumDateTimeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  premiumBottomRow: {
    position: 'absolute' as any,
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  premiumReviewText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.9,
  },
  premiumJoinBtnAction: {
    width: 140,
    height: 40,
    borderRadius: 99,
  },
  premiumJoinBtnText: {
    fontSize: 13,
    fontWeight: '900',
  },
  premiumLocationLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    opacity: 0.9,
  },
  premiumLocationLinkText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardContent: {
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  ctaButton: {
    paddingHorizontal: 16,
    height: 36,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
    fontFamily: 'Inter',
  },
});
