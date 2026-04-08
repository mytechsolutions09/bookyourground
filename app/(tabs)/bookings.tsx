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
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BookingWithDetails } from '@/types';
import BookingCard from '@/components/bookings/BookingCard';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '../../components/MobileAppNavbar';
import Button from '@/components/ui/Button';
import { Alert } from 'react-native';
import Modal from '@/components/ui/Modal';
import { slugifyGroundSegment } from '@/utils/groundSlug';

export default function BookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
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
          )
        `)
        .eq('user_id', user.id)
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

  const upcomingBookings = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    const today = `${yyyy}-${mm}-${dd}`;
    return listBookings.filter((b) => {
      const bd = bookingDateOnly(b.booking_date as string);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(bd)) return false;
      return bd >= today;
    });
  }, [listBookings]);

  const pastBookings = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    const today = `${yyyy}-${mm}-${dd}`;
    return listBookings.filter((b) => {
      const bd = bookingDateOnly(b.booking_date as string);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(bd)) return false;
      return bd < today;
    });
  }, [listBookings]);

  const visibleBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  const content = (
    <View style={[styles.container, isWeb && !IS_DARK && styles.webContainerRoot]}>
      {isWeb && !IS_DARK ? (
        <View style={styles.webCard}>
          <View style={[styles.header, styles.webHeader]}>
            <View>
              <Text style={styles.title}>My Bookings</Text>
              <Text style={styles.subtitle}>
                Track upcoming games, past sessions, and booking details in one place.
              </Text>
              <View style={styles.tabRow}>
                <View
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
                    onPress={() => setActiveTab('upcoming')}
                  >
                    {`Upcoming (${upcomingBookings.length})`}
                  </Text>
                </View>
                <View
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
                    onPress={() => setActiveTab('past')}
                  >
                    {`Past (${pastBookings.length})`}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.badgePill}>
              <Text style={styles.badgePillNumber}>{listBookings.length}</Text>
              <Text style={styles.badgePillLabel}>total bookings</Text>
            </View>
          </View>

          <FlatList
            data={visibleBookings}
            renderItem={({ item }) => (
              <View style={styles.webItem}>
                <BookingCard
                  booking={item}
                  onPress={() => router.push(`/bookings/${item.id}`)}
                  onCancel={activeTab === 'upcoming' && isCancellable(item) ? () => handleCancelBooking(item) : undefined}
                  onReview={activeTab === 'past' && (item.status === 'confirmed' || item.status === 'completed') && !reviewedBookingIds.includes(item.id) ? () => {
                    router.push(`/bookings/${item.id}`);
                  } : undefined}
                />
              </View>

            )}
            keyExtractor={item => item.id}
            key={
              isExtraWideWeb
                ? 'bookings-4-cols'
                : isWideWeb
                ? 'bookings-3-cols'
                : isMediumWeb
                ? 'bookings-2-cols'
                : 'bookings-1-col'
            }
            numColumns={isExtraWideWeb ? 4 : isWideWeb ? 3 : isMediumWeb ? 2 : 1}
            columnWrapperStyle={
              isExtraWideWeb || isWideWeb || isMediumWeb ? styles.webColumnWrapper : undefined
            }
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
            <View style={styles.nativeTabRow}>
              <Pressable
                onPress={() => setActiveTab('upcoming')}
                style={({ pressed }) => [
                  styles.nativeTabChip,
                  activeTab === 'upcoming' && styles.nativeTabChipActive,
                  pressed && styles.nativeTabChipPressed,
                ]}
              >
                <Text
                  style={[
                    styles.nativeTabChipText,
                    activeTab === 'upcoming' && styles.nativeTabChipTextActive,
                  ]}
                >
                  {`Upcoming (${upcomingBookings.length})`}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab('past')}
                style={({ pressed }) => [
                  styles.nativeTabChip,
                  activeTab === 'past' && styles.nativeTabChipActive,
                  pressed && styles.nativeTabChipPressed,
                ]}
              >
                <Text
                  style={[
                    styles.nativeTabChipText,
                    activeTab === 'past' && styles.nativeTabChipTextActive,
                  ]}
                >
                  {`Past (${pastBookings.length})`}
                </Text>
              </Pressable>
            </View>
          </View>

          <FlatList
            data={visibleBookings}
            renderItem={({ item }) => (
              <View style={styles.nativeItemContainer}>
                <BookingCard
                  booking={item}
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

  if (Platform.OS === 'web') {
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
      <MobileAppNavbar title="My bookings" titleColor="#00ea6b" />
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
    backgroundColor: '#043529',
  },
  webContainerRoot: {
    backgroundColor: '#F5F5F5',
  },
  nativeScreen: {
    flex: 1,
    backgroundColor: '#043529',
  },
  nativeBody: {
    flex: 1,
    backgroundColor: '#043529',
  },
  nativeFilterBar: {
    backgroundColor: '#043529',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
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
    borderColor: '#00ea6b',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeTabChipActive: {
    backgroundColor: '#00ea6b',
  },
  nativeTabChipPressed: {
    opacity: 0.85,
  },
  nativeTabChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00ea6b',
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
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 32,
    width: '100%',
  },
  webColumnWrapper: {
    gap: 16,
  },
  webItem: {
    flex: 1,
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
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  tabChipTextActive: {
    color: '#00ea6b',
    fontWeight: '700',
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
});



