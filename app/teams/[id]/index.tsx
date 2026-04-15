import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Platform,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { 
  MapPin, 
  User, 
  Users, 
  MessageSquare, 
  Info, 
  ArrowLeft,
  Settings,
  Share2
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import TeamChatTab from '@/components/teams/TeamChatTab';

interface Team {
  id: string;
  name: string;
  location: string;
  captain: string;
  image_url: string | null;
  owner_id: string;
  bg_color: string | null;
}

interface TeamMember {
  id: string;
  profile_id: string;
  player_name: string;
  role: string;
  status: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export default function TeamDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'chat'>('info');
  const [memberStatus, setMemberStatus] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadTeamData();
    }
  }, [id]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Team Details
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single();
      
      if (teamError) throw teamError;
      setTeam(teamData);

      // 2. Fetch Members
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*, profile:profiles(full_name, avatar_url)')
        .eq('team_id', id);
      
      if (membersError) throw membersError;
      setMembers(membersData || []);

      // 3. Check current user status
      const myMembership = membersData?.find(m => m.profile_id === user?.id);
      if (myMembership) {
        setMemberStatus(myMembership.status);
      } else if (teamData.owner_id === user?.id) {
        setMemberStatus('accepted'); // Owner is always internally 'accepted'
      }

    } catch (err) {
      console.error('Error loading team details:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAcceptedMember = memberStatus === 'accepted';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00ea6b" />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.center}>
        <Text>Team not found.</Text>
      </View>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <ScrollView style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About Team</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <MapPin size={20} color="#64748B" />
                  <View style={styles.infoTextGroup}>
                    <Text style={styles.infoLabel}>Location</Text>
                    <Text style={styles.infoValue}>{team.location}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <User size={20} color="#64748B" />
                  <View style={styles.infoTextGroup}>
                    <Text style={styles.infoLabel}>Captain</Text>
                    <Text style={styles.infoValue}>{team.captain}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stats Summary</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>12</Text>
                  <Text style={styles.statLabel}>Matches</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>8</Text>
                  <Text style={styles.statLabel}>Wins</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>66%</Text>
                  <Text style={styles.statLabel}>Win Rate</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        );
      case 'members':
        return (
          <ScrollView style={styles.tabContent}>
             {members.map((member) => (
               <View key={member.id} style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    {member.profile?.avatar_url ? (
                      <Image source={{ uri: member.profile.avatar_url }} style={styles.avatarImg} />
                    ) : (
                      <Text style={styles.avatarInitial}>{member.player_name[0]}</Text>
                    )}
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.player_name}</Text>
                    <Text style={styles.memberRole}>{member.role.toUpperCase()}</Text>
                  </View>
                  {member.status === 'pending' && (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingText}>PENDING</Text>
                    </View>
                  )}
               </View>
             ))}
          </ScrollView>
        );
      case 'chat':
        return <TeamChatTab teamId={team.id} isMember={isAcceptedMember} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{team.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionBtn}>
            <Share2 size={20} color="#FFFFFF" />
          </TouchableOpacity>
          {team.owner_id === user?.id && (
            <TouchableOpacity style={styles.headerActionBtn}>
              <Settings size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.hero}>
        <View style={[styles.teamLogoContainer, { backgroundColor: team.bg_color || '#00ea6b' }]}>
          {team.image_url ? (
            <Image source={{ uri: team.image_url }} style={styles.teamLogo} />
          ) : (
            <Text style={styles.teamInitials}>{team.name[0]}</Text>
          )}
        </View>
        <Text style={styles.heroName}>{team.name}</Text>
        <Text style={styles.heroLocation}>{team.location}</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'info' && styles.activeTab]} 
          onPress={() => setActiveTab('info')}
        >
          <Info size={18} color={activeTab === 'info' ? '#00ea6b' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>Info</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'members' && styles.activeTab]} 
          onPress={() => setActiveTab('members')}
        >
          <Users size={18} color={activeTab === 'members' ? '#00ea6b' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>Members</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'chat' && styles.activeTab]} 
          onPress={() => setActiveTab('chat')}
        >
          <View style={styles.chatTabLabel}>
            <MessageSquare size={18} color={activeTab === 'chat' ? '#00ea6b' : '#64748B'} />
            {!isAcceptedMember && (
              <View style={styles.lockDot} />
            )}
          </View>
          <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>Chat</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {renderTabContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#043529',
  },
  header: {
    backgroundColor: '#043529',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    marginHorizontal: 16,
    textAlign: 'center',
  },
  backBtn: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    padding: 8,
  },
  hero: {
    backgroundColor: '#043529',
    alignItems: 'center',
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  teamLogoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  teamLogo: {
    width: '100%',
    height: '100%',
  },
  teamInitials: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroLocation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 16,
    padding: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#F0FDF4',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  activeTabText: {
    color: '#166534',
  },
  chatTabLabel: {
    position: 'relative',
  },
  lockDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  infoTextGroup: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '700',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#00ea6b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  memberRole: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
});
