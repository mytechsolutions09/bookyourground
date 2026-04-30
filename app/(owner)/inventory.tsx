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

  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isSmall = width < 900;
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
        .eq('active', true)
        .eq('approved', true)
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
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
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
              style={[styles.slotChip, { backgroundColor: statusColor }]}
              disabled={!isClickable}
              onPress={() => {
                const startHHMM = normalizeDbTimeToHHMM(s.start_time);
                const endHHMM = normalizeDbTimeToHHMM(s.end_time);
                const isBox = (ground.pitch_type ?? '').toLowerCase().includes('box');
                const basePrice = s.custom_price ?? 0;

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

  const content = (
    <View style={styles.content}>
      <View style={[
        styles.pageHeader, 
        isWeb && styles.webPageHeader,
      ]}>
        <View style={[
          styles.headerTop,
          (isWeb && !isSmall) ? { flexDirection: 'row', alignItems: 'center' } : { flexDirection: 'column', alignItems: 'flex-start' }
        ]}>
          <View>
            {!isSmall && <Text style={styles.title}>Inventory Management</Text>}
            {!isSmall && (
              isScrolled && currentGround ? (
                <View style={styles.headerContext}>
                  <View style={styles.contextBadge}>
                    <Building2 size={12} color="#00ea6b" />
                    <Text style={styles.contextText}>{currentGround.name}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.subtitle}>Owner Dashboard</Text>
              )
            )}
          </View>
          
          <Card style={[
            styles.filterCard,
            isSmall && { marginTop: -8 }
          ]}>
            {isSmall ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mobileFiltersRow}
              >
                {/* Ground Selector Dropdown */}
                <TouchableOpacity 
                  style={styles.mobileDropdown}
                  onPress={() => setActivePicker('ground')}
                >
                  <Building2 size={14} color="#00ea6b" />
                  <Text style={styles.mobileDropdownText} numberOfLines={1}>
                    {currentGround?.name || 'Select Ground'}
                  </Text>
                  <ChevronDown size={14} color="#6B7280" />
                </TouchableOpacity>

                {/* Status Selector Dropdown */}
                <TouchableOpacity 
                  style={styles.mobileDropdown}
                  onPress={() => setActivePicker('status')}
                >
                  <Filter size={14} color="#00ea6b" />
                  <Text style={styles.mobileDropdownText}>{statusFilter}</Text>
                  <ChevronDown size={14} color="#6B7280" />
                </TouchableOpacity>

                {/* Range Selector */}
                <TouchableOpacity 
                  style={styles.mobileDropdown}
                  onPress={() => setActivePicker('range')}
                >
                  <Clock size={14} color="#00ea6b" />
                  <Text style={styles.mobileDropdownText}>{daysToShow}D</Text>
                  <ChevronDown size={14} color="#6B7280" />
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View style={styles.filtersContainer}>
                 <View style={styles.statusFilters}>
                    {['ALL', 'EMPTY', 'PARTIAL', 'FULL'].map(status => (
                      <TouchableOpacity
                        key={status}
                        onPress={() => setStatusFilter(status)}
                        style={[
                          styles.filterTag,
                          statusFilter === status && styles.filterTagActive,
                          status === 'ALL' && statusFilter === 'ALL' && styles.tagAll,
                          status === 'EMPTY' && statusFilter === 'EMPTY' && styles.tagEmpty,
                          status === 'PARTIAL' && statusFilter === 'PARTIAL' && styles.tagPartial,
                          status === 'FULL' && statusFilter === 'FULL' && styles.tagFull,
                        ]}
                      >
                        <Text style={[
                          styles.filterTagText,
                          statusFilter === status && styles.filterTagTextActive
                        ]}>{status}</Text>
                      </TouchableOpacity>
                    ))}
                 </View>
    
                 <View style={styles.rangeSelector}>
                    {[7, 14, 30, 90, 'L30'].map(days => (
                      <TouchableOpacity
                        key={days.toString()}
                        onPress={() => setDaysToShow(days as any)}
                        style={[styles.rangeBtn, daysToShow === days && styles.rangeBtnActive]}
                      >
                        <Text style={[styles.rangeBtnText, daysToShow === days && styles.rangeBtnTextActive]}>
                          {days === 'L30' ? 'Past' : `${days}D`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                 </View>
  
                 <View style={styles.searchContainer}>
                    <Search size={16} color="#6B7280" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search Ground..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                 </View>
              </View>
            )}
          </Card>
        </View>
      </View>

      <ScrollView 
        style={styles.mainScroll} 
        contentContainerStyle={[
          styles.mainScrollContent,
          { 
            paddingTop: (isWeb && isSmall) ? 50 : 0,
            paddingBottom: isSmall ? 0 : 80
          }
        ]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
      >
        {!isScrolled && !isSmall && grounds.length > 0 && (
          <View style={styles.selectionTabs}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              showsVerticalScrollIndicator={false}
              overScrollMode="never"
              bounces={false}
              contentContainerStyle={styles.tabsScroll}
            >
              {filteredGrounds.map(ground => {
                const isSelected = selectedGroundId === ground.id;
                return (
                  <TouchableOpacity 
                    key={ground.id}
                    style={[styles.tabChip, isSelected && styles.tabChipSelected]}
                    onPress={() => setSelectedGroundId(ground.id)}
                  >
                    <Building2 size={12} color={isSelected ? '#FFFFFF' : '#6B7280'} />
                    <Text style={[styles.tabChipText, isSelected && styles.tabChipTextSelected]}>
                      {ground.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={[
          styles.hierarchyContainer,
          isSmall && { padding: 0, paddingTop: 0, gap: 0 }
        ]}>
          <View style={[
            styles.inventoryContainer,
            (isScrolled || isSmall) && styles.inventoryContainerExpanded,
            isSmall && { backgroundColor: 'transparent' }
          ]}>
            {!isSmall && (
              <View style={styles.sectionHeader}>
                <LayoutGrid size={16} color="#111827" />
                <Text style={styles.sectionTitle}>
                  {currentGround ? `Inventory: ${currentGround.name}` : 'Select a ground'}
                </Text>
              </View>
            )}

            {currentGround ? (
              <View style={styles.inventoryStaticList}>
                {Array.from({ length: daysToShow === 'L30' ? 30 : daysToShow }).map((_, i) => {
                  const d = new Date();
                  if (daysToShow === 'L30') {
                    d.setDate(d.getDate() - 29 + i);
                  } else if (selectedDateFilter) {
                    const [y, m, day] = selectedDateFilter.split('-').map(Number);
                    d.setFullYear(y, m - 1, day);
                    d.setDate(d.getDate() + i);
                  }

                  const dateStr = toLocalIsoDate(d);
                  const displayDate = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

                  return (
                    <View key={dateStr} style={styles.compactDateRow}>
                      <View style={styles.compactDateLabel}>
                        <Text style={styles.dateDay}>{displayDate.split(' ')[0]}</Text>
                        <Text style={styles.dateNum}>{displayDate.split(' ')[1]} {displayDate.split(' ')[2]}</Text>
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
                 <ActivityIndicator size="small" color="#00ea6b" />
                 <Text style={styles.emptyText}>No grounds found in your inventory</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

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
                  const finalAmount = (b.basePrice / 2);
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
                      pricePerHour: b.basePrice.toString()
                    }
                  });
                }}
              >
                <Text style={styles.choiceBtnText}>Book 1 Team</Text>
                <Text style={styles.choiceBtnPrice}>₹{(bookingChoice?.basePrice / 2).toLocaleString('en-IN')}</Text>
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
                      amount: b.basePrice.toString(),
                      pricePerHour: b.basePrice.toString()
                    }
                  });
                }}
              >
                <Text style={[styles.choiceBtnText, styles.choiceBtnTextWhite]}>Full Ground</Text>
                <Text style={[styles.choiceBtnPrice, styles.choiceBtnTextWhite]}>₹{bookingChoice?.basePrice?.toLocaleString('en-IN')}</Text>
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

      {/* Picker Modal for Mobile Dropdowns */}
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

  return (
    <>
      {isWeb ? (
        <WebLayout hideHeader={isSmall} isPublicNoSidebar={isSmall}>
          {isSmall && (
            <Animated.View style={[headerAnimatedStyle, { paddingTop: insets.top, backgroundColor: '#FFFFFF' }]}>
              <MobileAppNavbar title="Inventory" titleColor="#00ea6b" />
            </Animated.View>
          )}
          <View style={styles.screen}>{content}</View>
        </WebLayout>
      ) : (
        <>
          <MobileAppNavbar title="Inventory" titleColor="#00ea6b" />
          <View style={styles.screen}>{content}</View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  pageHeader: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  webPageHeader: {
    paddingTop: 8,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
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
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
       web: {
         boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
       } as any
    })
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
  },
  mainScrollContent: {
    // base padding
  },
  selectionTabs: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  inventoryContainerExpanded: {
    borderRadius: 0,
    borderWidth: 0,
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
    marginTop: 2,
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
  }
});
