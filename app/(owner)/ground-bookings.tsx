import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, Platform, TouchableOpacity, ScrollView, TextInput, useWindowDimensions, Image } from 'react-native';
import { Calendar, Filter, X, Save, CheckCircle2, Circle, User, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BookingWithDetails } from '@/types';
import BookingCard from '@/components/bookings/BookingCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import { router } from 'expo-router';
import { cricketTeamsLabelFromBooking } from '@/utils/cricketGround';
import { normalizeDbTimeToHHMM } from '@/utils/bookingSlots';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { formatCurrency, formatDate, formatDateDDMMYY, getStatusColor, isDateInPast } from '@/utils/helpers';

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
          style={[styles.nameInput, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
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
  const isLight = true; // Uniform light theme across platforms
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all');
  const [ownerScope, setOwnerScope] = useState<'all' | 'own' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'date' | 'ground' | 'amount' | 'status' | 'booked_at' | 'paid' | 'teams' | 'name'>(Platform.OS === 'web' ? 'booked_at' : 'date');
  const [sortAsc, setSortAsc] = useState(false);
  const [showDatePickerMobile, setShowDatePickerMobile] = useState(false);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);
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
        .neq('status', 'pending');

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
        .neq('status', 'pending');

      const [{ data: ownedData, error: ownedError }, { data: selfData, error: selfError }] =
        await Promise.all([ownedPromise, selfPromise]);

      if (ownedError) throw ownedError;
      if (selfError) throw selfError;

      const map = new Map<string, BookingWithDetails>();
      (ownedData as BookingWithDetails[] | null)?.forEach((b) => map.set(b.id, b));
      (selfData as BookingWithDetails[] | null)?.forEach((b) => map.set(b.id, b));

      const merged = Array.from(map.values()).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setBookings(merged);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (booking: BookingWithDetails) => {
    const bDate = new Date(booking.booking_date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const bDay = new Date(bDate.getFullYear(), bDate.getMonth(), bDate.getDate());
    const diffDays = Math.ceil((bDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isOwnGround = booking.ground.owner_id === user?.id;

    if (diffDays < 7 && !isOwnGround) {
      const msg = 'Bookings can only be cancelled at least 7 days before the slot time. For urgent queries, please contact support.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Cancellation Policy', msg);
      return;
    }

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to cancel this booking?');
      if (confirmed) {
        try {
          const { error } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', booking.id);
          if (error) throw error;
          setBookings(prev => 
            prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b)
          );
          alert('Booking cancelled.');
        } catch (err: any) {
          alert(err.message || 'Failed to cancel');
        }
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
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', booking.id);

              if (error) throw error;
              
              // Update local state
              setBookings(prev => 
                prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b)
              );
              Alert.alert('Success', 'Booking cancelled.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel');
            }
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
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_received: newValue })
        .eq('id', booking.id);
      if (error) throw error;
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, payment_received: newValue } : b));
    } catch (err: any) {
      if (Platform.OS === 'web') alert(err.message || 'Failed to update payment status');
      else Alert.alert('Error', err.message || 'Failed to update payment status');
    }
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

      const byDate = !selectedDate
        ? byScope
        : byScope.filter((b) => b.booking_date === selectedDate);

      const byStatus = activeTab === 'all' 
        ? byDate 
        : activeTab === 'upcoming'
          ? byDate.filter((b) => b.booking_date >= todayIso && b.status === 'confirmed')
          : activeTab === 'past'
            ? byDate.filter((b) => b.booking_date < todayIso && b.status === 'confirmed')
            : byDate.filter((b) => b.status === 'cancelled');

      const q = searchQuery.toLowerCase();
      const base = !searchQuery.trim() ? byStatus : byStatus.filter((b) => {
        const gn = (b.ground?.name || '').toLowerCase();
        const city = (b.ground?.city || '').toLowerCase();
        const customer = (b.user?.full_name || '').toLowerCase();
        const bfn = (b.booked_for_name || '').toLowerCase();
        return gn.includes(q) || city.includes(q) || customer.includes(q) || bfn.includes(q);
      });

      // Sort
      const sorted = [...base].sort((a, b) => {
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
          const teamsA = cricketTeamsLabelFromBooking(a.ground.pitch_type, a.notes);
          const teamsB = cricketTeamsLabelFromBooking(b.ground.pitch_type, b.notes);
          comparison = teamsA > teamsB ? 1 : -1;
        } else if (sortKey === 'name') {
          const nameA = (a.booked_for_name || '').toLowerCase();
          const nameB = (b.booked_for_name || '').toLowerCase();
          comparison = nameA > nameB ? 1 : -1;
        }

        return sortAsc ? comparison : -comparison;
      });

      return sorted;
    },
    [bookings, activeTab, ownerScope, selectedDate, searchQuery, user?.id, sortAsc, sortKey],
  );

  const todayIsoForCounts = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const upcomingCount = useMemo(
    () =>
      bookings.filter(
        (b) => {
          const scopeMatch = ownerScope === 'all' 
            ? true 
            : ownerScope === 'own'
              ? b.ground.owner_id === user?.id
              : b.ground.owner_id !== user?.id;
          return scopeMatch && b.booking_date >= todayIsoForCounts;
        }
      ).length,
    [bookings, todayIsoForCounts, ownerScope, user?.id],
  );

  const pastCount = useMemo(
    () =>
      bookings.filter(
        (b) => {
          const scopeMatch = ownerScope === 'all' 
            ? true 
            : ownerScope === 'own'
              ? b.ground.owner_id === user?.id
              : b.ground.owner_id !== user?.id;
          return scopeMatch && b.booking_date < todayIsoForCounts;
        }
      ).length,
    [bookings, todayIsoForCounts, ownerScope, user?.id],
  );

  const timeAllCount = useMemo(
    () =>
      bookings.filter(
        (b) =>
          ownerScope === 'all' || (ownerScope === 'own'
            ? b.ground.owner_id === user?.id
            : b.ground.owner_id !== user?.id)
      ).length,
    [bookings, ownerScope, user?.id],
  );

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

  const content = (
    <View style={[styles.container, isSmallScreen && styles.containerMobile]}>
        {isSmallScreen && (
          <View style={styles.controlsRow}>
            <View style={styles.searchBoxMobileWrapper}>
              <TextInput
                style={styles.searchBarMobile}
                placeholder="Search..."
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
                { key: 'cancelled', label: 'Cancelled' },
              ]} 
              onSelect={setActiveTab} 
            />
            <FilterDropdown 
              id="scope" 
              label="Scope" 
              value={ownerScope} 
              options={[
                { key: 'all', label: 'All Grounds' },
                { key: 'own', label: 'Own Grounds' },
                { key: 'other', label: 'Others' },
              ]} 
              onSelect={setOwnerScope} 
            />
            <FilterDropdown 
              id="date" 
              label="Date" 
              value={selectedDate || 'all'} 
              options={[
                { key: 'all', label: 'Any Date' },
                ...availableDates.map(d => ({ key: d, label: formatDateDDMMYY(d) }))
              ]} 
              onSelect={(val: string) => setSelectedDate(val === 'all' ? null : val)} 
            />
          </View>
        )}

      {isWeb && !isSmallScreen && bookings.length > 0 && (
        <View style={styles.filterContainer}>
          <View style={styles.filterRow}>
            <View style={styles.tabsAndFilterLeft}>
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
                  {`All (${timeAllCount})`}
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
                  {`Upcoming (${upcomingCount})`}
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
                  {`Past (${pastCount})`}
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
                  {`Cancelled (${bookings.filter(b => b.status === 'cancelled').length})`}
                </Text>
              </TouchableOpacity>

              <View style={styles.verticalDivider} />

              <TouchableOpacity
                onPress={() => setOwnerScope('all')}
                style={[
                  styles.tabChip,
                  ownerScope === 'all' && styles.tabChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    ownerScope === 'all' && styles.tabChipTextActive,
                  ]}
                >
                  All grounds
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setOwnerScope('own')}
                style={[
                  styles.tabChip,
                  ownerScope === 'own' && styles.tabChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    ownerScope === 'own' && styles.tabChipTextActive,
                  ]}
                >
                  Own grounds
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setOwnerScope('other')}
                style={[
                  styles.tabChip,
                  ownerScope === 'other' && styles.tabChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    ownerScope === 'other' && styles.tabChipTextActive,
                  ]}
                >
                  Other grounds
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchFilterWrap}>
              <TextInput
                style={styles.searchBarWeb}
                placeholder="Search ground, city or name..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={styles.dateFilterWrap}>
              <View 
                style={[
                  styles.tabChip, 
                  selectedDate && styles.tabChipActive,
                  { paddingRight: selectedDate ? 32 : 12 }
                ]}
              >
                <Calendar 
                  size={14} 
                  color={selectedDate ? '#FFFFFF' : '#64748B'} 
                />
                {selectedDate && (
                  <Text 
                    style={[
                      styles.tabChipText, 
                      styles.tabChipTextActive,
                      { marginLeft: 6 }
                    ]}
                  >
                    {formatDateDDMMYY(selectedDate)}
                  </Text>
                )}
                
                {/* Native input overlay for web picker triggering */}
                {isWeb && (
                  // @ts-ignore web only element
                  <input
                    type="date"
                    value={selectedDate ?? ''}
                    onChange={(e: any) =>
                      setSelectedDate(e.target.value ? e.target.value : null)
                    }
                    style={{
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
                      border: 'none',
                    }}
                  />
                )}
              </View>
              
              {selectedDate && (
                <TouchableOpacity 
                  onPress={() => setSelectedDate(null)}
                  style={styles.dateClearBtn}
                >
                  <X size={12} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
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
              style={[styles.colTeams, { flexDirection: 'row', gap: 4, paddingLeft: 12 }]}
            >
              <Text style={styles.tableHeaderText}>Teams</Text>
              {sortKey === 'teams' && (
                <Text style={{ fontSize: 10, color: '#10b981' }}>{sortAsc ? '▲' : '▼'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => {
                if (sortKey === 'status') setSortAsc(!sortAsc);
                else { setSortKey('status'); setSortAsc(true); }
              }}
              style={[styles.colStatus, { flexDirection: 'row', gap: 4, paddingLeft: 12 }]}
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
              style={[styles.colAmount, { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 32 }]}
            >
              <Text style={styles.tableHeaderText}>Amount</Text>
              {sortKey === 'amount' && (
                <Text style={{ fontSize: 10, color: '#10b981' }}>{sortAsc ? '▲' : '▼'}</Text>
              )}
            </TouchableOpacity>

            <View style={[styles.colPayment, { paddingLeft: 20 }]}>
              <Text style={styles.tableHeaderText}>Payment</Text>
            </View>

            <TouchableOpacity 
              onPress={() => {
                if (sortKey === 'name') setSortAsc(!sortAsc);
                else { setSortKey('name'); setSortAsc(true); }
              }}
              style={[styles.colName, { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 56 }]}
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
              style={[styles.colPaymentReceived, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
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
                  <Text style={styles.bookingIdTable}>
                    ID: {item.id.substring(0, 8).toUpperCase()}
                  </Text>
                </View>

                <View style={[styles.tableCell, styles.colGround]}>
                  <Text style={styles.groundName}>{item.ground.name}</Text>
                  <Text style={styles.groundLocation}>
                    {item.ground.city}, {item.ground.state}
                  </Text>
                </View>

                <View style={[styles.tableCell, styles.colDateTime]}>
                  <Text style={styles.dateText}>{formatDateDDMMYY(item.booking_date)}</Text>
                  <Text style={styles.timeText}>
                    {`${normalizeDbTimeToHHMM(item.start_time)} – ${normalizeDbTimeToHHMM(item.end_time)}`}
                  </Text>
                </View>

                {(() => {
                  const currentSlotKey = `${item.ground_id}_${item.booking_date}_${item.start_time}`;
                  const slotOccupancy = bookings.filter(b => 
                    b.status === 'confirmed' && 
                    `${b.ground_id}_${b.booking_date}_${b.start_time}` === currentSlotKey
                  ).reduce((sum, b) => {
                    const label = cricketTeamsLabelFromBooking(b.ground.pitch_type, b.notes);
                    if (label === '1 team') return sum + 1;
                    if (label === 'Both teams') return sum + 2;
                    return sum + 2;
                  }, 0);

                  const isTrulyFull = slotOccupancy >= 2;

                  return (
                    <View style={[styles.tableCell, styles.colTeams]}>
                      {isOwnGround ? (
                        <>
                          {!isTrulyFull ? (
                            <TouchableOpacity 
                              onPress={(e) => {
                                e.stopPropagation();
                                router.push(`/grounds/${item.ground.id}?date=${item.booking_date}&time=${item.start_time}&teams=one`);
                              }}
                              style={styles.partialBadge}
                            >
                              <Text style={styles.partialBadgeText}>PARTIAL</Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.fullMatchBadge}>
                              <Text style={styles.fullMatchBadgeText}>FULL</Text>
                            </View>
                          )}
                        </>
                      ) : (
                        <Text style={styles.teamsText}>
                          {(cricketTeamsLabelFromBooking(item.ground.pitch_type, item.notes) || '1 Team').toUpperCase()}
                        </Text>
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

                <View style={[styles.tableCell, styles.colAmount]}>
                  {isOwnGround ? (
                    <AmountInputCell booking={item} onSave={saveBookingAmount} />
                  ) : (
                    <Text style={styles.amount}>{formatCurrency(item.total_amount)}</Text>
                  )}
                </View>

                <View style={[styles.tableCell, styles.colPayment]}>
                   <View style={[
                     styles.paymentBadge,
                     item.payment_method === 'cash' ? styles.paymentCash : styles.paymentOnline
                   ]}>
                     <Text style={[
                       styles.paymentBadgeText,
                       item.payment_method === 'cash' ? styles.paymentCash : styles.paymentOnline
                     ]}>
                       {(item.payment_method || 'online').toUpperCase()}
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
                    {item.payment_received ? (
                      <CheckCircle2 size={20} color="#00ea6b" />
                    ) : (
                      <Circle size={20} color="#9CA3AF" />
                    )}
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
                  <View style={styles.compactSlotRow}>
                    <Text style={[styles.compactSlotTime, !isLight && styles.compactSlotTimeNative]}>
                      {`${normalizeDbTimeToHHMM(item.start_time)} – ${normalizeDbTimeToHHMM(item.end_time)}`}
                    </Text>
                  </View>
                  <Text style={styles.compactDateTextSub}>
                    {formatDateDDMMYY(item.booking_date)}
                  </Text>
                </View>

                <View style={styles.compactStatusInfoAx}>
                  <View style={{ width: 100 }}>
                    {isOwnGround ? (
                      <AmountInputCell booking={item} onSave={saveBookingAmount} />
                    ) : (
                      <Text style={[styles.compactAmount, !isLight && styles.compactAmountNative]}>
                        {formatCurrency(item.total_amount)}
                      </Text>
                    )}
                  </View>
                  <View style={[
                    styles.statusBadgeCompact,
                    item.status === 'confirmed' ? styles.statusConfirmed : styles.statusCancelled
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      item.status === 'confirmed' ? styles.statusConfirmed : styles.statusCancelled
                    ]}>
                      {item.status === 'confirmed' ? (isDateInPast(item.booking_date) ? 'DONE' : 'ACTIVE') : 'CANCEL'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.compactDivider} />

              <View style={styles.compactBottomRow}>
                <View style={styles.compactBottomLeft}>
                  <NameInputCell booking={item} onSave={saveBookingName} />
                  
                  {(() => {
                    const currentSlotKey = `${item.ground_id}_${item.booking_date}_${item.start_time}`;
                    const slotOccupancy = bookings.filter(b => 
                      b.status === 'confirmed' && 
                      `${b.ground_id}_${b.booking_date}_${b.start_time}` === currentSlotKey
                    ).reduce((sum, b) => {
                      const label = cricketTeamsLabelFromBooking(b.ground.pitch_type, b.notes);
                      if (label === '1 team') return sum + 1;
                      if (label === 'Both teams') return sum + 2;
                      return sum + 2;
                    }, 0);

                    const isTrulyFull = slotOccupancy >= 2;

                    return isOwnGround && (
                      <View style={isTrulyFull ? styles.fullMatchBadge : styles.partialBadge}>
                        <Text style={isTrulyFull ? styles.fullMatchBadgeText : styles.partialBadgeText}>
                          {isTrulyFull ? 'FULL MATCH' : 'NEED 1 MORE'}
                        </Text>
                      </View>
                    );
                  })()}
                </View>

                <View style={styles.compactBottomRight}>
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      togglePaymentReceived(item);
                    }}
                    style={styles.compactPaymentToggle}
                  >
                    <Text style={[styles.paymentLabel, { color: isLight ? '#64748B' : '#dcc093' }]}>PAID</Text>
                    {item.payment_received ? (
                      <CheckCircle2 size={24} color="#00ea6b" />
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
          <RefreshControl refreshing={loading} onRefresh={loadBookings} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No bookings yet</Text>
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
      <MobileAppNavbar title="Ground Bookings" titleColor="#059669" />
      {content}
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
    marginHorizontal: 16,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableHeaderText: {
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
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  tableCell: {
    // paddingRight: 16,
  },
  colBookedAt: {
    width: 110,
    marginRight: 16,
  },
  colGround: {
    flex: 1.5,
    marginRight: 16,
  },
  colDateTime: {
    width: 140,
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
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '500',
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
  whoPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  filterContainer: {
    marginTop: 8,
    marginHorizontal: 16,
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
    width: 150,
    marginRight: 16,
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
    paddingHorizontal: IS_WEB ? 10 : 16,
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
    minHeight: 38,
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
    marginRight: 6,
  },
  nameInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    paddingVertical: 8,
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
    padding: 16,
    marginBottom: 16,
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
    width: 60,
    height: 60,
    borderRadius: 12,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  compactGroundNameNative: {
    color: '#0F172A',
  },
  compactSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  compactSlotTime: {
    fontFamily: 'Inter',
    fontSize: 15,
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
    fontSize: 16,
    fontWeight: '600',
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
    gap: 6,
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
    paddingHorizontal: 10,
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
    fontSize: 11,
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
});
