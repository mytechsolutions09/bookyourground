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
  ActivityIndicator,
  Share,
  Modal
} from 'react-native';
import { 
  Filter, 
  HelpCircle, 
  Share2, 
  ChevronLeft, 
  Search,
  Star,
  MapPin,
  Trophy,
  X
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { getPlayerSlug } from '@/lib/utils';

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

  // Filter States
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filterCity, setFilterCity] = useState('All Cities');
  const [filterMetric, setFilterMetric] = useState('Rank');

  React.useEffect(() => {
    fetchLeaderboard();
  }, [activeCategory, activeType, filterCity, filterMetric]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out the top players on BookYourGround! Can you beat their ranks?',
        title: 'Player Leaderboard'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

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
        let formatted = lbData.map(item => {
          let displayStats = [];

          if (activeType === 'Batting') {
            const avg = item.innings_batted - (item.not_outs || 0) > 0 ? (item.total_runs / (item.innings_batted - (item.not_outs || 0))).toFixed(2) : (item.total_runs || 0).toFixed(2);
            displayStats = [
              { label: 'Inn', value: item.innings_batted || 0 },
              { label: 'Runs', value: item.total_runs || 0 },
              { label: 'Avg', value: avg },
              { label: 'SR', value: item.strike_rate || 0 }
            ];
          } else if (activeType === 'Bowling') {
            displayStats = [
              { label: 'Wkts', value: item.total_wickets || 0 },
              { label: 'BBI', value: `${item.best_bowling_wickets || 0}/${item.best_bowling_runs || 0}` },
              { label: 'Eco', value: item.economy_rate || 0 }
            ];
          } else {
            displayStats = [
              { label: 'Catches', value: item.total_catches || 0 },
              { label: 'Run Outs', value: item.run_outs || 0 },
              { label: 'Stumpings', value: item.stumpings || 0 }
            ];
          }

          return {
            id: item.member_id || item.profile_id || item.id || Math.random().toString(),
            name: item.full_name || 'Player',
            city: item.city || 'Unknown',
            rank: '000', // Will be calculated after sorting
            isPro: false,
            avatar: item.avatar_url,
            displayStats
          };
        });

        // Filter by city first
        if (filterCity !== 'All Cities') {
          formatted = formatted.filter(item => item.city?.toLowerCase() === filterCity.toLowerCase());
        }

        // Sort locally based on filterMetric
        formatted.sort((a, b) => {
          if (filterMetric === 'Runs' || (filterMetric === 'Rank' && activeType === 'Batting')) {
            return (b.displayStats.find((s: any) => s.label === 'Runs')?.value || 0) - (a.displayStats.find((s: any) => s.label === 'Runs')?.value || 0);
          } else if (filterMetric === 'Avg') {
            return parseFloat(b.displayStats.find((s: any) => s.label === 'Avg')?.value || 0) - parseFloat(a.displayStats.find((s: any) => s.label === 'Avg')?.value || 0);
          } else if (filterMetric === 'SR') {
            return parseFloat(b.displayStats.find((s: any) => s.label === 'SR')?.value || 0) - parseFloat(a.displayStats.find((s: any) => s.label === 'SR')?.value || 0);
          } else if (filterMetric === 'Wickets' || (filterMetric === 'Rank' && activeType === 'Bowling')) {
            return (b.displayStats.find((s: any) => s.label === 'Wkts')?.value || 0) - (a.displayStats.find((s: any) => s.label === 'Wkts')?.value || 0);
          } else if (filterMetric === 'Catches' || (filterMetric === 'Rank' && activeType === 'Fielding')) {
            return (b.displayStats.find((s: any) => s.label === 'Catches')?.value || 0) - (a.displayStats.find((s: any) => s.label === 'Catches')?.value || 0);
          }
          return 0; // Fallback
        });

        // Assign ranks based on sorted position
        formatted = formatted.map((item, index) => ({
          ...item,
          rank: String(index + 1).padStart(3, '0')
        }));

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
      onPress={() => router.push(`/players/${getPlayerSlug(item.name, item.id)}` as any)}
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
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setIsFilterVisible(true)}>
            <Filter size={22} color="#0F172A" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={handleShare}>
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
          <Text style={styles.filterHighlight}>{filterMetric === 'Rank' ? 'Top Ranked' : `Most ${filterMetric}`}</Text> in <Text style={styles.filterHighlight}>{filterCity}</Text> (All Time, All Overs)
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
          keyExtractor={(item, index) => item.id ? String(item.id) : String(index)}
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

      {/* Filter Modal */}
      <Modal
        visible={isFilterVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Leaderboard</Text>
              <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
                <X size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.filterSectionTitle}>City</Text>
              <View style={styles.filterOptions}>
                {['All Cities', 'Delhi', 'Gurugram', 'Noida'].map(city => (
                  <TouchableOpacity 
                    key={city}
                    style={[styles.filterOptionBtn, filterCity === city && styles.filterOptionBtnActive]}
                    onPress={() => setFilterCity(city)}
                  >
                    <Text style={[styles.filterOptionText, filterCity === city && styles.filterOptionTextActive]}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterSectionTitle}>Metric (Sort By)</Text>
              <View style={styles.filterOptions}>
                {['Rank', 'Runs', 'Avg', 'SR', 'Wickets', 'Catches'].map(metric => {
                  if (activeType === 'Batting' && ['Wickets', 'Catches'].includes(metric)) return null;
                  if (activeType === 'Bowling' && ['Runs', 'Avg', 'SR', 'Catches'].includes(metric)) return null;
                  if (activeType === 'Fielding' && ['Runs', 'Avg', 'SR', 'Wickets'].includes(metric)) return null;
                  
                  return (
                    <TouchableOpacity 
                      key={metric}
                      style={[styles.filterOptionBtn, filterMetric === metric && styles.filterOptionBtnActive]}
                      onPress={() => setFilterMetric(metric)}
                    >
                      <Text style={[styles.filterOptionText, filterMetric === metric && styles.filterOptionTextActive]}>{metric}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setIsFilterVisible(false)}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 12,
    marginTop: 10,
    fontFamily: 'Inter',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  filterOptionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterOptionBtnActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  filterOptionText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  filterOptionTextActive: {
    color: '#16A34A',
  },
  modalFooter: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  applyBtn: {
    backgroundColor: '#121212',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
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
