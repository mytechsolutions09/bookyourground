import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Platform, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl 
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

const IS_WEB = Platform.OS === 'web';

function NotificationsInner() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<any[]>([]);

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
          {isMatch ? <Trophy size={18} color="#00ea6b" /> : <Calendar size={18} color="#10b981" />}
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
    >
      <View style={styles.inner}>
        {IS_WEB && (
          <ProfileHeaderTabs
            themeAccent="#00ea6b"
            themeText={IS_WEB ? '#111827' : '#FFFFFF'}
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
  if (IS_WEB) {
    return (
      <WebLayout noCard>
        <NotificationsInner />
      </WebLayout>
    );
  }

  return (
    <View style={styles.nativeRoot}>
      <MobileAppNavbar title="Notifications" titleColor="#00ea6b" />
      <NotificationsInner />
    </View>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    backgroundColor: '#043529',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  inner: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: IS_WEB ? '#111827' : '#FFFFFF',
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 12,
    color: IS_WEB ? '#6B7280' : '#9ca3af',
  },
  bellBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: IS_WEB ? '#F0FDF4' : 'rgba(0,234,107,0.1)',
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
     backgroundColor: IS_WEB ? '#F9FAFB' : 'rgba(255,255,255,0.03)',
     borderWidth: 2,
     borderColor: IS_WEB ? '#F3F4F6' : 'rgba(255,255,255,0.05)',
     alignItems: 'center',
     justifyContent: 'center',
     marginBottom: 20,
  },
  emptyTitle: {
     fontSize: 20,
     fontWeight: '800',
     color: IS_WEB ? '#111827' : '#FFFFFF',
     marginBottom: 8,
  },
  emptyText: {
     fontSize: 14,
     color: IS_WEB ? '#6B7280' : '#9ca3af',
     textAlign: 'center',
     maxWidth: 240,
     lineHeight: 20,
  },
  exploreBtn: {
     marginTop: 24,
     paddingHorizontal: 20,
     paddingVertical: 12,
     borderRadius: 12,
     backgroundColor: '#00ea6b',
  },
  exploreBtnText: {
     color: '#043529',
     fontWeight: '700',
     fontSize: 14,
  },
  list: {
    gap: 12,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: IS_WEB ? '#FFFFFF' : '#06392e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: IS_WEB ? '#F3F4F6' : 'rgba(0,234,107,0.1)',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
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
    backgroundColor: IS_WEB ? '#F0FDF4' : 'rgba(0,234,107,0.15)',
  },
  bookingIcon: {
    backgroundColor: IS_WEB ? '#F0FDF4' : 'rgba(16,185,129,0.15)',
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
    fontSize: 11,
    fontWeight: '800',
    color: '#00ea6b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  timeAgo: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: IS_WEB ? '#111827' : '#FFFFFF',
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
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  alertText: {
    fontSize: 13,
    color: IS_WEB ? '#4B5563' : '#9CA3AF',
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
