import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Platform, 
  Dimensions, 
  Animated as RNAnimated, 
  ScrollView,
  ActivityIndicator,
  Modal,
  Share,
  Alert,
  useWindowDimensions,
  TextInput
} from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import { useIsCompact } from '@/hooks/useIsCompact';
import { 
  Plus, 
  Settings, 
  Share2, 
  Camera, 
  Trash2, 
  MapPin, 
  Eye, 
  Users, 
  Trophy, 
  Calendar, 
  Clock, 
  ChevronRight, 
  ChevronLeft,
  History,
  TrendingUp,
  QrCode,
  X,
  HelpCircle,
  Swords,
  Radio
} from 'lucide-react-native';

import { Stack, useRouter, useLocalSearchParams, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming, 
  useAnimatedScrollHandler,
  runOnJS,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getPlayerTags, PlayerTag } from '@/lib/stats-logic';
import QRCode from 'react-native-qrcode-svg';

// Import sub-tab components
import CricketMatches from './matches';
import CricketStats from './stats';
import CricketTrophies from './trophies';
import CricketBadges from './badges';
import CricketTournaments from './tournaments';
import CricketTeams from './teams';
import CricketHighlights from './highlights';
import CricketPhotos from './photos';
import CricketConnections from './connections';
import CricketPlayerProfile from './player-profile';

const { width: windowWidth } = Dimensions.get('window');

const HEADER_MAX_HEIGHT = 300;
const HEADER_MIN_HEIGHT = 100;
const SUB_BAR_HEIGHT = 48;

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
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isCompact = useIsCompact();
  const [profile, setProfile] = useState<any>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [activeTabId, setActiveTabId] = useState('player-profile');
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);

  const animatedScrollY = useSharedValue(0);
  const horizontalPagerRef = useRef<ScrollView>(null);
  const tabScrollRef = useRef<ScrollView>(null);
  const initialIndex = TABS.findIndex(t => t.id === activeTabId) || 0;

  const lastScrollY = useSharedValue(0);
  const tabScrollPositions = useSharedValue(TABS.map(() => 0));
  const activeTabIndex = useSharedValue(initialIndex);
  const { width: windowWidth } = useWindowDimensions();
  const [measuredPagerWidth, setMeasuredPagerWidth] = useState(0);
  const pagerWidth = measuredPagerWidth || windowWidth;
  
  const horizontalOffset = useSharedValue(initialIndex * pagerWidth);
  const isScrollingProgrammatically = useRef(false);
  const isInitialRender = useRef(true);

  const [matchesStatus, setMatchesStatus] = React.useState('all');
  const matchesIdx = useSharedValue(0);

  const [statsTab, setStatsTab] = React.useState('batting');
  const statsIdx = useSharedValue(0);

  const [tournamentsTab, setTournamentsTab] = React.useState('all');
  const tournamentsIdx = useSharedValue(0);

  const [teamsTab, setTeamsTab] = React.useState('your');
  const teamsIdx = useSharedValue(0);

  const [trophiesTab, setTrophiesTab] = React.useState('matches');
  const trophiesIdx = useSharedValue(0);

  const [badgesTab, setBadgesTab] = React.useState('batting');
  const badgesIdx = useSharedValue(0);

  const [connectionsTab, setConnectionsTab] = React.useState('followers');
  const connectionsIdx = useSharedValue(0);

  const [tabBarVisible, setTabBarVisible] = useState(true);

  const [tabMeasurements, setTabMeasurements] = React.useState<any[]>([]);
  const [dynamicTags, setDynamicTags] = useState<PlayerTag[]>([]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchFollowCounts();
      fetchDynamicTags();
    }
  }, [user]);

  // Initial scroll sync
  useEffect(() => {
    if (isInitialRender.current && horizontalPagerRef.current && initialIndex > 0) {
      isInitialRender.current = false;
      setTimeout(() => {
        horizontalPagerRef.current?.scrollTo({ x: initialIndex * pagerWidth, animated: false });
      }, 100);
    } else if (isInitialRender.current) {
      isInitialRender.current = false;
    }
  }, [pagerWidth]);

  // Sync sub-tab shared values for animations
  useEffect(() => {
    const idx = ['batting', 'bowling', 'fielding', 'captain'].indexOf(statsTab);
    if (idx !== -1) statsIdx.value = idx;
  }, [statsTab]);

  useEffect(() => {
    const idx = ['your', 'all', 'top teams', 'networks'].indexOf(teamsTab);
    if (idx !== -1) teamsIdx.value = idx;
  }, [teamsTab]);

  useEffect(() => {
    const idx = ['all', 'participate', 'network', 'nearby'].indexOf(tournamentsTab);
    if (idx !== -1) tournamentsIdx.value = idx;
  }, [tournamentsTab]);

  useEffect(() => {
    const idx = ['matches', 'tournaments'].indexOf(trophiesTab);
    if (idx !== -1) trophiesIdx.value = idx;
  }, [trophiesTab]);

  useEffect(() => {
    const idx = ['batting', 'bowling', 'fielding'].indexOf(badgesTab);
    if (idx !== -1) badgesIdx.value = idx;
  }, [badgesTab]);

  useEffect(() => {
    const idx = ['all', 'live', 'upcoming', 'result'].indexOf(matchesStatus);
    if (idx !== -1) matchesIdx.value = idx;
  }, [matchesStatus]);

  useEffect(() => {
    const idx = ['followers', 'following'].indexOf(connectionsTab);
    if (idx !== -1) connectionsIdx.value = idx;
  }, [connectionsTab]);

  // Sync pager when pathname changes (e.g. from bottom bar or deep link)
  React.useEffect(() => {
    // Only sync if the pathname has a specific sub-tab ID.
    // We avoid defaulting to 'player-profile' if we are already on another tab 
    // and the pathname doesn't explicitly ask for 'player-profile'.
    const targetTab = TABS.find(t => t.id !== 'player-profile' && pathname.includes(t.id));
    
    // If the pathname specifically mentions 'player-profile', then we go there.
    const isExplicitProfile = pathname.includes('player-profile') || pathname.endsWith('/cricket');
    
    let tabId = activeTabId;
    if (targetTab) {
      tabId = targetTab.id;
    } else if (isExplicitProfile) {
      tabId = 'player-profile';
    }

    if (tabId !== activeTabId) {
      const idx = TABS.find(t => t.id === tabId)?.index || 0;
      setActiveTabId(tabId);
      activeTabIndex.value = idx;
      // Use animated: false for immediate sync to avoid jump during navigation
      horizontalPagerRef.current?.scrollTo({ x: idx * windowWidth, animated: false });
    }
  }, [pathname, windowWidth]);

  const fetchDynamicTags = async () => {
    try {
      // Fetch member IDs for the user
      const { data: members } = await supabase
        .from('team_members')
        .select('id')
        .eq('profile_id', user?.id);
      
      const memberIds = members?.map(m => m.id) || [];
      if (memberIds.length === 0) return;

      // Fetch stats
      const { data: statsData } = await supabase
        .from('player_ball_stats')
        .select('*')
        .in('member_id', memberIds);
      
      if (statsData && statsData.length > 0) {
        const summed = statsData.reduce((acc: any, curr: any) => ({
          total_runs: (acc.total_runs || 0) + (curr.total_runs || 0),
          total_wickets: (acc.total_wickets || 0) + (curr.total_wickets || 0),
          matches_played: (acc.matches_played || 0) + (curr.matches_played || 0),
          innings_batted: (acc.innings_batted || 0) + (curr.innings_batted || 0),
          innings_bowled: (acc.innings_bowled || 0) + (curr.innings_bowled || 0),
          not_outs: (acc.not_outs || 0) + (curr.not_outs || 0),
          runs_conceded: (acc.runs_conceded || 0) + (curr.runs_conceded || 0),
          overs_bowled: (acc.overs_bowled || 0) + (curr.overs_bowled || 0),
          strike_rate: curr.strike_rate || 0, // Simplified SR for now
        }), {});

        const calculatedTags = getPlayerTags(summed);
        setDynamicTags(calculatedTags);
      }
    } catch (error) {
      console.error('Error fetching dynamic tags:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchFollowCounts = async () => {
    if (!user?.id) return;
    try {
      // Fetch Followers
      const { count: followers, error: fErr } = await supabase
        .from('profiles_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);
      
      if (fErr) throw fErr;
      setFollowerCount(followers || 0);

      // Fetch Following
      const { count: following, error: gErr } = await supabase
        .from('profiles_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);
      
      if (gErr) throw gErr;
      setFollowingCount(following || 0);
    } catch (error) {
      console.error('Error fetching follow counts:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
      fetchFollowCounts();
    }
  }, [user?.id]);

  const handleAvatarPress = () => {
    setIsAvatarModalVisible(true);
  };



  const verticalScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      animatedScrollY.value = event.contentOffset.y;
      
      const currentY = event.contentOffset.y;
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

  const hasSubBar = activeTabId === 'matches' || activeTabId === 'stats' || activeTabId === 'trophies' || activeTabId === 'badges' || activeTabId === 'connections' || activeTabId === 'teams' || activeTabId === 'tournaments';

  const headerHeight = useAnimatedStyle(() => {
    // Standardize min height to avoid jumps between tabs with/without sub-bars
    const currentMinHeight = HEADER_MIN_HEIGHT + 44; 
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

  const mainIndicatorStyle = useAnimatedStyle(() => {
    if (tabMeasurements.length === 0) return { width: 0, opacity: 0 };
    
    const pagerWidth = measuredPagerWidth || windowWidth;
    const index = horizontalOffset.value / pagerWidth;
    const lowIdx = Math.floor(index);
    const highIdx = Math.ceil(index);
    const progress = index - lowIdx;
    
    const lowTab = tabMeasurements[Math.max(0, Math.min(lowIdx, TABS.length - 1))];
    const highTab = tabMeasurements[Math.max(0, Math.min(highIdx, TABS.length - 1))];
    
    if (!lowTab || !highTab) return { width: 0, opacity: 0 };
    
    const translateX = lowTab.x + (highTab.x - lowTab.x) * progress;
    const width = lowTab.width + (highTab.width - lowTab.width) * progress;
    
    return {
      transform: [{ translateX }],
      width,
      opacity: 1,
    };
  });

  const statsPillStyle = useAnimatedStyle(() => ({
    left: withTiming((statsIdx.value / 4) * 100 + '%', { duration: 250 }),
    width: '25%',
  }));

  const matchesPillStyle = useAnimatedStyle(() => ({
    left: withTiming((matchesIdx.value / 4) * 100 + '%', { duration: 250 }),
    width: '25%',
  }));

  const teamsPillStyle = useAnimatedStyle(() => ({
    left: withTiming((teamsIdx.value / 4) * 100 + '%', { duration: 250 }),
    width: '25%',
  }));

  const tournamentsPillStyle = useAnimatedStyle(() => ({
    left: withTiming((tournamentsIdx.value / 4) * 100 + '%', { duration: 250 }),
    width: '25%',
  }));

  const trophiesPillStyle = useAnimatedStyle(() => ({
    left: withTiming((trophiesIdx.value / 2) * 100 + '%', { duration: 250 }),
    width: '50%',
  }));

  const badgesPillStyle = useAnimatedStyle(() => ({
    left: withTiming((badgesIdx.value / 3) * 100 + '%', { duration: 250 }),
    width: '33.33%',
  }));

  const connectionsPillStyle = useAnimatedStyle(() => ({
    left: withTiming((connectionsIdx.value / 2) * 100 + '%', { duration: 250 }),
    width: '50%',
  }));

  const miniHeaderTitleOpacity = useAnimatedStyle(() => {
    return {
      opacity: Math.min(1, animatedScrollY.value / 150),
    };
  });

  const headerContainerStyle = useAnimatedStyle(() => {
    // Keep header height consistent across all tabs for a stable UI
    // We use a fixed offset for the sub-bar area even if it's not present to prevent layout jumps
    const baseMaxHeight = HEADER_MAX_HEIGHT + SUB_BAR_HEIGHT;
    const baseMinHeight = HEADER_MIN_HEIGHT + SUB_BAR_HEIGHT;
    
    return {
      height: Math.max(baseMinHeight + insets.top, baseMaxHeight + insets.top - animatedScrollY.value),
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

  const renderAvatarOptions = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isAvatarModalVisible}
      onRequestClose={() => setIsAvatarModalVisible(false)}
    >
      <TouchableOpacity 
        style={styles.avatarModalOverlay}
        activeOpacity={1}
        onPress={() => setIsAvatarModalVisible(false)}
      >
        <View style={styles.avatarOptionsCard}>
          <View style={styles.avatarOptionsHeader}>
            <Text style={styles.avatarOptionsTitle}>Profile Picture</Text>
            <TouchableOpacity onPress={() => setIsAvatarModalVisible(false)}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.avatarOptionsGrid}>
            <TouchableOpacity 
              style={styles.avatarOptionItem}
              onPress={() => {
                 setIsAvatarModalVisible(false);
                 // handle pick image
              }}
            >
              <View style={[styles.avatarOptionIcon, { backgroundColor: '#F0FDF4' }]}>
                <Camera size={24} color="#01b854" />
              </View>
              <Text style={styles.avatarOptionLabel}>Camera</Text>
            </TouchableOpacity>

            {profile?.avatar_url && (
              <TouchableOpacity 
                style={styles.avatarOptionItem}
                onPress={() => {
                   setIsAvatarModalVisible(false);
                   // handle delete
                }}
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
              <X size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.qrContent}>
            <View style={styles.qrWrapper}>
              <QRCode
                value={`https://bookyourground.com/cricket-player/${user?.id}`}
                size={200}
                color="#06392e"
                backgroundColor="white"
              />
            </View>
            <Text style={styles.qrPlayerName}>{profile?.full_name}</Text>
            <Text style={styles.qrSubtext}>Scan to view profile</Text>
          </View>

          <TouchableOpacity 
            style={styles.shareQrBtn}
            onPress={() => {
              Share.share({
                message: `Check out my cricket profile on Book Your Ground: https://bookyourground.com/cricket-player/${user?.id}`,
              });
            }}
          >
            <Share2 size={20} color="#FFFFFF" />
            <Text style={styles.shareQrBtnText}>Share Profile</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const formatName = (name: string) => {
    if (!name) return '';
    return name.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' ');
  };

  const syncTabState = (index: number) => {
    if (index >= 0 && index < TABS.length) {
      const tab = TABS[index];
      setActiveTabId(tab.id);
      activeTabIndex.value = index;
      
      // Center the tab
      const tabWidth = 80;
      tabScrollRef.current?.scrollTo({
        x: index * tabWidth - windowWidth / 2 + tabWidth / 2,
        animated: true
      });
    }
  };

  const horizontalScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      horizontalOffset.value = event.contentOffset.x;
    },
    onMomentumEnd: (event) => {
      if (isScrollingProgrammatically.current) return;
      const index = Math.round(event.contentOffset.x / (measuredPagerWidth || windowWidth));
      runOnJS(syncTabState)(index);
    }
  });

  const onMomentumScrollEnd = (event: any) => {
    isScrollingProgrammatically.current = false;
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (measuredPagerWidth || windowWidth));
    syncTabState(index);
  };

  const onTabPress = (tabId: string, index: number) => {
    if (activeTabId === tabId) return;
    
    isScrollingProgrammatically.current = true;
    setActiveTabId(tabId);
    activeTabIndex.value = index;
    
    horizontalPagerRef.current?.scrollTo({ x: index * pagerWidth, animated: true });
    
    // Center the tab in the top bar
    const tabData = tabMeasurements[index];
    if (tabData) {
      tabScrollRef.current?.scrollTo({
        x: tabData.x - pagerWidth / 2 + tabData.width / 2,
        animated: true
      });
    } else {
      const approxTabWidth = 80;
      tabScrollRef.current?.scrollTo({
        x: index * approxTabWidth - pagerWidth / 2 + approxTabWidth / 2,
        animated: true
      });
    }
    
    setTimeout(() => {
      isScrollingProgrammatically.current = false;
    }, 600);
  };

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
          { paddingTop: insets.top + 70 },
          Platform.OS === 'web' && styles.webResponsiveContent
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
              ) : (
                <Image 
                  source={profile?.avatar_url ? { uri: profile.avatar_url } : require('../../../assets/avatar.png')} 
                  style={styles.headerAvatar} 
                />
              )}
              <View style={styles.avatarEditBadge}>
                {profile?.avatar_url ? <Trash2 size={10} color="#FF4444" /> : <Plus size={10} color="#FFFFFF" />}
              </View>
            </TouchableOpacity>
            <View style={styles.headerTextInfo}>
              {profile?.full_name ? (
                <Text style={styles.headerPlayerName}>{formatName(profile.full_name)}</Text>
              ) : (
                <View style={styles.skeletonName} />
              )}
              
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
                  profile?.bowling_style,
                  ...dynamicTags.map(t => t.label)
                ].filter(Boolean).map((tag, i) => (
                  <View key={i} style={[
                    styles.headerTag, 
                    dynamicTags.some(dt => dt.label === tag) && { backgroundColor: '#15803d40', borderColor: '#15803d' }
                  ]}>
                    <Text style={styles.headerTagText}>{tag}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.headerMetricsRow}>
                <TouchableOpacity style={styles.headerMetricBadge} onPress={() => router.push('/cricket/rank')}>
                  <Trophy size={12} color="#FFD700" />
                  <Text style={styles.headerMetricBadgeText}>Leaderboard</Text>
                  <ChevronRight size={10} color="#FFFFFF90" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerMetricBadge} onPress={() => router.push('/cricket/insights')}>
                  <TrendingUp size={12} color="#FFFFFF" />
                  <Text style={styles.headerMetricBadgeText}>Insights</Text>
                  <ChevronRight size={10} color="#FFFFFF90" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Persistent Top Actions */}
        <View style={[
          styles.topActionRow, 
          { paddingTop: insets.top + 5, height: 56 + insets.top },
          Platform.OS === 'web' && styles.webResponsiveContent
        ]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.actionCircleBtn}>
            <ChevronLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Animated.View style={[styles.centeredMiniTitle, miniHeaderTitleOpacity]}>
            <Text style={styles.miniHeaderTitle} numberOfLines={1}>
              {formatName(profile?.full_name)}
            </Text>
          </Animated.View>

          <View style={styles.rightActionsGroup}>
            <TouchableOpacity onPress={() => setIsQrModalVisible(true)} style={styles.actionCircleBtn}>
              <QrCode size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => Share.share({ message: `Check out my profile: https://bookyourground.com/cricket-player/${user?.id}` })} 
              style={styles.actionCircleBtn}
            >
              <Share2 size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Bar (Always Sticky) */}
        <View style={styles.tabsStickyWrapper}>
          <View style={[styles.tabsContainer, Platform.OS === 'web' && styles.webResponsiveContent]}>
            <ScrollView 
              ref={tabScrollRef}
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.tabsScroll} 
              style={{ flex: 1 }}
            >
              <Animated.View style={[styles.mainTabIndicator, mainIndicatorStyle]} />
              
              {TABS.map((tab) => (
                <TouchableOpacity 
                  key={tab.id} 
                  style={styles.tab} 
                  onPress={() => onTabPress(tab.id, tab.index)}
                  onLayout={(e) => {
                    const { x, width } = e.nativeEvent.layout;
                    setTabMeasurements(prev => {
                      const next = [...prev];
                      next[tab.index] = { x, width };
                      return next;
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.tabText, 
                    activeTabId === tab.id && styles.tabTextActive
                  ]}>
                    {tab.label}
                  </Text>
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

          {/* Sub-bar area - Fixed height for all tabs to ensure consistent header height when pinned */}
          <View style={[
            styles.subBarInjection, 
            !hasSubBar && { height: SUB_BAR_HEIGHT },
            Platform.OS === 'web' && styles.webResponsiveContent
          ]}>
            {hasSubBar && (
              <View style={styles.toggleGroup}>
                {activeTabId === 'matches' && (
                  <>
                    <Animated.View style={[styles.subTabPill, matchesPillStyle]} />
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'live', label: 'Live' },
                      { id: 'upcoming', label: 'Upcoming' },
                      { id: 'result', label: 'Result' },
                    ].map((chip) => (
                      <TouchableOpacity
                        key={chip.id}
                        onPress={() => setMatchesStatus(chip.id)}
                        style={styles.toggleBtn}
                      >
                        <Text style={[styles.toggleBtnText, matchesStatus === chip.id && styles.toggleBtnTextActive]}>{chip.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                
                {activeTabId === 'tournaments' && (
                  <>
                    <Animated.View style={[styles.subTabPill, tournamentsPillStyle]} />
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'participate', label: 'Participate' },
                      { id: 'network', label: 'Network' },
                      { id: 'nearby', label: 'Nearby' },
                    ].map((chip) => (
                      <TouchableOpacity
                        key={chip.id}
                        onPress={() => setTournamentsTab(chip.id)}
                        style={styles.toggleBtn}
                      >
                        <Text style={[styles.toggleBtnText, tournamentsTab === chip.id && styles.toggleBtnTextActive]}>{chip.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {activeTabId === 'teams' && (
                  <>
                    <Animated.View style={[styles.subTabPill, teamsPillStyle]} />
                    {[
                      { id: 'your', label: 'Your' },
                      { id: 'all', label: 'All' },
                      { id: 'top teams', label: 'Top Teams' },
                      { id: 'networks', label: 'Networks' },
                    ].map((chip) => (
                      <TouchableOpacity
                        key={chip.id}
                        onPress={() => setTeamsTab(chip.id)}
                        style={styles.toggleBtn}
                      >
                        <Text style={[styles.toggleBtnText, teamsTab === chip.id && styles.toggleBtnTextActive]}>{chip.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                
                {activeTabId === 'stats' && (
                  <>
                    <Animated.View style={[styles.subTabPill, statsPillStyle]} />
                    {[
                      { id: 'batting', label: 'Batting' },
                      { id: 'bowling', label: 'Bowling' },
                      { id: 'fielding', label: 'Fielding' },
                      { id: 'captain', label: 'Captain' },
                    ].map((chip) => (
                      <TouchableOpacity
                        key={chip.id}
                        onPress={() => setStatsTab(chip.id)}
                        style={styles.toggleBtn}
                      >
                        <Text style={[styles.toggleBtnText, statsTab === chip.id && styles.toggleBtnTextActive]}>{chip.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {activeTabId === 'trophies' && (
                  <>
                    <Animated.View style={[styles.subTabPill, trophiesPillStyle]} />
                    {[
                      { id: 'matches', label: 'Matches' },
                      { id: 'tournaments', label: 'Tournaments' },
                    ].map((chip) => (
                      <TouchableOpacity
                        key={chip.id}
                        onPress={() => setTrophiesTab(chip.id)}
                        style={styles.toggleBtn}
                      >
                        <Text style={[styles.toggleBtnText, trophiesTab === chip.id && styles.toggleBtnTextActive]}>{chip.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {activeTabId === 'badges' && (
                  <>
                    <Animated.View style={[styles.subTabPill, badgesPillStyle]} />
                    {[
                      { id: 'batting', label: 'Batting' },
                      { id: 'bowling', label: 'Bowling' },
                      { id: 'fielding', label: 'Fielding' },
                    ].map((chip) => (
                      <TouchableOpacity
                        key={chip.id}
                        onPress={() => setBadgesTab(chip.id)}
                        style={styles.toggleBtn}
                      >
                        <Text style={[styles.toggleBtnText, badgesTab === chip.id && styles.toggleBtnTextActive]}>{chip.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {activeTabId === 'connections' && (
                  <>
                    <Animated.View style={[styles.subTabPill, connectionsPillStyle]} />
                    {[
                      { id: 'followers', label: 'Followers' },
                      { id: 'following', label: 'Following' },
                    ].map((chip) => (
                      <TouchableOpacity
                        key={chip.id}
                        onPress={() => setConnectionsTab(chip.id)}
                        style={styles.toggleBtn}
                      >
                        <Text style={[styles.toggleBtnText, connectionsTab === chip.id && styles.toggleBtnTextActive]}>{chip.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        ref={horizontalPagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={horizontalScrollHandler}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        onLayout={(e) => {
          setMeasuredPagerWidth(e.nativeEvent.layout.width);
        }}
        style={{ flex: 1 }}
      >
        {TABS.map((tab) => (
          <View key={tab.id} style={{ width: pagerWidth, flex: 1 }}>
            <Animated.ScrollView 
              onScroll={verticalScrollHandler}
              scrollEventThrottle={16}
              style={styles.mainScroll} 
              contentContainerStyle={[
                styles.mainScrollContent, 
                { 
                  paddingTop: HEADER_MAX_HEIGHT + SUB_BAR_HEIGHT + insets.top,
                  paddingBottom: 100
                }
              ]} 
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.contentContainer}>
                {tab.id === 'player-profile' && <CricketPlayerProfile />}
                {tab.id === 'matches' && (
                  <CricketMatches 
                    playerId={user?.id} 
                    statusFilter={matchesStatus}
                    onStatusChange={(val: string) => setMatchesStatus(val)}
                  />
                )}
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
    </View>
  );
  
  if (Platform.OS === 'web') {
    return <WebLayout hideHeader={!isCompact}>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  webResponsiveContent: {
    maxWidth: 650,
    alignSelf: 'center',
    width: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#01b854',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF30',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeaderContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTextInfo: {
    flex: 1,
  },
  headerPlayerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLocGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerLocation: {
    fontSize: 12,
    color: '#FFFFFFCC',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  headerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF60',
    marginHorizontal: 8,
  },
  headerMetricGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerStat: {
    fontSize: 12,
    color: '#FFFFFFCC',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  headerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  headerTagText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Inter',
  },
  headerTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTagDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF40',
    marginHorizontal: 6,
  },
  topActionRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  actionCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredMiniTitle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  headerMetricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerMetricBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  headerMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  miniHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  rightActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tabsStickyWrapper: {
    backgroundColor: '#FFFFFF',
    zIndex: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  tabsScroll: {
    paddingTop: 10,
    paddingHorizontal: 16,
    gap: 20,
  },
  tab: {
    paddingBottom: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    fontFamily: 'Inter',
  },
  tabTextActive: {
    color: '#01b854',
  },
  mainTabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: '#01b854',
    borderRadius: 2,
    zIndex: 1,
  },
  subBarInjection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  toggleGroup: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    height: 36,
    position: 'relative',
  },
  subTabPill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  toggleBtnTextActive: {
    color: '#01b854',
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
    paddingHorizontal: 16,
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
  skeletonName: {
    height: 24,
    width: 140,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    marginBottom: 8,
  },
});
