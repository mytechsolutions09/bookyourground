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
  FlatList
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
  ChevronDown,
  Search
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { getPlayerTags } from '@/lib/stats-logic';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", 
  "Ladakh", "Lakshadweep", "Puducherry"
];

export default function PlayerProfile() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>({});
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      loadPlayerData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadPlayerData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (profileError) throw profileError;
      setProfile(profileData);

      // 2. Fetch Aggregated Stats (Leather by default)
      // We look for any team member record associated with this profile
      const { data: memberRecords } = await supabase
        .from('team_members')
        .select('id')
        .eq('profile_id', user?.id);

      if (memberRecords && memberRecords.length > 0) {
        const memberIds = memberRecords.map(m => m.id);
        const { data: statsData } = await supabase
          .from('player_ball_stats')
          .select('*')
          .in('member_id', memberIds)
          .eq('ball_type', 'leather');
        
        if (statsData && statsData.length > 0) {
            const agg = statsData.reduce((acc, curr) => ({
              matches: acc.matches + curr.matches_played,
              runs: acc.runs + curr.total_runs,
              wickets: acc.wickets + curr.total_wickets,
              catches: acc.catches + (curr.total_catches || 0),
              sr: Math.max(acc.sr, curr.strike_rate),
              highest: Math.max(acc.highest, curr.highest_score),
              innings_batted: acc.innings_batted + (curr.innings_batted || 0),
              innings_bowled: acc.innings_bowled + (curr.innings_bowled || 0),
              not_outs: acc.not_outs + (curr.not_outs || 0),
              runs_conceded: acc.runs_conceded + (curr.runs_conceded || 0),
              overs_bowled: acc.overs_bowled + (Number(curr.overs_bowled) || 0),
              strike_rate: acc.strike_rate // Just use the max SR for tagging logic if ambiguous, or calculate weighted
            }), { 
              matches: 0, runs: 0, wickets: 0, catches: 0, sr: 0, highest: 0,
              innings_batted: 0, innings_bowled: 0, not_outs: 0, runs_conceded: 0,
              overs_bowled: 0, strike_rate: 0
            });
            
            // Recalculate average strike rate for tagging logic
            agg.strike_rate = agg.matches > 0 ? (statsData[0].strike_rate) : 0; 
            
            setStats(agg);
          }
      }
    } catch (err) {
      console.error('Error loading player data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditedData({
      full_name: profile?.full_name || '',
      address: profile?.address || '',
      state: profile?.state || '',
      player_type: profile?.player_type || 'All Rounder',
      batting_style: profile?.batting_style || 'Right Hand Bat',
      bowling_style: profile?.bowling_style || 'Right Arm Fast'
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update(editedData)
        .eq('id', user?.id);
      
      if (error) throw error;
      setProfile({ ...profile, ...editedData });
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0].uri) {
        uploadAvatar(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error picking image:', err);
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      setUploading(true);
      const fileExt = uri.split('.').pop();
      const fileName = `${user?.id}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Convert URI to Blob
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setEditedData({ ...editedData, avatar_url: publicUrl });
      // Also update immediate profile view for feedback
      setProfile({ ...profile, avatar_url: publicUrl });
    } catch (err) {
      console.error('Error uploading avatar:', err);
      alert('Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#01b854" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loginRequired}>
        <View style={styles.loginIconBox}>
          <User size={48} color="#01b854" />
        </View>
        <RNText style={styles.loginTitle}>Profile Not Available</RNText>
        <RNText style={styles.loginSubtitle}>
          Please login to view your cricket profile, track elite stats, and manage teams.
        </RNText>
        <TouchableOpacity 
          style={styles.loginBtn}
          onPress={() => router.push('/(auth)/login' as any)}
        >
          <RNText style={styles.loginBtnText}>Login / Sign Up</RNText>
        </TouchableOpacity>
      </View>
    );
  }

  const StatItem = ({ label, value, icon: Icon, color }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: color + '15' }]}>
        <Icon size={20} color={color} />
      </View>
      <View>
        <RNText style={styles.statValue}>{value}</RNText>
        <RNText style={styles.statLabel}>{label}</RNText>
      </View>
    </View>
  );

  const playerTags = getPlayerTags(stats);

  const renderTagIcon = (iconName: string, color: string) => {
    const props = { size: 14, color };
    switch (iconName) {
      case 'zap': return <Zap {...props} />;
      case 'flame': return <Flame {...props} />;
      case 'trending-up': return <TrendingUp {...props} />;
      case 'target': return <Target {...props} />;
      case 'shield': return <Shield {...props} />;
      case 'database': return <Database {...props} />;
      case 'plus': return <Plus {...props} />;
      case 'star': return <Star {...props} />;
      default: return <Award {...props} />;
    }
  };

  const filteredStates = INDIAN_STATES.filter(s => 
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* State Picker Modal */}
      <Modal
        visible={showStatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.stateModalContent}>
            <View style={styles.modalHeader}>
              <RNText style={styles.modalTitle}>Select State</RNText>
              <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                <X size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchContainer}>
              <Search size={18} color="#94A3B8" />
              <RNTextInput
                style={styles.modalSearchInput}
                placeholder="Search state..."
                value={stateSearch}
                onChangeText={setStateSearch}
                autoFocus
                // @ts-ignore
                outlineStyle="none"
              />
            </View>

            <FlatList
              data={filteredStates}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.stateItem}
                  onPress={() => {
                    setEditedData({ ...editedData, state: item });
                    setShowStatePicker(false);
                    setStateSearch('');
                  }}
                >
                  <RNText style={[styles.stateItemText, editedData.state === item && styles.stateItemTextActive]}>
                    {item}
                  </RNText>
                  {editedData.state === item && <View style={styles.activeDot} />}
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </View>
      </Modal>

      {/* Profile Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.profileMain}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            disabled={!isEditing || uploading}
            onPress={pickImage}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={40} color="#94A3B8" />
              </View>
            )}
            
            {uploading ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : isEditing && (
              <View style={styles.avatarOverlay}>
                <Camera size={20} color="#FFFFFF" />
              </View>
            )}

          </TouchableOpacity>
          
          <View style={styles.profileInfo}>
            {isEditing ? (
              <View style={styles.editForm}>
                <RNTextInput
                  style={styles.editInput}
                  value={editedData.full_name}
                  onChangeText={(t) => setEditedData({ ...editedData, full_name: t })}
                  placeholder="Full Name"
                  // @ts-ignore
                  outlineStyle="none"
                />
                <View style={[styles.locationRow, { marginTop: 8 }]}>
                  <MapPin size={14} color="#64748B" />
                  <TouchableOpacity 
                    style={[styles.stateSelectorTrigger, { marginLeft: 0, flex: 1, justifyContent: 'space-between' }]}
                    onPress={() => setShowStatePicker(true)}
                  >
                    <RNText style={[styles.stateSelectorText, !editedData.state && { color: '#94A3B8' }]}>
                      {editedData.state || 'Select Your State'}
                    </RNText>
                    <ChevronDown size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.nameRow}>
                  <RNText style={styles.profileName}>{profile?.full_name || 'Cricket Player'}</RNText>
                  <TouchableOpacity onPress={handleEdit} style={styles.editBtn}>
                    <Edit3 size={16} color="#01b854" />
                  </TouchableOpacity>
                </View>

                {/* Dynamic Player Tags */}
                {playerTags.length > 0 && (
                  <View style={styles.tagSection}>
                     {playerTags.map(tag => (
                       <View key={tag.id} style={[styles.styleTag, { backgroundColor: tag.color + '10', borderColor: tag.color + '30' }]}>
                          {renderTagIcon(tag.icon, tag.color)}
                          <RNText style={[styles.styleTagText, { color: tag.color }]}>{tag.label}</RNText>
                       </View>
                     ))}
                  </View>
                )}

                <View style={styles.locationRow}>
                  <MapPin size={14} color="#64748B" />
                  <RNText style={styles.locationText}>
                    {profile?.state || 'Location not set'}
                  </RNText>
                </View>
              </>
            )}

            <View style={styles.roleTags}>
              {isEditing ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
                   {['All Rounder', 'Batter', 'Bowler', 'Wicket Keeper'].map(role => (
                     <TouchableOpacity 
                        key={role} 
                        style={[styles.editChip, editedData.player_type === role && styles.editChipActive]}
                        onPress={() => setEditedData({ ...editedData, player_type: role })}
                     >
                       <RNText style={[styles.editChipText, editedData.player_type === role && styles.editChipTextActive]}>{role}</RNText>
                     </TouchableOpacity>
                   ))}
                </ScrollView>
              ) : (
                <View style={styles.roleTag}>
                  <RNText style={styles.roleTagText}>{profile?.player_type || 'All Rounder'}</RNText>
                </View>
              )}
            </View>

            {!isEditing && (
              <View style={[styles.roleTags, { marginTop: 6 }]}>
                <View style={[styles.roleTag, { backgroundColor: '#F0FDF4' }]}>
                  <RNText style={[styles.roleTagText, { color: '#166534' }]}>{profile?.batting_style || 'Right Hand Bat'}</RNText>
                </View>
                <View style={[styles.roleTag, { backgroundColor: '#FEF2F2' }]}>
                  <RNText style={[styles.roleTagText, { color: '#991B1B' }]}>{profile?.bowling_style || 'Right Arm Fast'}</RNText>
                </View>
              </View>
            )}
          </View>
        </View>

        {isEditing && (
          <View style={styles.editSections}>
             <View style={styles.editSection}>
                <RNText style={styles.editSectionTitle}>Batting Style</RNText>
                <View style={styles.chipRow}>
                  {['Right Hand Bat', 'Left Hand Bat'].map(s => (
                    <TouchableOpacity 
                      key={s} 
                      style={[styles.editChip, editedData.batting_style === s && styles.editChipActive]}
                      onPress={() => setEditedData({ ...editedData, batting_style: s })}
                    >
                      <RNText style={[styles.editChipText, editedData.batting_style === s && styles.editChipTextActive]}>{s}</RNText>
                    </TouchableOpacity>
                  ))}
                </View>
             </View>

             <View style={styles.editSection}>
                <RNText style={styles.editSectionTitle}>Bowling Style</RNText>
                <View style={styles.chipRow}>
                  {['Right Arm Fast', 'Left Arm Fast', 'Right Arm Spin', 'Left Arm Spin'].map(s => (
                    <TouchableOpacity 
                      key={s} 
                      style={[styles.editChip, editedData.bowling_style === s && styles.editChipActive]}
                      onPress={() => setEditedData({ ...editedData, bowling_style: s })}
                    >
                      <RNText style={[styles.editChipText, editedData.bowling_style === s && styles.editChipTextActive]}>{s}</RNText>
                    </TouchableOpacity>
                  ))}
                </View>
             </View>

             <View style={styles.editActions}>
               <TouchableOpacity 
                 style={styles.cancelBtn}
                 onPress={() => setIsEditing(false)}
               >
                 <X size={20} color="#64748B" />
                 <RNText style={styles.cancelBtnText}>Cancel</RNText>
               </TouchableOpacity>
               <TouchableOpacity 
                 style={styles.saveBtn}
                 onPress={handleSave}
                 disabled={saving}
               >
                 {saving ? (
                   <ActivityIndicator size="small" color="#FFFFFF" />
                 ) : (
                   <>
                     <Save size={20} color="#FFFFFF" />
                     <RNText style={styles.saveBtnText}>Save Changes</RNText>
                   </>
                 )}
               </TouchableOpacity>
             </View>
          </View>
        )}

        <View style={styles.headerDivider} />

        <View style={styles.headerStats}>
          <View style={styles.headerStatItem}>
            <RNText style={styles.headerStatValue}>{stats?.matches || 0}</RNText>
            <RNText style={styles.headerStatLabel}>Matches</RNText>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStatItem}>
            <RNText style={styles.headerStatValue}>{stats?.runs || 0}</RNText>
            <RNText style={styles.headerStatLabel}>Runs</RNText>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStatItem}>
            <RNText style={styles.headerStatValue}>{stats?.wickets || 0}</RNText>
            <RNText style={styles.headerStatLabel}>Wickets</RNText>
          </View>
        </View>
      </View>

      {/* Career Excellence Grid */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <RNText style={styles.sectionTitle}>Career Excellence</RNText>
          <TrendingUp size={20} color="#01b854" />
        </View>
        
        <View style={styles.statsGrid}>
          <StatItem label="Highest Score" value={stats?.highest || 0} icon={Target} color="#F59E0B" />
          <StatItem label="Strike Rate" value={stats?.sr || '0.00'} icon={Zap} color="#8B5CF6" />
          <StatItem label="Catches" value={stats?.catches || 0} icon={Shield} color="#3B82F6" />
          <StatItem label="Consistency" value="78%" icon={Star} color="#EC4899" />
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <RNText style={styles.sectionTitle}>Recent Forms</RNText>
          <TouchableOpacity>
            <RNText style={styles.viewAllBtn}>History</RNText>
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formRow}>
             <View style={styles.matchInfo}>
                <RNText style={styles.matchOpponent}>vs Ggn Titans</RNText>
                <RNText style={styles.matchDate}>15 Apr 2026 • Won</RNText>
             </View>
             <View style={styles.matchScore}>
                <RNText style={styles.scoreText}>42 (28)</RNText>
                <RNText style={styles.perfLabel}>Batting</RNText>
             </View>
          </View>
          <View style={styles.formDivider} />
          <View style={styles.formRow}>
             <View style={styles.matchInfo}>
                <RNText style={styles.matchOpponent}>vs SL Titans</RNText>
                <RNText style={styles.matchDate}>12 Apr 2026 • Lost</RNText>
             </View>
             <View style={styles.matchScore}>
                <RNText style={styles.scoreText}>1/18 (4.0)</RNText>
                <RNText style={styles.perfLabel}>Bowling</RNText>
             </View>
          </View>
        </View>
      </View>

      {/* Achievements Banners */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
        <View style={[styles.badgeCard, { backgroundColor: '#FFF7ED' }]}>
          <Award size={32} color="#F97316" />
          <RNText style={styles.badgeTitle}>Century Maker</RNText>
          <RNText style={styles.badgeDesc}>Scored 100+ in a match</RNText>
        </View>
        <View style={[styles.badgeCard, { backgroundColor: '#F0FDF4' }]}>
          <Zap size={32} color="#166534" />
          <RNText style={styles.badgeTitle}>Quick Fire</RNText>
          <RNText style={styles.badgeDesc}>200+ Strike rate match</RNText>
        </View>
      </ScrollView>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 100,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  profileMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: '#F8FAFC',
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#F8FAFC',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4, // Match avatar border
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#043529',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  tagSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  styleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  styleTagText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  roleTags: {
    flexDirection: 'row',
    gap: 8,
  },
  roleTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 20,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  headerStatItem: {
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#043529',
  },
  headerStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  headerStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  viewAllBtn: {
    fontSize: 14,
    fontWeight: '700',
    color: '#01b854',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (Platform.OS === 'web' ? '23%' : '48%'),
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#043529',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  formDivider: {
    height: 1,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
  },
  matchInfo: {
    flex: 1,
  },
  matchOpponent: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  matchDate: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  matchScore: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#043529',
  },
  perfLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  badgesScroll: {
    flexDirection: 'row',
  },
  badgeCard: {
    width: 200,
    padding: 20,
    borderRadius: 24,
    marginRight: 16,
    alignItems: 'center',
    gap: 10,
  },
  badgeTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  editBtn: {
    padding: 4,
  },
  editForm: {
    gap: 8,
  },
  editInput: {
    fontSize: 22,
    fontWeight: '900',
    color: '#043529',
    letterSpacing: -0.5,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 4,
    // @ts-ignore
    outlineStyle: 'none',
  },
  editInputSmall: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
    paddingVertical: 2,
    // @ts-ignore
    outlineStyle: 'none',
  },
  editSections: {
    marginTop: 20,
    gap: 16,
  },
  editSection: {
    gap: 8,
  },
  editSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  editChipActive: {
    backgroundColor: '#043529',
    borderColor: '#043529',
  },
  editChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  editChipTextActive: {
    color: '#FFFFFF',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#01b854',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stateSelectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginLeft: 10,
  },
  stateSelectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#043529',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  stateModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '80%',
    paddingTop: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    height: 50,
    marginBottom: 16,
    gap: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
    // @ts-ignore
    outlineStyle: 'none',
  },
  stateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  stateItemText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  stateItemTextActive: {
    color: '#01b854',
    fontWeight: '700',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#01b854',
  },
  loginRequired: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
    marginTop: 60,
  },
  loginIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },
  loginSubtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  loginBtn: {
    backgroundColor: '#01b854',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#01b854',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
