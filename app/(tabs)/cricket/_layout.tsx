import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform, Image } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { 
  Swords, 
  Trophy, 
  Users, 
  BarChart3, 
  PlayCircle,
  Plus,
  X,
  Radio,
  HelpCircle,
  Calendar
} from 'lucide-react-native';
import { Modal } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { useUI } from '@/contexts/UIContext';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing, 
  useAnimatedScrollHandler,
  runOnJS
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { 
  ChevronLeft,
  QrCode,
  Share2,
  MapPin,
  UserPlus,
  BarChart2,
  Clock,
  ChevronRight,
  Eye,
  Award,
  Calendar as CalendarIcon,
  Camera,
  Trash2,
  TrendingUp,
  Zap,
  Flame,
  Shield,
  Target,
  Database,
  Star,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, ActivityIndicator } from 'react-native';

import CricketPlayerProfile from './player-profile';
import CricketMatches from './matches';
import CricketTournaments from './tournaments';
import CricketTeams from './teams';
import CricketStats from './stats';
import CricketHighlights from './highlights';
import CricketTrophies from './trophies';
import CricketBadges from './badges';
import CricketPhotos from './photos';
import CricketConnections from './connections';
import { getPlayerTags, PlayerStats, PlayerTag } from '@/lib/stats-logic';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

const TABS = [
  { id: 'player-profile', label: 'Profile', index: 0 },
  { id: 'matches', label: 'Matches', index: 1 },
  { id: 'stats', label: 'Stats', index: 2 },
  { id: 'trophies', label: 'Trophies', index: 3 },
  { id: 'badges', label: 'Badges', index: 4 },
  { id: 'tournaments', label: 'Tournaments', index: 5 },
  { id: 'teams', label: 'Teams', index: 6 },
  { id: 'highlights', label: 'Highlights', index: 7 },
  { id: 'photos', label: 'Photos', index: 8 },
  { id: 'connections', label: 'Connections', index: 9 },
];

export default function CricketLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { setTabBarVisible } = useUI();

  // Find initial tab from URL
  const initialTabId = TABS.find(t => pathname.includes(t.id))?.id || 'player-profile';
  const initialIndex = TABS.find(t => t.id === initialTabId)?.index || 0;

  const [activeTabId, setActiveTabId] = React.useState(initialTabId);
  const horizontalPagerRef = React.useRef<any>(null);
  const tabScrollRef = React.useRef<ScrollView>(null);
  
  const [isActionModalVisible, setIsActionModalVisible] = React.useState(false);
  
  const { user } = useAuth();
  const [profile, setProfile] = React.useState<any>(null);
  const [followerCount, setFollowerCount] = React.useState(0);
  const [playerTags, setPlayerTags] = React.useState<PlayerTag[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [isAvatarOptionsVisible, setIsAvatarOptionsVisible] = React.useState(false);
  const [isQrModalVisible, setIsQrModalVisible] = React.useState(false);
  const qrRef = React.useRef<any>(null);
  
  const animatedScrollY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const tabScrollPositions = useSharedValue(TABS.map(() => 0));
  const activeTabIndex = useSharedValue(initialIndex);

  const HEADER_MAX_HEIGHT = 280;
  const HEADER_MIN_HEIGHT = 105;

  React.useEffect(() => {
    if (user?.id) {
      loadProfileData();
    }
  }, [user?.id]);

  const loadProfileData = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
      if (data) setProfile(data);
      
      const { count } = await supabase.from('profiles_follows').select('*', { count: 'exact', head: true }).eq('following_id', user?.id);
      setFollowerCount(count || 0);

      // Aggregating Stats for Tags
      const { data: memberRecords } = await supabase
        .from('team_members')
        .select('id')
        .eq('profile_id', user?.id);

      if (memberRecords && memberRecords.length > 0) {
        const memberIds = memberRecords.map(m => m.id).filter(id => !!id);
        const { data: statsData } = await supabase
          .from('player_ball_stats')
          .select('*')
          .in('member_id', memberIds)
          .eq('ball_type', 'leather');
        
        if (statsData && statsData.length > 0) {
            const agg = statsData.reduce((acc, curr) => ({
              matches_played: acc.matches_played + curr.matches_played,
              total_runs: acc.total_runs + curr.total_runs,
              strike_rate: Math.max(acc.strike_rate, curr.strike_rate),
              total_wickets: acc.total_wickets + curr.total_wickets,
              innings_batted: acc.innings_batted + (curr.innings_batted || 0),
              innings_bowled: acc.innings_bowled + (curr.innings_bowled || 0),
              not_outs: acc.not_outs + (curr.not_outs || 0),
              runs_conceded: acc.runs_conceded + (curr.runs_conceded || 0),
              overs_bowled: acc.overs_bowled + (Number(curr.overs_bowled) || 0)
            }), { 
              matches_played: 0, total_runs: 0, strike_rate: 0, total_wickets: 0, 
              innings_batted: 0, innings_bowled: 0, not_outs: 0, runs_conceded: 0,
              overs_bowled: 0
            });
            setPlayerTags(getPlayerTags(agg));
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const uploadImage = React.useCallback(async (uri: string) => {
    if (!user?.id) return;
    
    try {
      setUploading(true);
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      const contentType = `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;

      // Use ArrayBuffer instead of Blob for more reliable local file reading in React Native
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

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }));
      Alert.alert('Success', 'Profile photo updated successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload image. Please try again.');
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
        const selectedUri = result.assets[0].uri;
        // Close modal AFTER we have the image to avoid animation/lock issues
        setIsAvatarOptionsVisible(false);
        // Small delay ensures modal dismissal doesn't interrupt the subsequent upload state change
        setTimeout(() => uploadImage(selectedUri), 300);
      }
    } catch (error: any) {
      console.error('Image picking error:', error);
      Alert.alert('Gallery Error', 'Could not open image gallery. Please ensure you have given permission in Settings.');
    }
  }, [uploadImage]);

  const removeAvatar = React.useCallback(async () => {
    setIsAvatarOptionsVisible(false);
    try {
      setUploading(true);
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user?.id);

      if (error) throw error;
      setProfile((prev: any) => ({ ...prev, avatar_url: null }));
      Alert.alert('Success', 'Profile photo removed');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove photo');
    } finally {
      setUploading(false);
    }
  }, [user?.id]);

  const handleAvatarPress = React.useCallback(() => {
    setIsAvatarOptionsVisible(true);
  }, []);

  const handleShareProfile = async () => {
    try {
      const shareUrl = `https://bookyourground.com/player/${user?.id}`;
      await Share2.onPress; // Lucide icon doesn't have onPress, I mean use logical share
    } catch (err) {
      console.error(err);
    }
  };

  const shareQr = async () => {
    try {
      const uri = await captureRef(qrRef, {
        format: 'png',
        quality: 0.8,
      });
      await Sharing.shareAsync(uri);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not share QR code');
    }
  };

  const renderQrModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isQrModalVisible}
      onRequestClose={() => setIsQrModalVisible(false)}
    >
      <TouchableOpacity 
        style={styles.qrModalOverlay}
        activeOpacity={1}
        onPress={() => setIsQrModalVisible(false)}
      >
        <View style={styles.qrCard}>
          <View style={styles.qrHeader}>
            <Text style={styles.qrTitle}>Player ID</Text>
            <TouchableOpacity onPress={() => setIsQrModalVisible(false)}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.qrContent} ref={qrRef} collapsable={false}>
            <View style={styles.qrWrapper}>
              <QRCode
                value={`https://bookyourground.com/player/${user?.id}`}
                size={200}
                color="#06392e"
                backgroundColor="#FFFFFF"
              />
            </View>
            <Text style={styles.qrPlayerName}>{formatName(profile?.full_name)}</Text>
            <Text style={styles.qrSubtext}>Scan to view profile</Text>
          </View>

          <TouchableOpacity style={styles.shareQrBtn} onPress={shareQr}>
            <Share2 size={18} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.shareQrBtnText}>Share QR Code</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderAvatarOptions = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isAvatarOptionsVisible}
      onRequestClose={() => setIsAvatarOptionsVisible(false)}
    >
      <TouchableOpacity 
        style={styles.avatarModalOverlay}
        activeOpacity={1}
        onPress={() => setIsAvatarOptionsVisible(false)}
      >
        <View style={styles.avatarOptionsCard}>
          <View style={styles.avatarOptionsHeader}>
            <Text style={styles.avatarOptionsTitle}>Profile Picture</Text>
            <TouchableOpacity onPress={() => setIsAvatarOptionsVisible(false)}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.avatarOptionsGrid}>
            <TouchableOpacity 
              style={styles.avatarOptionItem}
              onPress={pickImage}
            >
              <View style={[styles.avatarOptionIcon, { backgroundColor: '#F0FDF4' }]}>
                <Camera size={24} color="#01b854" />
              </View>
              <Text style={styles.avatarOptionLabel}>{profile?.avatar_url ? 'Change Photo' : 'Add Photo'}</Text>
            </TouchableOpacity>

            {profile?.avatar_url && (
              <TouchableOpacity 
                style={styles.avatarOptionItem}
                onPress={removeAvatar}
              >
                <View style={[styles.avatarOptionIcon, { backgroundColor: '#FEF2F2' }]}>
                  <Trash2 size={24} color="#EF4444" />
                </View>
                <Text style={styles.avatarOptionLabel}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const formatName = (name: string) => {
    if (!name) return name;
    return name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  const [statsTab, setStatsTab] = React.useState('batting');
  const [teamsTab, setTeamsTab] = React.useState('your');
  const [tournamentsTab, setTournamentsTab] = React.useState('all');
  const [trophiesTab, setTrophiesTab] = React.useState('matches');
  const [badgesTab, setBadgesTab] = React.useState('batting');
  const [connectionsTab, setConnectionsTab] = React.useState('followers');

  // Auto-scroll the tab bar when active tab changes
  React.useEffect(() => {
    const idx = TABS.find(t => t.id === activeTabId)?.index || 0;
    tabScrollRef.current?.scrollTo({ x: idx * 90 - (windowWidth/2) + 45, animated: true });
  }, [activeTabId]);

  // Handle manual tab press
  const onTabPress = (tabId: string, idx: number) => {
    setActiveTabId(tabId);
    activeTabIndex.value = idx;
    animatedScrollY.value = tabScrollPositions.value[idx] || 0;
    horizontalPagerRef.current?.scrollTo({ x: idx * windowWidth, animated: true });
  };

  // Sync pager when pathname changes (e.g. from bottom bar or deep link)
  React.useEffect(() => {
    const tabId = TABS.find(t => pathname.includes(t.id))?.id || 'player-profile';
    if (tabId !== activeTabId) {
      const idx = TABS.find(t => t.id === tabId)?.index || 0;
      setActiveTabId(tabId);
      activeTabIndex.value = idx;
      // Use animated: false for immediate sync to avoid jump during navigation
      horizontalPagerRef.current?.scrollTo({ x: idx * windowWidth, animated: false });
    }
  }, [pathname, windowWidth]);

  // Re-align pager when window width changes (e.g. unfolding Samsung Fold)
  React.useEffect(() => {
    const idx = TABS.find(t => t.id === activeTabId)?.index || 0;
    // Use a small delay to ensure layout has finished
    const timer = setTimeout(() => {
      horizontalPagerRef.current?.scrollTo({ x: idx * windowWidth, animated: false });
    }, 100);
    return () => clearTimeout(timer);
  }, [windowWidth]);

  const horizontalScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const x = event.contentOffset.x;
      const index = x / windowWidth;
      const leftIdx = Math.floor(index);
      const rightIdx = Math.ceil(index);
      const progress = index - leftIdx;

      if (leftIdx >= 0 && rightIdx < TABS.length) {
        const leftScroll = tabScrollPositions.value[leftIdx] || 0;
        const rightScroll = tabScrollPositions.value[rightIdx] || 0;
        animatedScrollY.value = leftScroll * (1 - progress) + rightScroll * progress;
      }

      const activeIdx = Math.round(index);
      const tab = TABS[activeIdx];
      if (tab && tab.id !== activeTabId) {
        activeTabIndex.value = activeIdx;
        runOnJS(setActiveTabId)(tab.id);
      }
    },
  });

  React.useEffect(() => {
    return () => setTabBarVisible(true);
  }, []);

  const verticalScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      animatedScrollY.value = currentY;

      // Update the current tab's stored scroll position
      const idx = activeTabIndex.value;
      const newPositions = [...tabScrollPositions.value];
      newPositions[idx] = currentY;
      tabScrollPositions.value = newPositions;

      // Immersive scroll: hide/show bottom tab bar based on direction
      if (currentY > lastScrollY.value + 10 && currentY > 100) {
        // Scrolling Down -> Hide Bar
        runOnJS(setTabBarVisible)(false);
      } else if (currentY < lastScrollY.value - 10 || currentY < 50) {
        // Scrolling Up or at the top -> Show Bar
        runOnJS(setTabBarVisible)(true);
      }
      lastScrollY.value = currentY;
    },
  });

  const headerHeight = useAnimatedStyle(() => {
    const hasSubBar = activeTabId === 'stats' || activeTabId === 'trophies' || activeTabId === 'badges' || activeTabId === 'connections' || activeTabId === 'teams' || activeTabId === 'tournaments';
    const currentMinHeight = hasSubBar ? HEADER_MIN_HEIGHT + 48 : HEADER_MIN_HEIGHT;
    const height = 260 - animatedScrollY.value;
    return {
      height: Math.max(currentMinHeight, height),
    };
  });

  const profileInfoOpacity = useAnimatedStyle(() => {
     return {
       opacity: Math.max(0, 1 - animatedScrollY.value / 100),
       transform: [{ translateY: Math.min(0, -animatedScrollY.value * 0.5) }]
     };
  });

  const miniHeaderTitleOpacity = useAnimatedStyle(() => {
    return {
      opacity: Math.min(1, animatedScrollY.value / 150),
    };
  });

  const headerContainerStyle = useAnimatedStyle(() => {
    const hasSubBar = activeTabId === 'stats' || activeTabId === 'trophies' || activeTabId === 'badges' || activeTabId === 'connections' || activeTabId === 'teams' || activeTabId === 'tournaments';
    const currentMaxHeight = hasSubBar ? HEADER_MAX_HEIGHT + 48 : HEADER_MAX_HEIGHT;
    const currentMinHeight = hasSubBar ? HEADER_MIN_HEIGHT + 48 : HEADER_MIN_HEIGHT;
    
    return {
      height: Math.max(currentMinHeight + insets.top, currentMaxHeight + insets.top - animatedScrollY.value),
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: '#06392e',
      overflow: 'hidden',
    };
  });

  const renderActionModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isActionModalVisible}
      onRequestClose={() => setIsActionModalVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setIsActionModalVisible(false)}
      >
        <View style={styles.actionModalContent}>
          <Text style={styles.actionModalTitle}>What would you like to do?</Text>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => {
                setIsActionModalVisible(false);
                router.push('/cricket/scoring?startMatch=true');
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Swords size={28} color="#01b854" />
              </View>
              <Text style={styles.actionLabel}>Start a Match</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => {
                setIsActionModalVisible(false);
                router.push('/cricket/scoring?createTeam=true');
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Users size={28} color="#3B82F6" />
              </View>
              <Text style={styles.actionLabel}>Create Team</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => {
                setIsActionModalVisible(false);
                router.push('/cricket-tournament/create');
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FFF7ED' }]}>
                <Trophy size={28} color="#F97316" />
              </View>
              <Text style={styles.actionLabel}>Host Tournament</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => {
                setIsActionModalVisible(false);
                router.push('/grounds' as any);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FAF5FF' }]}>
                <Calendar size={28} color="#A855F7" />
              </View>
              <Text style={styles.actionLabel}>Book Ground</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => {
                setIsActionModalVisible(false);
                alert('Streaming service coming soon!');
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FEF2F2' }]}>
                <Radio size={28} color="#EF4444" />
              </View>
              <Text style={styles.actionLabel}>Go Live</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => {
                setIsActionModalVisible(false);
                alert('Support channel opening...');
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#F0FDFA' }]}>
                <HelpCircle size={28} color="#0D9488" />
              </View>
              <Text style={styles.actionLabel}>Get Help</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.actionCloseBtn}
            onPress={() => setIsActionModalVisible(false)}
          >
            <Text style={styles.actionCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const isCompact = windowWidth < 900;

  const content = (
    <View style={styles.container}>
      {renderActionModal()}
      {renderAvatarOptions()}
      {renderQrModal()}
      <Animated.View style={headerContainerStyle}>
        <LinearGradient
          colors={['#01b854', '#06392e']}
          start={{ x: 0.1, y: 0.8 }}
          end={{ x: 0.9, y: 0.2 }}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Profile Info (Collapses) */}
        <Animated.View style={[
          styles.profileHeaderContent, 
          profileInfoOpacity, 
          { paddingTop: insets.top + 70 }
        ]}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity 
              style={styles.avatarWrapper} 
              onPress={handleAvatarPress}
              disabled={uploading}
            >
              {uploading ? (
                <View style={styles.avatarPlaceholder}>
                   <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.headerAvatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                   <Camera size={24} color="#FFFFFF90" />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                {profile?.avatar_url ? <Trash2 size={10} color="#FF4444" /> : <Plus size={10} color="#FFFFFF" />}
              </View>
            </TouchableOpacity>
            <View style={styles.headerTextInfo}>
              <Text style={styles.headerPlayerName}>{formatName(profile?.full_name) || 'Loading...'}</Text>
              
              <View style={styles.headerBadgeRow}>
                <View style={styles.headerLocGroup}>
                  <MapPin size={12} color="#FFFFFF90" />
                  <Text style={styles.headerLocation}>{profile?.state || 'Global'}</Text>
                </View>
                <View style={styles.headerDot} />
                <View style={styles.headerMetricGroup}>
                   <Eye size={12} color="#FFFFFF90" />
                   <Text style={styles.headerStat}>{profile?.views_count || 0} Views</Text>
                </View>
                <View style={styles.headerDot} />
                <View style={styles.headerMetricGroup}>
                   <Users size={12} color="#FFFFFF90" />
                   <Text style={styles.headerStat}>{followerCount} Followers</Text>
                </View>
              </View>

              <View style={styles.headerTagRow}>
                {[
                  profile?.player_type,
                  profile?.batting_style?.includes('Right') ? 'RHB' : profile?.batting_style?.includes('Left') ? 'LHB' : null,
                  profile?.bowling_style
                ].filter(Boolean).map((tag, i, arr) => (
                  <React.Fragment key={i}>
                    <Text style={styles.headerTagText}>{tag}</Text>
                    {i < arr.length - 1 && <View style={styles.headerTagDot} />}
                  </React.Fragment>
                ))}
              </View>

              {/* Performance Tags - Destroyer, Wildcard etc. */}
              {playerTags.length > 0 && (
                <View style={styles.perfTagRow}>
                  {playerTags.map(tag => (
                    <View key={tag.id} style={[styles.perfTag, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                      <Text style={styles.perfTagText}>{tag.label}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              <View style={styles.headerRankRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>Rank</Text>
                </View>
                <TouchableOpacity style={styles.insightsBtn}>
                  <BarChart2 size={12} color="#06392e" />
                  <Text style={styles.insightsBtnText}>Insights</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Mini Header / Nav (Always visible) */}
        <View style={[styles.miniHeader, { top: insets.top }]}>
           <TouchableOpacity onPress={() => router.back()} style={styles.miniNavBtn}>
             <ChevronLeft size={24} color="#FFFFFF" />
           </TouchableOpacity>
           <Animated.View style={[styles.miniTitleContainer, miniHeaderTitleOpacity]}>
             <Text style={styles.miniTitleText}>{formatName(profile?.full_name) || 'Cricket'}</Text>
           </Animated.View>
           <View style={styles.miniNavRight}>
              <TouchableOpacity style={styles.miniNavBtn} onPress={() => setIsQrModalVisible(true)}>
                <QrCode size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.miniNavBtn}>
                <Share2 size={20} color="#FFFFFF" />
              </TouchableOpacity>
           </View>
        </View>

        {!pathname.includes('/scoring') && (
          <View style={[styles.tabsStickyWrapper, { position: 'absolute', bottom: 0, left: 0, right: 0 }]}>
            <View style={styles.tabsInnerRow}>
              <ScrollView 
                ref={tabScrollRef}
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.tabsScroll} 
                style={{ flex: 1 }}
              >
                 {TABS.map((tab) => (
                   <TouchableOpacity 
                     key={tab.id} 
                     style={styles.tab} 
                     onPress={() => onTabPress(tab.id, tab.index)}
                   >
                     <View style={[styles.tabUnderline, activeTabId === tab.id && styles.tabUnderlineActive]}>
                       <Text style={[styles.tabText, activeTabId === tab.id && styles.tabTextActive]}>{tab.label}</Text>
                     </View>
                   </TouchableOpacity>
                 ))}
              </ScrollView>
              
              <TouchableOpacity 
                style={styles.plusIconWrapper}
                onPress={() => setIsActionModalVisible(true)}
              >
                <Plus size={24} color="#01b854" strokeWidth={3} />
              </TouchableOpacity>
            </View>

            {/* Sub-bar injection - Fixed height for all tabs to ensure consistent content alignment */}
            {(activeTabId === 'stats' || activeTabId === 'trophies' || activeTabId === 'badges' || activeTabId === 'connections' || activeTabId === 'teams' || activeTabId === 'tournaments') ? (
              <View style={styles.subBarInjection}>
                <View style={styles.toggleGroup}>
                  {activeTabId === 'tournaments' && [
                    { id: 'all', label: 'All' },
                    { id: 'participate', label: 'Participate' },
                    { id: 'network', label: 'Network' },
                    { id: 'nearby', label: 'Nearby' },
                  ].map((chip) => (
                    <TouchableOpacity
                      key={chip.id}
                      onPress={() => setTournamentsTab(chip.id)}
                      style={[styles.toggleBtn, tournamentsTab === chip.id && styles.toggleBtnActive]}
                    >
                      <Text style={[styles.toggleBtnText, tournamentsTab === chip.id && styles.toggleBtnTextActive]}>{chip.label}</Text>
                    </TouchableOpacity>
                  ))}

                  {activeTabId === 'teams' && [
                    { id: 'your', label: 'Your' },
                    { id: 'all', label: 'All' },
                    { id: 'top teams', label: 'Top Teams' },
                    { id: 'networks', label: 'Networks' },
                  ].map((chip) => (
                    <TouchableOpacity
                      key={chip.id}
                      onPress={() => setTeamsTab(chip.id)}
                      style={[styles.toggleBtn, teamsTab === chip.id && styles.toggleBtnActive]}
                    >
                      <Text style={[styles.toggleBtnText, teamsTab === chip.id && styles.toggleBtnTextActive]}>{chip.label}</Text>
                    </TouchableOpacity>
                  ))}
                  
                  {activeTabId === 'stats' && [
                    { id: 'batting', label: 'Batting' },
                    { id: 'bowling', label: 'Bowling' },
                    { id: 'fielding', label: 'Fielding' },
                    { id: 'captain', label: 'Captain' },
                  ].map((chip) => (
                    <TouchableOpacity
                      key={chip.id}
                      onPress={() => setStatsTab(chip.id)}
                      style={[styles.toggleBtn, statsTab === chip.id && styles.toggleBtnActive]}
                    >
                      <Text style={[styles.toggleBtnText, statsTab === chip.id && styles.toggleBtnTextActive]}>{chip.label}</Text>
                    </TouchableOpacity>
                  ))}

                  {activeTabId === 'trophies' && [
                    { id: 'matches', label: 'Matches' },
                    { id: 'tournaments', label: 'Tournaments' },
                  ].map((chip) => (
                    <TouchableOpacity
                      key={chip.id}
                      onPress={() => setTrophiesTab(chip.id)}
                      style={[styles.toggleBtn, trophiesTab === chip.id && styles.toggleBtnActive]}
                    >
                      <Text style={[styles.toggleBtnText, trophiesTab === chip.id && styles.toggleBtnTextActive]}>{chip.label}</Text>
                    </TouchableOpacity>
                  ))}

                  {activeTabId === 'badges' && [
                    { id: 'batting', label: 'Batting' },
                    { id: 'bowling', label: 'Bowling' },
                    { id: 'fielding', label: 'Fielding' },
                  ].map((chip) => (
                    <TouchableOpacity
                      key={chip.id}
                      onPress={() => setBadgesTab(chip.id)}
                      style={[styles.toggleBtn, badgesTab === chip.id && styles.toggleBtnActive]}
                    >
                      <Text style={[styles.toggleBtnText, badgesTab === chip.id && styles.toggleBtnTextActive]}>{chip.label}</Text>
                    </TouchableOpacity>
                  ))}

                  {activeTabId === 'connections' && [
                    { id: 'followers', label: 'Followers' },
                    { id: 'following', label: 'Following' },
                  ].map((chip) => (
                    <TouchableOpacity
                      key={chip.id}
                      onPress={() => setConnectionsTab(chip.id)}
                      style={[styles.toggleBtn, connectionsTab === chip.id && styles.toggleBtnActive]}
                    >
                      <Text style={[styles.toggleBtnText, connectionsTab === chip.id && styles.toggleBtnTextActive]}>{chip.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <View style={[styles.subBarInjection, { height: 0, paddingVertical: 0 }]} />
            )}
          </View>
        )}
      </Animated.View>

      <Animated.ScrollView
        ref={horizontalPagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: initialIndex * windowWidth, y: 0 }}
        onScroll={horizontalScrollHandler}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {TABS.map((tab) => (
          <View key={`${tab.id}-${windowWidth}`} style={{ width: windowWidth, flex: 1 }}>
            <Animated.ScrollView 
              onScroll={verticalScrollHandler}
              scrollEventThrottle={16}
              style={styles.mainScroll} 
              contentContainerStyle={[
                styles.mainScrollContent, 
                { 
                  paddingTop: (tab.id === 'stats' || tab.id === 'trophies' || tab.id === 'badges' || tab.id === 'connections' || tab.id === 'teams' || tab.id === 'tournaments' 
                    ? HEADER_MAX_HEIGHT + 48 + insets.top 
                    : HEADER_MAX_HEIGHT + insets.top
                  ),
                  paddingBottom: 100 // Add some bottom padding for better scroll feel
                }
              ]} 
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.contentContainer}>
                {tab.id === 'player-profile' && <CricketPlayerProfile />}
                {tab.id === 'matches' && <CricketMatches playerId={user?.id} />}
                {tab.id === 'stats' && <CricketStats activeSubTab={statsTab} />}
                {tab.id === 'trophies' && <CricketTrophies />}
                {tab.id === 'badges' && <CricketBadges />}
                {tab.id === 'tournaments' && <CricketTournaments activeSubTab={tournamentsTab} />}
                {tab.id === 'teams' && <CricketTeams activeSubTab={teamsTab} />}
                {tab.id === 'highlights' && <CricketHighlights />}
                {tab.id === 'photos' && <CricketPhotos />}
                {tab.id === 'connections' && <CricketConnections />}
              </View>
            </Animated.ScrollView>
          </View>
        ))}
      </Animated.ScrollView>
      {renderActionModal()}
    </View>
  );

  if (Platform.OS === 'web' && !isCompact) {
    return (
      <WebLayout noCard>
        {content}
      </WebLayout>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabsStickyWrapper: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'web' ? 0 : 0,
    zIndex: 10,
  },
  tabsInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 16,
    height: 52,
    // Removed border here to place it on the indicator itself
  },
  tabsScroll: {
    paddingVertical: 5,
    gap: 4, // Reduced from 8
  },
  tab: {
    paddingHorizontal: 12, // Reduced from 16
    backgroundColor: 'transparent',
  },
  tabUnderline: {
    height: '100%',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabUnderlineActive: {
    borderBottomColor: '#01b854',
  },
  profileHeaderContent: {
    paddingHorizontal: 20,
    zIndex: 2,
    maxWidth: 650,
    alignSelf: 'center',
    width: '100%',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#06392e',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#06392e',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  headerTextInfo: {
    flex: 1,
  },
  headerPlayerName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    marginBottom: 2,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerLocGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerMetricGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerLocation: {
    fontSize: 13,
    color: '#FFFFFFCC',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  headerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  headerStat: {
    fontSize: 13,
    color: '#FFFFFFCC',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  headerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerTagText: {
    fontSize: 11.5,
    color: '#FFFFFFCC',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  headerTagDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  perfTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  perfTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  perfTagText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '800',
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rankText: {
    fontSize: 11,
    color: '#FCD34D',
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  insightsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FCD34D', // Yellow Golden
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  insightsBtnText: {
    fontSize: 12,
    color: '#06392e', // Dark theme text
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  miniHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 55,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
    maxWidth: 650,
    alignSelf: 'center',
  },
  miniNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  miniTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  tabText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  tabTextActive: {
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#01b854',
  },
  miniNavRight: {
    flexDirection: 'row',
    gap: 8,
  },
  subBarInjection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 2,
    width: '100%', // Full width
  },
  toggleBtn: {
    flex: 1, // Distribute space equally
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF', // Light Grey (White) active state
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  toggleBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  toggleBtnTextActive: {
    fontFamily: 'Inter',
    color: '#334155', // Dark text on light background
    fontWeight: '700',
  },
  plusIconWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 40,
  },
  contentContainer: {
    maxWidth: 650, // Matches the profile content for a cohesive look
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 0, // Padding is handled by children
    paddingTop: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    width: '90%',
    maxWidth: 400,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 25,
  },
  actionModalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 32,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  actionItem: {
    width: '47%',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  actionCloseBtn: {
    marginTop: 24,
    paddingVertical: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    alignItems: 'center',
  },
  actionCloseBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  avatarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  avatarOptionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 340,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  avatarOptionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatarOptionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  avatarOptionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  avatarOptionItem: {
    alignItems: 'center',
    gap: 10,
  },
  avatarOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  qrContent: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    width: '100%',
  },
  qrWrapper: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  qrPlayerName: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '800',
    color: '#06392e',
    fontFamily: 'Inter',
  },
  qrSubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'Inter',
  },
  shareQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#01b854',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 24,
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  shareQrBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
});
