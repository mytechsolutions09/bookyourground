import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
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

import CricketPlayerProfile from './player-profile';
import CricketMatches from './matches';
import CricketTournaments from './tournaments';
import CricketTeams from './teams';
import CricketStats from './stats';
import CricketHighlights from './highlights';

const TABS = [
  { id: 'player-profile', label: 'Player Profile', index: 0 },
  { id: 'matches', label: 'Matches', index: 1 },
  { id: 'tournaments', label: 'Tournaments', index: 2 },
  { id: 'teams', label: 'Teams', index: 3 },
  { id: 'stats', label: 'Stats', index: 4 },
  { id: 'highlights', label: 'Highlights', index: 5 },
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
  const horizontalPagerRef = React.useRef<Animated.ScrollView>(null);
  const tabScrollRef = React.useRef<ScrollView>(null);
  
  const [isActionModalVisible, setIsActionModalVisible] = React.useState(false);
  
  const headerTranslateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const HEADER_HEIGHT = 105;

  // Auto-scroll the tab bar when active tab changes
  React.useEffect(() => {
    const idx = TABS.find(t => t.id === activeTabId)?.index || 0;
    tabScrollRef.current?.scrollTo({ x: idx * 100 - (windowWidth/2) + 50, animated: true });
    
    // URL sync removed to prevent infinite loops during rapid swipes
  }, [activeTabId]);

  // Handle manual tab press
  const onTabPress = (tabId: string, idx: number) => {
    setActiveTabId(tabId);
    horizontalPagerRef.current?.scrollTo({ x: idx * windowWidth, animated: true });
  };

  const horizontalScrollHandler = useAnimatedScrollHandler({
    onMomentumEnd: (event) => {
      const idx = Math.round(event.contentOffset.x / windowWidth);
      const tab = TABS[idx];
      if (tab) {
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
      const diff = currentY - lastScrollY.value;
      
      if (diff > 1 && currentY > 50) {
        if (headerTranslateY.value === 0) {
          headerTranslateY.value = withTiming(-HEADER_HEIGHT - insets.top, { 
            duration: 600,
            easing: Easing.out(Easing.exp)
          });
          runOnJS(setTabBarVisible)(false);
        }
      } else if (diff < -2 || currentY < 20) {
        if (headerTranslateY.value < 0) {
          headerTranslateY.value = withTiming(0, { 
            duration: 600,
            easing: Easing.out(Easing.exp)
          });
          runOnJS(setTabBarVisible)(true);
        }
      }
      lastScrollY.value = currentY;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#F8FAFC',
  }));

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
      <Animated.View style={headerAnimatedStyle}>
        {(Platform.OS !== 'web' || isCompact) && (
          <MobileAppNavbar title="Cricket" smallerTitle={true} />
        )}
        {!pathname.includes('/scoring') && (
          <View style={styles.tabsStickyWrapper}>
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
          <View key={tab.id} style={{ width: windowWidth }}>
            <Animated.ScrollView 
              onScroll={verticalScrollHandler}
              scrollEventThrottle={16}
              style={styles.mainScroll} 
              contentContainerStyle={[styles.mainScrollContent, { paddingTop: HEADER_HEIGHT + insets.top }]} 
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.contentContainer}>
                {tab.id === 'player-profile' && <CricketPlayerProfile />}
                {tab.id === 'matches' && <CricketMatches />}
                {tab.id === 'tournaments' && <CricketTournaments />}
                {tab.id === 'teams' && <CricketTeams />}
                {tab.id === 'stats' && <CricketStats />}
                {tab.id === 'highlights' && <CricketHighlights />}
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
  },
  tabsScroll: {
    paddingVertical: 5,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  tabUnderline: {
    paddingVertical: 10,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabUnderlineActive: {
    borderBottomColor: '#01b854',
  },
  tabText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  tabTextActive: {
    fontWeight: '600',
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
    maxWidth: 1200,
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
});
