import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  FlatList, 
  Image, 
  ActivityIndicator, 
  Platform,
  useWindowDimensions
} from 'react-native';
import { Search, MapPin, ChevronRight, User, Users, Shield, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import WebLayout from '@/components/web/WebLayout';

export default function CricketIndex() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isMobile = width < 768;

  const [activeTab, setActiveTab] = useState<'players' | 'teams' | 'profile'>('players');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Data States
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  // Route to Player Profile if selected
  useEffect(() => {
    if (activeTab === 'profile') {
      if (Platform.OS === 'web') {
        window.location.href = '/cricket/player-profile';
      } else {
        router.push('/cricket/player-profile');
      }
    }
  }, [activeTab]);

  // Fetch Players and Teams
  useEffect(() => {
    fetchPlayers();
    fetchTeams();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, city, role')
        .order('full_name', { ascending: true });

      if (error) throw error;
      // Filter out admins/owners if necessary, keeping standard users
      setPlayers(data || []);
    } catch (err) {
      console.error('Error fetching players:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, location, captain, image_url')
        .order('name', { ascending: true });

      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter Data
  const filteredPlayers = players.filter(p => 
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeams = teams.filter(t => 
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.captain?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render Player Item
  const renderPlayerItem = ({ item }: { item: any }) => {
    const initials = item.full_name ? item.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '?';
    
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => router.push(`/players/${item.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.cardMain}>
          <View style={styles.avatarContainer}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.full_name}</Text>
            {item.city ? (
              <View style={styles.locationRow}>
                <MapPin size={12} color="#64748B" />
                <Text style={styles.locationText} numberOfLines={1}>{item.city}</Text>
              </View>
            ) : (
              <Text style={styles.subtext}>Cricketer</Text>
            )}
          </View>
        </View>
        <View style={styles.viewBadge}>
          <Text style={styles.viewBadgeText}>Profile</Text>
          <ChevronRight size={14} color="#01b854" />
        </View>
      </TouchableOpacity>
    );
  };

  // Render Team Item
  const renderTeamItem = ({ item }: { item: any }) => {
    const initials = item.name ? item.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'T';

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => router.push(`/teams/${item.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.cardMain}>
          <View style={[styles.avatarContainer, { borderRadius: 12, backgroundColor: '#ECFDF5' }]}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.avatarFallbackText, { color: '#065F46' }]}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
            <View style={styles.teamMeta}>
              {item.location && (
                <View style={styles.locationRow}>
                  <MapPin size={12} color="#64748B" />
                  <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
                </View>
              )}
              {item.captain && (
                <Text style={styles.captainText} numberOfLines={1}>Capt: {item.captain}</Text>
              )}
            </View>
          </View>
        </View>
        <View style={[styles.viewBadge, { backgroundColor: '#EEF2F6' }]}>
          <Text style={[styles.viewBadgeText, { color: '#475569' }]}>Squad</Text>
          <ChevronRight size={14} color="#475569" />
        </View>
      </TouchableOpacity>
    );
  };

  const mainContent = (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        <LinearGradient
          colors={['#06392e', '#01b854']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.headerContent, !isMobile && styles.webHeaderPadding]}>
          <Text style={styles.headerTitle}>Cricket Hub</Text>
          <Text style={styles.headerSubtitle}>Discover players and teams in your region</Text>
        </View>
      </View>

      <View style={[styles.mainLayout, !isMobile && styles.webLayoutPadding]}>
        {/* Navigation Tabs */}
        <View style={styles.tabsWrapper}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'players' && styles.tabButtonActive]}
              onPress={() => setActiveTab('players')}
            >
              <User size={16} color={activeTab === 'players' ? '#01b854' : '#64748B'} style={{ marginRight: 8 }} />
              <Text style={[styles.tabButtonText, activeTab === 'players' && styles.tabButtonTextActive]}>
                Find Player
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'teams' && styles.tabButtonActive]}
              onPress={() => setActiveTab('teams')}
            >
              <Users size={16} color={activeTab === 'teams' ? '#01b854' : '#64748B'} style={{ marginRight: 8 }} />
              <Text style={[styles.tabButtonText, activeTab === 'teams' && styles.tabButtonTextActive]}>
                Find Team
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'profile' && styles.tabButtonActive]}
              onPress={() => {
                setActiveTab('profile');
                if (Platform.OS === 'web') {
                  window.location.href = '/cricket/player-profile';
                } else {
                  router.push('/cricket/player-profile');
                }
              }}
            >
              <Shield size={16} color={activeTab === 'profile' ? '#01b854' : '#64748B'} style={{ marginRight: 8 }} />
              <Text style={[styles.tabButtonText, activeTab === 'profile' && styles.tabButtonTextActive]}>
                Player Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'players' ? "Search players by name or city..." : "Search teams by name, city or captain..."}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* List Content */}
        {loading ? (
          <ActivityIndicator size="large" color="#01b854" style={{ marginTop: 40 }} />
        ) : activeTab === 'players' ? (
          <FlatList
            data={filteredPlayers}
            renderItem={renderPlayerItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            numColumns={isMobile ? 1 : 2}
            key={isMobile ? 'v-list' : 'h-list'}
            columnWrapperStyle={!isMobile ? { gap: 16 } : null}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <User size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No players found matching your query</Text>
              </View>
            }
          />
        ) : activeTab === 'teams' ? (
          <FlatList
            data={filteredTeams}
            renderItem={renderTeamItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            numColumns={isMobile ? 1 : 2}
            key={isMobile ? 'v-teams' : 'h-teams'}
            columnWrapperStyle={!isMobile ? { gap: 16 } : null}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Users size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No teams found matching your query</Text>
              </View>
            }
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <ActivityIndicator size="large" color="#01b854" />
          </View>
        )}
      </View>
    </View>
  );

  return (
    <>
      {isWeb ? (
        <WebLayout isPublicNoSidebar={true}>{mainContent}</WebLayout>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          {mainContent}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBanner: {
    height: 180,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  webHeaderPadding: {
    paddingHorizontal: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E2E8F0',
    marginTop: 6,
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  mainLayout: {
    padding: 16,
    marginTop: -30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  webLayoutPadding: {
    paddingHorizontal: 40,
  },
  tabsWrapper: {
    marginBottom: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: '#ECFDF5',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  tabButtonTextActive: {
    color: '#01b854',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1E293B',
    fontFamily: 'Inter',
    outlineStyle: 'none',
  } as any,
  list: {
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    marginBottom: 12,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  cardContent: {
    marginLeft: 14,
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'Inter',
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '500',
    maxWidth: 160,
  },
  subtext: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  teamMeta: {
    gap: 2,
  },
  captainText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#01b854',
    fontFamily: 'Inter',
  },
  viewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  viewBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#01b854',
    fontFamily: 'Inter',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
});
