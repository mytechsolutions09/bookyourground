import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Dimensions,
  ActivityIndicator,
  Platform,
  Alert,
  Share,
  TextInput
} from 'react-native';
import { 
  ChevronLeft, 
  Search, 
  HelpCircle, 
  Share2,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

const TABS = ['Batting', 'Bowling', 'Compare', 'Face Off'];

export default function CricketInsights() {
  const router = useRouter();
  const { playerId: paramPlayerId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const playerId = (paramPlayerId as string) || user?.id;

  const [activeTab, setActiveTab] = useState('Batting');
  const [profile, setProfile] = useState<any>(null);
  const [playerTeamNames, setPlayerTeamNames] = useState<string[]>([]);
  const [battingStats, setBattingStats] = useState<any[]>([]);
  const [bowlingStats, setBowlingStats] = useState<any[]>([]);
  const [leaderboardStats, setLeaderboardStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [compareProfile, setCompareProfile] = useState<any>(null);
  const [compareStats, setCompareStats] = useState<any>(null);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchupStats1, setMatchupStats1] = useState<any>(null);
  const [matchupStats2, setMatchupStats2] = useState<any>(null);

  useEffect(() => {
    if (playerId) {
      loadData();
    }
  }, [playerId]);

  useEffect(() => {
    if (activeTab === 'Compare' || activeTab === 'Face Off') {
      loadAllPlayers();
    }
  }, [activeTab]);

  useEffect(() => {
    if ((activeTab === 'Compare' || activeTab === 'Face Off') && compareProfile && !matchupStats1) {
      loadMatchupStats(compareProfile);
    }
  }, [activeTab, compareProfile]);

  const loadData = async () => {
    if (!playerId) return;
    setLoading(true);
    try {
      // 1. Fetch Profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', playerId)
        .single();
      setProfile(prof);

      // 1.5 Fetch player team memberships
      const { data: tmData } = await supabase
        .from('team_members')
        .select('team_id, teams(name)')
        .eq('profile_id', playerId);

      const teamNames = tmData
        ?.map(tm => (tm.teams as any)?.name)
        .filter((name): name is string => typeof name === 'string') || [];
      setPlayerTeamNames(teamNames);

      // 2. Fetch Batting Stats (Last 5)
      const { data: bStats } = await supabase
        .from('player_match_batting_stats')
        .select('*')
        .eq('profile_id', playerId)
        .order('created_at', { ascending: false })
        .limit(5);
      setBattingStats(bStats || []);

      // 3. Fetch Bowling Stats (Last 5)
      const { data: boStats } = await supabase
        .from('player_match_bowling_stats')
        .select('*')
        .eq('profile_id', playerId)
        .order('created_at', { ascending: false })
        .limit(5);
      setBowlingStats(boStats || []);

      // 4. Fetch Overall Leaderboard Stats
      const { data: lbData } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('member_id', playerId)
        .maybeSingle();
      setLeaderboardStats(lbData);

    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBattingInsights = () => {
    if (leaderboardStats) {
      const outs = leaderboardStats.innings_batted - (leaderboardStats.not_outs || 0);
      const avg = outs > 0 ? (leaderboardStats.total_runs / outs).toFixed(2) : (leaderboardStats.total_runs || 0).toFixed(2);
      return { 
        totalRuns: leaderboardStats.total_runs || 0, 
        fifties: leaderboardStats.fifties || 0, 
        notOuts: leaderboardStats.not_outs || 0, 
        avg: avg, 
        sr: leaderboardStats.strike_rate || '0.00',
        innings: leaderboardStats.innings_batted || 0
      };
    }
    
    if (battingStats.length === 0) return { totalRuns: 0, fifties: 0, notOuts: 0, avg: '0.00', sr: '0.00', innings: 0 };
    
    const totalRuns = battingStats.reduce((sum, s) => sum + (s.runs || 0), 0);
    const totalBalls = battingStats.reduce((sum, s) => sum + (s.balls || 0), 0);
    const outs = battingStats.filter(s => s.is_out).length;
    const fifties = battingStats.filter(s => s.runs >= 50 && s.runs < 100).length;
    const notOuts = battingStats.length - outs;
    
    const avg = outs > 0 ? (totalRuns / outs).toFixed(2) : totalRuns.toFixed(2);
    const sr = totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(2) : '0.00';

    return { totalRuns, fifties, notOuts, avg, sr, innings: battingStats.length };
  };

  const calculateBowlingInsights = () => {
    if (leaderboardStats) {
      return { 
        totalWickets: leaderboardStats.total_wickets || 0, 
        bestBowling: `${leaderboardStats.best_bowling_wickets || 0}/${leaderboardStats.best_bowling_runs || 0}`, 
        avg: leaderboardStats.total_wickets > 0 ? (leaderboardStats.best_bowling_runs / leaderboardStats.total_wickets).toFixed(2) : '0.00', 
        econ: leaderboardStats.economy_rate || '0.00',
        innings: leaderboardStats.innings_bowled || 0
      };
    }

    if (bowlingStats.length === 0) return { totalWickets: 0, bestBowling: '-', avg: '0.00', econ: '0.00', innings: 0 };
    
    const totalWickets = bowlingStats.reduce((sum, s) => sum + (s.wickets || 0), 0);
    const totalRuns = bowlingStats.reduce((sum, s) => sum + (s.runs_conceded || 0), 0);
    const totalBalls = bowlingStats.reduce((sum, s) => sum + (s.legal_balls || 0), 0);
    
    const bestMatch = [...bowlingStats].sort((a, b) => {
      if (b.wickets !== a.wickets) return b.wickets - a.wickets;
      return a.runs_conceded - b.runs_conceded;
    })[0];

    const bestBowling = bestMatch ? `${bestMatch.wickets}/${bestMatch.runs_conceded}` : '-';
    const econ = totalBalls > 0 ? ((totalRuns / (totalBalls / 6))).toFixed(2) : '0.00';
    const avg = totalWickets > 0 ? (totalRuns / totalWickets).toFixed(2) : '0.00';

    return { totalWickets, bestBowling, avg, econ, innings: bowlingStats.length };
  };

  const battingInsights = calculateBattingInsights();
  const bowlingInsights = calculateBowlingInsights();

  const renderMatchTitle = (item: any) => {
    const matchTitle = item.match_title || '';
    const parts = matchTitle.split(/(\s+vs\s+)/i);
    
    if (parts.length < 3) {
      return <Text style={styles.matchText} numberOfLines={1}>{matchTitle}</Text>;
    }

    const team1 = parts[0];
    const vsSeparator = parts[1];
    const team2 = parts[2];

    const isTeam1Player = playerTeamNames.some(t => t.toLowerCase() === team1.toLowerCase().trim()) || 
                          (profile?.full_name && team1.toLowerCase().includes(profile.full_name.toLowerCase()));
    const isTeam2Player = playerTeamNames.some(t => t.toLowerCase() === team2.toLowerCase().trim()) || 
                          (profile?.full_name && team2.toLowerCase().includes(profile.full_name.toLowerCase()));

    let t1Color = '#01b854';
    let t2Color = '#FFFFFF';

    if (isTeam1Player) {
      t1Color = '#01b854';
      t2Color = '#FFFFFF';
    } else if (isTeam2Player) {
      t1Color = '#FFFFFF';
      t2Color = '#01b854';
    } else {
      const isTeamA = playerTeamNames.some(t => t.toLowerCase() === (item.team_a || '').toLowerCase().trim());
      const isTeamB = playerTeamNames.some(t => t.toLowerCase() === (item.team_b || '').toLowerCase().trim());
      if (isTeamA) {
        if (matchTitle.toLowerCase().startsWith((item.team_a || '').toLowerCase())) {
          t1Color = '#01b854';
          t2Color = '#FFFFFF';
        } else {
          t1Color = '#FFFFFF';
          t2Color = '#01b854';
        }
      } else if (isTeamB) {
        if (matchTitle.toLowerCase().endsWith((item.team_b || '').toLowerCase())) {
          t1Color = '#FFFFFF';
          t2Color = '#01b854';
        } else {
          t1Color = '#01b854';
          t2Color = '#FFFFFF';
        }
      }
    }

    return (
      <Text numberOfLines={1}>
        <Text style={[styles.matchText, { color: t1Color }]}>{team1}</Text>
        <Text style={[styles.matchText, { color: '#94A3B8' }]}>{vsSeparator}</Text>
        <Text style={[styles.matchText, { color: t2Color }]}>{team2}</Text>
      </Text>
    );
  };

  const formatName = (name: string) => {
    if (!name) return 'Player';
    return name.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' ');
  };

  const handleHelpPress = () => {
    if (Platform.OS === 'web') {
      alert("Current Form shows the performance statistics of the player's last 5 match innings.");
    } else {
      Alert.alert("Current Form Info", "This section displays the detailed performance statistics of the player's last 5 match innings.");
    }
  };

  const handleSharePress = async () => {
    try {
      const shareUrl = Platform.OS === 'web' ? window.location.href : `https://bookyourground.com/cricket/insights?playerId=${playerId}`;
      await Share.share({
        message: `Check out ${profile?.full_name || 'Player'}'s cricket insights on Book Your Ground!\n\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (error: any) {
      console.error('Error sharing insights:', error);
    }
  };

  const loadAllPlayers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, player_type')
        .neq('id', playerId)
        .limit(10);
      setAllPlayers(data || []);
    } catch (err) {
      console.error('Error fetching profiles for comparison:', err);
    }
  };

  const handleSearchPlayer = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      loadAllPlayers();
      return;
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, player_type')
        .neq('id', playerId)
        .ilike('full_name', `%${text}%`)
        .limit(10);
      setAllPlayers(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateMatchupStats = (matchupLogs: any[]) => {
    if (!matchupLogs || matchupLogs.length === 0) {
      return { runs: 0, balls: 0, dismissals: 0, fours: 0, sixes: 0, dots: 0, sr: '0.00' };
    }
    
    const runs = matchupLogs.reduce((sum, b) => sum + (b.runs || 0), 0);
    const legalBalls = matchupLogs.filter(b => b.extra_type !== 'wide').length;
    const dismissals = matchupLogs.filter(b => b.is_wicket && b.dismissal_type !== 'run_out' && b.dismissal_type !== 'retired_hurt').length;
    const fours = matchupLogs.filter(b => b.runs === 4).length;
    const sixes = matchupLogs.filter(b => b.runs === 6).length;
    const dots = matchupLogs.filter(b => b.runs === 0 && !b.extra_type).length;
    const sr = legalBalls > 0 ? ((runs / legalBalls) * 100).toFixed(2) : '0.00';

    return { runs, balls: legalBalls, dismissals, fours, sixes, dots, sr };
  };

  const loadMatchupStats = async (player: any) => {
    if (!profile || !player) return;
    try {
      const [logs1Res, logs2Res] = await Promise.all([
        supabase
          .from('ball_log')
          .select('*')
          .ilike('batter_name', `%${profile.full_name}%`)
          .ilike('bowler_name', `%${player.full_name}%`),
        supabase
          .from('ball_log')
          .select('*')
          .ilike('batter_name', `%${player.full_name}%`)
          .ilike('bowler_name', `%${profile.full_name}%`)
      ]);

      const stats1 = calculateMatchupStats(logs1Res.data || []);
      const stats2 = calculateMatchupStats(logs2Res.data || []);

      setMatchupStats1(stats1);
      setMatchupStats2(stats2);
    } catch (err) {
      console.error('Error loading matchup stats:', err);
    }
  };

  const selectComparePlayer = async (player: any) => {
    setCompareProfile(player);
    try {
      const [bRes, boRes, lbRes] = await Promise.all([
        supabase
          .from('player_match_batting_stats')
          .select('*')
          .eq('profile_id', player.id)
          .limit(5),
        supabase
          .from('player_match_bowling_stats')
          .select('*')
          .eq('profile_id', player.id)
          .limit(5),
        supabase
          .from('leaderboard')
          .select('*')
          .eq('member_id', player.id)
          .maybeSingle()
      ]);

      const bStats = bRes.data || [];
      const boStats = boRes.data || [];
      const lbStats = lbRes.data;

      let batting = { totalRuns: 0, fifties: 0, notOuts: 0, avg: '0.00', sr: '0.00', innings: 0 };
      if (lbStats) {
        const outs = lbStats.innings_batted - (lbStats.not_outs || 0);
        batting = {
          totalRuns: lbStats.total_runs || 0,
          fifties: lbStats.fifties || 0,
          notOuts: lbStats.not_outs || 0,
          avg: outs > 0 ? (lbStats.total_runs / outs).toFixed(2) : (lbStats.total_runs || 0).toFixed(2),
          sr: lbStats.strike_rate || '0.00',
          innings: lbStats.innings_batted || 0
        };
      } else if (bStats.length > 0) {
        const totalRuns = bStats.reduce((sum, s) => sum + (s.runs || 0), 0);
        const totalBalls = bStats.reduce((sum, s) => sum + (s.balls || 0), 0);
        const outs = bStats.filter(s => s.is_out).length;
        const fifties = bStats.filter(s => s.runs >= 50 && s.runs < 100).length;
        batting = {
          totalRuns,
          fifties,
          notOuts: bStats.length - outs,
          avg: outs > 0 ? (totalRuns / outs).toFixed(2) : totalRuns.toFixed(2),
          sr: totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(2) : '0.00',
          innings: bStats.length
        };
      }

      let bowling = { totalWickets: 0, bestBowling: '-', econ: '0.00', avg: '0.00', innings: 0 };
      if (lbStats) {
        bowling = {
          totalWickets: lbStats.total_wickets || 0,
          bestBowling: `${lbStats.best_bowling_wickets || 0}/${lbStats.best_bowling_runs || 0}`,
          econ: lbStats.economy_rate || '0.00',
          avg: lbStats.total_wickets > 0 ? (lbStats.best_bowling_runs / lbStats.total_wickets).toFixed(2) : '0.00',
          innings: lbStats.innings_bowled || 0
        };
      } else if (boStats.length > 0) {
        const totalWickets = boStats.reduce((sum, s) => sum + (s.wickets || 0), 0);
        const totalRuns = boStats.reduce((sum, s) => sum + (s.runs_conceded || 0), 0);
        const totalBalls = boStats.reduce((sum, s) => sum + (s.legal_balls || 0), 0);
        const bestMatch = [...boStats].sort((a, b) => {
          if (b.wickets !== a.wickets) return b.wickets - a.wickets;
          return a.runs_conceded - b.runs_conceded;
        })[0];
        bowling = {
          totalWickets,
          bestBowling: bestMatch ? `${bestMatch.wickets}/${bestMatch.runs_conceded}` : '-',
          econ: totalBalls > 0 ? ((totalRuns / (totalBalls / 6))).toFixed(2) : '0.00',
          avg: totalWickets > 0 ? (totalRuns / totalWickets).toFixed(2) : '0.00',
          innings: boStats.length
        };
      }

      setCompareStats({ batting, bowling });
      await loadMatchupStats(player);

    } catch (err) {
      console.error('Error fetching comparison stats:', err);
    }
  };

  const renderCompareSection = () => (
    <View style={styles.compareSection}>
      {!compareProfile ? (
        <View style={styles.selectPlayerContainer}>
          <Text style={styles.compareTitle}>Compare Head-to-Head</Text>
          <Text style={styles.compareSubtitle}>Select another player to compare key performance indicators.</Text>
          
          <View style={styles.searchBarWrapper}>
            <TextInput
              style={styles.compareSearchInput}
              value={searchQuery}
              onChangeText={handleSearchPlayer}
              placeholder="Search player name..."
              placeholderTextColor="#94A3B8"
            />
          </View>

          <ScrollView style={styles.playersList} nestedScrollEnabled>
            {allPlayers.length > 0 ? allPlayers.map((p) => (
              <TouchableOpacity 
                key={p.id} 
                style={styles.playerSearchRow}
                onPress={() => selectComparePlayer(p)}
              >
                <Image 
                  source={p.avatar_url ? { uri: p.avatar_url } : require('../../assets/avatar.png')} 
                  style={styles.playerSearchAvatar}
                />
                <View style={styles.playerSearchInfo}>
                  <Text style={styles.playerSearchName}>{p.full_name}</Text>
                  <Text style={styles.playerSearchRole}>{p.player_type || 'Cricket Player'}</Text>
                </View>
                <View style={styles.selectBtn}>
                  <Text style={styles.selectBtnText}>Compare</Text>
                </View>
              </TouchableOpacity>
            )) : (
              <View style={styles.emptySearch}>
                <Text style={styles.emptySearchText}>No other players found</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.comparisonContainer}>
          <View style={styles.comparisonHeaderRow}>
            <View style={styles.comparePlayerHeaderBox}>
              <Image 
                source={profile?.avatar_url ? { uri: profile.avatar_url } : require('../../assets/avatar.png')} 
                style={styles.compareHeaderAvatar}
              />
              <Text style={styles.compareHeaderName} numberOfLines={1}>
                {formatName(profile?.full_name)}
              </Text>
            </View>

            <View style={styles.vsBadgeContainer}>
              <Text style={styles.vsBadgeText}>VS</Text>
            </View>

            <View style={styles.comparePlayerHeaderBox}>
              <Image 
                source={compareProfile.avatar_url ? { uri: compareProfile.avatar_url } : require('../../assets/avatar.png')} 
                style={styles.compareHeaderAvatar}
              />
              <Text style={styles.compareHeaderName} numberOfLines={1}>
                {formatName(compareProfile.full_name)}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.changePlayerBtn}
            onPress={() => {
              setCompareProfile(null);
              setCompareStats(null);
            }}
          >
            <Text style={styles.changePlayerBtnText}>Change Player</Text>
          </TouchableOpacity>

          {compareStats && (
            <View style={styles.metricsTable}>
              <Text style={styles.metricSectionHeader}>Batting Head-to-Head</Text>

              {(() => {
                const MetricRow = ({ label, val1, val2, higherBetter = true }: { label: string, val1: number | string, val2: number | string, higherBetter?: boolean }) => {
                  const num1 = parseFloat(val1.toString()) || 0;
                  const num2 = parseFloat(val2.toString()) || 0;
                  const isEqu = num1 === num2;
                  const is1Better = higherBetter ? num1 > num2 : num1 < num2;
                  
                  return (
                    <View style={styles.metricComparisonRow}>
                      <Text style={[styles.metricValue, { color: isEqu ? '#FFFFFF' : (is1Better ? '#01b854' : '#94A3B8'), fontWeight: is1Better ? '700' : '400' }]}>
                        {val1}
                      </Text>
                      <Text style={styles.metricLabel}>{label}</Text>
                      <Text style={[styles.metricValue, { textAlign: 'right', color: isEqu ? '#FFFFFF' : (!is1Better ? '#01b854' : '#94A3B8'), fontWeight: !is1Better ? '700' : '400' }]}>
                        {val2}
                      </Text>
                    </View>
                  );
                };

                return (
                  <>
                    <MetricRow label="Innings" val1={battingInsights.innings} val2={compareStats.batting.innings} />
                    <MetricRow label="Runs" val1={battingInsights.totalRuns} val2={compareStats.batting.totalRuns} />
                    <MetricRow label="Average" val1={battingInsights.avg} val2={compareStats.batting.avg} />
                    <MetricRow label="Strike Rate" val1={battingInsights.sr} val2={compareStats.batting.sr} />
                    <MetricRow label="Fifties" val1={battingInsights.fifties} val2={compareStats.batting.fifties} />
                    
                    <Text style={[styles.metricSectionHeader, { marginTop: 24 }]}>Bowling Head-to-Head</Text>
                    
                    <MetricRow label="Innings" val1={bowlingInsights.innings} val2={compareStats.bowling.innings} />
                    <MetricRow label="Wickets" val1={bowlingInsights.totalWickets} val2={compareStats.bowling.totalWickets} />
                    <MetricRow label="Economy" val1={bowlingInsights.econ} val2={compareStats.bowling.econ} higherBetter={false} />
                    <MetricRow label="Average" val1={bowlingInsights.avg} val2={compareStats.bowling.avg} higherBetter={false} />
                  </>
                );
              })()}
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderFaceOffSection = () => (
    <View style={styles.compareSection}>
      {!compareProfile ? (
        <View style={styles.selectPlayerContainer}>
          <Text style={styles.compareTitle}>Face-Off Battle</Text>
          <Text style={styles.compareSubtitle}>Select another player to see your head-to-head match statistics.</Text>
          
          <View style={styles.searchBarWrapper}>
            <TextInput
              style={styles.compareSearchInput}
              value={searchQuery}
              onChangeText={handleSearchPlayer}
              placeholder="Search player name..."
              placeholderTextColor="#94A3B8"
            />
          </View>

          <ScrollView style={styles.playersList} nestedScrollEnabled>
            {allPlayers.length > 0 ? allPlayers.map((p) => (
              <TouchableOpacity 
                key={p.id} 
                style={styles.playerSearchRow}
                onPress={() => selectComparePlayer(p)}
              >
                <Image 
                  source={p.avatar_url ? { uri: p.avatar_url } : require('../../assets/avatar.png')} 
                  style={styles.playerSearchAvatar}
                />
                <View style={styles.playerSearchInfo}>
                  <Text style={styles.playerSearchName}>{p.full_name}</Text>
                  <Text style={styles.playerSearchRole}>{p.player_type || 'Cricket Player'}</Text>
                </View>
                <View style={styles.selectBtn}>
                  <Text style={styles.selectBtnText}>Compare</Text>
                </View>
              </TouchableOpacity>
            )) : (
              <View style={styles.emptySearch}>
                <Text style={styles.emptySearchText}>No other players found</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.comparisonContainer}>
          <View style={styles.comparisonHeaderRow}>
            <View style={styles.comparePlayerHeaderBox}>
              <Image 
                source={profile?.avatar_url ? { uri: profile.avatar_url } : require('../../assets/avatar.png')} 
                style={styles.compareHeaderAvatar}
              />
              <Text style={styles.compareHeaderName} numberOfLines={1}>
                {formatName(profile?.full_name)}
              </Text>
            </View>

            <View style={styles.vsBadgeContainer}>
              <Text style={styles.vsBadgeText}>VS</Text>
            </View>

            <View style={styles.comparePlayerHeaderBox}>
              <Image 
                source={compareProfile.avatar_url ? { uri: compareProfile.avatar_url } : require('../../assets/avatar.png')} 
                style={styles.compareHeaderAvatar}
              />
              <Text style={styles.compareHeaderName} numberOfLines={1}>
                {formatName(compareProfile.full_name)}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.changePlayerBtn}
            onPress={() => {
              setCompareProfile(null);
              setCompareStats(null);
              setMatchupStats1(null);
              setMatchupStats2(null);
            }}
          >
            <Text style={styles.changePlayerBtnText}>Change Player</Text>
          </TouchableOpacity>

          <View style={styles.metricsTable}>
            <Text style={styles.metricSectionHeader}>
              {formatName(profile?.full_name)} (Bat) vs {formatName(compareProfile.full_name)} (Bowl)
            </Text>
            
            {matchupStats1 ? (
              <>
                <View style={styles.matchupGrid}>
                  <View style={styles.matchupStatBox}>
                    <Text style={styles.matchupStatVal}>{matchupStats1.runs}</Text>
                    <Text style={styles.matchupStatLbl}>Runs</Text>
                  </View>
                  <View style={styles.matchupStatBox}>
                    <Text style={styles.matchupStatVal}>{matchupStats1.balls}</Text>
                    <Text style={styles.matchupStatLbl}>Balls</Text>
                  </View>
                  <View style={styles.matchupStatBox}>
                    <Text style={styles.matchupStatVal}>{matchupStats1.sr}</Text>
                    <Text style={styles.matchupStatLbl}>S/R</Text>
                  </View>
                  <View style={styles.matchupStatBox}>
                    <Text style={[styles.matchupStatVal, { color: matchupStats1.dismissals > 0 ? '#EF5350' : '#01b854' }]}>
                      {matchupStats1.dismissals}
                    </Text>
                    <Text style={styles.matchupStatLbl}>Outs</Text>
                  </View>
                </View>
                <View style={[styles.matchupGrid, { marginTop: 10 }]}>
                  <View style={styles.matchupStatBox}>
                    <Text style={styles.matchupStatVal}>{matchupStats1.fours}</Text>
                    <Text style={styles.matchupStatLbl}>4s</Text>
                  </View>
                  <View style={styles.matchupStatBox}>
                    <Text style={styles.matchupStatVal}>{matchupStats1.sixes}</Text>
                    <Text style={styles.matchupStatLbl}>6s</Text>
                  </View>
                  <View style={styles.matchupStatBox}>
                    <Text style={styles.matchupStatVal}>{matchupStats1.dots}</Text>
                    <Text style={styles.matchupStatLbl}>Dots</Text>
                  </View>
                </View>
              </>
            ) : (
              <ActivityIndicator size="small" color="#01b854" style={{ marginVertical: 20 }} />
            )}

            <Text style={[styles.metricSectionHeader, { marginTop: 24 }]}>
              {formatName(compareProfile.full_name)} (Bat) vs {formatName(profile?.full_name)} (Bowl)
            </Text>

            {matchupStats2 ? (
              <>
                <View style={styles.matchupGrid}>
                  <View style={styles.matchupStatBox}>
                    <Text style={styles.matchupStatVal}>{matchupStats2.runs}</Text>
                    <Text style={styles.matchupStatLbl}>Runs</Text>
                  </View>
                  <View style={styles.matchupStatBox}>
                    <Text style={styles.matchupStatVal}>{matchupStats2.balls}</Text>
                    <Text style={styles.matchupStatLbl}>Balls</Text>
                  </View>
                  <View style={styles.matchupStatBox}>
                    <Text style={styles.matchupStatVal}>{matchupStats2.sr}</Text>
                    <Text style={styles.matchupStatLbl}>S/R</Text>
                  </View>
                  <View style={styles.matchupStatBox}>
                    <Text style={[styles.matchupStatVal, { color: matchupStats2.dismissals > 0 ? '#EF5350' : '#01b854' }]}>
                      {matchupStats2.dismissals}
                    </Text>
                    <Text style={styles.matchupStatLbl}>Outs</Text>
                  </View>
                </View>
                <View style={[styles.matchupGrid, { marginTop: 10 }]}>
                  <View style={styles.matchupStatBox}>
                    <Text style={styles.matchupStatVal}>{matchupStats2.fours}</Text>
                    <Text style={styles.matchupStatLbl}>4s</Text>
                  </View>
                  <View style={styles.matchupStatBox}>
                    <Text style={styles.matchupStatVal}>{matchupStats2.sixes}</Text>
                    <Text style={styles.matchupStatLbl}>6s</Text>
                  </View>
                  <View style={styles.matchupStatBox}>
                    <Text style={styles.matchupStatVal}>{matchupStats2.dots}</Text>
                    <Text style={styles.matchupStatLbl}>Dots</Text>
                  </View>
                </View>
              </>
            ) : (
              <ActivityIndicator size="small" color="#01b854" style={{ marginVertical: 20 }} />
            )}
          </View>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{formatName(profile?.full_name)}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <Image 
              source={profile?.avatar_url ? { uri: profile.avatar_url } : require('../../assets/avatar.png')} 
              style={styles.avatar}
            />
            <View style={styles.profileDetails}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>{activeTab === 'Bowling' ? 'BOWLING STYLE' : 'BATTING STYLE'}</Text>
                <Text style={styles.detailValue}>
                  {activeTab === 'Bowling' ? (profile?.bowling_style || 'N/A') : (profile?.batting_style || 'N/A')}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>PLAYER ROLE</Text>
                <Text style={styles.detailValue}>{profile?.player_type || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.profileDecorative}>
               <View style={styles.decoCircle} />
            </View>
          </View>
        </View>

        {/* Custom Segmented Tabs */}
        <View style={styles.tabBar}>
          {TABS.map(tab => (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setActiveTab(tab)}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Current Form Section */}
        {activeTab === 'Batting' && (
          <View style={styles.formSection}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                Current form <Text style={styles.formSubtitle}>(Last 5 Innings)</Text>
              </Text>
              <View style={styles.formHeaderIcons}>
                <TouchableOpacity onPress={handleHelpPress} style={{ padding: 4 }} activeOpacity={0.7}>
                  <HelpCircle size={20} color="#94A3B8" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSharePress} style={{ padding: 4 }} activeOpacity={0.7}>
                  <Share2 size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: 30 }]}>Sr.</Text>
              <Text style={[styles.tableHeaderText, { width: 70 }]}>Date</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Innings</Text>
              <Text style={[styles.tableHeaderText, { width: 60, textAlign: 'center' }]}>Score</Text>
              <Text style={[styles.tableHeaderText, { width: 70, textAlign: 'center' }]}>Out T...</Text>
              <Text style={[styles.tableHeaderText, { width: 30, textAlign: 'right' }]}>Ov.</Text>
            </View>

            {/* Table Rows */}
            {battingStats.length > 0 ? battingStats.map((item, idx) => (
              <View key={item.match_id} style={styles.tableRow}>
                <Text style={[styles.tableRowText, { width: 30, color: '#94A3B8' }]}>{idx + 1}</Text>
                <Text style={[styles.tableRowText, { width: 70, color: '#FFFFFF' }]}>{new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</Text>
                <View style={{ flex: 1 }}>
                  {renderMatchTitle(item)}
                </View>
                <Text style={[styles.tableRowText, { width: 60, textAlign: 'center', color: '#FFFFFF', fontWeight: '700' }]}>
                  {item.runs}({item.balls})
                </Text>
                <Text style={[styles.tableRowText, { width: 70, textAlign: 'center', color: '#94A3B8', textTransform: 'capitalize' }]}>
                  {item.is_out ? (item.dismissal_type || 'Out') : 'Not Out'}
                </Text>
                <Text style={[styles.tableRowText, { width: 30, textAlign: 'right', color: '#94A3B8' }]}>{item.match_overs}</Text>
              </View>
            )) : (
              <View style={styles.emptyForm}>
                <Text style={styles.emptyFormText}>No recent batting data available</Text>
              </View>
            )}

            <TouchableOpacity style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'Bowling' && (
          <View style={styles.formSection}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                Recent Bowling <Text style={styles.formSubtitle}>(Last 5 Innings)</Text>
              </Text>
              <View style={styles.formHeaderIcons}>
                <TouchableOpacity onPress={handleHelpPress} style={{ padding: 4 }} activeOpacity={0.7}>
                  <HelpCircle size={20} color="#94A3B8" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSharePress} style={{ padding: 4 }} activeOpacity={0.7}>
                  <Share2 size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: 30 }]}>Sr.</Text>
              <Text style={[styles.tableHeaderText, { width: 70 }]}>Date</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Innings</Text>
              <Text style={[styles.tableHeaderText, { width: 100, textAlign: 'center' }]}>O-M-R-W</Text>
              <Text style={[styles.tableHeaderText, { width: 30, textAlign: 'right' }]}>Ov.</Text>
            </View>

            {/* Table Rows */}
            {bowlingStats.length > 0 ? bowlingStats.map((item, idx) => (
              <View key={item.match_id} style={styles.tableRow}>
                <Text style={[styles.tableRowText, { width: 30, color: '#94A3B8' }]}>{idx + 1}</Text>
                <Text style={[styles.tableRowText, { width: 70, color: '#FFFFFF' }]}>{new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</Text>
                <View style={{ flex: 1 }}>
                  {renderMatchTitle(item)}
                </View>
                <Text style={[styles.tableRowText, { width: 100, textAlign: 'center', color: '#FFFFFF', fontWeight: '700' }]}>
                  {Math.floor(item.legal_balls / 6)}.{item.legal_balls % 6}-0-{item.runs_conceded}-{item.wickets}
                </Text>
                <Text style={[styles.tableRowText, { width: 30, textAlign: 'right', color: '#94A3B8' }]}>{item.match_overs}</Text>
              </View>
            )) : (
              <View style={styles.emptyForm}>
                <Text style={styles.emptyFormText}>No recent bowling data available</Text>
              </View>
            )}

            <TouchableOpacity style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Compare Tab Section */}
        {activeTab === 'Compare' && renderCompareSection()}
        {activeTab === 'Face Off' && renderFaceOffSection()}

        {/* Insights Summary Cards */}
        {activeTab !== 'Compare' && activeTab !== 'Face Off' && (
          <View style={styles.insightsSection}>
             <View style={styles.insightDividerRow}>
                <View style={styles.insightDividerLine} />
                <View style={styles.insightDividerIcon} />
                <View style={styles.insightDividerLine} />
             </View>
  
             {activeTab === 'Batting' ? (
               <>
                 <View style={styles.summaryCard}>
                    <View style={styles.summaryValueBox}>
                       <Text style={styles.summaryValueText}>{battingInsights.totalRuns}</Text>
                    </View>
                    <Text style={styles.summaryLabelText}>Total runs {leaderboardStats ? '(All Time)' : `in last ${battingInsights.innings} Innings`}</Text>
                 </View>
  
                 <View style={styles.summaryCard}>
                    <View style={styles.summaryValueBox}>
                       <Text style={styles.summaryValueTextGreen}>{battingInsights.fifties}</Text>
                    </View>
                    <Text style={styles.summaryLabelText}>Fifties {leaderboardStats ? '(All Time)' : `in last ${battingInsights.innings} Innings`}</Text>
                 </View>
  
                 <View style={styles.summaryCard}>
                    <View style={styles.summaryValueBox}>
                       <Text style={styles.summaryValueTextGreen}>{battingInsights.notOuts}</Text>
                    </View>
                    <Text style={styles.summaryLabelText}>Not out {leaderboardStats ? '(All Time)' : `in last ${battingInsights.innings} Innings`}</Text>
                 </View>
  
                 <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                       <Text style={styles.statBoxValue}>{battingInsights.sr}</Text>
                       <Text style={styles.statBoxLabel}>SR</Text>
                    </View>
                    <View style={styles.statBox}>
                       <Text style={styles.statBoxValue}>{battingInsights.avg}</Text>
                       <Text style={styles.statBoxLabel}>Avg</Text>
                    </View>
                 </View>
               </>
             ) : activeTab === 'Bowling' ? (
               <>
                 <View style={styles.summaryCard}>
                    <View style={styles.summaryValueBox}>
                       <Text style={styles.summaryValueText}>{bowlingInsights.totalWickets}</Text>
                    </View>
                    <Text style={styles.summaryLabelText}>Total wickets {leaderboardStats ? '(All Time)' : `in last ${bowlingInsights.innings} Innings`}</Text>
                 </View>
  
                 <View style={styles.summaryCard}>
                    <View style={styles.summaryValueBox}>
                       <Text style={styles.summaryValueTextGreen}>{bowlingInsights.bestBowling}</Text>
                    </View>
                    <Text style={styles.summaryLabelText}>Best performance {leaderboardStats ? '(All Time)' : `in last ${bowlingInsights.innings} Innings`}</Text>
                 </View>
  
                 <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                       <Text style={styles.statBoxValue}>{bowlingInsights.econ}</Text>
                       <Text style={styles.statBoxLabel}>Econ</Text>
                    </View>
                    <View style={styles.statBox}>
                       <Text style={styles.statBoxValue}>{bowlingInsights.avg}</Text>
                       <Text style={styles.statBoxLabel}>Avg</Text>
                    </View>
                 </View>
               </>
             ) : (
               <View style={styles.emptyContainer}>
                 <TrendingUp size={48} color="#1E293B" />
                 <Text style={styles.emptyTitle}>Face-Off Coming Soon</Text>
                 <Text style={styles.emptySubtitle}>We are working on bringing advanced head-to-head battle metrics to your dashboard.</Text>
               </View>
             )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
    fontFamily: 'Inter',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    padding: 4,
  },
  notifWrapper: {
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F59E0B',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  notifText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
  },
  profileSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  profileCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 80,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileDetails: {
    marginLeft: 16,
    gap: 8,
  },
  detailItem: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  detailValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  profileDecorative: {
    position: 'absolute',
    right: -20,
    top: -20,
  },
  decoCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#7C3AED',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  tabTextActive: {
    color: '#000',
  },
  formSection: {
    backgroundColor: '#1E293B', // Dark theme for form as per image
    padding: 16,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  formSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '400',
  },
  formHeaderIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tableHeaderText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tableRowText: {
    fontSize: 13,
  },
  matchText: {
    fontSize: 13,
    color: '#01b854',
    fontWeight: '600',
  },
  viewAllBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#01b854',
    fontSize: 14,
    fontWeight: '700',
  },
  insightsSection: {
    backgroundColor: '#111827',
    padding: 16,
    paddingBottom: 40,
  },
  insightDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 10,
  },
  insightDividerLine: {
    height: 1,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  insightDividerIcon: {
    width: 10,
    height: 16,
    backgroundColor: '#01b854',
    borderRadius: 2,
  },
  summaryCard: {
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 4,
    marginBottom: 12,
  },
  summaryValueBox: {
    width: 60,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
    marginRight: 16,
  },
  summaryValueText: {
    fontSize: 24,
    color: '#01b854',
    fontWeight: '800',
  },
  summaryValueTextGreen: {
     fontSize: 24,
     color: '#01b854',
     fontWeight: '800',
  },
  summaryLabelText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 20,
    alignItems: 'center',
    borderRadius: 4,
  },
  statBoxValue: {
    fontSize: 24,
    color: '#01b854',
    fontWeight: '800',
    marginBottom: 4,
  },
  statBoxLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '700',
  },
  emptyForm: {
    paddingVertical: 40,
    alignItems: 'center'
  },
  emptyFormText: {
    color: '#94A3B8',
    fontSize: 14
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center'
  },
  emptySubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8
  },
  compareSection: {
    backgroundColor: '#111827',
    padding: 16,
    paddingBottom: 40,
    minHeight: 400,
  },
  selectPlayerContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  compareTitle: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '800',
    fontFamily: 'Inter',
    marginBottom: 8,
    textAlign: 'center',
  },
  compareSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontFamily: 'Inter',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  searchBarWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  compareSearchInput: {
    backgroundColor: '#1F2937',
    color: '#FFFFFF',
    fontSize: 14,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    fontFamily: 'Inter',
  },
  playersList: {
    width: '100%',
    maxHeight: 300,
  },
  playerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  playerSearchAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  playerSearchInfo: {
    marginLeft: 12,
    flex: 1,
  },
  playerSearchName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  playerSearchRole: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  selectBtn: {
    backgroundColor: '#01b854',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  emptySearch: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptySearchText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  comparisonContainer: {
    alignItems: 'center',
    width: '100%',
  },
  comparisonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 10,
  },
  comparePlayerHeaderBox: {
    flex: 1,
    alignItems: 'center',
  },
  compareHeaderAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#01b854',
    marginBottom: 8,
  },
  compareHeaderName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    textAlign: 'center',
    width: '100%',
  },
  vsBadgeContainer: {
    backgroundColor: '#01b854',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  vsBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  changePlayerBtn: {
    borderWidth: 1,
    borderColor: '#01b854',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    marginBottom: 24,
  },
  changePlayerBtnText: {
    color: '#01b854',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Inter',
  },
  metricsTable: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  metricSectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#01b854',
    fontFamily: 'Inter',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 6,
  },
  metricComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  metricValue: {
    width: 60,
    fontSize: 15,
    fontFamily: 'Inter',
  },
  metricLabel: {
    flex: 1,
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  matchupGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  matchupStatBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  matchupStatVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#01b854',
    fontFamily: 'Inter',
  },
  matchupStatLbl: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'Inter',
    marginTop: 2,
    textTransform: 'uppercase',
  }
});
