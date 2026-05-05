import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  FlatList,
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import { 
  Filter, 
  HelpCircle, 
  Share2, 
  ChevronLeft, 
  Search,
  Star,
  MapPin,
  Trophy
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

const CATEGORIES = ['Leather', 'Tennis', 'Box Cricket'];
const TYPES = ['Batting', 'Bowling', 'Fielding'];

export default function CricketRank() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('Leather');
  const [activeType, setActiveType] = useState('Batting');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchLeaderboard();
  }, [activeCategory, activeType]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const typeMap: Record<string, string> = {
        'Leather': 'leather',
        'Tennis': 'tennis',
        'Box Cricket': 'other'
      };
      
      const ballType = typeMap[activeCategory];
      
      let { data: lbData, error } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('ball_type', ballType);
        
      if (error) throw error;

      if (lbData) {
        const formatted = lbData.map(item => {
          let rank = '000';
          let displayStats = [];

          if (activeType === 'Batting') {
            rank = String(item.batting_rank).padStart(3, '0');
            displayStats = [
              { label: 'Inn', value: item.inn },
              { label: 'Runs', value: item.runs },
              { label: 'Avg', value: item.avg },
              { label: 'SR', value: item.sr }
            ];
          } else if (activeType === 'Bowling') {
            rank = String(item.bowling_rank).padStart(3, '0');
            const economy = item.best_bowling_runs > 0 ? (item.best_bowling_runs / 6).toFixed(2) : '0.00'; // Simplified eco for now
            displayStats = [
              { label: 'Wkts', value: item.wickets },
              { label: 'BBI', value: `${item.best_bowling_wickets}/${item.best_bowling_runs}` },
              { label: 'Eco', value: economy }
            ];
          } else {
            rank = String(item.fielding_rank).padStart(3, '0');
            displayStats = [
              { label: 'Catches', value: item.catches },
              { label: 'Run Outs', value: item.run_outs },
              { label: 'Stumpings', value: item.stumpings }
            ];
          }

          return {
            id: item.profile_id,
            name: item.full_name,
            city: item.city,
            rank,
            isPro: false, // Default to false for now
            avatar: item.avatar_url,
            displayStats
          };
        });

        // Sort by rank number
        formatted.sort((a, b) => parseInt(a.rank) - parseInt(b.rank));
        setData(formatted);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderRankItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.rankItem}
      onPress={() => router.push(`/players/${item.id}` as any)}
    >
      <View style={styles.playerInfoRow}>
        <View style={styles.avatarContainer}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
              <Star size={20} color="#CBD5E1" />
            </View>
          )}
          {item.isPro && (
            <View style={styles.proBadge}>
              <Text style={styles.proText}>PRO</Text>
            </View>
          )}
        </View>
        <View style={styles.detailsContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.playerName}>{item.name}</Text>
            <Text style={styles.cityText}>{item.city}</Text>
          </View>
          <View style={styles.statsRow}>
            {item.displayStats.map((stat: any, idx: number) => (
              <React.Fragment key={idx}>
                <Text style={styles.statLabel}>{stat.label}: <Text style={styles.statValue}>{stat.value}</Text></Text>
                {idx < item.displayStats.length - 1 && <View style={styles.statDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>
        <View style={styles.rankContainer}>
          <Text style={styles.rankNumber}>{item.rank}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Player Leaderboard</Text>
        <View style={styles.headerRightActions}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <HelpCircle size={22} color="#64748B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Filter size={22} color="#0F172A" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Share2 size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Tabs */}
      <View style={styles.categoryTabs}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity 
            key={cat} 
            onPress={() => setActiveCategory(cat)}
            style={[styles.categoryTab, activeCategory === cat && styles.categoryTabActive]}
          >
            <Text style={[styles.categoryTabText, activeCategory === cat && styles.categoryTabTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Type Segmented Control */}
      <View style={styles.typeContainer}>
        <View style={styles.typeSegment}>
          {TYPES.map(type => (
            <TouchableOpacity 
              key={type} 
              onPress={() => setActiveType(type)}
              style={[styles.typeBtn, activeType === type && styles.typeBtnActive]}
            >
              <Text style={[styles.typeBtnText, activeType === type && styles.typeBtnTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Filter Summary */}
      <View style={styles.filterSummary}>
        <Text style={styles.filterText}>
          <Text style={styles.filterHighlight}>Most Runs</Text> in <Text style={styles.filterHighlight}>Delhi (All Time, All Overs)</Text>
        </Text>
      </View>

      {/* Leaderboard List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={{ marginTop: 12, color: '#64748B', fontFamily: 'Inter' }}>Loading Rankings...</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderRankItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Trophy size={48} color="#E2E8F0" />
              <Text style={{ marginTop: 16, color: '#94A3B8', fontSize: 16, fontWeight: '600' }}>No Rankings Found</Text>
              <Text style={{ color: '#CBD5E1', fontSize: 14 }}>Try changing category or filter</Text>
            </View>
          }
          ListFooterComponent={
          <TouchableOpacity style={styles.challengeCard}>
             <View style={styles.challengeHeader}>
                <View style={styles.challengeTitleRow}>
                  <Text style={styles.challengeIcon}>🎯</Text>
                  <Text style={styles.challengeTitle}>Ready to challenge yourself?</Text>
                </View>
                <TouchableOpacity><Text style={styles.closeIcon}>✕</Text></TouchableOpacity>
             </View>
             <View style={styles.exploreSection}>
                <View style={styles.tournamentMiniCard}>
                   <View style={styles.formatBadge}>
                      <Text style={styles.formatText}>2 30s</Text>
                   </View>
                   <Text style={styles.tournamentName}>Two 30s</Text>
                   <View style={styles.limitedRow}>
                      <Text style={styles.limitedText}>Limited Overs 🎾</Text>
                   </View>
                   <TouchableOpacity style={styles.joinBtn}>
                      <Text style={styles.joinBtnText}>Join</Text>
                   </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.exploreBtn}>
                   <Text style={styles.exploreBtnText}>Explore</Text>
                </TouchableOpacity>
             </View>
          </TouchableOpacity>
        }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
    flex: 1,
    textAlign: 'center',
  },
  headerIconBtn: {
    padding: 4,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  categoryTabActive: {
    borderBottomColor: '#7C3AED', 
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  categoryTabTextActive: {
    color: '#0F172A',
  },
  typeContainer: {
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  typeSegment: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 2,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  typeBtnTextActive: {
    color: '#0F172A',
  },
  filterSummary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  filterHighlight: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 20,
  },
  rankItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    backgroundColor: '#FFFFFF',
  },
  playerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F5F9',
  },
  proBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#01b854',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  proText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  cityText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    fontFamily: 'Inter',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  statValue: {
    fontWeight: '700',
    color: '#334155',
  },
  statDivider: {
    width: 1,
    height: 10,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 6,
  },
  rankContainer: {
    alignItems: 'flex-end',
    width: 50,
  },
  rankNumber: {
    fontSize: 24,
    fontWeight: '300',
    color: '#1E293B',
    fontFamily: 'Inter',
  },
  challengeCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  challengeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  challengeIcon: {
    fontSize: 18,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EF4444',
    fontFamily: 'Inter',
  },
  closeIcon: {
    color: '#94A3B8',
    fontSize: 16,
  },
  exploreSection: {
    alignItems: 'center',
  },
  tournamentMiniCard: {
    width: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  formatBadge: {
    backgroundColor: '#7C2D12',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  formatText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  tournamentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  limitedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  limitedText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  joinBtn: {
    backgroundColor: '#EAB308',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  exploreBtn: {
    marginTop: 20,
  },
  exploreBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EAB308',
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
