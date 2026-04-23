import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { GroundWithImages } from '@/types';
import { router } from 'expo-router';
import { makeGroundPath } from '@/utils/groundSlug';
import { Star, MapPin, Clock, ChevronRight, ChevronLeft, Calendar as CalendarIcon, X } from 'lucide-react-native';
import { normalizeDbTimeToHHMM, formatTime12h } from '@/utils/bookingSlots';
import { buildCalendarCells, formatISODate } from '@/utils/calendar';
import { Modal, Pressable } from 'react-native';

export default function CalendarTabs() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }).map((_, i) => {
      const d = new Date();
      d.setDate(today.getDate() + i);
      return d;
    });
  }, []);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log("CalendarTabs location denied:", err)
      );
    }
  }, []);

  const loadAvailability = async (date: Date) => {
    try {
      setLoading(true);
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const dateString = date.toISOString().split('T')[0];

      // 1. Fetch grounds (basic info + primary image)
      const { data: groundsData, error: groundsError } = await supabase
        .from('grounds')
        .select('*, ground_images(*), reviews(rating)')
        .eq('active', true)
        .eq('approved', true)
        .limit(10);

      if (groundsError) throw groundsError;

      // 2. Fetch all slots for these grounds for this day of week
      const groundIds = groundsData.map(g => g.id);
      const { data: slotsData, error: slotsError } = await supabase
        .from('time_slots')
        .select('*')
        .in('ground_id', groundIds)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true);

      if (slotsError) throw slotsError;

      // 3. Fetch bookings for these grounds on this specific date
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('ground_id, start_time')
        .in('ground_id', groundIds)
        .eq('booking_date', dateString)
        .neq('status', 'cancelled');

      if (bookingsError) throw bookingsError;

      // 4. Map everything together
      const processed = groundsData.map(g => {
        const groundSlots = slotsData.filter(s => s.ground_id === g.id);
        const groundBookings = bookingsData.filter(b => b.ground_id === g.id);
        
        // Available = slot exists AND not booked
        const availableSlots = groundSlots.filter(s => 
          !groundBookings.some(b => b.start_time === s.start_time)
        );

        // Calculate distance if location available
        let distance = 999;
        if (userLocation && g.latitude && g.longitude) {
          distance = Math.sqrt(
            Math.pow(Number(g.latitude) - userLocation.lat, 2) + 
            Math.pow(Number(g.longitude) - userLocation.lng, 2)
          );
        }

        const reviews = (g.reviews || []) as { rating: number }[];
        const avgRating = reviews.length > 0
          ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
          : 0;

        return {
          ...g,
          _availableSlots: availableSlots,
          _distance: distance,
          _avgRating: avgRating,
          _reviewsCount: reviews.length
        };
      });

      // Sort by distance if available, else by created_at
      processed.sort((a, b) => a._distance - b._distance);

      setGrounds(processed as any);
    } catch (err) {
      console.error('Error loading calendar availability:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailability(selectedDate);
  }, [selectedDate, userLocation]);

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const formatDate = (date: Date, type: 'weekday' | 'day' | 'month') => {
    if (type === 'weekday') return date.toLocaleDateString('en-US', { weekday: 'short' });
    if (type === 'day') return date.getDate().toString();
    if (type === 'month') return date.toLocaleDateString('en-US', { month: 'short' });
    return '';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
           <Text style={styles.subtitle}>Find your slot</Text>
           <Text style={styles.title}>Live Availability</Text>
        </View>
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => {
            setViewDate(new Date(selectedDate));
            setShowFullCalendar(true);
          }}
        >
          <Text style={styles.viewAllText}>View Full Calendar</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showFullCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFullCalendar(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowFullCalendar(false)} 
        />
        <View style={styles.modalContainer}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <View>
                <Text style={styles.calendarMonthName}>
                  {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
                <Text style={styles.calendarHeaderHint}>Select a date to check availability</Text>
              </View>
              <View style={styles.calendarNav}>
                <TouchableOpacity 
                  onPress={() => {
                    const d = new Date(viewDate);
                    d.setMonth(d.getMonth() - 1);
                    setViewDate(d);
                  }}
                  style={styles.navBtn}
                >
                  <ChevronLeft size={20} color="#043529" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    const d = new Date(viewDate);
                    d.setMonth(d.getMonth() + 1);
                    setViewDate(d);
                  }}
                  style={styles.navBtn}
                >
                  <ChevronRight size={20} color="#043529" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setShowFullCalendar(false)}
                  style={[styles.navBtn, { marginLeft: 8, backgroundColor: '#F1F5F9' }]}
                >
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.weekdaysRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <Text key={d} style={styles.weekdayText}>{d}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {buildCalendarCells(viewDate.getFullYear(), viewDate.getMonth()).map((cell, idx) => {
                const isSelected = formatISODate(cell.date) === formatISODate(selectedDate);
                const isToday = formatISODate(cell.date) === formatISODate(new Date());
                const isPast = cell.date < new Date(new Date().setHours(0,0,0,0));

                return (
                  <TouchableOpacity
                    key={idx}
                    disabled={isPast}
                    onPress={() => {
                      setSelectedDate(cell.date);
                      setShowFullCalendar(false);
                    }}
                    style={[
                      styles.calendarCell,
                      !cell.inMonth && styles.cellNotInMonth,
                      isSelected && styles.cellSelected,
                      isToday && !isSelected && styles.cellToday,
                      isPast && styles.cellDisabled,
                    ]}
                  >
                    <Text style={[
                      styles.cellText,
                      !cell.inMonth && styles.cellTextNotInMonth,
                      isSelected && styles.cellTextSelected,
                      isToday && !isSelected && styles.cellTextToday,
                      isPast && styles.cellTextDisabled,
                    ]}>
                      {cell.dayNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {dates.map((date, index) => {
          const isSelected = isSameDay(date, selectedDate);
          const dayName = index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : formatDate(date, 'weekday');
          const dayNumber = formatDate(date, 'day');
          const monthName = formatDate(date, 'month');

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dateCard,
                isSelected && styles.dateCardActive,
                index === 0 && { marginLeft: 24 },
                index === dates.length - 1 && { marginRight: 24 },
              ]}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={[styles.dayName, isSelected && styles.dayNameActive]}>
                {dayName}
              </Text>
              <Text style={[styles.dayNumber, isSelected && styles.dayNumberActive]}>
                {dayNumber}
              </Text>
              <Text style={[styles.monthName, isSelected && styles.monthNameActive]}>
                {monthName}
              </Text>
              {isSelected && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.selectedDateHeader}>
        <View style={styles.selectedDateLine} />
        <Text style={styles.selectedDateText}>
          Availability for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
      </View>

      <View style={styles.resultsContainer}>
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color="#10B981" />
            <Text style={styles.loadingText}>Checking availability...</Text>
          </View>
        ) : grounds.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.resultsScroll}
          >
            {grounds.map((ground: any) => (
              <TouchableOpacity 
                key={ground.id}
                style={styles.groundTab}
                onPress={() => router.push(makeGroundPath(ground) as any)}
              >
                <View style={styles.tabImageWrapper}>
                  <Image 
                    source={{ uri: ground.ground_images?.[0]?.image_url || 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg' }}
                    style={styles.tabImage}
                  />
                </View>
                
                <View style={styles.priceRow}>
                  <Text style={styles.priceRowText}>
                    From ₹{ground.base_price_per_hour}/match • ₹{Math.round(ground.base_price_per_hour / 2)}/ team
                  </Text>
                </View>
                
                <View style={styles.tabInfo}>
                  <Text style={styles.tabName} numberOfLines={1}>{ground.name}</Text>
                  <View style={styles.tabMeta}>
                    <View style={styles.ratingRow}>
                      <Star size={10} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.ratingText}>{ground._avgRating.toFixed(1)}</Text>
                    </View>
                    <Text style={styles.tabCity}>• {ground.city}</Text>
                  </View>
                  
                  <View style={styles.availabilityTag}>
                    <Clock size={12} color="#10B981" />
                    <Text style={styles.availabilityText}>
                      {ground._availableSlots.length} slots left
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No grounds found for this date.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#043529',
    fontFamily: 'Inter',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#10B981',
    fontFamily: 'Inter',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  viewAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(4, 53, 41, 0.05)',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#043529',
    fontFamily: 'Inter',
  },
  scrollContent: {
    paddingRight: 24,
    paddingBottom: 8,
    paddingTop: 12,
    overflow: 'visible',
  },
  dateCard: {
    width: 88,
    height: 112,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
      web: {
        shadowColor: 'rgba(15, 23, 42, 0.08)',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 1,
        shadowRadius: 20,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
      },
    }) as any,
  },
  dateCardActive: {
    backgroundColor: '#043529',
    borderColor: '#043529',
    transform: [{ scale: 1.12 }, { translateY: -6 }],
    ...Platform.select({
      web: {
        shadowColor: 'rgba(4, 53, 41, 0.25)',
        shadowRadius: 25,
        shadowOffset: { width: 0, height: 12 },
      }
    }) as any,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    fontFamily: 'Inter',
  },
  dayNameActive: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  dayNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
    letterSpacing: -1,
  },
  dayNumberActive: {
    color: '#FFFFFF',
  },
  monthName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'Inter',
  },
  monthNameActive: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  activeDot: {
    position: 'absolute',
    bottom: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00ea6b',
    shadowColor: '#00ea6b',
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  selectedDateHeader: {
    paddingHorizontal: 24,
    marginTop: 32,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedDateLine: {
    width: 3,
    height: 16,
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#043529',
    fontFamily: 'Inter',
    letterSpacing: -0.2,
  },
  resultsContainer: {
    marginTop: 24,
    minHeight: 180,
  },
  resultsScroll: {
    paddingHorizontal: 24,
    paddingBottom: 10,
    gap: 16,
  },
  groundTab: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        shadowColor: 'rgba(15, 23, 42, 0.06)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        transition: 'transform 0.2s ease',
      }
    }) as any,
  },
  tabImageWrapper: {
    width: '100%',
    height: 110,
    position: 'relative',
  },
  tabImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
  },
  priceRow: {
    backgroundColor: '#064e3b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRowText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter',
    letterSpacing: 0.3,
  },
  tabInfo: {
    padding: 12,
  },
  tabName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginBottom: 3,
  },
  tabMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  tabCity: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  availabilityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    fontFamily: 'Inter',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    pointerEvents: 'box-none' as any,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }
    }) as any,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  calendarMonthName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#043529',
    fontFamily: 'Inter',
  },
  calendarHeaderHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  calendarNav: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontFamily: 'Inter',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  cellNotInMonth: {
    opacity: 0.3,
  },
  cellSelected: {
    backgroundColor: '#043529',
  },
  cellToday: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  cellDisabled: {
    opacity: 0.15,
  },
  cellText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    fontFamily: 'Inter',
  },
  cellTextNotInMonth: {
    fontWeight: '400',
  },
  cellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cellTextToday: {
    color: '#10B981',
  },
  cellTextDisabled: {
    textDecorationLine: 'line-through',
  },
});
