import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { Search, User, Users, Shield, RefreshCw, Sliders, MapPin, ChevronRight, ClipboardList, MessageCircle, Plus, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import WebLayout from '@/components/web/WebLayout';
import SiteFooter from '@/components/web/SiteFooter';

export default function CricketHubScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isMobile = width < 768;

  const [activeTab, setActiveTab] = useState<'profile' | 'board'>('board');

  // Notice Board State
  const [boardSubTab, setBoardSubTab] = useState<'players_needed' | 'teams_needed'>('players_needed');
  const [playerRequests, setPlayerRequests] = useState([
    { id: '1', teamName: 'Gurgaon Strikers', role: 'Top-order Batsman', city: 'Gurugram', message: 'Looking for a solid opener for weekend matches.', postedAt: '2h ago' },
    { id: '2', teamName: 'Delhi Smashers', role: 'Pace Bowler', city: 'New Delhi', message: 'Need an aggressive fast bowler. Practice on Tuesdays.', postedAt: '5h ago' }
  ]);
  const [teamRequests, setTeamRequests] = useState([
    { id: '1', playerName: 'Rahul Kumar', role: 'All-rounder', city: 'Noida', message: 'Right-arm medium pacer and middle order batsman looking for a club.', postedAt: '1h ago' },
    { id: '2', playerName: 'Amit Singh', role: 'Wicket-keeper', city: 'Gurugram', message: 'Experienced keeper-batsman. Available on weekends.', postedAt: '1d ago' }
  ]);
  const [isPostModalVisible, setIsPostModalVisible] = useState(false);
  const [postRole, setPostRole] = useState('');
  const [postCity, setPostCity] = useState('');
  const [postMessage, setPostMessage] = useState('');

  const handleCreatePost = () => {
    if (!postRole || !postCity || !postMessage) return;
    const newPost = {
      id: Date.now().toString(),
      role: postRole,
      city: postCity,
      message: postMessage,
      postedAt: 'Just now',
    };
    if (boardSubTab === 'players_needed') {
      setPlayerRequests([{ ...newPost, teamName: 'Your Team' }, ...playerRequests]);
    } else {
      setTeamRequests([{ ...newPost, playerName: 'You' }, ...teamRequests]);
    }
    setIsPostModalVisible(false);
    setPostRole('');
    setPostCity('');
    setPostMessage('');
  };

  // Route to Player Profile if selected
  useEffect(() => {
    if (activeTab === 'profile') {
      if (Platform.OS === 'web') {
        window.location.href = '/cricket/player-profile';
      } else {
        router.push('/cricket/player-profile');
      }
    }
  }, [activeTab]);

  // Render Player Item
  // Render Team Item
  const renderBoardItem = ({ item }: { item: any }) => {
    const isPlayerNeeded = boardSubTab === 'players_needed';
    const initials = isPlayerNeeded ? (item.teamName ? item.teamName[0] : 'T') : (item.playerName ? item.playerName[0] : 'P');
    
    return (
      <View style={styles.boardCard}>
        <View style={styles.boardHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{initials}</Text>
            </View>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{isPlayerNeeded ? item.teamName : item.playerName}</Text>
            <View style={styles.locationRow}>
              <MapPin size={12} color="#01b854" style={{ marginRight: 4 }} />
              <Text style={styles.locationText}>{item.city}</Text>
              <Text style={styles.timeText}> • {item.postedAt}</Text>
            </View>
          </View>
        </View>
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>{isPlayerNeeded ? 'Looking for: ' : 'Specialization: '}{item.role}</Text>
        </View>
        <Text style={styles.boardMessage}>{item.message}</Text>
        <TouchableOpacity style={styles.contactBtn}>
          <MessageCircle size={16} color="#01b854" style={{ marginRight: 6 }} />
          <Text style={styles.contactBtnText}>Message</Text>
        </TouchableOpacity>
      </View>
    );
  };


  const content = (
    <View style={styles.page}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* ── HERO BANNER ───────────────────────────────────────────── */}
        {!isWeb && (
          <View style={[styles.heroBanner, isMobile && styles.heroBannerMobile]}>
            <View style={styles.heroLeft}>
              <View style={styles.titleRow}>
                <Text style={styles.heroTitle}>Cricket </Text>
                <Text style={styles.heroTitleAccent}>Hub</Text>
              </View>
              <Text style={styles.heroSubtitle}>
                Discover players and teams in your region
              </Text>

              {/* Feature Badges */}
              <View style={[styles.featuresRow, isMobile && styles.featuresRowMobile]}>
                <View style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <Users size={18} color="#01b854" />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>Find Players</Text>
                    <Text style={styles.featureDesc}>Connect with players</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <Shield size={18} color="#01b854" />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>Find Teams</Text>
                    <Text style={styles.featureDesc}>Join or create teams</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIconContainer}>
                    <User size={18} color="#01b854" />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>Player Profile</Text>
                    <Text style={styles.featureDesc}>View player details</Text>
                  </View>
                </View>
              </View>
            </View>

            {!isMobile && (
              <View style={styles.heroRight}>
                <View style={styles.graphicWrapper}>
                  <Image
                    source={require('@/assets/hero_cricket.png')}
                    style={styles.heroGraphic}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['#FFFFFF', 'rgba(255, 255, 255, 0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.leftOverlay}
                  />
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0)', '#FFFFFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.rightOverlay}
                  />
                  <LinearGradient
                    colors={['#FFFFFF', 'rgba(255, 255, 255, 0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.topOverlay}
                  />
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0)', '#FFFFFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.bottomOverlay}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── MAIN CONTENT CARD ──────────────────────────────────────── */}
        <View style={styles.mainCard}>
          {/* Tabs row */}
          <View style={[styles.tabBar, isMobile && styles.tabBarMobile]}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'profile' && styles.tabButtonActive,
                isMobile && styles.tabButtonMobile,
              ]}
              onPress={() => setActiveTab('profile')}
            >
              <Shield size={18} color={activeTab === 'profile' ? '#01b854' : '#64748B'} style={styles.tabIcon} />
              <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
                Player Profile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'board' && styles.tabButtonActive,
                isMobile && styles.tabButtonMobile,
              ]}
              onPress={() => setActiveTab('board')}
            >
              <ClipboardList size={18} color={activeTab === 'board' ? '#01b854' : '#64748B'} style={styles.tabIcon} />
              <Text style={[styles.tabText, activeTab === 'board' && styles.tabTextActive]}>
                Notice Board
              </Text>
            </TouchableOpacity>
          </View>

          {/* Main Content Area */}
          {activeTab === 'board' && (
            <View style={styles.boardContainer}>
              <View style={styles.boardSubTabs}>
                <View style={styles.subTabGroup}>
                  <TouchableOpacity
                    style={[styles.subTabBtn, boardSubTab === 'players_needed' && styles.subTabBtnActive]}
                    onPress={() => setBoardSubTab('players_needed')}
                  >
                    <Text style={[styles.subTabText, boardSubTab === 'players_needed' && styles.subTabTextActive]}>Teams looking for Players</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.subTabBtn, boardSubTab === 'teams_needed' && styles.subTabBtnActive]}
                    onPress={() => setBoardSubTab('teams_needed')}
                  >
                    <Text style={[styles.subTabText, boardSubTab === 'teams_needed' && styles.subTabTextActive]}>Players looking for Teams</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.createPostBtn} onPress={() => setIsPostModalVisible(true)}>
                  <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={styles.createPostBtnText}>Create Post</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={boardSubTab === 'players_needed' ? playerRequests : teamRequests}
                renderItem={renderBoardItem}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                numColumns={isMobile ? 1 : 2}
                key={isMobile ? 'v-board' : 'h-board'}
                columnWrapperStyle={!isMobile ? { gap: 16 } : null}
                contentContainerStyle={styles.list}
              />
            </View>
          )}
        </View>

        <SiteFooter />
      </ScrollView>

      {/* Create Post Modal */}
      <Modal
        visible={isPostModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPostModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {boardSubTab === 'players_needed' ? 'Find a Player' : 'Find a Team'}
              </Text>
              <TouchableOpacity onPress={() => setIsPostModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>{boardSubTab === 'players_needed' ? 'Role Needed' : 'Your Specialization'}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={boardSubTab === 'players_needed' ? "e.g. Top-order Batsman" : "e.g. Right-arm Fast"}
                value={postRole}
                onChangeText={setPostRole}
              />
              
              <Text style={styles.inputLabel}>City/Location</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Gurugram"
                value={postCity}
                onChangeText={setPostCity}
              />

              <Text style={styles.inputLabel}>Message</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Add more details about what you're looking for..."
                value={postMessage}
                onChangeText={setPostMessage}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity style={styles.submitPostBtn} onPress={handleCreatePost}>
                <Text style={styles.submitPostBtnText}>Post Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  if (isWeb) {
    return <WebLayout noCard={true} isPublicNoSidebar={true}>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 24 : 64,
    paddingBottom: 40,
    alignItems: 'center',
    width: '100%',
  },
  // ── HERO BANNER ─────────────────────────────────────────────
  heroBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 32,
    maxWidth: 1200,
    width: '100%',
    marginBottom: 24,
    overflow: 'hidden',
  },
  heroBannerMobile: {
    flexDirection: 'column',
    padding: 20,
    borderRadius: 16,
  },
  heroLeft: {
    flex: 1.2,
    justifyContent: 'center',
  },
  heroRight: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroGraphic: {
    width: '100%',
    height: '100%',
  },
  graphicWrapper: {
    width: 240,
    height: 240,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  leftOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '35%',
  },
  rightOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '20%',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '20%',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '35%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0F172A',
  },
  heroTitleAccent: {
    fontSize: 42,
    fontWeight: '900',
    color: '#01b854',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 32,
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 16,
  },
  featuresRowMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flex: 1,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  featureDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  // ── MAIN CARD ───────────────────────────────────────────────
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    maxWidth: 1200,
    width: '100%',
    marginBottom: 32,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 234, 107, 0.08)',
    paddingBottom: 16,
    marginBottom: 24,
    gap: 12,
  },
  tabBarMobile: {
    flexDirection: 'column',
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#01b854',
  },
  tabButtonMobile: {
    width: '100%',
  },
  tabIcon: {
    marginRight: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 52,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 15,
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── RESULTS LIST ────────────────────────────────────────────
  resultsWrapper: {
    width: '100%',
  },
  list: {
    gap: 16,
    paddingBottom: 24,
  },
  playerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#01b854',
  },
  cardContent: {
    marginLeft: 14,
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    maxWidth: 160,
  },
  subtext: {
    fontSize: 12,
    color: '#64748B',
  },
  teamMeta: {
    gap: 4,
  },
  captainText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#01b854',
  },
  viewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#01b854',
  },
  // ── EMPTY STATE ─────────────────────────────────────────────
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateImage: {
    width: 160,
    height: 160,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ea6b',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginBottom: 16,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonIcon: {
    marginRight: 8,
  },
  textButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
    textButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#01b854',
  },
  // ── NOTICE BOARD ───────────────────────────────────────────
  boardContainer: {
    width: '100%',
  },
  boardSubTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  subTabGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  subTabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  subTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#0F172A',
  },
  createPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#01b854',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  createPostBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  boardCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  boardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginBottom: 12,
  },
  roleTagText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '600',
  },
  boardMessage: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 16,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#01b854',
  },
  contactBtnText: {
    color: '#01b854',
    fontWeight: '700',
    fontSize: 14,
  },
  // ── MODAL ───────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16,
  },
  modalTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitPostBtn: {
    backgroundColor: '#01b854',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitPostBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
