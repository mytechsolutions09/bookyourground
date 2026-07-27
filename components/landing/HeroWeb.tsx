import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useIsCompact } from '@/hooks/useIsCompact';
import { useHasMounted } from '@/hooks/useHasMounted';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Platform,
  useWindowDimensions,
  Pressable,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  DeviceEventEmitter,
} from 'react-native';
import {
  MapPin,
  Calendar as CalendarIcon,
  Clock,
  ChevronDown,
  ShieldCheck,
  Trophy,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CloudRain,
  ArrowRight,
  Users,
  Percent,
  Headphones,
  Star,
  Building2,
  Search,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import Svg, { Rect, Line, Circle, Path } from 'react-native-svg';

// ─── Sport Icons ────────────────────────────────────────────────────────────

const GroundIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2" y="4" width="20" height="16" rx="2" />
    <Line x1="12" y1="4" x2="12" y2="20" />
    <Circle cx="12" cy="12" r="3" />
    <Path d="M 2 8 h 3 v 8 h -3" />
    <Path d="M 22 8 h -3 v 8 h 3" />
  </Svg>
);

const TurfIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    <Path d="M12 6 l -3 2 v 4 l 3 2 l 3 -2 v -4 Z" />
    <Path d="M9 8.3L5.5 6M15 8.3l3.5-2.3M9 13.7l-3.5 2.3M15 13.7l3.5 2.3" />
  </Svg>
);

const AllSportsIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="3" width="7" height="7" rx="1.5" />
    <Rect x="14" y="3" width="7" height="7" rx="1.5" />
    <Rect x="14" y="14" width="7" height="7" rx="1.5" />
    <Rect x="3" y="14" width="7" height="7" rx="1.5" />
  </Svg>
);

// ─── Types ───────────────────────────────────────────────────────────────────

type LocationOption = { key: string; city: string; state: string };

// ─── Component ───────────────────────────────────────────────────────────────

export default function HeroWeb() {
  const isMobile = useIsCompact();
  const hasMounted = useHasMounted();
  const { width, height } = useWindowDimensions();

  // ── Data state ────────────────────────────────────────────────────────────
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [groundTypes, setGroundTypes] = useState<{ name: string; label: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [totalVenues, setTotalVenues] = useState(85);
  const [searchTab, setSearchTab] = useState<'grounds' | 'nets' | 'all'>('grounds');
  const [viewDate, setViewDate] = useState(new Date());

  // ── Dropdown open state ───────────────────────────────────────────────────
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);

  // ── Scroll animation ──────────────────────────────────────────────────────
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('mainScroll', ({ y }) => {
      scrollY.setValue(y);
    });
    return () => sub.remove();
  }, [scrollY]);

  // Background slowly zooms in and drifts up (parallax)
  const bgScale = scrollY.interpolate({ inputRange: [0, 600], outputRange: [1, 1.18], extrapolate: 'clamp' });
  const bgTranslateY = scrollY.interpolate({ inputRange: [0, 600], outputRange: [0, 100], extrapolate: 'clamp' });

  // Headline fades out and floats up
  const headlineOpacity = scrollY.interpolate({ inputRange: [0, 250], outputRange: [1, 0], extrapolate: 'clamp' });
  const headlineTranslateY = scrollY.interpolate({ inputRange: [0, 300], outputRange: [0, -60], extrapolate: 'clamp' });

  // Search pill lags slightly behind the headline (subtle delay effect)
  const searchOpacity = scrollY.interpolate({ inputRange: [0, 320], outputRange: [1, 0], extrapolate: 'clamp' });
  const searchTranslateY = scrollY.interpolate({ inputRange: [0, 360], outputRange: [0, -40], extrapolate: 'clamp' });

  // Stats badges drift upward slightly later
  const statsOpacity = scrollY.interpolate({ inputRange: [50, 380], outputRange: [1, 0], extrapolate: 'clamp' });
  const statsTranslateY = scrollY.interpolate({ inputRange: [0, 400], outputRange: [0, -30], extrapolate: 'clamp' });

  // Bottom bar slides down and vanishes
  const barOpacity = scrollY.interpolate({ inputRange: [0, 160], outputRange: [1, 0], extrapolate: 'clamp' });
  const barTranslateY = scrollY.interpolate({ inputRange: [0, 160], outputRange: [0, 24], extrapolate: 'clamp' });

  // Overlay darkens slightly as you scroll (cinematic depth)
  const overlayOpacity = scrollY.interpolate({ inputRange: [0, 400], outputRange: [0.55, 0.78], extrapolate: 'clamp' });

  // ── Data fetching ─────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('locations').select('city, state').eq('active', true).order('city')
      .then(({ data }) => {
        if (data) setLocations(data.map(l => ({ key: `${l.city}__${l.state}`, city: l.city, state: l.state })));
      });
    supabase.from('grounds').select('*', { count: 'exact', head: true })
      .then(({ count }) => { if (count) setTotalVenues(count); });
    supabase.from('ground_types').select('name, label').eq('active', true).order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (data) {
          const types = [...data];
          if (!types.some(t => t.name.toLowerCase() === 'nets')) types.push({ name: 'Nets', label: 'Nets' });
          setGroundTypes(types);
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedLocation || !selectedDate || !selectedType) { setAvailableTimes([]); return; }
    setLoadingTimes(true);
    const [city, state] = selectedLocation.split('__');
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    supabase.from('grounds').select('id').eq('city', city).eq('state', state).eq('pitch_type', selectedType).eq('active', true)
      .then(async ({ data: grounds }) => {
        if (!grounds?.length) { setAvailableTimes([]); setLoadingTimes(false); return; }
        const { data: slots } = await supabase.from('time_slots').select('start_time')
          .in('ground_id', grounds.map(g => g.id)).eq('day_of_week', dayOfWeek).eq('is_available', true);
        setAvailableTimes(slots ? Array.from(new Set(slots.map(s => s.start_time.slice(0, 5)))).sort() : []);
        setLoadingTimes(false);
      });
  }, [selectedLocation, selectedDate, selectedType]);

  // ── Outside click handler ─────────────────────────────────────────────────
  const formRef = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: MouseEvent) => {
      if (isLocationOpen || isTypeOpen || isDateOpen || isTimeOpen) {
        // @ts-ignore
        if (formRef.current && !formRef.current.contains(e.target as Node)) closeAll();
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [isLocationOpen, isTypeOpen, isDateOpen, isTimeOpen]);

  const closeAll = () => { setIsLocationOpen(false); setIsTypeOpen(false); setIsDateOpen(false); setIsTimeOpen(false); };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isSearchEnabled = !!selectedLocation && !!selectedType && !!selectedDate && !!selectedTime;
  const formatDate = (d: Date | null) => d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Select Date';

  const calendarDays = useMemo(() => {
    const y = viewDate.getFullYear(), m = viewDate.getMonth();
    const days: (number | null)[] = [];
    for (let i = 0; i < new Date(y, m, 1).getDay(); i++) days.push(null);
    for (let i = 1; i <= new Date(y, m + 1, 0).getDate(); i++) days.push(i);
    return days;
  }, [viewDate]);

  const handleSearch = () => {
    const params: any = {};
    if (selectedLocation) params.location = selectedLocation;
    if (selectedType) params.type = selectedType;
    if (selectedDate) params.date = selectedDate.toISOString().split('T')[0];
    if (selectedTime) params.time = selectedTime;
    router.push({ pathname: '/search', params });
  };

  const handleTabChange = (tab: 'grounds' | 'nets' | 'all') => {
    setSearchTab(tab);
    setSelectedType(tab === 'grounds' ? 'Cricket Ground' : tab === 'nets' ? 'Nets' : '');
  };

  const stats = [
    { icon: <Users size={14} color="#00E676" />, value: '50K+', label: 'Players' },
    { icon: <Trophy size={14} color="#00E676" />, value: `${totalVenues * 50}+`, label: 'Venues' },
    { icon: <Star size={14} color="#00E676" fill="#00E676" />, value: '4.9★', label: 'Rating' },
    { icon: <Building2 size={14} color="#00E676" />, value: '100+', label: 'Cities' },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>

      {/* ── Parallax Background ─────────────────────────────────────────── */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ scale: bgScale }, { translateY: bgTranslateY }] }]}>
        <ImageBackground
          source={require('@/assets/hero.png')}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      </Animated.View>

      {/* ── Cinematic Overlay (gradient + animated darkening) ───────────── */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: overlayOpacity, backgroundColor: '#000' }]} />
      {/* Bottom-to-top gradient for depth */}
      <View style={styles.gradientBottom} />
      {/* Top vignette */}
      <View style={styles.gradientTop} />

      {/* ── Close dropdowns on outside click ────────────────────────────── */}
      {(isLocationOpen || isTypeOpen || isDateOpen || isTimeOpen) && (
        <Pressable style={StyleSheet.absoluteFill} onPress={closeAll} />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT
      ══════════════════════════════════════════════════════════════════ */}
      {!isMobile ? (
        <View style={styles.desktopWrapper}>

          {/* ── HEADLINE ─────────────────────────────────────────────── */}
          <Animated.View style={[styles.headlineBlock, { opacity: headlineOpacity, transform: [{ translateY: headlineTranslateY }] }]}>
            {/* Category pills */}
            <View style={styles.categoryRow}>
              {(['grounds', 'nets', 'all'] as const).map((tab) => {
                const labels = { grounds: 'Grounds', nets: 'Nets', all: 'All Sports' };
                const icons = {
                  grounds: <GroundIcon size={13} color={searchTab === tab ? '#031713' : '#94A3B8'} />,
                  nets: <TurfIcon size={13} color={searchTab === tab ? '#031713' : '#94A3B8'} />,
                  all: <AllSportsIcon size={13} color={searchTab === tab ? '#031713' : '#94A3B8'} />,
                };
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.categoryPill, searchTab === tab && styles.categoryPillActive]}
                    onPress={() => handleTabChange(tab)}
                  >
                    {icons[tab]}
                    <Text style={[styles.categoryPillText, searchTab === tab && styles.categoryPillTextActive]}>
                      {labels[tab]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Main heading */}
            <Text style={styles.headline} accessibilityRole="header" aria-level={1}>
              Play Hard.{'\n'}<Text style={styles.headlineAccent}>Book Easy.</Text>
            </Text>
            <Text style={styles.subtitle}>
              Find & book premium cricket grounds, turfs, and nets in seconds.{'\n'}Real-time availability · Instant confirmation.
            </Text>
          </Animated.View>

          {/* ── HORIZONTAL SEARCH PILL ───────────────────────────────── */}
          <Animated.View
            ref={formRef as any}
            style={[styles.searchPillOuter, { opacity: searchOpacity, transform: [{ translateY: searchTranslateY }] }]}
          >
            <View style={styles.searchPillInner}>

              {/* Location */}
              <View style={[styles.pillField, { zIndex: isLocationOpen ? 400 : 10 }]}>
                <Text style={styles.pillFieldLabel}>LOCATION</Text>
                <Pressable
                  style={[styles.pillFieldContent, isLocationOpen && styles.pillFieldContentActive]}
                  onPress={() => { setIsLocationOpen(!isLocationOpen); setIsTypeOpen(false); setIsDateOpen(false); setIsTimeOpen(false); }}
                >
                  <MapPin size={16} color="#00E676" />
                  <Text style={[styles.pillFieldText, !selectedLocation && styles.pillFieldPlaceholder]} numberOfLines={1}>
                    {selectedLocation ? selectedLocation.split('__')[0] : 'City or Area'}
                  </Text>
                  <ChevronDown size={14} color="rgba(255,255,255,0.4)" />
                </Pressable>
                {isLocationOpen && (
                  <View style={[styles.pillDropdown, { top: 64 }]}>
                    <ScrollView style={{ maxHeight: 200 }}>
                      {locations.map(loc => (
                        <Pressable key={loc.key} style={styles.dropdownItem}
                          onPress={() => { setSelectedLocation(loc.key); setIsLocationOpen(false); setSelectedTime(''); }}>
                          <Text style={styles.dropdownItemText}>{loc.city}, {loc.state}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.pillDivider} />

              {/* Venue Type */}
              <View style={[styles.pillField, { zIndex: isTypeOpen ? 400 : 10 }]}>
                <Text style={styles.pillFieldLabel}>VENUE TYPE</Text>
                <Pressable
                  style={[styles.pillFieldContent, isTypeOpen && styles.pillFieldContentActive]}
                  onPress={() => { setIsTypeOpen(!isTypeOpen); setIsLocationOpen(false); setIsDateOpen(false); setIsTimeOpen(false); }}
                >
                  <Trophy size={16} color="#00E676" />
                  <Text style={[styles.pillFieldText, !selectedType && styles.pillFieldPlaceholder]} numberOfLines={1}>
                    {selectedType ? (groundTypes.find(t => t.name === selectedType)?.label || selectedType) : 'All Types'}
                  </Text>
                  <ChevronDown size={14} color="rgba(255,255,255,0.4)" />
                </Pressable>
                {isTypeOpen && (
                  <View style={[styles.pillDropdown, { top: 64 }]}>
                    <ScrollView style={{ maxHeight: 200 }}>
                      {groundTypes.map(type => (
                        <Pressable key={type.name} style={styles.dropdownItem}
                          onPress={() => { setSelectedType(type.name); setIsTypeOpen(false); setSelectedTime(''); }}>
                          <Text style={styles.dropdownItemText}>{type.label}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.pillDivider} />

              {/* Date */}
              <View style={[styles.pillField, { zIndex: isDateOpen ? 400 : 10 }]}>
                <Text style={styles.pillFieldLabel}>DATE</Text>
                <Pressable
                  style={[styles.pillFieldContent, isDateOpen && styles.pillFieldContentActive]}
                  onPress={() => { setIsDateOpen(!isDateOpen); setIsLocationOpen(false); setIsTypeOpen(false); setIsTimeOpen(false); }}
                >
                  <CalendarIcon size={16} color="#00E676" />
                  <Text style={[styles.pillFieldText, !selectedDate && styles.pillFieldPlaceholder]}>
                    {formatDate(selectedDate)}
                  </Text>
                </Pressable>
                {isDateOpen && (
                  <View style={[styles.pillDropdown, { top: 64, width: 280 }]}>
                    <View style={styles.calHeader}>
                      <TouchableOpacity onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} style={styles.calNav}>
                        <ChevronLeft size={15} color="#fff" />
                      </TouchableOpacity>
                      <Text style={styles.calMonthTitle}>
                        {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </Text>
                      <TouchableOpacity onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} style={styles.calNav}>
                        <ChevronRight size={15} color="#fff" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.calWeekdays}>
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                        <Text key={d} style={styles.calWeekdayText}>{d}</Text>
                      ))}
                    </View>
                    <View style={styles.calGrid}>
                      {calendarDays.map((day, idx) => {
                        const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === viewDate.getMonth() && selectedDate.getFullYear() === viewDate.getFullYear();
                        const today = new Date(); today.setHours(0, 0, 0, 0);
                        const isPast = day ? new Date(viewDate.getFullYear(), viewDate.getMonth(), day) < today : false;
                        return (
                          <Pressable
                            key={idx}
                            style={[styles.calDay, isSelected && styles.calDaySelected, (!day || isPast) && styles.calDayEmpty, isPast && { opacity: 0.25 }]}
                            onPress={() => { if (day && !isPast) { setSelectedDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day)); setIsDateOpen(false); setSelectedTime(''); } }}
                            disabled={!day || isPast}
                          >
                            <Text style={[styles.calDayText, isSelected && styles.calDayTextSelected]}>{day}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.pillDivider} />

              {/* Time */}
              <View style={[styles.pillField, { zIndex: isTimeOpen ? 400 : 10 }]}>
                <Text style={styles.pillFieldLabel}>TIME</Text>
                <Pressable
                  style={[styles.pillFieldContent, isTimeOpen && styles.pillFieldContentActive]}
                  onPress={() => { setIsTimeOpen(!isTimeOpen); setIsLocationOpen(false); setIsTypeOpen(false); setIsDateOpen(false); }}
                  disabled={!selectedLocation || !selectedDate}
                >
                  <Clock size={16} color="#00E676" />
                  <Text style={[styles.pillFieldText, !selectedTime && styles.pillFieldPlaceholder]}>
                    {selectedTime || 'Any Time'}
                  </Text>
                  {loadingTimes && <ActivityIndicator size="small" color="#00E676" />}
                </Pressable>
                {isTimeOpen && selectedLocation && selectedDate && (
                  <View style={[styles.pillDropdown, { top: 64 }]}>
                    <ScrollView style={{ maxHeight: 200 }}>
                      {availableTimes.length > 0 ? availableTimes.map(time => {
                        const isToday = selectedDate?.toDateString() === new Date().toDateString();
                        let isPast = false;
                        if (isToday) {
                          const [h, m] = time.split(':').map(Number);
                          const slot = new Date(); slot.setHours(h, m, 0, 0);
                          isPast = slot < new Date();
                        }
                        return (
                          <Pressable key={time} style={styles.dropdownItem} onPress={() => { if (!isPast) { setSelectedTime(time); setIsTimeOpen(false); } }} disabled={isPast}>
                            <Text style={[styles.dropdownItemText, isPast && { color: '#475569' }]}>{time}{isPast ? ' (Passed)' : ''}</Text>
                          </Pressable>
                        );
                      }) : (
                        <View style={{ padding: 16, alignItems: 'center' }}>
                          <Text style={{ color: '#94A3B8', fontSize: 13 }}>No slots available</Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Search Button */}
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
                <Search size={18} color="#031713" strokeWidth={2.5} />
                <Text style={styles.searchBtnText}>Search</Text>
              </TouchableOpacity>

            </View>
          </Animated.View>

          {/* ── STAT BADGES ──────────────────────────────────────────── */}
          <Animated.View style={[styles.statsRow, { opacity: statsOpacity, transform: [{ translateY: statsTranslateY }] }]}>
            {stats.map((s, i) => (
              <View key={i} style={styles.statBadge}>
                {s.icon}
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </Animated.View>

        </View>
      ) : (
        /* ══════════════════════════════════════════════════════════════
            MOBILE LAYOUT
        ══════════════════════════════════════════════════════════════ */
        <View style={styles.mobileWrapper}>
          <Text style={styles.mobileHeadline} accessibilityRole="header" aria-level={1}>
            Play Hard.{'\n'}<Text style={styles.headlineAccent}>Book Easy.</Text>
          </Text>
          <Text style={styles.mobileSubtitle}>Find & book premium sports venues instantly.</Text>

          <View ref={formRef} style={styles.mobileFormCard}>
            {/* Location */}
            <View style={{ position: 'relative', zIndex: isLocationOpen ? 300 : 1 }}>
              <Pressable style={styles.mobileField} onPress={() => { setIsLocationOpen(!isLocationOpen); setIsTypeOpen(false); setIsDateOpen(false); setIsTimeOpen(false); }}>
                <MapPin size={18} color="#00E676" />
                <Text style={[styles.mobileFieldText, !selectedLocation && styles.mobileFieldPlaceholder]}>
                  {selectedLocation ? selectedLocation.split('__')[0] : 'Location'}
                </Text>
                <ChevronDown size={14} color="rgba(255,255,255,0.4)" />
              </Pressable>
              {isLocationOpen && (
                <View style={styles.mobileDropdown}>
                  <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                    {locations.map(loc => (
                      <Pressable key={loc.key} style={styles.dropdownItem}
                        onPress={() => { setSelectedLocation(loc.key); setIsLocationOpen(false); setSelectedTime(''); }}>
                        <Text style={styles.dropdownItemText}>{loc.city}, {loc.state}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Venue Type */}
            <View style={{ position: 'relative', zIndex: isTypeOpen ? 300 : 1 }}>
              <Pressable style={styles.mobileField} onPress={() => { setIsTypeOpen(!isTypeOpen); setIsLocationOpen(false); setIsDateOpen(false); setIsTimeOpen(false); }}>
                <Trophy size={18} color="#00E676" />
                <Text style={[styles.mobileFieldText, !selectedType && styles.mobileFieldPlaceholder]}>
                  {selectedType ? (groundTypes.find(t => t.name === selectedType)?.label || selectedType) : 'Venue Type'}
                </Text>
                <ChevronDown size={14} color="rgba(255,255,255,0.4)" />
              </Pressable>
              {isTypeOpen && (
                <View style={styles.mobileDropdown}>
                  <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                    {groundTypes.map(type => (
                      <Pressable key={type.name} style={styles.dropdownItem}
                        onPress={() => { setSelectedType(type.name); setIsTypeOpen(false); setSelectedTime(''); }}>
                        <Text style={styles.dropdownItemText}>{type.label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Date */}
            <View style={{ position: 'relative', zIndex: isDateOpen ? 300 : 1 }}>
              <Pressable style={styles.mobileField} onPress={() => { setIsDateOpen(!isDateOpen); setIsLocationOpen(false); setIsTypeOpen(false); setIsTimeOpen(false); }}>
                <CalendarIcon size={18} color="#00E676" />
                <Text style={[styles.mobileFieldText, !selectedDate && styles.mobileFieldPlaceholder]}>{formatDate(selectedDate)}</Text>
              </Pressable>
              {isDateOpen && (
                <View style={[styles.mobileDropdown, { zIndex: 1100 }]}>
                  <View style={styles.calHeader}>
                    <TouchableOpacity onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} style={styles.calNav}><ChevronLeft size={15} color="#fff" /></TouchableOpacity>
                    <Text style={styles.calMonthTitle}>{viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
                    <TouchableOpacity onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} style={styles.calNav}><ChevronRight size={15} color="#fff" /></TouchableOpacity>
                  </View>
                  <View style={styles.calWeekdays}>
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <Text key={d} style={styles.calWeekdayText}>{d}</Text>)}
                  </View>
                  <View style={styles.calGrid}>
                    {calendarDays.map((day, idx) => {
                      const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === viewDate.getMonth() && selectedDate.getFullYear() === viewDate.getFullYear();
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      const isPast = day ? new Date(viewDate.getFullYear(), viewDate.getMonth(), day) < today : false;
                      return (
                        <Pressable key={idx}
                          style={[styles.calDay, isSelected && styles.calDaySelected, (!day || isPast) && styles.calDayEmpty, isPast && { opacity: 0.25 }]}
                          onPress={() => { if (day && !isPast) { setSelectedDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day)); setIsDateOpen(false); setSelectedTime(''); } }}
                          disabled={!day || isPast}>
                          <Text style={[styles.calDayText, isSelected && styles.calDayTextSelected]}>{day}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {/* Time */}
            <View style={{ position: 'relative', zIndex: isTimeOpen ? 300 : 1 }}>
              <Pressable style={styles.mobileField}
                onPress={() => { setIsTimeOpen(!isTimeOpen); setIsLocationOpen(false); setIsTypeOpen(false); setIsDateOpen(false); }}
                disabled={!selectedLocation || !selectedDate}>
                <Clock size={18} color="#00E676" />
                <Text style={[styles.mobileFieldText, !selectedTime && styles.mobileFieldPlaceholder]}>{selectedTime || 'Select Time'}</Text>
                {loadingTimes && <ActivityIndicator size="small" color="#00E676" />}
              </Pressable>
              {isTimeOpen && selectedLocation && selectedDate && (
                <View style={styles.mobileDropdown}>
                  <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                    {availableTimes.length > 0 ? availableTimes.map(time => (
                      <Pressable key={time} style={styles.dropdownItem} onPress={() => { setSelectedTime(time); setIsTimeOpen(false); }}>
                        <Text style={styles.dropdownItemText}>{time}</Text>
                      </Pressable>
                    )) : (
                      <View style={{ padding: 16, alignItems: 'center' }}>
                        <Text style={{ color: '#94A3B8', fontSize: 13 }}>No slots available</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Mobile Search Button */}
            <TouchableOpacity
              style={[styles.mobileSearchBtn, isSearchEnabled && styles.mobileSearchBtnActive]}
              onPress={handleSearch}
              disabled={!isSearchEnabled}
              activeOpacity={0.85}
            >
              <Search size={18} color={isSearchEnabled ? '#031713' : 'rgba(255,255,255,0.4)'} strokeWidth={2.5} />
              <Text style={[styles.mobileSearchBtnText, { color: isSearchEnabled ? '#031713' : 'rgba(255,255,255,0.4)' }]}>
                Search Venues
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          BOTTOM GREEN BAR (desktop only)
      ══════════════════════════════════════════════════════════════════ */}
      {!isMobile && (
        <Animated.View style={[styles.bottomBar, { opacity: barOpacity, transform: [{ translateY: barTranslateY }] }]}>
          {[
            { icon: <CalendarIcon size={18} color="#031713" />, title: 'Real-Time Availability', desc: 'Live slots, no surprises' },
            { icon: <Percent size={18} color="#031713" />, title: 'Best Price Guaranteed', desc: 'No hidden charges ever' },
            { icon: <Headphones size={18} color="#031713" />, title: '24/7 Support', desc: 'Always here for you' },
            { icon: <ShieldCheck size={18} color="#031713" />, title: '100% Verified Venues', desc: 'Safe & trusted grounds' },
          ].map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={styles.barDivider} />}
              <View style={styles.barItem}>
                <View style={styles.barIconWrap}>{item.icon}</View>
                <View>
                  <Text style={styles.barTitle}>{item.title}</Text>
                  <Text style={styles.barDesc}>{item.desc}</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: '100%',
    minHeight: 600,
    backgroundColor: '#020e0b',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Vignette overlays
  gradientBottom: {
    ...StyleSheet.absoluteFillObject,
    top: '50%',
    ...Platform.select({
      web: { background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' } as any,
      default: { backgroundColor: 'transparent' },
    }),
  },
  gradientTop: {
    ...StyleSheet.absoluteFillObject,
    bottom: '70%',
    ...Platform.select({
      web: { background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)' } as any,
      default: { backgroundColor: 'transparent' },
    }),
  },

  // ── Desktop ──────────────────────────────────────────────────────────────
  desktopWrapper: {
    width: '100%',
    maxWidth: 1100,
    paddingHorizontal: 24,
    alignItems: 'center',
    zIndex: 200,
    paddingTop: 32,
    paddingBottom: 100,
  },

  // Category pills row
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 40,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 40,
  },
  categoryPillActive: {
    backgroundColor: '#00E676',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  categoryPillTextActive: {
    color: '#031713',
  },

  // Headline block
  headlineBlock: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headline: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -2.5,
    lineHeight: 80,
    marginBottom: 18,
    ...Platform.select({
      web: { textShadow: '0 0 80px rgba(0,230,118,0.15), 0 4px 40px rgba(0,0,0,0.5)' } as any,
    }),
  },
  headlineAccent: {
    color: '#00E676',
    ...Platform.select({
      web: { textShadow: '0 0 60px rgba(0,230,118,0.45)' } as any,
    }),
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    maxWidth: 540,
  },

  // ── Horizontal Search Pill ────────────────────────────────────────────────
  searchPillOuter: {
    width: '100%',
    marginBottom: 24,
    zIndex: 300,
  },
  searchPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 32, 24, 0.88)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 230, 118, 0.28)',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 0,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,230,118,0.08)',
      } as any,
    }),
  },
  pillField: {
    flex: 1,
    position: 'relative',
    paddingHorizontal: 4,
  },
  pillFieldLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.3,
    marginBottom: 4,
    paddingLeft: 12,
  },
  pillFieldContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  pillFieldContentActive: {
    backgroundColor: 'rgba(0,230,118,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.35)',
  },
  pillFieldText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pillFieldPlaceholder: {
    color: 'rgba(255,255,255,0.38)',
    fontWeight: '500',
  },
  pillDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 2,
  },

  // Search button (inside pill)
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E676',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
    marginLeft: 6,
    ...Platform.select({
      web: { boxShadow: '0 0 24px rgba(0,230,118,0.4)' } as any,
    }),
  },
  searchBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#031713',
    letterSpacing: 0.3,
  },

  // Dropdown
  pillDropdown: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#041a12',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.25)',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        backdropFilter: 'blur(20px)',
      } as any,
    }),
    zIndex: 1000,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '500',
  },

  // Stat badges row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 40,
    paddingHorizontal: 16,
    paddingVertical: 9,
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)' } as any,
    }),
  },
  statValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },

  // ── Bottom Green Bar ──────────────────────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 20,
    left: 24,
    right: 24,
    flexDirection: 'row',
    backgroundColor: '#00E676',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
    ...Platform.select({
      web: { boxShadow: '0 8px 40px rgba(0,230,118,0.35)' } as any,
    }),
  },
  barItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  barIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(3,23,19,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#031713',
  },
  barDesc: {
    fontSize: 10,
    color: 'rgba(3,23,19,0.65)',
    fontWeight: '500',
  },
  barDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(3,23,19,0.15)',
    marginHorizontal: 12,
  },

  // ── Calendar ──────────────────────────────────────────────────────────────
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  calNav: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calMonthTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  calWeekdays: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  calWeekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 6,
  },
  calDay: {
    width: '14.28%',
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  calDaySelected: {
    backgroundColor: '#00E676',
  },
  calDayEmpty: {
    opacity: 0,
  },
  calDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  calDayTextSelected: {
    color: '#031713',
    fontWeight: '900',
  },

  // ── Mobile ────────────────────────────────────────────────────────────────
  mobileWrapper: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 40,
    alignItems: 'center',
    zIndex: 200,
  },
  mobileHeadline: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -1.5,
    lineHeight: 50,
    marginBottom: 12,
  },
  mobileSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  mobileFormCard: {
    width: '100%',
    backgroundColor: 'rgba(6, 32, 24, 0.9)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0,230,118,0.25)',
    padding: 16,
    gap: 10,
    ...Platform.select({
      web: { backdropFilter: 'blur(20px)' } as any,
    }),
  },
  mobileField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  mobileFieldText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mobileFieldPlaceholder: {
    color: 'rgba(255,255,255,0.38)',
    fontWeight: '400',
  },
  mobileDropdown: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#041a12',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.25)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  mobileSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    backgroundColor: 'rgba(0,230,118,0.2)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
    marginTop: 4,
  },
  mobileSearchBtnActive: {
    backgroundColor: '#00E676',
    borderColor: '#00E676',
  },
  mobileSearchBtnText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
