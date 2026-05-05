import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text as RNText, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Platform,
  SafeAreaView,
  Share,
  Alert,
  Modal,
  TextInput as RNTextInput,
  useWindowDimensions,
  Dimensions
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing, 
  useAnimatedScrollHandler,
  runOnJS
} from 'react-native-reanimated';
import { useLocalSearchParams, router } from 'expo-router';
import { useUI } from '@/contexts/UIContext';
import { 
  MapPin, 
  User, 
  Users, 
  MessageSquare, 
  Info, 
  ArrowLeft,
  Settings,
  Share2,
  Shield,
  QrCode,
  Crown,
  Target,
  Zap,
  Sword,
  ShieldCheck,
  UserPlus,
  UserMinus
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import TeamChatTab from '@/components/teams/TeamChatTab';
import QRCode from 'react-native-qrcode-svg';

interface Team {
  id: string;
  name: string;
  location: string;
  captain: string;
  image_url: string | null;
  owner_id: string;
  bg_color: string | null;
  owner?: {
    full_name: string;
  };
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

const TABS = [
  { key: 'info', label: 'Info', hidden: true },
  { key: 'members', label: 'Members' },
  { key: 'chat', label: 'Chat' },
  { key: 'matches', label: 'Matches' },
  { key: 'stats', label: 'Stats' },
  { key: 'leaderboard', label: 'Leaderboard' },
];

export default function TeamDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { setTabBarVisible } = useUI();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('members');
  const [memberStatus, setMemberStatus] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCaptain, setEditCaptain] = useState('');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [teamMatches, setTeamMatches] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [rpcStats, setRpcStats] = useState<any>(null);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'bat' | 'bowl' | 'field' | 'partnership'>('bat');
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [partnershipsLoading, setPartnershipsLoading] = useState(false);
  
  const horizontalPagerRef = React.useRef<Animated.ScrollView>(null);
  const tabScrollRef = React.useRef<ScrollView>(null);

  const horizontalScrollHandler = useAnimatedScrollHandler({
    onMomentumEnd: (event) => {
      const idx = Math.round(event.contentOffset.x / windowWidth);
      const tab = TABS[idx];
      if (tab) {
        runOnJS(setActiveTab)(tab.key);
      }
    },
  });

  const onTabPress = (tabKey: string, idx: number) => {
    setActiveTab(tabKey);
    horizontalPagerRef.current?.scrollTo({ x: idx * windowWidth, animated: true });
  };

  const lastScrollY = React.useRef(0);

  const handleScroll = (event: any) => {
    const currentY = event.nativeEvent.contentOffset.y;
    lastScrollY.current = currentY;
  };

  useEffect(() => {
    setTabBarVisible(false);
    return () => setTabBarVisible(true);
  }, []);

  useEffect(() => {
    if (id) {
      setTeam(null);
      setMemberStatus(null);
      setMembers([]);
      loadTeamData();
      loadMatches();
      loadLeaderboard();
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'leaderboard' && activeSubTab === 'partnership' && teamMatches.length > 0) {
      loadPartnerships();
    }
  }, [activeSubTab, activeTab, teamMatches.length]);

  useEffect(() => {
    const visibleTabs = TABS.filter(t => !t.hidden);
    const idx = visibleTabs.findIndex(t => t.key === activeTab);
    if (idx !== -1) {
      tabScrollRef.current?.scrollTo({ 
        x: idx * 100 - (windowWidth / 2) + 50, 
        animated: true 
      });
    }
  }, [activeTab, windowWidth]);

  const loadPartnerships = async () => {
    try {
      setPartnershipsLoading(true);
      const matchIds = teamMatches.map(m => m.id);
      const { data, error } = await supabase
        .from('partnerships')
        .select('*')
        .in('match_id', matchIds)
        .order('total_runs', { ascending: false })
        .limit(10);
      if (error) throw error;
      setPartnerships(data || []);
    } catch (err) {
      console.error('Error loading partnerships:', err);
    } finally {
      setPartnershipsLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      const { data, error } = await supabase
        .from('player_ball_stats')
        .select(`
          *,
          member:team_members(
            id,
            player_name,
            profile_id,
            profile:profiles(avatar_url)
          )
        `)
        .in('member_id', members.map(m => m.id))
        .eq('ball_type', 'leather');

      if (error) throw error;
      setLeaderboardData(data || []);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const loadMatches = async () => {
    try {
      setMatchesLoading(true);
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_team_stats', { target_team_id: id });
      
      if (!statsError) {
        setRpcStats(statsData);
      }

      const { data, error } = await supabase
        .from('matches')
        .select(`*, match_live_state (*)`)
        .or(`team_a_id.eq.${id},team_b_id.eq.${id}`)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setTeamMatches(data || []);
    } catch (err) {
      console.error('Error loading matches:', err);
    } finally {
      setMatchesLoading(false);
    }
  };

  const calculateStats = () => {
    if (rpcStats) {
      const winRate = rpcStats.matches > 0 ? ((rpcStats.won / rpcStats.matches) * 100).toFixed(1) : '0';
      return {
        matches: rpcStats.matches,
        upcoming: rpcStats.upcoming,
        won: rpcStats.won,
        lost: rpcStats.lost,
        tie: rpcStats.tie,
        draw: rpcStats.draw,
        noResult: rpcStats.no_result,
        tossWon: rpcStats.toss_won,
        batFirst: rpcStats.bat_first,
        fieldFirst: rpcStats.field_first,
        runsFor: rpcStats.runs_for,
        runsAg: rpcStats.runs_against,
        highest: rpcStats.highest_score,
        lowest: rpcStats.lowest_score,
        winRate: `${winRate}%`
      };
    }

    let stats = {
      matches: 0, upcoming: 0, won: 0, lost: 0, tie: 0, draw: 0, noResult: 0,
      tossWon: 0, batFirst: 0, fieldFirst: 0,
      runsFor: 0, runsAg: 0, highest: 0, lowest: Infinity
    };

    teamMatches.forEach(m => {
      const isTeamA = m.team_a_id === id;
      const live = m.match_live_state;
      if (m.status === 'scheduled') stats.upcoming++;
      else stats.matches++;

      if (live?.winner_id === id) stats.won++;
      else if (live?.winner_id && live?.winner_id !== id) stats.lost++;
      else if (live?.match_status === 'tie') stats.tie++;
      else if (live?.match_status === 'draw') stats.draw++;
      else if (m.status === 'abandoned' || live?.match_status === 'abandoned') stats.noResult++;

      if (m.toss_winner_id === id) stats.tossWon++;
      const batFirstTeamId = m.toss_decision === 'bat' ? m.toss_winner_id : (m.team_a_id === m.toss_winner_id ? m.team_b_id : m.team_a_id);
      if (batFirstTeamId === id) stats.batFirst++;
      else if (m.status !== 'scheduled') stats.fieldFirst++;

      const parseRuns = (s: string) => parseInt(s?.split('/')[0] || '0');
      const myRuns = parseRuns(isTeamA ? live?.team_a_score : live?.team_b_score);
      const oppRuns = parseRuns(isTeamA ? live?.team_b_score : live?.team_a_score);

      if (myRuns > 0) {
        stats.runsFor += myRuns;
        if (myRuns > stats.highest) stats.highest = myRuns;
        if (myRuns < stats.lowest) stats.lowest = myRuns;
      }
      if (oppRuns > 0) stats.runsAg += oppRuns;
    });

    if (stats.lowest === Infinity) stats.lowest = 0;
    const winRate = stats.matches > 0 ? ((stats.won / stats.matches) * 100).toFixed(1) : '0';
    return { ...stats, winRate: `${winRate}%` };
  };

  const dynamicStats = calculateStats();

  const loadLeaderboardWithIds = async (memberIds: string[]) => {
    try {
      setLeaderboardLoading(true);
      const { data, error } = await supabase
        .from('player_ball_stats')
        .select(`
          *,
          member:team_members(
            id,
            player_name,
            profile_id,
            profile:profiles(avatar_url)
          )
        `)
        .in('member_id', memberIds)
        .eq('ball_type', 'leather');

      if (error) throw error;
      setLeaderboardData(data || []);
    } catch (err) {
      console.error('Error loading leaderboard with IDs:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*, owner:profiles!owner_id(full_name)')
        .eq('id', id)
        .single();
      
      if (teamError) throw teamError;
      setTeam(teamData);

      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*, profile:profiles(full_name, avatar_url)')
        .eq('team_id', id);
      
      if (membersError) throw membersError;
      setMembers(membersData || []);
      
      if (membersData && membersData.length > 0) {
        loadLeaderboardWithIds(membersData.map(m => m.id));
      }

      const myMembership = membersData?.find(m => m.profile_id === user?.id);
      if (myMembership) {
        setMemberStatus(myMembership.status);
      } else if (teamData.owner_id === user?.id) {
        setMemberStatus('accepted');
      }

    } catch (err) {
      console.error('Error loading team details:', err);
    } finally {
      setLoading(false);
    }
  };

  const onShare = async () => {
    try {
      const shareUrl = Platform.OS === 'web' ? window.location.href : `https://bookyourground.com/teams/${id}`;
      await Share.share({
        message: `Check out ${team?.name} on Book Your Ground! Join us and let's play! 🏏\n\n${shareUrl}`,
        url: shareUrl,
        title: team?.name,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const isAcceptedMember = memberStatus === 'accepted';
  const isOwner = team?.owner_id === user?.id;

  const handleDeleteTeam = async () => {
    const performDelete = async () => {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) {
        if (Platform.OS === 'web') alert(error.message);
        else Alert.alert('Error', error.message);
      } else {
        router.push('/cricket/teams' as any);
      }
    };
    if (Platform.OS === 'web') {
      if (confirm("Are you sure you want to delete this team permanently?")) performDelete();
    } else {
      Alert.alert("Delete Team", "Are you sure you want to delete this team permanently?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: performDelete }
      ]);
    }
  };

  const handleUpdateMember = async (profileId: string, newStatus: string) => {
    try {
      if (newStatus === 'removed') {
        const { error } = await supabase.from('team_members').delete().eq('team_id', id).eq('profile_id', profileId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('team_members').update({ status: newStatus }).eq('team_id', id).eq('profile_id', profileId);
        if (error) throw error;
      }
      loadTeamData();
    } catch (err: any) {
      if (Platform.OS === 'web') alert(err.message);
      else Alert.alert('Error', err.message);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase.from('teams').update({ name: editName, location: editLocation, captain: editCaptain }).eq('id', id);
      if (error) throw error;
      setIsEditing(false);
      loadTeamData();
    } catch (err: any) {
      if (Platform.OS === 'web') alert(err.message);
      else Alert.alert('Error', err.message);
    }
  };

  const openEditModal = () => {
    setEditName(team?.name || '');
    setEditLocation(team?.location || '');
    setEditCaptain(team?.captain || '');
    setIsEditing(true);
  };

  const handleLeaveTeam = async () => {
    const performLeave = async () => {
      const { error } = await supabase.from('team_members').delete().eq('team_id', id).eq('profile_id', user?.id);
      if (error) {
        if (Platform.OS === 'web') alert(error.message);
        else Alert.alert('Error', error.message);
      } else {
        setMemberStatus(null);
        loadTeamData();
      }
    };
    if (Platform.OS === 'web') {
      if (confirm("Are you sure you want to leave this team?")) performLeave();
    } else {
      Alert.alert("Leave Team", "Are you sure you want to leave this team?", [
        { text: "Cancel", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: performLeave }
      ]);
    }
  };

  const handleJoinTeam = async () => {
    try {
      if (!user) {
        if (Platform.OS === 'web') alert('Please login to join the team');
        else Alert.alert('Login Required', 'Please login to join the team');
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      const { error } = await supabase.from('team_members').insert({
        team_id: id,
        profile_id: user.id,
        player_name: profile?.full_name || 'Anonymous Player',
        role: 'player',
        status: 'accepted'
      });
      if (error) throw error;
      setMemberStatus('accepted');
      loadTeamData();
    } catch (err: any) {
      if (Platform.OS === 'web') alert(err.message);
      else Alert.alert('Error', err.message);
    }
  };

  const handleToggleRole = (roleId: string) => {
    if (!selectedMember) return;
    const currentRoles = selectedMember.role ? selectedMember.role.split(',') : [];
    const newRoles = currentRoles.includes(roleId) ? currentRoles.filter(r => r !== roleId) : [...currentRoles, roleId];
    setSelectedMember({ ...selectedMember, role: newRoles.join(',') });
  };

  const saveMemberRoles = async () => {
    if (!selectedMember) return;
    try {
      const { error } = await supabase.from('team_members').update({ role: selectedMember.role }).eq('id', selectedMember.id);
      if (error) throw error;
      setIsAssigningRole(false);
      loadTeamData();
    } catch (err: any) {
      if (Platform.OS === 'web') alert(err.message);
      else Alert.alert('Error', err.message);
    }
  };  const isFold = windowWidth < 330 || windowWidth > 600;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00ea6b" />
        </View>
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <RNText style={{ color: '#FFFFFF' }}>Team not found.</RNText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.navigate('/cricket/teams' as any)}>
            <ArrowLeft size={24} color="#1E293B" strokeWidth={2.5} />
          </TouchableOpacity>
          <RNText style={styles.headerTitle} numberOfLines={1}>{team.name}</RNText>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionBtn} onPress={onShare}>
              <Share2 size={20} color="#1E293B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionBtn} onPress={() => setIsQRModalOpen(true)}>
              <QrCode size={20} color="#1E293B" />
            </TouchableOpacity>
            {team.owner_id === user?.id && (
              <TouchableOpacity 
                style={styles.headerActionBtn}
                onPress={openEditModal}
              >
                <Settings size={20} color={isEditing ? '#01b854' : '#1E293B'} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.tabBarContainer}>
          <ScrollView 
            ref={tabScrollRef}
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.tabBar}
            contentContainerStyle={styles.tabBarContent}
          >
            {TABS.filter(t => !t.hidden).map((tab, idx) => {
              const actualIdx = TABS.findIndex(t => t.key === tab.key);
              return (
                <TouchableOpacity 
                  key={tab.key}
                  style={[styles.tab, activeTab === tab.key && styles.activeTab]} 
                  onPress={() => onTabPress(tab.key, actualIdx)}
                >
                  <RNText style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                    {tab.label}
                  </RNText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.content}>
          {Platform.OS === 'web' ? (
            <View style={{ flex: 1 }}>
              {activeTab === 'info' && (
                <ScrollView 
                  style={styles.tabContent} 
                  contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
                  showsVerticalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                >
                  <View style={styles.infoProfileCard}>
                    <View style={styles.profileMainInfo}>
                      <View style={[styles.infoTeamLogoContainer, { backgroundColor: team.image_url ? 'transparent' : '#F1F5F9' }]}>
                        {team.image_url ? (
                          <Image source={{ uri: team.image_url }} style={styles.teamLogo} />
                        ) : (
                          <RNText style={[styles.teamInitials, { color: '#64748B' }]}>{team.name[0]}</RNText>
                        )}
                      </View>
                      <View style={styles.infoProfileText}>
                        <RNText style={styles.infoProfileName}>{team.name}</RNText>
                        <View style={styles.officialBadge}>
                          <RNText style={styles.officialBadgeText}>OFFICIAL TEAM</RNText>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setIsQRModalOpen(true)} style={styles.miniQRContainer}>
                      <QrCode size={32} color="#01b854" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.section}>
                    <RNText style={styles.sectionTitle}>About Team</RNText>
                    <View style={styles.infoCard}>
                      <View style={styles.infoRow}>
                        <MapPin size={18} color="#94A3B8" />
                        <View style={[styles.infoTextGroup, { marginLeft: 12 }]}>
                          <RNText style={styles.infoLabel}>Location</RNText>
                          <RNText style={styles.infoValue}>{team.location}</RNText>
                        </View>
                      </View>
                      <View style={styles.infoDivider} />
                      <View style={styles.infoRow}>
                        <Shield size={18} color="#94A3B8" />
                        <View style={[styles.infoTextGroup, { marginLeft: 12 }]}>
                          <RNText style={styles.infoLabel}>Admin / Owner</RNText>
                          <RNText style={styles.infoValue}>{team?.owner?.full_name || 'Team Admin'}</RNText>
                        </View>
                      </View>
                      <View style={styles.infoDivider} />
                      <View style={styles.infoRow}>
                        <User size={18} color="#94A3B8" />
                        <View style={[styles.infoTextGroup, { marginLeft: 12 }]}>
                          <RNText style={styles.infoLabel}>Captain</RNText>
                          <RNText style={styles.infoValue}>{team.captain}</RNText>
                        </View>
                      </View>
                    </View>
                  </View>
                  {isAcceptedMember && !isOwner && (
                    <TouchableOpacity style={styles.leaveTeamTextBtn} onPress={handleLeaveTeam}>
                      <RNText style={styles.leaveTeamText}>Leave this team</RNText>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              )}
              {activeTab === 'matches' && (
                <ScrollView 
                  style={styles.tabContent} 
                  contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                >
                  <RNText style={styles.sectionTitle}>Match History</RNText>
                  {matchesLoading ? (
                    <ActivityIndicator size="small" color="#01b854" />
                  ) : teamMatches.length === 0 ? (
                    <View style={styles.emptyMatches}>
                      <RNText style={styles.emptyMatchesText}>No matches found for this team.</RNText>
                    </View>
                  ) : (
                    <View style={styles.matchesList}>
                      {teamMatches.slice(0, 10).map((match) => {
                        const isTeamA = match.team_a_id === id;
                        const myScore = isTeamA ? match.match_live_state?.team_a_score : match.match_live_state?.team_b_score;
                        const oppScore = isTeamA ? match.match_live_state?.team_b_score : match.match_live_state?.team_a_score;
                        const oppName = isTeamA ? match.team_b : match.team_a;
                        const isWon = match.match_live_state?.winner_id === id;
                        return (
                          <TouchableOpacity 
                            key={match.id} 
                            style={styles.matchHistoryCard}
                            onPress={() => router.push(`/live/${match.id}`)}
                          >
                            <View style={styles.matchHistoryHeader}>
                              <RNText style={styles.matchHistoryDate}>
                                {new Date(match.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                              </RNText>
                              <View style={[styles.matchResultBadge, { backgroundColor: isWon ? '#F0FDF4' : '#FEF2F2' }]}>
                                <RNText style={[styles.matchResultBadgeText, { color: isWon ? '#01b854' : '#EF4444' }]}>
                                  {isWon ? 'WON' : 'LOST'}
                                </RNText>
                              </View>
                            </View>
                            <View style={styles.matchHistoryTeams}>
                              <View style={styles.matchHistoryTeamRow}>
                                <RNText style={styles.matchHistoryTeamName}>{team?.name}</RNText>
                                <RNText style={styles.matchHistoryTeamScore}>{myScore || '0/0'}</RNText>
                              </View>
                              <View style={styles.matchHistoryVS}><RNText style={styles.vsText}>VS</RNText></View>
                              <View style={styles.matchHistoryTeamRow}>
                                <RNText style={styles.matchHistoryTeamName}>{oppName}</RNText>
                                <RNText style={styles.matchHistoryTeamScore}>{oppScore || '0/0'}</RNText>
                              </View>
                            </View>
                            {match.match_live_state?.result_text && (
                              <RNText style={styles.matchHistoryResultText}>{match.match_live_state.result_text}</RNText>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </ScrollView>
              )}
              {activeTab === 'stats' && (
                <ScrollView 
                  style={styles.tabContent} 
                  contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
                  showsVerticalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                >
                  <RNText style={styles.sectionTitle}>Overview</RNText>
                  <View style={styles.statsGrid}>
                    {[
                      { label: 'MATCHES', value: dynamicStats.matches.toString() },
                      { label: 'UPCOMING', value: dynamicStats.upcoming.toString() },
                      { label: 'WON', value: dynamicStats.won.toString(), color: '#01b854' },
                      { label: 'LOST', value: dynamicStats.lost.toString(), color: '#EF4444' },
                      { label: 'TOSS WON', value: dynamicStats.tossWon.toString() },
                      { label: 'WIN %', value: dynamicStats.winRate },
                      { label: 'RUNS (FOR)', value: dynamicStats.runsFor.toLocaleString() },
                      { label: 'HIGHEST', value: dynamicStats.highest.toString() },
                    ].map((stat, idx) => (
                      <View key={idx} style={styles.statGridItem}>
                        <RNText style={styles.statGridLabel}>{stat.label}</RNText>
                        <RNText style={[styles.statGridValue, stat.color ? { color: stat.color } : null]}>{stat.value}</RNText>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
              {activeTab === 'leaderboard' && (
                <View style={{ flex: 1 }}>
                  <View style={{ backgroundColor: '#ffffff', paddingBottom: 8 }}>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false} 
                      style={[styles.subTabBar, { marginHorizontal: 16 }]} 
                      contentContainerStyle={styles.subTabBarContent}
                    >
                      {[{ key: 'bat', label: 'Bat' }, { key: 'bowl', label: 'Bowl' }, { key: 'field', label: 'Field' }, { key: 'partnership', label: 'Partnership' }].map((sub) => (
                        <TouchableOpacity 
                          key={sub.key} 
                          style={[styles.subTab, activeSubTab === sub.key && styles.activeSubTab]} 
                          onPress={() => setActiveSubTab(sub.key as any)}
                        >
                          <RNText style={[styles.subTabText, activeSubTab === sub.key && styles.activeSubTabText]}>
                            {sub.label}
                          </RNText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <ScrollView 
                    style={styles.tabContent} 
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                  >
                    {leaderboardLoading ? (
                      <ActivityIndicator size="small" color="#01b854" style={{ marginTop: 20 }} />
                    ) : (
                      <View style={{ marginTop: 8, flex: 1 }}>
                        {activeSubTab === 'bat' && (
                          <View style={{ flex: 1 }}>
                            <RNText style={styles.sectionTitle}>Top Batters (Runs)</RNText>
                            <View style={styles.leaderboardCard}>
                              {leaderboardData.filter(stat => stat.total_runs > 0).length === 0 ? (
                                <View style={{ padding: 40, alignItems: 'center' }}>
                                  <RNText style={{ color: '#94A3B8' }}>No batting data yet</RNText>
                                </View>
                              ) : (
                                [...leaderboardData]
                                  .filter(stat => stat.total_runs > 0)
                                  .sort((a,b) => b.total_runs - a.total_runs)
                                  .slice(0, 10)
                                  .map((stat, idx) => (
                                  <TouchableOpacity 
                                    key={stat.id} 
                                    style={[styles.leaderboardRow, idx === 9 && { borderBottomWidth: 0 }]}
                                    onPress={() => stat.member?.profile_id && router.push(`/players/${stat.member.profile_id}` as any)}
                                  >
                                    <View style={styles.leaderboardPlayerInfo}>
                                      <RNText style={styles.leaderboardRank}>{idx + 1}</RNText>
                                      <View style={styles.leaderboardAvatar}>
                                        <Image 
                                          source={stat.member?.profile?.avatar_url ? { uri: stat.member.profile.avatar_url } : require('../../../assets/avatar.png')} 
                                          style={styles.avatarImg} 
                                        />
                                      </View>
                                      <RNText style={styles.leaderboardName} numberOfLines={1}>{stat.member?.player_name}</RNText>
                                    </View>
                                    <View style={styles.leaderboardValueContainer}><RNText style={styles.leaderboardValue}>{stat.total_runs}</RNText><RNText style={styles.leaderboardUnit}>Runs</RNText></View>
                                  </TouchableOpacity>
                                ))
                              )}
                            </View>
                          </View>
                        )}
                        {activeSubTab === 'bowl' && (
                          <View style={{ flex: 1 }}>
                            <RNText style={styles.sectionTitle}>Top Bowlers (Wkts)</RNText>
                            <View style={styles.leaderboardCard}>
                              {leaderboardData.filter(stat => stat.total_wickets > 0).length === 0 ? (
                                <View style={{ padding: 40, alignItems: 'center' }}>
                                  <RNText style={{ color: '#94A3B8' }}>No bowling data yet</RNText>
                                </View>
                              ) : (
                                [...leaderboardData]
                                  .filter(stat => stat.total_wickets > 0)
                                  .sort((a,b) => b.total_wickets - a.total_wickets)
                                  .slice(0, 10)
                                  .map((stat, idx) => (
                                  <TouchableOpacity 
                                    key={stat.id} 
                                    style={[styles.leaderboardRow, idx === 9 && { borderBottomWidth: 0 }]}
                                    onPress={() => stat.member?.profile_id && router.push(`/players/${stat.member.profile_id}` as any)}
                                  >
                                    <View style={styles.leaderboardPlayerInfo}>
                                      <RNText style={styles.leaderboardRank}>{idx + 1}</RNText>
                                      <View style={styles.leaderboardAvatar}>
                                        <Image 
                                          source={stat.member?.profile?.avatar_url ? { uri: stat.member.profile.avatar_url } : require('../../../assets/avatar.png')} 
                                          style={styles.avatarImg} 
                                        />
                                      </View>
                                      <RNText style={styles.leaderboardName} numberOfLines={1}>{stat.member?.player_name}</RNText>
                                    </View>
                                    <View style={styles.leaderboardValueContainer}><RNText style={styles.leaderboardValue}>{stat.total_wickets}</RNText><RNText style={styles.leaderboardUnit}>Wkt</RNText></View>
                                  </TouchableOpacity>
                                ))
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
              {activeTab === 'members' && (
                <ScrollView 
                  style={styles.tabContent}
                  contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                >
                  {members.map((member) => (
                    <TouchableOpacity 
                      key={member.id} 
                      style={styles.memberRow}
                      onPress={() => member.profile_id && router.push(`/players/${member.profile_id}` as any)}
                    >
                      <View style={styles.memberAvatar}>
                        <Image 
                          source={member.profile?.avatar_url ? { uri: member.profile.avatar_url } : require('../../../assets/avatar.png')} 
                          style={styles.avatarImg} 
                        />
                      </View>
                      <View style={styles.memberInfo}>
                        <View style={styles.memberNameRow}>
                          <RNText style={styles.memberName}>{member.player_name}</RNText>
                          {member.role?.split(',').map(r => (
                            <View key={r} style={[styles.roleMiniTag, { backgroundColor: '#F1F5F9' }]}>
                              <RNText style={styles.roleMiniTagText}>{r[0].toUpperCase()}</RNText>
                            </View>
                          ))}
                        </View>
                        <RNText style={styles.memberRole}>{member.role || 'Player'}</RNText>
                      </View>
                      {isOwner && member.profile_id !== user?.id && (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity 
                            style={[styles.memberActionBtn, { backgroundColor: '#F0FDF4' }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              setSelectedMember(member);
                              setIsAssigningRole(true);
                            }}
                          >
                            <Shield size={14} color="#01b854" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.memberActionBtn, { backgroundColor: '#FEF2F2' }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleUpdateMember(member.profile_id, 'removed');
                            }}
                          >
                            <UserMinus size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {activeTab === 'chat' && (
                <TeamChatTab teamId={team.id} isMember={isAcceptedMember} />
              )}
            </View>
          ) : (
            <Animated.ScrollView
              ref={horizontalPagerRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={horizontalScrollHandler}
              scrollEventThrottle={16}
              contentOffset={{ x: TABS.findIndex(t => t.key === activeTab) * windowWidth, y: 0 }}
              style={{ flex: 1, height: '100%' }}
            >
              {TABS.map((tab) => (
                <View key={tab.key} style={{ width: windowWidth, flex: 1 }}>
                  {tab.key === 'info' && (
                    <ScrollView 
                      style={styles.tabContent} 
                      contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
                      showsVerticalScrollIndicator={false}
                      onScroll={handleScroll}
                      scrollEventThrottle={16}
                      nestedScrollEnabled={true}
                    >
                      <View style={styles.infoProfileCard}>
                        <View style={styles.profileMainInfo}>
                          <View style={[styles.infoTeamLogoContainer, { backgroundColor: team.image_url ? 'transparent' : '#F1F5F9' }]}>
                            {team.image_url ? (
                              <Image source={{ uri: team.image_url }} style={styles.teamLogo} />
                            ) : (
                              <RNText style={[styles.teamInitials, { color: '#64748B' }]}>{team.name[0]}</RNText>
                            )}
                          </View>
                          <View style={styles.infoProfileText}>
                            <RNText style={styles.infoProfileName}>{team.name}</RNText>
                            <View style={styles.officialBadge}>
                              <RNText style={styles.officialBadgeText}>OFFICIAL TEAM</RNText>
                            </View>
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => setIsQRModalOpen(true)} style={styles.miniQRContainer}>
                          <QrCode size={32} color="#01b854" strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.section}>
                        <RNText style={styles.sectionTitle}>About Team</RNText>
                        <View style={styles.infoCard}>
                          <View style={styles.infoRow}>
                            <MapPin size={18} color="#94A3B8" />
                            <View style={[styles.infoTextGroup, { marginLeft: 12 }]}>
                              <RNText style={styles.infoLabel}>Location</RNText>
                              <RNText style={styles.infoValue}>{team.location}</RNText>
                            </View>
                          </View>
                          <View style={styles.infoDivider} />
                          <View style={styles.infoRow}>
                            <Shield size={18} color="#94A3B8" />
                            <View style={[styles.infoTextGroup, { marginLeft: 12 }]}>
                              <RNText style={styles.infoLabel}>Admin / Owner</RNText>
                              <RNText style={styles.infoValue}>{team?.owner?.full_name || 'Team Admin'}</RNText>
                            </View>
                          </View>
                          <View style={styles.infoDivider} />
                          <View style={styles.infoRow}>
                            <User size={18} color="#94A3B8" />
                            <View style={[styles.infoTextGroup, { marginLeft: 12 }]}>
                              <RNText style={styles.infoLabel}>Captain</RNText>
                              <RNText style={styles.infoValue}>{team.captain}</RNText>
                            </View>
                          </View>
                        </View>
                      </View>
                      {isAcceptedMember && !isOwner && (
                        <TouchableOpacity style={styles.leaveTeamTextBtn} onPress={handleLeaveTeam}>
                          <RNText style={styles.leaveTeamText}>Leave this team</RNText>
                        </TouchableOpacity>
                      )}
                    </ScrollView>
                  )}
                  {tab.key === 'matches' && (
                    <ScrollView 
                      style={styles.tabContent} 
                      contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
                      onScroll={handleScroll}
                      scrollEventThrottle={16}
                      nestedScrollEnabled={true}
                    >
                      <RNText style={styles.sectionTitle}>Match History</RNText>
                      {matchesLoading ? (
                        <ActivityIndicator size="small" color="#01b854" />
                      ) : teamMatches.length === 0 ? (
                        <View style={styles.emptyMatches}>
                          <RNText style={styles.emptyMatchesText}>No matches found for this team.</RNText>
                        </View>
                      ) : (
                        <View style={styles.matchesList}>
                          {teamMatches.slice(0, 10).map((match) => {
                            const isTeamA = match.team_a_id === id;
                            const myScore = isTeamA ? match.match_live_state?.team_a_score : match.match_live_state?.team_b_score;
                            const oppScore = isTeamA ? match.match_live_state?.team_b_score : match.match_live_state?.team_a_score;
                            const oppName = isTeamA ? match.team_b : match.team_a;
                            const isWon = match.match_live_state?.winner_id === id;
                            return (
                              <TouchableOpacity 
                                key={match.id} 
                                style={styles.matchHistoryCard}
                                onPress={() => router.push(`/live/${match.id}`)}
                              >
                                <View style={styles.matchHistoryHeader}>
                                  <RNText style={styles.matchHistoryDate}>
                                    {new Date(match.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                  </RNText>
                                  <View style={[styles.matchResultBadge, { backgroundColor: isWon ? '#F0FDF4' : '#FEF2F2' }]}>
                                    <RNText style={[styles.matchResultBadgeText, { color: isWon ? '#01b854' : '#EF4444' }]}>
                                      {isWon ? 'WON' : 'LOST'}
                                    </RNText>
                                  </View>
                                </View>
                                <View style={styles.matchHistoryTeams}>
                                  <View style={styles.matchHistoryTeamRow}>
                                    <RNText style={styles.matchHistoryTeamName}>{team?.name}</RNText>
                                    <RNText style={styles.matchHistoryTeamScore}>{myScore || '0/0'}</RNText>
                                  </View>
                                  <View style={styles.matchHistoryVS}><RNText style={styles.vsText}>VS</RNText></View>
                                  <View style={styles.matchHistoryTeamRow}>
                                    <RNText style={styles.matchHistoryTeamName}>{oppName}</RNText>
                                    <RNText style={styles.matchHistoryTeamScore}>{oppScore || '0/0'}</RNText>
                                  </View>
                                </View>
                                {match.match_live_state?.result_text && (
                                  <RNText style={styles.matchHistoryResultText}>{match.match_live_state.result_text}</RNText>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </ScrollView>
                  )}
                  {tab.key === 'stats' && (
                    <ScrollView 
                      style={styles.tabContent} 
                      contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
                      showsVerticalScrollIndicator={false}
                      onScroll={handleScroll}
                      scrollEventThrottle={16}
                      nestedScrollEnabled={true}
                    >
                      <RNText style={styles.sectionTitle}>Overview</RNText>
                      <View style={styles.statsGrid}>
                        {[
                          { label: 'MATCHES', value: dynamicStats.matches.toString() },
                          { label: 'UPCOMING', value: dynamicStats.upcoming.toString() },
                          { label: 'WON', value: dynamicStats.won.toString(), color: '#01b854' },
                          { label: 'LOST', value: dynamicStats.lost.toString(), color: '#EF4444' },
                          { label: 'TOSS WON', value: dynamicStats.tossWon.toString() },
                          { label: 'WIN %', value: dynamicStats.winRate },
                          { label: 'RUNS (FOR)', value: dynamicStats.runsFor.toLocaleString() },
                          { label: 'HIGHEST', value: dynamicStats.highest.toString() },
                        ].map((stat, idx) => (
                          <View key={idx} style={styles.statGridItem}>
                            <RNText style={styles.statGridLabel}>{stat.label}</RNText>
                            <RNText style={[styles.statGridValue, stat.color ? { color: stat.color } : null]}>{stat.value}</RNText>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  )}
                  {tab.key === 'leaderboard' && (
                    <View style={{ flex: 1 }}>
                      <View style={{ backgroundColor: '#ffffff', paddingBottom: 8 }}>
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false} 
                          style={[styles.subTabBar, { marginHorizontal: 16 }]} 
                          contentContainerStyle={styles.subTabBarContent}
                        >
                          {[{ key: 'bat', label: 'Bat' }, { key: 'bowl', label: 'Bowl' }, { key: 'field', label: 'Field' }, { key: 'partnership', label: 'Partnership' }].map((sub) => (
                            <TouchableOpacity 
                              key={sub.key} 
                              style={[styles.subTab, activeSubTab === sub.key && styles.activeSubTab]} 
                              onPress={() => setActiveSubTab(sub.key as any)}
                            >
                              <RNText style={[styles.subTabText, activeSubTab === sub.key && styles.activeSubTabText]}>
                                {sub.label}
                              </RNText>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                      <ScrollView 
                        style={styles.tabContent} 
                        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
                        showsVerticalScrollIndicator={false}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        nestedScrollEnabled={true}
                      >
                        {leaderboardLoading ? (
                          <ActivityIndicator size="small" color="#01b854" style={{ marginTop: 20 }} />
                        ) : (
                          <View style={{ marginTop: 8, flex: 1 }}>
                            {activeSubTab === 'bat' && (
                              <View style={{ flex: 1 }}>
                                <RNText style={styles.sectionTitle}>Top Batters (Runs)</RNText>
                                <View style={styles.leaderboardCard}>
                                  {leaderboardData.filter(stat => stat.total_runs > 0).length === 0 ? (
                                    <View style={{ padding: 40, alignItems: 'center' }}>
                                      <RNText style={{ color: '#94A3B8' }}>No batting data yet</RNText>
                                    </View>
                                  ) : (
                                    [...leaderboardData]
                                      .filter(stat => stat.total_runs > 0)
                                      .sort((a,b) => b.total_runs - a.total_runs)
                                      .slice(0, 10)
                                      .map((stat, idx) => (
                                      <TouchableOpacity 
                                        key={stat.id} 
                                        style={[styles.leaderboardRow, idx === 9 && { borderBottomWidth: 0 }]}
                                        onPress={() => stat.member?.profile_id && router.push(`/players/${stat.member.profile_id}` as any)}
                                      >
                                        <View style={styles.leaderboardPlayerInfo}>
                                          <RNText style={styles.leaderboardRank}>{idx + 1}</RNText>
                                          <View style={styles.leaderboardAvatar}>
                                            {stat.member?.profile?.avatar_url ? (
                                              <Image source={{ uri: stat.member.profile.avatar_url }} style={styles.avatarImg} />
                                            ) : (
                                              <RNText style={styles.avatarInitial}>{(stat.member?.player_name || '?')[0]}</RNText>
                                            )}
                                          </View>
                                          <RNText style={styles.leaderboardName} numberOfLines={1}>{stat.member?.player_name}</RNText>
                                        </View>
                                        <View style={styles.leaderboardValueContainer}><RNText style={styles.leaderboardValue}>{stat.total_runs}</RNText><RNText style={styles.leaderboardUnit}>Runs</RNText></View>
                                      </TouchableOpacity>
                                    ))
                                  )}
                                </View>
                              </View>
                            )}
                            {activeSubTab === 'bowl' && (
                              <View style={{ flex: 1 }}>
                                <RNText style={styles.sectionTitle}>Top Bowlers (Wkts)</RNText>
                                <View style={styles.leaderboardCard}>
                                  {leaderboardData.filter(stat => stat.total_wickets > 0).length === 0 ? (
                                    <View style={{ padding: 40, alignItems: 'center' }}>
                                      <RNText style={{ color: '#94A3B8' }}>No bowling data yet</RNText>
                                    </View>
                                  ) : (
                                    [...leaderboardData]
                                      .filter(stat => stat.total_wickets > 0)
                                      .sort((a,b) => b.total_wickets - a.total_wickets)
                                      .slice(0, 10)
                                      .map((stat, idx) => (
                                      <TouchableOpacity 
                                        key={stat.id} 
                                        style={[styles.leaderboardRow, idx === 9 && { borderBottomWidth: 0 }]}
                                        onPress={() => stat.member?.profile_id && router.push(`/players/${stat.member.profile_id}` as any)}
                                      >
                                        <View style={styles.leaderboardPlayerInfo}>
                                          <RNText style={styles.leaderboardRank}>{idx + 1}</RNText>
                                          <View style={styles.leaderboardAvatar}>
                                            <Image 
                                              source={stat.member?.profile?.avatar_url ? { uri: stat.member.profile.avatar_url } : require('../../../assets/avatar.png')} 
                                              style={styles.avatarImg} 
                                            />
                                          </View>
                                          <RNText style={styles.leaderboardName} numberOfLines={1}>{stat.member?.player_name}</RNText>
                                        </View>
                                        <View style={styles.leaderboardValueContainer}><RNText style={styles.leaderboardValue}>{stat.total_wickets}</RNText><RNText style={styles.leaderboardUnit}>Wkt</RNText></View>
                                      </TouchableOpacity>
                                    ))
                                  )}
                                </View>
                              </View>
                            )}
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  )}
                  {tab.key === 'members' && (
                    <ScrollView 
                      style={styles.tabContent}
                      contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
                      onScroll={handleScroll}
                      scrollEventThrottle={16}
                      nestedScrollEnabled={true}
                    >
                      {members.map((member) => (
                        <TouchableOpacity 
                          key={member.id} 
                          style={styles.memberRow}
                          onPress={() => member.profile_id && router.push(`/players/${member.profile_id}` as any)}
                        >
                          <View style={styles.memberAvatar}>
                            {member.profile?.avatar_url ? (
                              <Image source={{ uri: member.profile.avatar_url }} style={styles.avatarImg} />
                            ) : (
                              <RNText style={styles.avatarInitial}>{(member.player_name || '?')[0]}</RNText>
                            )}
                          </View>
                          <View style={styles.memberInfo}>
                            <View style={styles.memberNameRow}>
                              <RNText style={styles.memberName}>{member.player_name}</RNText>
                              {member.role?.split(',').map(r => (
                                <View key={r} style={[styles.roleMiniTag, { backgroundColor: '#F1F5F9' }]}>
                                  <RNText style={styles.roleMiniTagText}>{r[0].toUpperCase()}</RNText>
                                </View>
                              ))}
                            </View>
                            <RNText style={styles.memberRole}>{member.role || 'Player'}</RNText>
                          </View>
                          {isOwner && member.profile_id !== user?.id && (
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <TouchableOpacity 
                                style={[styles.memberActionBtn, { backgroundColor: '#F0FDF4' }]}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  setSelectedMember(member);
                                  setIsAssigningRole(true);
                                }}
                              >
                                <Shield size={14} color="#01b854" />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={[styles.memberActionBtn, { backgroundColor: '#FEF2F2' }]}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleUpdateMember(member.profile_id, 'removed');
                                }}
                              >
                                <UserMinus size={14} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  {tab.key === 'chat' && (
                    <TeamChatTab teamId={team.id} isMember={isAcceptedMember} />
                  )}
                </View>
              ))}
            </Animated.ScrollView>
          )}
        </View>

        <Modal visible={isEditing} animationType="slide" transparent={true} onRequestClose={() => setIsEditing(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsEditing(false)}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <RNText style={styles.modalTitle}>Edit Team Profile</RNText>
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <RNText style={styles.inputLabel}>Team Name</RNText>
                  <RNTextInput style={styles.textInput} value={editName} onChangeText={setEditName} placeholder="Enter team name" />
                </View>
                <View style={styles.inputGroup}>
                  <RNText style={styles.inputLabel}>Location</RNText>
                  <RNTextInput style={styles.textInput} value={editLocation} onChangeText={setEditLocation} placeholder="Enter location" />
                </View>
                <View style={styles.inputGroup}>
                  <RNText style={styles.inputLabel}>Captain</RNText>
                  <RNTextInput style={styles.textInput} value={editCaptain} onChangeText={setEditCaptain} placeholder="Enter captain name" />
                </View>
                <View style={[styles.modalBtnRow, { marginTop: 20 }]}>
                  <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn, { flex: 1 }]} onPress={() => setIsEditing(false)}>
                    <RNText style={styles.cancelBtnText}>Cancel</RNText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, styles.saveBtn, { flex: 2 }]} onPress={handleSaveProfile}>
                    <RNText style={styles.saveBtnText}>Save Changes</RNText>
                  </TouchableOpacity>
                </View>
                <View style={[styles.modalBtnRow, { marginTop: 20 }]}>
                  <TouchableOpacity style={styles.deleteCard} onPress={handleDeleteTeam}>
                    <RNText style={styles.deleteText}>Delete Team Permanently</RNText>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={isQRModalOpen} animationType="fade" transparent={true} onRequestClose={() => setIsQRModalOpen(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsQRModalOpen(false)}>
            <View style={styles.qrModalContent}>
              <View style={styles.qrWrapper}>
                <QRCode value={`https://bookyourground.com/teams/${id}`} size={250} color="#043529" backgroundColor="#FFFFFF" />
              </View>
              <RNText style={styles.qrHint}>Team QR Code</RNText>
              <RNText style={styles.qrSubHint}>Scan to view team profile</RNText>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={isAssigningRole} animationType="slide" transparent={true} onRequestClose={() => setIsAssigningRole(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsAssigningRole(false)}>
            <View style={styles.roleModalContent}>
              <View style={styles.modalHandle} />
              <RNText style={styles.roleModalTitle}>Assign Role to {selectedMember?.player_name}</RNText>
              <View style={styles.roleOptionsGrid}>
                {[{ id: 'admin', label: 'Admin', icon: Shield }, { id: 'captain', label: 'Team Captain', icon: Crown }, { id: 'wicket_keeper', label: 'Wicket Keeper', icon: ShieldCheck }, { id: 'batter', label: 'Batter', icon: Sword }, { id: 'bowler', label: 'Bowler', icon: Target }, { id: 'all_rounder', label: 'All Rounder', icon: Zap }].map((role) => {
                  const IconComponent = role.icon;
                  const isActive = selectedMember?.role?.split(',').includes(role.id);
                  return (
                    <TouchableOpacity key={role.id} style={[styles.roleOption, isActive && styles.activeRoleOption]} onPress={() => handleToggleRole(role.id)}>
                      <View style={[styles.roleIconCircle, isActive && { backgroundColor: '#F0FDF4' }]}>
                        <IconComponent size={24} color={isActive ? '#01b854' : '#64748B'} />
                      </View>
                      <RNText style={[styles.roleOptionText, isActive && styles.activeRoleOptionText]}>{role.label}</RNText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn, { flex: 1 }]} onPress={() => setIsAssigningRole(false)}>
                  <RNText style={styles.cancelBtnText}>Cancel</RNText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn, { flex: 2 }]} onPress={saveMemberRoles}>
                  <RNText style={styles.saveBtnText}>Save Roles</RNText>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {!memberStatus && !isOwner && (activeTab === 'info' || activeTab === 'members') && (
          <View style={[styles.bottomJoinContainer, { paddingBottom: Math.max(insets.bottom, 16) }, isFold && { paddingTop: 28 }]}>
            <TouchableOpacity style={[styles.infoBottomBtn, isFold && { paddingVertical: 22 }]} onPress={() => onTabPress('info', 0)}>
              <Info size={18} color="#64748B" />
              <RNText style={styles.infoBottomBtnText}>TEAM INFO</RNText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.fullJoinBtn, isFold && { paddingVertical: 22 }]} onPress={handleJoinTeam}>
              <Users size={18} color="#FFFFFF" strokeWidth={2.5} />
              <RNText style={styles.fullJoinBtnText}>JOIN TEAM</RNText>
            </TouchableOpacity>
          </View>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 12 : 36,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#01b854',
    flex: 1,
    marginHorizontal: 16,
    textAlign: 'center',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
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
    alignItems: 'center',
    paddingBottom: 4,
    minHeight: 4,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  infoProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  profileMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  profileRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  miniQRContainer: {
    padding: 0,
  },
  infoTeamLogoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  infoProfileText: {
    flex: 1,
  },
  infoProfileName: {
    fontFamily: 'Inter',
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  officialBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    alignSelf: 'flex-start',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  officialBadgeText: {
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 1,
  },
  teamLogo: {
    width: '100%',
    height: '100%',
  },
  teamInitials: {
    fontFamily: 'Inter',
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroName: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroLocation: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  matchesList: {
    gap: 16,
    paddingBottom: 24,
  },
  matchHistoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  matchHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  matchHistoryDate: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  matchResultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  matchResultBadgeText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '800',
  },
  matchHistoryTeams: {
    gap: 8,
  },
  matchHistoryTeamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchHistoryTeamName: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
  },
  matchHistoryTeamScore: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#043529',
  },
  matchHistoryVS: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  vsText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '800',
    color: '#CBD5E1',
  },
  matchHistoryResultText: {
    marginTop: 16,
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  emptyMatches: {
    padding: 40,
    alignItems: 'center',
  },
  emptyMatchesText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  statGridItem: {
    flex: 1,
    minWidth: (Platform.OS === 'web' ? 120 : 100),
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  statGridLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statGridValue: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '900',
    color: '#043529',
    textAlign: 'center',
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  formCardGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  formNote: {
    marginTop: 12,
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  leaderboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  leaderboardPlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  leaderboardRank: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '800',
    color: '#94A3B8',
    width: 20,
  },
  leaderboardAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  leaderboardName: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  leaderboardValueContainer: {
    alignItems: 'flex-end',
  },
  leaderboardValue: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '900',
    color: '#043529',
  },
  leaderboardUnit: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  subTabBar: {
    marginBottom: 8,
  },
  subTabBarContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
    alignItems: 'center',
    paddingVertical: 4,
  },
  subTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSubTab: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  subTabText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activeSubTabText: {
    color: '#01b854',
  },
  tabBarContainer: {
    marginTop: 0,
  },
  tabBar: {
    backgroundColor: 'transparent',
    paddingVertical: 4,
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minWidth: 100,
  },
  activeTab: {
    borderBottomColor: '#01b854',
  },
  tabText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    color: '#01b854',
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
    fontFamily: 'Inter',
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
    paddingVertical: 12,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  infoTextGroup: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  performanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  perfItem: {
    flex: 1,
    alignItems: 'center',
  },
  perfDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#F1F5F9',
  },
  perfLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  perfValue: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
  },
  winRateSection: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  winRateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  winRateLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  winRateValue: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '900',
    color: '#01b854',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#01b854',
  },
  formSection: {
    paddingTop: 20,
    alignItems: 'center',
  },
  formLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 12,
  },
  formCirclesContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  formCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCircleText: {
    fontFamily: 'Inter',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
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
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  roleMiniTag: {
    width: 18,
    height: 18,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleMiniTagText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'Inter',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    fontFamily: 'Inter',
  },
  memberRole: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '500',
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
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  settingsItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  settingsItemDesc: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },
  deleteCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  deleteText: {
    fontFamily: 'Inter',
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 14,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  qrWrapper: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  qrHint: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '800',
    color: '#043529',
    textAlign: 'center',
  },
  qrSubHint: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  memberActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    width: '100%',
  },
  modalTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '900',
    color: '#043529',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  textInput: {
    fontFamily: 'Inter',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  saveBtn: {
    backgroundColor: '#01b854',
  },
  cancelBtnText: {
    color: '#64748B',
    fontFamily: 'Inter', fontWeight: '700',
  },
  saveBtnText: {
    fontFamily: 'Inter',
    color: '#FFFFFF',
    fontWeight: '800',
  },
  addMemberFullBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#431043',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#431043',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  addMemberFullBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  qrModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
  },
  qrModalTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '900',
    color: '#043529',
    marginBottom: 20,
  },
  qrModalWrapper: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  qrModalHint: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 24,
  },
  qrModalCloseBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 99,
  },
  qrModalCloseText: {
    fontFamily: 'Inter',
    color: '#64748B',
    fontWeight: '800',
    fontSize: 14,
  },
  joinBtn: {
    backgroundColor: '#01b854',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Inter',
    fontWeight: '900',
    fontSize: 12,
  },
  fullJoinBtn: {
    backgroundColor: '#01b854',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    flex: 2,
    gap: 8,
    shadowColor: '#01b854',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  infoBottomBtn: {
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    flex: 1,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoBottomBtnText: {
    color: '#64748B',
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  fullJoinBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bottomJoinContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    gap: 12,
  },
  leaveTeamTextBtn: {
    marginTop: 40,
    padding: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  leaveTeamText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    textDecorationLine: 'underline',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 12,
  },
  memberActionTextBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  memberActionText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#01b854',
  },
  roleModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  roleModalTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '900',
    color: '#043529',
    marginBottom: 24,
    textAlign: 'center',
  },
  roleOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  roleOption: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 8,
  },
  roleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  activeRoleOption: {
    backgroundColor: '#F0FDF4',
    borderColor: '#01b854',
  },
  roleOptionText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  activeRoleOptionText: {
    color: '#01b854',
  },
  roleModalCloseBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  roleModalCloseText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
});
