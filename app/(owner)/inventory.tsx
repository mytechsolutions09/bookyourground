import React, { useEffect, useState, useMemo } from 'react';
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
} from 'react-native';

const IS_WEB = Platform.OS === 'web';
import { 
  ChevronRight, 
  ChevronDown, 
  Calendar, 
  Search, 
  Filter, 
  Building2, 
  LayoutGrid,
  Clock
} from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages, BookingWithDetails } from '@/types';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import Card from '@/components/ui/Card';
import { formatDateDDMMYY, formatCurrency } from '@/utils/helpers';
import { normalizeDbTimeToHHMM } from '@/utils/bookingSlots';
import { cricketTeamsLabelFromBooking } from '@/utils/cricketGround';

export default function OwnerInventoryScreen() {
  const { user } = useAuth();
  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [daysToShow, setDaysToShow] = useState<number>(7);
  const [bookingChoice, setBookingChoice] = useState<any | null>(null);

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (user) loadData();
  }, [selectedDateFilter, daysToShow, user]);

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

      // 2. Fetch bookings for selected days range starting from selected date
      const pivotDate = selectedDateFilter ? new Date(selectedDateFilter) : new Date();
      const startDate = pivotDate.toISOString().split('T')[0];
      const endDate = new Date(pivotDate.getTime() + daysToShow * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          ground:grounds(*, ground_images(*)),
          user:profiles(*)
        `)
        .eq('ground.owner_id', user.id)
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)
        .in('status', ['confirmed', 'completed']);

      if (bookingsError) throw bookingsError;

      setGrounds(groundsData || []);
      setBookings(bookingsData || []);
      
      // Auto-select first ground if none selected
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

  // Group bookings by ground, date, and slot
  const bookingsMap = useMemo(() => {
    const map = new Map<string, BookingWithDetails[]>();
    bookings.forEach(b => {
      const key = `${b.ground_id}_${b.booking_date}_${b.start_time}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    return map;
  }, [bookings]);

  const getOccupancy = (groundId: string, date: string, startTime: string, pitchType: string | null) => {
    const key = `${groundId}_${date}_${startTime}`;
    const slotBookings = bookingsMap.get(key) || [];
    
    return slotBookings.reduce((sum, b) => {
      const label = cricketTeamsLabelFromBooking(pitchType, b.notes);
      if (label === '1 team') return sum + 1;
      return sum + 2; // Full ground
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
          const occupancy = getOccupancy(ground.id, dateStr, s.start_time, ground.pitch_type);
          const statusText = getSlotStatus(occupancy);
          
          let statusColor = '#F3F4F6'; // Empty
          let textColor = '#6B7280';

          if (statusText === 'FULL') {
            statusColor = '#DEF7EC';
            textColor = '#03543F';
          } else if (statusText === 'PARTIAL') {
            statusColor = '#FEF3C7';
            textColor = '#92400E';
          }

          const isClickable = statusText !== 'FULL';

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
                {normalizeDbTimeToHHMM(s.start_time)}
              </Text>
              <Text style={[styles.slotStatus, { color: textColor }]}>{statusText}</Text>
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
  };

  const content = (
    <View style={styles.content}>
      <View style={[styles.pageHeader, isWeb && styles.webPageHeader]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Inventory Management</Text>
            {isScrolled && currentGround ? (
              <View style={styles.headerContext}>
                <View style={styles.contextBadge}>
                  <Building2 size={12} color="#00ea6b" />
                  <Text style={styles.contextText}>{currentGround.name}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.subtitle}>Owner Dashboard</Text>
            )}
          </View>
          
          <Card style={styles.filterCard}>
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
  
               <View style={styles.dateSearchContainer}>
                  {IS_WEB ? (
                    <input
                      type="date"
                      value={selectedDateFilter || ''}
                      onChange={(e) => setSelectedDateFilter(e.target.value)}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '13px',
                        color: '#374151',
                        outline: 'none',
                        width: '130px',
                        height: '100%',
                        paddingLeft: '32px',
                        cursor: 'pointer',
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236B7280\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Crect x=\'3\' y=\'4\' width=\'18\' height=\'18\' rx=\'2\' ry=\'2\'/%3E%3Cline x1=\'16\' y1=\'2\' x2=\'16\' y2=\'6\'/%3E%3Cline x1=\'8\' y1=\'2\' x2=\'8\' y2=\'6\'/%3E%3Cline x1=\'3\' y1=\'10\' x2=\'21\' y2=\'10\'/%3E%3C/svg%3E")',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: '8px center',
                        WebkitAppearance: 'none',
                        appearance: 'none',
                      } as any}
                    />
                  ) : (
                    <>
                      <Calendar size={16} color="#6B7280" />
                      <TextInput
                        style={styles.dateInput}
                        placeholder="YYYY-MM-DD"
                        value={selectedDateFilter || ''}
                        onChangeText={setSelectedDateFilter}
                        maxLength={10}
                      />
                    </>
                  )}
               </View>
  
               <View style={styles.rangeSelector}>
                  {[7, 14, 30, 90].map(days => (
                    <TouchableOpacity
                      key={days}
                      onPress={() => setDaysToShow(days)}
                      style={[styles.rangeBtn, daysToShow === days && styles.rangeBtnActive]}
                    >
                      <Text style={[styles.rangeBtnText, daysToShow === days && styles.rangeBtnTextActive]}>{days}D</Text>
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
          </Card>
        </View>
      </View>

      <ScrollView 
        style={styles.mainScroll} 
        contentContainerStyle={styles.mainScrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
      >
        {!isScrolled && grounds.length > 0 && (
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

        <View style={styles.hierarchyContainer}>
          <View style={[styles.inventoryContainer, isScrolled && styles.inventoryContainerExpanded]}>
            <View style={styles.sectionHeader}>
              <LayoutGrid size={16} color="#111827" />
              <Text style={styles.sectionTitle}>
                {currentGround ? `Inventory: ${currentGround.name}` : 'Select a ground'}
              </Text>
            </View>

            {currentGround ? (
              <View style={styles.inventoryStaticList}>
                {Array.from({ length: daysToShow }).map((_, i) => {
                  const d = new Date();
                  if (selectedDateFilter) {
                    const [y, m, day] = selectedDateFilter.split('-').map(Number);
                    d.setFullYear(y, m - 1, day);
                  }
                  d.setDate(d.getDate() + i);
                  const dateStr = d.toISOString().split('T')[0];
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
    </View>
  );

  return (
    <>
      {!isWeb && <MobileAppNavbar title="Inventory" titleColor="#00ea6b" />}
      {isWeb ? <WebLayout noCard>{content}</WebLayout> : <View style={styles.screen}>{content}</View>}
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
    paddingTop: 10,
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
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
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
    paddingBottom: 40,
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
    flex: 1,
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
    flex: 1,
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
});
