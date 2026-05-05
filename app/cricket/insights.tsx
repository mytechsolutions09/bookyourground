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
  Platform
} from 'react-native';
import { 
  ChevronLeft, 
  Search, 
  Bell, 
  HelpCircle, 
  Share2,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

const TABS = ['Batting', 'Bowling', 'Compare', 'Face Off'];

export default function CricketInsights() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Batting');
  const [profile, setProfile] = useState<any>(null);
  const [battingStats, setBattingStats] = useState<any[]>([]);
  const [bowlingStats, setBowlingStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      setProfile(prof);

      // 2. Fetch Batting Stats (Last 5)
      const { data: bStats } = await supabase
        .from('player_match_batting_stats')
        .select('*')
        .eq('profile_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setBattingStats(bStats || []);

      // 3. Fetch Bowling Stats (Last 5)
      const { data: boStats } = await supabase
        .from('player_match_bowling_stats')
        .select('*')
        .eq('profile_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setBowlingStats(boStats || []);

    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBattingInsights = () => {
    if (battingStats.length === 0) return { totalRuns: 0, caughtOut: 0, notOuts: 0, avg: '0.00', sr: '0.00' };
    
    const totalRuns = battingStats.reduce((sum, s) => sum + (s.runs || 0), 0);
    const totalBalls = battingStats.reduce((sum, s) => sum + (s.balls || 0), 0);
    const outs = battingStats.filter(s => s.is_out).length;
    const caughtOut = battingStats.filter(s => s.dismissal_type === 'caught').length;
    const notOuts = battingStats.length - outs;
    
    const avg = outs > 0 ? (totalRuns / outs).toFixed(2) : totalRuns.toFixed(2);
    const sr = totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(2) : '0.00';

    return { totalRuns, caughtOut, notOuts, avg, sr };
  };

  const calculateBowlingInsights = () => {
    if (bowlingStats.length === 0) return { totalWickets: 0, bestBowling: '-', avg: '0.00', econ: '0.00' };
    
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

    return { totalWickets, bestBowling, avg, econ };
  };

  const battingInsights = calculateBattingInsights();
  const bowlingInsights = calculateBowlingInsights();

  const formatName = (name: string) => {
    if (!name) return 'Player';
    return name.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' ');
  };

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
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Search size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <View style={styles.notifWrapper}>
              <Bell size={24} color="#000" />
              <View style={styles.notifBadge}><Text style={styles.notifText}>0</Text></View>
            </View>
          </TouchableOpacity>
        </View>
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
                <HelpCircle size={20} color="#94A3B8" />
                <Share2 size={20} color="#94A3B8" />
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
                  <Text style={styles.matchText} numberOfLines={1}>{item.match_title}</Text>
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
            </View>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: 30 }]}>Sr.</Text>
              <Text style={[styles.tableHeaderText, { width: 70 }]}>Date</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Innings</Text>
              <Text style={[styles.tableHeaderText, { width: 60, textAlign: 'center' }]}>O-M-R-W</Text>
              <Text style={[styles.tableHeaderText, { width: 30, textAlign: 'right' }]}>Ov.</Text>
            </View>

            {/* Table Rows */}
            {bowlingStats.length > 0 ? bowlingStats.map((item, idx) => (
              <View key={item.match_id} style={styles.tableRow}>
                <Text style={[styles.tableRowText, { width: 30, color: '#94A3B8' }]}>{idx + 1}</Text>
                <Text style={[styles.tableRowText, { width: 70, color: '#FFFFFF' }]}>{new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.matchText} numberOfLines={1}>{item.match_title}</Text>
                </View>
                <Text style={[styles.tableRowText, { width: 60, textAlign: 'center', color: '#FFFFFF', fontWeight: '700' }]}>
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

        {/* Insights Summary Cards */}
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
                  <Text style={styles.summaryLabelText}>Total runs in last {battingStats.length} Innings</Text>
               </View>

               <View style={styles.summaryCard}>
                  <View style={styles.summaryValueBox}>
                     <Text style={styles.summaryValueTextGreen}>{battingInsights.caughtOut}</Text>
                  </View>
                  <Text style={styles.summaryLabelText}>Caught out in last {battingStats.length} Innings</Text>
               </View>

               <View style={styles.summaryCard}>
                  <View style={styles.summaryValueBox}>
                     <Text style={styles.summaryValueTextGreen}>{battingInsights.notOuts}</Text>
                  </View>
                  <Text style={styles.summaryLabelText}>Not out in last {battingStats.length} Innings</Text>
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
                  <Text style={styles.summaryLabelText}>Total wickets in last {bowlingStats.length} Innings</Text>
               </View>

               <View style={styles.summaryCard}>
                  <View style={styles.summaryValueBox}>
                     <Text style={styles.summaryValueTextGreen}>{bowlingInsights.bestBowling}</Text>
                  </View>
                  <Text style={styles.summaryLabelText}>Best performance in last {bowlingStats.length} Innings</Text>
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
               <Text style={styles.emptyTitle}>Comparison & Face-Off Coming Soon</Text>
               <Text style={styles.emptySubtitle}>We are working on bringing advanced head-to-head metrics to your dashboard.</Text>
             </View>
           )}
        </View>
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
    fontWeight: '800',
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
  }
});
