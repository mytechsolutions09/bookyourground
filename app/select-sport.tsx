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
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');
const HEADER_TABS = [80, 60, 55, 50]; // Sport, Location, Date, Time heights

const SPORTS = [
  { id: 'box', name: 'Box Cricket', dbType: 'Box Cricket', icon: Swords, bg: '#043529' },
  { id: 'cricket', name: 'Cricket Ground', dbType: 'Cricket Ground', icon: Trophy, bg: '#064e3b' },
];

const LOCATIONS = [
  { id: '1', name: 'New Gurugram', city: 'New Gurugram', state: 'Haryana' },
  { id: '2', name: 'Gurugram', city: 'Gurugram', state: 'Haryana' },
  { id: '3', name: 'Delhi', city: 'New Delhi', state: 'Delhi' },
];

const TIME_SLOTS = [
  '06:00 AM', '09:00 AM', '12:00 PM', '03:00 PM', '06:00 PM', '09:00 PM'
];

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

function GroundCardSmall({ ground }: { ground: any }) {
  const primaryImage = ground.ground_images?.[0]?.image_url || 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.miniCard}>
      <Image source={{ uri: primaryImage }} style={styles.miniCardImage} />
      <View style={styles.miniCardContent}>
        <Text style={styles.miniCardName} numberOfLines={1}>{ground.name}</Text>
        <View style={styles.miniCardRow}>
          <MapPin size={10} color="#64748B" />
          <Text style={styles.miniCardLoc} numberOfLines={1}>{ground.city}</Text>
        </View>
        <Text style={styles.miniCardPrice}>₹{ground.base_price_per_hour}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SelectSportScreen() {
  const insets = useSafeAreaInsets();
  const [activeSportIndex, setActiveSportIndex] = useState(0);
  const [activeLocIndex, setActiveLocIndex] = useState(0);
  const [activeDateIndex, setActiveDateIndex] = useState(0);
  const [activeTimeIndex, setActiveTimeIndex] = useState(0);
  const [activeResultPage, setActiveResultPage] = useState(0);
  
  const [grounds, setGrounds] = useState<any[]>([]);
  const [loadingGrounds, setLoadingGrounds] = useState(false);

  const verticalScrollY = useSharedValue(0);

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
    async function fetchResults() {
      setLoadingGrounds(true);
      const sport = SPORTS[activeSportIndex];
      const loc = LOCATIONS[activeLocIndex];
      try {
        const { data, error } = await supabase
          .from('grounds')
          .select(`*, ground_images(*)`)
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
  }, [activeSportIndex, activeLocIndex]);

  // ANIMATED STYLES
  const sportTabStyle = useAnimatedStyle(() => ({
    opacity: interpolate(verticalScrollY.value, [SNAP_1 * 0.7, SNAP_1], [0, 1], Extrapolate.CLAMP)
  }));
  const locTabStyle = useAnimatedStyle(() => ({
    opacity: interpolate(verticalScrollY.value, [SNAP_1 + 100, SNAP_2], [0, 1], Extrapolate.CLAMP),
    transform: [{ translateY: HEADER_TABS[0] }]
  }));
  const dateTabStyle = useAnimatedStyle(() => ({
    opacity: interpolate(verticalScrollY.value, [SNAP_2 + 100, SNAP_3], [0, 1], Extrapolate.CLAMP),
    transform: [{ translateY: HEADER_TABS[0] + HEADER_TABS[1] }]
  }));
  const timeTabStyle = useAnimatedStyle(() => ({
    opacity: interpolate(verticalScrollY.value, [SNAP_3 + 100, SNAP_4], [0, 1], Extrapolate.CLAMP),
    transform: [{ translateY: HEADER_TABS[0] + HEADER_TABS[1] + HEADER_TABS[2] }]
  }));

  // BACKGROUND PINNING ANIMATIONS
  const bgPin1Style = useAnimatedStyle(() => ({
    backgroundColor: SPORTS[activeSportIndex].bg,
  }));
  const bgPin2Style = useAnimatedStyle(() => {
    const ty = interpolate(verticalScrollY.value, [SNAP_1, SNAP_4], [SNAP_1, SNAP_4], Extrapolate.CLAMP);
    return {
      backgroundColor: '#00ea6b',
      transform: [{ translateY: ty }],
      zIndex: 1,
    };
  });
  const bgPin3Style = useAnimatedStyle(() => {
    const ty = interpolate(verticalScrollY.value, [SNAP_2, SNAP_4], [SNAP_2, SNAP_4], Extrapolate.CLAMP);
    return {
      backgroundColor: '#FFFFFF',
      transform: [{ translateY: ty }],
      zIndex: 2,
    };
  });

  const dots1Opacity = useAnimatedStyle(() => ({ opacity: interpolate(verticalScrollY.value, [0, SNAP_1 * 0.4], [1, 0], Extrapolate.CLAMP) }));
  const dots2Opacity = useAnimatedStyle(() => ({ opacity: interpolate(verticalScrollY.value, [SNAP_1, SNAP_1 + (SNAP_2 - SNAP_1) * 0.4], [1, 0], Extrapolate.CLAMP) }));
  const dots3Opacity = useAnimatedStyle(() => ({ opacity: interpolate(verticalScrollY.value, [SNAP_2, SNAP_2 + (SNAP_3 - SNAP_2) * 0.4], [1, 0], Extrapolate.CLAMP) }));
  const dots4Opacity = useAnimatedStyle(() => ({ opacity: interpolate(verticalScrollY.value, [SNAP_3, SNAP_3 + (SNAP_4 - SNAP_3) * 0.4], [1, 0], Extrapolate.CLAMP) }));

  const sport = SPORTS[activeSportIndex];
  const loc = LOCATIONS[activeLocIndex];
  const date = dates[activeDateIndex];
  const time = TIME_SLOTS[activeTimeIndex];

  const groundChunks = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < grounds.length; i += 4) {
      chunks.push(grounds.slice(i, i + 4));
    }
    return chunks;
  }, [grounds]);

  return (
    <View style={styles.container}>
      {/* PERSISTENT BACKGROUND STACK */}
      <Animated.View style={[StyleSheet.absoluteFill, bgPin1Style]} />
      {/* Subsequent backgrounds pin themselves as they arrive */}
      <Animated.View style={[styles.bgPin, bgPin2Style]} />
      <Animated.View style={[styles.bgPin, bgPin3Style]} />

      <View style={[styles.headerOverlay, { paddingTop: insets.top }]}>
        <Animated.View style={[styles.headerTab, sportTabStyle, { height: HEADER_TABS[0], backgroundColor: sport.bg }]}>
          <View style={styles.centerRow}><sport.icon size={20} color="#00ea6b" /><Text style={styles.tabText}>{sport.name}</Text></View>
        </Animated.View>
        <Animated.View style={[styles.headerTab, locTabStyle, { height: HEADER_TABS[1], backgroundColor: '#00ea6b' }]}>
          <View style={styles.centerRow}><Text style={styles.tabTextSmall}>{loc.name}</Text></View>
        </Animated.View>
        <Animated.View style={[styles.headerTab, dateTabStyle, { height: HEADER_TABS[2], backgroundColor: '#FFFFFF' }]}>
          <View style={styles.centerRow}><Text style={styles.tabTextSmall}>{date.short}</Text></View>
        </Animated.View>
        <Animated.View style={[styles.headerTab, timeTabStyle, { height: HEADER_TABS[3], backgroundColor: '#F1F5F9' }]}>
          <View style={styles.centerRow}><Text style={styles.tabTextSmall}>{time}</Text></View>
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
          <ScrollView horizontal pagingEnabled onScroll={(e) => setActiveSportIndex(Math.round(e.nativeEvent.contentOffset.x / width))} scrollEventThrottle={16}>
            {SPORTS.map((item) => (
              <View key={item.id} style={styles.slide}>
                <View style={styles.iconCircle}><item.icon size={80} color="#00ea6b" /></View>
                <Text style={styles.heroName}>{item.name}</Text>
                <View style={styles.swipeHint}><ChevronUp size={24} color="#00ea6b" /><Text style={styles.swipeHintText}>Swipe up</Text></View>
              </View>
            ))}
          </ScrollView>
          <Animated.View style={[styles.dotContainerAbsolute, dots1Opacity]}>
            {SPORTS.map((_, i) => (
              <View key={i} style={[styles.dotLight, activeSportIndex === i && styles.activeDotLight]} />
            ))}
          </Animated.View>
        </View>

        <View style={{ height: height - HEADER_TABS[0] - insets.top }}>
          <View style={[styles.pageCard, { backgroundColor: '#00ea6b' }]}>
            <ScrollView horizontal pagingEnabled onScroll={(e) => setActiveLocIndex(Math.round(e.nativeEvent.contentOffset.x / width))} scrollEventThrottle={16}>
              {LOCATIONS.map((l) => (
                <View key={l.id} style={styles.slide}>
                  <View style={styles.iconCircleSmall}><MapPin size={40} color="#043529" /></View>
                  <Text style={[styles.heroName, { color: '#043529' }]}>{l.name}</Text>
                </View>
              ))}
            </ScrollView>
            <Animated.View style={[styles.dotContainerAbsolute, dots2Opacity]}>
              {LOCATIONS.map((_, i) => (
                <View key={i} style={[styles.dotDark, activeLocIndex === i && styles.activeDotDark]} />
              ))}
            </Animated.View>
          </View>
        </View>

        <View style={{ height: height - (HEADER_TABS[0] + HEADER_TABS[1]) - insets.top }}>
          <View style={[styles.pageCard, { backgroundColor: '#FFFFFF' }]}>
            <ScrollView horizontal pagingEnabled onScroll={(e) => setActiveDateIndex(Math.round(e.nativeEvent.contentOffset.x / width))} scrollEventThrottle={16}>
              {dates.map((d) => (
                <View key={d.id} style={styles.slide}>
                  <View style={styles.iconCircleSmall}><Calendar size={40} color="#043529" /></View>
                  <Text style={[styles.heroName, { color: '#0F172A' }]}>{d.label}</Text>
                </View>
              ))}
            </ScrollView>
            <Animated.View style={[styles.dotContainerAbsolute, dots3Opacity]}>
              {dates.slice(0, 5).map((_, i) => (
                <View key={i} style={[styles.dotDark, activeDateIndex === i && styles.activeDotDark]} />
              ))}
            </Animated.View>
          </View>
        </View>

        <View style={{ height: height - (HEADER_TABS[0] + HEADER_TABS[1] + HEADER_TABS[2]) - insets.top }}>
          <View style={[styles.pageCard, { backgroundColor: '#F1F5F9' }]}>
            <ScrollView horizontal pagingEnabled onScroll={(e) => setActiveTimeIndex(Math.round(e.nativeEvent.contentOffset.x / width))} scrollEventThrottle={16}>
              {TIME_SLOTS.map((t) => (
                <View key={t} style={styles.slide}>
                  <View style={styles.iconCircleSmall}><Clock size={40} color="#043529" /></View>
                  <Text style={[styles.heroName, { color: '#0F172A' }]}>{t}</Text>
                </View>
              ))}
            </ScrollView>
            <Animated.View style={[styles.dotContainerAbsolute, dots4Opacity]}>
              {TIME_SLOTS.map((_, i) => (
                <View key={i} style={[styles.dotDark, activeTimeIndex === i && styles.activeDotDark]} />
              ))}
            </Animated.View>
          </View>
        </View>

        <View style={{ height: height - (HEADER_TABS.reduce((a,b)=>a+b, 0)) - insets.top }}>
          <View style={[styles.pageCard, { backgroundColor: '#FFFFFF' }]}>
            {loadingGrounds ? (
              <ActivityIndicator size="large" color="#00ea6b" style={{ flex: 1 }} />
            ) : groundChunks.length > 0 ? (
              <>
                <ScrollView horizontal pagingEnabled onScroll={(e) => setActiveResultPage(Math.round(e.nativeEvent.contentOffset.x / width))} scrollEventThrottle={16}>
                  {groundChunks.map((chunk, idx) => (
                    <View key={idx} style={styles.slide}>
                      <View style={styles.resultsGrid}>
                        {chunk.map((g) => (
                          <GroundCardSmall key={g.id} ground={g} />
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.dotContainerAbsolute}>
                  {groundChunks.map((_, i) => (
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
  fullPage: { width: width, height: height },
  bgPin: { position: 'absolute', top: 0, left: 0, right: 0, height: height },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, pointerEvents: 'box-none' },
  headerTab: { position: 'absolute', left: 0, right: 0, justifyContent: 'center', borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  centerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  tabText: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  tabTextSmall: { fontSize: 16, fontWeight: '900', color: '#043529' },
  slide: { width: width, alignItems: 'center', justifyContent: 'center', padding: 20 },
  iconCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  iconCircleSmall: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  heroName: { fontSize: 38, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' },
  pageCard: { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  swipeHint: { marginTop: 30, alignItems: 'center' },
  swipeHintText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  resultsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, padding: 10, width: '100%', marginTop: -40 },
  miniCard: { width: '48%', backgroundColor: '#F8FAFC', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  miniCardImage: { width: '100%', height: 100 },
  miniCardContent: { padding: 8 },
  miniCardName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  miniCardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  miniCardLoc: { fontSize: 10, color: '#64748B' },
  miniCardPrice: { fontSize: 13, fontWeight: '900', color: '#00ea6b', marginTop: 6 },
  noResults: { fontSize: 18, color: '#94A3B8', fontWeight: '700' },
  dotContainerAbsolute: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dotLight: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  activeDotLight: { backgroundColor: '#00ea6b', width: 24 },
  dotDark: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(4,53,41,0.1)' },
  activeDotDark: { backgroundColor: '#043529', width: 24 },
});
