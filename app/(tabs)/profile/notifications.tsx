import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Platform, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  useWindowDimensions 
} from 'react-native';
import { router } from 'expo-router';
import { 
  Bell, 
  Calendar, 
  Clock, 
  MapPin, 
  ChevronRight, 
  AlertCircle,
  Trophy,
} from 'lucide-react-native';
import ProfileHeaderTabs from '@/components/profile/ProfileHeaderTabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useUI } from '@/contexts/UIContext';

const IS_WEB = Platform.OS === 'web';

function NotificationsInner() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<any[]>([]);

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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ground_owner': return 'Ground Owner';
      case 'super_admin': return 'Super Admin';
      default: return 'Player';
    }
  };

  const loadReminders = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      // 1. Fetch from notifications table
      const { data: notifs, error: notifErr } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // 2. Fetch upcoming confirmed bookings (reminders)
      const now = new Date();
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const nowIso = now.toISOString().split('T')[0];
      const tomorrowIso = twentyFourHoursFromNow.toISOString().split('T')[0];

      const { data: bookings, error: bookErr } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          notes,
          ground:grounds(id, name, city)
        `)
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .gte('booking_date', nowIso)
        .lte('booking_date', tomorrowIso);

      // Map bookings to look like notifications
      const mappedBookings = (bookings || []).map(b => ({
        id: `booking-${b.id}`,
        title: 'Upcoming Booking',
        body: `${b.ground?.name || 'Ground Booking'} at ${b.start_time.slice(0, 5)}`,
        created_at: `${b.booking_date}T${b.start_time}`,
        read: true, // Bookings are always "read" or don't have status
        booking_id: b.id,
      }));

      // Filter out specific invalid notification requested by user
      const filteredNotifs = (notifs || []).filter(n => n.id !== '50f06198-7dee-4318-b115-615442b05e9a');
      const combined = [...filteredNotifs, ...mappedBookings];
      
      // Sort by date descending
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setReminders(combined);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, [user]);

  useEffect(() => {
    setTabBarVisible(false);
    return () => setTabBarVisible(true);
  }, []);

  const renderReminder = (item: any) => {
    const isUnread = !item.read;
    
    return (
      <TouchableOpacity 
        key={item.id} 
        style={[styles.reminderCard, isUnread && styles.unreadCard]}
        onPress={() => {
          if (item.booking_id && item.booking_id !== 'undefined') {
            router.push(`/bookings/${item.booking_id}` as any);
          } else {
            console.warn('No valid booking_id for notification:', item.id);
          }
        }}
      >
        <View style={styles.iconWrap}>
          <Bell size={18} color="#01e669" />
        </View>
        
        <View style={styles.reminderContent}>
          <View style={styles.reminderHeader}>
            <Text style={[styles.reminderTitle, isUnread && { fontWeight: '700' }]}>
              {item.title || 'Notification'}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          
          <Text style={styles.alertText}>{item.body}</Text>
          
          <Text style={styles.timeAgo}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        
        <ChevronRight size={18} color="#D1D5DB" />
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadReminders} />}
      stickyHeaderIndices={[0]}
    >
      <View style={{ backgroundColor: '#FFFFFF' }}>
        <View style={styles.inner}>
          {IS_WEB ? (
            <ProfileHeaderTabs
              themeAccent="#00ea6b"
              themeText={IS_WEB ? '#111827' : '#0F172A'}
              isCompact={!IS_WEB}
            />
          ) : (
            <View style={[styles.headerRow, { justifyContent: 'center', paddingTop: 0, paddingBottom: 0 }]}>
              <Text style={[styles.pageTitle, { textAlign: 'center', top: 35, color: '#01b854' }]}>Notifications</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.inner}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#00ea6b" />
          </View>
        ) : reminders.length === 0 ? (
          <View style={styles.emptyWrap}>
             <View style={styles.emptyIconCircle}>
                <Bell size={32} color="#01e669" />
             </View>
             <Text style={styles.emptyTitle}>All caught up!</Text>
             <Text style={styles.emptyText}>No matches or bookings starting in the next 24 hours.</Text>
             <TouchableOpacity 
                style={styles.exploreBtn}
                onPress={() => router.push('/(tabs)/grounds')}
             >
                <Text style={styles.exploreBtnText}>Book a new game</Text>
             </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {reminders.map(renderReminder)}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

export default function NotificationsScreen() {
  const { width } = useWindowDimensions();
  const { profile } = useAuth();
  const isCompact = width < 900;
  const isOwner = profile?.role === 'ground_owner';

  return (IS_WEB && !isCompact) ? (
    <WebLayout noCard>
      <NotificationsInner />
    </WebLayout>
  ) : (
    <View style={styles.nativeRoot}>
      {!isOwner && <MobileAppNavbar title="Notifications" titleColor="#0F172A" lightBg />}
      <NotificationsInner />
    </View>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  inner: {
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  pageTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  pageSubtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
  },
  bellBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  redDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  loader: {
    paddingVertical: 50,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconCircle: {
     width: 80,
     height: 80,
     borderRadius: 40,
     backgroundColor: '#FFFFFF',
     borderWidth: 2,
     borderColor: '#F1F5F9',
     alignItems: 'center',
     justifyContent: 'center',
     marginBottom: 20,
     shadowColor: '#000',
     shadowOpacity: 0.04,
     shadowRadius: 10,
     shadowOffset: { width: 0, height: 4 },
  },
  emptyTitle: {
     fontFamily: 'Inter',
     fontSize: 18,
     fontWeight: '600',
     color: '#0F172A',
     marginBottom: 8,
  },
  emptyText: {
     fontFamily: 'Inter',
     fontSize: 14,
     color: '#64748B',
     textAlign: 'center',
     maxWidth: 240,
     lineHeight: 20,
  },
  exploreBtn: {
     marginTop: 24,
     paddingHorizontal: 24,
     paddingVertical: 14,
     borderRadius: 16,
     backgroundColor: '#00ea6b',
     shadowColor: '#00ea6b',
     shadowOpacity: 0.2,
     shadowRadius: 10,
     shadowOffset: { width: 0, height: 4 },
  },
  exploreBtnText: {
     fontFamily: 'Inter',
     color: '#FFFFFF',
     fontWeight: '600',
     fontSize: 14,
     textTransform: 'uppercase',
     letterSpacing: 0.5,
  },
  list: {
    gap: 12,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  unreadCard: {
    backgroundColor: 'rgba(0, 234, 107, 0.05)',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ea6b',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  matchIcon: {
    backgroundColor: 'transparent',
  },
  bookingIcon: {
    backgroundColor: 'transparent',
  },
  reminderContent: {
    flex: 1,
    gap: 4,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderType: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#00ea6b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  timeAgo: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  reminderTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  alertText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 4,
  },
  desktopHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
});
