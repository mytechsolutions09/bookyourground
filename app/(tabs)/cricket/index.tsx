import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Search, User, Users, Shield, RefreshCw, Sliders, MapPin, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import WebLayout from '@/components/web/WebLayout';
import SiteFooter from '@/components/web/SiteFooter';

export default function CricketHubScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isMobile = width < 768;

  const [activeTab, setActiveTab] = useState<'player' | 'team' | 'profile'>('player');
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
        .select('id, full_name, email, avatar_url, role')
        .order('full_name', { ascending: true });

      if (error) throw error;
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
    const initials = item.full_name
      ? item.full_name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      : '?';

    return (
      <TouchableOpacity
        style={styles.playerCard}
        onPress={() => router.push(`/players/${item.id}`)}
        activeOpacity={0.8}
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
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.full_name}
            </Text>
            {item.city ? (
              <View style={styles.locationRow}>
                <MapPin size={12} color="#00ea6b" style={{ marginRight: 4 }} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.city}
                </Text>
              </View>
            ) : (
              <Text style={styles.subtext}>Cricketer</Text>
            )}
          </View>
        </View>
        <View style={styles.viewBadge}>
          <Text style={styles.viewBadgeText}>Profile</Text>
          <ChevronRight size={14} color="#00ea6b" />
        </View>
      </TouchableOpacity>
    );
  };

  // Render Team Item
  const renderTeamItem = ({ item }: { item: any }) => {
    const initials = item.name
      ? item.name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      : 'T';

    return (
      <TouchableOpacity
        style={styles.playerCard}
        onPress={() => router.push(`/teams/${item.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.cardMain}>
          <View style={styles.avatarContainer}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.teamMeta}>
              {item.location && (
                <View style={styles.locationRow}>
                  <MapPin size={12} color="#00ea6b" style={{ marginRight: 4 }} />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
              )}
              {item.captain && (
                <Text style={styles.captainText} numberOfLines={1}>
                  Capt: {item.captain}
                </Text>
              )}
            </View>
          </View>
        </View>
        <View style={[styles.viewBadge, { borderColor: 'rgba(0, 234, 107, 0.2)' }]}>
          <Text style={styles.viewBadgeText}>Squad</Text>
          <ChevronRight size={14} color="#00ea6b" />
        </View>
      </TouchableOpacity>
    );
  };

  const hasResults = activeTab === 'player' ? filteredPlayers.length > 0 : filteredTeams.length > 0;

  const content = (
    <View style={styles.page}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* ── HERO BANNER ───────────────────────────────────────────── */}
        {!isWeb && (
          <View style={[styles.heroBanner, isMobile && styles.heroBannerMobile]}>
            <View style={styles.heroLeft}>
              <View style={styles.titleRow}>
                <Text style={styles.heroTitle}>Cricket </Text>
                <Text style={styles.heroTitleAccent}>Hub</Text>
              </View>
              <Text style={styles.heroSubtitle}>
                Discover players and teams in your region
              </Text>

              {/* Feature Badges */}
              <View style={[styles.featuresRow, isMobile && styles.featuresRowMobile]}>
                <View style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <Users size={18} color="#00ea6b" />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>Find Players</Text>
                    <Text style={styles.featureDesc}>Connect with players</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <Shield size={18} color="#00ea6b" />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>Find Teams</Text>
                    <Text style={styles.featureDesc}>Join or create teams</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <User size={18} color="#00ea6b" />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>Player Profile</Text>
                    <Text style={styles.featureDesc}>View player details</Text>
                  </View>
                </View>
              </View>
            </View>

            {!isMobile && (
              <View style={styles.heroRight}>
                <View style={styles.graphicWrapper}>
                  <Image
                    source={require('@/assets/hero_cricket.png')}
                    style={styles.heroGraphic}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['#06392e', 'rgba(6, 57, 46, 0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.leftOverlay}
                  />
                  <LinearGradient
                    colors={['rgba(6, 57, 46, 0)', '#06392e']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.rightOverlay}
                  />
                  <LinearGradient
                    colors={['#06392e', 'rgba(6, 57, 46, 0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.topOverlay}
                  />
                  <LinearGradient
                    colors={['rgba(6, 57, 46, 0)', '#06392e']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.bottomOverlay}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── MAIN CONTENT CARD ──────────────────────────────────────── */}
        <View style={styles.mainCard}>
          {/* Tabs row */}
          <View style={[styles.tabBar, isMobile && styles.tabBarMobile]}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'player' && styles.tabButtonActive,
                isMobile && styles.tabButtonMobile,
              ]}
              onPress={() => setActiveTab('player')}
            >
              <User size={18} color={activeTab === 'player' ? '#00ea6b' : '#94a3b8'} style={styles.tabIcon} />
              <Text style={[styles.tabText, activeTab === 'player' && styles.tabTextActive]}>
                Find Player
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'team' && styles.tabButtonActive,
                isMobile && styles.tabButtonMobile,
              ]}
              onPress={() => setActiveTab('team')}
            >
              <Users size={18} color={activeTab === 'team' ? '#00ea6b' : '#94a3b8'} style={styles.tabIcon} />
              <Text style={[styles.tabText, activeTab === 'team' && styles.tabTextActive]}>
                Find Team
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'profile' && styles.tabButtonActive,
                isMobile && styles.tabButtonMobile,
              ]}
              onPress={() => setActiveTab('profile')}
            >
              <Shield size={18} color={activeTab === 'profile' ? '#00ea6b' : '#94a3b8'} style={styles.tabIcon} />
              <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
                Player Profile
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search bar and Filters */}
          <View style={styles.searchRow}>
            <View style={styles.searchInputContainer}>
              <Search size={20} color="#94a3b8" style={styles.searchIcon} />
              <TextInput
                placeholder={activeTab === 'player' ? "Search players by name or city..." : "Search teams by name, city or captain..."}
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
              />
            </View>
            <TouchableOpacity style={styles.filterButton}>
              <Sliders size={20} color="#00ea6b" />
            </TouchableOpacity>
          </View>

          {/* Results List or Empty State */}
          {loading ? (
            <ActivityIndicator size="large" color="#00ea6b" style={{ marginTop: 40, marginBottom: 40 }} />
          ) : hasResults ? (
            <View style={styles.resultsWrapper}>
              <FlatList
                data={activeTab === 'player' ? filteredPlayers : filteredTeams}
                renderItem={activeTab === 'player' ? renderPlayerItem : renderTeamItem}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                numColumns={isMobile ? 1 : 2}
                key={isMobile ? 'v-list' : 'h-list'}
                columnWrapperStyle={!isMobile ? { gap: 16 } : null}
                contentContainerStyle={styles.list}
              />
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Image
                source={require('@/assets/cricket_empty_state.png')}
                style={styles.emptyStateImage}
                resizeMode="contain"
              />
              <Text style={styles.emptyStateTitle}>
                {activeTab === 'player' ? 'No players found matching your query' : 'No teams found matching your query'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Try searching with a different name or city
              </Text>

              {/* Action Buttons */}
              <TouchableOpacity style={styles.primaryButton}>
                <Search size={18} color="#ffffff" style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>Try a new search</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.textButton}
                onPress={() => setSearchQuery('')}
              >
                <RefreshCw size={14} color="#00ea6b" style={styles.buttonIcon} />
                <Text style={styles.textButtonText}>Reset filters</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <SiteFooter />
      </ScrollView>
    </View>
  );

  if (isWeb) {
    return <WebLayout noCard={true} isPublicNoSidebar={true}>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#06392e',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 24 : 64,
    paddingBottom: 40,
    alignItems: 'center',
    width: '100%',
  },
  // ── HERO BANNER ─────────────────────────────────────────────
  heroBanner: {
    flexDirection: 'row',
    backgroundColor: '#06392e',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.08)',
    padding: 32,
    maxWidth: 1200,
    width: '100%',
    marginBottom: 24,
    overflow: 'hidden',
  },
  heroBannerMobile: {
    flexDirection: 'column',
    padding: 20,
    borderRadius: 16,
  },
  heroLeft: {
    flex: 1.2,
    justifyContent: 'center',
  },
  heroRight: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroGraphic: {
    width: '100%',
    height: '100%',
  },
  graphicWrapper: {
    width: 240,
    height: 240,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  leftOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '35%',
  },
  rightOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '20%',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '20%',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '35%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
  },
  heroTitleAccent: {
    fontSize: 42,
    fontWeight: '900',
    color: '#00ea6b',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 32,
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 16,
  },
  featuresRowMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 234, 107, 0.04)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.06)',
    flex: 1,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 234, 107, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  featureDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  // ── MAIN CARD ───────────────────────────────────────────────
  mainCard: {
    backgroundColor: '#06392e',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.12)',
    padding: 24,
    maxWidth: 1200,
    width: '100%',
    marginBottom: 32,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 234, 107, 0.08)',
    paddingBottom: 16,
    marginBottom: 24,
    gap: 12,
  },
  tabBarMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(0, 234, 107, 0.04)',
    borderColor: '#00ea6b',
  },
  tabButtonMobile: {
    width: '100%',
  },
  tabIcon: {
    marginRight: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06392e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.08)',
    paddingHorizontal: 16,
    height: 52,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.12)',
    backgroundColor: '#06392e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── RESULTS LIST ────────────────────────────────────────────
  resultsWrapper: {
    width: '100%',
  },
  list: {
    gap: 16,
    paddingBottom: 24,
  },
  playerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#06392e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.08)',
    marginBottom: 16,
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
    backgroundColor: '#06392e',
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
    backgroundColor: 'rgba(0, 234, 107, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00ea6b',
  },
  cardContent: {
    marginLeft: 14,
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    maxWidth: 160,
  },
  subtext: {
    fontSize: 12,
    color: '#94a3b8',
  },
  teamMeta: {
    gap: 4,
  },
  captainText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00ea6b',
  },
  viewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 234, 107, 0.04)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.12)',
  },
  viewBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00ea6b',
  },
  // ── EMPTY STATE ─────────────────────────────────────────────
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateImage: {
    width: 160,
    height: 160,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ea6b',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginBottom: 16,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#06392e',
  },
  buttonIcon: {
    marginRight: 8,
  },
  textButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  textButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00ea6b',
  },
});
