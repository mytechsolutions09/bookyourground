import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Users2, Award, Zap, Swords, Target, Activity, ChevronDown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getPlayerSlug } from '@/lib/utils';

type SubTab = 'batting' | 'bowling' | 'fielding' | 'captain' | 'leaders';

const CricketStats = React.memo(({ activeSubTab }: { activeSubTab: string }) => {
  const { width } = useWindowDimensions();
  const isUltraNarrow = width < 350;
  const router = useRouter();
  const subTab = (activeSubTab || 'batting') as SubTab;
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<any[]>([]);
  const [leaders, setLeaders] = useState<any>({ batting: [], bowling: [] });

  useEffect(() => {
    fetchUserStats();
    fetchLeaders();
  }, []);

  const fetchLeaders = async () => {
    try {
      // Fetch top 10 Batters (Global)
      const { data: batters } = await supabase
        .from('player_ball_stats')
        .select(`
          member_id,
          total_runs,
          highest_score,
          team_members (
            profile_id,
            profiles (
              full_name,
              avatar_url
            )
          )
        `)
        .eq('ball_type', 'leather')
        .order('total_runs', { ascending: false })
        .limit(10);

      // Fetch top 10 Bowlers (Global)
      const { data: bowlers } = await supabase
        .from('player_ball_stats')
        .select(`
          member_id,
          total_wickets,
          best_bowling_wickets,
          team_members (
            profile_id,
            profiles (
              full_name,
              avatar_url
            )
          )
        `)
        .eq('ball_type', 'leather')
        .order('total_wickets', { ascending: false })
        .limit(10);

      setLeaders({ 
        batting: batters || [], 
        bowling: bowlers || [] 
      });
    } catch (err) {
      console.error('Error fetching leaders:', err);
    }
  };

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: members } = await supabase
        .from('team_members')
        .select('id')
        .eq('profile_id', user.id);

      if (!members || members.length === 0) {
          setLoading(false);
          return;
      }

      const memberIds = members.map(m => m.id);

      const { data: ballStats, error } = await supabase
        .from('player_ball_stats')
        .select('*')
        .in('member_id', memberIds);

      if (error) throw error;
      if (ballStats) setStatsData(ballStats);
    } catch (err) {
      console.error('Error fetching player stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatsByFormat = (format: 'overall' | 'leather' | 'tennis' | 'other') => {
    let data = statsData;
    if (format !== 'overall') {
      data = statsData.filter(s => s.ball_type === format);
    }

    const aggregated = data.reduce((acc: any, curr: any) => {
      Object.keys(curr).forEach(key => {
        if (typeof curr[key] === 'number') {
          acc[key] = (acc[key] || 0) + curr[key];
        }
      });
      acc.highest_score = Math.max(acc.highest_score || 0, curr.highest_score || 0);
      acc.best_bowling_wickets = Math.max(acc.best_bowling_wickets || 0, curr.best_bowling_wickets || 0);
      return acc;
    }, {});

    if (subTab === 'batting') {
      const inns = aggregated.innings_batted || 0;
      const no = aggregated.not_outs || 0;
      const runs = aggregated.total_runs || 0;
      const avg = (inns > no) ? (runs / (inns - no)).toFixed(2) : runs;
      return [
        { label: 'Mat', value: aggregated.matches_played || 0 },
        { label: 'Inns', value: inns },
        { label: 'NO', value: no },
        { label: 'Runs', value: runs },
        { label: 'HS', value: aggregated.highest_score || 0 },
        { label: 'Avg', value: avg },
        { label: 'SR', value: aggregated.strike_rate || '0.00' },
        { label: '100s', value: aggregated.hundreds || 0 },
        { label: '50s', value: aggregated.fifties || 0 },
        { label: '4s', value: aggregated.fours_hit || 0 },
        { label: 'Duck', value: aggregated.ducks || 0 },
        { label: 'Won', value: aggregated.matches_won || 0 },
        { label: 'Lost', value: aggregated.matches_lost || 0 },
      ];
    }

    if (subTab === 'bowling') {
      const runs = aggregated.runs_conceded || 0;
      const wkts = aggregated.total_wickets || 0;
      const overs = aggregated.overs_bowled || 0;
      
      const eco = overs > 0 ? (runs / overs).toFixed(2) : '0.00';
      const avg = wkts > 0 ? (runs / wkts).toFixed(2) : '0.00';
      const sr = wkts > 0 ? ((overs * 6) / wkts).toFixed(2) : '0.00';

      return [
        { label: 'Mat', value: aggregated.matches_played || 0 },
        { label: 'Inns', value: aggregated.innings_bowled || 0 },
        { label: 'Overs', value: overs.toFixed(1) },
        { label: 'Maidens', value: aggregated.maidens || 0 },
        { label: 'Runs', value: runs },
        { label: 'Wkts', value: wkts },
        { label: 'BB', value: aggregated.best_bowling_wickets ? `${aggregated.best_bowling_wickets}/${aggregated.best_bowling_runs}` : '—' },
        { label: '3 Wkts', value: aggregated.three_wicket_hauls || 0 },
        { label: '5 Wkts', value: aggregated.five_wicket_hauls || 0 },
        { label: 'Eco', value: eco },
        { label: 'SR', value: sr },
        { label: 'Avg', value: avg },
        { label: 'WD', value: aggregated.wides_conceded || 0 },
        { label: 'NB', value: aggregated.no_balls_conceded || 0 },
        { label: 'Dots', value: aggregated.dot_balls_bowled || 0 },
        { label: '4s', value: aggregated.fours_conceded || 0 },
        { label: '6s', value: aggregated.sixes_conceded || 0 },
      ];
    }

    if (subTab === 'fielding') {
      return [
        { label: 'Matches', value: aggregated.matches_played || 0 },
        { label: 'Catches', value: aggregated.total_catches || 0 },
        { label: 'Run Outs', value: aggregated.run_outs || 0 },
        { label: 'Stumpings', value: aggregated.stumpings || 0 },
        { label: 'C.B', value: aggregated.caught_and_bowled || 0 },
      ];
    }

    if (subTab === 'captain') {
      const mat = aggregated.matches_captained || 0;
      const won = aggregated.matches_won_as_captain || 0;
      const winPct = mat > 0 ? ((won / mat) * 100).toFixed(1) + '%' : '0%';
      return [
        { label: 'Mat (Capt)', value: mat },
        { label: 'Won', value: won },
        { label: 'Lost', value: aggregated.matches_lost_as_captain || 0 },
        { label: 'Win %', value: winPct },
      ];
    }

    return [];
  };

  const renderStatGroup = (format: 'overall' | 'leather' | 'tennis' | 'other', isLast: boolean) => {
    const stats = getStatsByFormat(format);
    const label = format.charAt(0).toUpperCase() + format.slice(1);
    const hasData = format === 'overall' || statsData.some(s => s.ball_type === format);

    return (
      <View key={format}>
        <View style={styles.formatSectionHeader}>
            <View style={styles.formatIndicator}>
                <View style={[styles.ballDot, { backgroundColor: format === 'leather' ? '#01b854' : (format === 'tennis' ? '#EA580C' : '#4B5563') }]} />
                <Text style={styles.formatTitle}>{label} Ball Records</Text>
            </View>
            {!hasData && <Text style={styles.noDataLabel}>No match data</Text>}
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat, idx) => (
            <View key={idx} style={[styles.statTile, isUltraNarrow && { width: '48%' }]}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {!isLast && <View style={styles.divider} />}
      </View>
    );
  };

  const LeaderItem = ({ profileId, name, avatar, score, label, rank }: any) => {
    return (
      <TouchableOpacity 
        style={styles.leaderRow}
        onPress={() => router.push(`/players/${getPlayerSlug(name, profileId)}` as any)}
      >
        <View style={styles.leaderRankBox}>
          <Text style={styles.leaderRank}>{rank}</Text>
        </View>
        
        <Image 
          source={avatar ? { uri: avatar } : require('../../../assets/avatar.png')} 
          style={styles.leaderAvatar} 
        />
        
        <View style={styles.leaderInfo}>
          <Text style={styles.leaderName}>{name}</Text>
          <Text style={styles.leaderScore}>{label}: {score}</Text>
        </View>
        
        <ChevronDown size={18} color="#E2E8F0" style={{ transform: [{ rotate: '-90deg' }] }} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>


      <View style={styles.statsContent}>
         {loading ? (
           <View style={styles.skeletonContainer}>
              <View style={styles.skeletonHeader} />
              <View style={styles.skeletonGrid}>
                {[1,2,3,4,5,6,7,8,9].map(i => (
                  <View key={i} style={styles.skeletonTile} />
                ))}
              </View>
              <View style={styles.skeletonHeader} />
              <View style={styles.skeletonGrid}>
                {[1,2,3,4,5,6].map(i => (
                  <View key={i} style={styles.skeletonTile} />
                ))}
              </View>
           </View>
          ) : subTab === 'leaders' ? (
             <View>
                <Text style={styles.leaderSectionTitle}>Top Batters</Text>
                {leaders.batting.map((l: any, idx: number) => (
                  <LeaderItem 
                    key={idx}
                    rank={idx + 1}
                    profileId={l.team_members?.profile_id}
                    name={l.team_members?.profiles?.full_name}
                    avatar={l.team_members?.profiles?.avatar_url}
                    score={l.total_runs}
                    label="Runs"
                  />
                ))}

                <Text style={[styles.leaderSectionTitle, { marginTop: 24 }]}>Top Bowlers</Text>
                {leaders.bowling.map((l: any, idx: number) => (
                  <LeaderItem 
                    key={idx}
                    rank={idx + 1}
                    profileId={l.team_members?.profile_id}
                    name={l.team_members?.profiles?.full_name}
                    avatar={l.team_members?.profiles?.avatar_url}
                    score={l.total_wickets}
                    label="Wickets"
                  />
                ))}
             </View>
          ) : (
            <View>
                {renderStatGroup('overall', false)}
                {renderStatGroup('leather', false)}
                {renderStatGroup('tennis', false)}
                {renderStatGroup('other', true)}
            </View>
          )}
      </View>
    </View>
  );
});

export default CricketStats;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  statsFilterBarScroll: {
    marginBottom: 20,
  },
  statsFilterBarContainer: {
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statPillActive: {
    backgroundColor: '#01b854',
    borderColor: '#01b854',
  },
  statPillText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  statPillTextActive: {
    fontFamily: 'Inter',
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statsContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 12, // Added padding under subbar
    marginBottom: 40,
  },
  statsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  statsSectionTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  compareBtnText: {
    fontFamily: 'Inter',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  formatSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  formatIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ballDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#01b854',
  },
  formatTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  noDataLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statTile: {
    width: '31%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statValue: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '400',
    color: '#1E293B',
    marginBottom: 1,
  },
  statLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 1,
  },
  loadingBox: {
    padding: 100,
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  loadingText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  adBanner: {
    height: 110,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 16,
  },
  adImage: {
    width: '100%',
    height: '100%',
  },
  adOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adTitle: {
    fontFamily: 'Inter',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  adTitleBold: {
    fontFamily: 'Inter',
    fontWeight: '600',
    color: '#FCD34D',
  },
  adBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  adBtnText: {
    fontFamily: 'Inter',
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },
  leaderSectionTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  leaderRankBox: {
    width: 24,
    alignItems: 'center',
    marginRight: 8,
  },
  leaderRank: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  leaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  leaderAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
    color: '#043529',
  },
  leaderScore: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
    fontWeight: '400',
  },
  skeletonContainer: {
    padding: 8,
  },
  skeletonHeader: {
    height: 20,
    width: '40%',
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginBottom: 16,
    marginTop: 8,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  skeletonTile: {
    width: '31%',
    height: 60,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
});
