import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Users2, Award, Zap, Swords, Target, Activity, ChevronDown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

type SubTab = 'batting' | 'bowling' | 'fielding' | 'captain';

export default function CricketStats() {
  const [subTab, setSubTab] = useState<SubTab>('batting');
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<any[]>([]);

  useEffect(() => {
    fetchUserStats();
  }, []);

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
    
    // Check if there is data for this specific format
    const hasData = format === 'overall' || statsData.some(s => s.ball_type === format);

    return (
      <View key={format}>
        <View style={styles.formatSectionHeader}>
            <View style={styles.formatIndicator}>
                <View style={[styles.ballDot, { backgroundColor: format === 'leather' ? '#991B1B' : (format === 'tennis' ? '#EA580C' : '#4B5563') }]} />
                <Text style={styles.formatTitle}>{label} Ball Records</Text>
            </View>
            {!hasData && <Text style={styles.noDataLabel}>No match data</Text>}
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat, idx) => (
            <View key={idx} style={styles.statTile}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {!isLast && <View style={styles.divider} />}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.statsPromoHeader}>
         <View>
            <Text style={styles.statsPromoText}>Personal Records</Text>
            <Text style={styles.statsPromoSub}>PERFORMANCE ANALYTICS</Text>
         </View>
         <TouchableOpacity style={styles.analyzeBtn}>
            <Activity size={18} color="#01b854" />
            <Text style={styles.analyzeBtnText}>Analyze</Text>
         </TouchableOpacity>
      </View>

      <View style={styles.statsFilterBar}>
        {[
            { id: 'batting', label: 'Batting', icon: Swords },
            { id: 'bowling', label: 'Bowling', icon: Zap },
            { id: 'fielding', label: 'Fielding', icon: Target },
            { id: 'captain', label: 'Captain', icon: Award },
        ].map((item) => (
          <TouchableOpacity 
            key={item.id}
            style={[styles.statPill, subTab === item.id && styles.statPillActive]} 
            onPress={() => setSubTab(item.id as SubTab)}
          >
            <item.icon size={14} color={subTab === item.id ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.statPillText, subTab === item.id && styles.statPillTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsContent}>
         <View style={styles.statsSectionHeader}>
            <Text style={styles.statsSectionTitle}>Career Overview</Text>
            <TouchableOpacity style={styles.compareBtn}>
               <Users2 size={14} color="#FFFFFF" strokeWidth={2.5} />
               <Text style={styles.compareBtnText}>Compare</Text>
            </TouchableOpacity>
         </View>

         {loading ? (
             <View style={styles.loadingBox}>
                <ActivityIndicator color="#01b854" />
                <Text style={styles.loadingText}>Generating Performance Data...</Text>
             </View>
         ) : (
            <View>
                {renderStatGroup('overall', false)}
                {renderStatGroup('leather', false)}
                {renderStatGroup('tennis', false)}
                {renderStatGroup('other', true)}
            </View>
         )}

         <View style={styles.adBanner}>
            <Image source={{ uri: 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg' }} style={styles.adImage} />
            <View style={styles.adOverlay}>
               <Text style={styles.adTitle}>Upgrade to Pro{'\n'}<Text style={styles.adTitleBold}>Unlock Advanced Charts</Text></Text>
               <TouchableOpacity style={styles.adBtn}><Text style={styles.adBtnText}>Upgrade</Text></TouchableOpacity>
            </View>
         </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  statsPromoHeader: {
    padding: 20,
    backgroundColor: '#01b854',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
        web: { boxShadow: '0 4px 12px rgba(1, 184, 84, 0.2)' }
    })
  },
  statsPromoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  statsPromoSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 1,
  },
  analyzeBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  analyzeBtnText: {
    color: '#01b854',
    fontWeight: '800',
    fontSize: 13,
  },
  statsFilterBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statPillActive: {
    backgroundColor: '#01b854',
    borderColor: '#01b854',
  },
  statPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  statPillTextActive: {
    color: '#FFFFFF',
  },
  statsContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 40,
  },
  statsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  statsSectionTitle: {
    fontSize: 20,
    fontWeight: '900',
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
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
    fontSize: 15,
    fontWeight: '800',
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
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
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
    padding: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
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
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  adTitleBold: {
    fontWeight: '900',
    color: '#FCD34D',
  },
  adBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  adBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
});
