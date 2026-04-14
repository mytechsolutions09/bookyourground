import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, FlatList, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { BarChart, TrendingUp, Award, Zap, Search, ChevronRight, Swords, ShieldCheck, Target, Crown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import CricketSubbar from '@/components/admin/CricketSubbar';
import WebLayout from '@/components/web/WebLayout';

type StatCategory = 'batting' | 'bowling' | 'fielding' | 'captaincy';
type BallType = 'leather' | 'tennis' | 'other';

export default function AdminCricketLeaderboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<StatCategory>('batting');
  const [activeBallType, setActiveBallType] = useState<BallType>('leather');
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    fetchStats();
  }, [activeBallType]); // Re-fetch when ball type changes

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Fetch stats from player_ball_stats joined with team_members, profiles, and teams
      const { data, error } = await supabase
        .from('player_ball_stats')
        .select(`
          *,
          member:team_members(
            id,
            player_name,
            role,
            profile:profiles(full_name, avatar_url),
            team:teams(name)
          )
        `)
        .eq('ball_type', activeBallType);

      if (error) throw error;
      if (data) setStats(data);
    } catch (err) {
      console.error('Error fetching cricket ball stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStats = useMemo(() => {
    let filtered = stats;

    // 1. Category Filter Logic
    if (activeCategory === 'captaincy') {
      filtered = filtered.filter(s => s.matches_captained > 0 || s.member?.role === 'captain');
    }

    // 2. Search Filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(s => {
        const name = (s.member?.player_name || s.member?.profile?.full_name || '').toLowerCase();
        const team = (s.member?.team?.name || '').toLowerCase();
        return name.includes(lowerQuery) || team.includes(lowerQuery);
      });
    }

    // 3. Sorting based on category
    if (activeCategory === 'batting') {
      return [...filtered].sort((a, b) => (b.total_runs || 0) - (a.total_runs || 0));
    } else if (activeCategory === 'bowling') {
      return [...filtered].sort((a, b) => (b.total_wickets || 0) - (a.total_wickets || 0));
    } else if (activeCategory === 'fielding') {
      return [...filtered].sort((a, b) => (b.total_catches || 0) - (a.total_catches || 0));
    } else if (activeCategory === 'captaincy') {
      return [...filtered].sort((a, b) => (b.matches_won_as_captain || 0) - (a.matches_won_as_captain || 0));
    }

    return filtered;
  }, [stats, activeCategory, searchQuery]);

  const renderTableHeader = () => {
    if (!isWeb) return null;

    if (activeCategory === 'batting') {
      return (
        <View style={[styles.tableHeaderContainer, { backgroundColor: '#065F46' }]}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.colPlayer]}>Player</Text>
            <Text style={[styles.tableHeaderCell, styles.colStat]}>Mat</Text>
            <Text style={[styles.tableHeaderCell, styles.colStat]}>Inns</Text>
            <Text style={[styles.tableHeaderCell, styles.colStat]}>NO</Text>
            <Text style={[styles.tableHeaderCell, styles.colStat]}>Runs</Text>
            <Text style={[styles.tableHeaderCell, styles.colStat]}>HS</Text>
            <Text style={[styles.tableHeaderCell, styles.colStat]}>Avg</Text>
            <Text style={[styles.tableHeaderCell, styles.colStat]}>SR</Text>
            <Text style={[styles.tableHeaderCell, styles.colStat]}>100s</Text>
            <Text style={[styles.tableHeaderCell, styles.colStat]}>50s</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatSmall]}>Duck</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatSmall]}>Won</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatSmall]}>Lost</Text>
          </View>
        </View>
      );
    }

    if (activeCategory === 'bowling') {
      return (
        <View style={[styles.tableHeaderContainer, { backgroundColor: '#1E3A8A' }]}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.colPlayer]}>Player</Text>
            <Text style={[styles.tableHeaderCell, styles.colStat]}>Mat</Text>
            <Text style={[styles.tableHeaderCell, styles.colStat]}>Inns</Text>
            <Text style={[styles.tableHeaderCell, styles.colStat]}>Overs</Text>
            <Text style={[styles.tableHeaderCell, styles.colStat]}>Wkts</Text>
            <Text style={[styles.tableHeaderCell, styles.colStat]}>BB</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatSmall]}>3w</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatSmall]}>5w</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatSmall]}>Dots</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatSmall]}>WD</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatSmall]}>NB</Text>
            <Text style={[styles.tableHeaderCell, styles.colStat]}>Econ</Text>
          </View>
        </View>
      );
    }

    if (activeCategory === 'fielding') {
      return (
        <View style={[styles.tableHeaderContainer, { backgroundColor: '#374151' }]}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.colPlayer]}>Player</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatFull]}>Catches</Text>
            <Text style={[styles.tableHeaderCell, styles.colStat]}>C.B</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatFull]}>Run Outs</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatFull]}>Stumpings</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatFull]}>Matches</Text>
          </View>
        </View>
      );
    }

    if (activeCategory === 'captaincy') {
      return (
        <View style={[styles.tableHeaderContainer, { backgroundColor: '#92400E' }]}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.colPlayer]}>Captain</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatFull]}>Mat (Capt)</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatFull]}>Won</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatFull]}>Lost</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatFull]}>Tied</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatFull]}>A/NR</Text>
            <Text style={[styles.tableHeaderCell, styles.colStatFull]}>Win %</Text>
          </View>
        </View>
      );
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const playerName = item.member?.player_name || item.member?.profile?.full_name || 'Unknown';
    const teamName = item.member?.team?.name || 'No Team';

    if (isWeb) {
      if (activeCategory === 'batting') {
        const avg = item.innings_batted > item.not_outs 
          ? (item.total_runs / (item.innings_batted - item.not_outs)).toFixed(2) 
          : item.total_runs;
        
        return (
          <View style={styles.tableRow}>
            <View style={[styles.tableCell, styles.colPlayer]}>
              <Text style={styles.cellMainText}>{playerName}</Text>
              <Text style={styles.cellSubText}>{teamName}</Text>
            </View>
            <Text style={[styles.tableCell, styles.colStat, styles.centerText]}>{item.matches_played}</Text>
            <Text style={[styles.tableCell, styles.colStat, styles.centerText]}>{item.innings_batted}</Text>
            <Text style={[styles.tableCell, styles.colStat, styles.centerText]}>{item.not_outs}</Text>
            <Text style={[styles.tableCell, styles.colStat, styles.centerText, styles.boldText]}>{item.total_runs}</Text>
            <Text style={[styles.tableCell, styles.colStat, styles.centerText]}>{item.highest_score}</Text>
            <Text style={[styles.tableCell, styles.colStat, styles.centerText]}>{avg}</Text>
            <Text style={[styles.tableCell, styles.colStat, styles.centerText]}>{item.strike_rate}</Text>
            <Text style={[styles.tableCell, styles.colStat, styles.centerText]}>{item.hundreds}</Text>
            <Text style={[styles.tableCell, styles.colStat, styles.centerText]}>{item.fifties}</Text>
            <Text style={[styles.tableCell, styles.colStatSmall, styles.centerText, { color: '#EF4444', fontWeight: '700' }]}>{item.ducks || 0}</Text>
            <Text style={[styles.tableCell, styles.colStatSmall, styles.centerText, { color: '#10B981', fontWeight: '700' }]}>{item.matches_won || 0}</Text>
            <Text style={[styles.tableCell, styles.colStatSmall, styles.centerText, { color: '#6B7280' }]}>{item.matches_lost || 0}</Text>
          </View>
        );
      }

      if (activeCategory === 'bowling') {
        const bb = item.best_bowling_wickets ? `${item.best_bowling_wickets}/${item.best_bowling_runs}` : '—';
        return (
          <View style={styles.tableRow}>
            <View style={[styles.tableCell, styles.colPlayer]}>
              <Text style={styles.cellMainText}>{playerName}</Text>
              <Text style={styles.cellSubText}>{teamName}</Text>
            </View>
            <Text style={[styles.tableCell, styles.colStat, styles.centerText]}>{item.matches_played}</Text>
            <Text style={[styles.tableCell, styles.colStat, styles.centerText]}>{item.innings_bowled}</Text>
            <Text style={[styles.tableCell, styles.colStat, styles.centerText]}>{item.overs_bowled}</Text>
            <Text style={[styles.tableCell, styles.colStat, styles.centerText, styles.boldText, { color: '#2563EB' }]}>{item.total_wickets}</Text>
            <Text style={[styles.tableCell, styles.colStat, styles.centerText]}>{bb}</Text>
            <Text style={[styles.tableCell, styles.colStatSmall, styles.centerText]}>{item.three_wicket_hauls || 0}</Text>
            <Text style={[styles.tableCell, styles.colStatSmall, styles.centerText]}>{item.five_wicket_hauls || 0}</Text>
            <Text style={[styles.tableCell, styles.colStatSmall, styles.centerText]}>{item.dot_balls_bowled || 0}</Text>
            <Text style={[styles.tableCell, styles.colStatSmall, styles.centerText]}>{item.wides_conceded || 0}</Text>
            <Text style={[styles.tableCell, styles.colStatSmall, styles.centerText]}>{item.no_balls_conceded || 0}</Text>
            <Text style={[styles.tableCell, styles.colStat, styles.centerText]}>{item.economy_rate}</Text>
          </View>
        );
      }

      if (activeCategory === 'fielding') {
        return (
          <View style={styles.tableRow}>
            <View style={[styles.tableCell, styles.colPlayer]}>
              <Text style={styles.cellMainText}>{playerName}</Text>
              <Text style={styles.cellSubText}>{teamName}</Text>
            </View>
            <Text style={[styles.tableCell, styles.colStatFull, styles.centerText, styles.boldText]}>{item.total_catches}</Text>
            <Text style={[styles.tableCell, styles.colStat, styles.centerText]}>{item.caught_and_bowled || 0}</Text>
            <Text style={[styles.tableCell, styles.colStatFull, styles.centerText]}>{item.run_outs}</Text>
            <Text style={[styles.tableCell, styles.colStatFull, styles.centerText]}>{item.stumpings}</Text>
            <Text style={[styles.tableCell, styles.colStatFull, styles.centerText]}>{item.matches_played}</Text>
          </View>
        );
      }

      if (activeCategory === 'captaincy') {
        const winPct = item.matches_captained > 0 
          ? ((item.matches_won_as_captain / item.matches_captained) * 100).toFixed(1) + '%' 
          : '0%';
        
        return (
          <View style={styles.tableRow}>
            <View style={[styles.tableCell, styles.colPlayer]}>
              <Text style={styles.cellMainText}>{playerName}</Text>
              <Text style={styles.cellSubText}>{teamName}</Text>
            </View>
            <Text style={[styles.tableCell, styles.colStatFull, styles.centerText]}>{item.matches_captained}</Text>
            <Text style={[styles.tableCell, styles.colStatFull, styles.centerText, styles.boldText, { color: '#B45309' }]}>{item.matches_won_as_captain}</Text>
            <Text style={[styles.tableCell, styles.colStatFull, styles.centerText]}>{item.matches_lost_as_captain}</Text>
            <Text style={[styles.tableCell, styles.colStatFull, styles.centerText]}>{item.matches_tied_as_captain}</Text>
            <Text style={[styles.tableCell, styles.colStatFull, styles.centerText]}>{item.matches_abandoned_as_captain}</Text>
            <Text style={[styles.tableCell, styles.colStatFull, styles.centerText, styles.boldText]}>{winPct}</Text>
          </View>
        );
      }
    }

    return (
      <Card style={styles.mobileCard}>
        <View style={styles.mobileHeader}>
          <Text style={styles.mobilePlayerName}>{playerName}</Text>
          <Text style={styles.mobileRuns}>
            {activeCategory === 'batting' ? `${item.total_runs} Runs` : (activeCategory === 'bowling' ? `${item.total_wickets} Wkts` : `${item.total_catches} Catches`)}
          </Text>
        </View>
        <Text style={styles.mobileSubText}>{teamName} • Format: {activeBallType.toUpperCase()}</Text>
      </Card>
    );
  };

  const content = (
    <CricketSubbar>
      <View style={styles.container}>
        <View style={styles.headerCompact}>
          <View style={styles.leftControls}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                <TouchableOpacity 
                onPress={() => setActiveCategory('batting')}
                style={[styles.categoryChip, activeCategory === 'batting' && styles.categoryChipActive]}
                >
                <Swords size={14} color={activeCategory === 'batting' ? '#FFFFFF' : '#6B7280'} />
                <Text style={[styles.categoryText, activeCategory === 'batting' && styles.categoryTextActive]}>Batting</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                onPress={() => setActiveCategory('bowling')}
                style={[styles.categoryChip, activeCategory === 'bowling' && styles.categoryChipActive]}
                >
                <Zap size={14} color={activeCategory === 'bowling' ? '#FFFFFF' : '#6B7280'} />
                <Text style={[styles.categoryText, activeCategory === 'bowling' && styles.categoryTextActive]}>Bowling</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                onPress={() => setActiveCategory('fielding')}
                style={[styles.categoryChip, activeCategory === 'fielding' && styles.categoryChipActive]}
                >
                <Target size={14} color={activeCategory === 'fielding' ? '#FFFFFF' : '#6B7280'} />
                <Text style={[styles.categoryText, activeCategory === 'fielding' && styles.categoryTextActive]}>Fielding</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                onPress={() => setActiveCategory('captaincy')}
                style={[styles.categoryChip, activeCategory === 'captaincy' && styles.categoryChipActive]}
                >
                <Crown size={14} color={activeCategory === 'captaincy' ? '#FFFFFF' : '#6B7280'} />
                <Text style={[styles.categoryText, activeCategory === 'captaincy' && styles.categoryTextActive]}>Captaincy</Text>
                </TouchableOpacity>
            </ScrollView>

            <View style={styles.divider} />

            <View style={styles.ballTypeRow}>
                {(['leather', 'tennis', 'other'] as BallType[]).map((type) => (
                    <TouchableOpacity 
                        key={type}
                        onPress={() => setActiveBallType(type)}
                        style={[styles.ballChip, activeBallType === type && styles.ballChipActive]}
                    >
                        <Text style={[styles.ballText, activeBallType === type && styles.ballTextActive]}>
                            {type.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Search size={16} color="#9CA3AF" />
            <input
              type="text"
              placeholder="Search by player or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                borderWidth: 0,
                outline: 'none',
                fontSize: 14,
                padding: 8,
                width: 200,
                backgroundColor: 'transparent',
              } as any}
            />
          </View>
        </View>

        {renderTableHeader()}

        <FlatList
          data={filteredStats}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchStats} color="#10b981" />
          }
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <BarChart size={48} color="#E5E7EB" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No statistics found for {activeBallType} ball {activeCategory}</Text>
              <Text style={styles.emptySubText}>Players must play matches of this type to appear here.</Text>
            </View>
          }
        />
      </View>
    </CricketSubbar>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#F5F5F5' : '#F9FAFB',
  },
  headerCompact: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  ballTypeRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 2,
  },
  ballChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ballChipActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
        web: { boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }
    })
  },
  ballText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  ballTextActive: {
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  tableHeaderContainer: {
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#065F46',
    borderRadius: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row',
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    padding: 24,
    paddingTop: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  tableCell: {
    fontSize: 13,
    color: '#374151',
  },
  colPlayer: { flex: 2 },
  colStat: { width: 50 },
  colStatSmall: { width: 40 },
  colStatFull: { flex: 1 },
  centerText: { textAlign: 'center' },
  boldText: { fontWeight: '800', color: '#111827' },
  cellMainText: { fontSize: 13, fontWeight: '700', color: '#111827' },
  cellSubText: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  emptyContainer: { padding: 80, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#9CA3AF', marginBottom: 4 },
  emptySubText: { fontSize: 12, color: '#9CA3AF' },
  mobileCard: { padding: 16, marginBottom: 12 },
  mobileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  mobilePlayerName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  mobileRuns: { fontSize: 16, fontWeight: '800', color: '#10b981' },
  mobileSubText: { fontSize: 13, color: '#6B7280' },
});
