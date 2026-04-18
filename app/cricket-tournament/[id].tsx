
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Platform, 
  ActivityIndicator,
  Dimensions,
  Share,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  Share2, 
  Calendar, 
  MapPin, 
  Trophy, 
  Users, 
  Info, 
  FileText,
  DollarSign,
  UserPlus
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface Tournament {
  id: string;
  name: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  status: string;
  banner_url: string;
  entry_fee: number;
  prize_pool: string;
  max_teams: number;
  rules: string;
}

interface Team {
  id: string;
  name: string;
  image_url: string;
}

interface RegisteredTeam {
  team: Team;
  status: string;
}

export default function TournamentDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registeredTeams, setRegisteredTeams] = useState<RegisteredTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isRegistering, setIsRegistering] = useState(false);
  const [userTeams, setUserTeams] = useState<Team[]>([]);

  useEffect(() => {
    if (id) {
      fetchTournamentDetails();
      fetchRegisteredTeams();
      fetchUserTeams();
    }
  }, [id]);

  const fetchTournamentDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setTournament(data);
    } catch (error) {
      console.error('Error fetching tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegisteredTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_teams')
        .select(`
          status,
          team:teams (id, name, image_url)
        `)
        .eq('tournament_id', id);
      
      if (error) throw error;
      setRegisteredTeams(data as any || []);
    } catch (error) {
      console.error('Error fetching registered teams:', error);
    }
  };

  const fetchUserTeams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('teams')
        .select('id, name, image_url')
        .eq('owner_id', user.id);
      
      if (error) throw error;
      setUserTeams(data || []);
    } catch (error) {
      console.error('Error fetching user teams:', error);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this tournament: ${tournament?.name} on Book Your Ground!`,
        url: `https://bookyourground.com/tournament/${id}`
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleRegister = async (teamId: string) => {
    try {
      setIsRegistering(true);
      const { error } = await supabase
        .from('tournament_teams')
        .insert({
          tournament_id: id,
          team_id: teamId,
          status: 'pending'
        });
      
      if (error) {
        if (error.code === '23505') {
          Alert.alert('Already Registered', 'This team is already registered for this tournament.');
        } else {
          throw error;
        }
      } else {
        Alert.alert('Success', 'Registration request sent successfully!');
        fetchRegisteredTeams();
      }
    } catch (error) {
      console.error('Error registering team:', error);
      Alert.alert('Error', 'Failed to register team. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#01b854" />
      </View>
    );
  }

  if (!tournament) {
    return (
      <View style={styles.errorContainer}>
        <Text>Tournament not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.headerImageContainer}>
          <Image 
            source={{ uri: tournament.banner_url || 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg' }} 
            style={styles.bannerImage} 
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
            style={styles.imageOverlay}
          />
          
          <View style={[styles.navButtons, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <ChevronLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
              <Share2 size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.titleContainer}>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: tournament.status === 'ongoing' ? '#01b854' : '#3B82F6' }]}>
                <Text style={styles.statusText}>{tournament.status}</Text>
              </View>
            </View>
            <Text style={styles.tournamentName}>{tournament.name}</Text>
          </View>
        </View>

        {/* Quick Info Bar */}
        <View style={styles.infoBar}>
          <View style={styles.infoBarItem}>
            <Calendar size={18} color="#01b854" />
            <Text style={styles.infoBarLabel}>Starts</Text>
            <Text style={styles.infoBarValue}>{new Date(tournament.start_date).toLocaleDateString()}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoBarItem}>
            <Trophy size={18} color="#F59E0B" />
            <Text style={styles.infoBarLabel}>Prize Pool</Text>
            <Text style={styles.infoBarValue}>{tournament.prize_pool || 'N/A'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoBarItem}>
            <MapPin size={18} color="#EF4444" />
            <Text style={styles.infoBarLabel}>Location</Text>
            <Text style={styles.infoBarValue}>{tournament.location}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {['overview', 'teams', 'rules'].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.content}>
          {activeTab === 'overview' && (
            <View>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Info size={20} color="#64748B" />
                  <Text style={styles.sectionTitle}>About Tournament</Text>
                </View>
                <Text style={styles.description}>{tournament.description}</Text>
              </View>

              <View style={styles.detailsGrid}>
                <View style={styles.detailCard}>
                  <DollarSign size={20} color="#01b854" />
                  <Text style={styles.detailLabel}>Entry Fee</Text>
                  <Text style={styles.detailValue}>₹{tournament.entry_fee}</Text>
                </View>
                <View style={styles.detailCard}>
                  <Users size={20} color="#3B82F6" />
                  <Text style={styles.detailLabel}>Format</Text>
                  <Text style={styles.detailValue}>T20 / Knockout</Text>
                </View>
                <View style={styles.detailCard}>
                  <UserPlus size={20} color="#8B5CF6" />
                  <Text style={styles.detailLabel}>Squad Size</Text>
                  <Text style={styles.detailValue}>11 + 4 Subs</Text>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'teams' && (
            <View>
              <View style={styles.teamsHeader}>
                <Text style={styles.teamsCountText}>
                  Registered Teams ({registeredTeams.length}/{tournament.max_teams})
                </Text>
              </View>
              {registeredTeams.length > 0 ? (
                registeredTeams.map((reg, index) => (
                  <View key={index} style={styles.teamRow}>
                    <Image 
                      source={{ uri: reg.team.image_url || 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg' }} 
                      style={styles.teamLogo} 
                    />
                    <View style={styles.teamInfo}>
                      <Text style={styles.teamName}>{reg.team.name}</Text>
                      <View style={[styles.regStatusBadge, { backgroundColor: reg.status === 'accepted' ? '#DCFCE7' : '#FEF3C7' }]}>
                        <Text style={[styles.regStatusText, { color: reg.status === 'accepted' ? '#166534' : '#92400E' }]}>
                          {reg.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyTeams}>
                  <Users size={48} color="#E2E8F0" />
                  <Text style={styles.emptyText}>No teams registered yet</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'rules' && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <FileText size={20} color="#64748B" />
                <Text style={styles.sectionTitle}>Tournament Rules</Text>
              </View>
              <Text style={styles.description}>
                {tournament.rules || "1. ICC Rules Apply\n2. Mandatory Whites/Colored\n3. Umpire decisions are final\n4. Reporting time 30 mins before match"}
              </Text>
            </View>
          )}
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.actionPriceInfo}>
          <Text style={styles.feeLabel}>Entry Fee</Text>
          <Text style={styles.feeValue}>₹{tournament.entry_fee}</Text>
        </View>
        <TouchableOpacity 
          style={styles.registerBtn}
          onPress={() => {
            if (userTeams.length === 0) {
              Alert.alert('No Teams', 'You need to create a team first to register for tournaments.', [
                { text: 'Create Team', onPress: () => router.push('/cricket/scoring?createTeam=true') },
                { text: 'Cancel', style: 'cancel' }
              ]);
            } else {
              // Show team selection (simplified for now)
              Alert.alert(
                'Select Team',
                'Choose a team to register',
                userTeams.map(team => ({
                  text: team.name,
                  onPress: () => handleRegister(team.id)
                })).concat([{ text: 'Cancel', style: 'cancel' }])
              );
            }
          }}
          disabled={isRegistering || tournament.status === 'completed'}
        >
          {isRegistering ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.registerBtnText}>
              {tournament.status === 'completed' ? 'Tournament Ended' : 'Register Now'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerImageContainer: {
    height: 300,
    width: '100%',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  navButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: 'Inter',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  tournamentName: {
    fontFamily: 'Inter',
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  infoBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -30,
    borderRadius: 16,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  infoBarItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  infoBarLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoBarValue: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '700',
  },
  divider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#01b854',
  },
  tabText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#01b854',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  description: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailCard: {
    width: (width - 44) / 3,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  detailValue: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '700',
  },
  teamsHeader: {
    marginBottom: 16,
  },
  teamsCountText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 10,
  },
  teamLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  teamInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 4,
  },
  regStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  regStatusText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  emptyTeams: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Inter',
    color: '#94A3B8',
    fontSize: 14,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 20,
  },
  actionPriceInfo: {
    flex: 1,
  },
  feeLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  feeValue: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  registerBtn: {
    flex: 2,
    backgroundColor: '#01b854',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#01b854',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  registerBtnText: {
    fontFamily: 'Inter',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
