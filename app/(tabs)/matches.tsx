import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
  useWindowDimensions,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BookingWithDetails } from '@/types';
import MobileAppNavbar from '../../components/MobileAppNavbar';
import WebLayout from '@/components/web/WebLayout';
import MatchCard from '@/components/matches/MatchCard';
import { Trophy, Swords, MapPin, Search, CalendarClock } from 'lucide-react-native';
import Button from '@/components/ui/Button';

export default function MyMatchesScreen() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const IS_DARK = !isWeb || (width < 900);
  const isWideWeb = Platform.OS === 'web' && width >= 1100;
  const isExtraWideWeb = Platform.OS === 'web' && width >= 1350;
  const isMediumWeb = Platform.OS === 'web' && width >= 768 && width < 1100;

  useEffect(() => {
    if (user) {
      loadMyMatches();
    }
  }, [user]);

  const loadMyMatches = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const todayISO = new Date().toISOString().split('T')[0];
      
      // Step 1: Fetch all bookings for future dates where current user is involved
      const { data: myBookings, error: myError } = await supabase
        .from('bookings')
        .select(`
          ground_id,
          booking_date,
          start_time,
          notes
        `)
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .gte('booking_date', todayISO);

      if (myError) throw myError;
      if (!myBookings || myBookings.length === 0) {
        setMatches([]);
        return;
      }

      // Step 2: Extract the slot keys to fetch ALL bookings for those slots
      // (to check if they have a partner or are full)
      const slotKeys = myBookings.map(b => `(ground_id.eq.${b.ground_id},booking_date.eq.${b.booking_date},start_time.eq.${b.start_time})`);
      
      // Since it's hard to do "IN" with composite keys in PostgREST without an RPC, 
      // we'll fetch all future bookings for those grounds and filter in JS.
      const groundIds = [...new Set(myBookings.map(b => b.ground_id))];
      
      const { data: allSlotBookings, error: allError } = await supabase
        .from('bookings')
        .select(`
          *,
          ground:grounds(
            *,
            ground_images(*)
          )
        `)
        .in('ground_id', groundIds)
        .eq('status', 'confirmed')
        .gte('booking_date', todayISO);

      if (allError) throw allError;

      // Group by slot
      const grouped = (allSlotBookings || []).reduce((acc, booking: any) => {
        const key = `${booking.ground_id}_${booking.booking_date}_${booking.start_time}`;
        if (!acc[key]) {
          acc[key] = {
            bookings: [],
            totalTeams: 0,
            hasCurrentUser: false,
          };
        }
        acc[key].bookings.push(booking);
        if (booking.user_id === user.id) acc[key].hasCurrentUser = true;
        
        // Calculate team count
        const n = booking.notes || '';
        if (/Teams:\s*Both\s*Teams/i.test(n)) acc[key].totalTeams += 2;
        else if (/Teams:\s*1\s*Team/i.test(n)) acc[key].totalTeams += 1;
        else acc[key].totalTeams += 2; // default
        
        return acc;
      }, {} as Record<string, { bookings: any[], totalTeams: number, hasCurrentUser: boolean }>);

      // Filter: Slots that have the current user AND are "Full" (totalTeams >= 2)
      const pairedMatches = Object.values(grouped)
        .filter((group: any) => group.hasCurrentUser && group.totalTeams >= 2)
        .map((group: any) => group.bookings.find((b: any) => b.user_id === user.id)); 

      setMatches(pairedMatches);
    } catch (error) {
      console.error('Error loading my matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <View style={[styles.container, isWeb && !IS_DARK && styles.webContainerRoot]}>
      {isWeb && !IS_DARK ? (
        <>
          <View style={[styles.header, styles.webHeader]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>My Matches</Text>
              <Text style={styles.subtitle}>
                Upcoming games where you have a matched opponent.
              </Text>
            </View>
            <View style={styles.headerActions}>
              <View style={styles.badgePill}>
                <CalendarClock size={20} color="#00ea6b" />
                <Text style={styles.badgePillNumber}>{matches.length}</Text>
                <Text style={styles.badgePillLabel}>Active Matches</Text>
              </View>
              <Button 
                title="Find an Opponent" 
                onPress={() => router.push('/find-an-opponent')}
                variant="primary"
                size="small"
                style={styles.headerBtn}
              />
            </View>
          </View>

          <FlatList
            data={matches}
            renderItem={({ item }) => (
              <View style={styles.webItem}>
                <MatchCard
                  match={item}
                  onJoin={() => router.push(`/bookings/${item.id}`)}
                  buttonTitle="View Details"
                  teamsCount="2/2 Teams"
                />
              </View>
            )}
            keyExtractor={item => item.id}
            numColumns={isWideWeb || isExtraWideWeb ? 3 : isMediumWeb ? 2 : 1}
            columnWrapperStyle={
              isWideWeb || isExtraWideWeb || isMediumWeb ? styles.webColumnWrapper : undefined
            }
            style={styles.webFlatList}
            contentContainerStyle={styles.webList}
            showsVerticalScrollIndicator
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadMyMatches} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Swords size={48} color="#E5E7EB" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>You don't have any matched games yet</Text>
                <Text style={styles.emptySubtext}>Find someone to play with in the matchmaking section.</Text>
                <Button 
                  title="Find an Opponent" 
                  onPress={() => router.push('/find-an-opponent')}
                  style={{ marginTop: 20 }}
                />
              </View>
            }
          />
        </>
      ) : (
        <>
          <View style={styles.nativeHero}>
             <View style={styles.heroText}>
                <Text style={styles.heroTitle}>My Matches</Text>
                <Text style={styles.heroSubtitle}>Your confirmed 2-team games</Text>
             </View>
             <Pressable 
               style={styles.heroAction}
               onPress={() => router.push('/find-an-opponent')}
             >
                <Swords size={20} color="#043529" />
                <Text style={styles.heroActionText}>Find Match</Text>
             </Pressable>
          </View>

          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#00ea6b" />
            </View>
          ) : (
            <FlatList
              data={matches}
              renderItem={({ item }) => (
                <View style={styles.nativeItem}>
                <MatchCard
                  match={item}
                  onJoin={() => router.push(`/bookings/${item.id}`)}
                  buttonTitle="View Details"
                  teamsCount="2/2 Teams"
                />
                </View>
              )}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listNative}
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={loadMyMatches}
                  tintColor="#00ea6b"
                  colors={['#00ea6b']}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                   <Swords size={64} color="#06392e" style={{ marginBottom: 16 }} />
                   <Text style={styles.emptyTextNative}>No matches yet</Text>
                   <Text style={styles.emptySubtextNative}>Join a team or invite an opponent!</Text>
                   <Button 
                     title="Find an Opponent" 
                     onPress={() => router.push('/find-an-opponent')}
                     variant="outline"
                     style={{ marginTop: 24, borderColor: '#00ea6b' }}
                     textStyle={{ color: '#00ea6b' }}
                   />
                </View>
              }
            />
          )}
        </>
      )}
    </View>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return (
    <View style={styles.nativeScreen}>
      <MobileAppNavbar title="My Matches" titleColor="#00ea6b" />
      <View style={styles.nativeBody}>{content}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#043529',
  },
  webContainerRoot: {
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  nativeScreen: {
    flex: 1,
    backgroundColor: '#043529',
  },
  nativeBody: {
    flex: 1,
  },
  nativeHero: {
    padding: 20,
    backgroundColor: '#043529',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,234,107,0.1)',
  },
  heroText: {
    gap: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#00ea6b',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  heroAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ea6b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  heroActionText: {
    color: '#043529',
    fontWeight: '700',
    fontSize: 13,
  },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerBtn: {
    minWidth: 140,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgePillNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#166534',
  },
  badgePillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    textTransform: 'uppercase',
  },
  webList: {
    padding: 24,
    gap: 20,
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
  listNative: {
    padding: 16,
  },
  nativeItem: {
    marginBottom: 8,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyTextNative: {
    fontSize: 20,
    fontWeight: '800',
    color: '#00ea6b',
  },
  emptySubtextNative: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});
