import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, Platform, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Calendar, Filter, X } from 'lucide-react-native';
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
import { formatDateDDMMYY, isDateInPast } from '@/utils/helpers';

export default function AdminBookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const isWeb = Platform.OS === 'web';
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'past'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          ground:grounds(
            *,
            ground_images(*)
          ),
          user:profiles(full_name, phone)
        `)
        .neq('status', 'pending')
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setBookings((data || []) as BookingWithDetails[]);
    } catch (error) {
      console.error('Error loading admin bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (booking: BookingWithDetails) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to cancel this booking from the platform?');
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
          alert('Booking cancelled successfully.');
        } catch (err: any) {
          alert(err.message || 'Failed to cancel');
        }
      }
      return;
    }

    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking from the platform?',
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
              Alert.alert('Success', 'Booking cancelled successfully.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel');
            }
          }
        }
      ]
    );
  };



  const filteredBookings = useMemo(
    () => {
      const d = new Date();
      const todayIso = d.toISOString().split('T')[0];

      let filtered = bookings;

      // 1. Date Filter
      if (selectedDate) {
        filtered = filtered.filter((b) => b.booking_date === selectedDate);
      }

      // 2. Tab Filter (only if no specific date is selected)
      if (!selectedDate && activeTab !== 'all') {
        filtered = activeTab === 'upcoming'
          ? filtered.filter((b) => b.booking_date >= todayIso)
          : activeTab === 'past'
            ? filtered.filter((b) => b.booking_date < todayIso)
            : filtered.filter((b) => b.status === 'cancelled');
      }

      // 3. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((b) => {
          const gn = (b.ground?.name || '').toLowerCase();
          const city = (b.ground?.city || '').toLowerCase();
          const customer = (b.user?.full_name || '').toLowerCase();
          const bid = (b.id || '').toLowerCase();
          return gn.includes(q) || city.includes(q) || customer.includes(q) || bid.includes(q);
        });
      }

      return filtered;
    },
    [bookings, selectedDate, activeTab, searchQuery],
  );

  const todayIsoForCounts = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const upcomingCount = useMemo(
    () => bookings.filter((b) => b.booking_date >= todayIsoForCounts).length,
    [bookings, todayIsoForCounts],
  );

  const pastCount = useMemo(
    () => bookings.filter((b) => b.booking_date < todayIsoForCounts).length,
    [bookings, todayIsoForCounts],
  );

  const content = (
    <View style={styles.container}>
      {Platform.OS === 'web' && (
        <View style={[styles.header, styles.webHeader]}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>All Platform Bookings</Text>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchBar}
                placeholder="Search ground, city, customer or ID..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.tabRow}
            style={styles.tabScrollWrap}
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
                {`All (${bookings.length})`}
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


            <View style={styles.dateFilterWrap}>
              <View 
                style={[
                  styles.tabChip, 
                  selectedDate && styles.tabChipActive,
                  { paddingRight: selectedDate ? 32 : 12, position: 'relative' }
                ]}
              >
                <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Calendar 
                    size={14} 
                    color={selectedDate ? '#FFFFFF' : '#6B7280'} 
                  />
                  <Text 
                    style={[
                      styles.tabChipText, 
                      selectedDate && styles.tabChipTextActive
                    ]}
                  >
                    {selectedDate ? selectedDate : 'Filter by Date'}
                  </Text>
                </View>
                
                {/* Native input overlay for web picker triggering */}
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
                      zIndex: 10,
                      borderWidth: 0,
                      display: 'block',
                    }}
                />
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
          </ScrollView>
        </View>
      )}

      {isWeb && bookings.length > 0 && (
        <View style={styles.tableHeaderContainer}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.colBookedAt]}>Booked at</Text>
            <Text style={[styles.tableHeaderCell, styles.colGround]}>Ground</Text>
            <Text style={[styles.tableHeaderCell, styles.colDateTime]}>Slot Date & time</Text>
            <Text style={[styles.tableHeaderCell, styles.colTeams]}>Teams</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount]}>Amount</Text>
            <Text style={[styles.tableHeaderCell, styles.colPayment]}>Payment</Text>
            <Text style={[styles.tableHeaderCell, styles.colWho]}>Customer</Text>


          </View>
        </View>
      )}

      <FlatList
        data={filteredBookings}
        renderItem={({ item }) => {
          if (isWeb) {
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
                    const label = cricketTeamsLabelFromBooking(b.ground?.pitch_type, b.notes);
                    if (label === '1 team') return sum + 1;
                    if (label === 'Both teams') return sum + 2;
                    return sum + 2;
                  }, 0);

                  const isTrulyFull = slotOccupancy >= 2;

                  return (
                    <View style={[styles.tableCell, styles.colTeams]}>
                      {!isTrulyFull ? (
                        <TouchableOpacity 
                          onPress={(e) => {
                            e.stopPropagation();
                            router.push(`/grounds/${item.ground.id}?date=${item.booking_date}&time=${item.start_time}&teams=one`);
                          }}
                          style={styles.partialBadge}
                        >
                          <Text style={styles.partialBadgeText}>PARTIAL (NEED 1 MORE)</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.fullMatchBadge}>
                          <Text style={styles.fullMatchBadgeText}>FULL (MATCH READY)</Text>
                        </View>
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
                  <Text style={styles.amount}>₹{item.total_amount}</Text>
                </View>


                <View style={[styles.tableCell, styles.colPayment]}>
                   <Text style={[styles.paymentBadgeText, item.payment_method === 'cash' ? styles.paymentCash : styles.paymentOnline]}>
                      {item.payment_method === 'cash' ? 'CASH' : 'ONLINE'}
                   </Text>
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

          return (
            <BookingCard
              booking={item}
              onPress={() => router.push(`/bookings/${item.id}`)}
              showGroundDetails={true}
            />
          );
        }}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
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
    backgroundColor: IS_WEB ? '#F5F5F5' : '#043529',
  },
  header: {
    backgroundColor: IS_WEB ? '#FFFFFF' : '#043529',
    padding: 16,
    paddingTop: IS_WEB ? 16 : 0,
    borderBottomWidth: 1,
    borderBottomColor: IS_WEB ? '#E0E0E0' : 'rgba(0,234,107,0.15)',
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
    flex: 1,
    maxWidth: 400,
  },
  searchBar: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  list: {
    padding: 16,
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
    marginHorizontal: 16,
    marginTop: 12,
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
  tableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
    width: 100,
  },
  colAmount: {
    width: 100,
  },
  colPayment: {
    width: 90,
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
    paddingHorizontal: IS_WEB ? 11 : 16,
    paddingVertical: IS_WEB ? 6 : 10,
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
    fontSize: IS_WEB ? 11.5 : 13,
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
});

