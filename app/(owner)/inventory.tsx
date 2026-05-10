import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  useWindowDimensions,
  DeviceEventEmitter,
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  useAnimatedScrollHandler,
  runOnJS 
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useUI } from '@/contexts/UIContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const IS_WEB = Platform.OS === 'web';
import { 
  ChevronRight, 
  ChevronDown, 
  Calendar, 
  Search, 
  Filter, 
  Building2, 
  LayoutGrid,
  Clock,
  X,
  Check
} from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages, BookingWithDetails } from '@/types';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import Card from '@/components/ui/Card';
import { formatDateDDMMYY, formatCurrency } from '@/utils/helpers';
import { normalizeDbTimeToHHMM, formatTime12h } from '@/utils/bookingSlots';
import { cricketTeamsLabelFromBooking } from '@/utils/cricketGround';

function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function OwnerInventoryScreen() {
  const { user } = useAuth();
  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [daysToShow, setDaysToShow] = useState<number | 'L30'>(7);
  const [bookingChoice, setBookingChoice] = useState<any | null>(null);
  const [activePicker, setActivePicker] = useState<'ground' | 'status' | 'range' | null>(null);
  const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null);

  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isSmall = width < 900;
  const isUltraNarrow = width < 350;
  const isTablet = width >= 600 && width < 900;
  const { setTabBarVisible } = useUI();
  const insets = useSafeAreaInsets();
  
  const headerTranslateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const HEADER_HEIGHT = 100;
  
  const onScrollWeb = (event: any) => {
    const currentY = event.nativeEvent.contentOffset.y;
    DeviceEventEmitter.emit('mainScroll', { y: currentY });
    
    const diff = currentY - lastScrollY.value;
    if (diff > 1 && currentY > 50) {
      if (headerTranslateY.value === 0) {
        headerTranslateY.value = withTiming(-HEADER_HEIGHT - insets.top - 20, { duration: 400 });
        setTabBarVisible(false);
      }
    } else if (diff < -2 || currentY < 20) {
      if (headerTranslateY.value < 0) {
        headerTranslateY.value = withTiming(0, { duration: 400 });
        setTabBarVisible(true);
      }
    }
    lastScrollY.value = currentY;
  };

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  }));

  useFocusEffect(
    useCallback(() => {
      if (user) loadData();
    }, [selectedDateFilter, daysToShow, user, selectedGroundId])
  );

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      // 1. Fetch grounds owned by the current user
      const { data: groundsData, error: groundsError } = await supabase
        .from('grounds')
        .select(`*, ground_images(*), time_slots(*)`)
        .eq('owner_id', user.id)
        .order('name');

      if (groundsError) throw groundsError;

      // 2. Fetch bookings for selected days range
      let startDate: string;
      let endDate: string;

      if (daysToShow === 'L30') {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
        startDate = toLocalIsoDate(thirtyDaysAgo);
        endDate = toLocalIsoDate(today);
      } else {
        const pivotDate = selectedDateFilter ? new Date(selectedDateFilter) : new Date();
        startDate = toLocalIsoDate(pivotDate);
        const days = typeof daysToShow === 'number' ? daysToShow : 7;
        const endDateDate = new Date(pivotDate.getTime() + days * 24 * 60 * 60 * 1000);
        endDate = toLocalIsoDate(endDateDate);
      }

      // Use a more robust join and filter to ensure all relevant bookings are captured
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          ground:grounds!inner(id, owner_id, pitch_type)
        `)
        .eq('ground.owner_id', user.id)
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)
        .neq('status', 'cancelled')
        .neq('status', 'rejected');

      if (bookingsError) throw bookingsError;

      setGrounds(groundsData || []);
      setBookings(bookingsData || []);
      
      if (!selectedGroundId && groundsData && groundsData.length > 0) {
        setSelectedGroundId(groundsData[0].id);
      }
    } catch (error: any) {
      console.error('Error loading inventory data:', error);
      alert('Error loading inventory: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
      console.log('Inventory load complete. Grounds:', grounds.length, 'User:', user?.id);
    }
  };

  const filteredGrounds = useMemo(() => {
    if (!searchQuery) return grounds;
    const q = searchQuery.toLowerCase();
    return grounds.filter(g => 
      g.name.toLowerCase().includes(q) ||
      g.city.toLowerCase().includes(q)
    );
  }, [grounds, searchQuery]);

  const currentGround = useMemo(() => 
    grounds.find(g => g.id === selectedGroundId),
  [grounds, selectedGroundId]);

  const bookingsMap = useMemo(() => {
    const map = new Map<string, BookingWithDetails[]>();
    bookings.forEach(b => {
      const startTime = normalizeDbTimeToHHMM(b.start_time);
      const key = `${b.ground_id}_${b.booking_date}_${startTime}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    return map;
  }, [bookings]);

  const getOccupancy = (groundId: string, date: string, startTime: string, pitchType: string | null) => {
    const normStart = normalizeDbTimeToHHMM(startTime);
    const key = `${groundId}_${date}_${normStart}`;
    const slotBookings = bookingsMap.get(key) || [];
    
    // Filter to only confirmed/active/completed bookings for occupancy calculation
    const activeBookings = slotBookings.filter(b => 
      b.status === 'confirmed' || b.status === 'completed' || b.status === 'active'
    );

    if (activeBookings.length === 0) return 0;

    const isBox = String(pitchType || '').toLowerCase().includes('box');

    return activeBookings.reduce((sum, b) => {
      if (isBox) return sum + 2; // Any booking for box cricket takes full slot (2 units)

      // Cricket ground logic
      if (b.team_type === 'one') return sum + 1;
      if (b.team_type === 'both') return sum + 2;

      const label = cricketTeamsLabelFromBooking(pitchType, b.notes);
      if (label === '1 team') return sum + 1;
      if (label === 'Both teams') return sum + 2;
      
      return sum + 2; // Default to full ground
    }, 0);
  };

  const getSlotStatus = (occupancy: number) => {
    if (occupancy >= 2) return 'FULL';
    if (occupancy === 1) return 'PARTIAL';
    return 'EMPTY';
  };

  const renderSlotsForDate = (ground: GroundWithImages, dateStr: string) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = days[new Date(dateStr).getDay()];

    const slots = ((ground as any).time_slots || [])
      .filter((s: any) => s.day_of_week === dayOfWeek)
      .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));

    const filteredSlots = slots.filter((s: any) => {
      if (statusFilter === 'ALL') return true;
      const occupancy = getOccupancy(ground.id, dateStr, s.start_time, ground.pitch_type);
      const status = getSlotStatus(occupancy);
      return status === statusFilter;
    });

    if (filteredSlots.length === 0) {
      if (slots.length > 0) {
        return <Text style={styles.noSlotsText}>No slots match filters</Text>;
      }
      return <Text style={styles.noSlotsText}>No slots for {dayOfWeek}</Text>;
    }
    
    return (
      <View style={styles.slotsGrid}>
        {filteredSlots.map((s: any) => {
          const now = new Date();
          const todayStr = toLocalIsoDate(now);
          const currentTimeStr = now.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' });
          const slotStartTime = normalizeDbTimeToHHMM(s.start_time) || '00:00';

          const isPastDate = dateStr < todayStr;
          const isPastTime = dateStr === todayStr && slotStartTime < currentTimeStr;
          const isSlotInPast = isPastDate || isPastTime;

          const occupancy = getOccupancy(ground.id, dateStr, s.start_time, ground.pitch_type);
          const statusText = getSlotStatus(occupancy);
          
          let statusColor = '#F3F4F6'; // Empty
          let textColor = '#6B7280';
          let displayStatus = statusText;

          if (isSlotInPast) {
            statusColor = '#F9FAFB';
            textColor = '#9CA3AF';
            displayStatus = 'PAST';
          } else if (statusText === 'FULL') {
            statusColor = '#DEF7EC';
            textColor = '#03543F';
          } else if (statusText === 'PARTIAL') {
            statusColor = '#FEF3C7';
            textColor = '#92400E';
          }

          const isClickable = !isSlotInPast && statusText !== 'FULL';

          return (
            <TouchableOpacity 
              key={s.id} 
              style={[styles.slotChip, isUltraNarrow && { minWidth: 75, paddingHorizontal: 6 }, { backgroundColor: statusColor }]}
              disabled={!isClickable}
              onPress={() => {
                const startHHMM = normalizeDbTimeToHHMM(s.start_time);
                const endHHMM = normalizeDbTimeToHHMM(s.end_time);
                const isBox = (ground.pitch_type ?? '').toLowerCase().includes('box');
                const basePrice = Number(s.custom_price ?? (ground as any).base_price_per_hour ?? 0);

                const goToCheckout = (teams: 'one' | 'both') => {
                  const finalAmount = isBox ? basePrice : (teams === 'one' ? basePrice / 2 : basePrice);
                  router.push({
                    pathname: '/checkout/new',
                    params: { 
                      groundId: ground.id,
                      date: dateStr,
                      time: startHHMM,
                      endTime: endHHMM,
                      teamType: teams,
                      amount: finalAmount.toString(),
                      pricePerHour: basePrice.toString()
                    }
                  });
                };

                if (statusText === 'EMPTY' && !isBox) {
                  setBookingChoice({
                    ground,
                    slot: s,
                    dateStr,
                    startHHMM,
                    endHHMM,
                    basePrice,
                  });
                } else {
                  goToCheckout(statusText === 'PARTIAL' ? 'one' : 'both');
                }
              }}
            >
              <Text style={[styles.slotTime, { color: textColor }]}>
                {formatTime12h(normalizeDbTimeToHHMM(s.start_time) || '')}
              </Text>
              <Text style={[styles.slotStatus, { color: textColor }]}>{displayStatus}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setIsScrolled(offsetY > 20);
    if (isWeb && isSmall) {
      onScrollWeb(event);
    }
  };



  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {isWeb && !isSmall ? (
        <WebLayout>
          <View style={styles.screen}>
            {/* Direct Header */}
            <View style={[styles.pageHeader, styles.webPageHeader]}>
              {/* Row 1: Title + selected venue name (top-right) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.title}>Inventory Management</Text>
                {currentGround && (
                  <View style={styles.headerVenueName}>
                    <Building2 size={13} color="#00ea6b" />
                    <Text style={styles.headerVenueNameText} numberOfLines={1}>
                      {currentGround.name}
                    </Text>
                    {currentGround.city ? (
                      <Text style={styles.headerVenueCity}>{currentGround.city}</Text>
                    ) : null}
                  </View>
                )}
              </View>

              {/* Row 2: Venue tabs + Days filter + Status filter — all in one line */}
              <View style={styles.webControlsRow}>
                {/* Venue tabs — scrollable, takes remaining space */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flex: 1 }}
                  contentContainerStyle={styles.venueTabsRow}
                >
                  {grounds.map(g => {
                    const isSelected = selectedGroundId === g.id;
                    const isHovered = hoveredVenueId === g.id;
                    return (
                      <View key={g.id} style={{ position: 'relative' }}>
                        {/* Hover tooltip */}
                        {isHovered && IS_WEB && (
                          <View style={styles.venueTooltip} pointerEvents="none">
                            <Text style={styles.venueTooltipText} numberOfLines={2}>
                              {g.name}{g.city ? ` · ${g.city}` : ''}
                            </Text>
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={() => setSelectedGroundId(g.id)}
                          style={[styles.venueTab, isSelected && styles.venueTabSelected]}
                          {...(IS_WEB ? {
                            onMouseEnter: () => setHoveredVenueId(g.id),
                            onMouseLeave: () => setHoveredVenueId(null),
                          } : {})}
                        >
                          <Building2 size={11} color={isSelected ? '#043529' : '#6B7280'} />
                          <Text
                            style={[styles.venueTabText, isSelected && styles.venueTabTextSelected]}
                            numberOfLines={1}
                          >
                            {g.name}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>

                {/* Divider */}
                <View style={styles.webControlsDivider} />

                {/* Days filter pills */}
                <View style={styles.webDaysFilterPills}>
                  {([7, 14, 30, 90, 'L30'] as const).map(d => {
                    const isActive = daysToShow === d;
                    const label = d === 'L30' ? 'Past 30' : `${d}D`;
                    return (
                      <TouchableOpacity
                        key={d.toString()}
                        onPress={() => setDaysToShow(d as any)}
                        style={[styles.webDaysPill, isActive && styles.webDaysPillActive]}
                      >
                        <Text style={[styles.webDaysPillText, isActive && styles.webDaysPillTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Divider */}
                <View style={styles.webControlsDivider} />

                {/* Status filter pills */}
                <View style={styles.statusFilters}>
                  {['ALL', 'EMPTY', 'PARTIAL', 'FULL'].map(status => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => setStatusFilter(status)}
                      style={[styles.filterTag, statusFilter === status && styles.tagAll]}
                    >
                      <Text style={[styles.filterTagText, statusFilter === status && { color: '#043529' }]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <ScrollView 
              style={styles.mainScroll} 
              contentContainerStyle={styles.mainScrollContent}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
            >
              {loading && grounds.length === 0 ? (
                <ActivityIndicator size="large" color="#00ea6b" style={{ marginTop: 50 }} />
              ) : (
                <View style={styles.hierarchyContainer}>
                  {currentGround ? (
                    <View style={styles.inventoryContainer}>
                      <View style={styles.inventoryStaticList}>
                        {Array.from({ length: daysToShow === 'L30' ? 30 : daysToShow }).map((_, i) => {
                          const d = new Date();
                          if (daysToShow === 'L30') d.setDate(d.getDate() - 29 + i);
                          else if (selectedDateFilter) {
                             const [y, m, day] = selectedDateFilter.split('-').map(Number);
                             d.setFullYear(y, m - 1, day);
                             d.setDate(d.getDate() + i);
                          }
                          const dateStr = toLocalIsoDate(d);
                          return (
                            <View key={dateStr} style={styles.compactDateRow}>
                              <View style={styles.compactDateLabel}>
                                <Text style={styles.dateDay}>{d.toLocaleDateString('en-IN', { weekday: 'short' })}</Text>
                                <Text style={styles.dateNum}>{d.getDate()} {d.toLocaleDateString('en-IN', { month: 'short' })}</Text>
                              </View>
                              <View style={styles.slotsWrapper}>
                                {renderSlotsForDate(currentGround, dateStr)}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.noGroundSelected}>
                      <Building2 size={48} color="#D1D5DB" />
                      <Text style={styles.emptyText}>No ground selected or found.</Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </WebLayout>
      ) : (
        <View style={{ flex: 1 }}>
          <MobileAppNavbar title="Inventory" titleColor="#00ea6b" />
          
          <View style={styles.pageHeader}>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mobileFiltersRow}>
                <TouchableOpacity style={styles.mobileDropdown} onPress={() => setActivePicker('ground')}>
                  <Building2 size={14} color="#00ea6b" />
                  <Text style={styles.mobileDropdownText} numberOfLines={1}>{currentGround?.name || 'Ground'}</Text>
                  <ChevronDown size={14} color="#6B7280" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.mobileDropdown} onPress={() => setActivePicker('status')}>
                  <Filter size={14} color="#00ea6b" />
                  <Text style={styles.mobileDropdownText}>{statusFilter}</Text>
                  <ChevronDown size={14} color="#6B7280" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.mobileDropdown} onPress={() => setActivePicker('range')}>
                  <Clock size={14} color="#00ea6b" />
                  <Text style={styles.mobileDropdownText}>{daysToShow}D</Text>
                  <ChevronDown size={14} color="#6B7280" />
                </TouchableOpacity>
             </ScrollView>
          </View>

          <ScrollView 
            style={styles.mainScroll} 
            contentContainerStyle={styles.mainScrollContent}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
          >
            {loading && grounds.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#00ea6b" />
                <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading inventory...</Text>
              </View>
            ) : (
              <View style={styles.hierarchyContainer}>
                {currentGround ? (
                  <View style={styles.inventoryContainer}>
                    {Array.from({ length: daysToShow === 'L30' ? 30 : daysToShow }).map((_, i) => {
                      const d = new Date();
                      if (daysToShow === 'L30') d.setDate(d.getDate() - 29 + i);
                      else if (selectedDateFilter) {
                         const [y, m, day] = selectedDateFilter.split('-').map(Number);
                         d.setFullYear(y, m - 1, day);
                         d.setDate(d.getDate() + i);
                      }
                      const dateStr = toLocalIsoDate(d);
                      return (
                        <View key={dateStr} style={styles.compactDateRow}>
                          <View style={styles.compactDateLabel}>
                            <Text style={styles.dateDay}>{d.toLocaleDateString('en-IN', { weekday: 'short' })}</Text>
                            <Text style={styles.dateNum}>{d.getDate()} {d.toLocaleDateString('en-IN', { month: 'short' })}</Text>
                          </View>
                          <View style={styles.slotsWrapper}>
                            {renderSlotsForDate(currentGround, dateStr)}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.noGroundSelected}>
                    <Building2 size={48} color="#D1D5DB" />
                    <Text style={styles.emptyText}>No ground selected.</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Choice Modal */}
      <Modal
        visible={!!bookingChoice}
        transparent
        animationType="fade"
        onRequestClose={() => setBookingChoice(null)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.choiceCard}>
            <Text style={styles.choiceTitle}>Select Booking Type</Text>
            <Text style={styles.choiceSubtitle}>
              {bookingChoice?.ground?.name} - {bookingChoice?.dateStr}
            </Text>
            
            <View style={styles.choiceButtons}>
              <TouchableOpacity 
                style={styles.choiceBtn}
                onPress={() => {
                  const b = bookingChoice;
                  const finalAmount = ((b?.basePrice || 0) / 2);
                  setBookingChoice(null);
                  router.push({
                    pathname: '/checkout/new',
                    params: { 
                      groundId: b.ground.id,
                      date: b.dateStr,
                      time: b.startHHMM,
                      endTime: b.endHHMM,
                      teamType: 'one',
                      amount: finalAmount.toString(),
                      pricePerHour: (b?.basePrice || 0).toString()
                    }
                  });
                }}
              >
                <Text style={styles.choiceBtnText}>Book 1 Team</Text>
                <Text style={styles.choiceBtnPrice}>₹{((bookingChoice?.basePrice || 0) / 2).toLocaleString('en-IN')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.choiceBtn, styles.choiceBtnPrimary]}
                onPress={() => {
                  const b = bookingChoice;
                  setBookingChoice(null);
                  router.push({
                    pathname: '/checkout/new',
                    params: { 
                      groundId: b.ground.id,
                      date: b.dateStr,
                      time: b.startHHMM,
                      endTime: b.endHHMM,
                      teamType: 'both',
                      amount: (b?.basePrice || 0).toString(),
                      pricePerHour: (b?.basePrice || 0).toString()
                    }
                  });
                }}
              >
                <Text style={[styles.choiceBtnText, styles.choiceBtnTextWhite]}>Full Ground</Text>
                <Text style={[styles.choiceBtnPrice, styles.choiceBtnTextWhite]}>₹{(bookingChoice?.basePrice || 0).toLocaleString('en-IN')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.choiceCancel}
              onPress={() => setBookingChoice(null)}
            >
              <Text style={styles.choiceCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </Modal>

      {/* Picker Modal */}
      <Modal
        visible={!!activePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePicker(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setActivePicker(null)}
        >
          <Card style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {activePicker === 'ground' ? 'Select Ground' : 
                 activePicker === 'status' ? 'Select Status' : 'Select Range'}
              </Text>
              <TouchableOpacity onPress={() => setActivePicker(null)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.pickerOptions}>
              {activePicker === 'ground' && filteredGrounds.map(ground => (
                <TouchableOpacity 
                  key={ground.id}
                  style={[styles.pickerOption, selectedGroundId === ground.id && styles.pickerOptionActive]}
                  onPress={() => {
                    setSelectedGroundId(ground.id);
                    setActivePicker(null);
                  }}
                >
                  <Building2 size={16} color={selectedGroundId === ground.id ? '#00ea6b' : '#6B7280'} />
                  <Text style={[styles.pickerOptionText, selectedGroundId === ground.id && styles.pickerOptionTextActive]}>
                    {ground.name}
                  </Text>
                  {selectedGroundId === ground.id && <Check size={16} color="#00ea6b" />}
                </TouchableOpacity>
              ))}

              {activePicker === 'status' && ['ALL', 'EMPTY', 'PARTIAL', 'FULL'].map(status => (
                <TouchableOpacity 
                  key={status}
                  style={[styles.pickerOption, statusFilter === status && styles.pickerOptionActive]}
                  onPress={() => {
                    setStatusFilter(status);
                    setActivePicker(null);
                  }}
                >
                  <View style={[
                    styles.statusDot, 
                    status === 'ALL' ? { backgroundColor: '#00ea6b' } :
                    status === 'EMPTY' ? { backgroundColor: '#E5E7EB' } :
                    status === 'PARTIAL' ? { backgroundColor: '#FEF3C7' } :
                    { backgroundColor: '#DEF7EC' }
                  ]} />
                  <Text style={[styles.pickerOptionText, statusFilter === status && styles.pickerOptionTextActive]}>
                    {status}
                  </Text>
                  {statusFilter === status && <Check size={16} color="#00ea6b" />}
                </TouchableOpacity>
              ))}

              {activePicker === 'range' && [7, 14, 30, 90, 'L30'].map(days => (
                <TouchableOpacity 
                  key={days.toString()}
                  style={[styles.pickerOption, daysToShow === days && styles.pickerOptionActive]}
                  onPress={() => {
                    setDaysToShow(days as any);
                    setActivePicker(null);
                  }}
                >
                  <Clock size={16} color={daysToShow === days ? '#00ea6b' : '#6B7280'} />
                  <Text style={[styles.pickerOptionText, daysToShow === days && styles.pickerOptionTextActive]}>
                    {days === 'L30' ? 'Past' : `${days} Days`}
                  </Text>
                  {daysToShow === days && <Check size={16} color="#00ea6b" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  pageHeader: {
    backgroundColor: '#FFFFFF',
    padding: IS_WEB ? 24 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  webPageHeader: {
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: 'transparent',
    width: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  headerContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  contextText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  headerTop: {
    justifyContent: 'space-between',
    gap: 12,
  },
  filterCard: {
    padding: 8,
    backgroundColor: 'transparent',
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  statusFilters: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#F3F4F6',
    padding: 3,
    borderRadius: 8,
  },
  filterTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  filterTagActive: {
    transform: [{ scale: 1.02 }],
  },
  tagAll: { backgroundColor: '#00ea6b' },
  tagEmpty: { backgroundColor: '#E5E7EB' },
  tagPartial: { backgroundColor: '#FEF3C7' },
  tagFull: { backgroundColor: '#DEF7EC' },
  filterTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
  },
  filterTagTextActive: {
    color: '#043529',
  },
  dateSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    borderRadius: 8,
    height: 32,
    gap: 6,
  },
  dateInput: {
    fontSize: 12,
    color: '#374151',
    width: 90,
    outlineStyle: 'none',
    borderWidth: 0,
    backgroundColor: 'transparent',
  } as any,
  rangeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 2,
    borderRadius: 8,
    gap: 2,
  },
  rangeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rangeBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  rangeBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  rangeBtnTextActive: {
    color: '#00ea6b',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    borderRadius: 8,
    height: 32,
    width: 150,
    gap: 8,
  },
  searchInput: {
    fontSize: 12,
    color: '#111827',
    flex: 1,
    outlineStyle: 'none',
  } as any,
  mainScroll: {
    flex: 1,
    minHeight: 400,
  },
  mainScrollContent: {
    flexGrow: 1,
  },
  selectionTabs: {
    backgroundColor: 'transparent',
    paddingBottom: 8,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabChipSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabChipTextSelected: {
    color: '#FFFFFF',
  },
  hierarchyContainer: {
    padding: 16,
    paddingTop: 8,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inventoryContainer: {
    backgroundColor: 'transparent',
    padding: 16,
  },
  inventoryContainerExpanded: {
    padding: 12,
    backgroundColor: 'transparent',
  },
  inventoryStaticList: {
    marginTop: 12,
  },
  compactDateRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
    paddingBottom: 12,
  },
  compactDateLabel: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  dateNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  slotsWrapper: {
    flex: 1,
  },
  noSlotsText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 85,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  slotTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  slotStatus: {
    fontSize: 8,
    fontWeight: '700',
    marginTop: 1,
    textTransform: 'uppercase',
  },
  noGroundSelected: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 8,
  },
  addGroundBtn: {
    marginTop: 16,
    backgroundColor: '#00ea6b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addGroundBtnText: {
    color: '#05291f',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  choiceCard: {
    width: '90%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignSelf: 'center',
  },
  choiceTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  choiceSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  choiceButtons: {
    gap: 12,
  },
  choiceBtn: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  choiceBtnPrimary: {
    backgroundColor: '#01b854',
    borderColor: '#01b854',
  },
  choiceBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  choiceBtnTextWhite: {
    color: '#FFFFFF',
  },
  choiceBtnPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#01b854',
  },
  choiceCancel: {
    marginTop: 20,
    alignItems: 'center',
    padding: 8,
  },
  choiceCancelText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
  },
  mobileFiltersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  mobileFilterItem: {
    minWidth: 120,
  },
  mobileDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 36,
    gap: 6,
    minWidth: 100,
  },
  mobileDropdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    maxWidth: 100,
  },
  pickerCard: {
    width: '90%',
    maxHeight: '70%',
    padding: 0,
    borderRadius: 24,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  pickerOptions: {
    padding: 12,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  pickerOptionActive: {
    backgroundColor: '#F0FDF4',
  },
  pickerOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  pickerOptionTextActive: {
    color: '#059669',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // --- Single-row controls bar (web) ---
  webControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  webControlsDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 2,
  },
  // --- Venue selector styles (web) ---
  venueTabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  venueTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  venueTabSelected: {
    backgroundColor: '#00ea6b',
    borderColor: '#00ea6b',
  },
  venueTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    maxWidth: 90,
  },
  venueTabTextSelected: {
    color: '#043529',
  },
  venueTabCity: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
    maxWidth: 70,
  },
  venueTabCitySelected: {
    color: '#086641',
  },
  // Hover tooltip
  venueTooltip: {
    position: 'absolute',
    bottom: '100%' as any,
    left: '50%' as any,
    transform: [{ translateX: -60 }],
    marginBottom: 6,
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 9999,
    minWidth: 120,
    maxWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  venueTooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  // --- Current venue bar (web inventory header) ---
  currentVenueBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  currentVenueName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
    flex: 1,
  },
  currentVenueCity: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  // --- Header top-right venue name ---
  headerVenueName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    maxWidth: 320,
  },
  headerVenueNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
    maxWidth: 200,
  },
  headerVenueCity: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  // --- Days range filter (web) ---
  webDaysFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  webDaysFilterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  webDaysFilterPills: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#F3F4F6',
    padding: 3,
    borderRadius: 10,
  },
  webDaysPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 7,
  },
  webDaysPillActive: {
    backgroundColor: '#111827',
  },
  webDaysPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  webDaysPillTextActive: {
    color: '#00ea6b',
  },
});
