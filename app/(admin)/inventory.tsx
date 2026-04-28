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
import { ChevronRight, ChevronDown, Calendar, Search, Filter, Users, Building2, LayoutGrid } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages, BookingWithDetails, Profile } from '@/types';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import Card from '@/components/ui/Card';
import { formatDateDDMMYY } from '@/utils/helpers';
import { normalizeDbTimeToHHMM } from '@/utils/bookingSlots';
import { cricketTeamsLabelFromBooking } from '@/utils/cricketGround';

interface OwnerWithGrounds extends Profile {
  grounds: GroundWithImages[];
}

export default function AdminInventoryScreen() {
  const [owners, setOwners] = useState<OwnerWithGrounds[]>([]);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [daysToShow, setDaysToShow] = useState<number>(7);

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    loadData();
  }, [selectedDateFilter, daysToShow]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch owners and their grounds
      const { data: ownersData, error: ownersError } = await supabase
        .from('profiles')
        .select(`
          *,
          grounds:grounds(*, ground_images(*), time_slots(*))
        `)
        .eq('role', 'ground_owner')
        .order('full_name');

      if (ownersError) throw ownersError;

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
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)
        .in('status', ['confirmed', 'completed']);

      if (bookingsError) throw bookingsError;

      setOwners(ownersData || []);
      setBookings(bookingsData || []);
      
      // Auto-select first owner if none selected
      if (!selectedOwnerId && ownersData && ownersData.length > 0) {
        setSelectedOwnerId(ownersData[0].id);
        if (ownersData[0].grounds && ownersData[0].grounds.length > 0) {
          setSelectedGroundId(ownersData[0].grounds[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOwners = useMemo(() => {
    if (!searchQuery) return owners;
    const q = searchQuery.toLowerCase();
    return owners.filter(o => 
      (o.full_name || '').toLowerCase().includes(q) ||
      (o.business_name || '').toLowerCase().includes(q)
    );
  }, [owners, searchQuery]);

  const currentOwner = useMemo(() => 
    owners.find(o => o.id === selectedOwnerId), 
  [owners, selectedOwnerId]);

  const currentGround = useMemo(() => 
    currentOwner?.grounds.find(g => g.id === selectedGroundId),
  [currentOwner, selectedGroundId]);

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
    // Determine day of week for time_slots filtering
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = days[new Date(dateStr).getDay()];

    // Get slots for this specific day of week
    const slots = ((ground as any).time_slots || [])
      .filter((s: any) => s.day_of_week === dayOfWeek)
      .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));

    // Filter slots based on selected status
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
          
          let statusColor = '#F3F4F6'; // Empty
          let textColor = '#6B7280';

          if (statusText === 'FULL') {
            statusColor = '#DEF7EC';
            textColor = '#03543F';
          } else if (statusText === 'PARTIAL') {
            statusColor = '#FEF3C7';
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

  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setIsScrolled(offsetY > 20);
  };

  const renderOwnerItem = ({ item }: { item: OwnerWithGrounds }) => {
    const isSelected = selectedOwnerId === item.id;
    return (
      <TouchableOpacity 
        style={[styles.ownerChip, isSelected && styles.ownerChipSelected]}
        onPress={() => {
          setSelectedOwnerId(item.id);
          if (item.grounds.length > 0) {
            setSelectedGroundId(item.grounds[0].id);
          } else {
            setSelectedGroundId(null);
          }
        }}
      >
        <Users size={14} color={isSelected ? '#FFFFFF' : '#6B7280'} />
        <Text style={[styles.ownerChipText, isSelected && styles.ownerChipTextSelected]}>
          {item.business_name || item.full_name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderGroundChip = (ground: GroundWithImages) => {
    const isSelected = selectedGroundId === ground.id;
    return (
      <TouchableOpacity 
        key={ground.id}
        style={[styles.groundChip, isSelected && styles.groundChipSelected]}
        onPress={() => setSelectedGroundId(ground.id)}
      >
        <Building2 size={14} color={isSelected ? '#FFFFFF' : '#6B7280'} />
        <Text style={[styles.groundChipText, isSelected && styles.groundChipTextSelected]}>
          {ground.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const content = (
    <View style={styles.content}>
      <View style={[styles.pageHeader, isWeb && styles.webPageHeader]}>
        <View style={styles.headerTop}>
          <View>
            {Platform.OS === 'web' && <Text style={styles.title}>Inventory Management</Text>}
            {isScrolled && currentOwner && currentGround ? (
              <View style={styles.headerContext}>
                <View style={styles.contextBadge}>
                  <Users size={12} color="#00ea6b" />
                  <Text style={styles.contextText}>{currentOwner.business_name || currentOwner.full_name}</Text>
                </View>
                <Text style={styles.contextSeparator}>/</Text>
                <View style={styles.contextBadge}>
                  <Building2 size={12} color="#00ea6b" />
                  <Text style={styles.contextText}>{currentGround.name}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.subtitle}>Super Admin Panel</Text>
            )}
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
                    placeholder="Search Owner..."
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
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
      >
        {/* Selection Tabs - Collapsible/Adaptable */}
        {!isScrolled && (
          <View style={styles.selectionTabs}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.tabsScroll}
            >
              {filteredOwners.map(item => {
                const isSelected = selectedOwnerId === item.id;
                return (
                  <TouchableOpacity 
                    key={item.id}
                    style={[styles.tabChip, isSelected && styles.tabChipSelected]}
                    onPress={() => {
                      setSelectedOwnerId(item.id);
                      if (item.grounds.length > 0) {
                        setSelectedGroundId(item.grounds[0].id);
                      } else {
                        setSelectedGroundId(null);
                      }
                    }}
                  >
                    <Users size={12} color={isSelected ? '#FFFFFF' : '#6B7280'} />
                    <Text style={[styles.tabChipText, isSelected && styles.tabChipTextSelected]}>
                      {item.business_name || item.full_name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {currentOwner && currentOwner.grounds.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={[styles.tabsScroll, styles.groundTabsScroll]}
              >
                {currentOwner.grounds.map(ground => {
                  const isSelected = selectedGroundId === ground.id;
                  return (
                    <TouchableOpacity 
                      key={ground.id}
                      style={[styles.tabChip, styles.groundTabChip, isSelected && styles.groundTabChipSelected]}
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
            )}
          </View>
        )}

        <View style={styles.hierarchyContainer}>
          {/* Inventory Table */}
          <View style={[styles.inventoryContainer, isScrolled && styles.inventoryContainerExpanded]}>
            <View style={styles.sectionHeader}>
              <LayoutGrid size={16} color="#111827" />
              <Text style={styles.sectionTitle}>
                {currentGround ? `Inventory: ${currentGround.name}` : 'Select a ground to view inventory'}
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
                 <Text style={styles.emptyText}>Select an owner and ground to see availability</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <>
      {!isWeb && <MobileAppNavbar title="Admin Inventory" titleColor="#00ea6b" />}
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
  contextSeparator: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
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
  groundTabsScroll: {
    paddingTop: 0,
    paddingBottom: 12,
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
  groundTabChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  groundTabChipSelected: {
    backgroundColor: '#00ea6b',
    borderColor: '#00ea6b',
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
  ownerList: {
    paddingBottom: 4,
    gap: 8,
  },
  ownerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ownerChipSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  ownerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  ownerChipTextSelected: {
    color: '#FFFFFF',
  },
  groundList: {
    gap: 8,
    paddingBottom: 4,
  },
  groundChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  groundChipSelected: {
    backgroundColor: '#00ea6b',
    borderColor: '#00ea6b',
  },
  groundChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  groundChipTextSelected: {
    color: '#FFFFFF',
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
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 6,
  },
  dateDay: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  dateNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  slotsWrapper: {
    flex: 1,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  slotChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    minWidth: 75,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  slotTime: {
    fontSize: 10,
    fontWeight: '700',
  },
  slotStatus: {
    fontSize: 8,
    fontWeight: '800',
    marginTop: 1,
  },
  noSlotsText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  noGroundSelected: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySmall: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    padding: 8,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});
