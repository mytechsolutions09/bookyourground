import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, Platform, TouchableOpacity, ScrollView, TextInput, Modal, useWindowDimensions } from 'react-native';
import { Calendar, Filter, X, ChevronDown, CheckCircle2, Search, Banknote, Clock, Users, Circle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BookingWithDetails } from '@/types';
import BookingCard from '@/components/bookings/BookingCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import { router } from 'expo-router';
import { cricketTeamsLabelFromBooking } from '@/utils/cricketGround';
import { normalizeDbTimeToHHMM, formatTime12h } from '@/utils/bookingSlots';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { formatDateDDMMYY, isDateInPast, getStatusColor } from '@/utils/helpers';

export default function AdminBookingsScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const isSmallWeb = isWeb && width < 900;

  const { user, profile } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'past'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  const [totalDbCount, setTotalDbCount] = useState(0);
  const [upcomingDbCount, setUpcomingDbCount] = useState(0);
  const [pastDbCount, setPastDbCount] = useState(0);
  const [cancelledDbCount, setCancelledDbCount] = useState(0);
  const [platformSettings, setPlatformSettings] = useState<any>(null);


  const [showDateModal, setShowDateModal] = useState(false);
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({start: null, end: null});

  const [typeFilter, setTypeFilter] = useState('all');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [types, setTypes] = useState<any[]>([]);

  const [isSlotModalVisible, setIsSlotModalVisible] = useState(false);
  const [selectedSlotBookings, setSelectedSlotBookings] = useState<BookingWithDetails[]>([]);

  const openSlotModal = (item: BookingWithDetails) => {
    let relatedBookings: BookingWithDetails[] = [];
    
    if ((item as any).allBookingIds && (item as any).allBookingIds.length > 0) {
      relatedBookings = bookings.filter(b => (item as any).allBookingIds.includes(b.id));
    } else {
      const normStart = normalizeDbTimeToHHMM(item.start_time);
      const currentSlotKey = `${item.ground_id}_${item.booking_date}_${normStart}`;
      relatedBookings = bookings.filter(b => 
        (b.status === 'confirmed' || b.status === 'active' || b.status === 'completed') && 
        `${b.ground_id}_${b.booking_date}_${normalizeDbTimeToHHMM(b.start_time)}` === currentSlotKey
      );
    }
    
    setSelectedSlotBookings(relatedBookings);
    setIsSlotModalVisible(true);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) {
        setPage(0);
        setHasMore(true);
        loadBookings(0, false);
        loadCounts();
      }
    }, searchQuery ? 400 : 0);
    
    return () => clearTimeout(timer);
  }, [user, dateRange, typeFilter, activeTab, searchQuery]);

  useEffect(() => {
    const loadTypes = async () => {
      const { data } = await supabase.from('ground_types').select('*').eq('active', true).order('sort_order');
      const typesData = data || [];
      if (!typesData.some((t: any) => t.name.toLowerCase() === 'nets')) {
        typesData.push({ id: 'fallback-nets', name: 'Nets', label: 'Nets', active: true, sort_order: 99 });
      }
      setTypes(typesData);
    };
    loadTypes();
  }, []);

  const loadCounts = async () => {
    try {
      const todayIso = new Date().toISOString().split('T')[0];

      const [totalRes, upcomingRes, pastRes, cancelledRes] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('booking_date', todayIso),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).lt('booking_date', todayIso),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'cancelled')
      ]);

      setTotalDbCount(totalRes.count || 0);
      setUpcomingDbCount(upcomingRes.count || 0);
      setPastDbCount(pastRes.count || 0);
      setCancelledDbCount(cancelledRes.count || 0);
    } catch (e) {
      console.error('Error loading counts:', e);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('platform_settings').select('*');
        const settings: Record<string, any> = {};
        data?.forEach(s => { settings[s.key] = s.value; });
        setPlatformSettings(settings);
      } catch (e) {
        console.error('Error fetching settings:', e);
      }
    };
    fetchSettings();
  }, []);

  const calculateBRowFee = (row: any) => {
    if (!platformSettings) return Number(row.platform_fee_owner || 0) + Number(row.gst_owner || 0);
    
    const pitchType = (row.ground?.pitch_type ?? '').toLowerCase();
    const isNet = pitchType.includes('net') || pitchType.includes('lane');
    const isCricket = pitchType === 'cricket ground';
    
    const cricketFixedFee = Number(platformSettings.cricket_owner_fee_fixed ?? 100);
    const netsFixedFee = Number(platformSettings.nets_owner_fee_fixed ?? 25);
    const rate = Number(platformSettings.user_platform_fee_rate ?? 0.05);
    const gstRate = Number(platformSettings.gst_rate ?? 0.18);
    
    let ownerPf = 0;
    if (isNet) {
      ownerPf = netsFixedFee;
    } else if (isCricket) {
      const label = cricketTeamsLabelFromBooking(row.ground?.pitch_type, row.notes);
      const teams = (label?.toLowerCase() === '1 team' || label?.toLowerCase() === 'one') ? 1 : 2;
      ownerPf = cricketFixedFee * teams;
    } else {
      ownerPf = (row.total_amount + (row.discount_amount || 0)) * rate;
    }
    
    return ownerPf * (1 + gstRate);
  };


  const FilterDropdown = ({ id, label, value, options, onSelect }: any) => {
    const isOpen = activeDropdown === id;
    const selectedOption = options.find((o: any) => o.key === value);

    return (
      <View style={[styles.dropdownContainer, isOpen && { zIndex: 2000 }]}>
        <TouchableOpacity 
          style={[styles.dropdownTrigger, isOpen && styles.dropdownTriggerActive]} 
          onPress={() => setActiveDropdown(isOpen ? null : id)}
        >
          <Text style={styles.dropdownLabel}>{label}:</Text>
          <Text style={styles.dropdownValue}>{selectedOption?.label || 'Select'}</Text>
          <ChevronDown size={14} color="#6B7280" />
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.dropdownMenu}>
            {options.map((opt: any) => (
              <TouchableOpacity 
                key={opt.key} 
                style={[styles.dropdownItem, value === opt.key && styles.dropdownItemActive]}
                onPress={() => {
                  onSelect(opt.key);
                  setActiveDropdown(null);
                }}
              >
                <Text style={[styles.dropdownItemText, value === opt.key && styles.dropdownItemTextActive]}>
                  {opt.label}
                </Text>
                {value === opt.key && <CheckCircle2 size={14} color="#10b981" />}
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Modal
          visible={isSlotModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsSlotModalVisible(false)}
        >
          <View style={styles.slotModalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setIsSlotModalVisible(false)} />
            <View style={styles.slotModalContent}>
              <View style={styles.slotModalHeader}>
                <Text style={styles.slotModalTitle}>Slot Breakdown</Text>
                <TouchableOpacity onPress={() => setIsSlotModalVisible(false)}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={{ maxHeight: 500 }}>
                {selectedSlotBookings.sort((a, b) => `${a.booking_date}${a.start_time}` > `${b.booking_date}${b.start_time}` ? 1 : -1).map((b) => (
                  <View key={b.id} style={styles.slotBookingItem}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                         <View style={styles.whoAvatar}><Text style={styles.whoAvatarText}>{(b.user?.full_name || b.booked_for_name || 'C')[0].toUpperCase()}</Text></View>
                         <View>
                           <Text style={styles.slotBookingName}>{b.user?.full_name || b.booked_for_name || 'Customer'}</Text>
                           <Text style={styles.slotBookingId}>ID: {b.id.substring(0, 8).toUpperCase()}</Text>
                         </View>
                      </View>

                      <View style={styles.slotDetailsGrid}>
                         <View style={styles.slotDetailRow}>
                           <Calendar size={14} color="#64748B" />
                           <Text style={styles.slotBookingDetail}>{formatDateDDMMYY(b.booking_date)}</Text>
                         </View>
                         <View style={styles.slotDetailRow}>
                           <Clock size={14} color="#64748B" />
                           <Text style={styles.slotBookingDetail}>
                             {`${formatTime12h(normalizeDbTimeToHHMM(b.start_time) || '')} – ${formatTime12h(normalizeDbTimeToHHMM(b.end_time) || '')}`}
                           </Text>
                         </View>
                         {!(b.ground.pitch_type.toLowerCase().includes('net') || b.ground.pitch_type.toLowerCase().includes('lane')) && (
                           <View style={styles.slotDetailRow}>
                             <Users size={14} color="#64748B" />
                             <Text style={styles.slotBookingDetail}>
                               {(cricketTeamsLabelFromBooking(b.ground.pitch_type, b.notes) || '1 Team').toUpperCase()}
                             </Text>
                           </View>
                         )}
                         <View style={styles.slotDetailRow}>
                           <Banknote size={14} color="#059669" />
                           <Text style={[styles.slotBookingDetail, { color: '#059669', fontWeight: '700' }]}>₹{b.total_amount}</Text>
                         </View>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(b.status)}15`, height: 24, paddingHorizontal: 8, borderRadius: 12 }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(b.status), fontSize: 10, fontWeight: '800' }]}>
                        {b.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const DateRangeModal = () => {
    const quickRanges = [
      { label: 'All Time', start: null, end: null },
      { label: 'Today', start: new Date(), end: new Date() },
      { label: 'Yesterday', start: new Date(Date.now() - 86400000), end: new Date(Date.now() - 86400000) },
      { label: 'This Week', start: new Date(Date.now() - new Date().getDay() * 86400000), end: new Date() },
      { label: 'Last Week', start: new Date(Date.now() - (new Date().getDay() + 7) * 86400000), end: new Date(Date.now() - (new Date().getDay() + 1) * 86400000) },
      { label: 'This Month', start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: new Date() },
      { label: 'Last Month', start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), end: new Date(new Date().getFullYear(), new Date().getMonth(), 0) },
    ];

    return (
      <Modal visible={showDateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.dateModalContent}>
            <View style={styles.dateModalHeader}>
              <Text style={styles.dateModalTitle}>Filter by Date</Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateModalBody}>
              <View style={styles.quickRangeList}>
                <Text style={styles.sectionLabel}>Quick Range</Text>
                {quickRanges.map((range) => (
                  <TouchableOpacity 
                    key={range.label} 
                    style={styles.quickRangeItem}
                    onPress={() => {
                      setDateRange({ start: range.start, end: range.end });
                      setShowDateModal(false);
                    }}
                  >
                    <Calendar size={14} color="#9CA3AF" />
                    <Text style={styles.quickRangeLabel}>{range.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.dateModalFooter}>
               <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDateModal(false)}>
                 <Text style={styles.modalCancelBtnText}>Cancel</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                 style={styles.modalApplyBtn} 
                 onPress={() => setShowDateModal(false)}
               >
                 <Text style={styles.modalApplyBtnText}>Apply Filter</Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const loadBookings = async (targetPage: number, isLoadMore: boolean) => {
    if (!user) return;

    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const from = targetPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('bookings')
        .select(`
          *,
          ground:grounds${typeFilter !== 'all' ? '!inner' : ''}(
            *,
            ground_images(*)
          ),
          user:profiles(full_name, phone)
        `)
        .order('booking_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        // Since we alias as 'ground', we filter on the joined table's column
        query = query.eq('ground.pitch_type', typeFilter);
      }
      
      const todayIso = new Date().toISOString().split('T')[0];
      if (activeTab === 'upcoming') {
        query = query.gte('booking_date', todayIso);
      } else if (activeTab === 'past') {
        query = query.lt('booking_date', todayIso);
      } else if (activeTab === 'cancelled') {
        query = query.eq('status', 'cancelled');
      }

      if (searchQuery.trim()) {
        const q = `%${searchQuery.trim().toLowerCase()}%`;
        // Supabase allows filtering on joined tables using the dot notation
        query = query.or(`id.ilike.${q},notes.ilike.${q},ground.name.ilike.${q},ground.city.ilike.${q},user.full_name.ilike.${q}`);
      }

      if (dateRange.start) {
        const startStr = dateRange.start.toISOString().split('T')[0];
        query = query.gte('booking_date', startStr);
      }
      if (dateRange.end) {
        const endStr = dateRange.end.toISOString().split('T')[0];
        query = query.lte('booking_date', endStr);
      }

      const { data, error } = await query.range(from, to);

      if (error) throw error;
      
      let newBatch = (data || []) as BookingWithDetails[];

      // Fetch partner bookings for occupancy accuracy
      if (newBatch.length > 0) {
        try {
          const slotFilters = newBatch.map(b => 
            `and(ground_id.eq.${b.ground_id},booking_date.eq.${b.booking_date},start_time.eq.${b.start_time})`
          );
          
          const chunkSize = 20;
          const partners: any[] = [];
          for (let i = 0; i < slotFilters.length; i += chunkSize) {
            const chunk = slotFilters.slice(i, i + chunkSize);
            const { data: partnerData } = await supabase
              .from('bookings')
              .select(`
                *,
                ground:grounds(id, pitch_type, owner_id, name, ground_images(*)),
                user:profiles(full_name, phone)
              `)
              .or(chunk.join(','))
              .neq('status', 'pending')
              .neq('status', 'cancelled')
              .neq('status', 'rejected');
            
            if (partnerData) partners.push(...partnerData);
          }
          
          if (partners.length > 0) {
            newBatch = [...newBatch, ...partners].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
          }
        } catch (partnerErr) {
          console.error('Error fetching partner bookings:', partnerErr);
        }
      }
      
      if (isLoadMore) {
        setBookings(prev => {
          const combined = [...prev, ...newBatch];
          return combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
            .sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime());
        });
      } else {
        setBookings(newBatch.sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()));
      }

      setHasMore(data?.length === PAGE_SIZE);
      setPage(targetPage);
    } catch (error) {
      console.error('Error loading admin bookings:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleCancelBooking = async (booking: BookingWithDetails) => {
    const confirmMsg = 'Are you sure you want to cancel this booking and REFUND the amount to the user\'s wallet?';
    
    const proceed = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('payment-gateway', {
          body: {
            action: 'refund-to-wallet',
            bookingId: booking.id
          }
        });

        if (error) throw error;
        if (data && data.success) {
          setBookings(prev => 
            prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b)
          );
          loadCounts();
          if (Platform.OS === 'web') alert('Booking cancelled and refunded to wallet.');
          else Alert.alert('Success', 'Booking cancelled and refunded to wallet.');
        } else {
          throw new Error(data?.error || 'Failed to process refund');
        }
      } catch (err: any) {
        if (Platform.OS === 'web') alert(err.message || 'Failed to cancel');
        else Alert.alert('Error', err.message || 'Failed to cancel');
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        await proceed();
      }
      return;
    }

    Alert.alert(
      'Cancel & Refund',
      confirmMsg,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel & Refund', style: 'destructive', onPress: proceed }
      ]
    );
  };

  const togglePaymentReceived = async (booking: BookingWithDetails) => {
    const newValue = !booking.payment_received;
    const bookingIds = (booking as any).allBookingIds || [booking.id];
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_received: newValue })
        .in('id', bookingIds);
      if (error) throw error;
      setBookings(prev => prev.map(b => bookingIds.includes(b.id) ? { ...b, payment_received: newValue } : b));
    } catch (err: any) {
      if (Platform.OS === 'web') alert(err.message || 'Failed to update payment status');
      else Alert.alert('Error', err.message || 'Failed to update payment status');
    }
  };

  const handleTogglePayout = async (bookingId: string, currentEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ payout_enabled: !currentEnabled })
        .eq('id', bookingId);

      if (error) throw error;
      
      setBookings(prev => 
        prev.map(b => b.id === bookingId ? { ...b, payout_enabled: !currentEnabled } : b)
      );
    } catch (err: any) {
      if (Platform.OS === 'web') alert(err.message || 'Failed to update payout');
      else Alert.alert('Error', err.message || 'Failed to update payout');
    }
  };
  const filteredBookings = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];

    // Grouping logic to consolidate multi-slot bookings (including multi-date transactions)
    const consolidatedMap = new Map<string, BookingWithDetails & { allDates?: string[], allSlots?: string[], allBookingIds?: string[] }>();
    
    bookings.forEach(b => {
      // Extract (Slots: ...) from notes to use as part of the grouping key
      const matchSlots = /\(Slots:\s*([^)]+)\)/.exec(b.notes || '');
      const slotsKey = matchSlots ? matchSlots[1] : `single_${b.start_time}`;
      
      // Use created_at (truncated to minute) to group bookings from the same transaction
      const createdAtMinute = b.created_at ? b.created_at.substring(0, 16) : 'unknown';
      const groupKey = `${b.user_id}_${b.ground_id}_${createdAtMinute}_${slotsKey}`;

      const bFee = calculateBRowFee(b);

      if (!consolidatedMap.has(groupKey)) {
        consolidatedMap.set(groupKey, { 
          ...b, 
          allDates: [b.booking_date],
          allSlots: matchSlots ? [matchSlots[1]] : [`${normalizeDbTimeToHHMM(b.start_time)} – ${normalizeDbTimeToHHMM(b.end_time)}`],
          allBookingIds: [b.id],
          calculated_total_fee: bFee
        });
      } else {
        const existing = consolidatedMap.get(groupKey)!;
        existing.total_amount = Number(((existing.total_amount || 0) + (b.total_amount || 0)).toFixed(2));
        existing.discount_amount = Number(((existing.discount_amount || 0) + (b.discount_amount || 0)).toFixed(2));
        (existing as any).calculated_total_fee = ((existing as any).calculated_total_fee || 0) + bFee;

        if (!existing.allDates?.includes(b.booking_date)) {
          existing.allDates?.push(b.booking_date);
        }
        const slotLabel = matchSlots ? matchSlots[1] : `${normalizeDbTimeToHHMM(b.start_time)} – ${normalizeDbTimeToHHMM(b.end_time)}`;
        if (!existing.allSlots?.includes(slotLabel)) {
          existing.allSlots?.push(slotLabel);
        }
        if (!existing.allBookingIds?.includes(b.id)) {
          existing.allBookingIds?.push(b.id);
        }
      }
    });

    let result = Array.from(consolidatedMap.values()).map(b => {
      let displayDate = formatDateDDMMYY(b.booking_date);
      if (b.allDates && b.allDates.length > 1) {
        const sortedDates = [...b.allDates].sort();
        displayDate = `${formatDateDDMMYY(sortedDates[0])} – ${formatDateDDMMYY(sortedDates[sortedDates.length - 1])}`;
      }
      return { ...b, displayDate };
    });

    // Detect matches (showing opponents)
    const slotGroups = bookings.reduce((acc, b) => {
      const key = `${b.ground_id}_${b.booking_date}_${b.start_time}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(b);
      return acc;
    }, {} as Record<string, BookingWithDetails[]>);

    // If it's a user view (though this is admin screen, keep logic robust)
    if (profile?.role === 'user') {
      result = result.map(b => {
        const key = `${b.ground_id}_${b.booking_date}_${b.start_time}`;
        const group = slotGroups[key] || [];
        const opponent = group.find(ob => ob.user_id !== b.user_id);
        if (opponent) {
          return {
            ...b,
            opponent: (opponent as any).profile
          };
        }
        return b;
      });
    }

    return result;
  }, [bookings, profile?.role]);

  const todayIsoForCounts = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);



  const content = (
    <View style={styles.container}>
      <DateRangeModal />
      {isWeb && (
        <View style={[styles.header, styles.webHeader]}>
          <View style={{ 
            flexDirection: (isMobile || isSmallWeb) ? 'column' : 'row', 
            alignItems: (isMobile || isSmallWeb) ? 'stretch' : 'center', 
            justifyContent: 'space-between', 
            gap: 16 
          }}>
            {/* Left Side: Tabs + Filters (on large web) */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              gap: 16,
              flex: (isMobile || isSmallWeb) ? 0 : 1,
            }}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.tabRow}
                style={[styles.tabScrollWrap, (isMobile || isSmallWeb) && { marginBottom: 8 }]}
              >
                <TouchableOpacity
                  onPress={() => setActiveTab('all')}
                  style={[
                    styles.tabChip,
                    activeTab === 'all' && styles.tabChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabChipText,
                      activeTab === 'all' && styles.tabChipTextActive,
                    ]}
                  >
                    {`All (${totalDbCount})`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab('upcoming')}
                  style={[
                    styles.tabChip,
                    activeTab === 'upcoming' && styles.tabChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabChipText,
                      activeTab === 'upcoming' && styles.tabChipTextActive,
                    ]}
                  >
                    {`Upcoming (${upcomingDbCount})`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab('past')}
                  style={[
                    styles.tabChip,
                    activeTab === 'past' && styles.tabChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabChipText,
                      activeTab === 'past' && styles.tabChipTextActive,
                    ]}
                  >
                    {`Past (${pastDbCount})`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab('cancelled' as any)}
                  style={[
                    styles.tabChip,
                    activeTab === ('cancelled' as any) && styles.tabChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabChipText,
                      activeTab === ('cancelled' as any) && styles.tabChipTextActive,
                    ]}
                  >
                    {`Cancelled (${cancelledDbCount})`}
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Filters on the left (only for large web) */}
              {!isMobile && !isSmallWeb && (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <FilterDropdown 
                    id="type" 
                    label="Type" 
                    value={typeFilter}
                    options={[
                      { key: 'all', label: 'All Types' },
                      ...types.map(t => ({ key: t.name, label: t.label || t.name }))
                    ]}
                    onSelect={setTypeFilter}
                  />

                  <TouchableOpacity 
                    style={[styles.dateFilterBtn, (dateRange.start || dateRange.end) && styles.dateFilterBtnActive]}
                    onPress={() => setShowDateModal(true)}
                  >
                    <Calendar size={14} color={(dateRange.start || dateRange.end) ? "#10b981" : "#6B7280"} />
                    <Text style={[styles.dateFilterText, (dateRange.start || dateRange.end) && styles.dateFilterTextActive]}>
                      {dateRange.start ? (
                         `${dateRange.start.toLocaleDateString()} - ${dateRange.end ? dateRange.end.toLocaleDateString() : 'Now'}`
                      ) : 'Date'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Right Side: Search Bar (and Filters on mobile/small web) */}
            <View style={{ 
              flexDirection: isMobile ? 'column' : 'row', 
              alignItems: 'center', 
              gap: 16,
              width: (isMobile || isSmallWeb) ? '100%' : 'auto'
            }}>
              {/* Filters on the right (for mobile and small web) */}
              {(isMobile || isSmallWeb) && (
                <View style={{ flexDirection: 'row', gap: 8, width: '100%', marginBottom: isMobile ? 8 : 0 }}>
                  <FilterDropdown 
                    id="type" 
                    label="Type" 
                    value={typeFilter}
                    options={[
                      { key: 'all', label: 'All Types' },
                      ...types.map(t => ({ key: t.name, label: t.label || t.name }))
                    ]}
                    onSelect={setTypeFilter}
                  />

                  <TouchableOpacity 
                    style={[styles.dateFilterBtn, (dateRange.start || dateRange.end) && styles.dateFilterBtnActive, { flex: isMobile ? 1 : 0 }]}
                    onPress={() => setShowDateModal(true)}
                  >
                    <Calendar size={14} color={(dateRange.start || dateRange.end) ? "#10b981" : "#6B7280"} />
                    <Text style={[styles.dateFilterText, (dateRange.start || dateRange.end) && styles.dateFilterTextActive]}>
                      {dateRange.start ? (
                         `${dateRange.start.toLocaleDateString()} - ${dateRange.end ? dateRange.end.toLocaleDateString() : 'Now'}`
                      ) : 'Date'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.searchContainer, { width: isMobile ? '100%' : 280 }]}>
                <Search size={16} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search bookings..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                    <X size={14} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      )}

      {isWeb && !isSmallWeb && bookings.length > 0 && (
        <View style={styles.tableHeaderContainer}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.colBookedAt]}>Booked at</Text>
            <Text style={[styles.tableHeaderCell, styles.colGround]}>Ground</Text>
            <Text style={[styles.tableHeaderCell, styles.colDateTime]}>Slot Date & time</Text>
            <Text style={[styles.tableHeaderCell, styles.colTeams]}>Teams</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
            <Text style={[styles.tableHeaderCell, styles.colFee]}>Fee</Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount]}>Amount</Text>
            <Text style={[styles.tableHeaderCell, styles.colPayment]}>Payment</Text>
            <Text style={[styles.tableHeaderCell, styles.colPaid]}>Paid</Text>
            <Text style={[styles.tableHeaderCell, styles.colPayout]}>Payout</Text>
            <Text style={[styles.tableHeaderCell, styles.colWho]}>Customer</Text>
          </View>
        </View>
      )}

      <FlatList
        data={filteredBookings}
        renderItem={({ item }) => {
          if (isWeb && !isSmallWeb) {
            const teamsCell = cricketTeamsLabelFromBooking(item.ground.pitch_type, item.notes) ?? '—';
            return (
              <TouchableOpacity
                onPress={() => router.push(`/bookings/${item.id}`)}
                activeOpacity={0.8}
                style={styles.tableRow}
              >
                <View style={[styles.tableCell, styles.colBookedAt]}>
                  <Text style={styles.bookedDateText}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                  <Text style={styles.bookedTimeText}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.bookingIdTable}>
                    Booking ID: {item.id.substring(0, 8).toUpperCase()}
                  </Text>
                </View>

                <View style={[styles.tableCell, styles.colGround]}>

                  <Text style={styles.groundName}>{item.ground?.name || 'N/A'}</Text>
                  <Text style={styles.groundLocation}>
                    {item.ground?.city}, {item.ground?.state}
                  </Text>
                </View>

                <TouchableOpacity 
                  style={[styles.tableCell, styles.colDateTime]}
                  onPress={(e) => {
                    e.stopPropagation();
                    openSlotModal(item);
                  }}
                >
                  <Text style={[styles.dateText, { color: '#01b854', textDecorationLine: 'underline' }]}>
                    {(item as any).displayDate || formatDateDDMMYY(item.booking_date)}
                  </Text>
                  {(() => {
                    const slotsToDisplay = (item as any).allSlots && (item as any).allSlots.length > 0 
                      ? (item as any).allSlots 
                      : null;
                    
                    if (slotsToDisplay) {
                      return <Text style={styles.timeText} numberOfLines={2}>{slotsToDisplay.join(', ')}</Text>;
                    }
                    
                    return (
                      <Text style={styles.timeText}>
                        {`${formatTime12h(normalizeDbTimeToHHMM(item.start_time) || '')} – ${formatTime12h(normalizeDbTimeToHHMM(item.end_time) || '')}`}
                      </Text>
                    );
                  })()}
                </TouchableOpacity>

                {(() => {
                  const normStart = normalizeDbTimeToHHMM(item.start_time);
                  const currentSlotKey = `${item.ground_id}_${item.booking_date}_${normStart}`;
                  const slotOccupancy = bookings.filter(b => 
                    (b.status === 'confirmed' || b.status === 'active' || b.status === 'completed') && 
                    `${b.ground_id}_${b.booking_date}_${normalizeDbTimeToHHMM(b.start_time)}` === currentSlotKey
                  ).reduce((sum, b) => {
                    if (b.team_type === 'one') return sum + 1;
                    if (b.team_type === 'both') return sum + 2;
                    
                    const label = cricketTeamsLabelFromBooking(b.ground?.pitch_type, b.notes);
                    if (label === '1 team') return sum + 1;
                    if (label === 'Both teams' || label === 'Full Match') return sum + 2;
                    return sum + 2;
                  }, 0);

                  const isTrulyFull = slotOccupancy >= 2;

                  return (
                    <View style={[styles.tableCell, styles.colTeams]}>
                      {!(item.ground?.pitch_type?.toLowerCase().includes('net') || item.ground?.pitch_type?.toLowerCase().includes('lane')) ? (
                        !isTrulyFull ? (
                          <TouchableOpacity 
                            onPress={(e) => {
                              e.stopPropagation();
                              router.push(`/grounds/${item.ground.id}?date=${item.booking_date}&time=${normalizeDbTimeToHHMM(item.start_time)}&teams=one`);
                            }}
                            style={styles.partialBadge}
                          >
                            <Text style={styles.partialBadgeText}>ADD TEAM 2</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.fullMatchBadge}>
                            <Text style={styles.fullMatchBadgeText}>FULL</Text>
                          </View>
                        )
                      ) : (
                        <Text style={[styles.teamsText, { color: '#6B7280', opacity: 0.5 }]}>—</Text>
                      )}
                    </View>
                  );
                })()}

                <View style={[styles.tableCell, styles.colStatus]}>
                   <TouchableOpacity 
                     onPress={() => item.status === 'confirmed' && handleCancelBooking(item)}
                     disabled={item.status !== 'confirmed'}
                   >
                     <Text style={[
                       styles.statusBadgeText,
                       item.status === 'confirmed' ? styles.statusConfirmed : styles.statusCancelled
                     ]}>
                       {item.status === 'confirmed' ? (isDateInPast(item.booking_date) ? 'DONE' : 'ACTIVE') : item.status.toUpperCase()}
                     </Text>

                   </TouchableOpacity>
                </View>

                 <View style={[styles.tableCell, styles.colFee]}>
                   <Text style={[styles.feeText, { color: '#EF4444', fontWeight: '700' }]}>
                     ₹{((item as any).calculated_total_fee || 0).toFixed(2)}
                   </Text>
                 </View>

                <View style={[styles.tableCell, styles.colAmount]}>
                  <Text style={styles.amount}>₹{item.total_amount}</Text>
                </View>


                 <View style={[styles.tableCell, styles.colPayment]}>
                    <Text style={[styles.paymentBadgeText, item.payment_method === 'cash' ? styles.paymentCash : (item.payment_method === 'wallet' ? styles.paymentWallet : styles.paymentOnline)]}>
                       {item.payment_method === 'cash' ? 'CASH' : (item.payment_method === 'wallet' ? 'WALLET' : 'ONLINE')}
                    </Text>
                 </View>

                 <View style={[styles.tableCell, styles.colPaid]}>
                   <TouchableOpacity
                     onPress={(e) => {
                       e.stopPropagation();
                       togglePaymentReceived(item);
                     }}
                     style={styles.paymentToggle}
                   >
                     <View style={{ alignItems: 'center', width: '100%' }}>
                       {(item.payment_received || (item.payment_method !== 'cash' && item.status === 'confirmed')) ? (
                         <CheckCircle2 size={18} color="#00ea6b" />
                       ) : (
                         <Circle size={18} color="#9CA3AF" />
                       )}
                     </View>
                   </TouchableOpacity>
                 </View>


                 <View style={[styles.tableCell, styles.colPayout]}>
                   {item.payment_method !== 'cash' ? (
                     <TouchableOpacity 
                       onPress={(e) => {
                         e.stopPropagation();
                         handleTogglePayout(item.id, !!item.payout_enabled);
                       }}
                       style={[
                         styles.payoutToggle,
                         item.payout_enabled ? styles.payoutOn : styles.payoutOff
                       ]}
                     >
                       <Text style={styles.payoutToggleText}>
                         {item.payout_enabled ? 'ON' : 'OFF'}
                       </Text>
                     </TouchableOpacity>
                   ) : (
                     <Text style={styles.payoutLabelNA}>N/A</Text>
                   )}
                   {item.payout_status === 'completed' && (
                     <Text style={styles.payoutDoneLabel}>DONE</Text>
                   )}
                 </View>

                 <View style={[styles.tableCell, styles.colWho]}>
                   <Text style={styles.whoPrimaryText}>
                     {item.user?.full_name ?? 'Guest'}
                   </Text>
                   <Text style={styles.metaInline}>{item.user?.phone ?? 'No phone'}</Text>
                 </View>
              </TouchableOpacity>
            );
          }

          const normStart = normalizeDbTimeToHHMM(item.start_time);
          const currentSlotKey = `${item.ground_id}_${item.booking_date}_${normStart}`;
          const slotOccupancy = bookings.filter(b => 
            (b.status === 'confirmed' || b.status === 'active' || b.status === 'completed') && 
            `${b.ground_id}_${b.booking_date}_${normalizeDbTimeToHHMM(b.start_time)}` === currentSlotKey
          ).reduce((sum, b) => {
            if (b.team_type === 'one') return sum + 1;
            if (b.team_type === 'both') return sum + 2;
            
            const label = cricketTeamsLabelFromBooking(b.ground?.pitch_type, b.notes);
            if (label === '1 team') return sum + 1;
            if (label === 'Both teams' || label === 'Full Match') return sum + 2;
            return sum + 2;
          }, 0);

          const isTrulyFull = slotOccupancy >= 2;
          const occupancyText = isTrulyFull ? 'FULL (MATCH READY)' : 'PARTIAL (ADD TEAM 2)';

          return (
            <BookingCard
              booking={item}
              onPress={() => router.push(`/bookings/${item.id}`)}
              showGroundDetails={true}
              metaText={occupancyText}
            />
          );
        }}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.list,
          { 
            paddingHorizontal: (isWeb && !isSmallWeb) ? 0 : 16,
            paddingTop: (isWeb && !isSmallWeb) ? 0 : 12,
          }
        ]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => loadBookings(0, false)} />
        }
        ListFooterComponent={() => (
          hasMore ? (
            <TouchableOpacity 
              style={styles.loadMoreBtn} 
              onPress={() => loadBookings(page + 1, true)}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <Text style={styles.loadMoreText}>LOADING...</Text>
              ) : (
                <Text style={styles.loadMoreText}>LOAD MORE BOOKINGS</Text>
              )}
            </TouchableOpacity>
          ) : bookings.length > 0 ? (
            <Text style={styles.noMoreText}>That's all for now! No more bookings to load.</Text>
          ) : null
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No bookings found</Text>
          </View>
        }
      />
    </View>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return (
    <View style={styles.nativeContainer}>
      <MobileAppNavbar title="PLATFORM BOOKINGS" titleColor="#10b981" />
      {content}
    </View>
  );
}

const IS_WEB = Platform.OS === 'web';

const styles = StyleSheet.create({
  nativeContainer: {
    flex: 1,
    backgroundColor: '#043529',
  },
  container: {
    flex: 1,
    backgroundColor: IS_WEB ? '#FFFFFF' : '#043529',
  },
  header: {
    backgroundColor: IS_WEB ? '#FFFFFF' : '#043529',
    padding: 16,
    paddingTop: IS_WEB ? 16 : 0,
    borderBottomWidth: 1,
    borderBottomColor: IS_WEB ? '#E0E0E0' : 'rgba(0,234,107,0.15)',
    zIndex: 1000,
  },
  webHeader: {
    paddingTop: 16,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '600',
    color: IS_WEB ? '#111827' : '#f9fafb',
    letterSpacing: -0.3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 36,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#111827',
    paddingVertical: 0,
    height: '100%',
    ...Platform.select({
      web: { outlineStyle: 'none' }
    }) as any,
  },
  searchClearBtn: {
    padding: 4,
  },
  list: {
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: IS_WEB ? '#666' : '#9ca3af',
  },
  tableHeaderContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderRow: {
    flexDirection: 'row',
  },
  tableHeaderCell: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: {
    paddingRight: 16,
  },
  colBookedAt: {
    width: 110,
  },
  colGround: {
    flex: 1.5,
  },
  colDateTime: {
    flex: 1.8,
  },
  colTeams: {
    width: 100,
  },
  colStatus: {
    width: 80,
  },
  colFee: {
    width: 70,
    alignItems: 'center',
  },
  colAmount: {
    width: 80,
  },
  colPayment: {
    width: 80,
  },
  colPaid: {
    width: 60,
    alignItems: 'center',
  },
  colPayout: {
    width: 80,
    alignItems: 'center',
  },
  colWho: {
    flex: 1.8,
  },


  bookedDateText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  bookedTimeText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  bookingIdTable: {
    fontSize: 10,
    fontWeight: '700',
    color: '#01b854',
    marginTop: 4,
    fontFamily: 'Inter',
  },
  slotModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  slotModalContent: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  slotModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  slotModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  slotBookingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  slotBookingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginBottom: 2,
  },
  slotBookingId: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  whoAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  whoAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  slotDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  slotDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotBookingDetail: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  groundName: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  groundLocation: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  amount: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  dateText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  teamsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'left',
  },
  statusTextInline: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  metaInline: {
    fontSize: 12,
    color: '#6B7280',
  },
  feeText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
  },
  whoPrimaryText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  tabScrollWrap: {
    marginTop: 12,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  tabChip: {
    paddingHorizontal: IS_WEB ? 8 : 16,
    paddingVertical: IS_WEB ? 4 : 10,
    borderRadius: IS_WEB ? 8 : 10,
    borderWidth: 1.5,
    borderColor: IS_WEB ? '#E5E7EB' : 'rgba(0,234,107,0.25)',
    backgroundColor: IS_WEB ? '#F9FAFB' : 'rgba(4,53,41,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    position: 'relative',
  },
  tabChipActive: {
    backgroundColor: IS_WEB ? 'transparent' : '#00ea6b',
    borderColor: IS_WEB ? '#01b854' : '#00ea6b',
  },
  tabChipText: {
    fontFamily: 'Inter',
    fontSize: IS_WEB ? 10 : 13,
    fontWeight: '500',
    color: IS_WEB ? '#6B7280' : '#f9fafb',
    letterSpacing: -0.2,
  },
  tabChipTextActive: {
    color: IS_WEB ? '#01b854' : '#043529',
    fontWeight: '600',
  },
  dateFilterWrap: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateClearBtn: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textAlign: 'center',
    overflow: 'hidden',
  },
  paymentCash: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  paymentOnline: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
  },
  paymentWallet: {
    backgroundColor: '#F3E8FF',
    color: '#7E22CE',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textAlign: 'center',
    overflow: 'hidden',
  },
  statusConfirmed: {
    backgroundColor: '#DEF7EC',
    color: '#03543F',
  },
  statusCancelled: {
    backgroundColor: '#FDE8E8',
    color: '#9B1C1C',
  },
  payoutToggle: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 50,
    alignItems: 'center',
  },
  payoutOn: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  payoutOff: {
    backgroundColor: '#6B7280',
    borderColor: '#6B7280',
  },
  payoutToggleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  payoutLabelNA: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  payoutDoneLabel: {
    fontSize: 9,
    color: '#10B981',
    fontWeight: '700',
    marginTop: 4,
  },
  partialBadge: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fdba74',
  },
  partialBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9a3412',
  },
  fullMatchBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  fullMatchBadgeText: {
    fontSize: 10,
    color: '#166534',
    fontWeight: '700',
  },
  loadMoreBtn: {
    backgroundColor: IS_WEB ? '#FFFFFF' : 'rgba(0,234,107,0.1)',
    borderWidth: 1,
    borderColor: IS_WEB ? '#E5E7EB' : '#00ea6b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  loadMoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: IS_WEB ? '#111827' : '#00ea6b',
    letterSpacing: 1,
  },
  noMoreText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 40,
    letterSpacing: 1,
  },
  dateFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
    alignSelf: 'center',
  },
  dateFilterBtnActive: {
    borderColor: '#10b981',
    backgroundColor: '#F0FDF4',
  },
  dateFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  dateFilterTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dateModalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  dateModalBody: {
    padding: 20,
  },
  quickRangeList: {
    gap: 8,
  },
  quickRangeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 10,
  },
  quickRangeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  dateModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalApplyBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalApplyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 100,
    alignSelf: 'center',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  dropdownTriggerActive: {
    borderColor: '#10b981',
    backgroundColor: '#F0FDF4',
  },
  dropdownLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  dropdownValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 2000,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  dropdownItemActive: {
    backgroundColor: '#F0FDF4',
  },
  dropdownItemText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Inter',
  },
  dropdownItemTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  paymentToggle: {
    paddingVertical: 4,
    width: '100%',
    alignItems: 'center',
  },
});

