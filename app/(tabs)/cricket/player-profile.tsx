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
  
  const isSmall = width < 900;

  useEffect(() => {
    if (profile) {
      setEditedData({
        full_name: profile.full_name,
        player_type: profile.player_type,
        batting_style: profile.batting_style,
        bowling_style: profile.bowling_style,
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(editedData)
        .eq('id', user.id);
      
      if (!error) {
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
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
        <View style={styles.headerCard}>
          <View style={styles.profileMain}>
            <View style={styles.avatarBox}>
               <Image 
                 source={{ uri: profile?.avatar_url || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }} 
                 style={styles.avatarLarge} 
               />
               <TouchableOpacity style={styles.cameraIcon}>
                 <Camera size={16} color="#FFFFFF" />
               </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <RNText style={styles.playerName}>{profile?.full_name || 'Anonymous'}</RNText>
              <View style={styles.locationRow}>
                <MapPin size={14} color="#94A3B8" />
                <RNText style={styles.locationText}>{profile?.city || 'No Location'}, {profile?.state || ''}</RNText>
              </View>
              <View style={styles.tagsContainer}>
                {getPlayerTags(profile).map((tag: string) => (
                  <View key={tag} style={styles.tag}>
                    <RNText style={styles.tagText}>{tag}</RNText>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
             <RNText style={styles.statValue}>{profile?.total_runs || 0}</RNText>
             <RNText style={styles.statLabel}>Runs</RNText>
          </View>
          <View style={styles.statBox}>
             <RNText style={styles.statValue}>{profile?.total_wickets || 0}</RNText>
             <RNText style={styles.statLabel}>Wickets</RNText>
          </View>
          <View style={styles.statBox}>
             <RNText style={styles.statValue}>{profile?.matches_played || 0}</RNText>
             <RNText style={styles.statLabel}>Matches</RNText>
          </View>
          <View style={styles.statBox}>
             <RNText style={styles.statValue}>{profile?.batting_avg || '0.0'}</RNText>
             <RNText style={styles.statLabel}>Average</RNText>
          </View>
        </View>
      </View>

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
              { label: 'Birthday', value: profile?.dob || 'Not Set' },
              { label: 'State', value: profile?.state || 'Not Set' },
              { label: 'Role', value: profile?.player_type || 'Not Set' },
              { label: 'Batting', value: profile?.batting_style || 'Not Set' },
              { label: 'Bowling', value: profile?.bowling_style || 'Not Set' },
            ].map((item, idx) => (
              <View key={idx} style={styles.detailRowMinimal}>
                <RNText style={styles.detailLabelMinimal}>{item.label}</RNText>
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
    return (
      <WebLayout hideHeader={isSmall} isPublicNoSidebar={isSmall}>
        {content}
      </WebLayout>
    );
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
    marginTop: 20,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
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
