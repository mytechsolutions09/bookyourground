import React, { useState, useEffect, useMemo } from 'react';
import { useIsCompact } from '@/hooks/useIsCompact';
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
  Search, 
  ChevronDown, 
  ShieldCheck, 
  Trophy, 
  CalendarCheck2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

type LocationOption = {
  key: string;
  city: string;
  state: string;
};
export default function HeroWeb() {
  const isMobile = useIsCompact();
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

  // Calendar State
  const [viewDate, setViewDate] = useState(new Date());

  // Border Animation
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      rotateAnim.setValue(0);
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          startAnimation();
        }
      });
    };
    
    startAnimation();
  }, []);

  const pulseAnim = React.useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const borderRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
        
        // 1. Get grounds in this location with selected type
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
        
        // 2. Get available slots for these grounds
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
    if (!date) return 'Date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Calendar Helpers
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

  return (
    <ImageBackground
      source={require('@/assets/hero.png')}
      style={[
        styles.root, 
        { height: isMobile ? '100%' : 850, minHeight: isMobile ? 580 : 850 },
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
      
      <View style={[styles.container, !isMobile && { marginTop: 0 }]}>
        <View style={styles.content}>
          <Text style={[
            styles.title,
            { 
              fontSize: width < 600 ? 32 : (width < 900 ? 48 : 64),
              lineHeight: width < 600 ? 38 : 72,
              marginBottom: isMobile ? 12 : 16
            }
          ]}>
            Elevate Your Game
          </Text>
          <Text style={[
            styles.subtitle,
            {
              fontSize: width < 600 ? 14 : 16,
              lineHeight: width < 600 ? 20 : 26,
              maxWidth: width < 600 ? '90%' : 600,
              marginBottom: isMobile ? 24 : 32
            }
          ]}>
            Book premium sports venues in seconds and take your performance to the next level.
          </Text>

          <View style={[styles.featuresRow, isMobile && { marginBottom: 30 }]}>
            <View style={styles.featureChip}>
              <View style={styles.chipIcon}>
                <CalendarCheck2 size={16} color="#043529" strokeWidth={2.5} />
              </View>
              <Text style={styles.chipText}>Easy Booking</Text>
            </View>
            <View style={styles.featureChip}>
              <View style={styles.chipIcon}>
                <MapPin size={16} color="#043529" strokeWidth={2.5} />
              </View>
              <Text style={styles.chipText}>Top Grounds</Text>
            </View>
            <View style={styles.featureChip}>
              <View style={styles.chipIcon}>
                <ShieldCheck size={16} color="#043529" strokeWidth={2.5} />
              </View>
              <Text style={styles.chipText}>Secure & Reliable</Text>
            </View>
          </View>

          {/* Search Form with Rotating Border */}
          <View style={[
            styles.searchFormWrapper,
            isMobile && styles.searchFormWrapperMobile
          ]}>
            {/* Border Layer with Clipping */}
            <View style={[
              StyleSheet.absoluteFill, 
              { overflow: 'hidden', borderRadius: isMobile ? 26 : 100 }
            ]}>
              <Animated.View style={[
                styles.animatedBorder,
                { transform: [{ rotate: borderRotation }] }
              ]}>
                <LinearGradient
                  colors={['transparent', '#00ea6b', 'transparent', '#00ea6b', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            </View>

            <View style={[styles.searchFormContainer, isMobile && styles.searchFormContainerMobile]}>
            <View style={[styles.searchForm, isMobile && styles.searchFormMobile]}>
              
              {/* Location Selector */}
              <View style={[
                styles.formField, 
                styles.fieldDivider, 
                isMobile && styles.formFieldMobile,
                isLocationOpen && { zIndex: 1000 }
              ]}>
                <View style={styles.fieldIcon}>
                  <MapPin size={20} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Pressable 
                  style={styles.fieldContent}
                  onPress={() => {
                    setIsLocationOpen(!isLocationOpen);
                    setIsDateOpen(false);
                    setIsTimeOpen(false);
                  }}
                >
                  <Text style={[styles.fieldText, !selectedLocation && styles.placeholderText]}>
                    {selectedLocation ? selectedLocation.split('__')[0] : 'Location'}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </Pressable>
                
                {isLocationOpen && (
                  <View style={[styles.dropdown, isMobile && styles.timeDropdown]}>
                    <ScrollView style={{ maxHeight: 200 }}>
                      {locations.map((loc) => (
                        <Pressable
                          key={loc.key}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedLocation(loc.key);
                            setIsLocationOpen(false);
                            // Clear time if location changes
                            setSelectedTime('');
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{loc.city}, {loc.state}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Type Selector */}
              <View style={[
                styles.formField, 
                styles.fieldDivider, 
                isMobile && styles.formFieldMobile,
                isTypeOpen && { zIndex: 1000 }
              ]}>
                <View style={styles.fieldIcon}>
                  <Trophy size={20} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Pressable 
                  style={styles.fieldContent}
                  onPress={() => {
                    setIsTypeOpen(!isTypeOpen);
                    setIsLocationOpen(false);
                    setIsDateOpen(false);
                    setIsTimeOpen(false);
                  }}
                >
                  <Text style={[styles.fieldText, !selectedType && styles.placeholderText]}>
                    {selectedType ? (groundTypes.find(t => t.name === selectedType)?.label || selectedType) : 'Type'}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </Pressable>
                
                {isTypeOpen && (
                  <View style={[styles.dropdown, isMobile && styles.timeDropdown]}>
                    <ScrollView style={{ maxHeight: 200 }}>
                      {groundTypes.map((type) => (
                        <Pressable
                          key={type.name}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedType(type.name);
                            setIsTypeOpen(false);
                            // Clear time if type changes
                            setSelectedTime('');
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{type.label}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Date Selector */}
              <View style={[
                styles.formField, 
                styles.fieldDivider, 
                isMobile && styles.formFieldMobile,
                isDateOpen && { zIndex: 1000 }
              ]}>
                <View style={styles.fieldIcon}>
                  <CalendarIcon size={20} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Pressable 
                  style={styles.fieldContent}
                  onPress={() => {
                    setIsDateOpen(!isDateOpen);
                    setIsLocationOpen(false);
                    setIsTimeOpen(false);
                  }}
                >
                  <Text style={[styles.fieldText, !selectedDate && styles.placeholderText]}>
                    {formatDate(selectedDate)}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </Pressable>

                {isDateOpen && (
                  <View style={[styles.dropdown, styles.calendarDropdown]}>
                    <View style={styles.calendarHeader}>
                      <TouchableOpacity onPress={prevMonth} style={styles.calendarNav}>
                        <ChevronLeft size={20} color="#1E293B" />
                      </TouchableOpacity>
                      <Text style={styles.calendarMonthTitle}>{monthName}</Text>
                      <TouchableOpacity onPress={nextMonth} style={styles.calendarNav}>
                        <ChevronRight size={20} color="#1E293B" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.calendarWeekdays}>
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                        <Text key={d} style={styles.weekdayText}>{d}</Text>
                      ))}
                    </View>
                    <View style={styles.calendarGrid}>
                      {calendarDays.map((day, idx) => {
                        const isSelected = selectedDate && 
                          selectedDate.getDate() === day && 
                          selectedDate.getMonth() === viewDate.getMonth() && 
                          selectedDate.getFullYear() === viewDate.getFullYear();
                        
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isPast = day ? new Date(viewDate.getFullYear(), viewDate.getMonth(), day) < today : false;
                        
                        return (
                          <Pressable
                            key={idx}
                            style={[
                              styles.calendarDay,
                              isSelected && styles.calendarDaySelected,
                              (day === null || isPast) && styles.calendarDayEmpty,
                              isPast && { opacity: 0.3 }
                            ]}
                            onPress={() => {
                              if (day && !isPast) {
                                setSelectedDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
                                setIsDateOpen(false);
                                setSelectedTime('');
                              }
                            }}
                            disabled={!day || isPast}
                          >
                            <Text style={[
                              styles.dayText, 
                              isSelected && styles.dayTextSelected,
                              isPast && { color: '#CBD5E1' }
                            ]}>
                              {day}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {/* Time Selector */}
              <View style={[
                styles.formField, 
                isMobile && styles.formFieldMobile,
                isTimeOpen && { zIndex: 1000 }
              ]}>
                <View style={styles.fieldIcon}>
                  <Clock size={20} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Pressable 
                  style={styles.fieldContent}
                  onPress={() => {
                    setIsTimeOpen(!isTimeOpen);
                    setIsLocationOpen(false);
                    setIsDateOpen(false);
                  }}
                  disabled={!selectedLocation || !selectedDate}
                >
                  <Text style={[
                    styles.fieldText, 
                    (!selectedTime) && styles.placeholderText
                  ]}>
                    {selectedTime || 'Time'}
                  </Text>
                  {loadingTimes ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ChevronDown size={16} color="#64748B" />
                  )}
                </Pressable>

                {isTimeOpen && (selectedLocation && selectedDate) && (
                  <View style={[styles.dropdown, isMobile && styles.timeDropdown]}>
                    <ScrollView style={{ maxHeight: 200 }}>
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
                            <Pressable
                              key={time}
                              style={[styles.dropdownItem, isPast && { opacity: 0.5 }]}
                              onPress={() => {
                                if (!isPast) {
                                  setSelectedTime(time);
                                  setIsTimeOpen(false);
                                }
                              }}
                              disabled={isPast}
                            >
                              <Text style={[styles.dropdownItemText, isPast && { color: '#94A3B8' }]}>
                                {time} {isPast ? '(Passed)' : ''}
                              </Text>
                            </Pressable>
                          );
                        })
                      ) : (
                        <View style={styles.dropdownEmpty}>
                          <Text style={styles.dropdownEmptyText}>No slots found for this selection</Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              <Pressable 
                style={({ pressed }) => [
                  styles.searchButton,
                  isSearchEnabled && styles.searchButtonActive,
                  isMobile && styles.searchButtonMobile,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                ]}
                onPress={handleSearch}
              >
                <Text style={styles.searchButtonText}>Search Grounds</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'web' ? 120 : 100,
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  container: {
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 20,
    zIndex: 10,
    overflow: 'visible',
    position: 'relative',
  },
  content: {
    alignItems: 'center',
    textAlign: 'center',
    overflow: 'visible',
    paddingTop: 0,
  },
  title: {
    fontSize: 64,
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: -1.5,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    lineHeight: 72,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 32,
    fontFamily: 'Inter-Medium',
    opacity: 0.95,
    letterSpacing: -0.2,
    lineHeight: 26,
    textAlign: 'center',
    maxWidth: 600,
  },
  featuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 40,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 8,
  },
  chipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  searchFormWrapper: {
    width: '100%',
    maxWidth: 820,
    borderRadius: 100,
    padding: 2, 
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  searchFormWrapperMobile: {
    borderRadius: 26,
    marginTop: 20,
  },
  animatedBorder: {
    position: 'absolute',
    width: '200%',
    height: '200%',
    zIndex: -1,
  },
  searchFormContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 100,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 20,
    zIndex: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      web: { backdropFilter: 'blur(24px)' }
    }) as any,
  } as any,
  searchFormContainerMobile: {
    borderRadius: 24,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  searchForm: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  searchFormMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  formField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 48,
    position: 'relative',
  },
  formFieldMobile: {
    width: '100%',
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  fieldDivider: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  fieldIcon: {
    marginRight: 14,
  },
  fieldContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '600',
    fontFamily: 'Inter',
    letterSpacing: -0.3,
    ...Platform.select({
      web: { outlineStyle: 'none' }
    }) as any,
  },
  fieldText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Inter-Medium',
    letterSpacing: -0.3,
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
    fontFamily: 'Inter',
    letterSpacing: -0.3,
  },
  searchButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 100,
    marginLeft: 8,
    minWidth: 170,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)' }
    }) as any,
  },
  searchButtonActive: {
    backgroundColor: 'rgba(1, 184, 84, 0.4)',
    borderColor: 'rgba(0, 234, 107, 0.5)',
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  searchButtonMobile: {
    width: '100%',
    marginLeft: 0,
    marginTop: 8,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.2,
  },
  dropdown: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
    zIndex: 100,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
    fontFamily: 'Inter',
    letterSpacing: -0.2,
  },
  dropdownEmpty: {
    padding: 20,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  calendarDropdown: {
    position: 'absolute',
    bottom: 70,
    top: 'auto' as any,
    left: 0,
    right: 0,
    padding: 8,
    minWidth: 320,
  },
  timeDropdown: {
    bottom: 60,
    top: 'auto' as any,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarNav: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'Inter',
  },
  calendarWeekdays: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontFamily: 'Inter',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    height: 40,
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
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    fontFamily: 'Inter',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
