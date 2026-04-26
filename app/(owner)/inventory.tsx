import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Platform,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  useWindowDimensions,
} from 'react-native';

const IS_WEB = Platform.OS === 'web';
import { router } from 'expo-router';
import { ChevronRight, ChevronDown, Calendar, Search, Filter, CalendarClock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages, BookingWithDetails } from '@/types';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import Card from '@/components/ui/Card';
import { formatDateDDMMYY } from '@/utils/helpers';
import { normalizeDbTimeToHHMM } from '@/utils/bookingSlots';
import { cricketTeamsLabelFromBooking } from '@/utils/cricketGround';
import { slugifyGroundSegment } from '@/utils/groundSlug';

export default function OwnerInventoryScreen() {
  const { user } = useAuth();
  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroundId, setExpandedGroundId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [daysToShow, setDaysToShow] = useState<number>(30);
  const [bookingChoice, setBookingChoice] = useState<any | null>(null);

  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

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
        .eq('ground.owner_id', user.id) // Only bookings for my grounds
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)
        .in('status', ['confirmed', 'completed']);

      if (bookingsError) throw bookingsError;

      setGrounds(groundsData || []);
      setBookings(bookingsData || []);
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGrounds = useMemo(() => {
    if (!searchQuery) return grounds;
    return grounds.filter(g => 
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [grounds, searchQuery]);

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
        return <Text style={styles.noSlotsText}>No slots match selected filters</Text>;
      }
      return <Text style={styles.noSlotsText}>No slots configured for {dayOfWeek}</Text>;
    }
    
    return (
      <View style={styles.slotsGrid}>
        {filteredSlots.map((s: any) => {
          const occupancy = getOccupancy(ground.id, dateStr, s.start_time, ground.pitch_type);
          const statusText = getSlotStatus(occupancy);
          
          let statusColor = '#F3F4F6';
          let textColor = '#6B7280';

          if (statusText === 'FULL') {
            statusColor = '#F0FDF4';
            textColor = '#166534';
          } else if (statusText === 'PARTIAL') {
            statusColor = '#FFFBEB';
            textColor = '#92400E';
          }

          const isClickable = statusText !== 'FULL';
          const teamParam = statusText === 'PARTIAL' ? 'one' : 'both';

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
                  goToCheckout(teamParam as 'one' | 'both');
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

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(status);
  };

  const renderGroundRow = ({ item: ground }: { item: GroundWithImages }) => {
    const isExpanded = expandedGroundId === ground.id;
    
    return (
      <Card style={styles.groundCard}>
        <TouchableOpacity 
          style={styles.groundHeader} 
          onPress={() => setExpandedGroundId(isExpanded ? null : ground.id)}
        >
          <View style={styles.groundInfo}>
            <Text style={styles.groundName}>{ground.name}</Text>
            <Text style={styles.groundLocation}>{ground.city}, {ground.state}</Text>
          </View>
          {isExpanded ? <ChevronDown size={20} color="#666" /> : <ChevronRight size={20} color="#666" />}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <Text style={styles.inventoryTitle}>{daysToShow}-Day Inventory</Text>
            {Array.from({ length: daysToShow }).map((_, i) => {
              const d = new Date();
              if (selectedDateFilter) {
                const [y, m, day] = selectedDateFilter.split('-').map(Number);
                d.setFullYear(y, m - 1, day);
              }
              d.setDate(d.getDate() + i);
              const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const displayDate = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

              return (
                <View key={dateStr} style={styles.dateRow}>
                  <View style={styles.dateLabelContainer}>
                    <Text style={styles.dateLabel}>{displayDate}</Text>
                  </View>
                  {renderSlotsForDate(ground, dateStr)}
                </View>
              );
            })}
          </View>
        )}
      </Card>
    );
  };

  const content = (
    <View style={styles.content}>
      <View style={[styles.pageHeader, isWeb && styles.webPageHeader]}>
        <View style={[styles.headerTop, isMobile && styles.headerTopMobile]}>
          <View>
            <Text style={styles.title}>Inventory</Text>
            <Text style={styles.subtitle}>Manage your ground occupancy and slots</Text>
          </View>
          
          <Card style={[styles.filterCard, isMobile && styles.filterCardMobile]}>
            <View style={[styles.filtersContainer, isMobile && styles.filtersContainerMobile]}>
               <View style={styles.statusFilters}>
                  {['ALL', 'EMPTY', 'PARTIAL', 'FULL'].map(status => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => toggleStatusFilter(status)}
                      style={[
                        styles.filterTag,
                        statusFilter === status && styles.filterTagActive,
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
                    <>
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
                        }}
                      />
                      <style dangerouslySetInnerHTML={{ __html: `
                        input[type="date"]::-webkit-calendar-picker-indicator {
                          background: transparent;
                          bottom: 0;
                          color: transparent;
                          cursor: pointer;
                          height: auto;
                          left: 0;
                          position: absolute;
                          right: 0;
                          top: 0;
                          width: auto;
                          -webkit-appearance: none;
                        }
                      `}} />
                    </>
                  ) : (
                    <>
                      <Calendar size={16} color="#6B7280" />
                      <TextInput
                        style={styles.dateInput}
                        placeholder="YYYY-MM-DD"
                        value={selectedDateFilter || ''}
                        onChangeText={(val) => {
                          setSelectedDateFilter(val || null);
                        }}
                        maxLength={10}
                      />
                    </>
                  )}
               </View>

                <View style={styles.rangeSelector}>
                   <TouchableOpacity
                     onPress={() => setDaysToShow(7)}
                     style={[styles.rangeBtn, daysToShow === 7 && styles.rangeBtnActive]}
                   >
                     <Text style={[styles.rangeBtnText, daysToShow === 7 && styles.rangeBtnTextActive]}>7D</Text>
                   </TouchableOpacity>
                   <TouchableOpacity
                     onPress={() => setDaysToShow(30)}
                     style={[styles.rangeBtn, daysToShow === 30 && styles.rangeBtnActive]}
                   >
                     <Text style={[styles.rangeBtnText, daysToShow === 30 && styles.rangeBtnTextActive]}>30D</Text>
                   </TouchableOpacity>
                   <TouchableOpacity
                     onPress={() => setDaysToShow(90)}
                     style={[styles.rangeBtn, daysToShow === 90 && styles.rangeBtnActive]}
                   >
                     <Text style={[styles.rangeBtnText, daysToShow === 90 && styles.rangeBtnTextActive]}>90D</Text>
                   </TouchableOpacity>
                </View>
            </View>
          </Card>
        </View>
      </View>

      <FlatList
        data={filteredGrounds}
        renderItem={renderGroundRow}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#01b854" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No grounds found in your inventory</Text>
            </View>
          )
        }
      />
    </View>
  );

  return (
    <>
      {!isWeb && <MobileAppNavbar title="Inventory Plan" titleColor="#01b854" />}
      {isWeb ? <WebLayout>{content}</WebLayout> : <View style={styles.screen}>{content}</View>}

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
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  pageHeader: {
    backgroundColor: 'transparent',
    padding: 0,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  webPageHeader: {
    paddingTop: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    width: '100%',
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '500',
    color: '#111827',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    marginTop: 2,
  },
  headerTop: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    gap: 16,
  },
  filterCard: {
    padding: 4,
    borderRadius: 16,
    marginTop: 0,
    backgroundColor: 'transparent',
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  filtersContainerMobile: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  headerTopMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  filterCardMobile: {
    width: '100%',
    padding: 0,
  },
  statusFilters: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  filterTagActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  filterTagText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTagTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  dateSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    borderRadius: 8,
    height: 36,
    gap: 8,
  },
  dateInput: {
    fontSize: 13,
    color: '#374151',
    width: IS_WEB ? 150 : 100,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rangeBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rangeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  rangeBtnTextActive: {
    color: '#01b854',
  },
  list: {
    padding: 0,
    width: '100%',
  },
  groundCard: {
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
    borderRadius: 24,
  },
  groundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  groundInfo: {
    flex: 1,
  },
  groundName: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  groundLocation: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  expandedContent: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  inventoryTitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dateRow: {
    marginBottom: 20,
  },
  dateLabelContainer: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    textTransform: 'uppercase',
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
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
  },
  slotStatus: {
    fontFamily: 'Inter',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 15,
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
