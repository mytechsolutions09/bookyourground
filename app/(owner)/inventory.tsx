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
} from 'react-native';

const IS_WEB = Platform.OS === 'web';
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
            statusColor = '#ECFDF5';
            textColor = '#043529';
          } else if (statusText === 'PARTIAL') {
            statusColor = '#FFFBEB';
            textColor = '#92400E';
          }

          return (
            <View key={s.id} style={[styles.slotChip, { backgroundColor: statusColor }]}>
              <Text style={[styles.slotTime, { color: textColor }]}>
                {normalizeDbTimeToHHMM(s.start_time)}
              </Text>
              <Text style={[styles.slotStatus, { color: textColor }]}>{statusText}</Text>
            </View>
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
            <Text style={styles.inventoryTitle}>{daysToShow}-Day Inventory Plan</Text>
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
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Inventory Plan</Text>
            <Text style={styles.subtitle}>Manage your ground occupancy and slots</Text>
          </View>
          
          <Card style={styles.filterCard}>
            <View style={styles.filtersContainer}>
               <View style={styles.statusFilters}>
                  {['ALL', 'EMPTY', 'PARTIAL', 'FULL'].map(status => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => toggleStatusFilter(status)}
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
            <ActivityIndicator size="large" color="#00ea6b" style={{ marginTop: 40 }} />
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
      {!isWeb && <MobileAppNavbar title="Inventory Plan" titleColor="#00ea6b" />}
      {isWeb ? <WebLayout noCard>{content}</WebLayout> : <View style={styles.screen}>{content}</View>}
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
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
    padding: 12,
    borderRadius: 20,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
       web: {
         boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
       } as any
    })
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  statusFilters: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderRadius: 10,
  },
  filterTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterTagActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    transform: [{ scale: 1.02 }],
  },
  tagAll: {
    backgroundColor: '#00ea6b',
    borderColor: '#00c158',
    borderWidth: 1,
  },
  tagEmpty: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    borderWidth: 1,
  },
  tagPartial: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  tagFull: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  filterTagText: {
    fontSize: 12,
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
    color: '#00ea6b',
  },
  list: {
    padding: 16,
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
    fontSize: 18,
    fontWeight: '700',
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
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
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
    fontWeight: '700',
  },
  slotStatus: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 15,
  },
});
