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

export default function AdminBookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const isWeb = Platform.OS === 'web';
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'past'>('all');

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
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setBookings((data || []) as BookingWithDetails[]);
    } catch (error) {
      console.error('Error loading admin bookings:', error);
    } finally {
      setLoading(false);
    }
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

      // 2. Tab Filter (only if no specific date is selected OR within the selected date)
      // Usually users want to see only that date if selected.
      if (selectedDate) return filtered;

      if (activeTab === 'all') return filtered;
      return activeTab === 'upcoming'
        ? filtered.filter((b) => b.booking_date >= todayIso)
        : filtered.filter((b) => b.booking_date < todayIso);
    },
    [bookings, selectedDate, activeTab],
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
      <View style={[styles.header, isWeb && styles.webHeader]}>
        <Text style={styles.title}>All Platform Bookings</Text>
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

          {isWeb && (
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
          )}
        </ScrollView>
      </View>

      {isWeb && bookings.length > 0 && (
        <View style={styles.tableHeaderContainer}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.colGround]}>Ground</Text>
            <Text style={[styles.tableHeaderCell, styles.colDateTime]}>Date & time</Text>
            <Text style={[styles.tableHeaderCell, styles.colTeams]}>Teams</Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount]}>Amount & status</Text>
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
                <View style={[styles.tableCell, styles.colGround]}>
                  <Text style={styles.groundName}>{item.ground?.name || 'N/A'}</Text>
                  <Text style={styles.groundLocation}>
                    {item.ground?.city}, {item.ground?.state}
                  </Text>
                </View>

                <View style={[styles.tableCell, styles.colDateTime]}>
                  <Text style={styles.dateText}>{item.booking_date}</Text>
                  <Text style={styles.timeText}>
                    {`${normalizeDbTimeToHHMM(item.start_time)} – ${normalizeDbTimeToHHMM(item.end_time)}`}
                  </Text>
                </View>

                <View style={[styles.tableCell, styles.colTeams]}>
                  <Text style={styles.teamsText}>{teamsCell}</Text>
                </View>

                <View style={[styles.tableCell, styles.colAmount]}>
                  <Text style={styles.amount}>₹{item.total_amount}</Text>
                  <Text style={styles.statusTextInline}>{item.status}</Text>
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
      <MobileAppNavbar title="Platform Bookings" titleColor="#00ea6b" />
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
    fontSize: 24,
    fontWeight: '800',
    color: IS_WEB ? '#111827' : '#f9fafb',
    letterSpacing: -0.3,
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
    fontSize: 12,
    fontWeight: '700',
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
  colGround: {
    flex: 2,
  },
  colDateTime: {
    flex: 2,
  },
  colTeams: {
    width: 108,
  },
  colAmount: {
    flex: 1.3,
  },
  colWho: {
    flex: 1.8,
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
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
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
    fontSize: 12,
    fontWeight: '700',
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
    backgroundColor: IS_WEB ? '#01b854' : '#00ea6b',
    borderColor: IS_WEB ? '#01b854' : '#00ea6b',
  },
  tabChipText: {
    fontSize: IS_WEB ? 11.5 : 13,
    fontWeight: '700',
    color: IS_WEB ? '#6B7280' : '#f9fafb',
    letterSpacing: -0.2,
  },
  tabChipTextActive: {
    color: IS_WEB ? '#FFFFFF' : '#043529',
    fontWeight: '800',
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
});
