import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, FlatList, RefreshControl, Image, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { BarChart, TrendingUp, Award, Zap, Search, ChevronRight, Swords, ShieldCheck, Target, Crown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import CricketSubbar from '@/components/admin/CricketSubbar';
import WebLayout from '@/components/web/WebLayout';

type StatCategory = 'batting' | 'bowling' | 'fielding' | 'captaincy';
type BallType = 'all' | 'leather' | 'tennis' | 'other';

export default function AdminCricketLeaderboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<StatCategory>('batting');
  const [activeBallType, setActiveBallType] = useState<BallType>('all');
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    fetchStats();
  }, [activeBallType]); // Re-fetch when ball type changes

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Fetch stats from the optimized leaderboard view
      let query = supabase
        .from('leaderboard')
        .select('*');

      if (activeBallType !== 'all') {
        query = query.eq('ball_type', activeBallType);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (data) setStats(data);
    } catch (err) {
      console.error('Error fetching cricket leaderboard:', err);
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
        const name = (s.full_name || '').toLowerCase();
        const city = (s.city || '').toLowerCase();
        return name.includes(lowerQuery) || city.includes(lowerQuery);
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

    let columns = [];
    if (activeCategory === 'batting') {
      columns = [
        { label: 'Player', style: styles.colPlayer },
        { label: 'Mat', style: styles.colStat },
        { label: 'Inns', style: styles.colStat },
        { label: 'NO', style: styles.colStat },
        { label: 'Runs', style: styles.colStat },
        { label: 'HS', style: styles.colStat },
        { label: 'Avg', style: styles.colStat },
        { label: 'SR', style: styles.colStat },
        { label: '100s', style: styles.colStat },
        { label: '50s', style: styles.colStat },
        { label: 'Duck', style: styles.colStatSmall },
        { label: 'Won', style: styles.colStatSmall },
        { label: 'Lost', style: styles.colStatSmall },
      ];
    } else if (activeCategory === 'bowling') {
      columns = [
        { label: 'Player', style: styles.colPlayer },
        { label: 'Mat', style: styles.colStat },
        { label: 'Inns', style: styles.colStat },
        { label: 'Overs', style: styles.colStat },
        { label: 'Wkts', style: styles.colStat },
        { label: 'BB', style: styles.colStat },
        { label: '3w', style: styles.colStatSmall },
        { label: '5w', style: styles.colStatSmall },
        { label: 'Dots', style: styles.colStatSmall },
        { label: 'WD', style: styles.colStatSmall },
        { label: 'NB', style: styles.colStatSmall },
        { label: 'Econ', style: styles.colStat },
      ];
    } else if (activeCategory === 'fielding') {
      columns = [
        { label: 'Player', style: styles.colPlayer },
        { label: 'Catches', style: styles.colStatFull },
        { label: 'C.B', style: styles.colStat },
        { label: 'Run Outs', style: styles.colStatFull },
        { label: 'Stumpings', style: styles.colStatFull },
        { label: 'Matches', style: styles.colStatFull },
      ];
    } else if (activeCategory === 'captaincy') {
      columns = [
        { label: 'Captain', style: styles.colPlayer },
        { label: 'Mat (Capt)', style: styles.colStatFull },
        { label: 'Won', style: styles.colStatFull },
        { label: 'Lost', style: styles.colStatFull },
        { label: 'Tied', style: styles.colStatFull },
        { label: 'A/NR', style: styles.colStatFull },
        { label: 'Win %', style: styles.colStatFull },
      ];
    }

    return (
      <View style={styles.tableHeaderContainer}>
        <View style={styles.tableHeaderRow}>
          {columns.map((col, idx) => (
            <Text key={idx} style={[styles.tableHeaderCell, col.style]}>{col.label}</Text>
          ))}
        </View>
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const playerName = item.full_name || 'Unknown Player';
    const teamName = item.city || 'Independent';

    if (isWeb) {
      if (activeCategory === 'batting') {
        const avg = item.innings_batted > item.not_outs 
          ? (item.total_runs / (item.innings_batted - item.not_outs)).toFixed(2) 
          : item.total_runs;
        
        return (
          <View style={styles.tableRow}>
            <View style={[styles.tableCell, styles.colPlayer]}>
              <View style={styles.playerProfile}>
                <View>
                  <Text style={styles.cellMainText}>{playerName}</Text>
                  <View style={styles.idContainer}>
                    <Text style={styles.idText}>{(item.display_id || 'ID: UNKNOWN').toUpperCase()}</Text>
                    <Text style={styles.dotSeparator}>•</Text>
                    <Text style={styles.cellSubText}>{teamName}</Text>
                  </View>
                </View>
              </View>
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
              <View style={styles.playerProfile}>
                <View>
                  <Text style={styles.cellMainText}>{playerName}</Text>
                  <View style={styles.idContainer}>
                    <Text style={styles.idText}>{(item.display_id || 'ID: UNKNOWN').toUpperCase()}</Text>
                    <Text style={styles.dotSeparator}>•</Text>
                    <Text style={styles.cellSubText}>{teamName}</Text>
                  </View>
                </View>
              </View>
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
              <View style={styles.playerProfile}>
                <View>
                  <Text style={styles.cellMainText}>{playerName}</Text>
                  <View style={styles.idContainer}>
                    <Text style={styles.idText}>{(item.display_id || 'ID: UNKNOWN').toUpperCase()}</Text>
                    <Text style={styles.dotSeparator}>•</Text>
                    <Text style={styles.cellSubText}>{teamName}</Text>
                  </View>
                </View>
              </View>
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
              <View style={styles.playerProfile}>
                <View>
                  <Text style={styles.cellMainText}>{playerName}</Text>
                  <View style={styles.idContainer}>
                    <Text style={styles.idText}>{(item.display_id || 'BYG-XXXX-XXXX').toUpperCase()}</Text>
                    <Text style={styles.dotSeparator}>•</Text>
                    <Text style={styles.cellSubText}>{teamName}</Text>
                  </View>
                </View>
              </View>
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
                <Swords size={14} color={activeCategory === 'batting' ? '#10B981' : '#6B7280'} />
                <Text style={[styles.categoryText, activeCategory === 'batting' && styles.categoryTextActive]}>Batting</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                onPress={() => setActiveCategory('bowling')}
                style={[styles.categoryChip, activeCategory === 'bowling' && styles.categoryChipActive]}
                >
                <Zap size={14} color={activeCategory === 'bowling' ? '#10B981' : '#6B7280'} />
                <Text style={[styles.categoryText, activeCategory === 'bowling' && styles.categoryTextActive]}>Bowling</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                onPress={() => setActiveCategory('fielding')}
                style={[styles.categoryChip, activeCategory === 'fielding' && styles.categoryChipActive]}
                >
                <Target size={14} color={activeCategory === 'fielding' ? '#10B981' : '#6B7280'} />
                <Text style={[styles.categoryText, activeCategory === 'fielding' && styles.categoryTextActive]}>Fielding</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                onPress={() => setActiveCategory('captaincy')}
                style={[styles.categoryChip, activeCategory === 'captaincy' && styles.categoryChipActive]}
                >
                <Crown size={14} color={activeCategory === 'captaincy' ? '#10B981' : '#6B7280'} />
                <Text style={[styles.categoryText, activeCategory === 'captaincy' && styles.categoryTextActive]}>Captaincy</Text>
                </TouchableOpacity>
            </ScrollView>

            <View style={styles.divider} />

            <View style={styles.ballTypeRow}>
                {(['all', 'leather', 'tennis', 'other'] as BallType[]).map((type) => (
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

          <View style={styles.searchWrap}>
            <Search size={14} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              placeholder="Search by player or team..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={true} 
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View style={{ minWidth: isWeb ? 1100 : '100%', flex: 1 }}>
            {renderTableHeader()}
            <FlatList
              data={filteredStats}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.list, { flexGrow: 1 }]}
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
        </ScrollView>
      </View>
    </CricketSubbar>
  );

  return Platform.OS === 'web' ? (
    <WebLayout>{content}</WebLayout>
  ) : content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#10B981',
  },
  categoryText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  categoryTextActive: {
    color: '#10B981',
  },
  ballTypeRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 100,
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
    fontWeight: '700',
    color: '#9CA3AF',
    fontFamily: 'Inter',
  },
  ballTextActive: {
    color: '#111827',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    width: 240,
    height: 32,
    borderRadius: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#111827',
    fontFamily: 'Inter',
    outlineStyle: 'none' as any,
  },
  tableHeaderContainer: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 0,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  list: {
    flexGrow: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  tableCell: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'Inter',
  },
  colPlayer: { flex: 2 },
  colStat: { width: 55 },
  colStatSmall: { width: 45 },
  colStatFull: { flex: 1 },
  centerText: { textAlign: 'center' },
  boldText: { fontWeight: '600', color: '#111827' },
  cellMainText: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#111827', 
    fontFamily: 'Inter' 
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  idText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.3,
    fontFamily: 'Inter',
  },
  dotSeparator: {
    fontSize: 8,
    color: '#D1D5DB',
  },
  cellSubText: { 
    fontSize: 9.5, 
    color: '#9CA3AF', 
    fontFamily: 'Inter' 
  },
  emptyContainer: { padding: 80, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#9CA3AF', marginBottom: 4 },
  emptySubText: { fontSize: 12, color: '#9CA3AF' },
  mobileCard: { padding: 16, marginBottom: 12 },
  mobileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  mobilePlayerName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  mobileRuns: { fontSize: 16, fontWeight: '800', color: '#10b981' },
  mobileSubText: { fontSize: 13, color: '#6B7280' },
});
