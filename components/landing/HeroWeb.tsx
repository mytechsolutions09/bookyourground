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
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
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
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);

  // Calendar State
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    const fetchLocations = async () => {
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
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    const fetchAvailableTimes = async () => {
      if (!selectedLocation || !selectedDate) {
        setAvailableTimes([]);
        return;
      }
      
      setLoadingTimes(true);
      try {
        const [city, state] = selectedLocation.split('__');
        const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        // 1. Get grounds in this location
        const { data: grounds } = await supabase
          .from('grounds')
          .select('id')
          .eq('city', city)
          .eq('state', state)
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
  }, [selectedLocation, selectedDate]);

  const handleSearch = () => {
    const params: any = {};
    if (selectedLocation) {
      params.location = selectedLocation;
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

  const isSearchEnabled = !!selectedLocation && !!selectedDate && !!selectedTime;

  const formatDate = (date: Date | null) => {
    if (!date) return 'Select Date';
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
      style={[styles.root, { height: isMobile ? height : 850 }]}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      
      <View style={[styles.container, !isMobile && { marginTop: -80 }]}>
        <View style={styles.content}>
          <Text style={[
            styles.title,
            { 
              fontSize: width < 600 ? 36 : (width < 900 ? 48 : 64),
              lineHeight: width < 600 ? 44 : 72
            }
          ]}>
            Elevate Your Game
          </Text>
          <Text style={[
            styles.subtitle,
            {
              fontSize: width < 600 ? 15 : 18,
              lineHeight: width < 600 ? 22 : 28,
              maxWidth: width < 600 ? '95%' : 700,
            }
          ]}>
            Book premium sports venues in seconds and take your performance to the next level.
          </Text>

          <View style={styles.featuresRow}>
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

          {/* Search Form */}
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
                    {selectedLocation ? selectedLocation.split('__')[0] : 'Select Location'}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </Pressable>
                
                {isLocationOpen && (
                  <View style={styles.dropdown}>
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
                      <Pressable onPress={prevMonth} style={styles.calendarNav}>
                        <ChevronLeft size={20} color="#1E293B" />
                      </Pressable>
                      <Text style={styles.calendarMonthTitle}>{monthName}</Text>
                      <Pressable onPress={nextMonth} style={styles.calendarNav}>
                        <ChevronRight size={20} color="#1E293B" />
                      </Pressable>
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
                    {selectedTime || 'Select Time'}
                  </Text>
                  {loadingTimes ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ChevronDown size={16} color="#64748B" />
                  )}
                </Pressable>

                {isTimeOpen && (selectedLocation && selectedDate) && (
                  <View style={styles.dropdown}>
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start',
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
  },
  content: {
    alignItems: 'center',
    textAlign: 'center',
    overflow: 'visible',
    paddingTop: 0,
  },
  title: {
    fontSize: 64,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: -1.5,
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 72,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 32,
    fontFamily: 'Inter',
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
    marginBottom: 50,
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
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  searchFormContainer: {
    width: '100%',
    maxWidth: 820,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 100,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 20,
    overflow: 'visible',
    zIndex: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    gap: 12,
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
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'Inter',
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
    fontWeight: '700',
    fontFamily: 'Inter',
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
    width: 240,
    padding: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarNav: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  calendarMonthTitle: {
    fontSize: 13,
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
    fontSize: 9,
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
    color: '#1E293B',
    fontFamily: 'Inter',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
