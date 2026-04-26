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
        <ScrollView 
          style={styles.webScrollRoot} 
          contentContainerStyle={styles.webScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.webTwoCol}>
          {/* LEFT: bookings list */}
          <View style={styles.webLeft}>
            <View style={styles.webPageHeader}>
              <Text style={styles.webPageTitle}>My Bookings</Text>
              <Text style={styles.webPageSub}>Manage your upcoming games and view history</Text>
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

              <View style={styles.webFilterSection}>
                <View style={styles.webDateInputWrap}>
                  <Calendar size={14} color="#64748B" />
                  <input
                    type="date"
                    value={selectedDate || ''}
                    onChange={(e) => setSelectedDate(e.target.value || null)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      fontSize: '13px',
                      color: '#0F172A',
                      fontFamily: 'Inter',
                      background: 'transparent',
                      cursor: 'pointer'
                    }}
                  />
                  {selectedDate && (
                    <TouchableOpacity onPress={() => setSelectedDate(null)} style={{ marginLeft: 4 }}>
                      <X size={14} color="#64748B" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
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
            />
          </View>

          {/* RIGHT: summary panels */}
          <View style={styles.webRight}>
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

              {/* Balance & Stats */}
              <View style={styles.panelCard}>
                <Text style={styles.panelTitle}>Activity & Stats</Text>
                <View style={styles.statsRow}>
                  <View style={styles.donutWrap}>
                    <View style={styles.donut} />
                    <View style={styles.donutCenter}>
                      <Text style={styles.donutPct}>
                        {Math.min(100, Math.round((bookings.filter(b => isDateInPast(b.booking_date) && b.status === 'confirmed').length / 20) * 100))}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statsText}>
                    <Text style={styles.statsSmall}>Match Activity</Text>
                    <Text style={styles.statsBold}>Level: Regular</Text>
                    <Text style={[styles.statsBold, { color: '#00ea6b', marginTop: 4 }]}>
                      {bookings.filter(b => isDateInPast(b.booking_date) && b.status === 'confirmed').length * 2} hrs
                    </Text>
                    <Text style={styles.statsSmall}>played total</Text>
                  </View>
                </View>

                <View style={styles.statsDivider} />

                <View style={styles.statsGrid}>
                  <View style={styles.statsGridItem}>
                    <Text style={styles.gridValue}>{new Set(bookings.map(b => b.ground_id)).size}</Text>
                    <Text style={styles.gridLabel}>Grounds</Text>
                  </View>
                  <View style={styles.statsGridItem}>
                    <Text style={styles.gridValue}>{bookings.filter(b => b.status === 'cancelled').length}</Text>
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
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={loadBookings}
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
      <MobileAppNavbar title="My Bookings" titleColor="#111827" lightBg />
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
  groundName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  groundLocation: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  bookedDateText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  bookedTimeText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
    fontFamily: 'Inter',
  },
  dateText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  teamsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
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
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
});



