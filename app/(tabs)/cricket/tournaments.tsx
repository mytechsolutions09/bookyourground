import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Platform, 
  ScrollView, 
  FlatList,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Crown, MapPin, Calendar, Users, Trophy, ChevronRight, Plus, Search, Filter } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface Tournament {
  id: string;
  name: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  banner_url: string;
  entry_fee: number;
  prize_pool: string;
  max_teams: number;
}

export default function CricketTournaments() {
  const router = useRouter();
  const [subTab, setSubTab] = useState('all');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase.from('tournaments').select('*');
      
      if (subTab === 'participate' && user) {
        // Get tournaments user has registered for
        const { data: regData } = await supabase
          .from('tournament_teams')
          .select('tournament_id')
          .in('team_id', (
            await supabase.from('teams').select('id').eq('owner_id', user.id)
          ).data?.map(t => t.id) || []);
        
        const tourneyIds = regData?.map(r => r.tournament_id) || [];
        if (tourneyIds.length > 0) {
          query = query.in('id', tourneyIds);
        } else {
          setTournaments([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query.order('start_date', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [subTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTournaments();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return '#01b854';
      case 'upcoming': return '#3B82F6';
      case 'completed': return '#64748B';
      default: return '#64748B';
    }
  };

  const TournamentCard = ({ item }: { item: Tournament }) => {
    const startDate = new Date(item.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const endDate = new Date(item.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
      <TouchableOpacity 
        style={styles.tournamentCard}
        onPress={() => router.push(`/cricket-tournament/${item.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: item.banner_url || 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg' }} 
            style={styles.tournamentImage} 
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.imageOverlay}
          />
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusBadgeText}>{item.status}</Text>
          </View>
          <View style={styles.tournamentTitleContainer}>
            <Text style={styles.tournamentTitle}>{item.name}</Text>
            <View style={styles.locationContainer}>
              <MapPin size={12} color="#FFFFFF" />
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tournamentInfo}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Calendar size={14} color="#64748B" />
              <Text style={styles.infoText}>{startDate} - {endDate}</Text>
            </View>
            <View style={styles.infoItem}>
              <Trophy size={14} color="#F59E0B" />
              <Text style={styles.infoText}>Prize: {item.prize_pool || 'TBD'}</Text>
            </View>
          </View>
          
          <View style={styles.cardFooter}>
            <View style={styles.teamsCount}>
              <Users size={14} color="#64748B" />
              <Text style={styles.infoText}>Max {item.max_teams} Teams</Text>
            </View>
            <TouchableOpacity 
              style={styles.viewBtn}
              onPress={() => router.push(`/cricket-tournament/${item.id}`)}
            >
              <Text style={styles.viewBtnText}>Details</Text>
              <ChevronRight size={16} color="#01b854" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.subTabContainer}>
        {['All', 'Participate', 'Network', 'Nearby'].map((label) => (
          <TouchableOpacity 
            key={label} 
            style={[styles.subTab, subTab === label.toLowerCase() && styles.subTabActive]} 
            onPress={() => setSubTab(label.toLowerCase())}
          >
            <Text style={[styles.subTabText, subTab === label.toLowerCase() && styles.subTabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" />
          <Text style={styles.searchPlaceholder}>Search tournaments...</Text>
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Filter size={18} color="#64748B" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#01b854" />
        </View>
      ) : (
        <FlatList
          data={tournaments}
          renderItem={TournamentCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#01b854']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Trophy size={48} color="#E2E8F0" />
              <Text style={styles.emptyText}>No tournaments found</Text>
              <TouchableOpacity style={styles.hostBtn} onPress={() => router.push('/cricket-tournament/create')}>
                <Text style={styles.hostBtnText}>Host a Tournament</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            <View style={styles.adBanner}>
              <Image source={{ uri: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg' }} style={styles.adImage} />
              <View style={styles.adOverlay}>
                <Text style={styles.adTitle}>Promote your{'\n'}<Text style={styles.adTitleBold}>Tournament</Text></Text>
                <TouchableOpacity style={styles.adBtn}><Text style={styles.adBtnText}>Learn More</Text></TouchableOpacity>
              </View>
            </View>
          }
        />
      )}
      
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/cricket-tournament/create')}
      >
        <Plus size={24} color="#FFFFFF" strokeWidth={3} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  subTabActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#01b854',
  },
  searchBarContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  searchPlaceholder: {
    color: '#94A3B8',
    fontSize: 14,
  },
  filterBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  listContent: {
    paddingBottom: 100,
  },
  tournamentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
      web: {
        shadowColor: 'rgba(0,0,0,0.05)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 20,
      }
    })
  },
  imageContainer: {
    height: 160,
    position: 'relative',
  },
  tournamentImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  tournamentTitleContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  tournamentTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tournamentInfo: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  teamsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#01b854',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 12,
    marginBottom: 20,
  },
  hostBtn: {
    backgroundColor: '#01b854',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  hostBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#01b854',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  adBanner: {
    height: 120,
    borderRadius: 20,
    backgroundColor: '#000',
    overflow: 'hidden',
    position: 'relative',
    margin: 16,
  },
  adImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  adOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  adTitleBold: {
    fontWeight: '900',
    color: '#01b854',
  },
  adBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
  },
  adBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
});

