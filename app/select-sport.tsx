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
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
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

const { width, height } = Dimensions.get('window');
const HEADER_TABS = [80, 60, 55, 50]; // Sport, Location, Date, Time heights
const SPORT_ICON_MAP: Record<string, any> = {
  'Box Cricket': { icon: Swords, bg: '#043529', image: require('@/assets/images/box_cricket_bg.png') },
  'Cricket Ground': { icon: Trophy, bg: '#064e3b', image: require('@/assets/images/cricket_bg.png') },
  'Football': { icon: Trophy, bg: '#024421', image: require('@/assets/images/football_bg.png') },
};

const DEFAULT_SPORT_ASSETS = { icon: Trophy, bg: '#043529', image: require('@/assets/images/hero-bg.png') };


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

function GroundCardExpo({ ground, index, scrollX, onPress }: { ground: any; index: number; scrollX: any; onPress: () => void }) {
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
            <View style={styles.cardFullFooter}>
              <Text style={styles.cardFullPrice}>
                {ground.time_slots?.filter((s: any) => s.is_available && s.custom_price != null).length > 0
                  ? `₹${Math.min(...ground.time_slots.filter((s: any) => s.is_available && s.custom_price != null).map((s: any) => Number(s.custom_price)))}`
                  : 'See Slots'}
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
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [sports, setSports] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  
  const [activeSportIndex, setActiveSportIndex] = useState(0);
  const [activeLocIndex, setActiveLocIndex] = useState(0);
  const [activeDateIndex, setActiveDateIndex] = useState(0);
  const [activeTimeIndex, setActiveTimeIndex] = useState(0);
  const [activeResultPage, setActiveResultPage] = useState(0);
  
  const [grounds, setGrounds] = useState<any[]>([]);
  const [loadingGrounds, setLoadingGrounds] = useState(false);
  const [selectedGround, setSelectedGround] = useState<any>(null);

  const verticalScrollY = useSharedValue(0);
  const horizontalScrollX = useSharedValue(0);
  const modalY = useSharedValue(height);

  const onHorizontalScroll = (event: any) => {
    horizontalScrollX.value = event.nativeEvent.contentOffset.x;
  };

  const handleSelectGround = (ground: any) => {
    setSelectedGround(ground);
    modalY.value = withSpring(0, { damping: 20, stiffness: 90 });
  };

  const handleDismissModal = () => {
    modalY.value = withSpring(height, { damping: 20, stiffness: 90 }, () => {
      runOnJS(setSelectedGround)(null);
    });
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        modalY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 150 || e.velocityY > 500) {
        runOnJS(handleDismissModal)();
      } else {
        modalY.value = withSpring(0);
      }
    });

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalY.value }],
  }));

  const handlePay = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to book a ground.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/(auth)/login') }
      ]);
      return;
    }

    if (!selectedGround || !time || time === 'No slots') {
      Alert.alert('Selection Required', 'Please select a valid time slot to continue.');
      return;
    }

    setLoadingGrounds(true);
    try {
      // Fetch the actual slot price for the selected time and ground
      const d = new Date(date.db);
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dow = days[d.getDay()];
      // Convert "09:00 AM" to "09:00:00"
      const [t, ampm] = time.split(' ');
      let [h, m] = t.split(':').map(Number);
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      const startTimeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;

      const { data: slotData } = await supabase
        .from('time_slots')
        .select('custom_price, end_time')
        .eq('ground_id', selectedGround.id)
        .eq('start_time', startTimeStr)
        .eq('day_of_week', dow)
        .maybeSingle();

      const finalPrice = slotData?.custom_price ?? 0;
      const actualEndTime = slotData?.end_time || `${(h + 1) % 24}:00:00`;

      // Calculate hours for the price helper
      const startH = h + m/60;
      const [eh, em] = actualEndTime.split(':').map(Number);
      const endH = eh + em/60;
      const duration = endH > startH ? endH - startH : (24 - startH + endH);

      const isBox = (selectedGround.pitch_type || '').toLowerCase().includes('box');
      const teamType = 'both'; // default for this simple flow

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          ground_id: selectedGround.id,
          booking_date: date.db,
          start_time: startTimeStr,
          end_time: actualEndTime,
          total_hours: duration,
          price_per_hour: isBox ? (finalPrice / (duration || 1)) : finalPrice,
          total_amount: isBox ? finalPrice : (teamType === 'one' ? finalPrice / 2 : finalPrice),
          status: 'pending',
          payment_method: 'Wallet',
          team_type: teamType,
          notes: !isBox ? (teamType === 'one' ? 'Teams: 1 Team' : 'Teams: Both Teams') : null,
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Booking Successful!',
        'Your booking has been placed and is pending confirmation.',
        [{ text: 'View Bookings', onPress: () => router.replace('/(tabs)/bookings') }]
      );
      handleDismissModal();
    } catch (err: any) {
      console.error('Booking error:', err);
      Alert.alert('Booking Failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoadingGrounds(false);
    }
  };

  const SNAP_1 = height - HEADER_TABS[0] - insets.top;
  const SNAP_2 = SNAP_1 + height - (HEADER_TABS[0] + HEADER_TABS[1]) - insets.top;
  const SNAP_3 = SNAP_2 + height - (HEADER_TABS[0] + HEADER_TABS[1] + HEADER_TABS[2]) - insets.top;
  const SNAP_4 = SNAP_3 + height - (HEADER_TABS[0] + HEADER_TABS[1] + HEADER_TABS[2] + HEADER_TABS[3]) - insets.top;

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
      setLoadingGrounds(true);
      const sport = sports[activeSportIndex];
      const loc = locations[activeLocIndex];
      try {
        const { data, error } = await supabase
          .from('grounds')
          .select(`*, ground_images(*), time_slots(custom_price, is_available)`)
          .eq('city', loc.city)
          .ilike('pitch_type', `%${sport.dbType}%`)
          .eq('active', true)
          .limit(20);
        if (error) throw error;
        setGrounds(data || []);
      } catch (err) {
        console.error('Error fetching results:', err);
      } finally {
        setLoadingGrounds(false);
      }
    }
    fetchResults();
  }, [sports, locations, activeSportIndex, activeLocIndex]);

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
  const timeTabStyle = useAnimatedStyle(() => ({
    opacity: interpolate(verticalScrollY.value, [SNAP_3 + 100, SNAP_4], [0, 1], Extrapolate.CLAMP),
    transform: [{ translateY: HEADER_TABS[0] + HEADER_TABS[1] + HEADER_TABS[2] }],
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
    const ty = interpolate(verticalScrollY.value, [0, SNAP_2, SNAP_4], [height, SNAP_2, SNAP_4], Extrapolate.CLAMP);
    return {
      backgroundColor: '#d8f79d',
      transform: [{ translateY: ty }],
      zIndex: 2,
    };
  });
  const bgPin4Style = useAnimatedStyle(() => {
    const ty = interpolate(verticalScrollY.value, [0, SNAP_3, SNAP_4], [height, SNAP_3, SNAP_4], Extrapolate.CLAMP);
    return {
      backgroundColor: '#2a533a',
      transform: [{ translateY: ty }],
      zIndex: 3,
    };
  });

  const dots1Opacity = useAnimatedStyle(() => ({ opacity: interpolate(verticalScrollY.value, [0, SNAP_1 * 0.4], [1, 0], Extrapolate.CLAMP) }));
  const dots2Opacity = useAnimatedStyle(() => ({ opacity: interpolate(verticalScrollY.value, [SNAP_1, SNAP_1 + (SNAP_2 - SNAP_1) * 0.4], [1, 0], Extrapolate.CLAMP) }));
  const dots3Opacity = useAnimatedStyle(() => ({ opacity: interpolate(verticalScrollY.value, [SNAP_2, SNAP_2 + (SNAP_3 - SNAP_2) * 0.4], [1, 0], Extrapolate.CLAMP) }));
  const dots4Opacity = useAnimatedStyle(() => ({ opacity: interpolate(verticalScrollY.value, [SNAP_3, SNAP_3 + (SNAP_4 - SNAP_3) * 0.4], [1, 0], Extrapolate.CLAMP) }));



  const sport = sports[activeSportIndex];
  const loc = locations[activeLocIndex];
  const date = dates[activeDateIndex];
  const time = timeSlots[activeTimeIndex] || 'No slots';

  if (sports.length === 0 || locations.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00ea6b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* PERSISTENT BACKGROUND STACK */}
      <Animated.View style={[StyleSheet.absoluteFill, bgPin1Style]} />
      {/* Subsequent backgrounds pin themselves as they arrive */}
      <Animated.View style={[styles.bgPin, bgPin2Style]} />
      <Animated.View style={[styles.bgPin, bgPin3Style]} />
      <Animated.View style={[styles.bgPin, bgPin4Style]} />

      <View style={styles.headerOverlay}>
        <Animated.View style={[styles.statusBarFill, { height: insets.top }, statusBarBgStyle]} />
        <Animated.View style={[styles.headerTab, sportTabStyle, { height: HEADER_TABS[0], backgroundColor: sport.bg }]}>
          <View style={[styles.centerRow, { paddingTop: 10 }]}><sport.icon size={20} color="#00ea6b" /><Text style={styles.tabText}>{sport.name}</Text></View>
        </Animated.View>
        <Animated.View style={[styles.headerTab, locTabStyle, { height: HEADER_TABS[1], backgroundColor: '#00ea6b' }]}>
          <View style={styles.centerRow}><Text style={styles.tabTextSmall}>{loc.name}</Text></View>
        </Animated.View>
        <Animated.View style={[styles.headerTab, dateTabStyle, { height: HEADER_TABS[2], backgroundColor: '#d8f79d' }]}>
          <View style={styles.centerRow}><Text style={[styles.tabTextSmall, { color: '#06392e' }]}>{date.short}</Text></View>
        </Animated.View>
        <Animated.View style={[styles.headerTab, timeTabStyle, { height: HEADER_TABS[3], backgroundColor: '#2a533a' }]}>
          <View style={styles.centerRow}><Text style={[styles.tabTextSmall, { color: '#FFFFFF' }]}>{time}</Text></View>
        </Animated.View>
      </View>

      <ScrollView
        style={styles.verticalScrollView}
        showsVerticalScrollIndicator={false}
        onScroll={onVerticalScroll}
        scrollEventThrottle={16}
        snapToOffsets={[0, SNAP_1, SNAP_2, SNAP_3, SNAP_4]}
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
                <View key={l.id} style={styles.slide}>
                  <View style={styles.iconCircleSmall}><MapPin size={40} color="#043529" /></View>
                  <Text style={[styles.heroName, { color: '#043529', fontSize: 32 }]}>{l.name}</Text>
                </View>
              ))}
            </ScrollView>
            <Animated.View style={[styles.dotContainerAbsolute, dots2Opacity, { bottom: Platform.OS === 'ios' ? 80 : 60 }]}>
              {locations.map((_, i) => (
                <View key={i} style={[styles.dotDark, activeLocIndex === i && styles.activeDotDark, { backgroundColor: 'rgba(4, 53, 41, 0.3)' }]} />
              ))}
            </Animated.View>
          </View>
        </View>

        <View style={{ height: height - (HEADER_TABS[0] + HEADER_TABS[1]) - insets.top }}>
          <View style={[styles.pageCard, { backgroundColor: '#d8f79d' }]}>
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
          <View style={[styles.pageCard, { backgroundColor: '#2a533a' }]}>
            <ScrollView horizontal pagingEnabled onScroll={(e) => setActiveTimeIndex(Math.round(e.nativeEvent.contentOffset.x / width))} scrollEventThrottle={16} showsHorizontalScrollIndicator={false}>
              {timeSlots.length > 0 ? timeSlots.map((t) => (
                <View key={t} style={styles.slide}>
                  <View style={styles.iconCircleSmall}><Clock size={40} color="#FFFFFF" /></View>
                  <Text style={[styles.heroName, { color: '#FFFFFF' }]}>{t}</Text>
                </View>
              )) : (
                <View style={styles.slide}>
                  <View style={styles.iconCircleSmall}><Clock size={40} color="rgba(255,255,255,0.4)" /></View>
                  <Text style={[styles.heroName, { color: 'rgba(255,255,255,0.4)', fontSize: 24 }]}>No Slots Available</Text>
                </View>
              )}
            </ScrollView>
            <Animated.View style={[styles.dotContainerAbsolute, dots4Opacity]}>
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

      {/* BOOKING CONFIRMATION MODAL */}
      {selectedGround && (
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.modalOverlay, modalStyle]}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              
              <Image 
                source={{ uri: selectedGround.ground_images?.[0]?.image_url || 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg' }} 
                style={styles.modalHeroImage} 
              />
              
              <View style={styles.modalDetails}>
                <Text style={styles.modalGroundName}>{selectedGround.name}</Text>
                
                <View style={styles.modalInfoRow}>
                  <Trophy size={16} color="#059669" />
                  <Text style={styles.modalInfoText}>{selectedGround.pitch_type}</Text>
                </View>
                
                <View style={styles.modalInfoRow}>
                  <Clock size={16} color="#059669" />
                  <Text style={styles.modalInfoText}>{date.label}, {time}</Text>
                </View>
                
                <Text style={styles.modalPrice}>
                  {selectedGround.time_slots?.filter((s: any) => s.is_available && s.custom_price != null).length > 0
                    ? `₹${Math.min(...selectedGround.time_slots.filter((s: any) => s.is_available && s.custom_price != null).map((s: any) => Number(s.custom_price)))}`
                    : 'Price Varies'}
                </Text>
                
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Address</Text>
                  <View style={styles.modalAddressRow}>
                    <MapPin size={16} color="#059669" />
                    <Text style={styles.modalAddressText}>{selectedGround.address}, {selectedGround.city}</Text>
                  </View>
                </View>
                
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Facilities</Text>
                  <View style={styles.facilitiesContainer}>
                    {[
                      selectedGround.has_floodlights && 'Floodlights',
                      selectedGround.has_parking && 'Parking',
                      selectedGround.has_changing_rooms && 'Changing Rooms',
                      selectedGround.has_pavilion && 'Pavilion',
                      selectedGround.has_washrooms && 'Washrooms',
                    ].filter(Boolean).map((item, idx) => (
                      <View key={idx} style={styles.facilityChip}>
                        <Text style={styles.facilityChipText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
              
              <TouchableOpacity 
                style={[styles.confirmButton, loadingGrounds && { opacity: 0.7 }]} 
                activeOpacity={0.9}
                onPress={handlePay}
                disabled={loadingGrounds}
              >
                {loadingGrounds ? (
                  <ActivityIndicator color="#06392e" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  verticalScrollView: { flex: 1 },
  fullPage: { width: width, height: height },
  bgPin: { position: 'absolute', top: 0, left: 0, right: 0, height: height },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, pointerEvents: 'box-none' },
  statusBarFill: { position: 'absolute', top: 0, left: 0, right: 0 },
  headerTab: { position: 'absolute', left: 0, right: 0, justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  centerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  tabText: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  tabTextSmall: { fontSize: 16, fontWeight: '900', color: '#043529' },
  slide: { width: width, alignItems: 'center', justifyContent: 'center', padding: 20, paddingBottom: 100 },
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
  dotContainerAbsolute: { position: 'absolute', bottom: Platform.OS === 'ios' ? 60 : 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  dotLight: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  activeDotLight: { backgroundColor: '#00ea6b', width: 32, borderColor: '#00ea6b' },
  dotDark: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(4,53,41,0.15)' },
  activeDotDark: { backgroundColor: '#043529', width: 32 },
  
  // RESULTS CARDS
  cardFullContainer: { width: width, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 20, paddingBottom: 20 },
  cardFull: { backgroundColor: 'white', borderRadius: 24, width: width * 0.92, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 12, minHeight: 480 },
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
