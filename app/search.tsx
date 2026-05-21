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
  TouchableOpacity,
} from 'react-native';
import { Calendar as RNCalendar, LocaleConfig } from 'react-native-calendars';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '../components/MobileAppNavbar';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Search, 
  MapPin, 
  Building2, 
  Swords, 
  Trophy, 
  Star, 
  ArrowRight, 
  ChevronDown, 
  ChevronRight, 
  Calendar, 
  Clock, 
  IndianRupee, 
  Shield, 
  Lock, 
  Zap, 
  Users, 
  Heart, 
  SlidersHorizontal, 
  Grid, 
  List,
  ArrowLeft
} from 'lucide-react-native';
import { makeGroundPath } from '@/utils/groundSlug';
import GroundCard from '@/components/grounds/GroundCard';
import { useLocation } from '@/contexts/LocationContext';

LocaleConfig.locales['en'] = {
  monthNames: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  monthNamesShort: ['Jan.','Feb.','Mar.','Apr.','May','Jun.','Jul.','Aug.','Sep.','Oct.','Nov.','Dec.'],
  dayNames: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  dayNamesShort: ['S','M','T','W','T','F','S'],
  today: 'Today'
};
LocaleConfig.defaultLocale = 'en';

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
  const { latitude: userLat, longitude: userLng } = useLocation();
  
  const [query, setQuery] = useState((params.q as string) || '');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [results, setResults] = useState<{ grounds: any[], matches: any[] }>({ grounds: [], matches: [] });
  const [loading, setLoading] = useState(false);

  const [locationKey, setLocationKey] = useState<string>((params.location as string) || '');
  const [typeKey, setTypeKey] = useState<string>((params.type as string) || '');
  const [dateKey, setDateKey] = useState<string>((params.date as string) || 'All');
  const [timeKey, setTimeKey] = useState<string>((params.time as string) || '');
  const [locations, setLocations] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceRange, setPriceRange] = useState(PRICE_RANGES[0]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('Popularity');
  const [showSortModal, setShowSortModal] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

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

  useEffect(() => {
    if (params.q !== undefined) setQuery((params.q as string) || '');
    if (params.location !== undefined) setLocationKey((params.location as string) || '');
    if (params.type !== undefined) setTypeKey((params.type as string) || '');
    if (params.date !== undefined) setDateKey((params.date as string) || 'All');
    if (params.time !== undefined) setTimeKey((params.time as string) || '');
  }, [params.q, params.location, params.type, params.date, params.time]);

  useEffect(() => {
    performSearch(query, locationKey, typeKey, dateKey, timeKey, priceRange);
  }, [query, locationKey, typeKey, dateKey, timeKey, priceRange]);

  useEffect(() => {
    if (isCompact && viewMode === 'list') {
      setViewMode('grid');
    }
  }, [isCompact, viewMode]);

  useEffect(() => {
    const fetchAvailableTimes = async () => {
      try {
        let q = supabase
          .from('time_slots')
          .select('start_time, grounds!inner(city, state, pitch_type)')
          .eq('is_available', true);

        if (locationKey) {
          const [city, state] = locationKey.split('__');
          q = q.eq('grounds.city', city).eq('grounds.state', state);
        }

        if (typeKey) {
          q = q.eq('grounds.pitch_type', typeKey);
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
          q = q.eq('day_of_week', dow);
        }

        const { data, error } = await q;
        if (error) throw error;

        if (data) {
          const uniqueTimes = Array.from(new Set(data.map(item => item.start_time.slice(0, 5)))).sort();
          setAvailableTimes(uniqueTimes);
        }
      } catch (e) {
        console.error('Error fetching available times:', e);
      }
    };

    fetchAvailableTimes();
  }, [locationKey, typeKey, dateKey]);

  const performSearch = async (s: string, locKey?: string, typKey?: string, date?: string, time?: string, price?: { label: string, min: number, max: number }) => {
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

      // 2. Search Matches
      const todayISO = new Date().toISOString().split('T')[0];
      const { data: ms, error: mError } = await supabase
        .rpc('get_open_matchmaking_bookings', { p_today: todayISO })
        .select(`
          *,
          ground:grounds!inner(*, ground_images(*)),
          user:profiles(*)
        `);

      if (mError) console.error('Match search error:', mError);

      let filteredMs = (ms || []).filter((m: any) => 
        !String(m.ground?.pitch_type ?? '').toLowerCase().includes('nets')
      );

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
        .filter(b => 
          b.ground && 
          b.status !== 'cancelled' && 
          b.status !== 'rejected' && 
          (b.team_type === 'one' || (b.notes && b.notes.includes('1 Team')))
        );

      const enhancedMatches = await Promise.all((ms || []).map(async (m: any) => {
        try {
          const parts = m.booking_date.split('-');
          const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          const dow = dateObj.getDay();

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

          const enhancedMatch = { ...m, total_amount: Math.round((totalMatchPrice / 2) * 100) / 100 };
          
          if (price && price.label !== 'All Prices') {
            if (enhancedMatch.total_amount < price.min || enhancedMatch.total_amount > price.max) {
              return null;
            }
          }

          return enhancedMatch;
        } catch (e) {
          return m;
        }
      })).then(results => results.filter(m => m !== null));

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

  const toggleFilterModal = (target: 'location' | 'type' | 'date' | 'time' | 'price' | null) => {
    setShowLocationModal(target === 'location' ? !showLocationModal : false);
    setShowTypeModal(target === 'type' ? !showTypeModal : false);
    setShowDateModal(target === 'date' ? !showDateModal : false);
    setShowTimeModal(target === 'time' ? !showTimeModal : false);
    setShowPriceModal(target === 'price' ? !showPriceModal : false);
  };

  const combinedResults = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMins = now.getHours() * 60 + now.getMinutes();

    let filteredMatches = results.matches.filter((m: any) => {
      if (String(m.ground?.pitch_type ?? '').toLowerCase().includes('nets')) return false;
      if (m.booking_date < todayStr) return false;
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

  const sortedCombinedResults = useMemo(() => {
    let list = [...combinedResults];
    if (sortBy === 'Price: Low to High') {
      list.sort((a, b) => {
        const priceA = a._type === 'ground' 
          ? (a.min_price ?? a.base_price_per_hour ?? 0) 
          : (a.team_type === 'both' ? (a.total_amount ?? 0) / 2 : (a.total_amount ?? 0));
        const priceB = b._type === 'ground' 
          ? (b.min_price ?? b.base_price_per_hour ?? 0) 
          : (b.team_type === 'both' ? (b.total_amount ?? 0) / 2 : (b.total_amount ?? 0));
        return priceA - priceB;
      });
    } else if (sortBy === 'Price: High to Low') {
      list.sort((a, b) => {
        const priceA = a._type === 'ground' 
          ? (a.min_price ?? a.base_price_per_hour ?? 0) 
          : (a.team_type === 'both' ? (a.total_amount ?? 0) / 2 : (a.total_amount ?? 0));
        const priceB = b._type === 'ground' 
          ? (b.min_price ?? b.base_price_per_hour ?? 0) 
          : (b.team_type === 'both' ? (b.total_amount ?? 0) / 2 : (b.total_amount ?? 0));
        return priceB - priceA;
      });
    } else if (sortBy === 'Rating') {
      list.sort((a, b) => (b.rating ?? 5.0) - (a.rating ?? 5.0));
    }
    return list;
  }, [combinedResults, sortBy]);

  const renderDropdownOptions = (type: 'location' | 'type' | 'date' | 'time' | 'price') => {
    const isDate = type === 'date';
    return (
      <View style={[styles.floatingDropdown, isDate && styles.dateDropdown, isCompact && styles.floatingDropdownMobile]}>
        {isDate ? (
          <View style={styles.dateDropdownContainer}>
            <View style={styles.dateQuickOptions}>
              {['All', 'Today', 'Tomorrow'].map(d => (
                <Pressable 
                  key={d} 
                  style={[
                    styles.dropdownOption, 
                    styles.dateQuickBtn, 
                    isCompact && styles.dateQuickBtnMobile,
                    dateKey === d && styles.dateQuickBtnActive
                  ]} 
                  onPress={() => { setDateKey(d); toggleFilterModal(null); }}
                >
                  <Text style={[
                    styles.dropdownOptionText, 
                    styles.dateQuickBtnText, 
                    isCompact && styles.dateQuickBtnTextMobile,
                    dateKey === d && styles.dateQuickBtnTextActive
                  ]}>{d}</Text>
                </Pressable>
              ))}
            </View>
            <View style={[styles.calendarWrapper, isCompact && { borderTopColor: 'rgba(0, 234, 107, 0.2)' }]}>
              <RNCalendar
                current={dateKey && dateKey !== 'All' && dateKey !== 'Today' && dateKey !== 'Tomorrow' ? dateKey : new Date().toISOString().split('T')[0]}
                minDate={new Date().toISOString().split('T')[0]}
                onDayPress={(day: any) => {
                  setDateKey(day.dateString);
                  toggleFilterModal(null);
                }}
                theme={isCompact ? {
                  calendarBackground: '#06392e',
                  textSectionTitleColor: '#00ea6b',
                  selectedDayBackgroundColor: '#00ea6b',
                  selectedDayTextColor: '#06392e',
                  todayTextColor: '#00ea6b',
                  dayTextColor: '#ffffff',
                  textDisabledColor: 'rgba(255, 255, 255, 0.25)',
                  arrowColor: '#00ea6b',
                  monthTextColor: '#ffffff',
                  textDayFontWeight: '600',
                  textMonthFontWeight: '800',
                  textDayHeaderFontWeight: '600',
                } : {
                  todayTextColor: '#01e669',
                  arrowColor: '#01e669',
                  selectedDayBackgroundColor: '#01e669',
                  selectedDayTextColor: '#ffffff',
                }}
              />
            </View>
          </View>
        ) : (
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled={true}>
            {type === 'location' && (
              <>
                <Pressable style={styles.dropdownOption} onPress={() => { setLocationKey(''); toggleFilterModal(null); }}>
                  <Text style={[styles.dropdownOptionText, isCompact && styles.dropdownOptionTextMobile]}>All Locations</Text>
                </Pressable>
                {locations.map(l => (
                  <Pressable key={`${l.city}__${l.state}`} style={styles.dropdownOption} onPress={() => { setLocationKey(`${l.city}__${l.state}`); toggleFilterModal(null); }}>
                    <Text style={[styles.dropdownOptionText, isCompact && styles.dropdownOptionTextMobile]}>{l.label || l.city}</Text>
                  </Pressable>
                ))}
              </>
            )}
            {type === 'type' && (
              <>
                <Pressable style={styles.dropdownOption} onPress={() => { setActiveTab('all'); setTypeKey(''); toggleFilterModal(null); }}>
                  <Text style={[styles.dropdownOptionText, isCompact && styles.dropdownOptionTextMobile]}>All Types</Text>
                </Pressable>
                <Pressable style={styles.dropdownOption} onPress={() => { setActiveTab('matches'); setTypeKey(''); toggleFilterModal(null); }}>
                  <Text style={[styles.dropdownOptionText, isCompact && styles.dropdownOptionTextMobile]}>Find Opposition</Text>
                </Pressable>
                {types.map(t => (
                  <Pressable key={t.id} style={styles.dropdownOption} onPress={() => { setActiveTab('grounds'); setTypeKey(t.name); toggleFilterModal(null); }}>
                    <Text style={[styles.dropdownOptionText, isCompact && styles.dropdownOptionTextMobile]}>{t.label || t.name}</Text>
                  </Pressable>
                ))}
              </>
            )}
            {type === 'price' && (
              <>
                {PRICE_RANGES.map(p => (
                  <Pressable key={p.label} style={styles.dropdownOption} onPress={() => { setPriceRange(p); toggleFilterModal(null); }}>
                    <Text style={[styles.dropdownOptionText, isCompact && styles.dropdownOptionTextMobile]}>{p.label}</Text>
                  </Pressable>
                ))}
              </>
            )}
            {type === 'time' && (
              <>
                <Pressable style={styles.dropdownOption} onPress={() => { setTimeKey(''); toggleFilterModal(null); }}>
                  <Text style={[styles.dropdownOptionText, isCompact && styles.dropdownOptionTextMobile]}>All Times</Text>
                </Pressable>
                {availableTimes.map(t => (
                  <Pressable key={t} style={styles.dropdownOption} onPress={() => { setTimeKey(t); toggleFilterModal(null); }}>
                    <Text style={[styles.dropdownOptionText, isCompact && styles.dropdownOptionTextMobile]}>{t}</Text>
                  </Pressable>
                ))}
              </>
            )}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderMockupGround = (item: any) => {
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
    const unitLabel = isBox ? '/hr' : '/match';

    const path = makeGroundPath(item);
    const params: any = {};
    if (dateKey !== 'All') params.date = dateKey;
    if (timeKey) params.time = timeKey;

    const navigateToDetails = () => {
      router.push({ pathname: path as any, params });
    };

    return (
      <GroundCard
        ground={item}
        glass={true}
        displayPricePerUnit={displayPrice}
        unitLabelOverride={unitLabel}
        onPress={navigateToDetails}
      />
    );
  };

  const renderMockupMatch = (item: any) => {
    const imgUrl = item.ground?.ground_images?.[0]?.image_url || 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';
    const teamName = item.user?.team_name || 'Anonymous Team';
    const captainName = item.user?.full_name || 'Anonymous';
    const dateStr = item.booking_date;
    const timeStr = item.start_time?.slice(0, 5);

    const formattedDateTime = (() => {
      let datePart = dateStr;
      if (dateStr && dateStr.includes('-')) {
        const p = dateStr.split('-');
        if (p.length === 3) {
          datePart = `${p[2]}/${p[1]}/${p[0].slice(2)}`;
        }
      }
      return `${datePart} / ${timeStr}`;
    })();

    const distance = (() => {
      if (userLat != null && userLng != null && item.ground?.latitude != null && item.ground?.longitude != null) {
        const lat1 = userLat;
        const lon1 = userLng;
        const lat2 = Number(item.ground.latitude);
        const lon2 = Number(item.ground.longitude);

        if (!isNaN(lat2) && !isNaN(lon2)) {
          const R = 6371; // Radius of the earth in km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const d = R * c; // Distance in km
          return d.toFixed(1);
        }
      }
      const seed = item.ground?.id ? item.ground.id.charCodeAt(0) + item.ground.id.charCodeAt(item.ground.id.length - 1) : 47;
      return (1.2 + (seed % 89) * 0.1).toFixed(1);
    })();

    const displayPrice = (() => {
      const amt = Number(item.total_amount) || 0;
      if (item.team_type === 'both') {
        return Math.round((amt / 2) * 100) / 100;
      }
      return amt;
    })();

    return (
      <Pressable 
        style={[styles.premiumMatchCard, viewMode === 'list' && styles.customGroundCardList]} 
        onPress={() => handleJoinMatch(item)}
        key={item.id}
      >
        <View style={styles.premiumImageWrapper}>
          <Image source={{ uri: imgUrl }} style={styles.premiumImage} />
          <View style={styles.bookableBadge}>
            <Text style={styles.bookableBadgeText}>OPPOSITION</Text>
          </View>
        </View>

        <View style={styles.premiumContent}>
          <View style={styles.premiumTitleRow}>
            <Text style={styles.premiumMatchName} numberOfLines={1}>{teamName}</Text>
            <Text style={styles.premiumPriceText}>
              ₹{displayPrice || '---'}
              <Text style={styles.premiumPriceUnitText}>/team</Text>
            </Text>
          </View>

          <View style={styles.premiumLocationRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <Text style={styles.premiumLocation} numberOfLines={1}>
                {item.ground?.name} ({item.ground?.city})
              </Text>
            </View>
            <Text style={styles.premiumDistance}>
              ~ {distance} km
            </Text>
          </View>

          <View style={[styles.premiumSportsRow, { gap: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 80 }}>
              <Text style={styles.premiumVenueType} numberOfLines={1}>
                {captainName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', shrink: 0 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#01e669', fontFamily: 'Inter' }}>
                {formattedDateTime}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const isAnyDropdownOpen = showTypeModal || showDateModal || showLocationModal || showPriceModal || showTimeModal;

  const filterBarComponent = (
      <View style={[styles.filterBarContainer, isAnyDropdownOpen && { zIndex: 1000 }, !isCompact && { marginTop: 0, position: 'relative', top: 0, paddingHorizontal: 0, maxWidth: 900 }]}>
        <View style={[styles.filterBar, isCompact && styles.filterBarMobile, !isCompact && { borderWidth: 0, shadowOpacity: 0, elevation: 0, paddingVertical: 0 }]}>
          <View style={[isCompact ? { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 234, 107, 0.3)', marginBottom: 4 } : { flexDirection: 'row', alignItems: 'center', flex: 1.2 }]}>
            <View style={[styles.filterItemSearch, isCompact && { flex: 1, minHeight: 44 }]}>
              <Search size={16} color="#00ea6b" style={{ marginRight: 8 }} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Keywords..."
                placeholderTextColor="rgba(0, 234, 107, 0.5)"
                style={styles.filterSearchInput}
              />
            </View>
            
            {isCompact && (
              <Pressable
                style={({ pressed }) => [
                  styles.mobileToggleFiltersBtn,
                  isFiltersExpanded && styles.mobileToggleFiltersBtnActive,
                  pressed && { opacity: 0.8 }
                ]}
                onPress={() => setIsFiltersExpanded(!isFiltersExpanded)}
              >
                <SlidersHorizontal size={14} color={isFiltersExpanded ? '#FFFFFF' : '#01e669'} />
                <Text style={[styles.mobileToggleFiltersText, isFiltersExpanded && { color: '#FFFFFF' }]}>
                  Filters
                </Text>
              </Pressable>
            )}
          </View>
          
          {(isFiltersExpanded || !isCompact) && (
            <>
              {!isCompact && <View style={styles.filterDivider} />}

              <Pressable style={[styles.filterItem, isCompact && styles.filterItemMobile, showTypeModal && { zIndex: 999 }]} onPress={() => toggleFilterModal('type')}>
                <View style={styles.filterTextContent}>
                  <Text style={styles.filterItemLabel}>VENUE</Text>
                  <Text style={styles.filterItemValue} numberOfLines={1}>
                    {typeKey || 'All Types'}
                  </Text>
                </View>
                <ChevronDown size={14} color="#00ea6b" />
                {showTypeModal && renderDropdownOptions('type')}
              </Pressable>

              {!isCompact && <View style={styles.filterDivider} />}

              <Pressable style={[styles.filterItem, { flex: 1.4 }, isCompact && styles.filterItemMobile, showDateModal && { zIndex: 999 }]} onPress={() => toggleFilterModal('date')}>
                <View style={styles.filterTextContent}>
                  <Text style={styles.filterItemLabel}>DATE</Text>
                  <Text style={styles.filterItemValue} numberOfLines={1}>
                    {dateKey === 'All' || dateKey === 'Today' || dateKey === 'Tomorrow' ? dateKey : new Date(dateKey).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <ChevronDown size={14} color="#00ea6b" />
                {showDateModal && renderDropdownOptions('date')}
              </Pressable>

              {!isCompact && <View style={styles.filterDivider} />}

              <Pressable style={[styles.filterItem, { flex: 1.6 }, isCompact && styles.filterItemMobile, showLocationModal && { zIndex: 999 }]} onPress={() => toggleFilterModal('location')}>
                <View style={styles.filterTextContent}>
                  <Text style={styles.filterItemLabel}>LOCATION</Text>
                  <Text style={styles.filterItemValue} numberOfLines={1}>
                    {locationKey ? locations.find(l => `${l.city}__${l.state}` === locationKey)?.label || locationKey.split('__')[0] : 'All Locations'}
                  </Text>
                </View>
                <ChevronDown size={14} color="#00ea6b" />
                {showLocationModal && renderDropdownOptions('location')}
              </Pressable>

              {!isCompact && <View style={styles.filterDivider} />}

              <Pressable style={[styles.filterItem, isCompact && styles.filterItemMobile, showPriceModal && { zIndex: 999 }]} onPress={() => toggleFilterModal('price')}>
                <View style={styles.filterTextContent}>
                  <Text style={styles.filterItemLabel}>PRICE</Text>
                  <Text style={styles.filterItemValue} numberOfLines={1}>
                    {priceRange.label}
                  </Text>
                </View>
                <ChevronDown size={14} color="#00ea6b" />
                {showPriceModal && renderDropdownOptions('price')}
              </Pressable>

              {!isCompact && <View style={styles.filterDivider} />}

              <Pressable style={[styles.filterItem, isCompact && styles.filterItemMobile, showTimeModal && { zIndex: 999 }]} onPress={() => toggleFilterModal('time')}>
                <View style={styles.filterTextContent}>
                  <Text style={styles.filterItemLabel}>TIME</Text>
                  <Text style={styles.filterItemValue} numberOfLines={1}>
                    {timeKey || 'All Times'}
                  </Text>
                </View>
                <ChevronDown size={14} color="#00ea6b" />
                {showTimeModal && renderDropdownOptions('time')}
              </Pressable>

              <Pressable style={[styles.applyFiltersBtn, isCompact && styles.applyFiltersBtnMobile, isCompact && styles.applyFiltersBtnMobileTheme]} onPress={() => performSearch(query, locationKey, typeKey, dateKey, timeKey, priceRange)}>
                <SlidersHorizontal size={14} color={isCompact ? '#06392e' : '#FFFFFF'} style={{ marginRight: 6 }} />
                <Text style={[styles.applyFiltersBtnText, isCompact && { color: '#06392e' }]}>Apply Filters</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
  );

  const content = (
    <ScrollView 
      style={styles.mainContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      
      {/* 1. STADIUM HERO SECTION — web only */}
      {!isCompact && (
        <View style={styles.heroSection}>
          <Image 
            source={require('@/assets/stadium_hero_bg.png')} 
            style={styles.heroBackground}
          />
          <LinearGradient
            colors={['#FFFFFF', 'rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.3)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.7, y: 0 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.heroContainer}>
            <View style={styles.heroLeft}>
              <Text style={styles.perfectText}>FIND THE PERFECT</Text>
              
              <View style={styles.heroTitleContainer}>
                <Text style={styles.heroTitle}>
                  Cricket <Text style={styles.heroTitleHighlight}>Ground</Text>
                </Text>
                <View style={styles.titleUnderline} />
              </View>
              
              <Text style={styles.heroSubtitle}>
                Explore and book the best cricket grounds near you in just a few clicks.
              </Text>
              
              <View style={styles.foundBadge}>
                <View style={styles.foundIconBg}>
                  <View style={styles.foundIconInner} />
                </View>
                <View style={styles.foundInfo}>
                  <Text style={styles.foundCountText}>{combinedResults.length} Grounds Found</Text>
                  <Text style={styles.foundSubText}>Across New Delhi, Gurugram & more</Text>
                </View>
              </View>
            </View>

            <View style={styles.heroRight}>
              <View style={[styles.stadiumLight, { top: 20, left: 30 }]} />
              <View style={[styles.stadiumLight, { top: 30, right: 40 }]} />
            </View>
          </View>
        </View>
      )}

      {/* 2. FLOATING FILTER BAR */}
      {isCompact && filterBarComponent}

      {/* 3. SORTING AND VIEW TOGGLE */}
      <View style={[styles.sortRowContainer, showSortModal && { zIndex: 999, position: 'relative' }]}>
        <View style={styles.sortRow}>
          <View style={styles.sortLeft}>
            {!isCompact && <Text style={styles.sortLabel}>Sort by:</Text>}
            <Pressable style={styles.sortBtn} onPress={() => setShowSortModal(!showSortModal)}>
              <Text style={styles.sortBtnText}>{sortBy}</Text>
              <ChevronDown size={12} color="#94A3B8" />
              {showSortModal && (
                <View style={styles.sortDropdown}>
                  {['Popularity', 'Price: Low to High', 'Price: High to Low', 'Rating'].map(s => (
                    <Pressable key={s} style={styles.dropdownOption} onPress={() => { setSortBy(s); setShowSortModal(false); }}>
                      <Text style={styles.dropdownOptionText}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Pressable>
          </View>

          {!isCompact && (
            <View style={styles.sortRight}>
              <Pressable 
                style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleBtnActive]} 
                onPress={() => setViewMode('grid')}
              >
                <Grid size={14} color={viewMode === 'grid' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
                <Text style={[styles.toggleBtnText, viewMode === 'grid' && styles.toggleBtnTextActive]}>Grid View</Text>
              </Pressable>
              <Pressable 
                style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]} 
                onPress={() => setViewMode('list')}
              >
                <List size={14} color={viewMode === 'list' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
                <Text style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}>List View</Text>
              </Pressable>
            </View>
          )}
        </View>

        {isCompact && (
          <View style={styles.mobileVenuesFoundContainer}>
            <Text style={styles.mobileVenuesFoundText}>
              {combinedResults.length} {combinedResults.length === 1 ? 'Venue' : 'Venues'} Found
            </Text>
          </View>
        )}
      </View>

      {/* 4. RESULTS DISPLAY */}
      <View style={styles.resultsContainer}>
        {loading ? (
          <ActivityIndicator color="#01b854" size="large" style={{ marginTop: 60 }} />
        ) : sortedCombinedResults.length === 0 ? (
          <View style={styles.empty}>
            <Trophy size={48} color="#E2E8F0" />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySubtitle}>Adjust your filters or try a different search term.</Text>
          </View>
        ) : (
          <View style={[
            styles.list,
            isWeb && viewMode === 'grid' && {
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 20,
            },
            isWeb && viewMode === 'list' && {
              alignItems: 'center',
            }
          ]}>
            {sortedCombinedResults.map(item => (
              <View 
                key={item.id} 
                style={[
                  isWeb && viewMode === 'grid' ? {
                    width: width > 1300 ? '23.5%' : width > 900 ? '48%' : '100%',
                  } : {
                    width: !isCompact ? 700 : width > 480 ? 440 : '100%',
                    maxWidth: '100%',
                    alignSelf: 'center',
                  }
                ]}
              >
                {item._type === 'ground' ? renderMockupGround(item) : renderMockupMatch(item)}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 5. FOOTER VALUE PROPS */}
      <View style={styles.highlightsContainer}>
        <View style={[styles.footerHighlightsBar, isCompact && { flexDirection: 'column', gap: 20 }]}>
          <View style={styles.highlightItem}>
            <View style={styles.highlightIconContainer}>
              <Shield size={18} color="#01b854" strokeWidth={2.5} />
            </View>
            <View style={styles.highlightTextContainer}>
              <Text style={styles.highlightTitle}>Verified Venues</Text>
              <Text style={styles.highlightDesc}>Quality you can trust</Text>
            </View>
          </View>

          <View style={styles.highlightDivider} />

          <View style={styles.highlightItem}>
            <View style={styles.highlightIconContainer}>
              <Lock size={18} color="#01b854" strokeWidth={2.5} />
            </View>
            <View style={styles.highlightTextContainer}>
              <Text style={styles.highlightTitle}>Secure Booking</Text>
              <Text style={styles.highlightDesc}>100% safe & secure</Text>
            </View>
          </View>

          <View style={styles.highlightDivider} />

          <View style={styles.highlightItem}>
            <View style={styles.highlightIconContainer}>
              <Zap size={18} color="#01b854" strokeWidth={2.5} />
            </View>
            <View style={styles.highlightTextContainer}>
              <Text style={styles.highlightTitle}>Instant Confirmation</Text>
              <Text style={styles.highlightDesc}>Book in just a few clicks</Text>
            </View>
          </View>

          <View style={styles.highlightDivider} />

          <View style={styles.highlightItem}>
            <View style={styles.highlightIconContainer}>
              <Users size={18} color="#01b854" strokeWidth={2.5} />
            </View>
            <View style={styles.highlightTextContainer}>
              <Text style={styles.highlightTitle}>Elite Community</Text>
              <Text style={styles.highlightDesc}>Play. Compete. Grow.</Text>
            </View>
          </View>
        </View>
      </View>

    </ScrollView>
  );

  if (isWeb) {
    return <WebLayout hideHeader={isCompact} headerContent={!isCompact ? filterBarComponent : undefined}>{content}</WebLayout>;
  }

  return (
    <View style={styles.mobileContainer}>
      <MobileAppNavbar 
        title="Search" 
        titleColor="#0F172A" 
        lightBg 
        leftAction={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <ArrowLeft size={24} color="#0F172A" strokeWidth={2.5} />
          </TouchableOpacity>
        }
      />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    flexGrow: 1,
  },
  mobileContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  heroSection: {
    width: '100%',
    height: Platform.OS === 'web' ? 380 : 260,
    position: 'relative',
    overflow: 'hidden',
  },
  heroContainer: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 24,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  heroLeft: {
    flex: 1.2,
    maxWidth: 580,
    justifyContent: 'center',
  },
  perfectText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#01b854',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heroTitleContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: Platform.OS === 'web' ? 56 : 32,
    fontWeight: '900',
    color: '#043529',
    fontFamily: 'Inter',
    letterSpacing: -1.5,
  },
  heroTitleHighlight: {
    color: '#01b854',
  },
  titleUnderline: {
    height: 4,
    backgroundColor: '#01b854',
    borderRadius: 2,
    width: 140,
    position: 'absolute',
    bottom: -6,
    right: 0,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#475569',
    fontWeight: '500',
    marginBottom: 24,
    fontFamily: 'Inter',
  },
  foundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    gap: 12,
  },
  foundIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#01b854',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foundIconInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  foundInfo: {
    justifyContent: 'center',
  },
  foundCountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#043529',
    fontFamily: 'Inter',
  },
  foundSubText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  heroRight: {
    flex: 1.1,
    height: '100%',
    position: 'relative',
    overflow: 'visible',
  },
  heroBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  stadiumLight: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
  },
  glowingTrail: {
    position: 'absolute',
    width: 320,
    height: 60,
    right: 130,
    top: 60,
    borderRadius: 30,
    transform: [{ rotate: '-12deg' }],
  },
  wicketsContainer: {
    position: 'absolute',
    bottom: 15,
    right: 240,
    width: 80,
    height: 140,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    opacity: 0.95,
  },
  wicketStump: {
    width: 8,
    height: 125,
    backgroundColor: '#E5A93C',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#C67A13',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  wicketBail: {
    position: 'absolute',
    top: 10,
    left: -2,
    right: -2,
    height: 8,
    backgroundColor: '#E5A93C',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#C67A13',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cricketBall: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    right: 70,
    top: 40,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 8,
  },
  ballSeam: {
    position: 'absolute',
    width: 130,
    height: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#7F0000',
    top: '46%',
    left: '-20%',
    transform: [{ rotate: '42deg' }],
    opacity: 0.9,
  },
  ballSeamStitch: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#7F0000',
  },
  ballShine: {
    position: 'absolute',
    width: 28,
    height: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    top: 10,
    left: 18,
    transform: [{ rotate: '-15deg' }],
  },
  filterBarContainer: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 24,
    marginTop: Platform.OS === 'web' ? -35 : 15,
    zIndex: 90,
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: -5,
      },
    }),
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06392e',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#00ea6b',
  },
  filterBarMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderRadius: 20,
    padding: 12,
  },
  filterItemSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.2,
    minHeight: 44,
  },
  filterSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#00ea6b',
    fontWeight: '600',
    fontFamily: 'Inter',
    ...Platform.select({
      web: { outlineStyle: 'none' }
    }) as any,
  },
  filterDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(0, 234, 107, 0.2)',
    marginHorizontal: 12,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minHeight: 44,
    position: 'relative',
    gap: 8,
  },
  filterTextContent: {
    flex: 1,
    gap: 2,
  },
  filterItemLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: 'rgba(0, 234, 107, 0.7)',
    letterSpacing: 1,
  },
  filterItemValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00ea6b',
    fontFamily: 'Inter',
  },
  floatingDropdown: {
    position: 'absolute',
    top: '110%',
    left: -10,
    right: -10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    padding: 6,
    zIndex: 100,
  },
  dateDropdown: {
    width: 360,
    maxWidth: 320,
    left: Platform.OS === 'web' ? -100 : -60,
    padding: 16,
    maxHeight: 480,
  },
  dateDropdownContainer: {
    width: '100%',
  },
  dateQuickOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  dateQuickBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  dateQuickBtnActive: {
    backgroundColor: '#01e669',
  },
  dateQuickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  dateQuickBtnTextActive: {
    color: '#FFFFFF',
  },
  dropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  dropdownOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    fontFamily: 'Inter',
  },
  calendarWrapper: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  applyFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06392e',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginLeft: 12,
  },
  applyFiltersBtnMobile: {
    width: '100%',
    justifyContent: 'center',
    marginLeft: 0,
    marginTop: 8,
  },
  mobileToggleFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(1, 230, 105, 0.25)',
    backgroundColor: 'rgba(1, 230, 105, 0.05)',
  },
  mobileToggleFiltersBtnActive: {
    backgroundColor: '#06392e',
    borderColor: '#06392e',
  },
  mobileToggleFiltersText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00ea6b',
    fontFamily: 'Inter',
  },
  mobileVenuesFoundContainer: {
    width: '100%',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 10,
    alignItems: 'flex-start',
  },
  mobileVenuesFoundText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#06392e',
    fontFamily: 'Inter',
  },
  filterItemMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 44,
    flexGrow: 1,
    minWidth: '46%',
  },
  filterItemSearchMobile: {
    width: '100%',
    flex: 0,
    flexBasis: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
    marginBottom: 4,
  },
  filterItemMobileNoBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 44,
    flexGrow: 1,
    minWidth: '46%',
  },
  floatingDropdownMobile: {
    backgroundColor: '#06392e',
    borderColor: 'rgba(0, 234, 107, 0.3)',
    borderWidth: 1,
    shadowColor: '#00ea6b',
    shadowOpacity: 0.1,
  },
  dropdownOptionTextMobile: {
    color: '#FFFFFF',
  },
  dateQuickBtnMobile: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dateQuickBtnTextMobile: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  applyFiltersBtnMobileTheme: {
    backgroundColor: '#00ea6b',
    borderColor: '#00ea6b',
    borderWidth: 1,
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  heroSectionMobile: {
    height: 280,
  },
  heroContainerMobile: {
    paddingHorizontal: 16,
  },
  heroTitleMobile: {
    fontSize: 32,
    letterSpacing: -0.5,
  },
  titleUnderlineMobile: {
    width: 100,
    bottom: -4,
  },
  heroSubtitleMobile: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  applyFiltersBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  sortRowContainer: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    position: 'relative',
  },
  sortBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#043529',
    fontFamily: 'Inter',
  },
  sortDropdown: {
    position: 'absolute',
    top: '110%',
    left: 0,
    width: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    padding: 4,
    zIndex: 90,
  },
  sortRight: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  toggleBtnActive: {
    backgroundColor: '#043529',
    borderColor: '#043529',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  resultsContainer: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 24,
    marginTop: 24,
  },
  list: {
    paddingBottom: 40,
  },
  customGroundCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 3,
    flex: 1,
    marginBottom: 20,
  },
  customGroundCardList: {
    flexDirection: 'row',
  },
  cardImgContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  cardImgContainerList: {
    width: 220,
    height: 180,
  },
  cardImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardTypeBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#043529',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cardTypeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  favoriteCircle: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardDetails: {
    padding: 20,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  customCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#043529',
    fontFamily: 'Inter',
    flex: 1.1,
  },
  customCardPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#01b854',
    fontFamily: 'Inter',
  },
  customCardUnit: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  cardLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  customCardLocText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  cardRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  ratingVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#01b854',
  },
  ratingText: {
    fontSize: 11,
    color: '#01b854',
    fontWeight: '600',
  },
  cardDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginTop: 4,
  },
  cardDetailsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  highlightsContainer: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  footerHighlightsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 20,
    paddingHorizontal: 32,
    marginTop: 40,
    marginBottom: 20,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  highlightIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E8F8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTextContainer: {
    gap: 2,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#043529',
    fontFamily: 'Inter',
  },
  highlightDesc: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  highlightDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#043529',
    fontFamily: 'Inter',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  premiumMatchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    padding: 0,
  },
  premiumImageWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
  },
  premiumImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E0E0',
  },
  premiumContent: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  premiumTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  premiumName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginRight: 8,
  },
  premiumMatchName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginRight: 8,
  },
  premiumPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3450',
    fontFamily: 'Inter',
  },
  premiumPriceUnitText: {
    fontSize: 10,
    fontWeight: '400',
    color: '#64748B',
  },
  premiumLocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumLocation: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '400',
  },
  premiumDistance: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '500',
    textAlign: 'right',
  },
  premiumSportsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookableBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#01e669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopLeftRadius: 8,
  },
  bookableBadgeText: {
    color: '#06392e',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    fontFamily: 'Inter',
    letterSpacing: 0.5,
  },
});
