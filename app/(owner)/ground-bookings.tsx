import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, Platform, TouchableOpacity, ScrollView, TextInput, useWindowDimensions, Image, ActivityIndicator, Modal, Pressable } from 'react-native';
import { Calendar, Filter, X, Save, CheckCircle2, Circle, User, Clock, Users, Banknote, LandPlot } from 'lucide-react-native';
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
import { formatCurrency, formatDate, formatDateDDMMYY, getStatusColor, isDateInPast } from '@/utils/helpers';
import { Animated } from 'react-native';

const SkeletonItem = ({ style }: { style?: any }) => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, [opacity]);

  return <Animated.View style={[{ backgroundColor: '#F1F5F9', borderRadius: 8 }, { opacity }, style]} />;
};

function BookingListSkeleton({ isWeb, isSmallScreen }: { isWeb: boolean, isSmallScreen: boolean }) {
  const rows = Array.from({ length: 8 });

  if (isWeb && !isSmallScreen) {
    return (
      <View style={{ padding: 24, gap: 16 }}>
        {/* Filter Bar Skeleton */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <SkeletonItem style={{ width: 120, height: 40, borderRadius: 20 }} />
          <SkeletonItem style={{ width: 120, height: 40, borderRadius: 20 }} />
          <SkeletonItem style={{ width: 120, height: 40, borderRadius: 20 }} />
          <View style={{ flex: 1 }} />
          <SkeletonItem style={{ width: 250, height: 40, borderRadius: 12 }} />
        </View>

        {/* Table Rows Skeleton */}
        {rows.map((_, i) => (
          <View key={i} style={{ flexDirection: 'row', padding: 20, backgroundColor: '#FFFFFF', borderRadius: 16, borderWeight: 1, borderColor: '#F1F5F9', gap: 20 }}>
            <View style={{ width: 100 }}><SkeletonItem style={{ height: 16, width: 80, marginBottom: 8 }} /><SkeletonItem style={{ height: 12, width: 60 }} /></View>
            <View style={{ flex: 1.5 }}><SkeletonItem style={{ height: 16, width: '70%', marginBottom: 8 }} /><SkeletonItem style={{ height: 12, width: '40%' }} /></View>
            <View style={{ flex: 1 }}><SkeletonItem style={{ height: 16, width: 90, marginBottom: 8 }} /><SkeletonItem style={{ height: 12, width: 70 }} /></View>
            <View style={{ width: 80 }}><SkeletonItem style={{ height: 24, borderRadius: 12 }} /></View>
            <View style={{ width: 100 }}><SkeletonItem style={{ height: 24, borderRadius: 12 }} /></View>
            <View style={{ width: 80 }}><SkeletonItem style={{ height: 16, width: 60 }} /></View>
            <View style={{ width: 80 }}><SkeletonItem style={{ height: 24, borderRadius: 12 }} /></View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ padding: 16, gap: 16 }}>
      {/* Search/Filter Mobile Skeleton */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <SkeletonItem style={{ flex: 2, height: 40, borderRadius: 12 }} />
        <SkeletonItem style={{ flex: 1, height: 40, borderRadius: 12 }} />
        <SkeletonItem style={{ flex: 1, height: 40, borderRadius: 12 }} />
      </View>
      
      {/* Mobile Card Skeletons */}
      {rows.map((_, i) => (
        <View key={i} style={{ padding: 16, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <SkeletonItem style={{ height: 14, width: 100 }} />
            <SkeletonItem style={{ height: 20, width: 80, borderRadius: 10 }} />
          </View>
          <SkeletonItem style={{ height: 18, width: '60%' }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <SkeletonItem style={{ height: 14, width: 80 }} />
            <SkeletonItem style={{ height: 14, width: 80 }} />
          </View>
          <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <SkeletonItem style={{ height: 16, width: 120 }} />
            <SkeletonItem style={{ height: 24, width: 24, borderRadius: 12 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function NameInputCell({ booking, onSave }: { booking: BookingWithDetails, onSave: (id: string, name: string) => Promise<void> }) {
  const [localName, setLocalName] = useState(booking.booked_for_name || '');
  const [saving, setSaving] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const hasChanged = localName !== (booking.booked_for_name || '');

  useEffect(() => {
    setLocalName(booking.booked_for_name || '');
  }, [booking.booked_for_name]);

  const handleSave = async () => {
    setIsFocused(false);
    if (!hasChanged || saving) return;
    setSaving(true);
    await onSave(booking.id, localName);
    setSaving(false);
  };

  return (
    <View style={styles.nameInputWrapper}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={(e) => e.stopPropagation()}
        style={[
          styles.nameInputRow,
          (isFocused || saving) && { borderColor: 'transparent', backgroundColor: '#f1f5f9' },
          saving && { opacity: 0.7 }
        ]}
      >
        <User size={14} color={saving ? "#94A3B8" : "#01b854"} style={styles.nameInputIcon} />
        <TextInput
          style={[styles.nameInput, Platform.OS === 'web' && { outlineStyle: 'none', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' } as any]}
          value={localName}
          onChangeText={setLocalName}
          onFocus={() => setIsFocused(true)}
          onBlur={handleSave}
          placeholder="Player name..."
          placeholderTextColor="#94A3B8"
          onSubmitEditing={handleSave}
        />
        {saving && (
          <View style={{ marginRight: 8 }}>
            <Text style={{ fontSize: 9, color: '#01b854', fontWeight: '800' }}>SAVING...</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

function AmountInputCell({ booking, onSave }: { booking: BookingWithDetails, onSave: (id: string, amount: number) => Promise<void> }) {
  const [localAmount, setLocalAmount] = useState(String(booking.total_amount || ''));
  const [saving, setSaving] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const hasChanged = localAmount !== String(booking.total_amount || '');

  const handleSave = async () => {
    setIsFocused(false);
    const numAmount = parseFloat(localAmount);
    if (isNaN(numAmount) || saving) return;
    if (!hasChanged) return;
    setSaving(true);
    await onSave(booking.id, numAmount);
    setSaving(false);
  };

  return (
    <View style={styles.nameInputWrapper}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={(e) => e.stopPropagation()}
        style={[
          styles.nameInputRow,
          (isFocused || saving) && { borderColor: 'transparent', backgroundColor: '#f1f5f9' },
          saving && { opacity: 0.7 }
        ]}
      >
        <Text style={{ fontSize: 13, color: saving ? "#94A3B8" : "#01b854", fontWeight: '700', marginLeft: 4 }}>₹</Text>
        <TextInput
          style={[styles.nameInput, { paddingLeft: 4 }, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
          value={localAmount}
          onChangeText={setLocalAmount}
          onFocus={() => setIsFocused(true)}
          onBlur={handleSave}
          placeholder="Amount..."
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          onSubmitEditing={handleSave}
        />
        {saving && (
          <View style={{ marginRight: 8 }}>
            <Text style={{ fontSize: 9, color: '#01b854', fontWeight: '800' }}>SAVING...</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function OwnerBookingsScreen() {
  const { profile, user } = useAuth();
  const { width } = useWindowDimensions();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const isWeb = Platform.OS === 'web';
  const isSmallScreen = width < 900;
  const isUltraNarrow = width < 350;
  const isTablet = width >= 600 && width < 900;
  const isLight = true; // Uniform light theme across platforms
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [tempFromDate, setTempFromDate] = useState<string | null>(null);
  const [tempToDate, setTempToDate] = useState<string | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all');
  const [ownerScope, setOwnerScope] = useState<'all' | 'own' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'wallet' | 'online' | 'cash'>('all');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'date' | 'ground' | 'amount' | 'status' | 'booked_at' | 'paid' | 'teams' | 'name'>('booked_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [showDatePickerMobile, setShowDatePickerMobile] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSlotModalVisible, setIsSlotModalVisible] = useState(false);
  const [selectedSlotBookings, setSelectedSlotBookings] = useState<BookingWithDetails[]>([]);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const PAGE_SIZE = 50;

  useEffect(() => {
    if (user) {
      loadBookings(false);
    }
  }, [user]);

  const loadBookings = async (isLoadMore = false) => {
    if (!user) return;
    if (isLoadMore && (!hasMore || loadingMore)) return;

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setPage(0);
        setHasMore(true);
      }

      // Fetch platform settings once
      if (!platformSettings) {
        try {
          const { data: settingsData } = await supabase
            .from('platform_settings')
            .select('*');

          const settingsMap: Record<string, any> = {};
          settingsData?.forEach(s => { settingsMap[s.key] = s.value; });
          setPlatformSettings(settingsMap);
        } catch (e) {
          console.log('Error fetching platform settings:', e);
        }
      }

      const currentPage = isLoadMore ? page + 1 : 0;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // 1) Bookings on grounds owned by this user
      const ownedPromise = supabase
        .from('bookings')
        .select(
          `
          *,
          ground:grounds!inner(
            *,
            ground_images(*)
          ),
          user:profiles(full_name, phone)
        `,
        )
        .eq('ground.owner_id', user.id)
        .neq('status', 'pending')
        .order('created_at', { ascending: false })
        .range(from, to);

      // 2) Bookings this user made as a player (any ground)
      const selfPromise = supabase
        .from('bookings')
        .select(
          `
          *,
          ground:grounds(
            *,
            ground_images(*)
          ),
          user:profiles(full_name, phone)
        `,
        )
        .eq('user_id', user.id)
        .neq('status', 'pending')
        .order('created_at', { ascending: false })
        .range(from, to);

      const [{ data: ownedData, error: ownedError }, { data: selfData, error: selfError }] =
        await Promise.all([ownedPromise, selfPromise]);

      if (ownedError) throw ownedError;
      if (selfError) throw selfError;

      const mergedBatch = [...(ownedData || []), ...(selfData || [])];
      let uniqueBatch = mergedBatch.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

      // 3) NEW: Fetch all "partner" bookings for the slots found in this batch.
      // This ensures that occupancy (FULL/PARTIAL) is accurate even if partners are far apart in pagination.
      if (uniqueBatch.length > 0) {
        try {
          const slotFilters = uniqueBatch.map(b =>
            `and(ground_id.eq.${b.ground_id},booking_date.eq.${b.booking_date},start_time.eq.${b.start_time})`
          );

          // Use a smaller chunk size to avoid potential URL length limits in some environments
          const chunkSize = 15;
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
            uniqueBatch = [...uniqueBatch, ...partners].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
          }
        } catch (partnerErr) {
          console.error('Error fetching partner bookings:', partnerErr);
        }
      }

      uniqueBatch.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      if (isLoadMore) {
        setBookings(prev => {
          const combined = [...prev, ...uniqueBatch];
          const deduplicated = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
          return deduplicated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        });
      } else {
        setBookings(uniqueBatch);
      }

      setPage(currentPage);
      setHasMore((ownedData?.length === PAGE_SIZE) || (selfData?.length === PAGE_SIZE));
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleCancelBooking = async (booking: BookingWithDetails) => {
    const isOwnGround = booking.ground.owner_id === user?.id;
    const bDate = new Date(booking.booking_date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const bDay = new Date(bDate.getFullYear(), bDate.getMonth(), bDate.getDate());
    const diffDays = Math.ceil((bDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 7 && !isOwnGround && profile?.role !== 'super_admin') {
      const msg = 'Bookings can only be cancelled at least 7 days before the slot time.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Cancellation Policy', msg);
      return;
    }

    const processCancel = async (reason: string) => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('payment-gateway', {
          body: {
            action: 'refund-to-wallet',
            bookingId: booking.id,
            cancellationReason: reason
          }
        });

        if (error) throw error;
        if (data && data.success) {
          setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b));
          setSelectedSlotBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b));
          if (Platform.OS === 'web') alert('Booking cancelled and refund processed.');
          else Alert.alert('Success', 'Booking cancelled and refund processed.');
        } else {
          throw new Error(data?.error || 'Failed to cancel');
        }
      } catch (err: any) {
        if (Platform.OS === 'web') alert(err.message || 'Failed to cancel');
        else Alert.alert('Error', err.message || 'Failed to cancel');
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const reason = window.prompt('Are you sure you want to cancel? Please enter a reason:', 'Owner requested cancellation');
      if (reason !== null) {
        await processCancel(reason);
      }
      return;
    }

    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            // On Native, we can't easily do a prompt with multiple buttons in a single call for Android
            // So we just use a default reason or we could add another step.
            // For now, let's just proceed with a default reason for Native simplicity.
            processCancel('Cancelled by owner via App');
          },
        },
      ]
    );
  };

  const saveBookingName = async (bookingId: string, name: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ booked_for_name: name })
        .eq('id', bookingId);
      if (error) throw error;
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, booked_for_name: name } : b));
    } catch (err: any) {
      if (Platform.OS === 'web') alert(err.message || 'Failed to save name');
      else Alert.alert('Error', err.message || 'Failed to save name');
    }
  };

  const saveBookingAmount = async (bookingId: string, amount: number) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ total_amount: amount })
        .eq('id', bookingId);
      if (error) throw error;
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, total_amount: amount } : b));
    } catch (err: any) {
      if (Platform.OS === 'web') alert(err.message || 'Failed to save amount');
      else Alert.alert('Error', err.message || 'Failed to save amount');
    }
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

  const calculateBRowFee = (row: any) => {
    if (!platformSettings) return Number(row.platform_fee_owner || 0) + Number(row.gst_owner || 0);
    const cricketFixedFee = Number(platformSettings.cricket_owner_fee_fixed ?? 100);
    const netsFixedFee = Number(platformSettings.nets_owner_fee_fixed ?? 25);
    const rate = Number(platformSettings.user_platform_fee_rate ?? 0.05);
    const gstRate = Number(platformSettings.gst_rate ?? 0.18);
    const pitchType = (row.ground?.pitch_type ?? '').toLowerCase();
    const isCricket = pitchType === 'cricket ground';
    const isNet = pitchType.includes('net') || pitchType.includes('lane');
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

  const openSlotModal = (item: BookingWithDetails) => {
    let relatedBookings: BookingWithDetails[] = [];

    if ((item as any).allBookingIds && (item as any).allBookingIds.length > 0) {
      // If it's a consolidated item, show all bookings in that group
      relatedBookings = bookings.filter(b => (item as any).allBookingIds.includes(b.id));
    } else {
      // Fallback for single slot items
      const normStart = normalizeDbTimeToHHMM(item.start_time);
      const currentSlotKey = `${item.ground_id}_${item.booking_date}_${normStart}`;
      relatedBookings = bookings.filter(b =>
        (b.status === 'confirmed' || b.status === 'active' || b.status === 'completed') &&
        `${b.ground_id}_${b.booking_date}_${normalizeDbTimeToHHMM(b.start_time)}` === currentSlotKey
      );
    }

    setSelectedSlotBookings(relatedBookings);
    setIsSlotModalVisible(true);
  };  const setQuickRange = (range: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (range) {
      case 'all':
        setTempFromDate(null);
        setTempToDate(null);
        return;
      case 'today':
        start = today;
        end = today;
        break;
      case 'yesterday':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case 'this_week':
        const day = today.getDay();
        start.setDate(today.getDate() - day);
        end.setDate(today.getDate() + (6 - day));
        break;
      case 'last_week':
        const lastWeekDay = today.getDay();
        start.setDate(today.getDate() - lastWeekDay - 7);
        end.setDate(today.getDate() - lastWeekDay - 1);
        break;
      case 'this_month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last_month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
    }
    setTempFromDate(start.toISOString().split('T')[0]);
    setTempToDate(end.toISOString().split('T')[0]);
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
                 
                 return (
                   <TouchableOpacity 
                     key={di} 
                     style={[
                       styles.calCell,
                       isInRange && styles.calCellInRange,
                       isStart && styles.calCellStart,
                       isEnd && styles.calCellEnd,
                       isSelected && styles.calCellSelected
                     ]}
                     onPress={() => handleDateClick(dateStr)}
                   >
                     <Text style={[
                       styles.calDayText,
                       isInRange && styles.calDayTextInRange,
                       isSelected && styles.calDayTextSelected
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

  const availableDates = useMemo(
    () => Array.from(new Set(bookings.map((b) => b.booking_date))).sort(),
    [bookings],
  );

  const filteredBookings = useMemo(
    () => {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = `${d.getMonth() + 1}`.padStart(2, '0');
      const dd = `${d.getDate()}`.padStart(2, '0');
      const todayIso = `${yyyy}-${mm}-${dd}`;

      const byScope = bookings.filter((b) => {
        if (ownerScope === 'all') return true;
        return ownerScope === 'own'
          ? b.ground.owner_id === user?.id
          : b.ground.owner_id !== user?.id;
      });

      const byDate = byScope.filter((b) => {
        if (fromDate && b.booking_date < fromDate) return false;
        if (toDate && b.booking_date > toDate) return false;
        return true;
      });

      const byPayment = paymentFilter === 'all'
        ? byDate
        : byDate.filter((b) => {
            const method = (b.payment_method || '').toLowerCase();
            if (paymentFilter === 'wallet') return method === 'wallet';
            if (paymentFilter === 'cash') return method === 'cash';
            if (paymentFilter === 'online') return method !== 'wallet' && method !== 'cash' && method !== '';
            return true;
          });

      const byStatus = activeTab === 'all'
        ? byPayment
        : activeTab === 'upcoming'
          ? byPayment.filter((b) => b.booking_date >= todayIso && (b.status === 'confirmed' || b.status === 'active' || b.status === 'completed'))
          : activeTab === 'past'
            ? byPayment.filter((b) => b.booking_date < todayIso && (b.status === 'confirmed' || b.status === 'active' || b.status === 'completed'))
            : byPayment.filter((b) => b.status === 'cancelled');

      const q = searchQuery.toLowerCase();
      const base = !searchQuery.trim() ? byStatus : byStatus.filter((b) => {
        const gn = (b.ground?.name || '').toLowerCase();
        const city = (b.ground?.city || '').toLowerCase();
        const customer = (b.user?.full_name || '').toLowerCase();
        const bfn = (b.booked_for_name || '').toLowerCase();
        const bid = (b.id || '').toLowerCase();
        return gn.includes(q) || city.includes(q) || customer.includes(q) || bfn.includes(q) || bid.includes(q);
      });

      // Grouping logic to consolidate multi-slot bookings (including multi-date transactions)
      // Moved calculateBRowFee outside useMemo to be accessible by modal
      const consolidatedMap = new Map<string, BookingWithDetails & { allDates?: string[], allSlots?: string[], allBookingIds?: string[], calculated_total_fee?: number }>();
      base.forEach(b => {
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
          } as any);
        } else {
          const existing = consolidatedMap.get(groupKey)!;
          existing.total_amount = Number(((existing.total_amount || 0) + (b.total_amount || 0)).toFixed(2));
          existing.discount_amount = Number(((existing.discount_amount || 0) + (b.discount_amount || 0)).toFixed(2));
          existing.calculated_total_fee = (existing.calculated_total_fee || 0) + bFee;

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

      const result = Array.from(consolidatedMap.values()).map(b => {
        // Prepare display date range
        let displayDate = formatDateDDMMYY(b.booking_date);
        if (b.allDates && b.allDates.length > 1) {
          const sortedDates = [...b.allDates].sort();
          displayDate = `${formatDateDDMMYY(sortedDates[0])} – ${formatDateDDMMYY(sortedDates[sortedDates.length - 1])}`;
        }
        return { ...b, displayDate };
      });

      // Sort
      const sorted = [...result].sort((a, b) => {
        let comparison = 0;
        if (sortKey === 'date') {
          const dateTimeA = `${a.booking_date}T${a.start_time}`;
          const dateTimeB = `${b.booking_date}T${b.start_time}`;
          comparison = dateTimeA > dateTimeB ? 1 : -1;
        } else if (sortKey === 'ground') {
          const nameA = (a.ground?.name || '').toLowerCase();
          const nameB = (b.ground?.name || '').toLowerCase();
          comparison = nameA > nameB ? 1 : -1;
        } else if (sortKey === 'amount') {
          comparison = a.total_amount > b.total_amount ? 1 : -1;
        } else if (sortKey === 'status') {
          comparison = a.status > b.status ? 1 : -1;
        } else if (sortKey === 'booked_at') {
          comparison = new Date(a.created_at).getTime() > new Date(b.created_at).getTime() ? 1 : -1;
        } else if (sortKey === 'paid') {
          comparison = (a.payment_received ? 1 : 0) > (b.payment_received ? 1 : 0) ? 1 : -1;
        } else if (sortKey === 'teams') {
          const getTeamsVal = (b: any) => {
            if (b.team_type === 'one') return 1;
            if (b.team_type === 'both') return 2;
            const label = cricketTeamsLabelFromBooking(b.ground.pitch_type, b.notes);
            return label === '1 team' ? 1 : 2;
          };
          comparison = getTeamsVal(a) > getTeamsVal(b) ? 1 : -1;
        } else if (sortKey === 'name') {
          const nameA = (a.booked_for_name || '').toLowerCase();
          const nameB = (b.booked_for_name || '').toLowerCase();
          comparison = nameA > nameB ? 1 : -1;
        }

        return sortAsc ? comparison : -comparison;
      });

      return sorted;
    },
    [bookings, activeTab, ownerScope, fromDate, toDate, paymentFilter, searchQuery, user?.id, sortAsc, sortKey],
  );

  const getConsolidatedCount = (tab: string) => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    const todayIso = `${yyyy}-${mm}-${dd}`;

    const byScope = bookings.filter((b) => {
      if (ownerScope === 'all') return true;
      return ownerScope === 'own'
        ? b.ground.owner_id === user?.id
        : b.ground.owner_id !== user?.id;
    });

    // Typically, status counts might ignore selectedDate or searchQuery to show global totals for that tab,
    // but to be consistent with what 'All' means in this view, we'll respect the scope filter.
    // We will NOT filter by selectedDate here so the tabs show total counts for the scope.
    
    const byPayment = paymentFilter === 'all'
      ? byScope
      : byScope.filter((b) => {
          const method = (b.payment_method || '').toLowerCase();
          if (paymentFilter === 'wallet') return method === 'wallet';
          if (paymentFilter === 'cash') return method === 'cash';
          if (paymentFilter === 'online') return method !== 'wallet' && method !== 'cash' && method !== '';
          return true;
        });

    const byStatus = tab === 'all'
      ? byPayment
      : tab === 'upcoming'
        ? byPayment.filter((b) => b.booking_date >= todayIso && (b.status === 'confirmed' || b.status === 'active' || b.status === 'completed'))
        : tab === 'past'
          ? byPayment.filter((b) => b.booking_date < todayIso && (b.status === 'confirmed' || b.status === 'active' || b.status === 'completed'))
          : byPayment.filter((b) => b.status === 'cancelled');

    const consolidatedMap = new Map<string, boolean>();
    byStatus.forEach(b => {
      const matchSlots = /\(Slots:\s*([^)]+)\)/.exec(b.notes || '');
      const slotsKey = matchSlots ? matchSlots[1] : `single_${b.start_time}`;
      const createdAtMinute = b.created_at ? b.created_at.substring(0, 16) : 'unknown';
      const groupKey = `${b.user_id}_${b.ground_id}_${createdAtMinute}_${slotsKey}`;
      consolidatedMap.set(groupKey, true);
    });

    return consolidatedMap.size;
  };

  const timeAllCount = useMemo(() => getConsolidatedCount('all'), [bookings, ownerScope, paymentFilter, user?.id, fromDate, toDate]);
  const upcomingCount = useMemo(() => getConsolidatedCount('upcoming'), [bookings, ownerScope, paymentFilter, user?.id, fromDate, toDate]);
  const pastCount = useMemo(() => getConsolidatedCount('past'), [bookings, ownerScope, paymentFilter, user?.id, fromDate, toDate]);
  const cancelledCount = useMemo(() => getConsolidatedCount('cancelled'), [bookings, ownerScope, paymentFilter, user?.id, fromDate, toDate]);

  const FilterDropdown = ({ id, label, value, options, onSelect }: any) => {
    const isOpen = activeDropdown === id;
    const selectedLabel = options.find((o: any) => o.key === value)?.label || label;

    return (
      <View style={{ flex: 1, position: 'relative', zIndex: isOpen ? 100 : 1 }}>
        <TouchableOpacity
          style={[styles.dropdownTrigger, isOpen && styles.dropdownTriggerActive, value !== 'all' && value !== null && styles.dropdownTriggerSelected]}
          onPress={() => setActiveDropdown(isOpen ? null : id)}
        >
          <Text style={[styles.dropdownTriggerText, isOpen && styles.dropdownTriggerTextActive, (value !== 'all' && value !== null) && styles.dropdownTriggerTextSelected]} numberOfLines={1}>
            {selectedLabel}
          </Text>
        </TouchableOpacity>

        {isOpen && (
          <>
            <TouchableOpacity
              style={[
                styles.dropdownOverlay,
                Platform.OS === 'web' && { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 } as any
              ]}
              activeOpacity={1}
              onPress={() => setActiveDropdown(null)}
            />
            <View style={[
              styles.dropdownMenu,
              id === 'date' ? { right: 0 } : { left: 0 }
            ]}>
              <ScrollView bounces={false} style={{ maxHeight: 250 }}>
                {options.map((opt: any) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.dropdownOption, value === opt.key && styles.dropdownOptionActive]}
                    onPress={() => {
                      onSelect(opt.key);
                      setActiveDropdown(null);
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, value === opt.key && styles.dropdownOptionTextActive]}>
                      {opt.label}
                    </Text>
                    {value === opt.key && <View style={styles.dropdownOptionDot} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: isSmallScreen ? '#F8FAFC' : '#FFFFFF' }}>
        {isSmallScreen && <MobileAppNavbar title="Bookings" titleColor="#0F172A" />}
        {isWeb && !isSmallScreen ? (
          <WebLayout>
             <BookingListSkeleton isWeb={isWeb} isSmallScreen={isSmallScreen} />
          </WebLayout>
        ) : (
          <BookingListSkeleton isWeb={isWeb} isSmallScreen={isSmallScreen} />
        )}
      </View>
    );
  }

  const content = (
    <View style={[styles.container, isSmallScreen && styles.containerMobile]}>
      {isSmallScreen && (
        <View style={styles.controlsRow}>
          <View style={styles.searchBoxMobileWrapper}>
            <TextInput
              style={[
                styles.searchBarMobile, 
                isUltraNarrow && { fontSize: 11, paddingHorizontal: 8 },
                Platform.OS === 'web' && { outlineStyle: 'none' } as any
              ]}
              placeholder={isUltraNarrow ? "Search" : "Search..."}
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <FilterDropdown
            id="status"
            label="Stat"
            value={activeTab}
            options={[
              { key: 'all', label: 'All Status' },
              { key: 'upcoming', label: 'Upcoming' },
              { key: 'past', label: 'Past' },
              { key: 'cancelled', label: `Cancelled (${cancelledCount})` },
            ]}
            onSelect={setActiveTab}
          />
          <FilterDropdown
            id="scope"
            label="Scope"
            value={ownerScope}
            options={[
              { key: 'all', label: 'All Venues' },
              { key: 'own', label: 'Own Venues' },
              { key: 'other', label: 'Others' },
            ]}
            onSelect={setOwnerScope}
          />
          <FilterDropdown
            id="payment"
            label="Pay"
            value={paymentFilter}
            options={[
              { key: 'all', label: 'All Payment' },
              { key: 'online', label: 'Online' },
              { key: 'wallet', label: 'Wallet' },
              { key: 'cash', label: 'Cash' },
            ]}
            onSelect={setPaymentFilter}
          />
          <TouchableOpacity 
            style={[styles.filterByDateBtn, { marginLeft: 8, paddingHorizontal: 8 }]}
            onPress={() => {
              setTempFromDate(fromDate);
              setTempToDate(toDate);
              setIsDatePickerVisible(true);
            }}
          >
            <Calendar size={16} color="#64748B" />
            <Text style={styles.filterByDateText}>Date</Text>
          </TouchableOpacity>
        </View>
      )}

      {isWeb && !isSmallScreen && bookings.length > 0 && (
        <View style={styles.filterContainer}>
          <View style={styles.filterRow}>
            <View style={styles.tabsAndFilterLeft}>
              {/* Native select styled as a dropdown chip */}
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  color: '#4B5563',
                  border: '1px solid #E5E7EB',
                  fontWeight: '600',
                  fontSize: '11px',
                  fontFamily: 'Inter',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="all">All ({timeAllCount})</option>
                <option value="upcoming">Upcoming ({upcomingCount})</option>
                <option value="past">Past ({pastCount})</option>
                <option value="cancelled">Cancelled ({cancelledCount})</option>
              </select>

              <View style={styles.verticalDivider} />

              <select
                value={ownerScope}
                onChange={(e) => setOwnerScope(e.target.value as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  color: '#4B5563',
                  border: '1px solid #E5E7EB',
                  fontWeight: '600',
                  fontSize: '11px',
                  fontFamily: 'Inter',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="all">All venues</option>
                <option value="own">Own venues</option>
                <option value="other">Other venues</option>
              </select>

              <View style={styles.verticalDivider} />

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  color: '#4B5563',
                  border: '1px solid #E5E7EB',
                  fontWeight: '600',
                  fontSize: '11px',
                  fontFamily: 'Inter',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="all">All Payment</option>
                <option value="online">Online</option>
                <option value="wallet">Wallet</option>
                <option value="cash">Cash</option>
              </select>
            </View>

            <View style={styles.searchFilterWrap}>
              <TextInput
                style={[styles.searchBarWeb, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
                placeholder="Search..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(owner)/inventory')}
              style={[styles.tabChip, { backgroundColor: '#059669', borderColor: '#059669', paddingHorizontal: 12 }]}
            >
              <Text style={[styles.tabChipText, { color: '#FFFFFF', fontWeight: '800' }]}>+ Add Booking</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterByDateBtn, { marginLeft: 12 }]}
              onPress={() => {
                setTempFromDate(fromDate);
                setTempToDate(toDate);
                setIsDatePickerVisible(true);
              }}
            >
              <Calendar size={16} color="#64748B" />
              <Text style={styles.filterByDateText}>Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isWeb && !isSmallScreen && bookings.length > 0 && (
        <View style={styles.tableHeaderContainer}>
          <View style={styles.tableHeaderRow}>
            <TouchableOpacity
              onPress={() => {
                if (sortKey === 'booked_at') setSortAsc(!sortAsc);
                else { setSortKey('booked_at'); setSortAsc(true); }
              }}
              style={[styles.colBookedAt, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
            >
              <Text style={styles.tableHeaderText}>Booked at</Text>
              {sortKey === 'booked_at' && (
                <Text style={{ fontSize: 10, color: '#10b981' }}>{sortAsc ? '▲' : '▼'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (sortKey === 'ground') setSortAsc(!sortAsc);
                else { setSortKey('ground'); setSortAsc(true); }
              }}
              style={[styles.colGround, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
            >
              <Text style={styles.tableHeaderText}>Ground</Text>
              {sortKey === 'ground' && (
                <Text style={{ fontSize: 10, color: '#10b981' }}>{sortAsc ? '▲' : '▼'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (sortKey === 'date') setSortAsc(!sortAsc);
                else { setSortKey('date'); setSortAsc(true); }
              }}
              style={[styles.colDateTime, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
            >
              <Text style={styles.tableHeaderText}>Slot Date & time</Text>
              {sortKey === 'date' && (
                <Text style={{ fontSize: 10, color: '#10b981' }}>{sortAsc ? '▲' : '▼'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (sortKey === 'teams') setSortAsc(!sortAsc);
                else { setSortKey('teams'); setSortAsc(true); }
              }}
              style={[styles.colTeams, { flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' }]}
            >
              <Text style={styles.tableHeaderText}>Fee</Text>
              {sortKey === 'teams' && (
                <Text style={{ fontSize: 10, color: '#10b981' }}>{sortAsc ? '▲' : '▼'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (sortKey === 'status') setSortAsc(!sortAsc);
                else { setSortKey('status'); setSortAsc(true); }
              }}
              style={[styles.colStatus, { flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' }]}
            >
              <Text style={styles.tableHeaderText}>Status</Text>
              {sortKey === 'status' && (
                <Text style={{ fontSize: 10, color: '#10b981' }}>{sortAsc ? '▲' : '▼'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (sortKey === 'amount') setSortAsc(!sortAsc);
                else { setSortKey('amount'); setSortAsc(true); }
              }}
              style={[styles.colAmount, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
            >
              <Text style={styles.tableHeaderText}>Amount</Text>
              {sortKey === 'amount' && (
                <Text style={{ fontSize: 10, color: '#10b981' }}>{sortAsc ? '▲' : '▼'}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.colPayment}>
              <Text style={styles.tableHeaderText}>Payment</Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (sortKey === 'name') setSortAsc(!sortAsc);
                else { setSortKey('name'); setSortAsc(true); }
              }}
              style={[styles.colName, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
            >
              <Text style={styles.tableHeaderText}>Name</Text>
              {sortKey === 'name' && (
                <Text style={{ fontSize: 10, color: '#10b981' }}>{sortAsc ? '▲' : '▼'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (sortKey === 'paid') setSortAsc(!sortAsc);
                else { setSortKey('paid'); setSortAsc(true); }
              }}
              style={[styles.colPaymentReceived, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }]}
            >
              <Text style={styles.tableHeaderText}>Paid</Text>
              {sortKey === 'paid' && (
                <Text style={{ fontSize: 10, color: '#10b981' }}>{sortAsc ? '▲' : '▼'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={filteredBookings}
        extraData={bookings}
        renderItem={({ item }) => {
          const isOwnGround = item.ground.owner_id === user?.id;
          const isSelfBooking = item.user_id === user?.id;
          const meta =
            isOwnGround && isSelfBooking
              ? 'Self booking on your ground'
              : isOwnGround
                ? 'Customer booking'
                : 'Your personal booking';
          const whoTitle = isSelfBooking
            ? (isOwnGround ? 'Self' : 'Another Ground')
            : (item.user?.full_name || 'Customer');

          if (isWeb && !isSmallScreen) {
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
                </View>

                <View style={[styles.tableCell, styles.colGround]}>
                  <Text style={styles.groundName}>{item.ground.name}</Text>
                  <Text style={styles.groundLocation}>
                    {item.ground.city}, {item.ground.state}
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
                  const totalFee = (item as any).calculated_total_fee || 0;

                  return (
                    <View style={[styles.tableCell, styles.colTeams, { alignItems: 'center' }]}>
                      <Text style={[styles.teamsText, { color: '#EF4444', fontWeight: '700' }]}>
                        {formatCurrency(totalFee)}
                      </Text>
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
                      item.status === 'confirmed'
                        ? (isDateInPast(item.booking_date) ? styles.statusDone : styles.statusConfirmed)
                        : styles.statusCancelled
                    ]}>
                      {item.status === 'confirmed' ? (isDateInPast(item.booking_date) ? 'DONE' : 'ACTIVE') : item.status.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.tableCell, styles.colAmount]}>
                  {isOwnGround ? (
                    <AmountInputCell booking={item} onSave={saveBookingAmount} />
                  ) : (
                    <Text style={styles.amount}>{formatCurrency(item.total_amount)}</Text>
                  )}
                </View>

                <View style={[styles.tableCell, styles.colPayment, { alignItems: 'center', justifyContent: 'center' }]}>
                  <View style={[
                    styles.paymentBadge,
                    item.payment_method === 'cash' ? styles.paymentCash : styles.paymentOnline
                  ]}>
                    <Text style={[
                      styles.paymentBadgeText,
                      item.payment_method === 'cash' ? styles.paymentCash : (item.payment_method === 'wallet' ? styles.paymentWallet : styles.paymentOnline)
                    ]}>
                      {item.payment_method === 'cash' ? 'CASH' : (item.payment_method === 'wallet' ? 'WALLET' : (item.payment_method === 'razorpay' ? 'RAZORPAY' : 'ONLINE'))}
                    </Text>
                  </View>
                </View>

                <View style={[styles.tableCell, styles.colName]}>
                  <NameInputCell booking={item} onSave={saveBookingName} />
                </View>

                <View style={[styles.tableCell, styles.colPaymentReceived]}>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      togglePaymentReceived(item);
                    }}
                    style={styles.paymentToggle}
                  >
                    <View style={{ alignItems: 'center', minWidth: 60 }}>
                      {(item.payment_received || (item.payment_method !== 'cash' && item.status === 'confirmed')) ? (
                        <>
                          <CheckCircle2 size={20} color="#00ea6b" />
                          <Text style={[styles.receivedAmountText, { maxWidth: 60 }]} numberOfLines={1}>
                            {formatCurrency(item.total_amount - ((item as any).calculated_total_fee || 0))}
                          </Text>
                        </>
                      ) : (
                        <Circle size={20} color="#9CA3AF" />
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              onPress={() => router.push(`/bookings/${item.id}`)}
              style={[styles.compactRow, !isLight && styles.compactRowNative]}
              activeOpacity={0.7}
            >
              <View style={styles.compactTopRow}>
                <Image
                  source={{
                    uri: item.ground.ground_images?.[0]?.image_url || 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg'
                  }}
                  style={styles.compactGroundImage}
                />

                <View style={styles.compactMainInfo}>
                  <Text style={[styles.compactGroundName, !isLight && styles.compactGroundNameNative]} numberOfLines={1}>
                    {item.ground.name}
                  </Text>
                  <TouchableOpacity 
                    style={styles.compactSlotRow}
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
                        <Text style={[styles.compactSlotTime, !isLight && styles.compactSlotTimeNative]}>
                          {`${formatTime12h(normalizeDbTimeToHHMM(item.start_time) || '')} – ${formatTime12h(normalizeDbTimeToHHMM(item.end_time) || '')}`}
                        </Text>
                      );
                    })()}
                  </TouchableOpacity>
                </View>

                <View style={styles.compactStatusInfoAx}>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      if (item.status === 'confirmed' && !isDateInPast(item.booking_date)) {
                        handleCancelBooking(item);
                      }
                    }}
                    disabled={item.status !== 'confirmed' || isDateInPast(item.booking_date)}
                    style={[
                      styles.statusBadgeCompact,
                      item.status === 'confirmed'
                        ? (isDateInPast(item.booking_date) ? styles.statusDone : styles.statusConfirmed)
                        : styles.statusCancelled
                    ]}
                  >
                    <Text style={[
                      styles.statusBadgeText,
                      item.status === 'confirmed'
                        ? (isDateInPast(item.booking_date) ? styles.statusDone : styles.statusConfirmed)
                        : styles.statusCancelled
                    ]}>
                      {item.status === 'confirmed' ? (isDateInPast(item.booking_date) ? 'DONE' : 'ACTIVE') : 'CANCEL'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.compactDivider} />

              <View style={styles.compactBottomRow}>
                <View style={styles.compactBottomLeft}>
                  <View style={{ width: 120 }}>
                    <NameInputCell booking={item} onSave={saveBookingName} />
                  </View>
                  <View style={{ width: 120, marginTop: 6 }}>
                    {isOwnGround ? (
                      <AmountInputCell booking={item} onSave={saveBookingAmount} />
                    ) : (
                      <Text style={[styles.compactAmount, !isLight && styles.compactAmountNative]}>
                        {formatCurrency(item.total_amount)}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.compactBottomRight}>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      togglePaymentReceived(item);
                    }}
                    style={styles.compactPaymentToggle}
                  >
                    <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                      <Text style={[
                        styles.paymentLabel, 
                        { color: (item.status === 'cancelled' && item.payment_method !== 'cash') ? '#EF4444' : (isLight ? '#64748B' : '#dcc093') }
                      ]}>
                        {(item.status === 'cancelled' && item.payment_method !== 'cash') ? 'REFUNDED' : 'PAID'}
                      </Text>
                      {((item.payment_received || (item.payment_method !== 'cash' && item.status === 'confirmed')) || (item.status === 'cancelled' && item.payment_method !== 'cash')) && (
                        <Text style={[
                          styles.receivedAmountTextCompact,
                          (item.status === 'cancelled' && item.payment_method !== 'cash') && { color: '#EF4444' }
                        ]}>
                          {formatCurrency(item.total_amount - (item.status === 'cancelled' ? 0 : ((item as any).calculated_total_fee || 0)))}
                        </Text>
                      )}
                    </View>
                    {(item.payment_received || (item.payment_method !== 'cash' && (item.status === 'confirmed' || item.status === 'cancelled'))) ? (
                      <CheckCircle2 size={24} color={(item.status === 'cancelled' && item.payment_method !== 'cash') ? '#EF4444' : "#00ea6b"} />
                    ) : (
                      <Circle size={24} color="#9CA3AF" />
                    )}
                  </TouchableOpacity>
                  <Text style={[styles.compactBookedAt, { textAlign: 'right', marginTop: 4 }]}>
                    {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading && !loadingMore} onRefresh={() => loadBookings(false)} />
        }
        onEndReached={() => loadBookings(true)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => (
          hasMore ? (
            <TouchableOpacity 
              style={styles.loadMoreBtn} 
              onPress={() => loadBookings(true)}
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
            <Text style={styles.emptyText}>No bookings yet</Text>
          </View>
        }
      />

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
              <View>
                <Text style={styles.slotModalTitle}>Bookings for this Slot</Text>
              </View>
              <TouchableOpacity onPress={() => setIsSlotModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 600 }}>
              {(() => {
                const totalOccupancy = selectedSlotBookings.reduce((sum, b) => {
                  if (b.status === 'cancelled' || b.status === 'rejected') return sum;
                  const label = (cricketTeamsLabelFromBooking(b.ground?.pitch_type, b.notes) || '').toLowerCase();
                  return sum + (label === '1 team' ? 1 : 2);
                }, 0);
                const isSlotFull = totalOccupancy >= 2;

                return selectedSlotBookings.sort((a, b) => `${a.booking_date}${a.start_time}` > `${b.booking_date}${b.start_time}` ? 1 : -1).map((b) => {
                  const pitchType = (b.ground?.pitch_type || '').toLowerCase();
                  const isNet = pitchType.includes('net') || pitchType.includes('lane');
                  const isCricket = pitchType === 'cricket ground';

                  return (
                    <View key={b.id} style={styles.slotBookingItem}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                           <View style={[styles.typeBadge, { backgroundColor: isNet ? '#FEF3C7' : '#DCFCE7' }]}>
                              <Text style={[styles.typeBadgeText, { color: isNet ? '#92400E' : '#166534' }]}>
                                {isNet ? 'NET BOOKING' : 'GROUND BOOKING'}
                              </Text>
                           </View>
                           <Text style={styles.slotBookingId}>#{(b.id || '').toString().substring(0, 8).toUpperCase()}</Text>
                        </View>

                        <Text style={styles.slotBookingName}>{(b.booked_for_name || b.user?.full_name || 'Customer').toUpperCase()}</Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                          <Text style={styles.slotBookingDetail}>{formatDateDDMMYY(b.booking_date)}</Text>
                          <Text style={{ color: '#CBD5E1', fontSize: 12 }}>|</Text>
                          <Text style={styles.slotBookingDetail}>
                            {`${formatTime12h(normalizeDbTimeToHHMM(b.start_time) || '')} – ${formatTime12h(normalizeDbTimeToHHMM(b.end_time) || '')}`}
                          </Text>
                          {isCricket && (
                            <>
                              <Text style={{ color: '#CBD5E1', fontSize: 12 }}>|</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={styles.slotBookingDetail}>
                                  {(cricketTeamsLabelFromBooking(b.ground.pitch_type, b.notes) || '1 Team').toUpperCase()}
                                </Text>
                                <View style={[styles.typeBadge, { backgroundColor: isSlotFull ? '#DCFCE7' : '#FEF3C7', paddingVertical: 2, paddingHorizontal: 6, marginRight: 0 }]}>
                                  <Text style={[styles.typeBadgeText, { color: isSlotFull ? '#166534' : '#92400E', fontSize: 8 }]}>
                                    {isSlotFull ? 'FULL' : 'PARTIAL'}
                                  </Text>
                                </View>
                              </View>
                            </>
                          )}
                          {isNet && (
                            <>
                              <Text style={{ color: '#CBD5E1', fontSize: 12 }}>|</Text>
                              <Text style={styles.slotBookingDetail}>
                                {b.ground.name.toUpperCase()}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch' }}>
                        <View style={[styles.statusBadge, { backgroundColor: 'transparent', height: 24, paddingHorizontal: 0, borderRadius: 6, borderWidth: b.status === 'cancelled' ? 1 : 0, borderColor: '#EF4444' }]}>
                          <Text style={[styles.statusText, { color: b.status === 'confirmed' ? (isDateInPast(b.booking_date) ? '#64748B' : '#166534') : '#EF4444', fontSize: 10, fontWeight: '800' }]}>
                            {b.status === 'confirmed' ? (isDateInPast(b.booking_date) ? 'DONE' : 'ACTIVE') : b.status.toUpperCase()}
                          </Text>
                        </View>
                        
                        <View style={{ alignItems: 'flex-end', marginTop: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ color: '#0F172A', fontWeight: '600', fontSize: 18 }}>
                              ₹{(b.total_amount - calculateBRowFee(b)).toLocaleString()}
                            </Text>
                          </View>

                          {b.status === 'confirmed' && !isDateInPast(b.booking_date) && (
                            <TouchableOpacity 
                              onPress={() => handleCancelBooking(b)}
                              style={{ 
                                marginTop: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 2
                              }}
                            >
                              <X size={10} color="#E11D48" />
                              <Text style={{ color: '#E11D48', fontSize: 10, fontWeight: '800', textDecorationLine: 'underline' }}>CANCEL</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                });
              })()}
              {selectedSlotBookings.length === 0 && (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ color: '#64748B', fontWeight: '500' }}>No active bookings for this slot.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
                  { id: 'custom', label: 'Custom Range' },
                ].map((range) => (
                  <TouchableOpacity 
                    key={range.id} 
                    style={[styles.quickRangeItem, range.id === 'custom' && styles.quickRangeItemActive]}
                    onPress={() => setQuickRange(range.id)}
                  >
                    <Calendar size={14} color={range.id === 'custom' ? '#059669' : '#64748B'} />
                    <Text style={[styles.quickRangeText, range.id === 'custom' && styles.quickRangeTextActive]}>
                      {range.label}
                    </Text>
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
                   {renderCalendar(1)}
                </View>
                
                <Text style={styles.calHint}>Select range from the sidebar or click a date to begin</Text>
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

  if (Platform.OS === 'web') {
    return (
      <WebLayout noCard hideHeader={isSmallScreen}>
        {content}
        {datePickerModal}
      </WebLayout>
    );
  }

  return (
    <View style={styles.nativeContainer}>
      <MobileAppNavbar title="Ground Bookings" titleColor="#059669" />
      {content}
      {datePickerModal}
    </View>
  );
}

const IS_WEB = Platform.OS === 'web';

const styles = StyleSheet.create({
  nativeContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  containerMobile: {
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerWebMobile: {
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#212121',
    letterSpacing: -0.3,
  },
  list: {
    padding: 0,
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  tableHeaderContainer: {
    marginHorizontal: IS_WEB ? 0 : 16,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableHeaderRow: {
    flexDirection: 'row',
  },
  tableHeaderCell: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableHeaderText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableCell: {
    // paddingRight: 16,
  },
  colBookedAt: {
    width: 110,
    marginRight: 16,
  },
  colGround: {
    flex: 2,
    marginRight: 16,
  },
  colDateTime: {
    flex: 1.2,
    marginRight: 16,
  },
  colTeams: {
    width: 80,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colStatus: {
    width: 100,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colAmount: {
    width: 90,
    marginRight: 16,
  },
  colPayment: {
    width: 85,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colWho: {
    flex: 1.8,
  },
  bookedDateText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#111827',
    fontWeight: '500',
  },
  bookedTimeText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  bookingIdTable: {
    fontSize: 9,
    fontWeight: '700',
    color: '#01b854',
    marginTop: 4,
    fontFamily: 'Inter',
  },
  groundName: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  groundLocation: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  amount: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  dateText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#111827',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  teamsText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'left',
  },
  statusTextInline: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  metaInline: {
    fontSize: 12,
    color: '#6B7280',
  },
  whoPrimaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  filterContainer: {
    marginTop: 8,
    marginHorizontal: IS_WEB ? 0 : 16,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2b2f4b',
  },
  colName: {
    width: 120,
    marginRight: 16,
    overflow: 'hidden',
  },
  colPaymentReceived: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receivedAmountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#01b854',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  receivedAmountTextCompact: {
    fontSize: 12,
    fontWeight: '800',
    color: '#01b854',
    fontFamily: 'Inter',
  },
  paymentToggle: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  tabScrollWrap: {
    marginTop: 12,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  tabsAndFilterLeft: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  tabChip: {
    position: 'relative',
    paddingHorizontal: IS_WEB ? 8 : 12,
    paddingVertical: IS_WEB ? 5 : 8,
    borderRadius: IS_WEB ? 6 : 8,
    backgroundColor: '#F1F5F9',
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  tabChipText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  verticalDivider: {
    width: 1,
    height: 18,
    backgroundColor: IS_WEB ? '#E5E7EB' : 'rgba(0,234,107,0.15)',
    marginHorizontal: 4,
  },
  dateFilterWrap: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
  },
  paymentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  paymentCash: {
    color: '#92400E',
  },
  paymentOnline: {
    color: '#1E40AF',
  },
  paymentWallet: {
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
  statusDone: {
    backgroundColor: '#F3E8FF',
    color: '#7E22CE',
  },
  statusCancelled: {
    backgroundColor: '#FDE8E8',
    color: '#9B1C1C',
  },
  partialBadge: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 6,
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
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  fullMatchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  searchBarWeb: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 32,
    fontSize: 11,
    width: 240,
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  searchFilterWrap: {
    marginLeft: 'auto',
  },
  searchBarMobile: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    color: '#1E293B',
    marginBottom: 16,
    fontSize: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  searchBarWebMobile: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    color: '#1E293B',
  },
  nameInputWrapper: {
    flex: 1,
    minHeight: 30,
  },
  nameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nameInputIcon: {
    marginRight: 4,
  },
  nameInput: {
    flex: 1,
    fontSize: 11,
    color: '#1E293B',
    paddingVertical: 4,
    paddingHorizontal: 0,
    fontWeight: '600',
  },
  saveBadge: {
    backgroundColor: '#01b854',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  saveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  compactRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
  },
  compactRowNative: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F5F9',
  },
  compactTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactGroundImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  compactDateTextSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  compactDateDay: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    color: '#166534',
  },
  compactDateDayNative: {
    color: '#166534',
  },
  compactDateMonth: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '600',
    color: '#15803d',
    marginTop: -2,
    letterSpacing: 0.5,
  },
  compactDateMonthNative: {
    color: '#15803d',
  },
  compactMainInfo: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 2,
  },
  compactGroundName: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  compactGroundNameNative: {
    color: '#0F172A',
  },
  compactSlotRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
    marginTop: 4,
  },
  compactSlotTime: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
  },
  compactSlotTimeNative: {
    color: '#059669',
  },
  compactBookedAt: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },
  compactStatusInfoAx: {
    alignItems: 'flex-end',
    gap: 6,
  },
  compactAmount: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  compactAmountNative: {
    color: '#059669',
  },
  statusBadgeCompact: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  compactDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
    opacity: 0.8,
  },
  compactBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  compactBottomLeft: {
    flex: 1,
    gap: 10,
  },
  compactBottomRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  compactPaymentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  paymentLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  controlsRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
    gap: 4,
    zIndex: 1001,
  },
  searchBoxMobileWrapper: {
    flex: 1.5,
  },
  searchBarMobile: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    color: '#0F172A',
    fontSize: 13,
    fontFamily: 'Inter',
  },
  dropdownTrigger: {
    height: 38,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownTriggerActive: {
    borderColor: '#01b854',
    backgroundColor: '#F0FDF4',
  },
  dropdownTriggerSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#01b854',
  },
  dropdownTriggerText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  dropdownTriggerTextActive: {
    color: '#01b854',
  },
  dropdownTriggerTextSelected: {
    color: '#01b854',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 1000,
    minWidth: 140,
    overflow: 'hidden',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 999,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownOptionActive: {
    backgroundColor: '#F0FDF4',
  },
  dropdownOptionText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  dropdownOptionTextActive: {
    color: '#01b854',
    fontWeight: '800',
  },
  dropdownOptionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#01b854',
  },
  slotModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  slotModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: 500,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  slotBookingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  slotBookingName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  slotBookingId: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'Inter',
    fontWeight: '600',
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
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
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
  slotCustomerPhone: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'Inter',
    marginBottom: 10,
    fontWeight: '500',
  },
  feeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 2,
  },
  filterByDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterByDateText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  datePickerModalWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '95%',
    maxWidth: 800,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
    alignSelf: 'center',
    marginTop: '5%',
  },
  dpMain: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    minHeight: Platform.OS === 'web' ? 400 : 500,
  },
  dpSidebar: {
    width: Platform.OS === 'web' ? 200 : '100%',
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
  },
  dpInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  dpInputBox: {
    flex: 1,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  dpInputText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  dpArrow: {
    paddingTop: 18,
  },
  calendarPlaceholder: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
  },
  calMonth: {
    flex: 1,
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
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  calCellSelected: {
    backgroundColor: '#00ea6b',
  },
  calCellInRange: {
    backgroundColor: '#ECFDF5',
    borderRadius: 0,
  },
  calCellStart: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  calCellEnd: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
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
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
  },
});
