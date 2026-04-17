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
import { Calendar, X, Swords, Save, CheckCircle2, Circle } from 'lucide-react-native';

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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'date' | 'ground' | 'amount' | 'status' | 'booked_at' | 'paid' | 'teams' | 'name'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const IS_DARK = !isWeb || (width < 900);
  const isWideWeb = Platform.OS === 'web' && width >= 1100;
  const isExtraWideWeb = Platform.OS === 'web' && width >= 1350;
  const isMediumWeb = Platform.OS === 'web' && width >= 768 && width < 1100;

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<BookingWithDetails | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user, profile]);

  const loadBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);
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
        `);

      // If regular user, RLS will now allow seeing opponents, 
      // but we still want to primarily fetch our own involvements.
      if (profile?.role === 'user') {
        // We fetch everything we have access to (own + matched opponents)
        // RLS handles the security.
      } else if (profile?.role === 'ground_owner') {
        // Owners see all bookings for their grounds (handled by RLS)
      }

      const { data, error } = await query
        .in('status', ['confirmed', 'cancelled'])
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setBookings(data || []);

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
    }
  };

  const handleCancelBooking = async (booking: BookingWithDetails) => {
    // 7-day restriction
    const bDate = new Date(booking.booking_date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const bDay = new Date(bDate.getFullYear(), bDate.getMonth(), bDate.getDate());
    const diffDays = Math.ceil((bDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
      const msg = 'Bookings can only be cancelled at least 7 days before the slot time. For urgent queries, please contact support.';
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
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingToCancel.id);

      if (error) throw error;
      
      setBookings(prev => prev.map(b => 
        b.id === bookingToCancel.id ? { ...b, status: 'cancelled' as any } : b
      ));
      setCancelSuccess(true);
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

  /** Only confirmed / paid bookings are fetched. */
  const listBookings = bookings;

  const filteredBookings = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    const today = `${yyyy}-${mm}-${dd}`;
    let result = bookings;

    // Detect matches for users
    const slotGroups = result.reduce((acc, b) => {
      const key = `${b.ground_id}_${b.booking_date}_${b.start_time}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(b);
      return acc;
    }, {} as Record<string, BookingWithDetails[]>);

    // If regular user, show only one row per slot but with match info
    if (profile?.role === 'user') {
      result = result.filter(b => b.user_id === user?.id);
      // Enrich with opponent info
      result = result.map(b => {
        const key = `${b.ground_id}_${b.booking_date}_${b.start_time}`;
        const group = slotGroups[key] || [];
        const opponent = group.find(ob => ob.id !== b.id);
        if (opponent) {
          return {
            ...b,
            opponent: (opponent as any).profile
          };
        }
        return b;
      });
    }

    // Status Filter
    if (activeTab === 'upcoming') {
      result = result.filter(b => bookingDateOnly(b.booking_date) >= today && b.status === 'confirmed');
    } else if (activeTab === 'past') {
      result = result.filter(b => bookingDateOnly(b.booking_date) < today && b.status === 'confirmed');
    } else if (activeTab === 'cancelled') {
      result = result.filter(b => b.status === 'cancelled');
    }

    // Scope Filter (for owners)
    if (profile?.role === 'ground_owner' && ownerScope !== 'all') {
      result = result.filter(b => 
        ownerScope === 'own' ? b.ground.owner_id === user?.id : b.ground.owner_id !== user?.id
      );
    }

    // Date Filter
    if (selectedDate) {
      result = result.filter(b => bookingDateOnly(b.booking_date) === selectedDate);
    }

    // Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => 
        (b.ground?.name || '').toLowerCase().includes(q) ||
        (b.ground?.city || '').toLowerCase().includes(q) ||
        (b.booked_for_name || '').toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
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

    return result;
  }, [bookings, activeTab, ownerScope, selectedDate, searchQuery, user?.id, profile?.role, sortAsc, sortKey]);

  const showAdminColumns = profile?.role === 'ground_owner';
  const visibleBookings = filteredBookings;

  const content = (
    <View style={[styles.container, isWeb && !IS_DARK && styles.webContainerRoot]}>
      {isWeb && !IS_DARK ? (
        <View style={styles.webCard}>
          <View style={[styles.header, styles.webHeader]}>
            <View>
              <View style={styles.tabRow}>
                <TouchableOpacity
                  onPress={() => setActiveTab('all' as any)}
                  style={[styles.tabChip, activeTab === 'all' && styles.tabChipActive]}
                >
                  <Text style={[styles.tabChipText, activeTab === 'all' && styles.tabChipTextActive]}>
                    {`All (${bookings.length})`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab('upcoming')}
                  style={[styles.tabChip, activeTab === 'upcoming' && styles.tabChipActive]}
                >
                  <Text style={[styles.tabChipText, activeTab === 'upcoming' && styles.tabChipTextActive]}>
                    Upcoming
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab('past')}
                  style={[styles.tabChip, activeTab === 'past' && styles.tabChipActive]}
                >
                  <Text style={[styles.tabChipText, activeTab === 'past' && styles.tabChipTextActive]}>
                    Past
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab('cancelled')}
                  style={[styles.tabChip, activeTab === 'cancelled' && styles.tabChipActive]}
                >
                  <Text style={[styles.tabChipText, activeTab === 'cancelled' && styles.tabChipTextActive]}>
                    Cancelled
                  </Text>
                </TouchableOpacity>

                {profile?.role === 'ground_owner' && (
                  <>
                    <View style={styles.verticalDivider} />
                    <TouchableOpacity
                      onPress={() => setOwnerScope('all')}
                      style={[styles.tabChip, ownerScope === 'all' && styles.tabChipActive]}
                    >
                      <Text style={[styles.tabChipText, ownerScope === 'all' && styles.tabChipTextActive]}>
                        All grounds
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setOwnerScope('own')}
                      style={[styles.tabChip, ownerScope === 'own' && styles.tabChipActive]}
                    >
                      <Text style={[styles.tabChipText, ownerScope === 'own' && styles.tabChipTextActive]}>
                        Own grounds
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setOwnerScope('other')}
                      style={[styles.tabChip, ownerScope === 'other' && styles.tabChipActive]}
                    >
                      <Text style={[styles.tabChipText, ownerScope === 'other' && styles.tabChipTextActive]}>
                        Other grounds
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            <View style={styles.webHeaderRight}>
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
                  <Calendar size={14} color={selectedDate ? '#01b854' : '#6B7280'} />
                  <Text style={[styles.tabChipText, selectedDate && styles.tabChipTextActive]}>
                    {selectedDate ? selectedDate : 'Filter by Date'}
                  </Text>
                  
                  {Platform.OS === 'web' && (
                    // @ts-ignore
                    <input
                      type="date"
                      value={selectedDate ?? ''}
                      onChange={(e: any) => setSelectedDate(e.target.value || null)}
                      style={styles.webDatePicker}
                    />
                  )}
                </View>
                {selectedDate && (
                  <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.dateClearBtn}>
                    <X size={12} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {visibleBookings.length > 0 && (
            <View style={styles.tableHeaderContainer}>
              <View style={styles.tableHeaderRow}>
                <TouchableOpacity 
                  onPress={() => {
                    if (sortKey === 'booked_at') setSortAsc(!sortAsc);
                    else { setSortKey('booked_at'); setSortAsc(true); }
                  }}
                  style={[styles.tableHeaderCell, styles.colBookedAt, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                >
                  <Text style={styles.tableHeaderCell}>Booked at</Text>
                  {sortKey === 'booked_at' && (
                    <Text style={{ fontSize: 10, color: '#10b981' }}>{sortAsc ? '▲' : '▼'}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    if (sortKey === 'ground') setSortAsc(!sortAsc);
                    else { setSortKey('ground'); setSortAsc(true); }
                  }}
                  style={[styles.tableHeaderCell, styles.colGround, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                >
                  <Text style={styles.tableHeaderCell}>Ground</Text>
                  {sortKey === 'ground' && (
                    <Text style={{ fontSize: 10, color: '#10b981' }}>{sortAsc ? '▲' : '▼'}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    if (sortKey === 'date') setSortAsc(!sortAsc);
                    else { setSortKey('date'); setSortAsc(true); }
                  }}
                  style={[styles.tableHeaderCell, styles.colDateTime, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                >
                  <Text style={styles.tableHeaderCell}>Slot Date & time</Text>
                  {sortKey === 'date' && (
                    <Text style={{ fontSize: 10, color: '#10b981' }}>{sortAsc ? '▲' : '▼'}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    if (sortKey === 'teams') setSortAsc(!sortAsc);
                    else { setSortKey('teams'); setSortAsc(true); }
                  }}
                  style={[styles.tableHeaderCell, styles.colTeams, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                >
                  <Text style={styles.tableHeaderCell}>Teams</Text>
                  {sortKey === 'teams' && (
                    <Text style={{ fontSize: 10, color: '#10b981' }}>{sortAsc ? '▲' : '▼'}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    if (sortKey === 'status') setSortAsc(!sortAsc);
                    else { setSortKey('status'); setSortAsc(true); }
                  }}
                  style={[styles.tableHeaderCell, styles.colStatus, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                >
                  <Text style={styles.tableHeaderCell}>Status</Text>
                  {sortKey === 'status' && (
                    <Text style={{ fontSize: 10, color: '#10b981' }}>{sortAsc ? '▲' : '▼'}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    if (sortKey === 'amount') setSortAsc(!sortAsc);
                    else { setSortKey('amount'); setSortAsc(true); }
                  }}
                  style={[styles.tableHeaderCell, styles.colAmount, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                >
                  <Text style={styles.tableHeaderCell}>Amount</Text>
                  {sortKey === 'amount' && (
                    <Text style={{ fontSize: 10, color: '#10b981' }}>{sortAsc ? '▲' : '▼'}</Text>
                  )}
                </TouchableOpacity>
                {showAdminColumns && (
                  <TouchableOpacity 
                    onPress={() => {
                      if (sortKey === 'name') setSortAsc(!sortAsc);
                      else { setSortKey('name'); setSortAsc(true); }
                    }}
                    style={[styles.tableHeaderCell, styles.colName, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                  >
                    <Text style={styles.tableHeaderCell}>Name</Text>
                    {sortKey === 'name' && (
                      <Text style={{ fontSize: 10, color: '#10b981' }}>{sortAsc ? '▲' : '▼'}</Text>
                    )}
                  </TouchableOpacity>
                )}
                {showAdminColumns && (
                  <TouchableOpacity 
                    onPress={() => {
                      if (sortKey === 'paid') setSortAsc(!sortAsc);
                      else { setSortKey('paid'); setSortAsc(true); }
                    }}
                    style={[styles.tableHeaderCell, styles.colPaymentReceived, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                  >
                    <Text style={styles.tableHeaderCell}>Paid</Text>
                    {sortKey === 'paid' && (
                      <Text style={{ fontSize: 10, color: '#10b981' }}>{sortAsc ? '▲' : '▼'}</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <FlatList
            data={visibleBookings}
            renderItem={({ item }) => {
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

                  <View style={[styles.tableCell, styles.colDateTime]}>
                    <Text style={styles.dateText}>{formatDateDDMMYY(item.booking_date)}</Text>
                    <Text style={styles.timeText}>
                      {`${normalizeDbTimeToHHMM(item.start_time)} – ${normalizeDbTimeToHHMM(item.end_time)}`}
                    </Text>
                  </View>

                  <View style={[styles.tableCell, styles.colTeams]}>
                    <Text style={styles.teamsText}>
                      {((item as any).opponent ? 'MATCHED' : (cricketTeamsLabelFromBooking(item.ground.pitch_type, item.notes) || '1 Team')).toUpperCase()}
                    </Text>
                    {(item as any).opponent && (
                      <Text style={styles.opponentMiniText} numberOfLines={1}>
                        vs {(item as any).opponent.team_name || (item as any).opponent.full_name}
                      </Text>
                    )}
                  </View>

                  <View style={[styles.tableCell, styles.colStatus]}>
                    <TouchableOpacity 
                      onPress={(e) => {
                        e.stopPropagation();
                        if (item.status === 'confirmed') handleCancelBooking(item);
                      }}
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
                    <Text style={styles.amount}>{formatCurrency(item.total_amount)}</Text>
                  </View>

                  {showAdminColumns && (
                    <View style={[styles.tableCell, styles.colName]}>
                      <NameInputCell booking={item} onSave={saveBookingName} />
                    </View>
                  )}

                  {showAdminColumns && (
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
                  )}
                </TouchableOpacity>
              );
            }}
            keyExtractor={item => item.id}
            style={styles.webFlatList}
            contentContainerStyle={styles.webList}
            showsVerticalScrollIndicator
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadBookings} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No bookings found</Text>
              </View>
            }
          />
        </View>

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
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={loadBookings}
                tintColor="#00ea6b"
                colors={['#00ea6b']}
              />
            }
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

  const isCompact = width < 900;

  if (Platform.OS === 'web' && !isCompact) {
    return (
      <WebLayout>
        {content}
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
    );
  }

  return (
    <View style={styles.nativeScreen}>
      <MobileAppNavbar title="My bookings" titleColor="#043529" lightBg />
      <View style={styles.nativeBody}>
        {content}
        
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
    backgroundColor: '#F9FAFB',
  },
  webContainerRoot: {
    backgroundColor: '#F5F5F5',
  },
  nativeScreen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  nativeBody: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  },
  nativeActionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
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
    backgroundColor: '#00ea6b',
    borderColor: '#00ea6b',
  },
  nativeTabChipPressed: {
    opacity: 0.85,
  },
  nativeTabChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  nativeTabChipTextActive: {
    color: '#043529',
  },
  header: {
    backgroundColor: '#043529',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 0,
  },
  webHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: 22,
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
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  webContainer: {
    paddingHorizontal: 20,
    paddingTop: 0,
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  list: {
    padding: 16,
  },
  listNative: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  webList: {
    padding: 24,
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
  webFlatList: {
    ...Platform.select({
      web: {
        flex: 1,
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
  },
  emptyTextNative: {
    fontSize: 15,
    color: '#9ca3af',
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
  },
  badgePillLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: '#9CA3AF',
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
  },
  metaInline: {
    fontSize: 12,
    color: '#6B7280',
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
  },
  opponentMiniText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#01b854',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textAlign: 'center',
    width: 'fit-content' as any,
  },
  paymentCash: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  paymentOnline: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
  },
  groundName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  groundLocation: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  bookedDateText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  bookedTimeText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  dateText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  teamsText: {
    fontSize: 10,
    fontWeight: '700',
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
  },
  statusConfirmed: {
    backgroundColor: '#DEF7EC',
    color: '#03543F',
  },
  statusCancelled: {
    backgroundColor: '#FDE8E8',
    color: '#9B1C1C',
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textAlign: 'center',
    width: 'fit-content' as any,
  },
  paymentCash: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  paymentOnline: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
  },
});



