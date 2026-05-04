import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Trophy, 
  Swords, 
  ChevronUp,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
} from 'lucide-react-native';
import { useHasMounted } from '@/hooks/useHasMounted';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  interpolate,
  Extrapolate,
  withSpring,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { 
  GestureHandlerRootView, 
  GestureDetector, 
  Gesture 
} from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabase';
import { makeGroundPath } from '@/utils/groundSlug';
import FindGroundSkeleton from '@/components/landing/FindGroundSkeleton';

const { width: STATIC_WIDTH, height: STATIC_HEIGHT } = Dimensions.get('window');
const HEADER_TABS = [70, 55, 50, 50, 45]; // Sport, Location, Date, Team, Time heights
const TEAMS_OPTIONS = [
  { id: 'one', label: '1 Team', icon: User },
  { id: 'both', label: 'Both Teams', icon: Users },
];
const SPORT_ICON_MAP: Record<string, any> = {
  'Box Cricket': { icon: Swords, bg: '#043529', image: require('@/assets/images/box_cricket_bg.jpg') },
  'Cricket Ground': { icon: Trophy, bg: '#064e3b', image: require('@/assets/images/cricket_bg.jpg') },
  'Football': { icon: Trophy, bg: '#024421', image: require('@/assets/images/football_bg.jpg') },
};

const DEFAULT_SPORT_ASSETS = { icon: Trophy, bg: '#043529', image: require('@/assets/images/hero-bg.jpg') };


// Native date formatting helpers
const formatDateShort = (date: Date) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
};

const formatDateFull = (date: Date) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
};

function GroundCardExpo({ ground, index, scrollX, onPress, width }: { ground: any; index: number; scrollX: any; onPress: () => void; width: number }) {
  const primaryImage = ground.ground_images?.[0]?.image_url || 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';
  
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const scale = interpolate(scrollX.value, inputRange, [0.85, 1, 0.85], Extrapolate.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.6, 1, 0.6], Extrapolate.CLAMP);
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <View style={styles.cardFullContainer}>
      <Animated.View style={[styles.cardFull, animatedStyle]}>
        <TouchableOpacity activeOpacity={0.9} style={{ flex: 1 }} onPress={onPress}>
          <Image source={{ uri: primaryImage }} style={styles.cardFullImage} />
          <View style={styles.cardFullContent}>
            <Text style={styles.cardFullTitle} numberOfLines={1}>{ground.name}</Text>
            <View style={styles.cardFullRow}>
              <MapPin size={14} color="#64748B" />
              <Text style={styles.cardFullLoc} numberOfLines={1}>{ground.city}, {ground.state}</Text>
            </View>
            <View style={styles.cardFullRow}>
              <Calendar size={14} color="#64748B" />
              <Text style={styles.cardFullLoc}>{ground.selectedDateLabel}</Text>
            </View>
            <View style={styles.cardFullRow}>
              <Clock size={14} color="#64748B" />
              <Text style={styles.cardFullLoc}>{ground.selectedTimeLabel} ({ground.selectedTeamLabel})</Text>
            </View>
            <View style={styles.cardFullFooter}>
              <Text style={styles.cardFullPrice}>
                ₹{ground.displayPrice}
                <Text style={styles.cardFullUnit}>
                  {String(ground.pitch_type ?? '').toLowerCase().includes('box') ? '/hr' : ' /match'}
                </Text>
              </Text>
              <View style={styles.cardFullBadge}>
                <Text style={styles.cardFullBadgeText}>{ground.pitch_type}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function SelectSportScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { setTabBarVisible } = useUI();
  
  useEffect(() => {
    setTabBarVisible(false);
    return () => setTabBarVisible(true);
  }, []);
  
  const [sports, setSports] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  
  const [activeSportIndex, setActiveSportIndex] = useState(0);
  const [activeLocIndex, setActiveLocIndex] = useState(0);
  const [activeDateIndex, setActiveDateIndex] = useState(0);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0); // Default to first option (1 Team) to match ScrollView start
  const [activeTimeIndex, setActiveTimeIndex] = useState(0);
  const [activeResultPage, setActiveResultPage] = useState(0);
  
  const [grounds, setGrounds] = useState<any[]>([]);
  const [loadingGrounds, setLoadingGrounds] = useState(false);
  const [selectedGround, setSelectedGround] = useState<any>(null);

  const verticalScrollY = useSharedValue(0);
  const horizontalScrollX = useSharedValue(0);
  const modalY = useSharedValue(height);
  const hasMounted = useHasMounted();

  const onHorizontalScroll = (event: any) => {
    horizontalScrollX.value = event.nativeEvent.contentOffset.x;
  };

  const handleSelectGround = async (ground: any) => {
    if (!ground || !date || !time) return;
    setLoadingGrounds(true);
    try {
      const d = new Date(date.db);
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dow = days[d.getDay()];
      
      const [t, ampm] = time.split(' ');
      let [h, m] = t.split(':').map(Number);
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      const startTimeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;

      const { data: slotData } = await supabase
        .from('time_slots')
        .select('custom_price, end_time')
        .eq('ground_id', ground.id)
        .eq('start_time', startTimeStr)
        .eq('day_of_week', dow)
        .maybeSingle();

      const finalPrice = slotData?.custom_price ?? 0;
      const actualEndTime = slotData?.end_time || `${(h + 1) % 24}:${m.toString().padStart(2, '0')}:00`;

      const startH = h + m/60;
      const [eh, em] = actualEndTime.split(':').map(Number);
      const endH = eh + em/60;
      const duration = endH > startH ? endH - startH : (24 - startH + endH);

      const isBox = (ground.pitch_type || '').toLowerCase().includes('box');
      const teamType = TEAMS_OPTIONS[activeTeamIndex].id;
      
      const totalAmount = isBox ? finalPrice : (teamType === 'one' ? finalPrice / 2 : finalPrice);
      const pricePerHour = isBox ? (finalPrice / (duration || 1)) : finalPrice;

      const finalParams = new URLSearchParams();
      finalParams.set('date', date.db);
      finalParams.set('time', startTimeStr.slice(0, 5));
      finalParams.set('teams', teamType);
      finalParams.set('lock', 'true');

      const groundPath = makeGroundPath(ground);
      router.push(`${groundPath}?${finalParams.toString()}` as any);
    } catch (err: any) {
      console.error('Booking error:', err);
      Alert.alert('Error', 'Could not initiate checkout. Please try again.');
    } finally {
      setLoadingGrounds(false);
    }
  };



  const SNAP_1 = height - HEADER_TABS[0] - insets.top;
  const SNAP_2 = SNAP_1 + height - (HEADER_TABS[0] + HEADER_TABS[1]) - insets.top;
  const SNAP_3 = SNAP_2 + height - (HEADER_TABS[0] + HEADER_TABS[1] + HEADER_TABS[2]) - insets.top;
  const SNAP_4 = SNAP_3 + height - (HEADER_TABS[0] + HEADER_TABS[1] + HEADER_TABS[2] + HEADER_TABS[3]) - insets.top;
  const SNAP_5 = SNAP_4 + height - (HEADER_TABS.reduce((a, b) => a + b, 0)) - insets.top;

  const dates = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return { id: i.toString(), label: formatDateFull(d), short: formatDateShort(d), db: d.toISOString().split('T')[0] };
    });
  }, []);

  const onVerticalScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    verticalScrollY.value = event.nativeEvent.contentOffset.y;
  };

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [typesRes, locsRes] = await Promise.all([
          supabase.from('ground_types').select('*').eq('active', true).order('sort_order', { ascending: true }),
          supabase.from('locations').select('*').eq('active', true).order('sort_order', { ascending: true })
        ]);

        if (typesRes.data) {
          setSports(typesRes.data.map(t => ({
            id: t.id,
            name: t.name,
            dbType: t.name,
            ...(SPORT_ICON_MAP[t.name] || DEFAULT_SPORT_ASSETS)
          })));
        }
        if (locsRes.data) {
          setLocations(locsRes.data.map(l => ({
            id: l.id,
            name: l.label || l.city,
            city: l.city,
            state: l.state
          })));
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
      }
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    if (sports.length === 0 || locations.length === 0) return;
    
    async function fetchTimeSlots() {
      const sport = sports[activeSportIndex];
      const loc = locations[activeLocIndex];
      const date = dates[activeDateIndex];
      
      try {
        // Fetch union of all available time slots for this sport/location/date
        // First get matching grounds
        const { data: matchedGrounds } = await supabase
          .from('grounds')
          .select('id')
          .eq('city', loc.city)
          .ilike('pitch_type', `%${sport.dbType}%`)
          .eq('active', true);
          
        if (matchedGrounds && matchedGrounds.length > 0) {
          const groundIds = matchedGrounds.map(g => g.id);
          const d = new Date(date.db);
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dow = days[d.getDay()];
          
          const { data: slots } = await supabase
            .from('time_slots')
            .select('start_time')
            .in('ground_id', groundIds)
            .eq('day_of_week', dow)
            .eq('is_available', true);
            
          if (slots) {
            // Proper chronological sort for time strings
            const sortedSlots = slots
              .map(s => s.start_time)
              .sort((a, b) => {
                const [ha, ma] = a.split(':').map(Number);
                const [hb, mb] = b.split(':').map(Number);
                return (ha * 60 + ma) - (hb * 60 + mb);
              });

            const uniqueSlots = Array.from(new Set(sortedSlots)).map(startTime => {
              const [h, m] = startTime.split(':');
              const hour = parseInt(h);
              const ampm = hour >= 12 ? 'PM' : 'AM';
              const displayHour = hour % 12 || 12;
              return `${displayHour.toString().padStart(2, '0')}:${m} ${ampm}`;
            });
            setTimeSlots(uniqueSlots);
          }
        } else {
          setTimeSlots([]);
        }
      } catch (err) {
        console.error('Error fetching time slots:', err);
      }
    }
    fetchTimeSlots();
  }, [sports, locations, activeSportIndex, activeLocIndex, activeDateIndex]);

  useEffect(() => {
    if (sports.length === 0 || locations.length === 0) return;
    async function fetchResults() {
      if (!sport || !loc || !date || !time) return;
      setLoadingGrounds(true);
      
      try {
        const d = new Date(date.db);
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dow = days[d.getDay()];
        
        // Convert "09:00 AM" to "09:00:00"
        if (!time.includes(':')) {
          setGrounds([]);
          return;
        }
        const [t, ampm] = time.split(' ');
        let [h, m] = t.split(':').map(Number);
        if (m === undefined || isNaN(h) || isNaN(m)) {
          setGrounds([]);
          return;
        }
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        const startTimeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;

        // 1. Get grounds that have this specific slot available
        const { data: slotMatches } = await supabase
          .from('time_slots')
          .select('ground_id, custom_price')
          .eq('day_of_week', dow)
          .eq('start_time', startTimeStr)
          .eq('is_available', true);

        if (!slotMatches || slotMatches.length === 0) {
          setGrounds([]);
          return;
        }

        const groundIdsWithSlot = slotMatches.map(s => s.ground_id);
        const priceMap = new Map(slotMatches.map(s => [s.ground_id, s.custom_price]));

        // 2. Fetch ground details for those IDs
        const { data, error } = await supabase
          .from('grounds')
          .select(`*, ground_images(*)`)
          .in('id', groundIdsWithSlot)
          .eq('city', loc.city)
          .ilike('pitch_type', `%${sport.dbType}%`)
          .eq('active', true)
          .limit(20);

        if (error) throw error;

        const teamType = TEAMS_OPTIONS[activeTeamIndex].id;
        const isBox = (sport.dbType || '').toLowerCase().includes('box');

        const processed = (data || []).map(g => {
          const basePrice = priceMap.get(g.id) || 0;
          const displayPrice = (teamType === 'one' && !isBox) ? basePrice / 2 : basePrice;
          
          return {
            ...g,
            displayPrice,
            selectedDateLabel: date.label,
            selectedTimeLabel: time,
            selectedTeamLabel: TEAMS_OPTIONS[activeTeamIndex].label,
          };
        });

        setGrounds(processed);
      } catch (err) {
        console.error('Error fetching results:', err);
      } finally {
        setLoadingGrounds(false);
      }
    }
    fetchResults();
  }, [sports, locations, activeSportIndex, activeLocIndex, activeDateIndex, activeTeamIndex, activeTimeIndex]);

  // ANIMATED STYLES
  const statusBarBgStyle = useAnimatedStyle(() => ({
    backgroundColor: sports.length > 0 ? sports[activeSportIndex].bg : '#043529',
    opacity: interpolate(verticalScrollY.value, [SNAP_1 * 0.7, SNAP_1], [0, 1], Extrapolate.CLAMP),
  }));

  const sportTabStyle = useAnimatedStyle(() => ({
    opacity: interpolate(verticalScrollY.value, [SNAP_1 * 0.7, SNAP_1], [0, 1], Extrapolate.CLAMP),
    top: insets.top
  }));
  const locTabStyle = useAnimatedStyle(() => ({
    opacity: interpolate(verticalScrollY.value, [SNAP_1 + 100, SNAP_2], [0, 1], Extrapolate.CLAMP),
    transform: [{ translateY: HEADER_TABS[0] }],
    top: insets.top
  }));
  const dateTabStyle = useAnimatedStyle(() => ({
    opacity: interpolate(verticalScrollY.value, [SNAP_2 + 100, SNAP_3], [0, 1], Extrapolate.CLAMP),
    transform: [{ translateY: HEADER_TABS[0] + HEADER_TABS[1] }],
    top: insets.top
  }));
  const teamTabStyle = useAnimatedStyle(() => ({
    opacity: interpolate(verticalScrollY.value, [SNAP_3 + 100, SNAP_4], [0, 1], Extrapolate.CLAMP),
    transform: [{ translateY: HEADER_TABS[0] + HEADER_TABS[1] + HEADER_TABS[2] }],
    top: insets.top
  }));
  const timeTabStyle = useAnimatedStyle(() => ({
    opacity: interpolate(verticalScrollY.value, [SNAP_4 + 100, SNAP_5], [0, 1], Extrapolate.CLAMP),
    transform: [{ translateY: HEADER_TABS[0] + HEADER_TABS[1] + HEADER_TABS[2] + HEADER_TABS[3] }],
    top: insets.top
  }));

  // BACKGROUND PINNING ANIMATIONS
  const bgPin1Style = useAnimatedStyle(() => ({
    backgroundColor: sports.length > 0 ? sports[activeSportIndex].bg : '#043529',
  }));
  const bgPin2Style = useAnimatedStyle(() => {
    const ty = interpolate(verticalScrollY.value, [0, SNAP_1, SNAP_4], [height, SNAP_1, SNAP_4], Extrapolate.CLAMP);
    return {
      backgroundColor: '#00ea6b',
      transform: [{ translateY: ty }],
      zIndex: 1,
    };
  });
  const bgPin3Style = useAnimatedStyle(() => {
    const ty = interpolate(verticalScrollY.value, [0, SNAP_2, SNAP_5], [height, SNAP_2, SNAP_5], Extrapolate.CLAMP);
    return {
      backgroundColor: '#01b854',
      transform: [{ translateY: ty }],
      zIndex: 2,
    };
  });
  const bgPin4Style = useAnimatedStyle(() => {
    const ty = interpolate(verticalScrollY.value, [0, SNAP_3, SNAP_5], [height, SNAP_3, SNAP_5], Extrapolate.CLAMP);
    return {
      backgroundColor: '#5bcd8e',
      transform: [{ translateY: ty }],
      zIndex: 3,
    };
  });
  const bgPin5Style = useAnimatedStyle(() => {
    const ty = interpolate(verticalScrollY.value, [0, SNAP_4, SNAP_5], [height, SNAP_4, SNAP_5], Extrapolate.CLAMP);
    return {
      backgroundColor: '#a5ff8a',
      transform: [{ translateY: ty }],
      zIndex: 4,
    };
  });

  const dots1Opacity = useAnimatedStyle(() => ({ opacity: interpolate(verticalScrollY.value, [0, SNAP_1 * 0.4], [1, 0], Extrapolate.CLAMP) }));
  const dots2Opacity = useAnimatedStyle(() => ({ opacity: interpolate(verticalScrollY.value, [SNAP_1, SNAP_1 + (SNAP_2 - SNAP_1) * 0.4], [1, 0], Extrapolate.CLAMP) }));
  const dots3Opacity = useAnimatedStyle(() => ({ opacity: interpolate(verticalScrollY.value, [SNAP_2, SNAP_2 + (SNAP_3 - SNAP_2) * 0.4], [1, 0], Extrapolate.CLAMP) }));
  const dots4Opacity = useAnimatedStyle(() => ({ opacity: interpolate(verticalScrollY.value, [SNAP_3, SNAP_3 + (SNAP_4 - SNAP_3) * 0.4], [1, 0], Extrapolate.CLAMP) }));
  const dots5Opacity = useAnimatedStyle(() => ({ opacity: interpolate(verticalScrollY.value, [SNAP_4, SNAP_4 + (SNAP_5 - SNAP_4) * 0.4], [1, 0], Extrapolate.CLAMP) }));



  const sport = sports[activeSportIndex];
  const loc = locations[activeLocIndex];
  const date = dates[activeDateIndex];
  const teamOption = TEAMS_OPTIONS[activeTeamIndex];
  const time = timeSlots[activeTimeIndex] || 'No slots';

  if (sports.length === 0 || locations.length === 0) {
    return <FindGroundSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* PERSISTENT BACKGROUND STACK */}
      <Animated.View style={[StyleSheet.absoluteFill, bgPin1Style]} />
      {/* Subsequent backgrounds pin themselves as they arrive */}
      <Animated.View style={[styles.bgPin, bgPin2Style]} />
      <Animated.View style={[styles.bgPin, bgPin3Style]} />
      <Animated.View style={[styles.bgPin, bgPin4Style]} />
      <Animated.View style={[styles.bgPin, bgPin5Style]} />

      <View style={styles.headerOverlay}>
        <Animated.View style={[styles.statusBarFill, { height: insets.top }, statusBarBgStyle]} />
        <Animated.View style={[styles.headerTab, sportTabStyle, { height: HEADER_TABS[0], backgroundColor: sport.bg }]}>
          <View style={[styles.centerRow, { paddingTop: 10 }]}><Text style={styles.tabText}>{sport.name}</Text></View>
        </Animated.View>
        <Animated.View style={[styles.headerTab, locTabStyle, { height: HEADER_TABS[1], backgroundColor: '#00ea6b' }]}>
          <View style={styles.centerRow}><Text style={styles.tabTextSmall}>{loc.name}</Text></View>
        </Animated.View>
        <Animated.View style={[styles.headerTab, dateTabStyle, { height: HEADER_TABS[2], backgroundColor: '#01b854' }]}>
          <View style={styles.centerRow}><Text style={[styles.tabTextSmall, { color: '#06392e' }]}>{date.short}</Text></View>
        </Animated.View>
        <Animated.View style={[styles.headerTab, teamTabStyle, { height: HEADER_TABS[3], backgroundColor: '#5bcd8e' }]}>
          <View style={styles.centerRow}><Text style={[styles.tabTextSmall, { color: '#043529' }]}>{teamOption.label}</Text></View>
        </Animated.View>
        <Animated.View style={[styles.headerTab, timeTabStyle, { height: HEADER_TABS[4], backgroundColor: '#a5ff8a' }]}>
          <View style={styles.centerRow}><Text style={[styles.tabTextSmall, { color: '#043529' }]}>{time}</Text></View>
        </Animated.View>
      </View>

      <ScrollView
        style={styles.verticalScrollView}
        showsVerticalScrollIndicator={false}
        onScroll={onVerticalScroll}
        scrollEventThrottle={16}
        snapToOffsets={[0, SNAP_1, SNAP_2, SNAP_3, SNAP_4, SNAP_5]}
        decelerationRate="fast"
        bounces={false}
      >
        <View style={styles.fullPage}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            onScroll={(e) => setActiveSportIndex(Math.round(e.nativeEvent.contentOffset.x / width))} 
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
          >
            {sports.map((item) => (
              <View key={item.id} style={styles.slide}>
                <Image source={item.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(4, 53, 41, 0.6)' }]} />
                
                <View style={styles.contentWrapper}>
                  <View style={styles.iconCircle}>
                    <item.icon size={80} color="#00ea6b" />
                  </View>
                  <Text style={styles.heroName}>{item.name}</Text>
                  
                  <View style={styles.swipeHint}>
                    <ChevronUp size={24} color="#00ea6b" />
                    <Text style={styles.swipeHintText}>Swipe up</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
          <Animated.View style={[styles.dotContainerAbsolute, dots1Opacity]}>
            {sports.map((_, i) => (
              <View key={i} style={[styles.dotLight, activeSportIndex === i && styles.activeDotLight]} />
            ))}
          </Animated.View>
        </View>

        <View style={{ height: height - HEADER_TABS[0] - insets.top }}>
          <View style={[styles.pageCard, { backgroundColor: '#00ea6b' }]}>
            <ScrollView horizontal pagingEnabled onScroll={(e) => setActiveLocIndex(Math.round(e.nativeEvent.contentOffset.x / width))} scrollEventThrottle={16} showsHorizontalScrollIndicator={false}>
              {locations.map((l) => (
                <View key={l.id} style={[styles.slide, { paddingBottom: 220 }]}>
                  <View style={styles.iconCircleSmall}><MapPin size={40} color="#043529" /></View>
                  <Text style={[styles.heroName, { color: '#043529', fontSize: 32 }]}>{l.name}</Text>
                </View>
              ))}
            </ScrollView>
            <Animated.View style={[styles.dotContainerAbsolute, dots2Opacity, { bottom: Platform.OS === 'ios' ? 140 : 120 }]}>
              {locations.map((_, i) => (
                <View key={i} style={[styles.dotDark, activeLocIndex === i && styles.activeDotDark, { backgroundColor: 'rgba(4, 53, 41, 0.3)' }]} />
              ))}
            </Animated.View>
          </View>
        </View>

        <View style={{ height: height - (HEADER_TABS[0] + HEADER_TABS[1]) - insets.top }}>
          <View style={[styles.pageCard, { backgroundColor: '#01b854' }]}>
            <ScrollView horizontal pagingEnabled onScroll={(e) => setActiveDateIndex(Math.round(e.nativeEvent.contentOffset.x / width))} scrollEventThrottle={16}>
              {dates.map((d) => (
                <View key={d.id} style={styles.slide}>
                  <View style={styles.iconCircleSmall}><Calendar size={40} color="#06392e" /></View>
                  <Text style={[styles.heroName, { color: '#06392e' }]}>{d.label}</Text>
                </View>
              ))}
            </ScrollView>
            <Animated.View style={[styles.dotContainerAbsolute, dots3Opacity]}>
              {dates.slice(0, 5).map((_, i) => (
                <View key={i} style={[styles.dotDark, activeDateIndex === i && styles.activeDotDark, { backgroundColor: 'rgba(6, 57, 46, 0.15)' }]} />
              ))}
            </Animated.View>
          </View>
        </View>

        <View style={{ height: height - (HEADER_TABS[0] + HEADER_TABS[1] + HEADER_TABS[2]) - insets.top }}>
          <View style={[styles.pageCard, { backgroundColor: '#5bcd8e' }]}>
            <ScrollView horizontal pagingEnabled onScroll={(e) => setActiveTeamIndex(Math.round(e.nativeEvent.contentOffset.x / width))} scrollEventThrottle={16}>
              {TEAMS_OPTIONS.map((opt) => (
                <View key={opt.id} style={styles.slide}>
                  <View style={styles.iconCircleSmall}><opt.icon size={40} color="#043529" /></View>
                  <Text style={[styles.heroName, { color: '#043529' }]}>{opt.label}</Text>
                  <Text style={[styles.tabTextSmall, { marginTop: 10, opacity: 0.7 }]}>
                    {opt.id === 'one' ? 'Single team booking' : 'Full ground booking'}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <Animated.View style={[styles.dotContainerAbsolute, dots4Opacity]}>
              {TEAMS_OPTIONS.map((_, i) => (
                <View key={i} style={[styles.dotDark, activeTeamIndex === i && styles.activeDotDark, { backgroundColor: 'rgba(4, 53, 41, 0.2)' }]} />
              ))}
            </Animated.View>
          </View>
        </View>
        
        <View style={{ height: height - (HEADER_TABS[0] + HEADER_TABS[1] + HEADER_TABS[2] + HEADER_TABS[3]) - insets.top }}>
          <View style={[styles.pageCard, { backgroundColor: '#a5ff8a' }]}>
            <ScrollView horizontal pagingEnabled onScroll={(e) => setActiveTimeIndex(Math.round(e.nativeEvent.contentOffset.x / width))} scrollEventThrottle={16} showsHorizontalScrollIndicator={false}>
              {timeSlots.length > 0 ? timeSlots.map((t) => (
                <View key={t} style={styles.slide}>
                  <View style={styles.iconCircleSmall}><Clock size={40} color="#043529" /></View>
                  <Text style={[styles.heroName, { color: '#043529' }]}>{t}</Text>
                </View>
              )) : (
                <View style={styles.slide}>
                  <View style={styles.iconCircleSmall}><Clock size={40} color="rgba(4, 53, 41, 0.4)" /></View>
                  <Text style={[styles.heroName, { color: 'rgba(4, 53, 41, 0.4)', fontSize: 24 }]}>No Slots Available</Text>
                </View>
              )}
            </ScrollView>
            <Animated.View style={[styles.dotContainerAbsolute, dots5Opacity]}>
              {timeSlots.map((_, i) => (
                <View key={i} style={[styles.dotDark, activeTimeIndex === i && styles.activeDotDark]} />
              ))}
            </Animated.View>
          </View>
        </View>

        <View style={{ height: height - (HEADER_TABS.reduce((a,b)=>a+b, 0)) - insets.top }}>
          <View style={[styles.pageCard, { backgroundColor: '#FFFFFF' }]}>
            {loadingGrounds ? (
              <ActivityIndicator size="large" color="#00ea6b" style={{ flex: 1 }} />
            ) : grounds.length > 0 ? (
              <>
                <ScrollView 
                  horizontal 
                  pagingEnabled 
                  onScroll={onHorizontalScroll}
                  onMomentumScrollEnd={(e) => setActiveResultPage(Math.round(e.nativeEvent.contentOffset.x / width))}
                  scrollEventThrottle={16} 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 0 }}
                >
                  {grounds.map((g, i) => (
                    <GroundCardExpo 
                      key={g.id} 
                      ground={g} 
                      index={i} 
                      scrollX={horizontalScrollX} 
                      onPress={() => handleSelectGround(g)} 
                      width={width}
                    />
                  ))}
                </ScrollView>
                <View style={styles.dotContainerResults}>
                  {grounds.map((_, i) => (
                    <View key={i} style={[styles.dotDark, activeResultPage === i && styles.activeDotDark]} />
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.slide}><Text style={styles.noResults}>No grounds found</Text></View>
            )}
          </View>
        </View>
      </ScrollView>


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  verticalScrollView: { flex: 1 },
  fullPage: { width: STATIC_WIDTH, height: STATIC_HEIGHT },
  bgPin: { position: 'absolute', top: 0, left: 0, right: 0, height: STATIC_HEIGHT },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, pointerEvents: 'box-none' },
  statusBarFill: { position: 'absolute', top: 0, left: 0, right: 0 },
  headerTab: { position: 'absolute', left: 0, right: 0, justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  centerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  tabText: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', fontFamily: 'Inter' },
  tabTextSmall: { fontSize: 16, fontWeight: '900', color: '#043529', fontFamily: 'Inter' },
  slide: { width: STATIC_WIDTH, alignItems: 'center', justifyContent: 'center', padding: 20, paddingBottom: 100 },
  iconCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  iconCircleSmall: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  heroName: { fontSize: 44, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', letterSpacing: -1 },
  pageCard: { flex: 1 },
  contentWrapper: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  swipeHint: { marginTop: 40, alignItems: 'center' },
  swipeHintText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
  resultsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, padding: 10, width: '100%', marginTop: -40 },
  miniCard: { width: '48%', backgroundColor: '#F8FAFC', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  miniCardImage: { width: '100%', height: 100 },
  miniCardContent: { padding: 8 },
  miniCardName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  miniCardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  miniCardLoc: { fontSize: 10, color: '#64748B' },
  miniCardPrice: { fontSize: 13, fontWeight: '900', color: '#00ea6b', marginTop: 6 },
  noResults: { fontSize: 18, color: '#94A3B8', fontWeight: '700' },
  dotContainerAbsolute: { position: 'absolute', bottom: Platform.OS === 'ios' ? 100 : 80, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  dotLight: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  activeDotLight: { backgroundColor: '#00ea6b', width: 32, borderColor: '#00ea6b' },
  dotDark: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(4,53,41,0.15)' },
  activeDotDark: { backgroundColor: '#043529', width: 32 },
  
  // RESULTS CARDS
  cardFullContainer: { width: STATIC_WIDTH, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 20, paddingBottom: 20 },
  cardFull: { backgroundColor: 'white', borderRadius: 24, width: STATIC_WIDTH * 0.92, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 12, minHeight: 480 },
  cardFullImage: { width: '100%', height: 260 },
  cardFullContent: { padding: 20, gap: 8, flex: 1 },
  cardFullTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  cardFullRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardFullLoc: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  cardFullFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  cardFullPrice: { fontSize: 24, fontWeight: '900', color: '#059669' },
  cardFullUnit: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  cardFullBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  cardFullBadgeText: { fontSize: 12, fontWeight: '800', color: '#059669' },
  dotContainerResults: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 20 },

  // MODAL STYLES
  modalOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    zIndex: 2000, 
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  modalContent: { flex: 1, paddingBottom: 40 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: 8, position: 'absolute', top: 0, zIndex: 10 },
  modalHeroImage: { width: '100%', height: 240 },
  modalDetails: { padding: 24, gap: 16 },
  modalGroundName: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  modalInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalInfoText: { fontSize: 16, fontWeight: '600', color: '#475569' },
  modalPrice: { fontSize: 28, fontWeight: '900', color: '#059669', marginTop: 8 },
  modalSection: { gap: 8 },
  modalSectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalAddressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  modalAddressText: { fontSize: 14, color: '#64748B', flex: 1, lineHeight: 20 },
  facilitiesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  facilityChip: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: '#E2E8F0' },
  facilityChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  confirmButton: { 
    backgroundColor: '#bfff49', 
    marginHorizontal: 24, 
    paddingVertical: 18, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 'auto',
    shadowColor: '#bfff49',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  confirmButtonText: { fontSize: 18, fontWeight: '900', color: '#06392e' },
});
