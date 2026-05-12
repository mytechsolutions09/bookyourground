import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
  useWindowDimensions,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BookingWithDetails } from '@/types';
import BookingCard from '@/components/bookings/BookingCard';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '../../components/MobileAppNavbar';
import Button from '@/components/ui/Button';
import { Alert, TouchableOpacity } from 'react-native';
import { formatDateDDMMYY, formatCurrency, isDateInPast } from '@/utils/helpers';
import { normalizeDbTimeToHHMM } from '@/utils/bookingSlots';
import Modal from '@/components/ui/Modal';
import { slugifyGroundSegment } from '@/utils/groundSlug';
import { cricketTeamsLabelFromBooking } from '@/utils/cricketGround';
import { Calendar, X, Swords, Save, CheckCircle2, Circle, Clock, TrendingUp, Filter } from 'lucide-react-native';
import { Svg, Circle as SvgCircle } from 'react-native-svg';
import { useUI } from '@/contexts/UIContext';

function NameInputCell({ booking, onSave }: { booking: BookingWithDetails, onSave: (id: string, name: string) => Promise<void> }) {
  const [localName, setLocalName] = useState(booking.booked_for_name || '');
  const [saving, setSaving] = useState(false);
  const hasChanged = localName !== (booking.booked_for_name || '');

  const handleSave = async () => {
    if (!hasChanged || saving) return;
    setSaving(true);
    await onSave(booking.id, localName);
    setSaving(false);
  };

  return (
    <TouchableOpacity 
      activeOpacity={1} 
      onPress={(e) => e.stopPropagation()} 
      style={styles.nameInputRow}
    >
      <TextInput
        style={styles.nameInput}
        value={localName}
        onChangeText={setLocalName}
        placeholder="Enter name..."
        placeholderTextColor="#9CA3AF"
        onSubmitEditing={handleSave}
      />
      {hasChanged && (
        <TouchableOpacity 
          style={styles.saveBtn} 
          onPress={(e) => {
            e.stopPropagation();
            handleSave();
          }}
          disabled={saving}
        >
          <Save size={16} color={saving ? '#9CA3AF' : '#00ea6b'} />

        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function BookingsScreen() {
  const { user, profile } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [ownerScope, setOwnerScope] = useState<'all' | 'own' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'date' | 'ground' | 'amount' | 'status' | 'booked_at' | 'paid' | 'teams' | 'name'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [tempFromDate, setTempFromDate] = useState<string | null>(null);
  const [tempToDate, setTempToDate] = useState<string | null>(null);
  const PAGE_SIZE = 10;
  const [totalCount, setTotalCount] = useState(0);
  const [userStats, setUserStats] = useState({
    totalHours: 0,
    uniqueGrounds: 0,
    cancelledCount: 0,
    percent: 0,
    level: 'Rookie'
  });
  
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const IS_DARK = !isWeb || (width < 900);
  const isWideWeb = Platform.OS === 'web' && width >= 1100;
  const isExtraWideWeb = Platform.OS === 'web' && width >= 1350;
  const isMediumWeb = Platform.OS === 'web' && width >= 768 && width < 1100;
  const isUltraNarrow = width < 350;
  const isTablet = width >= 600 && width < 900;
  const isStacking = width < 768; // Stack panels below this width

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<BookingWithDetails | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  const { setTabBarVisible } = useUI();
  const lastScrollY = React.useRef(0);

  const onScroll = (event: any) => {
    if (Platform.OS === 'web') return;
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;

    if (diff > 10 && currentY > 50) {
      setTabBarVisible(false);
    } else if (diff < -10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentY;
  };

  useEffect(() => {
    if (user) {
      loadBookings(0);
      loadUserStats();
    }
  }, [user, profile, activeTab, ownerScope, fromDate, toDate, searchQuery]);

  const loadBookings = async (targetPage = 0, isLoadMore = false) => {
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
          ground:grounds(
            *,
            ground_images(*)
          ),
          profile:profiles!user_id(
            full_name,
            team_name,
            phone
          )
        `, { count: 'exact' });

      // Filters
      if (activeTab === 'upcoming') {
        const today = new Date().toISOString().split('T')[0];
        query = query.gte('booking_date', today).eq('status', 'confirmed');
      } else if (activeTab === 'past') {
        const today = new Date().toISOString().split('T')[0];
        query = query.lt('booking_date', today).eq('status', 'confirmed');
      } else if (activeTab === 'cancelled') {
        query = query.eq('status', 'cancelled');
      } else {
        query = query.in('status', ['confirmed', 'cancelled']);
      }

      if (profile?.role === 'ground_owner' && ownerScope !== 'all') {
        if (ownerScope === 'own') {
           query = query.eq('ground.owner_id', user.id);
        } else {
           query = query.neq('ground.owner_id', user.id);
        }
      } else if (profile?.role === 'user') {
        query = query.eq('user_id', user.id);
      }

      if (fromDate) {
        query = query.gte('booking_date', fromDate);
      }
      if (toDate) {
        query = query.lte('booking_date', toDate);
      }

      if (searchQuery.trim()) {
        query = query.ilike('ground.name', `%${searchQuery}%`);
      }

      const { data, error, count } = await query
        .order('booking_date', { ascending: sortAsc })
        .order('start_time', { ascending: sortAsc })
        .range(from, to);

      if (error) throw error;
      
      const newBookings = data || [];
      if (isLoadMore) {
        setBookings(prev => [...prev, ...newBookings]);
      } else {
        setBookings(newBookings);
      }
      
      setTotalCount(count || 0);
      setHasMore(newBookings.length === PAGE_SIZE);
      setPage(targetPage);

      // Fetch reviewed booking IDs
      const { data: reviewsData, error: reviewsErr } = await supabase
        .from('reviews')
        .select('booking_id')
        .eq('user_id', user.id);
      
      if (!reviewsErr && reviewsData) {
        setReviewedBookingIds(reviewsData.map(r => r.booking_id));
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadUserStats = async () => {
    if (!user) return;
    try {
      // Fetch all confirmed and cancelled bookings for the user to calculate stats
      const { data, error } = await supabase
        .from('bookings')
        .select('id, start_time, end_time, ground_id, status')
        .eq('user_id', user.id);

      if (error) throw error;
      if (!data) return;

      const confirmed = data.filter(b => b.status === 'confirmed');
      const cancelled = data.filter(b => b.status === 'cancelled');
      
      // Calculate total hours
      let totalMinutes = 0;
      confirmed.forEach(b => {
        if (b.start_time && b.end_time) {
          const startArr = b.start_time.split(':').map(Number);
          const endArr = b.end_time.split(':').map(Number);
          const startMins = startArr[0] * 60 + startArr[1];
          let endMins = endArr[0] * 60 + endArr[1];
          if (endMins < startMins) endMins += 24 * 60; // handle overnight
          totalMinutes += (endMins - startMins);
        }
      });

      const totalHours = Math.floor(totalMinutes / 60);
      const uniqueGrounds = new Set(confirmed.map(b => b.ground_id)).size;
      const cancelledCount = cancelled.length;

      // Determine level and progress percentage
      let level = 'Rookie';
      let percent = 0;
      if (totalHours >= 100) {
        level = 'Legend';
        percent = 100;
      } else if (totalHours >= 50) {
        level = 'Pro';
        percent = ((totalHours - 50) / 50) * 100;
      } else if (totalHours >= 10) {
        level = 'Regular';
        percent = ((totalHours - 10) / 40) * 100;
      } else {
        level = 'Rookie';
        percent = (totalHours / 10) * 100;
      }

      setUserStats({
        totalHours,
        uniqueGrounds,
        cancelledCount,
        percent: Math.round(percent),
        level
      });
    } catch (err) {
      console.error('Error loading user stats:', err);
    }
  };

  const [cancellationDays, setCancellationDays] = useState(7);

  useEffect(() => {
    const fetchPolicy = async () => {
      const { data } = await supabase.from('platform_settings').select('value').eq('key', 'cancellation_days').single();
      if (data) setCancellationDays(Number(data.value));
    };
    fetchPolicy();
  }, []);

  const handleCancelBooking = async (booking: BookingWithDetails) => {
    // Dynamic restriction
    const bDate = new Date(booking.booking_date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const bDay = new Date(bDate.getFullYear(), bDate.getMonth(), bDate.getDate());
    const diffDays = Math.ceil((bDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < cancellationDays) {
      const msg = `Bookings can only be cancelled at least ${cancellationDays} days before the slot time. For urgent queries, please contact support.`;
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Cancellation Policy', msg);
      return;
    }

    setBookingToCancel(booking);
    setCancelSuccess(false);
    setCancelModalVisible(true);
  };

  const confirmCancel = async () => {
    if (!bookingToCancel) return;

    try {
      setCancelling(true);
      
      // Invoke the refund-to-wallet edge function
      const { data, error } = await supabase.functions.invoke('payment-gateway', {
        body: {
          action: 'refund-to-wallet',
          bookingId: bookingToCancel.id,
          cancellationReason: 'Cancelled by player'
        }
      });

      if (error) throw error;
      if (data && data.success) {
        setBookings(prev => prev.map(b => 
          b.id === bookingToCancel.id ? { ...b, status: 'cancelled' as any } : b
        ));
        setCancelSuccess(true);
      } else {
        throw new Error(data?.error || 'Failed to process refund');
      }
    } catch (err: any) {
      if (Platform.OS === 'web') alert(err.message || 'Failed to cancel');
      else Alert.alert('Error', err.message || 'Failed to cancel');
      setCancelModalVisible(false);
    } finally {
      setCancelling(false);
    }
  };



  const saveBookingName = async (bookingId: string, name: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ booked_for_name: name })
        .eq('id', bookingId);
      
      if (error) throw error;
      
      // Update local state to keep everything in sync
      setBookings(prev => prev.map(b => 
        b.id === bookingId ? { ...b, booked_for_name: name } : b
      ));
    } catch (err: any) {
      if (Platform.OS === 'web') alert(err.message || 'Failed to save name');
      else Alert.alert('Error', err.message || 'Failed to save name');
    }
  };

  const togglePaymentReceived = async (booking: BookingWithDetails) => {
    const newValue = !booking.payment_received;
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_received: newValue })
        .eq('id', booking.id);
      
      if (error) throw error;
      
      setBookings(prev => prev.map(b => 
        b.id === booking.id ? { ...b, payment_received: newValue } : b
      ));
    } catch (err: any) {
      if (Platform.OS === 'web') alert(err.message || 'Failed to update payment status');
      else Alert.alert('Error', err.message || 'Failed to update payment status');
    }
  };

  /** Compare YYYY-MM-DD only; handles DB values with time / timezone suffix. */
  const bookingDateOnly = (raw: string | null | undefined) =>
    String(raw ?? '')
      .trim()
      .slice(0, 10);

  const isCancellable = (booking: BookingWithDetails) => {
    if (booking.status !== 'confirmed') return false;
    const bDate = new Date(booking.booking_date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const bDay = new Date(bDate.getFullYear(), bDate.getMonth(), bDate.getDate());
    const diffDays = Math.ceil((bDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 7;
  };

  /** Only confirmed / paid bookings are fetched. Consolidate multi-slot bookings for better visibility. */
  const filteredBookings = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];

    // 1. Group by Ground + Date + Slots list (from notes) to consolidate multi-slot bookings (including multi-date transactions)
    const consolidatedMap = new Map<string, BookingWithDetails & { allDates?: string[], allSlots?: string[] }>();
    
    bookings.forEach(b => {
      // Extract (Slots: ...) from notes to use as part of the grouping key
      const matchSlots = /\(Slots:\s*([^)]+)\)/.exec(b.notes || '');
      const slotsKey = matchSlots ? matchSlots[1] : `single_${b.start_time}`;
      
      // Use created_at (truncated to minute) to group bookings from the same transaction
      const createdAtMinute = b.created_at ? b.created_at.substring(0, 16) : 'unknown';
      const groupKey = `${b.user_id}_${b.ground_id}_${createdAtMinute}_${slotsKey}`;

      if (!consolidatedMap.has(groupKey)) {
        consolidatedMap.set(groupKey, { 
          ...b, 
          allDates: [b.booking_date],
          allSlots: matchSlots ? [matchSlots[1]] : [`${normalizeDbTimeToHHMM(b.start_time)} – ${normalizeDbTimeToHHMM(b.end_time)}`]
        });
      } else {
        const existing = consolidatedMap.get(groupKey)!;
        existing.total_amount = (existing.total_amount || 0) + (b.total_amount || 0);
        existing.discount_amount = (existing.discount_amount || 0) + (b.discount_amount || 0);
        if (!existing.allDates?.includes(b.booking_date)) {
          existing.allDates?.push(b.booking_date);
        }
        const slotLabel = matchSlots ? matchSlots[1] : `${normalizeDbTimeToHHMM(b.start_time)} – ${normalizeDbTimeToHHMM(b.end_time)}`;
        if (!existing.allSlots?.includes(slotLabel)) {
          existing.allSlots?.push(slotLabel);
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

    // 2. Detect matches for users (showing opponents)
    // We use the original bookings to detect opponents because they might be in different pages/groups
    const slotGroups = bookings.reduce((acc, b) => {
      const key = `${b.ground_id}_${b.booking_date}_${b.start_time}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(b);
      return acc;
    }, {} as Record<string, BookingWithDetails[]>);

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

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const renderPagination = () => {
    if (totalPages <= 1 && !loadingMore) return null;

    if (Platform.OS !== 'web') {
      if (!hasMore) return null;
      return (
        <TouchableOpacity 
          style={styles.loadMoreBtn} 
          onPress={() => loadBookings(page + 1, true)}
          disabled={loadingMore}
        >
          {loadingMore ? (
            <ActivityIndicator color="#00ea6b" />

          ) : (
            <Text style={styles.loadMoreText}>Load More</Text>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.paginationRow}>
        <TouchableOpacity 
          style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]} 
          onPress={() => loadBookings(page - 1)}
          disabled={page === 0}
        >
          <Text style={styles.pageBtnText}>Prev</Text>
        </TouchableOpacity>
        
        {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
          let pageNum = i;
          if (totalPages > 5 && page > 2) {
            pageNum = page - 2 + i;
            if (pageNum >= totalPages) pageNum = totalPages - 5 + i;
          }
          if (pageNum < 0) pageNum = i;

          return (
            <TouchableOpacity 
              key={pageNum} 
              style={[styles.pageBtn, page === pageNum && styles.pageBtnActive]} 
              onPress={() => loadBookings(pageNum)}
            >
              <Text style={[styles.pageBtnText, page === pageNum && styles.pageBtnTextActive]}>{pageNum + 1}</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity 
          style={[styles.pageBtn, page === totalPages - 1 && styles.pageBtnDisabled]} 
          onPress={() => loadBookings(page + 1)}
          disabled={page === totalPages - 1}
        >
          <Text style={styles.pageBtnText}>Next</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleDateClick = (dateStr: string) => {
    if (!tempFromDate || (tempFromDate && tempToDate)) {
      setTempFromDate(dateStr);
      setTempToDate(null);
    } else {
      if (dateStr < tempFromDate) {
        setTempToDate(tempFromDate);
        setTempFromDate(dateStr);
      } else {
        setTempToDate(dateStr);
      }
    }
  };

  const renderCalendar = (monthOffset: number) => {
    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const month = date.getMonth();
    const year = date.getFullYear();
    const monthName = date.toLocaleString('default', { month: 'long' });
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    
    return (
      <View style={styles.calMonth}>
        <Text style={styles.calMonthTitle}>{monthName} {year}</Text>
        <View style={styles.calGrid}>
           <View style={styles.calHeaderRow}>
             {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
               <Text key={d} style={styles.calHeaderCell}>{d}</Text>
             ))}
           </View>
           {weeks.map((week, wi) => (
             <View key={wi} style={styles.calRow}>
               {week.map((day, di) => {
                 if (!day) return <View key={di} style={styles.calCell} />;
                 
                 const dateStr = day.toISOString().split('T')[0];
                 const isSelected = tempFromDate === dateStr || tempToDate === dateStr;
                 const isInRange = tempFromDate && tempToDate && dateStr > tempFromDate && dateStr < tempToDate;
                 const isStart = tempFromDate === dateStr;
                 const isEnd = tempToDate === dateStr;
                 const isToday = new Date().toISOString().split('T')[0] === dateStr;
                 
                 return (
                   <TouchableOpacity 
                     key={di} 
                     style={[
                       styles.calCell,
                       isInRange && styles.calCellInRange,
                       isStart && styles.calCellStart,
                       isEnd && styles.calCellEnd,
                       isSelected && styles.calCellSelected,
                       isToday && !isSelected && !isInRange && { backgroundColor: '#F0FDF4' }
                     ]}
                     onPress={() => handleDateClick(dateStr)}
                   >
                     <Text style={[
                       styles.calDayText,
                       isInRange && styles.calDayTextInRange,
                       isSelected && styles.calDayTextSelected,
                       isToday && !isSelected && !isInRange && { color: '#00ea6b', fontWeight: '700' }
                     ]}>
                       {day.getDate()}
                     </Text>
                   </TouchableOpacity>
                 );
               })}
             </View>
           ))}
        </View>
      </View>
    );
  };

  const showAdminColumns = profile?.role === 'ground_owner';
  const visibleBookings = filteredBookings;

  const content = (
    <View style={[styles.container, isWeb && !IS_DARK && styles.webContainerRoot]}>
      {isWeb && !IS_DARK ? (
        <ScrollView 
          style={styles.webScrollRoot} 
          contentContainerStyle={styles.webScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.webTwoCol, isStacking && { flexDirection: 'column' }]}>
          {/* LEFT: bookings list */}
          <View style={styles.webLeft}>
            <View style={styles.webPageHeader}>
              <Text style={[styles.webPageTitle, isUltraNarrow && { fontSize: 20 }]}>My Bookings</Text>
              <Text style={[styles.webPageSub, isUltraNarrow && { fontSize: 11 }]}>Manage your upcoming games and view history</Text>
            </View>

            {/* Tabs */}
            <View style={styles.webTabRow}>
              {([
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'past', label: 'Past' },
                { id: 'cancelled', label: 'Cancelled' },
              ] as const).map(tab => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[styles.webTab, activeTab === tab.id && styles.webTabActive]}
                >
                  <Text style={[styles.webTabText, activeTab === tab.id && styles.webTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
              {profile?.role === 'ground_owner' && (
                <>
                  <View style={styles.verticalDivider} />
                  {(['all', 'own', 'other'] as const).map(scope => (
                    <TouchableOpacity
                      key={scope}
                      onPress={() => setOwnerScope(scope)}
                      style={[styles.webTab, ownerScope === scope && styles.webTabActive]}
                    >
                      <Text style={[styles.webTabText, ownerScope === scope && styles.webTabTextActive]}>
                        {scope === 'all' ? 'All' : scope === 'own' ? 'Own' : 'Other'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}


            </View>

            {/* Cards */}
            <FlatList
              data={visibleBookings}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.cardList}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={loading} onRefresh={loadBookings} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No bookings found</Text>
                </View>
              }
              renderItem={({ item }) => {
                const primaryImage =
                  item.ground?.ground_images?.find((img: any) => img.is_primary)?.image_url ||
                  item.ground?.ground_images?.[0]?.image_url ||
                  'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';
                const isPast = isDateInPast(item.booking_date);
                const isConfirmed = item.status === 'confirmed';
                const isCancelled = item.status === 'cancelled';
                const isCompleted = isConfirmed && isPast;
                const isActive = isConfirmed && !isPast;
                const teamsLabel = cricketTeamsLabelFromBooking(item.ground?.pitch_type, item.notes);
                const canCancel = isCancellable(item);
                const alreadyReviewed = reviewedBookingIds.includes(item.id);
                const statusLabel = isCancelled ? 'CANCELLED' : isCompleted ? 'COMPLETED' : 'CONFIRMED';
                const statusBg = isCancelled ? '#FDE8E8' : isCompleted ? '#E0E7FF' : '#DCFCE7';
                const statusColor = isCancelled ? '#991B1B' : isCompleted ? '#3730A3' : '#15803D';

                return (
                  <TouchableOpacity
                    style={styles.bCard}
                    onPress={() => router.push(`/bookings/${item.id}`)}
                    activeOpacity={0.88}
                  >
                    {/* Thumbnail */}
                    <View style={styles.bImageWrap}>
                      <View style={[styles.bStatusBadge, { backgroundColor: statusBg }]}>
                        <Text style={[styles.bStatusText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                      {/* @ts-ignore */}
                      <img
                        src={primaryImage}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
                        alt={item.ground?.name}
                      />
                    </View>

                    {/* Details */}
                    <View style={styles.bInfo}>
                      <View style={styles.bTopRow}>
                        <Text style={styles.bGroundName} numberOfLines={1}>
                          {item.ground?.name} – {item.ground?.city}
                        </Text>
                        <Text style={styles.bBookingId}>
                          Booking ID: {item.id.substring(0, 8).toUpperCase()}
                        </Text>
                      </View>

                      <Text style={styles.bMeta}>
                        {new Date(item.booking_date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                        {' · '}
                        {normalizeDbTimeToHHMM(item.start_time)} – {normalizeDbTimeToHHMM(item.end_time)}
                      </Text>
                      {teamsLabel ? <Text style={styles.bMeta}>{teamsLabel}</Text> : null}

                      {/* CTAs */}
                      <View style={styles.bActions}>
                        {!isCancelled && (
                          <TouchableOpacity style={styles.bBtnGreen} onPress={() => router.push(`/bookings/${item.id}`)}>
                            <Text style={styles.bBtnGreenText}>View Details</Text>
                          </TouchableOpacity>
                        )}
                        {isActive && canCancel && (
                          <TouchableOpacity style={styles.bBtnTextLink} onPress={(e: any) => { e.stopPropagation(); handleCancelBooking(item); }}>
                            <Text style={styles.bBtnTextLinkText}>Cancel Booking</Text>
                          </TouchableOpacity>
                        )}
                        {isCompleted && !alreadyReviewed && (
                          <TouchableOpacity style={styles.bBtnTextLink} onPress={(e: any) => { e.stopPropagation(); router.push(`/bookings/${item.id}`); }}>
                            <Text style={styles.bBtnTextLinkText}>Leave a Review</Text>
                          </TouchableOpacity>
                        )}
                        {isCancelled && (
                          <TouchableOpacity style={styles.bBtnGreen} onPress={() => router.push('/book-my-ground' as any)}>
                            <Text style={styles.bBtnGreenText}>Book Again</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListFooterComponent={renderPagination}
            />
          </View>

          {/* RIGHT: summary panels */}
          <View style={[styles.webRight, isStacking && { width: '100%', paddingLeft: 0, marginTop: 24 }]}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 16 }}
            >
              {/* Booking Summary */}
              <View style={styles.panelCard}>
                <Text style={styles.panelTitle}>Booking Summary</Text>
                <View style={styles.summaryCountRow}>
                  <View style={styles.summaryCount}>
                    <Text style={[styles.summaryValue, { color: '#00ea6b' }]}>

                      {bookings.filter(b => !isDateInPast(b.booking_date) && b.status === 'confirmed').length}
                    </Text>
                    <Text style={styles.summaryLabel}>Upcoming</Text>
                  </View>
                  <View style={styles.summaryCount}>
                    <Text style={styles.summaryValue}>
                      {bookings.filter(b => isDateInPast(b.booking_date) && b.status === 'confirmed').length}
                    </Text>
                    <Text style={styles.summaryLabel}>Past</Text>
                  </View>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Spent:</Text>
                  <Text style={styles.totalAmount}>
                    {formatCurrency(bookings.reduce((s, b) => s + (b.total_amount || 0), 0))}
                  </Text>
                </View>
              </View>

              {/* Activity & Stats */}
              <View style={styles.panelCard}>
                <Text style={styles.panelTitle}>Activity & Stats</Text>
                <View style={styles.statsRow}>
                  <View style={styles.donutWrap}>
                    <Svg width={70} height={70} style={{ transform: [{ rotate: '-90deg' }] }}>
                      <SvgCircle
                        cx={35}
                        cy={35}
                        r={32}
                        stroke="#F1F5F9"
                        strokeWidth={6}
                        fill="none"
                      />
                      <SvgCircle
                        cx={35}
                        cy={35}
                        r={32}
                        stroke="#00ea6b"

                        strokeWidth={6}
                        strokeDasharray={2 * Math.PI * 32}
                        strokeDashoffset={2 * Math.PI * 32 * (1 - userStats.percent / 100)}
                        strokeLinecap="round"
                        fill="none"
                      />
                    </Svg>
                    <View style={styles.donutCenter}>
                      <Text style={styles.donutPct}>{userStats.percent}%</Text>
                    </View>
                  </View>
                  <View style={styles.statsText}>
                    <Text style={styles.statsSmall}>Match Activity</Text>
                    <Text style={styles.statsBold}>Level: {userStats.level}</Text>
                    <Text style={[styles.statsBold, { color: '#00ea6b', marginTop: 4 }]}>

                      {userStats.totalHours} hrs
                    </Text>
                    <Text style={styles.statsSmall}>played total</Text>
                  </View>
                </View>

                <View style={styles.statsDivider} />

                <View style={styles.statsGrid}>
                  <View style={styles.statsGridItem}>
                    <Text style={styles.gridValue}>{userStats.uniqueGrounds}</Text>
                    <Text style={styles.gridLabel}>Grounds</Text>
                  </View>
                  <View style={styles.statsGridItem}>
                    <Text style={styles.gridValue}>{userStats.cancelledCount}</Text>
                    <Text style={styles.gridLabel}>Cancelled</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      ) : (
        <>

          <View style={styles.nativeFilterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nativeTabRow}>
              <Pressable
                onPress={() => setActiveTab('all' as any)}
                style={[
                  styles.nativeTabChip,
                  activeTab === 'all' && styles.nativeTabChipActive,
                ]}
              >
                <Text style={[styles.nativeTabChipText, activeTab === 'all' && styles.nativeTabChipTextActive]}>
                  {`All (${bookings.length})`}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab('upcoming')}
                style={[
                  styles.nativeTabChip,
                  activeTab === 'upcoming' && styles.nativeTabChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.nativeTabChipText,
                    activeTab === 'upcoming' && styles.nativeTabChipTextActive,
                  ]}
                >
                  Upcoming
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab('past')}
                style={[
                  styles.nativeTabChip,
                  activeTab === 'past' && styles.nativeTabChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.nativeTabChipText,
                    activeTab === 'past' && styles.nativeTabChipTextActive,
                  ]}
                >
                  Past
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab('cancelled')}
                style={[
                  styles.nativeTabChip,
                  activeTab === 'cancelled' && styles.nativeTabChipActive,
                ]}
              >
                <Text style={[styles.nativeTabChipText, activeTab === 'cancelled' && styles.nativeTabChipTextActive]}>
                  Cancelled
                </Text>
              </Pressable>
            </ScrollView>
          </View>

          <FlatList
            style={{ flex: 1 }}
            data={visibleBookings}
            renderItem={({ item }) => (
              <View style={styles.nativeItemContainer}>
                <BookingCard
                  booking={item}
                  lightMode={true}
                  onPress={() => router.push(`/bookings/${item.id}`)}
                  onCancel={activeTab === 'upcoming' && isCancellable(item) ? () => handleCancelBooking(item) : undefined}
                  onReview={activeTab === 'past' && (item.status === 'confirmed' || item.status === 'completed') && !reviewedBookingIds.includes(item.id) ? () => {
                    router.push(`/bookings/${item.id}`);
                  } : undefined}
                />
              </View>

            )}
            keyExtractor={item => item.id}
            key="bookings-1-col"
            numColumns={1}
            contentContainerStyle={styles.listNative}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={renderPagination}
            refreshControl={
              <RefreshControl
                refreshing={loading && !loadingMore}
                onRefresh={() => loadBookings(0)}
                tintColor="#00ea6b"
                colors={['#00ea6b']}
              />
            }
            onScroll={onScroll}
            scrollEventThrottle={16}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTextNative}>No bookings found</Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );

  const datePickerModal = (
    <Modal
      visible={isDatePickerVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setIsDatePickerVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsDatePickerVisible(false)} />
        <View style={styles.datePickerModalWrap}>
          <View style={styles.dpMain}>
            {/* Sidebar Quick Range */}
            <View style={styles.dpSidebar}>
              <Text style={styles.dpSidebarTitle}>Quick Range</Text>
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'this_week', label: 'This Week' },
                { id: 'last_week', label: 'Last Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'custom', label: 'Custom' },
              ].map((range) => (
                <TouchableOpacity 
                  key={range.id} 
                  style={[styles.quickRangeItem, range.id === 'custom' && styles.quickRangeItemActive]}
                  onPress={() => {
                    const today = new Date();
                    let start = new Date();
                    let end = new Date();
                    switch (range.id) {
                      case 'all': setTempFromDate(null); setTempToDate(null); return;
                      case 'today': break;
                      case 'yesterday': start.setDate(today.getDate() - 1); end.setDate(today.getDate() - 1); break;
                      case 'this_week': start.setDate(today.getDate() - today.getDay()); end.setDate(today.getDate() + (6 - today.getDay())); break;
                      case 'last_week': start.setDate(today.getDate() - today.getDay() - 7); end.setDate(today.getDate() - today.getDay() - 1); break;
                      case 'this_month': start = new Date(today.getFullYear(), today.getMonth(), 1); end = new Date(today.getFullYear(), today.getMonth() + 1, 0); break;
                      case 'last_month': start = new Date(today.getFullYear(), today.getMonth() - 1, 1); end = new Date(today.getFullYear(), today.getMonth(), 0); break;
                      case 'custom': return;
                    }
                    setTempFromDate(start.toISOString().split('T')[0]);
                    setTempToDate(end.toISOString().split('T')[0]);
                  }}
                >
                  <Calendar size={14} color={range.id === 'custom' ? '#00ea6b' : '#64748B'} />
                  <Text style={[styles.quickRangeText, range.id === 'custom' && styles.quickRangeTextActive]}>{range.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Main Selection Area */}
            <View style={styles.dpSelectionArea}>
              <View style={styles.dpInputsRow}>
                <View style={styles.dpInputBox}>
                  <Text style={styles.dpInputLabel}>Start Date</Text>
                  <View style={styles.dpInput}>
                    <Calendar size={16} color="#64748B" />
                    <Text style={styles.dpInputText}>
                      {tempFromDate ? new Date(tempFromDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select Date'}
                    </Text>
                  </View>
                </View>
                <View style={styles.dpArrow}>
                  <Text style={{ color: '#94A3B8', fontSize: 20 }}>→</Text>
                </View>
                <View style={styles.dpInputBox}>
                  <Text style={styles.dpInputLabel}>End Date</Text>
                  <View style={styles.dpInput}>
                    <Calendar size={16} color="#64748B" />
                    <Text style={styles.dpInputText}>
                      {tempToDate ? new Date(tempToDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select Date'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Calendar View */}
              <View style={styles.calendarPlaceholder}>
                 {renderCalendar(0)}
                 {Platform.OS === 'web' && width > 850 && renderCalendar(1)}
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.dpFooter}>
            <TouchableOpacity onPress={() => { setTempFromDate(null); setTempToDate(null); }}>
              <Text style={styles.dpClearBtn}>Clear</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={styles.dpCancelBtn} onPress={() => setIsDatePickerVisible(false)}>
                <Text style={styles.dpCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.dpApplyBtn} 
                onPress={() => {
                  setFromDate(tempFromDate);
                  setToDate(tempToDate);
                  setIsDatePickerVisible(false);
                }}
              >
                <Text style={styles.dpApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  const isCompact = width < 900;

  return (Platform.OS === 'web' && !isCompact) ? (
    <WebLayout>
      {content}
      {datePickerModal}
      <Modal
        visible={cancelModalVisible}
        onClose={() => !cancelling && setCancelModalVisible(false)}
        title={cancelSuccess ? "Success" : "Cancel Booking"}
        maxWidth={400}
      >
        <View style={styles.modalBody}>
          {cancelSuccess ? (
            <>
              <Text style={styles.modalText}>
                Your booking has been cancelled successfully.
              </Text>
              <Button
                title="CLOSE"
                onPress={() => setCancelModalVisible(false)}
                variant="primary"
                style={styles.modalButton}
              />
            </>
          ) : (
            <>
              <Text style={styles.modalText}>
                Are you sure you want to cancel this booking? This action cannot be undone.
              </Text>
              <View style={styles.modalActions}>
                <Button
                  title="NO, KEEP IT"
                  onPress={() => setCancelModalVisible(false)}
                  variant="outline"
                  disabled={cancelling}
                  style={styles.modalButton}
                />
                <Button
                  title={cancelling ? "CANCELLING..." : "YES, CANCEL"}
                  onPress={confirmCancel}
                  variant="primary"
                  disabled={cancelling}
                  style={[styles.modalButton, styles.cancelConfirmBtn]}
                />
              </View>
            </>
          )}
        </View>
      </Modal>
    </WebLayout>
  ) : (
    <View style={styles.nativeScreen}>
      <MobileAppNavbar title="My Bookings" titleColor="#111827" lightBg />
      <View style={styles.nativeBody}>
        {content}
        {datePickerModal}
        
        <Modal
          visible={cancelModalVisible}
          onClose={() => !cancelling && setCancelModalVisible(false)}
          title={cancelSuccess ? "Success" : "Cancel Booking"}
          maxWidth={400}
        >
          <View style={styles.modalBody}>
            {cancelSuccess ? (
              <>
                <Text style={styles.modalText}>
                  Your booking has been cancelled successfully.
                </Text>
                <Button
                  title="CLOSE"
                  onPress={() => setCancelModalVisible(false)}
                  variant="primary"
                  style={styles.modalButton}
                />
              </>
            ) : (
              <>
                <Text style={styles.modalText}>
                  Are you sure you want to cancel this booking? This action cannot be undone.
                </Text>
                <View style={styles.modalActions}>
                  <Button
                    title="NO, KEEP IT"
                    onPress={() => setCancelModalVisible(false)}
                    variant="outline"
                    disabled={cancelling}
                    style={styles.modalButton}
                  />
                  <Button
                    title={cancelling ? "CANCELLING..." : "YES, CANCEL"}
                    onPress={confirmCancel}
                    variant="primary"
                    disabled={cancelling}
                    style={[styles.modalButton, styles.cancelConfirmBtn]}
                  />
                </View>
              </>
            )}
          </View>
        </Modal>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 0,
  },
  webContainerRoot: {
    backgroundColor: 'transparent',
  },
  nativeScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  nativeBody: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  nativeFilterBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  nativeActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  nativeActionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Inter',
  },
  nativeActionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  nativeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ea6b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#00ea6b',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  nativeActionButtonText: {
    color: '#043529',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: 'Inter',
  },
  nativeTabRow: {
    flexDirection: 'row',
    gap: 10,
  },
  nativeTabChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeTabChipActive: {
    backgroundColor: '#01b854',
    borderColor: '#01b854',
  },
  nativeTabChipPressed: {
    opacity: 0.85,
  },
  nativeTabChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  nativeTabChipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  webHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: 0,
    paddingHorizontal: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  webContainer: {
    paddingHorizontal: 20,
    paddingTop: 0,
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
  },
  list: {
    padding: 16,
  },
  listNative: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  webList: {
    padding: 32,
    gap: 20,
    width: '100%',
  },
  webFlatList: {
    flex: 1,
  },
  webItem: {
    flex: 1,
  },
  webColumnWrapper: {
    gap: 20,
  },
  webCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    ...Platform.select({
      web: {
        flex: 1,
        minHeight: 0,
      },
    }),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 72,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  emptyTextNative: {
    fontSize: 15,
    color: '#9ca3af',
    fontFamily: 'Inter',
  },
  badgePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,234,107,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 78,
  },
  badgePillNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00ea6b',
    fontFamily: 'Inter',
  },
  badgePillLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: '#9CA3AF',
    fontFamily: 'Inter',
  },
  tabRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
  },
  tabChipActive: {
    backgroundColor: 'transparent',
    borderColor: '#00ea6b',
  },
  tabChipText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  tabChipTextActive: {
    color: '#00ea6b',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  nativeItemContainer: {
    marginBottom: 0,
  },
  modalBody: {
    gap: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 48,
  },
  cancelConfirmBtn: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  webHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchFilterWrap: {
    width: 200,
  },
  searchBarWeb: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
    fontSize: 13,
    color: '#111827',
    fontFamily: 'Inter',
  },
  dateFilterWrap: {
    position: 'relative',
  },
  webDatePicker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    cursor: 'pointer',
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  dateClearBtn: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  verticalDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  tableHeaderContainer: {
    marginHorizontal: 24,
    marginBottom: 4,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  clickableRowSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tableCell: {
    paddingRight: 16,
  },
  colBookedAt: {
    width: 140,
  },
  colGround: {
    flex: 2,
  },
  colDateTime: {
    width: 180,
  },
  colTeams: {
    width: 120,
  },
  colStatus: {
    width: 110,
  },
  colAmount: {
    width: 100,
  },
  colPayment: {
    width: 90,
  },
  colWho: {
    flex: 1.5,
  },
  whoPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
    fontFamily: 'Inter',
  },
  metaInline: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  colName: {
    width: 150,
  },
  colPaymentReceived: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentToggle: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: {
    fontSize: 12,
    color: '#111827',
    padding: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    width: '100%',
  },
  saveBtn: {
    padding: 4,
    marginLeft: 4,
  },
  nameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  bookedDateText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  bookedTimeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  groundName: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  groundLocation: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
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
    fontFamily: 'Inter',
  },
  amount: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textAlign: 'center',
    width: 'fit-content' as any,
    fontFamily: 'Inter',
  },
  statusConfirmed: {
    backgroundColor: '#DEF7EC',
    color: '#03543F',
  },
  statusCancelled: {
    backgroundColor: '#FDE8E8',
    color: '#9B1C1C',
  },
  teamsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  opponentMiniText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#01b854',
    marginTop: 2,
    textTransform: 'uppercase',
    fontFamily: 'Inter',
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textAlign: 'center',
    width: 'fit-content' as any,
    fontFamily: 'Inter',
  },
  paymentCash: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  paymentOnline: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
  },

  /* ── New card-based web layout ── */
  webScrollRoot: {
    flex: 1,
  },
  webScrollContent: {
    paddingBottom: 60,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  webTwoCol: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 32,
    paddingTop: 32,
    flex: 1,
  },
  webLeft: {
    flex: 1,
    minWidth: 0,
  },
  webRight: {
    width: 300,
    flexShrink: 0,
    gap: 16,
  },
  webPageHeader: {
    marginBottom: 20,
  },
  webPageTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  webPageSub: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  webTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  webFilterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webDateInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  webDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  webTab: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  webTabActive: {
    borderBottomColor: '#00ea6b',
  },
  webTabText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  webTabTextActive: {
    color: '#00ea6b',
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  cardList: {
    gap: 12,
    paddingBottom: 40,
  },
  bCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: 12,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  bImageWrap: {
    width: 180,
    height: 110,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  bStatusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bStatusText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Inter',
    letterSpacing: 0.4,
  },
  bInfo: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  bTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bGroundName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter',
    flex: 1,
    marginRight: 8,
  },
  bMeta: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  bActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  bBtnGreen: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#00ea6b',
  },
  bBtnGreenText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#043529',
    fontFamily: 'Inter',
  },
  bBtnOutline: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  bBtnOutlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    fontFamily: 'Inter',
    textDecorationLine: 'underline',
  },
  bBtnTextLink: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  bBtnTextLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    fontFamily: 'Inter',
    textDecorationLine: 'underline',
  },
  panelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    gap: 16,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  summaryCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryCount: {
    flex: 1,
    alignItems: 'flex-start',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryCountLabel: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Inter',
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  donutWrap: {
    width: 80,
    height: 80,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donut: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 10,
    borderColor: '#00ea6b',
    borderTopColor: '#E2E8F0',
    borderRightColor: '#E2E8F0',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutPct: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  statsText: {
    flex: 1,
  },
  statsSmall: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Inter',
  },
  statsBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    fontFamily: 'Inter',
  },
  statsDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statsGridItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  gridValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  pageBtn: {
    minWidth: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  pageBtnActive: {
    backgroundColor: '#00ea6b',
    borderColor: '#00ea6b',
  },
  pageBtnDisabled: {
    opacity: 0.5,
    backgroundColor: '#F8FAFC',
  },
  pageBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  pageBtnTextActive: {
    color: '#FFFFFF',
  },
  loadMoreBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00ea6b',
    fontFamily: 'Inter',
  },
  webFilterSection: {
    marginLeft: 'auto',
  },
  webDateInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    minWidth: 160,
  },
  webDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
  },
  datePickerModalWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '95%',
    maxWidth: 1200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
    alignSelf: 'center',
    marginTop: Platform.OS === 'web' ? '5%' : 0,
  },
  dpMain: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    minHeight: 450,
  },
  dpSidebar: {
    width: Platform.OS === 'web' ? 220 : '100%',
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightColor: '#F1F5F9',
    borderBottomWidth: Platform.OS === 'web' ? 0 : 1,
    borderBottomColor: '#F1F5F9',
    padding: 16,
    gap: 4,
  },
  dpSidebarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  quickRangeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 10,
  },
  quickRangeItemActive: {
    backgroundColor: '#F0FDF4',
  },
  quickRangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  quickRangeTextActive: {
    color: '#00ea6b',
  },
  dpSelectionArea: {
    flex: 1,
    padding: 24,
    minWidth: Platform.OS === 'web' ? 500 : 'auto',
  },
  dpInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  dpInputBox: {
    flex: 1,
    minWidth: 140,
  },
  dpInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  dpInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00ea6b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  dpInputText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  dpArrow: {
    paddingTop: 18,
  },
  calendarPlaceholder: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  calMonth: {
    flex: 1,
    minWidth: 280,
  },
  calMonthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
  },
  calGrid: {
    width: '100%',
  },
  calHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  calRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  calCell: {
    flex: 1,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  calCellInRange: {
    backgroundColor: '#F0FDF4',
    borderRadius: 0,
  },
  calCellStart: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    backgroundColor: '#00ea6b',
  },
  calCellEnd: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#00ea6b',
  },
  calCellSelected: {
    backgroundColor: '#00ea6b',
  },
  calDayText: {
    fontSize: 14,
    color: '#334155',
  },
  calDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calDayTextInRange: {
    color: '#065F46',
    fontWeight: '600',
  },
  calHint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  dpFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  dpClearBtn: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 8,
  },
  dpCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  dpCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  dpApplyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#00ea6b',
  },
  dpApplyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#043529',
  },
});



