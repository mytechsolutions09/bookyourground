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
  Alert
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

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", 
  "Ladakh", "Lakshadweep", "Puducherry"
];

// Re-established Centralized Stylesheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  monoLoadingContainer: {
    flex: 1,
    height: 600,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  monoLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
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
  profileDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 15,
  },
  detailItem: {
    width: '50%',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  editBtnText: {
    fontSize: 12,
    color: '#01b854',
    fontWeight: '600',
    marginLeft: 6,
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
  viewAllBtn: {
    fontSize: 14,
    fontWeight: '500',
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
    fontWeight: '500',
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
    fontWeight: '500',
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
  detailsCardMinimal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailsHeaderMinimal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  detailsTitleMinimal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    fontFamily: 'Inter',
    letterSpacing: -0.5,
  },
  editLinkMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editLinkTextMinimal: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '700',
  },
  detailsRowsMinimal: {
    gap: 16,
  },
  detailRowMinimal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  detailLabelMinimal: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  detailValueMinimal: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  inlineEditForm: {
    marginTop: 8,
  },
  formTitleMinimal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    textTransform: 'uppercase',
    marginBottom: 24,
    letterSpacing: 2,
  },
  monoInputGroup: {
    marginBottom: 20,
  },
  monoInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  monoLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  monoInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#000000',
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    // @ts-ignore
    outlineStyle: 'none',
  },
  monoSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monoSelectorText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  monoSection: {
    marginBottom: 20,
  },
  monoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  monoChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  monoChipActive: {
    backgroundColor: '#334155',
    borderColor: '#334155',
  },
  monoChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  monoChipTextActive: {
    color: '#FFFFFF',
  },
  monoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 24,
  },
  monoBtnCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  monoBtnCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  monoBtnSave: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  monoBtnSaveText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    fontWeight: '500',
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
    color: '#000000',
    fontWeight: '700',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000000',
  },
  loginRequired: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
    fontFamily: 'Inter',
  },
  loginBtnOutlined: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  loginBtnTextOutlined: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
});

function PlayerProfileView() {
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
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Re-fetch profile whenever the screen is focused to stay in sync with layout changes
  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [user?.id])
  );

  const loadProfile = async () => {
    try {
      if (!user?.id) return;
      setLoading(true);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      setProfile(profileData);

      const { data: memberRecords } = await supabase
        .from('team_members')
        .select('id')
        .eq('profile_id', user.id);

      if (memberRecords && memberRecords.length > 0) {
        const memberIds = memberRecords.map(m => m.id).filter(id => !!id);
        if (memberIds.length === 0) return;

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

  const handleEdit = React.useCallback(() => {
    setEditedData({
      full_name: profile?.full_name || '',
      address: profile?.address || '',
      state: profile?.state || '',
      dob: profile?.dob || '',
      player_type: profile?.player_type || 'All Rounder',
      batting_style: profile?.batting_style || 'Right Hand Bat',
      bowling_style: profile?.bowling_style || 'Right Arm Fast'
    });
    setIsEditing(true);
  }, [profile]);

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

  const uploadAvatar = React.useCallback(async (uri: string) => {
    if (!user?.id) return;
    try {
      setUploading(true);
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      const contentType = `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;

      // Use ArrayBuffer for better reliability in React Native
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType,
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setEditedData((prev: any) => ({ ...prev, avatar_url: publicUrl }));
      setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }));
      
      // Update the profile in the database
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
        
      Alert.alert('Success', 'Profile photo updated successfully!');
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      Alert.alert('Upload Failed', err.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [user?.id]);

  const pickImage = React.useCallback(async () => {
    try {
      // Launch picker directly - modern Expo handles permissions automatically
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadAvatar(result.assets[0].uri);
      }
    } catch (err: any) {
      console.error('Error picking image:', err);
      Alert.alert('Gallery Error', 'Could not open image gallery. Please ensure permissions are granted.');
    }
  }, [uploadAvatar]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <ActivityIndicator size="large" color="#000000" />
        <RNText style={{ marginTop: 12, fontSize: 14, color: '#64748B', fontWeight: '500' }}>Curating your elite stats...</RNText>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loginRequired}>
        <RNText style={styles.loginTitle}>Unlock Your Profile</RNText>
        <RNText style={styles.loginSubtitle}>
          Sign in to track your elite stats, manage your team, and join the leaderboards.
        </RNText>
        <TouchableOpacity 
          style={styles.loginBtnOutlined}
          onPress={() => router.push('/(auth)/login' as any)}
        >
          <RNText style={styles.loginBtnTextOutlined}>Login or Sign Up</RNText>
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

  const filteredStates = INDIAN_STATES.filter(s => 
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

  if (!profile) return null;

  return (
    <View style={styles.container}>

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


      <View style={styles.sectionHeader}>
        <RNText style={styles.sectionTitle}>Career Excellence</RNText>
        <TrendingUp size={20} color="#01b854" />
      </View>
      
      <View style={styles.statsGrid}>
        <StatItem label="Matches" value={stats?.matches || 0} icon={Award} color="#64748B" />
        <StatItem label="Runs" value={stats?.runs || 0} icon={Flame} color="#EF4444" />
        <StatItem label="Wickets" value={stats?.wickets || 0} icon={Target} color="#3B82F6" />
        <StatItem label="Highest Score" value={stats?.highest || 0} icon={Trophy} color="#F59E0B" />
        <StatItem label="Strike Rate" value={stats?.sr || '0.00'} icon={Zap} color="#8B5CF6" />
        <StatItem label="Catches" value={stats?.catches || 0} icon={Shield} color="#10B981" />
        <StatItem label="Innings" value={stats?.innings_batted || 0} icon={Circle} color="#EC4899" />
      </View>

      <View style={styles.detailsCardMinimal}>
        <View style={styles.detailsHeaderMinimal}>
          <RNText style={styles.detailsTitleMinimal}>
            {isEditing ? 'Update Player Profile' : 'Personal Details'}
          </RNText>
          {!isEditing && (
            <TouchableOpacity onPress={handleEdit} style={styles.editLinkMinimal}>
              <Edit3 size={16} color="#334155" />
            </TouchableOpacity>
          )}
        </View>
        
        {isEditing ? (
          <View style={styles.inlineEditForm}>
            <View style={styles.monoInputGroup}>
              <RNText style={styles.monoLabel}>Full Name</RNText>
              <RNTextInput
                style={styles.monoInput}
                value={editedData.full_name}
                onChangeText={(t) => setEditedData({ ...editedData, full_name: t })}
                placeholder="Name"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.monoInputRow}>
               <View style={[styles.monoInputGroup, { flex: 1.5 }]}>
                  <RNText style={styles.monoLabel}>Date of Birth</RNText>
                  <RNTextInput
                    style={styles.monoInput}
                    value={editedData.dob}
                    onChangeText={(t) => {
                      const clean = t.replace(/[^0-9]/g, '');
                      let formatted = clean;
                      if (clean.length > 2) {
                        formatted = clean.slice(0, 2) + '-' + clean.slice(2);
                      }
                      if (clean.length > 4) {
                        formatted = formatted.slice(0, 5) + '-' + clean.slice(4, 8);
                      }
                      setEditedData({ ...editedData, dob: formatted.slice(0, 10) });
                    }}
                    placeholder="DD-MM-YYYY"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    maxLength={10}
                  />
               </View>
            </View>

            <View style={styles.monoInputGroup}>
                <RNText style={styles.monoLabel}>State / Territory</RNText>
                <TouchableOpacity 
                  style={styles.monoSelector}
                  onPress={() => setShowStatePicker(true)}
                >
                  <RNText style={[styles.monoSelectorText, !editedData.state && { color: '#94A3B8' }]}>
                    {editedData.state || 'Select State'}
                  </RNText>
                  <ChevronDown size={16} color="#000000" />
                </TouchableOpacity>
            </View>

            <View style={styles.monoSection}>
              <RNText style={styles.monoLabel}>Playing Role</RNText>
              <View style={styles.monoChips}>
                {['All Rounder', 'Batter', 'Bowler', 'Wicket Keeper'].map(role => (
                   <TouchableOpacity 
                      key={role} 
                      style={[styles.monoChip, editedData.player_type === role && styles.monoChipActive]}
                      onPress={() => setEditedData({ ...editedData, player_type: role })}
                   >
                     <RNText style={[styles.monoChipText, editedData.player_type === role && styles.monoChipTextActive]}>{role}</RNText>
                   </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.monoSection}>
              <RNText style={styles.monoLabel}>Batting Style</RNText>
              <View style={styles.monoChips}>
                {['Right Hand Bat', 'Left Hand Bat'].map(s => (
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

            <View style={styles.monoSection}>
              <RNText style={styles.monoLabel}>Bowling Style</RNText>
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
        <View style={[styles.badgeCard, { backgroundColor: 'rgba(1, 184, 84, 0.1)' }]}>
          <Zap size={32} color="#01b854" />
          <RNText style={styles.badgeTitle}>Quick Fire</RNText>
          <RNText style={styles.badgeDesc}>200+ Strike rate match</RNText>
        </View>
      </ScrollView>
    </View>
  );
}

export default PlayerProfileView;
