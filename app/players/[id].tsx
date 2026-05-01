import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Platform,
  Dimensions,
  Share,
  Alert,
  Modal,
  Pressable,
  Animated,
  StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ChevronLeft,
  QrCode,
  Filter,
  Share2,
  MapPin,
  Eye,
  UserPlus,
  BarChart2,
  Trophy,
  Award,
  Users,
  Image as ImageIcon,
  MessageCircle,
  FileText,
  Clock,
  ChevronRight,
  Zap,
  Target,
  PlayCircle,
  Plus
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 280;
const HEADER_MIN_HEIGHT = 110;
const CONTENT_MIN_HEIGHT = windowHeight - HEADER_MIN_HEIGHT;

const TABS = [
  { id: 'matches', label: 'Matches' },
  { id: 'stats', label: 'Stats' },
  { id: 'trophies', label: 'Trophies' },
  { id: 'badges', label: 'Badges' },
  { id: 'teams', label: 'Teams' },
  { id: 'highlights', label: 'Highlights' },
  { id: 'photos', label: 'Photos' },
  { id: 'connections', label: 'Connections' },
  { id: 'profile', label: 'Profile' },
];

export default function PlayerProfile() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>({
    overall: { matches: 0, batting: {}, bowling: {}, fielding: {}, captain: {} },
    leather: { matches: 0, batting: {}, bowling: {}, fielding: {}, captain: {} },
    tennis: { matches: 0, matches: 0, batting: {}, bowling: {}, fielding: {}, captain: {} },
    other: { matches: 0, batting: {}, bowling: {}, fielding: {}, captain: {} }
  });
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matches');
  const [statsTab, setStatsTab] = useState('batting');
  const [trophiesTab, setTrophiesTab] = useState('matches');
  const [badgesTab, setBadgesTab] = useState('batting');
  const [highlightsTab, setHighlightsTab] = useState('recent');
  const [connectionsTab, setConnectionsTab] = useState('followers');
  const [highlights, setHighlights] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [matchFilter, setMatchFilter] = useState('all');
  const [playedMatchIds, setPlayedMatchIds] = useState<string[]>([]);
  const qrRef = useRef<any>(null);
  const mainPagerRef = useRef<ScrollView>(null);
  const tabBarRef = useRef<ScrollView>(null);
  const statsPagerRef = useRef<ScrollView>(null);
  const trophiesPagerRef = useRef<ScrollView>(null);
  const badgesPagerRef = useRef<ScrollView>(null);
  const highlightsPagerRef = useRef<ScrollView>(null);
  const connectionsPagerRef = useRef<ScrollView>(null);

  const [isInnerSwiping, setIsInnerSwiping] = useState(false);
  const [mainScrollEnabled, setMainScrollEnabled] = useState(true);

  const isOwnProfile = user?.id === id;

  const handleShareQR = async () => {
    try {
      if (!qrRef.current) return;
      
      // Wait a moment for the view to be fully rendered
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const uri = await captureRef(qrRef, {
        format: 'png',
        quality: 0.9,
        result: 'tmpfile',
      });
      
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `Share ${profile?.full_name}'s QR ID Card`,
        UTI: 'public.png'
      });
    } catch (error) {
      console.error('Error sharing QR:', error);
      Alert.alert('Error', 'Failed to share QR code image');
    }
  };

  useEffect(() => {
    const idx = TABS.findIndex(t => t.id === activeTab);
    if (idx !== -1) {
      tabBarRef.current?.scrollTo({ x: idx * 90 - (windowWidth / 2) + 45, animated: true });
    }
  }, [activeTab]);

  useEffect(() => {
    if (id) {
      loadPlayerData();
    }
  }, [id]);

  const loadPlayerData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (profileError) throw profileError;
      setProfile(profileData);

      // Scroll to 'matches' tab (index 0) if not already there
      if (activeTab !== 'matches') {
        setActiveTab('matches');
        mainPagerRef.current?.scrollTo({ x: 0, animated: false });
        tabBarRef.current?.scrollTo({ x: 0, animated: false });
      }

      // Initialize with empty states to ensure UI renders
      setMatches([]);
      const createEmptyDiscipline = () => ({
        matches: 0,
        batting: { innings: 0, runs: 0, highest: 0, average: 0, sr: 0, fifties: 0, hundreds: 0, fours: 0, sixes: 0, not_outs: 0, ducks: 0, won: 0, lost: 0 },
        bowling: { innings: 0, wickets: 0, best: '-', economy: 0, sr: 0, runs_conceded: 0, overs: 0, five_w: 0 },
        fielding: { catches: 0, stumpings: 0, runouts: 0 },
        captain: { matches: 0, wins: 0, losses: 0, win_pc: '0' }
      });
      setStats({
        overall: createEmptyDiscipline(),
        leather: createEmptyDiscipline(),
        tennis: createEmptyDiscipline(),
        other: createEmptyDiscipline()
      });

      // 2. Fetch team memberships with team details
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select(`
          id,
          team_id,
          role,
          teams (
            id,
            name,
            logo_url,
            city,
            total_matches,
            total_wins
          )
        `)
        .eq('profile_id', id);

      if (teamMembers && teamMembers.length > 0) {
        const teamIds = teamMembers.map(tm => tm.team_id);
        const memberIds = teamMembers.map(tm => tm.id);
        
        // Transform and set teams state
        const playerTeams = teamMembers
          .filter(tm => tm.teams)
          .map(tm => ({
            ...tm.teams,
            player_role: tm.role
          }));
        setTeams(playerTeams);

        // Fetch matches history
        const { data: matchData } = await supabase
          .from('matches')
          .select(`
            *,
            match_live_state (*)
          `)
          .or(`team_a_id.in.(${teamIds.join(',')}),team_b_id.in.(${teamIds.join(',')})`)
          .order('created_at', { ascending: false });
        
        setMatches(matchData || []);

        // Fetch matches where user was part of Playing XI
        const { data: playedMatchData } = await supabase
          .from('match_playing_xi')
          .select('match_id')
          .in('player_id', memberIds);
        
        if (playedMatchData) {
          setPlayedMatchIds(playedMatchData.map(pm => pm.match_id));
        }

        // 3. Fetch all ball stats
        const { data: statsData } = await supabase
          .from('player_ball_stats')
          .select('*')
          .in('member_id', memberIds);
        
        if (statsData) {
          const createEmptyDiscipline = () => ({
            matches: 0,
            batting: { innings: 0, runs: 0, highest: 0, average: 0, sr: 0, fifties: 0, hundreds: 0, fours: 0, sixes: 0, not_outs: 0, ducks: 0, won: 0, lost: 0 },
            bowling: { innings: 0, wickets: 0, best: '-', economy: 0, sr: 0, runs_conceded: 0, overs: 0, five_w: 0 },
            fielding: { catches: 0, stumpings: 0, runouts: 0 },
            captain: { matches: 0, wins: 0, losses: 0, win_pc: '0' }
          });

          const ballTypes = ['overall', 'leather', 'tennis', 'other'];
          const statsByBall: Record<string, any> = {
            overall: createEmptyDiscipline(),
            leather: createEmptyDiscipline(),
            tennis: createEmptyDiscipline(),
            other: createEmptyDiscipline()
          };

          statsData.forEach(curr => {
            const types = ['overall', curr.ball_type || 'other'];
            types.forEach(type => {
              const s = statsByBall[type];
              if (!s) return;
              s.matches += (curr.matches_played || 0);
              
              // Batting
              s.batting.innings += (curr.innings_batted || 0);
              s.batting.runs += (curr.total_runs || 0);
              s.batting.highest = Math.max(s.batting.highest, curr.highest_score || 0);
              s.batting.fifties += (curr.fifties || 0);
              s.batting.hundreds += (curr.hundreds || 0);
              s.batting.fours += (curr.fours || 0);
              s.batting.sixes += (curr.sixes || 0);
              s.batting.not_outs += (curr.not_outs || 0);
              s.batting.ducks += (curr.ducks || 0);
              
              // Bowling
              s.bowling.innings += (curr.innings_bowled || 0);
              s.bowling.wickets += (curr.total_wickets || 0);
              s.bowling.runs_conceded += (curr.runs_conceded || 0);
              s.bowling.overs += (Number(curr.overs_bowled) || 0);
              
              // Fielding
              s.fielding.catches += (curr.total_catches || 0);
              s.fielding.stumpings += (curr.total_stumpings || 0);
              s.fielding.runouts += (curr.total_runouts || 0);
            });
          });

          // Calculate derived stats
          Object.values(statsByBall).forEach(s => {
            if (s.batting.innings > 0) {
              const outs = s.batting.innings - s.batting.not_outs;
              s.batting.average = outs > 0 ? (s.batting.runs / outs).toFixed(2) : s.batting.runs;
              s.batting.sr = s.batting.innings > 0 ? (s.batting.runs / (s.batting.innings * 20)) * 100 : 0; // Simplified SR if balls faced missing
            }
            if (s.bowling.overs > 0) {
              s.bowling.economy = s.bowling.runs_conceded / s.bowling.overs;
            }
            if (s.bowling.wickets > 0) {
              s.bowling.average = (s.bowling.runs_conceded / s.bowling.wickets).toFixed(2);
            } else {
              s.bowling.average = s.bowling.runs_conceded.toFixed(2);
            }
          });

          // Captaincy (Overall only for simplicity in this mockup)
          const captainMatches = matchData?.filter(m => m.team_a_captain_id === id || m.team_b_captain_id === id) || [];
          const captainWins = captainMatches.filter(m => {
            const isTeamA = m.team_a_captain_id === id;
            return (isTeamA && m.match_live_state?.winner_id === m.team_a_id) || (!isTeamA && m.match_live_state?.winner_id === m.team_b_id);
          }).length;

          statsByBall.overall.captain = {
            matches: captainMatches.length,
            wins: captainWins,
            losses: captainMatches.length - captainWins,
            win_pc: captainMatches.length > 0 ? ((captainWins / captainMatches.length) * 100).toFixed(1) : '0'
          };

          setStats(statsByBall);
        }
      }

      // 4. Fetch Connections (Followers/Following)
      const { data: followData } = await supabase
        .from('profiles_follows')
        .select('*')
        .eq('following_id', id);
      
      setFollowerCount(followData?.length || 0);
      
      if (user) {
        const { data: currentFollow } = await supabase
          .from('profiles_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', id)
          .single();
        setIsFollowing(!!currentFollow);
      }

      // 5. Increment View Count (Skip if own profile)
      if (!isOwnProfile) {
        await supabase.rpc('increment_profile_views', { target_profile_id: id });
      }
    } catch (error) {
      console.error('Error loading player data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to follow players');
      return;
    }

    if (isOwnProfile) {
      Alert.alert('Info', 'You cannot follow yourself');
      return;
    }

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('profiles_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', id);
        
        if (error) throw error;
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        // Follow
        const { error } = await supabase
          .from('profiles_follows')
          .insert({
            follower_id: user.id,
            following_id: id
          });
        
        if (error) throw error;
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${profile?.full_name}'s cricket profile on Book Your Ground!`,
        url: `https://bookyourground.com/players/${id}`
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const renderMatchCard = (match: any) => {
    const isTeamA = match.match_live_state?.team_a_id === match.team_a_id;
    const team1Name = match.team_a || 'Team A';
    const team2Name = match.team_b || 'Team B';
    const score1 = match.match_live_state?.team_a_score || '0/0';
    const score2 = match.match_live_state?.team_b_score || '0/0';
    const statusDisplay = match.status === 'completed' || match.match_live_state?.status === 'completed' ? 'RESULT' : (match.status === 'Live' ? 'LIVE' : 'UPCOMING');
    
    const getBadgeStyle = () => {
      if (statusDisplay === 'RESULT') return { backgroundColor: '#005b80' };
      if (statusDisplay === 'LIVE') return { backgroundColor: '#01b854' };
      return { backgroundColor: '#4f2c63' };
    };

    return (
      <TouchableOpacity 
        key={match.id} 
        style={styles.matchCard}
        onPress={() => router.push(`/live/${match.id}`)}
      >
        <View style={styles.matchCardHeader}>
          <View>
            <Text style={styles.matchType}>{match.match_type || 'Match'}</Text>
            <Text style={styles.matchMeta}>
              {match.created_at ? new Date(match.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-') : 'N/A'} | {match.overs || 20} Ov. | {match.venue || 'Unknown Grounds'}
            </Text>
          </View>
          <View style={[styles.resultBadge, getBadgeStyle()]}>
            <Text style={styles.resultBadgeText}>{statusDisplay}</Text>
          </View>
        </View>

        <View style={styles.matchScoreRow}>
          <View style={styles.teamScoreInfo}>
            <Text style={styles.matchTeamName}>{team1Name}</Text>
            <Text style={styles.matchTeamScore}>{score1}</Text>
          </View>
        </View>

        <View style={styles.matchScoreRow}>
          <View style={styles.teamScoreInfo}>
            <Text style={styles.matchTeamName}>{team2Name}</Text>
            <Text style={styles.matchTeamScore}>{score2}</Text>
          </View>
        </View>

        {match.match_live_state?.result_text && (
          <Text style={styles.matchResultText}>{match.match_live_state.result_text}</Text>
        )}

        <View style={styles.matchCardFooter}>
          <TouchableOpacity style={styles.footerLink}>
            <Text style={styles.footerLinkText}>Insights</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerLink}>
            <Text style={styles.footerLinkText}>Squads</Text>
          </TouchableOpacity>
          {match.tournament_id && (
            <>
              <TouchableOpacity style={styles.footerLink}>
                <Text style={styles.footerLinkText}>Table</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerLink}>
                <Text style={styles.footerLinkText}>Leaderboard</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTeamCard = (team: any) => {
    return (
      <TouchableOpacity 
        key={team.id} 
        style={styles.teamCard}
        onPress={() => router.push(`/teams/${team.id}`)}
      >
        <View style={styles.teamCardLeft}>
          <View style={styles.teamLogoWrapper}>
            {team.logo_url ? (
              <Image source={{ uri: team.logo_url }} style={styles.teamLogo} />
            ) : (
              <View style={styles.teamLogoPlaceholder}>
                <Users size={24} color="#CBD5E1" />
              </View>
            )}
          </View>
          <View style={styles.teamMainInfo}>
            <Text style={styles.teamName} numberOfLines={1}>{team.name}</Text>
            <View style={styles.teamMetaRow}>
              <MapPin size={12} color="#94A3B8" />
              <Text style={styles.teamCity}>{team.city || 'Location N/A'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.teamCardRight}>
          <View style={styles.teamStatsMini}>
            <Text style={styles.teamStatsValue}>{team.total_matches || 0}</Text>
            <Text style={styles.teamStatsLabel}>Matches</Text>
          </View>
          <View style={styles.teamStatsDivider} />
          <View style={styles.teamStatsMini}>
            <Text style={[styles.teamStatsValue, { color: '#01b854' }]}>{team.total_wins || 0}</Text>
            <Text style={styles.teamStatsLabel}>Wins</Text>
          </View>
          <ChevronRight size={18} color="#CBD5E1" style={{ marginLeft: 8 }} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderHighlightCard = (highlight: any) => {
    return (
      <TouchableOpacity 
        key={highlight.id} 
        style={styles.highlightCard}
        onPress={() => Alert.alert('Play Video', 'Video player integration coming soon!')}
      >
        <View style={styles.thumbnailWrapper}>
          <Image source={{ uri: highlight.thumbnail }} style={styles.thumbnail} />
          <View style={styles.playOverlay}>
            <PlayCircle size={32} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{highlight.duration}</Text>
          </View>
        </View>
        <View style={styles.highlightMeta}>
          <Text style={styles.highlightTitle} numberOfLines={2}>{highlight.title}</Text>
          <View style={styles.highlightBottom}>
            <Text style={styles.highlightViewCount}>{highlight.views} views</Text>
            <View style={styles.dotMini} />
            <Text style={styles.highlightDate}>{highlight.date}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderConnectionCard = (user: any) => {
    return (
      <TouchableOpacity 
        key={user.id} 
        style={styles.connectionCard}
        onPress={() => router.push(`/players/${user.id}`)}
      >
        <View style={styles.connectionLeft}>
          <Image 
            source={{ uri: user.avatar_url || 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg' }} 
            style={styles.connectionAvatar} 
          />
          <View style={styles.connectionMainInfo}>
            <Text style={styles.connectionName}>{user.full_name}</Text>
            <Text style={styles.connectionRole}>{user.role || 'Cricket Player'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.followBtnMini}>
          <Text style={styles.followBtnMiniText}>Follow</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const onSubPagerBegin = () => setMainScrollEnabled(false);
  const onSubPagerEnd = (type: string, e: any) => {
    setMainScrollEnabled(true);
    onSubPagerScrollEnd(type, e);
  };

  const renderStatsGrid = (recordType: string, discipline: string) => {
    const data = stats[recordType]?.[discipline];
    if (!data) return null;

    const DataCard = ({ label, value }: { label: string, value: string | number }) => (
      <View style={styles.dataCard}>
        <Text style={styles.dataValue}>{value}</Text>
        <Text style={styles.dataLabel}>{label}</Text>
      </View>
    );

    if (discipline === 'batting') {
      return (
        <>
          <DataCard label="MAT" value={stats[recordType].matches} />
          <DataCard label="INNS" value={data.innings} />
          <DataCard label="NO" value={data.not_outs || 0} />
          <DataCard label="RUNS" value={data.runs} />
          <DataCard label="HS" value={data.highest} />
          <DataCard label="AVG" value={data.average} />
          <DataCard label="SR" value={data.sr.toFixed(2)} />
          <DataCard label="100S" value={data.hundreds} />
          <DataCard label="50S" value={data.fifties} />
          <DataCard label="4S" value={data.fours} />
          <DataCard label="DUCK" value={data.ducks || 0} />
          <DataCard label="WON" value={data.won || 0} />
          <DataCard label="LOST" value={data.lost || 0} />
        </>
      );
    }

    if (discipline === 'bowling') {
      return (
        <>
          <DataCard label="MAT" value={stats[recordType].matches} />
          <DataCard label="INNS" value={data.innings} />
          <DataCard label="WKTS" value={data.wickets} />
          <DataCard label="ECON" value={data.economy.toFixed(2)} />
          <DataCard label="OVERS" value={data.overs.toFixed(1)} />
          <DataCard label="SR" value={data.sr.toFixed(2)} />
          <DataCard label="AVG" value={data.average || '0.00'} />
          <DataCard label="RUNS" value={data.runs_conceded} />
          <DataCard label="5W" value={data.five_w || 0} />
          <DataCard label="BB" value={data.best} />
          <DataCard label="DOT %" value="-" />
        </>
      );
    }

    if (discipline === 'fielding') {
      return (
        <>
          <DataCard label="MAT" value={stats[recordType].matches} />
          <DataCard label="CATCHES" value={data.catches} />
          <DataCard label="STUMPS" value={data.stumpings} />
          <DataCard label="RUN OUTS" value={data.runouts} />
          <DataCard label="DR. HITS" value="0" />
        </>
      );
    }

    if (discipline === 'captain') {
      const capData = stats[recordType].captain;
      return (
        <>
          <DataCard label="MAT" value={capData.matches} />
          <DataCard label="WON" value={capData.wins} />
          <DataCard label="LOST" value={capData.losses} />
          <DataCard label="WIN %" value={capData.win_pc} />
          <DataCard label="TOSS WON" value="0" />
        </>
      );
    }

    return null;
  };

  const onTabPress = (tabId: string, index: number) => {
    setActiveTab(tabId);
    mainPagerRef.current?.scrollTo({ x: index * windowWidth, animated: true });
  };

  const onSubTabPress = (type: string, tabId: string, index: number) => {
    switch (type) {
      case 'stats':
        setStatsTab(tabId);
        statsPagerRef.current?.scrollTo({ x: index * windowWidth, animated: true });
        break;
      case 'trophies':
        setTrophiesTab(tabId);
        trophiesPagerRef.current?.scrollTo({ x: index * windowWidth, animated: true });
        break;
      case 'badges':
        setBadgesTab(tabId);
        badgesPagerRef.current?.scrollTo({ x: index * windowWidth, animated: true });
        break;
      case 'highlights':
        setHighlightsTab(tabId);
        highlightsPagerRef.current?.scrollTo({ x: index * windowWidth, animated: true });
        break;
      case 'connections':
        setConnectionsTab(tabId);
        connectionsPagerRef.current?.scrollTo({ x: index * windowWidth, animated: true });
        break;
    }
  };

  const onMainPagerScrollEnd = (e: any) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / windowWidth);
    if (TABS[index]) {
      setActiveTab(TABS[index].id);
    }
  };

  const onSubPagerScrollEnd = (type: string, e: any) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / windowWidth);
    
    let subTabs: any[] = [];
    switch (type) {
      case 'stats': 
        subTabs = [{ id: 'batting' }, { id: 'bowling' }, { id: 'fielding' }, { id: 'captain' }];
        if (subTabs[index]) setStatsTab(subTabs[index].id);
        break;
      case 'trophies':
        subTabs = [{ id: 'matches' }, { id: 'tournaments' }];
        if (subTabs[index]) setTrophiesTab(subTabs[index].id);
        break;
      case 'badges':
        subTabs = [{ id: 'batting' }, { id: 'bowling' }, { id: 'fielding' }];
        if (subTabs[index]) setBadgesTab(subTabs[index].id);
        break;
      case 'highlights':
        subTabs = [{ id: 'recent' }, { id: 'batting' }, { id: 'bowling' }];
        if (subTabs[index]) setHighlightsTab(subTabs[index].id);
        break;
      case 'connections':
        subTabs = [{ id: 'followers' }, { id: 'following' }];
        if (subTabs[index]) setConnectionsTab(subTabs[index].id);
        break;
    }
  };

  const renderQRModal = () => (
    <Modal
      visible={showQR}
      transparent
      animationType="slide"
      onRequestClose={() => setShowQR(false)}
    >
      <Pressable 
        style={styles.bottomSheetOverlay} 
        onPress={() => setShowQR(false)}
      >
        <View style={styles.bottomSheetInner}>
          <View style={styles.dragHandle} />
          
          <TouchableOpacity 
            style={styles.modalShareBtn}
            onPress={handleShare}
          >
            <Share2 size={20} color="#431043" />
          </TouchableOpacity>

          <View ref={qrRef} collapsable={false} style={styles.qrCaptureArea}>
            <View style={styles.qrAvatarWrapper}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.qrAvatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: '#431043' }]}>
                <Users size={24} color="#FFFFFF90" />
              </View>
            )}
          </View>
          
          <Text style={styles.qrTitle}>{profile?.full_name}</Text>
          <Text style={styles.qrSubTitle}>{profile?.address || 'Location not set'}</Text>
          
          <View style={styles.qrWrapper}>
            <QRCode
              value={`https://bookyourground.com/players/${id}`}
              size={180}
              color="#431043"
              backgroundColor="#FFFFFF"
            />
          </View>

          <Text style={styles.qrId}>REG. NO: {id?.toString().slice(0, 8).toUpperCase()}</Text>

          <TouchableOpacity 
            style={styles.compactShareBtn}
            onPress={handleShareQR}
          >
            <Share2 size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.compactShareBtnText}>Share QR Code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  </Modal>
);

  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const headerZIndex = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [0, 10],
    extrapolate: 'clamp',
  });

  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const profileInfoOpacity = scrollY.interpolate({
    inputRange: [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT) / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Mini Fixed Header (Always on Top) */}
      <View style={[styles.miniHeader, { height: HEADER_MIN_HEIGHT, paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#431043', '#d34681']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.miniHeaderContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Animated.View style={{ opacity: headerTitleOpacity, flex: 1, alignItems: 'center' }}>
            <Text style={styles.miniHeaderTitle}>{profile?.full_name}</Text>
          </Animated.View>

          <View style={styles.navRight}>
            <TouchableOpacity onPress={() => setShowQR(true)} style={styles.navBtn}>
              <QrCode size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.navBtn}>
              <Share2 size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 2. Parallax Background Content (Z-Index 1) */}
      <Animated.View 
        style={[
          styles.headerAnimatedContainer, 
          { 
            height: headerHeight,
            zIndex: 1,
            top: 0
          }
        ]}
      >
        <LinearGradient
          colors={['#431043', '#d34681']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Large Profile Info Block */}
        <Animated.View 
          style={[
            styles.headerContent, 
            { opacity: profileInfoOpacity, top: HEADER_MIN_HEIGHT }
          ]}
        >
          <View style={styles.playerMainRow}>
            <View style={styles.playerAvatarWrapper}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.playerAvatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Users size={32} color="#FFFFFF90" />
                </View>
              )}
            </View>
            <View style={styles.playerTextInfo}>
              <Text style={styles.playerName}>{profile?.full_name || 'Loading...'}</Text>
              <View style={styles.playerSubInfo}>
                <Text style={styles.playerLocation}>
                  {profile?.address || 'Location not set'}
                </Text>
                <View style={styles.dot} />
                <View style={styles.viewCount}>
                  <Text style={styles.viewCountText}>{profile?.views_count || 0} Views</Text>
                </View>
                <View style={styles.dot} />
                <View style={styles.viewCount}>
                  <Text style={styles.viewCountText}>{followerCount} Followers</Text>
                </View>
              </View>
              <Text style={styles.playerStyles}>
                {profile?.player_type || 'Player'}, {profile?.batting_style ? (profile.batting_style.includes('Right') ? 'RHB' : 'LHB') : 'N/A'}, {profile?.bowling_style || 'N/A'}
              </Text>
              <View style={styles.roleBadges}>
                <Text style={[styles.roleBadge, { color: '#fb923c' }]}>Classicist</Text>
                <View style={[styles.dot, { backgroundColor: '#FFFFFF60' }]} />
                <Text style={[styles.roleBadge, { color: '#a78bfa' }]}>Economist</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.followBtn, isFollowing && styles.followingBtn]} 
              onPress={handleFollow}
            >
              <UserPlus size={18} color={isFollowing ? '#FFFFFF' : '#fcd34d'} />
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.insightsBtn}>
              <BarChart2 size={18} color="#1e1b4b" />
              <Text style={styles.insightsBtnText}>Insights</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>

      {/* 3. Main Scrollable Content (Z-Index 5) */}
      <Animated.ScrollView 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        stickyHeaderIndices={[1]}
        style={{ marginTop: HEADER_MIN_HEIGHT }}
      >
        {/* Spacer for the expanded part of the header */}
        <View style={{ height: HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT }} />

        {/* Tab Selection + Sub-bar Container (Sticky) */}
        <View style={styles.stickyPillsContainer}>
          <View style={styles.tabBarContainer}>
            <ScrollView 
              ref={tabBarRef}
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabContentContainer}
              scrollEnabled={true}
            >
              {TABS.map((tab, idx) => (
                <TouchableOpacity 
                  key={tab.id} 
                  onPress={() => onTabPress(tab.id, idx)}
                  style={[styles.tabItem, activeTab === tab.id && styles.activeTabItem]}
                >
                  <Text style={[styles.tabLabel, activeTab === tab.id && styles.activeTabLabel]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          {/* Intelligent Sub-bar Injection */}
          {activeTab === 'matches' && (
            <View style={styles.stickySubBar}>
              <View style={styles.toggleContainer}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'played', label: 'Played' },
                ].map((chip) => (
                  <TouchableOpacity
                    key={chip.id}
                    onPress={() => setMatchFilter(chip.id)}
                    style={[
                      styles.toggleTab,
                      matchFilter === chip.id && styles.toggleTabActive
                    ]}
                  >
                    <Text style={[
                      styles.toggleLabel,
                      matchFilter === chip.id && styles.toggleLabelActive
                    ]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'stats' && (
            <View style={styles.stickySubBar}>
              <View style={styles.toggleContainer}>
                {[
                  { id: 'batting', label: 'Batting' },
                  { id: 'bowling', label: 'Bowling' },
                  { id: 'fielding', label: 'Fielding' },
                  { id: 'captain', label: 'Captain' },
                ].map((chip, idx) => (
                  <TouchableOpacity
                    key={chip.id}
                    onPress={() => onSubTabPress('stats', chip.id, idx)}
                    style={[
                      styles.toggleTab,
                      statsTab === chip.id && styles.toggleTabActive
                    ]}
                  >
                    <Text style={[
                      styles.toggleLabel,
                      statsTab === chip.id && styles.toggleLabelActive
                    ]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'trophies' && (
            <View style={styles.stickySubBar}>
              <View style={styles.toggleContainer}>
                {[
                  { id: 'matches', label: 'Matches' },
                  { id: 'tournaments', label: 'Tournaments' },
                ].map((chip, idx) => (
                  <TouchableOpacity
                    key={chip.id}
                    onPress={() => onSubTabPress('trophies', chip.id, idx)}
                    style={[
                      styles.toggleTab,
                      trophiesTab === chip.id && styles.toggleTabActive
                    ]}
                  >
                    <Text style={[
                      styles.toggleLabel,
                      trophiesTab === chip.id && styles.toggleLabelActive
                    ]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'badges' && (
            <View style={styles.stickySubBar}>
              <View style={styles.toggleContainer}>
                {[
                  { id: 'batting', label: 'Batting' },
                  { id: 'bowling', label: 'Bowling' },
                  { id: 'fielding', label: 'Fielding' },
                ].map((chip) => (
                  <TouchableOpacity
                    key={chip.id}
                    onPress={() => setBadgesTab(chip.id)}
                    style={[
                      styles.toggleTab,
                      badgesTab === chip.id && styles.toggleTabActive
                    ]}
                  >
                    <Text style={[
                      styles.toggleLabel,
                      badgesTab === chip.id && styles.toggleLabelActive
                    ]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'highlights' && (
            <View style={styles.stickySubBar}>
              <View style={styles.toggleContainer}>
                {[
                  { id: 'recent', label: 'Recent' },
                  { id: 'batting', label: 'Batting' },
                  { id: 'bowling', label: 'Bowling' },
                ].map((chip) => (
                  <TouchableOpacity
                    key={chip.id}
                    onPress={() => setHighlightsTab(chip.id)}
                    style={[
                      styles.toggleTab,
                      highlightsTab === chip.id && styles.toggleTabActive
                    ]}
                  >
                    <Text style={[
                      styles.toggleLabel,
                      highlightsTab === chip.id && styles.toggleLabelActive
                    ]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'connections' && (
            <View style={styles.stickySubBar}>
              <View style={styles.toggleContainer}>
                {[
                  { id: 'followers', label: 'Followers' },
                  { id: 'following', label: 'Following' },
                ].map((chip) => (
                  <TouchableOpacity
                    key={chip.id}
                    onPress={() => setConnectionsTab(chip.id)}
                    style={[
                      styles.toggleTab,
                      connectionsTab === chip.id && styles.toggleTabActive
                    ]}
                  >
                    <Text style={[
                      styles.toggleLabel,
                      connectionsTab === chip.id && styles.toggleLabelActive
                    ]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>




        {/* Tab Content Pager */}
        <View style={styles.mainPagerWrapper}>
          <ScrollView
            ref={mainPagerRef}
            horizontal
            pagingEnabled
            scrollEnabled={mainScrollEnabled}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMainPagerScrollEnd}
            scrollEventThrottle={16}
          >
            {/* Slide 1: Matches */}
            <View style={{ width: windowWidth }}>
              <View style={styles.tabSlideContent}>
                {(() => {
                  const filteredMatches = matches.filter(m => 
                    matchFilter === 'all' || playedMatchIds.includes(m.id)
                  );
                  return (filteredMatches && filteredMatches.length > 0) ? (
                    filteredMatches.map(renderMatchCard)
                  ) : (
                    <View style={styles.emptyState}>
                      <Clock size={48} color="#E2E8F0" />
                      <Text style={styles.emptyText}>
                        {matchFilter === 'all' ? 'No matches played yet' : 'No matches played by user yet'}
                      </Text>
                    </View>
                  );
                })()}
              </View>
            </View>

            {/* Slide 2: Stats */}
            <View style={{ width: windowWidth }}>
              <View style={styles.fullWidthSlide}>
                <ScrollView
                  ref={statsPagerRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScrollBeginDrag={onSubPagerBegin}
                  onScrollEndDrag={() => setMainScrollEnabled(true)}
                  onMomentumScrollEnd={(e) => onSubPagerEnd('stats', e)}
                >
                  {['batting', 'bowling', 'fielding', 'captain'].map((sub) => (
                    <View key={sub} style={{ width: windowWidth, paddingHorizontal: 16 }}>
                      <View style={styles.statsContainer}>
                        {['overall', 'leather', 'tennis', 'other'].map((recordType, index) => (
                          <View key={recordType}>
                            {index > 0 && <View style={styles.recordDivider} />}
                            <View style={styles.recordSection}>
                              <View style={styles.recordTitleRow}>
                                <View style={[styles.titleDot, { backgroundColor: recordType === 'overall' ? '#1e2030' : (recordType === 'leather' ? '#ef4444' : (recordType === 'tennis' ? '#01b854' : '#f59e0b')) }]} />
                                <Text style={styles.recordTitle}>
                                  {recordType.charAt(0).toUpperCase() + recordType.slice(1)} Ball Records
                                </Text>
                              </View>
                              <View style={styles.statsGrid}>
                                {renderStatsGrid(recordType, sub)}
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Slide 3: Trophies */}
            <View style={{ width: windowWidth }}>
              <View style={styles.fullWidthSlide}>
                <ScrollView
                  ref={trophiesPagerRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScrollBeginDrag={onSubPagerBegin}
                  onScrollEndDrag={() => setMainScrollEnabled(true)}
                  onMomentumScrollEnd={(e) => onSubPagerEnd('trophies', e)}
                >
                  {['matches', 'tournaments'].map((sub) => (
                    <View key={sub} style={{ width: windowWidth, paddingHorizontal: 16 }}>
                      <View style={styles.emptyState}>
                        <Trophy size={48} color="#E2E8F0" />
                        <Text style={styles.emptyText}>No {sub} trophies won yet</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Slide 4: Badges */}
            <View style={{ width: windowWidth }}>
              <View style={styles.fullWidthSlide}>
                <ScrollView
                  ref={badgesPagerRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScrollBeginDrag={onSubPagerBegin}
                  onScrollEndDrag={() => setMainScrollEnabled(true)}
                  onMomentumScrollEnd={(e) => onSubPagerEnd('badges', e)}
                >
                  {['batting', 'bowling', 'fielding'].map((sub) => (
                    <View key={sub} style={{ width: windowWidth, paddingHorizontal: 16 }}>
                      <View style={styles.emptyState}>
                        <Award size={48} color="#E2E8F0" />
                        <Text style={styles.emptyText}>No {sub} badges earned yet</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Slide 5: Teams */}
            <View style={{ width: windowWidth }}>
              <View style={styles.tabSlideContent}>
                {teams.length > 0 ? (
                  teams.map(renderTeamCard)
                ) : (
                  <View style={styles.emptyState}>
                    <Users size={48} color="#E2E8F0" />
                    <Text style={styles.emptyText}>No teams joined yet</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Slide 6: Highlights */}
            <View style={{ width: windowWidth }}>
              <View style={styles.fullWidthSlide}>
                <ScrollView
                  ref={highlightsPagerRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScrollBeginDrag={onSubPagerBegin}
                  onScrollEndDrag={() => setMainScrollEnabled(true)}
                  onMomentumScrollEnd={(e) => onSubPagerEnd('highlights', e)}
                >
                  {['recent', 'batting', 'bowling'].map((sub) => (
                    <View key={sub} style={{ width: windowWidth, paddingHorizontal: 16 }}>
                      <View style={styles.highlightsGrid}>
                        {[
                          {
                            id: 'h1',
                            title: 'Stunning Cover Drive for Four',
                            thumbnail: 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg',
                            duration: '0:15',
                            views: '1.2K',
                            date: '2d ago'
                          },
                          {
                            id: 'h2',
                            title: 'Wicket: Perfect Yorker dismissal',
                            thumbnail: 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg',
                            duration: '0:22',
                            views: '850',
                            date: '5d ago'
                          }
                        ].map(renderHighlightCard)}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Slide 7: Photos */}
            <View style={{ width: windowWidth }}>
              <View style={styles.tabSlideContent}>
                <View style={styles.photosGrid}>
                  {[
                    { id: 'p1', url: 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg' },
                    { id: 'p2', url: 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg' },
                    { id: 'p3', url: 'https://images.pexels.com/photos/3760259/pexels-photo-3760259.jpeg' }
                  ].map((photo) => (
                    <TouchableOpacity key={photo.id} style={styles.photoTile}>
                      <Image source={{ uri: photo.url }} style={styles.photoImage} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Slide 8: Connections */}
            <View style={{ width: windowWidth }}>
              <View style={styles.fullWidthSlide}>
                <ScrollView
                  ref={connectionsPagerRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScrollBeginDrag={onSubPagerBegin}
                  onScrollEndDrag={() => setMainScrollEnabled(true)}
                  onMomentumScrollEnd={(e) => onSubPagerEnd('connections', e)}
                >
                  {['followers', 'following'].map((sub) => (
                    <View key={sub} style={{ width: windowWidth, paddingHorizontal: 16 }}>
                      <View style={styles.emptyState}>
                        <Users size={48} color="#E2E8F0" />
                        <Text style={styles.emptyText}>No {sub} yet</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Slide 9: Profile Details */}
            <View style={{ width: windowWidth }}>
              <View style={styles.tabSlideContent}>
                <View style={styles.profileDetailsCard}>
                  <Text style={styles.sectionTitle}>Personal Details</Text>
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Age</Text>
                      <Text style={styles.detailValue}>{profile?.age || 'N/A'} Years</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Locality</Text>
                      <Text style={styles.detailValue}>{profile?.city || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Batting Style</Text>
                      <Text style={styles.detailValue}>{profile?.batting_style || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Bowling Style</Text>
                      <Text style={styles.detailValue}>{profile?.bowling_style || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Playing Role</Text>
                      <Text style={styles.detailValue}>{profile?.player_type || 'N/A'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
        
        <View style={{ height: 100 }} />
      </Animated.ScrollView>
      {renderQRModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#431043',
    justifyContent: 'center',
    alignItems: 'center'
  },
  miniHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
  },
  miniHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerAnimatedContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#431043',
    overflow: 'hidden',
    zIndex: 1,
  },
  miniHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  headerContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  playerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  playerAvatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
    marginRight: 16,
  },
  stickyPillsContainer: {
    backgroundColor: '#FFFFFF',
    zIndex: 5,
  },
  stickySubBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerAvatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerTextInfo: {
    flex: 1,
  },
  playerName: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  playerSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  playerLocation: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Inter',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    marginHorizontal: 8,
  },
  viewCountText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Inter',
  },
  playerStyles: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'Inter',
    fontWeight: '500',
    marginBottom: 6,
  },
  roleBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  followBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d60',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  followBtnText: {
    color: '#fcd34d',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  followingBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'transparent',
  },
  followingBtnText: {
    color: '#FFFFFF',
  },
  insightsBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fbbf24',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  navRight: {
    flexDirection: 'row',
    gap: 12,
  },
  insightsBtnText: {
    color: '#1e1b4b',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Inter',
  },
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabContentContainer: {
    paddingHorizontal: 16,
    gap: 20,
  },
  tabItem: {
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: '#431043',
  },
  tabLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '400',
    fontFamily: 'Inter',
  },
  activeTabLabel: {
    color: '#431043',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 24,
    backgroundColor: '#f8fafc',
  },
  matchesList: {
    gap: 16,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  matchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  matchType: {
    fontSize: 14,
    color: '#94A3B8',
    fontFamily: 'Inter',
    fontWeight: '500',
    marginBottom: 2,
  },
  teamCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  teamCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamLogoWrapper: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  teamLogo: {
    width: '100%',
    height: '100%',
  },
  teamLogoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamMainInfo: {
    marginLeft: 14,
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  teamMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teamCity: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'Inter',
  },
  teamCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamStatsMini: {
    alignItems: 'center',
  },
  teamStatsValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    fontFamily: 'Inter',
  },
  teamStatsLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  teamStatsDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#F1F5F9',
  },
  highlightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  highlightCard: {
    width: (Dimensions.get('window').width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  thumbnailWrapper: {
    width: '100%',
    aspectRatio: 1.5,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  highlightMeta: {
    padding: 10,
  },
  highlightTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'Inter',
    lineHeight: 18,
    marginBottom: 6,
  },
  highlightBottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  highlightViewCount: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'Inter',
  },
  dotMini: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 6,
  },
  highlightDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'Inter',
  },
  connectionsList: {
    gap: 12,
  },
  connectionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  connectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  connectionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  connectionMainInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'Inter',
  },
  connectionRole: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  followBtnMini: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  followBtnMiniText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#431043',
    fontFamily: 'Inter',
  },
  photosWrapper: {
    paddingTop: 10,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoTile: {
    width: (Dimensions.get('window').width - 56) / 3,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  addPhotoTile: {
    width: (Dimensions.get('window').width - 56) / 3,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  addPhotoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 4,
    fontFamily: 'Inter',
  },
  photoCountText: {
    fontSize: 10,
    color: '#CBD5E1',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  profileDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e1b4b',
    fontFamily: 'Inter',
    marginBottom: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%',
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'Inter',
  },
  aboutSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  aboutText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    fontFamily: 'Inter',
  },
  matchMeta: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resultBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Inter',
  },
  matchScoreRow: {
    marginBottom: 6,
  },
  teamScoreInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchTeamName: {
    fontSize: 15,
    color: '#475569',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  matchTeamScore: {
    fontSize: 15,
    color: '#1e293b',
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  matchResultText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    fontFamily: 'Inter',
    marginTop: 4,
    marginBottom: 12,
  },
  matchCardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    gap: 16,
    justifyContent: 'flex-end',
  },
  footerLink: {
  },
  footerLinkText: {
    fontSize: 12,
    color: '#d97706',
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    fontFamily: 'Inter',
  },
  comingSoon: {
    alignItems: 'center',
    paddingVertical: 100,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  statsContainer: {
    gap: 16,
  },
  toggleWrapper: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 0,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    width: '100%',
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  toggleLabelActive: {
    color: '#1e1b4b',
    fontFamily: 'Inter',
  },
  recordSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  recordDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginVertical: 20,
    opacity: 0.5,
  },
  recordTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  titleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1e2030',
    fontFamily: 'Inter',
    letterSpacing: -0.5,
  },
  noDataNote: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'Inter',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dataCard: {
    width: (windowWidth - 32 - 32 - 20) / 3, // (Available width [windowWidth-32 outer -32 inner] - 2 gaps) / 3
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dataValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Inter',
  },
  dataLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetInner: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: Platform.OS === 'ios' ? 80 : 60,
    minHeight: 500,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalShareBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  qrCaptureArea: {
    paddingHorizontal: 30,
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
  },
  qrAvatarWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  qrAvatar: {
    width: '100%',
    height: '100%',
  },
  qrTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#431043',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  qrSubTitle: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter',
    textAlign: 'center',
    marginBottom: 24,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
  },
  qrId: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'Inter',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 24,
  },
  compactShareBtn: {
    width: 200,
    height: 44,
    backgroundColor: '#431043',
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#431043',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  compactShareBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  mainPagerWrapper: {
    width: windowWidth,
    overflow: 'hidden',
  },
  tabSlideContent: {
    width: windowWidth,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  fullWidthSlide: {
    width: windowWidth,
    paddingBottom: 24,
  },
  statsTabInner: {
    width: windowWidth,
  },
});
