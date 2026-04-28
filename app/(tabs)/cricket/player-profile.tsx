import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text as RNText, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Platform,
  TextInput as RNTextInput,
  Modal,
  FlatList,
  Alert,
  useWindowDimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { 
  User, 
  MapPin, 
  Award, 
  TrendingUp, 
  Shield, 
  ChevronRight,
  Target,
  Zap,
  Star,
  Edit3,
  Save,
  X,
  Circle,
  Camera,
  Flame,
  Database,
  Plus,
  Trophy,
  ChevronDown,
  Search
} from 'lucide-react-native';
import { 
  useFocusEffect 
} from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getPlayerTags } from '@/lib/stats-logic';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import WebLayout from '@/components/web/WebLayout';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", 
  "Ladakh", "Lakshadweep", "Puducherry"
];

const PlayerProfileView = () => {
  const { profile, loading: authLoading, user } = useAuth();
  const { width } = useWindowDimensions();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedData, setEditedData] = useState<any>({});
  
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [fetchingData, setFetchingData] = useState(true);

  const isSmall = width < 900;

  useEffect(() => {
    if (profile) {
      setEditedData({
        full_name: profile.full_name,
        player_type: profile.player_type,
        batting_style: profile.batting_style,
        bowling_style: profile.bowling_style,
        dob: profile.dob ? formatDateDisplay(profile.dob) : '',
        state: profile.state,
      });
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;
    setFetchingData(true);
    try {
      // 1. Fetch team members for the user to get their player IDs
      const { data: members } = await supabase
        .from('team_members')
        .select('id, team_id')
        .eq('profile_id', user.id);
      
      const memberIds = members?.map(m => m.id) || [];

      if (memberIds.length > 0) {
        // 2. Fetch global stats from player_ball_stats
        const { data: statsData } = await supabase
          .from('player_ball_stats')
          .select('*')
          .in('member_id', memberIds);
        
        if (statsData && statsData.length > 0) {
          const summed = statsData.reduce((acc, curr) => ({
            total_runs: (acc.total_runs || 0) + (curr.total_runs || 0),
            total_wickets: (acc.total_wickets || 0) + (curr.total_wickets || 0),
            matches_played: (acc.matches_played || 0) + (curr.matches_played || 0),
            innings_batted: (acc.innings_batted || 0) + (curr.innings_batted || 0),
            not_outs: (acc.not_outs || 0) + (curr.not_outs || 0),
            runs_conceded: (acc.runs_conceded || 0) + (curr.runs_conceded || 0),
            overs_bowled: (acc.overs_bowled || 0) + (curr.overs_bowled || 0),
          }), {} as any);

          const batting_avg = summed.total_runs / (summed.innings_batted - summed.not_outs || 1);
          setGlobalStats({
            ...summed,
            batting_avg: batting_avg.toFixed(1)
          });
        }

        // 3. Fetch recent matches where the user played
        const { data: playingXi } = await supabase
          .from('match_playing_xi')
          .select('match_id')
          .in('player_id', memberIds);
        
        const matchIds = playingXi?.map(p => p.match_id) || [];

        if (matchIds.length > 0) {
          const { data: matchesData } = await supabase
            .from('matches')
            .select(`
              id,
              team_a,
              team_b,
              team_a_id,
              team_b_id,
              date_time,
              status,
              innings(*)
            `)
            .in('id', matchIds)
            .order('date_time', { ascending: false })
            .limit(5);
          
          if (matchesData) {
            const formattedMatches = matchesData.map(m => {
              // Find user's performance in this match's innings
              let performance: any = null;
              let type: 'Batting' | 'Bowling' = 'Batting';

              m.innings?.forEach(inn => {
                const batters = inn.batting_players || [];
                const bowlers = inn.bowling_players || [];

                // Try to find by name (approximate) or if we had player_id in JSON
                const batter = batters.find((b: any) => b.name === (profile?.full_name || ''));
                const bowler = bowlers.find((b: any) => b.name === (profile?.full_name || ''));

                if (batter) {
                  performance = `${batter.runs} (${batter.balls})`;
                  type = 'Batting';
                } else if (bowler) {
                  performance = `${bowler.wickets}/${bowler.runs} (${bowler.overs})`;
                  type = 'Bowling';
                }
              });

              // Determine opponent
              // Find which team the user belongs to in this match
              const userIsTeamA = members?.some(mem => mem.team_id === m.team_a_id);
              const opponent = userIsTeamA ? m.team_b : m.team_a;

              return {
                id: m.id,
                opponent: opponent || 'Unknown Opponent',
                date: new Date(m.date_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                status: m.status === 'completed' ? 'Won' : m.status, // Placeholder for result logic
                score: performance || 'DNP',
                type: type
              };
            });
            setRecentMatches(formattedMatches);
          }
        }
      }
    } catch (err) {
      console.error('Error loading profile data:', err);
    } finally {
      setFetchingData(false);
    }
  };

  const formatDateDisplay = (dateStr: string | null) => {
    if (!dateStr) return 'Not Set';
    try {
      const [y, m, d] = dateStr.split('-');
      if (!y || !m || !d) return dateStr;
      return `${d}-${m}-${y}`;
    } catch {
      return dateStr;
    }
  };

  const formatDateStorage = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const [d, m, y] = dateStr.split('-');
      if (!d || !m || !y) return dateStr;
      return `${y}-${m}-${d}`;
    } catch {
      return dateStr;
    }
  };

  const { updateProfile } = useAuth();

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const dataToSave = {
        ...editedData,
        dob: formatDateStorage(editedData.dob)
      };
      const { error } = await updateProfile(dataToSave);
      
      if (!error) {
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        throw error;
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
             <RNText style={styles.statValue}>{globalStats?.total_runs || 0}</RNText>
             <RNText style={styles.statLabel}>Runs</RNText>
          </View>
          <View style={styles.statBox}>
             <RNText style={styles.statValue}>{globalStats?.total_wickets || 0}</RNText>
             <RNText style={styles.statLabel}>Wickets</RNText>
          </View>
          <View style={styles.statBox}>
             <RNText style={styles.statValue}>{globalStats?.matches_played || 0}</RNText>
             <RNText style={styles.statLabel}>Matches</RNText>
          </View>
          <View style={styles.statBox}>
             <RNText style={styles.statValue}>{globalStats?.batting_avg || '0.0'}</RNText>
             <RNText style={styles.statLabel}>Average</RNText>
          </View>
        </View>
      </View>

      {fetchingData && (
        <View style={{ padding: 20 }}>
          <ActivityIndicator color="#01b854" />
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <RNText style={styles.sectionTitle}>Career Excellence</RNText>
          {!isEditing && (
            <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
              <Edit3 size={18} color="#01b854" />
              <RNText style={styles.editBtnText}>Edit</RNText>
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View style={styles.editForm}>
            <View style={styles.inputGroup}>
              <RNText style={styles.inputLabel}>Full Name</RNText>
              <RNTextInput 
                style={styles.monoInput}
                value={editedData.full_name}
                onChangeText={(t) => setEditedData({ ...editedData, full_name: t })}
              />
            </View>

            <View style={styles.inputGroup}>
              <RNText style={styles.inputLabel}>Birthday (DD-MM-YYYY)</RNText>
              <RNTextInput 
                style={styles.monoInput}
                value={editedData.dob}
                placeholder="25-10-1995"
                onChangeText={(t) => setEditedData({ ...editedData, dob: t })}
              />
            </View>

            <View style={styles.inputGroup}>
              <RNText style={styles.inputLabel}>State</RNText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monoChips}>
                {INDIAN_STATES.map(s => (
                  <TouchableOpacity 
                    key={s} 
                    style={[styles.monoChip, editedData.state === s && styles.monoChipActive]}
                    onPress={() => setEditedData({ ...editedData, state: s })}
                  >
                    <RNText style={[styles.monoChipText, editedData.state === s && styles.monoChipTextActive]}>{s}</RNText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.inputGroup}>
              <RNText style={styles.inputLabel}>Player Type</RNText>
              <View style={styles.monoChips}>
                {['Batsman', 'Bowler', 'All-rounder', 'Wicketkeeper'].map(s => (
                  <TouchableOpacity 
                    key={s} 
                    style={[styles.monoChip, editedData.player_type === s && styles.monoChipActive]}
                    onPress={() => setEditedData({ ...editedData, player_type: s })}
                  >
                    <RNText style={[styles.monoChipText, editedData.player_type === s && styles.monoChipTextActive]}>{s}</RNText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <RNText style={styles.inputLabel}>Batting Style</RNText>
              <View style={styles.monoChips}>
                {['Right Hand', 'Left Hand'].map(s => (
                  <TouchableOpacity 
                    key={s} 
                    style={[styles.monoChip, editedData.batting_style === s && styles.monoChipActive]}
                    onPress={() => setEditedData({ ...editedData, batting_style: s })}
                  >
                    <RNText style={[styles.monoChipText, editedData.batting_style === s && styles.monoChipTextActive]}>{s}</RNText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <RNText style={styles.inputLabel}>Bowling Style</RNText>
              <View style={styles.monoChips}>
                {['Right Arm Fast', 'Left Arm Fast', 'Right Arm Spin', 'Left Arm Spin'].map(s => (
                  <TouchableOpacity 
                    key={s} 
                    style={[styles.monoChip, editedData.bowling_style === s && styles.monoChipActive]}
                    onPress={() => setEditedData({ ...editedData, bowling_style: s })}
                  >
                    <RNText style={[styles.monoChipText, editedData.bowling_style === s && styles.monoChipTextActive]}>{s}</RNText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.monoActions}>
               <TouchableOpacity style={styles.monoBtnCancel} onPress={() => setIsEditing(false)}>
                 <RNText style={styles.monoBtnCancelText}>Cancel</RNText>
               </TouchableOpacity>
               <TouchableOpacity style={styles.monoBtnSave} onPress={handleSave} disabled={saving}>
                 {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <RNText style={styles.monoBtnSaveText}>Update</RNText>}
               </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.detailsRowsMinimal}>
            {[
              { label: 'Birthday', value: formatDateDisplay(profile?.dob), icon: <Target size={14} color="#94A3B8" /> },
              { label: 'State', value: profile?.state || 'Not Set' },
              { label: 'Role', value: profile?.player_type || 'Not Set' },
              { label: 'Batting', value: profile?.batting_style || 'Not Set' },
              { label: 'Bowling', value: profile?.bowling_style || 'Not Set' },
            ].map((item, idx) => (
              <View key={idx} style={styles.detailRowMinimal}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <RNText style={styles.detailLabelMinimal}>{item.label}</RNText>
                </View>
                <RNText style={styles.detailValueMinimal}>{item.value}</RNText>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <RNText style={styles.sectionTitle}>Recent Forms</RNText>
          <TouchableOpacity>
            <RNText style={styles.viewAllBtn}>History</RNText>
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          {recentMatches.length > 0 ? (
            recentMatches.map((m, idx) => (
              <React.Fragment key={m.id}>
                <View style={styles.formRow}>
                  <View style={styles.matchInfo}>
                    <RNText style={styles.matchOpponent}>vs {m.opponent}</RNText>
                    <RNText style={styles.matchDate}>{m.date} • {m.status}</RNText>
                  </View>
                  <View style={styles.matchScore}>
                    <RNText style={styles.scoreText}>{m.score}</RNText>
                    <RNText style={styles.perfLabel}>{m.type}</RNText>
                  </View>
                </View>
                {idx < recentMatches.length - 1 && <View style={styles.formDivider} />}
              </React.Fragment>
            ))
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <RNText style={{ color: '#94A3B8', fontSize: 13 }}>No recent matches found</RNText>
            </View>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
        <View style={[styles.badgeCard, { backgroundColor: '#FFF7ED' }]}>
          <Award size={32} color="#F97316" />
          <RNText style={styles.badgeTitle}>Century Maker</RNText>
          <RNText style={styles.badgeDesc}>Scored 100+ in a match</RNText>
        </View>
        <View style={[styles.badgeCard, { backgroundColor: 'rgba(216, 247, 157, 0.1)' }]}>
          <Zap size={32} color="#01b854" />
          <RNText style={styles.badgeTitle}>Quick Fire</RNText>
          <RNText style={styles.badgeDesc}>200+ Strike rate match</RNText>
        </View>
      </ScrollView>
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return content;
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  profileMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  avatarBox: {
    position: 'relative',
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#01b854',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#01b854',
    padding: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    color: '#64748B',
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#01b854',
  },
  statsGrid: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#01b854',
  },
  editForm: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  monoInput: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  monoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  monoChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  monoChipActive: {
    backgroundColor: '#01b854',
    borderColor: '#01b854',
  },
  monoChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  monoChipTextActive: {
    color: '#FFFFFF',
  },
  monoActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  monoBtnCancel: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
  },
  monoBtnCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  monoBtnSave: {
    flex: 2,
    backgroundColor: '#01b854',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  monoBtnSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailsRowsMinimal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailRowMinimal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  detailLabelMinimal: {
    fontSize: 14,
    color: '#64748B',
  },
  detailValueMinimal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  matchOpponent: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  matchDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#01b854',
    textAlign: 'right',
  },
  perfLabel: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'right',
  },
  formDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  viewAllBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: '#01b854',
  },
  badgesScroll: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  badgeCard: {
    width: 200,
    padding: 20,
    borderRadius: 20,
    marginRight: 16,
    gap: 8,
  },
  badgeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  badgeDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
});

export default PlayerProfileView;
