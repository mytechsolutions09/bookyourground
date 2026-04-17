import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Platform,
  TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { 
  User, 
  MapPin, 
  Award, 
  TrendingUp, 
  Shield, 
  ChevronLeft,
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
  Plus
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getPlayerTags } from '@/lib/stats-logic';

export default function PlayerProfile() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isOwnProfile = user?.id === id;

  useEffect(() => {
    if (id) {
      loadPlayerData();
    }
  }, [id]);

  const loadPlayerData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (profileError) throw profileError;
      setProfile(profileData);

      // 2. Fetch Aggregated Stats
      const { data: memberRecords } = await supabase
        .from('team_members')
        .select('id')
        .eq('profile_id', id);

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
            strike_rate: acc.strike_rate
          }), { 
            matches: 0, runs: 0, wickets: 0, catches: 0, sr: 0, highest: 0,
            innings_batted: 0, innings_bowled: 0, not_outs: 0, runs_conceded: 0,
            overs_bowled: 0, strike_rate: 0
          });
          
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
      alert('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    if (!isOwnProfile) return;
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

  const StatItem = ({ label, value, icon: Icon, color }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: color + '15' }]}>
        <Icon size={20} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Back Button for Public View */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
           <ChevronLeft size={24} color="#043529" />
           <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        {isOwnProfile && !isEditing && (
           <TouchableOpacity onPress={handleEdit} style={styles.editBtnTop}>
              <Edit3 size={18} color="#01b854" />
              <Text style={styles.editTextBot}>Edit Profile</Text>
           </TouchableOpacity>
        )}
      </View>

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

             )}
          </TouchableOpacity>
          
          <View style={styles.profileInfo}>
            {isEditing ? (
              <View style={styles.editForm}>
                <TextInput
                  style={styles.editInput}
                  value={editedData.full_name}
                  onChangeText={(t) => setEditedData({ ...editedData, full_name: t })}
                  placeholder="Full Name"
                />
                <View style={[styles.locationRow, { marginTop: 8 }]}>
                  <MapPin size={14} color="#64748B" />
                  <TextInput
                    style={styles.editInputSmall}
                    value={editedData.address}
                    onChangeText={(t) => setEditedData({ ...editedData, address: t })}
                    placeholder="Location"
                  />
                </View>
              </View>
            ) : (
              <>
                <View style={styles.nameRow}>
                  <Text style={styles.profileName}>{profile?.full_name || 'Cricket Player'}</Text>
                </View>

                {/* Dynamic Player Tags */}
                {playerTags.length > 0 && (
                  <View style={styles.tagSection}>
                     {playerTags.map(tag => (
                       <View key={tag.id} style={[styles.styleTag, { backgroundColor: tag.color + '10', borderColor: tag.color + '30' }]}>
                          {renderTagIcon(tag.icon, tag.color)}
                          <Text style={[styles.styleTagText, { color: tag.color }]}>{tag.label}</Text>
                       </View>
                     ))}
                  </View>
                )}

                <View style={styles.locationRow}>
                  <MapPin size={14} color="#64748B" />
                  <Text style={styles.locationText}>{profile?.state || 'Location not set'}</Text>
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
                       <Text style={[styles.editChipText, editedData.player_type === role && styles.editChipTextActive]}>{role}</Text>
                     </TouchableOpacity>
                   ))}
                </ScrollView>
              ) : (
                <View style={styles.roleTag}>
                  <Text style={styles.roleTagText}>{profile?.player_type || 'All Rounder'}</Text>
                </View>
              )}
            </View>

            {!isEditing && (
              <View style={[styles.roleTags, { marginTop: 6 }]}>
                <View style={[styles.roleTag, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={[styles.roleTagText, { color: '#166534' }]}>{profile?.batting_style || 'Right Hand Bat'}</Text>
                </View>
                <View style={[styles.roleTag, { backgroundColor: '#FEF2F2' }]}>
                  <Text style={[styles.roleTagText, { color: '#991B1B' }]}>{profile?.bowling_style || 'Right Arm Fast'}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {isEditing && (
          <View style={styles.editSections}>
             <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>Batting Style</Text>
                <View style={styles.chipRow}>
                  {['Right Hand Bat', 'Left Hand Bat'].map(s => (
                    <TouchableOpacity 
                      key={s} 
                      style={[styles.editChip, editedData.batting_style === s && styles.editChipActive]}
                      onPress={() => setEditedData({ ...editedData, batting_style: s })}
                    >
                      <Text style={[styles.editChipText, editedData.batting_style === s && styles.editChipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
             </View>

             <View style={styles.editSection}>
                <Text style={styles.editSectionTitle}>Bowling Style</Text>
                <View style={styles.chipRow}>
                  {['Right Arm Fast', 'Left Arm Fast', 'Right Arm Spin', 'Left Arm Spin'].map(s => (
                    <TouchableOpacity 
                      key={s} 
                      style={[styles.editChip, editedData.bowling_style === s && styles.editChipActive]}
                      onPress={() => setEditedData({ ...editedData, bowling_style: s })}
                    >
                      <Text style={[styles.editChipText, editedData.bowling_style === s && styles.editChipTextActive]}>{s}</Text>
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
                 <Text style={styles.cancelBtnText}>Cancel</Text>
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
                     <Text style={styles.saveBtnText}>Save Changes</Text>
                   </>
                 )}
               </TouchableOpacity>
             </View>
          </View>
        )}

        <View style={styles.headerDivider} />

        <View style={styles.headerStats}>
          <View style={styles.headerStatItem}>
            <Text style={styles.headerStatValue}>{stats?.matches || 0}</Text>
            <Text style={styles.headerStatLabel}>Matches</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStatItem}>
            <Text style={styles.headerStatValue}>{stats?.runs || 0}</Text>
            <Text style={styles.headerStatLabel}>Runs</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStatItem}>
            <Text style={styles.headerStatValue}>{stats?.wickets || 0}</Text>
            <Text style={styles.headerStatLabel}>Wickets</Text>
          </View>
        </View>
      </View>

      {/* Career Excellence Grid */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Career Excellence</Text>
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
          <Text style={styles.sectionTitle}>Recent Forms</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formRow}>
             <View style={styles.matchInfo}>
                <Text style={styles.matchOpponent}>vs Ggn Titans</Text>
                <Text style={styles.matchDate}>15 Apr 2026 • Won</Text>
             </View>
             <View style={styles.matchScore}>
                <Text style={styles.scoreText}>42 (28)</Text>
                <Text style={styles.perfLabel}>Batting</Text>
             </View>
          </View>
          <View style={styles.formDivider} />
          <View style={styles.formRow}>
             <View style={styles.matchInfo}>
                <Text style={styles.matchOpponent}>vs SL Titans</Text>
                <Text style={styles.matchDate}>12 Apr 2026 • Lost</Text>
             </View>
             <View style={styles.matchScore}>
                <Text style={styles.scoreText}>1/18 (4.0)</Text>
                <Text style={styles.perfLabel}>Bowling</Text>
             </View>
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 100,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#043529',
  },
  editBtnTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editTextBot: {
    fontSize: 13,
    fontWeight: '500',
    color: '#15803d',
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
    margin: 4,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '500',
    color: '#043529',
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  nameRow: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 8,
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
    fontWeight: '500',
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
    fontWeight: '500',
    color: '#1E40AF',
  },
  editForm: {
    gap: 4,
  },
  editInput: {
    fontSize: 20,
    fontWeight: '500',
    color: '#043529',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  editInputSmall: {
    fontSize: 13,
    color: '#64748B',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flex: 1,
  },
  editSections: {
    marginTop: 20,
    gap: 16,
  },
  editSection: {
    gap: 8,
  },
  editSectionTitle: {
    fontSize: 11,
    fontWeight: '500',
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
    fontWeight: '500',
    color: '#64748B',
  },
  editChipTextActive: {
    color: '#FFFFFF',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontWeight: '500',
    color: '#64748B',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#01b854',
  },
  saveBtnText: {
    fontWeight: '500',
    color: '#FFFFFF',
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
    fontWeight: '500',
    color: '#043529',
  },
  headerStatLabel: {
    fontSize: 11,
    fontWeight: '500',
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
    fontWeight: '500',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
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
    fontWeight: '500',
    color: '#043529',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
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
    fontWeight: '500',
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
    fontWeight: '500',
    color: '#043529',
  },
  perfLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    textTransform: 'uppercase',
  },
});
