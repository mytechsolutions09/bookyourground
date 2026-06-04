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
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  Zap,
  Activity,
  Star,
  Building2
} from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import Svg, { Rect, Line, Circle, Path } from 'react-native-svg';

const GroundIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2" y="4" width="20" height="16" rx="2" />
    <Line x1="12" y1="4" x2="12" y2="20" />
    <Circle cx="12" cy="12" r="3" />
    <Path d="M 2 8 h 3 v 8 h -3" />
    <Path d="M 22 8 h -3 v 8 h 3" />
  </Svg>
);

const TurfIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    <Path d="M12 6 l -3 2 v 4 l 3 2 l 3 -2 v -4 Z" />
    <Path d="M9 8.3L5.5 6M15 8.3l3.5-2.3M9 13.7l-3.5 2.3M15 13.7l3.5 2.3" />
  </Svg>
);

const CourtIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M6 4L10 18C10.5 19.5 13.5 19.5 14 18L18 4" />
    <Line x1="9" y1="4" x2="11.2" y2="18" />
    <Line x1="15" y1="4" x2="12.8" y2="18" />
    <Path d="M7.3 9h9.4" />
    <Path d="M8.7 14h6.6" />
    <Path d="M10 18c0 1.5 4 1.5 4 0" fill={color} />
  </Svg>
);

const AllSportsIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="3" width="7" height="7" rx="1.5" />
    <Rect x="14" y="3" width="7" height="7" rx="1.5" />
    <Rect x="14" y="14" width="7" height="7" rx="1.5" />
    <Rect x="3" y="14" width="7" height="7" rx="1.5" />
  </Svg>
);


type LocationOption = {
  key: string;
  city: string;
  state: string;
};

export default function HeroWeb() {
  const isMobile = useIsCompact();
  const hasMounted = useHasMounted();
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const { width, height } = useWindowDimensions();
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [groundTypes, setGroundTypes] = useState<{name: string, label: string}[]>([]);
  const [loadingGroundTypes, setLoadingGroundTypes] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);

  // Tabs for search box
  const [searchTab, setSearchTab] = useState<'grounds' | 'nets' | 'all'>('grounds');

  // Calendar State
  const [viewDate, setViewDate] = useState(new Date());
  
  const [totalVenues, setTotalVenues] = useState(10);
  const [reviewsCount, setReviewsCount] = useState(1540);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: groundCount } = await supabase
          .from('grounds')
          .select('*', { count: 'exact', head: true });
        if (groundCount) setTotalVenues(groundCount);

        const { count: reviews } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true });
        if (reviews) setReviewsCount(reviews);
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, []);

  const formRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (isLocationOpen || isTypeOpen || isDateOpen || isTimeOpen) {
        // @ts-ignore - web specific
        if (formRef.current && !formRef.current.contains(e.target as Node)) {
          closeAll();
        }
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isLocationOpen, isTypeOpen, isDateOpen, isTimeOpen]);

  const closeAll = () => {
    setIsLocationOpen(false);
    setIsTypeOpen(false);
    setIsDateOpen(false);
    setIsTimeOpen(false);
  };

  useEffect(() => {
    const fetchLocations = async () => {
      setLoadingLocations(true);
      const { data, error } = await supabase
        .from('locations')
        .select('city, state')
        .eq('active', true)
        .order('city');
      
      if (!error && data) {
        const unique = data.map(l => ({
          key: `${l.city}__${l.state}`,
          city: l.city,
          state: l.state
        }));
        setLocations(unique);
      }
      setLoadingLocations(false);
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    const fetchGroundTypes = async () => {
      setLoadingGroundTypes(true);
      try {
        const { data, error } = await supabase
          .from('ground_types')
          .select('name, label')
          .eq('active', true)
          .order('sort_order', { ascending: true });
        
        if (!error && data) {
          const types = [...data];
          if (!types.some(t => t.name.toLowerCase() === 'nets')) {
            types.push({ name: 'Nets', label: 'Nets' });
          }
          setGroundTypes(types);
        }
      } catch (e) {
        console.error('Error fetching ground types:', e);
      } finally {
        setLoadingGroundTypes(false);
      }
    };
    fetchGroundTypes();
  }, []);

  useEffect(() => {
    const fetchAvailableTimes = async () => {
      if (!selectedLocation || !selectedDate || !selectedType) {
        setAvailableTimes([]);
        return;
      }
      
      setLoadingTimes(true);
      try {
        const [city, state] = selectedLocation.split('__');
        const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        const { data: grounds } = await supabase
          .from('grounds')
          .select('id')
          .eq('city', city)
          .eq('state', state)
          .eq('pitch_type', selectedType)
          .eq('active', true);
          
        if (!grounds || grounds.length === 0) {
          setAvailableTimes([]);
          return;
        }
        
        const groundIds = grounds.map(g => g.id);
        
        const { data: slots } = await supabase
          .from('time_slots')
          .select('start_time')
          .in('ground_id', groundIds)
          .eq('day_of_week', dayOfWeek)
          .eq('is_available', true);
          
        if (slots) {
          const uniqueTimes = Array.from(new Set(slots.map(s => s.start_time.slice(0, 5)))).sort();
          setAvailableTimes(uniqueTimes);
        } else {
          setAvailableTimes([]);
        }
      } catch (e) {
        console.error('Error fetching slots:', e);
      } finally {
        setLoadingTimes(false);
      }
    };
    
    fetchAvailableTimes();
  }, [selectedLocation, selectedDate, selectedType]);

  const handleSearch = () => {
    const params: any = {};
    if (selectedLocation) {
      params.location = selectedLocation;
    }
    if (selectedType) {
      params.type = selectedType;
    }
    if (selectedDate) {
      params.date = selectedDate.toISOString().split('T')[0];
    }
    if (selectedTime) params.time = selectedTime;

    router.push({
      pathname: '/search',
      params
    });
  };

  const isSearchEnabled = !!selectedLocation && !!selectedType && !!selectedDate && !!selectedTime;

  const formatDate = (date: Date | null) => {
    if (!date) return 'Select Date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const days: (number | null)[] = [];
    const firstDay = firstDayOfMonth(year, month);
    const totalDays = daysInMonth(year, month);

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);
    
    return days;
  }, [viewDate]);

  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));

  // Change category based on search tabs
  const handleTabChange = (tab: 'grounds' | 'nets' | 'all') => {
    setSearchTab(tab);
    if (tab === 'grounds') {
      setSelectedType('Cricket Ground');
    } else if (tab === 'nets') {
      setSelectedType('Nets');
    } else {
      setSelectedType('');
    }
  };

  return (
    <ImageBackground
      source={require('@/assets/hero.png')}
      onLoad={() => setIsImageLoaded(true)}
      style={[
        styles.root, 
        { height: isMobile ? 'auto' : (height ? Math.max(580, height) : 680), minHeight: isMobile ? 580 : 580, justifyContent: 'center' },
        isMobile && { paddingTop: 100, paddingBottom: 40 }
      ]}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      {(isLocationOpen || isDateOpen || isTimeOpen) && (
        <Pressable 
          style={StyleSheet.absoluteFill} 
          onPress={closeAll}
        />
      )}
      
      <View style={[
        styles.container, 
        !isMobile && { 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'stretch',
          gap: 40,
          paddingTop: 64,
          paddingBottom: 72,
        }
      ]}>
        {!isMobile ? (
          <View style={styles.heroLeftColumn}>
            {/* Title & Subtitle matching the mockup */}
            <Text 
              accessibilityRole="header" 
              aria-level={1} 
              style={[styles.titleText, { fontSize: 38, lineHeight: 44, marginBottom: 8 }]}
            >
              Play Hard. <Text style={styles.titleAccent}>Book Easy.</Text>
            </Text>
            
            <Text style={[styles.subtitleText, { marginBottom: 14, fontSize: 14, lineHeight: 20 }]}>
              Find and book your favorite turf, court, or ground instantly. Join games, find opponents, and build your local sports community.
            </Text>
            


            {/* Search Box Card with top tabs on the left */}
            <View ref={formRef} style={[styles.searchBoxCard, { padding: 16 }]}>
              {/* Category Tabs */}
              <View style={[styles.tabsHeaderRow, { marginBottom: 12 }]}>
                <TouchableOpacity 
                  style={[styles.tabButton, searchTab === 'grounds' && styles.tabButtonActive, { paddingVertical: 6, paddingHorizontal: 10 }]}
                  onPress={() => handleTabChange('grounds')}
                >
                  <GroundIcon size={14} color={searchTab === 'grounds' ? '#01b854' : '#94A3B8'} />
                  <Text style={[styles.tabButtonText, searchTab === 'grounds' && styles.tabButtonTextActive, { fontSize: 12 }]}>Grounds</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.tabButton, searchTab === 'nets' && styles.tabButtonActive, { paddingVertical: 6, paddingHorizontal: 10 }]}
                  onPress={() => handleTabChange('nets')}
                >
                  <TurfIcon size={14} color={searchTab === 'nets' ? '#01b854' : '#94A3B8'} />
                  <Text style={[styles.tabButtonText, searchTab === 'nets' && styles.tabButtonTextActive, { fontSize: 12 }]}>Nets</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.tabButton, searchTab === 'all' && styles.tabButtonActive, { paddingVertical: 6, paddingHorizontal: 10 }]}
                  onPress={() => handleTabChange('all')}
                >
                  <AllSportsIcon size={14} color={searchTab === 'all' ? '#01b854' : '#94A3B8'} />
                  <Text style={[styles.tabButtonText, searchTab === 'all' && styles.tabButtonTextActive, { fontSize: 12 }]}>All Sports</Text>
                </TouchableOpacity>
              </View>

              {/* Grid Fields */}
              <View style={[styles.fieldsGridContainer, { gap: 10, marginBottom: 14, zIndex: 10, position: 'relative' }]}>
                {/* Row 1 */}
                <View style={[styles.fieldsGridRow, { zIndex: 200, position: 'relative' }]}>
                  {/* Location field */}
                  <View style={styles.gridFieldCell}>
                    <Text style={styles.fieldHeadingLabel}>LOCATION</Text>
                    <Pressable 
                      style={[styles.gridFieldContent, { height: 38 }]} 
                      onPress={() => { setIsLocationOpen(!isLocationOpen); setIsDateOpen(false); setIsTimeOpen(false); setIsTypeOpen(false); }}
                    >
                      <MapPin size={18} color="#01b854" />
                      <Text style={[styles.gridFieldText, !selectedLocation && styles.gridFieldPlaceholderText, { fontSize: 13 }]}>
                        {selectedLocation ? selectedLocation.split('__')[0] : 'Enter location or area'}
                      </Text>
                    </Pressable>
                    {isLocationOpen && (
                      <View style={styles.gridDropdown}>
                        <ScrollView style={{ maxHeight: 180 }}>
                          {locations.map((loc) => (
                            <Pressable key={loc.key} style={styles.dropdownOption} onPress={() => { setSelectedLocation(loc.key); setIsLocationOpen(false); setSelectedTime(''); }}>
                              <Text style={styles.dropdownOptionText}>{loc.city}, {loc.state}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Venue Type field */}
                  <View style={styles.gridFieldCell}>
                    <Text style={styles.fieldHeadingLabel}>VENUE TYPE</Text>
                    <Pressable 
                      style={[styles.gridFieldContent, { height: 38 }]} 
                      onPress={() => { setIsTypeOpen(!isTypeOpen); setIsLocationOpen(false); setIsDateOpen(false); setIsTimeOpen(false); }}
                    >
                      <Trophy size={18} color="#01b854" />
                      <Text style={[styles.gridFieldText, !selectedType && styles.gridFieldPlaceholderText, { fontSize: 13 }]}>
                        {selectedType ? (groundTypes.find(t => t.name === selectedType)?.label || selectedType) : 'All Venue Types'}
                      </Text>
                      <ChevronDown size={14} color="#64748B" />
                    </Pressable>
                    {isTypeOpen && (
                      <View style={styles.gridDropdown}>
                        <ScrollView style={{ maxHeight: 180 }}>
                          {groundTypes.map((type) => (
                            <Pressable key={type.name} style={styles.dropdownOption} onPress={() => { setSelectedType(type.name); setIsTypeOpen(false); setSelectedTime(''); }}>
                              <Text style={styles.dropdownOptionText}>{type.label}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>

                {/* Row 2 */}
                <View style={[styles.fieldsGridRow, { zIndex: 100, position: 'relative' }]}>
                  {/* Date field */}
                  <View style={styles.gridFieldCell}>
                    <Text style={styles.fieldHeadingLabel}>DATE</Text>
                    <Pressable 
                      style={[styles.gridFieldContent, { height: 38 }]} 
                      onPress={() => { setIsDateOpen(!isDateOpen); setIsLocationOpen(false); setIsTimeOpen(false); setIsTypeOpen(false); }}
                    >
                      <CalendarIcon size={18} color="#01b854" />
                      <Text style={[styles.gridFieldText, !selectedDate && styles.gridFieldPlaceholderText, { fontSize: 13 }]}>
                        {formatDate(selectedDate)}
                      </Text>
                    </Pressable>
                    {isDateOpen && (
                      <View style={[styles.gridDropdown, { zIndex: 1100 }]}>
                        <View style={styles.calendarHeader}>
                           <TouchableOpacity onPress={prevMonth} style={styles.calendarNav}><ChevronLeft size={16} color="#1E293B" /></TouchableOpacity>
                          <Text style={styles.calendarMonthTitle}>{monthName}</Text>
                          <TouchableOpacity onPress={nextMonth} style={styles.calendarNav}><ChevronRight size={16} color="#1E293B" /></TouchableOpacity>
                        </View>
                        <View style={styles.calendarWeekdays}>
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <Text key={d} style={styles.weekdayText}>{d}</Text>)}
                        </View>
                        <View style={styles.calendarGrid}>
                          {calendarDays.map((day, idx) => {
                            const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === viewDate.getMonth() && selectedDate.getFullYear() === viewDate.getFullYear();
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const isPast = day ? new Date(viewDate.getFullYear(), viewDate.getMonth(), day) < today : false;
                            return (
                              <Pressable
                                key={idx}
                                style={[styles.calendarDay, isSelected && styles.calendarDaySelected, (day === null || isPast) && styles.calendarDayEmpty, isPast && { opacity: 0.3 }]}
                                onPress={() => { if (day && !isPast) { setSelectedDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day)); setIsDateOpen(false); setSelectedTime(''); } }}
                                disabled={!day || isPast}
                              >
                                <Text style={[styles.dayText, isSelected && styles.dayTextSelected, isPast && { color: '#CBD5E1' }]}>{day}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Time field */}
                  <View style={styles.gridFieldCell}>
                    <Text style={styles.fieldHeadingLabel}>TIME</Text>
                    <Pressable 
                      style={[styles.gridFieldContent, { height: 38 }]} 
                      onPress={() => { setIsTimeOpen(!isTimeOpen); setIsLocationOpen(false); setIsDateOpen(false); setIsTypeOpen(false); }}
                      disabled={!selectedLocation || !selectedDate}
                    >
                      <Clock size={18} color="#01b854" />
                      <Text style={[styles.gridFieldText, !selectedTime && styles.gridFieldPlaceholderText, { fontSize: 13 }]}>
                        {selectedTime || 'Select Time'}
                      </Text>
                      {loadingTimes && <ActivityIndicator size="small" color="#01b854" />}
                    </Pressable>
                    {isTimeOpen && (selectedLocation && selectedDate) && (
                      <View style={styles.gridDropdown}>
                        <ScrollView style={{ maxHeight: 180 }}>
                          {availableTimes.length > 0 ? (
                            availableTimes.map((time) => {
                              const today = new Date();
                              const isToday = selectedDate?.toDateString() === today.toDateString();
                              let isPast = false;
                              if (isToday) {
                                const [hours, minutes] = time.split(':').map(Number);
                                const slotTime = new Date();
                                slotTime.setHours(hours, minutes, 0, 0);
                                isPast = slotTime < today;
                              }
                              return (
                                <Pressable key={time} style={styles.dropdownOption} onPress={() => { if (!isPast) { setSelectedTime(time); setIsTimeOpen(false); } }} disabled={isPast}>
                                  <Text style={[styles.dropdownItemText, isPast && { color: '#94A3B8' }]}>{time} {isPast ? '(Passed)' : ''}</Text>
                                </Pressable>
                              );
                            })
                          ) : (
                            <View style={styles.dropdownEmpty}>
                              <Text style={styles.dropdownEmptyText}>No slots found</Text>
                            </View>
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Solid Green Search Button */}
              <TouchableOpacity 
                style={[styles.mockupSearchButton, isSearchEnabled && styles.mockupSearchButtonActive, { height: 40, zIndex: 0 }]}
                onPress={handleSearch}
              >
                <Text style={styles.mockupSearchButtonText}>SEARCH VENUES</Text>
                <ArrowRight size={18} color="#06392e" strokeWidth={2.5} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text 
            accessibilityRole="header" 
            aria-level={1} 
            style={[styles.title, isMobile && { fontSize: 28, lineHeight: 34, marginBottom: 16 }]}
          >
            Play Hard. Book Easy.
          </Text>
        )}

        {!isMobile ? (
          <View style={styles.heroRightColumn}>
            {/* Promo Badges moved from left column */}
            <View style={[styles.promoRow, { marginBottom: 16, justifyContent: 'flex-end', width: '100%' }]}>
              <View style={styles.promoItem}>
                <View style={styles.promoIconContainer}>
                  <ShieldCheck size={16} color="#01b854" />
                </View>
                <View>
                  <Text style={[styles.promoLabel, { fontSize: 12 }]}>Instant Booking</Text>
                  <Text style={[styles.promoSubLabel, { fontSize: 10 }]}>In Just a Few Clicks</Text>
                </View>
              </View>

              <View style={styles.promoItem}>
                <View style={styles.promoIconContainer}>
                  <CircleDollarSign size={16} color="#01b854" />
                </View>
                <View>
                  <Text style={[styles.promoLabel, { fontSize: 12 }]}>Secure Payments</Text>
                  <Text style={[styles.promoSubLabel, { fontSize: 10 }]}>100% Safe & Secure</Text>
                </View>
              </View>

              <View style={styles.promoItem}>
                <View style={styles.promoIconContainer}>
                  <CloudRain size={16} color="#01b854" />
                </View>
                <View>
                  <Text style={[styles.promoLabel, { fontSize: 12 }]}>Rain Refund</Text>
                  <Text style={[styles.promoSubLabel, { fontSize: 10 }]}>Hassle-Free Refunds</Text>
                </View>
              </View>
            </View>

            {/* Stats Card matching mockup */}
            <View style={styles.insightsCard}>
              <Text style={styles.insightsTitle}>COMMUNITY INSIGHTS</Text>
              
              <View style={styles.insightsGrid}>
                {/* Stat 1: Players */}
                <View style={styles.insightStatCell}>
                  <Users size={24} color="#01b854" />
                  <View style={styles.insightTextContainer}>
                    <Text style={styles.insightValue}>50K+</Text>
                    <Text style={styles.insightLabel}>Active Players</Text>
                  </View>
                </View>

                {/* Stat 2: Venues */}
                <View style={styles.insightStatCell}>
                  <Trophy size={24} color="#01b854" />
                  <View style={styles.insightTextContainer}>
                    <Text style={styles.insightValue}>{totalVenues * 50}+</Text>
                    <Text style={styles.insightLabel}>Verified Venues</Text>
                  </View>
                </View>

                {/* Stat 3: Rating */}
                <View style={styles.insightStatCell}>
                  <Star size={24} color="#01b854" fill="#01b854" />
                  <View style={styles.insightTextContainer}>
                    <Text style={styles.insightValue}>4.9 ★</Text>
                    <Text style={styles.insightLabel}>Average Rating</Text>
                  </View>
                </View>

                {/* Stat 4: Cities */}
                <View style={styles.insightStatCell}>
                  <Building2 size={24} color="#01b854" />
                  <View style={styles.insightTextContainer}>
                    <Text style={styles.insightValue}>100+</Text>
                    <Text style={styles.insightLabel}>Cities Covered</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : (
          /* Mobile Search Form */
          <View ref={formRef} style={[styles.searchFormWrapper, styles.searchFormWrapperMobile]}>

            <View style={[styles.searchFormContainer, styles.searchFormContainerMobile]}>
              <View style={[styles.searchForm, styles.searchFormMobile]}>
                <Pressable style={styles.formField} onPress={() => { setIsLocationOpen(!isLocationOpen); setIsDateOpen(false); setIsTimeOpen(false); }}>
                  <MapPin size={20} color="#FFFFFF" />
                  <Text style={styles.fieldText}>{selectedLocation ? selectedLocation.split('__')[0] : 'Location'}</Text>
                </Pressable>
                <Pressable style={styles.formField} onPress={() => { setIsTypeOpen(!isTypeOpen); setIsLocationOpen(false); setIsDateOpen(false); }}>
                  <Trophy size={20} color="#FFFFFF" />
                  <Text style={styles.fieldText}>{selectedType || 'Venue Type'}</Text>
                </Pressable>
                <Pressable style={styles.formField} onPress={() => { setIsDateOpen(!isDateOpen); setIsLocationOpen(false); setIsTimeOpen(false); }}>
                  <CalendarIcon size={20} color="#FFFFFF" />
                  <Text style={styles.fieldText}>{formatDate(selectedDate)}</Text>
                </Pressable>
                <Pressable style={styles.formField} onPress={handleSearch} disabled={!isSearchEnabled}>
                  <Text style={styles.searchButtonText}>Search</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Mockup Bottom Value Bar */}
      {!isMobile && (
        <View style={styles.propsBar}>
          <View style={styles.propsItem}>
            <CalendarIcon size={24} color="#01b854" />
            <View>
              <Text style={styles.propsTitle}>Real-Time Availability</Text>
              <Text style={styles.propsDesc}>Check live availability before you book</Text>
            </View>
          </View>

          <View style={styles.propsDivider} />

          <View style={styles.propsItem}>
            <Percent size={24} color="#01b854" />
            <View>
              <Text style={styles.propsTitle}>Best Prices</Text>
              <Text style={styles.propsDesc}>Exclusive deals and offers everyday</Text>
            </View>
          </View>

          <View style={styles.propsDivider} />

          <View style={styles.propsItem}>
            <Headphones size={24} color="#01b854" />
            <View>
              <Text style={styles.propsTitle}>24/7 Support</Text>
              <Text style={styles.propsDesc}>We're here to help you anytime</Text>
            </View>
          </View>

          <View style={styles.propsDivider} />

          <View style={styles.propsItem}>
            <ShieldCheck size={24} color="#01b854" />
            <View>
              <Text style={styles.propsTitle}>Trusted & Verified</Text>
              <Text style={styles.propsDesc}>Verified venues for a safe experience</Text>
            </View>
          </View>
        </View>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#032019',
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  container: {
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 20,
    zIndex: 200,
  },
  titleText: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    letterSpacing: -1.5,
    lineHeight: 64,
    marginBottom: 16,
  },
  titleAccent: {
    color: '#01b854',
  },
  subtitleText: {
    fontSize: 16,
    color: '#E2E8F0',
    lineHeight: 24,
    fontWeight: '500',
    fontFamily: 'Inter',
    marginBottom: 32,
    maxWidth: 500,
  },
  promoRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
    alignItems: 'center',
  },
  promoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  promoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(1, 184, 84, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(1, 184, 84, 0.2)',
  },
  promoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  promoSubLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  searchBoxCard: {
    width: '100%',
    backgroundColor: '#031713',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(1, 184, 84, 0.25)',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
  },
  tabsHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(1, 184, 84, 0.12)',
    borderColor: '#01b854',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  fieldsGridContainer: {
    gap: 16,
    marginBottom: 24,
  },
  fieldsGridRow: {
    flexDirection: 'row',
    gap: 16,
  },
  gridFieldCell: {
    flex: 1,
    gap: 8,
    position: 'relative',
  },
  fieldHeadingLabel: {
    fontSize: 9,
    fontWeight: '850',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  gridFieldContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    backgroundColor: '#020d0b',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  gridFieldText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  gridFieldPlaceholderText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500',
  },
  gridDropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#020d0b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(1, 184, 84, 0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    zIndex: 1000,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)',
  },
  dropdownOptionText: {
    fontSize: 13,
    color: '#E2E8F0',
  },
  mockupSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#01b854',
    height: 52,
    borderRadius: 12,
    width: '100%',
  },
  mockupSearchButtonActive: {
    backgroundColor: '#02d964',
  },
  mockupSearchButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#031713',
    letterSpacing: 0.5,
  },
  heroLeftColumn: {
    flex: 1.1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    maxWidth: 580,
    width: '100%',
    zIndex: 200,
  },
  heroRightColumn: {
    flex: 0.9,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    maxWidth: 520,
    width: '100%',
    zIndex: 100,
  },
  insightsCard: {
    backgroundColor: 'rgba(3, 23, 19, 0.85)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(1, 184, 84, 0.2)',
    padding: 16,
    width: '100%',
    maxWidth: 480,
    ...Platform.select({
      web: { backdropFilter: 'blur(20px)' }
    }) as any,
  },
  insightsTitle: {
    fontSize: 10,
    fontWeight: '850',
    color: '#01b854',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  insightStatCell: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020d0b',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 10,
    gap: 10,
  },
  insightTextContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    flex: 1,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  insightLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    lineHeight: 12,
  },
  propsBar: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    marginLeft: 'auto',
    marginRight: 'auto',
    maxWidth: 1200,
    width: 'calc(100% - 40px)' as any,
    flexDirection: 'row',
    backgroundColor: '#020d0b',
    borderWidth: 1,
    borderColor: 'rgba(1, 184, 84, 0.15)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  propsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  propsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  propsDesc: {
    fontSize: 11,
    color: '#94A3B8',
  },
  propsDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  calendarNav: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  calendarWeekdays: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 4,
  },
  calendarDay: {
    width: '14.28%',
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  calendarDayEmpty: {
    opacity: 0,
  },
  calendarDaySelected: {
    backgroundColor: '#01b854',
  },
  dayText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  dayTextSelected: {
    color: '#020d0b',
    fontWeight: '700',
  },
});
