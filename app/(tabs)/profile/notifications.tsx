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
      
      const now = new Date();
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const nowIso = now.toISOString().split('T')[0];
      const tomorrowIso = twentyFourHoursFromNow.toISOString().split('T')[0];

      // Fetch upcoming confirmed bookings
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          notes,
          ground:grounds(
            id,
            name,
            city,
            state
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .gte('booking_date', nowIso)
        .lte('booking_date', tomorrowIso)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Filter to precisely 24h from *now* (including time check)
      const filtered = (data || []).filter(b => {
        const bookingDateTime = new Date(`${b.booking_date}T${b.start_time}`);
        const diffMs = bookingDateTime.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours >= 0 && diffHours <= 24;
      });

      setReminders(filtered);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, [user]);

  const renderReminder = (b: any) => {
    const isMatch = b.notes?.toLowerCase().includes('match') || b.notes?.toLowerCase().includes('opponent');
    
    return (
      <TouchableOpacity 
        key={b.id} 
        style={styles.reminderCard}
        onPress={() => router.push(`/bookings/${b.id}` as any)}
      >
        <View style={[styles.iconWrap, isMatch ? styles.matchIcon : styles.bookingIcon]}>
          {isMatch ? <Trophy size={18} color="#00ea6b" /> : <Calendar size={18} color="#00ea6b" />}
        </View>
        
        <View style={styles.reminderContent}>
          <View style={styles.reminderHeader}>
            <Text style={styles.reminderType}>{isMatch ? 'Upcoming Match' : 'Upcoming Booking'}</Text>
            <Text style={styles.timeAgo}>Starting soon</Text>
          </View>
          
          <Text style={styles.reminderTitle}>{b.ground?.name || 'Ground Booking'}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock size={12} color="#9CA3AF" />
              <Text style={styles.metaText}>{b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}</Text>
            </View>
            <View style={styles.metaItem}>
              <MapPin size={12} color="#9CA3AF" />
              <Text style={styles.metaText}>{b.ground?.city}</Text>
            </View>
          </View>
          
          <Text style={styles.alertText}>
            Join your game within 24 hours! Make sure you are ready.
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
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.inner}>
        {IS_WEB && (
          <ProfileHeaderTabs
            themeAccent="#00ea6b"
            themeText={IS_WEB ? '#111827' : '#0F172A'}
            isCompact={!IS_WEB}
          />
        )}

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#00ea6b" />
          </View>
        ) : reminders.length === 0 ? (
          <View style={styles.emptyWrap}>
             <View style={styles.emptyIconCircle}>
                <Bell size={32} color="#E5E7EB" />
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
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  inner: {
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    paddingHorizontal: 16,
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
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
