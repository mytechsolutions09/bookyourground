import React, { useState, useEffect, useCallback } from 'react';
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
import { Search, User, Users, Shield, RefreshCw, Sliders, MapPin, ChevronRight, ClipboardList, MessageCircle, Plus, X, ChevronDown, Swords } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import WebLayout from '@/components/web/WebLayout';
import SiteFooter from '@/components/web/SiteFooter';

export default function CricketHubScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isMobile = width < 768;
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'board'>('board');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const channelName = `cricket_index_messages_count_${Math.random().toString(36).substring(7)}`;
      const subscription = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, () => {
          fetchUnreadCount();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchUnreadCount();
      }
    }, [user])
  );

  const fetchUnreadCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('direct_messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .neq('sender_id', user.id);
      
    setUnreadCount(count || 0);
  };

  // Notice Board State
  const [boardSubTab, setBoardSubTab] = useState<'players_needed' | 'teams_needed'>('players_needed');
  const [playerRequests, setPlayerRequests] = useState<any[]>([]);
  const [teamRequests, setTeamRequests] = useState<any[]>([]);
  const [isPostModalVisible, setIsPostModalVisible] = useState(false);
  const [postName, setPostName] = useState('');
  const [postRole, setPostRole] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [postCity, setPostCity] = useState('');
  const [postMessage, setPostMessage] = useState('');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [isFilterCityOpen, setIsFilterCityOpen] = useState(false);
  const [isFilterRoleOpen, setIsFilterRoleOpen] = useState(false);

  const BATSMAN = ['Top-order Batsman', 'Middle-order Batsman', 'Opening Batsman'];
  const BOWLER = ['Right-arm Fast', 'Right-arm Medium', 'Spin Bowler', 'Left-arm Spinner'];
  const WK = ['Wicket-keeper'];
  const ALL_ROUNDER = ['All-rounder'];
  const CRICKET_ROLES = [...BATSMAN, ...WK, ...BOWLER, ...ALL_ROUNDER];
  const CITIES = ['Gurugram', 'New Delhi', 'Noida', 'Faridabad', 'Ghaziabad', 'Other'];

  const handleRoleToggle = (role: string) => {
    let newRoles = [...selectedRoles];
    if (newRoles.includes(role)) {
      newRoles = newRoles.filter(r => r !== role);
    } else {
      const isBatsman = BATSMAN.includes(role);
      const isBowler = BOWLER.includes(role);
      const isWk = WK.includes(role);
      const isAllRounder = ALL_ROUNDER.includes(role);

      if (isAllRounder) {
        newRoles = [role];
      } else {
        newRoles = newRoles.filter(r => !ALL_ROUNDER.includes(r));
        if (isBatsman) {
          newRoles = newRoles.filter(r => !BATSMAN.includes(r));
        }
        if (isBowler) {
          newRoles = newRoles.filter(r => !BOWLER.includes(r) && !WK.includes(r));
        }
        if (isWk) {
          newRoles = newRoles.filter(r => !WK.includes(r) && !BOWLER.includes(r));
        }
        newRoles.push(role);
      }
    }
    setSelectedRoles(newRoles);
    setPostRole(newRoles.join(', '));
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('notice_board_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && !error) {
      setPlayerRequests(data.filter(p => p.post_type === 'players_needed'));
      setTeamRequests(data.filter(p => p.post_type === 'teams_needed'));
    }
  };

  const handleCreatePost = async () => {
    if (!postName || !postRole || !postCity || !postMessage) {
      alert('Please fill in all fields to create your post.');
      return;
    }
    
    setIsSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    const newPost = {
      post_type: boardSubTab,
      creator_id: session?.user?.id || null,
      name: postName,
      role: postRole,
      city: postCity,
      message: postMessage,
    };

    const { data, error } = await supabase
      .from('notice_board_posts')
      .insert(newPost)
      .select()
      .single();

    if (data && !error) {
      if (boardSubTab === 'players_needed') {
        setPlayerRequests([data, ...playerRequests]);
      } else {
        setTeamRequests([data, ...teamRequests]);
      }
      setIsPostModalVisible(false);
      setPostName('');
      setPostRole('');
      setSelectedRoles([]);
      setPostCity('');
      setPostMessage('');
    } else {
      console.error('Error creating post', error);
      alert('Error creating post. Make sure you are logged in.');
    }
    setIsSubmitting(false);
  };

  const handleMessagePress = async (creatorId: string, postContext?: string) => {
    if (!user) {
      alert("Please log in to message users.");
      return;
    }
    if (user.id === creatorId) {
      alert("You cannot message yourself.");
      return;
    }

    const p1 = user.id < creatorId ? user.id : creatorId;
    const p2 = user.id < creatorId ? creatorId : user.id;

    let targetChatId = null;

    const { data, error } = await supabase
      .from('direct_chats')
      .select('id')
      .eq('participant_1', p1)
      .eq('participant_2', p2)
      .maybeSingle();

    if (data && !error) {
      targetChatId = data.id;
    } else {
      const { data: newChat, error: createError } = await supabase
        .from('direct_chats')
        .insert({
          participant_1: p1,
          participant_2: p2,
        })
        .select()
        .single();

      if (newChat && !createError) {
        targetChatId = newChat.id;
      } else {
        console.error("Error creating chat", createError);
        alert("Failed to start conversation.");
        return;
      }
    }

    if (targetChatId) {
      if (postContext) {
        router.push(`/chat/${targetChatId}?prefill=${encodeURIComponent(postContext)}`);
      } else {
        router.push(`/chat/${targetChatId}`);
      }
    }
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
    const initials = item.name ? item.name[0] : 'U';
    
    const timeDisplay = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Just now';

    return (
      <View style={styles.boardCard}>
        <View style={styles.boardHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{initials}</Text>
            </View>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <View style={styles.locationRow}>
              <MapPin size={12} color="#01b854" style={{ marginRight: 4 }} />
              <Text style={styles.locationText}>{item.city}</Text>
              <Text style={styles.timeText}> • {timeDisplay}</Text>
            </View>
          </View>
        </View>
        <View style={styles.roleTagsContainer}>
          {item.role.split(',').map((roleItem: string, index: number) => (
            <View key={index} style={styles.roleTag}>
              <Text style={styles.roleTagText}>{roleItem.trim()}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.boardMessage}>{item.message}</Text>
        <TouchableOpacity 
          style={styles.contactBtn} 
          onPress={() => {
            if (item.creator_id) {
              const postContext = `Hi, I am reaching out regarding your post for ${item.role} in ${item.city}.`;
              handleMessagePress(item.creator_id, postContext);
            } else {
              alert("This post doesn't have a valid creator.");
            }
          }}
        >
          <MessageCircle size={18} color="#06392e" style={{ marginRight: 6 }} />
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
            <View style={[styles.leftTabs, isMobile && { flexDirection: 'row', width: '100%', gap: 8 }]}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'profile' && styles.tabButtonActive,
                  isMobile && { flex: 1, paddingHorizontal: 8 },
                ]}
                onPress={() => setActiveTab('profile')}
              >
                <Shield size={16} color={activeTab === 'profile' ? '#00ea6b' : '#64748B'} style={styles.tabIcon} />
                <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive, isMobile && { fontSize: 13 }]} numberOfLines={1}>
                  Player Profile
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  isMobile && { flex: 1, paddingHorizontal: 8 },
                ]}
                onPress={() => router.push('/find-an-opponent')}
              >
                <Swords size={16} color="#64748B" style={styles.tabIcon} />
                <Text style={[styles.tabText, isMobile && { fontSize: 13 }]} numberOfLines={1}>
                  Find Opposition
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  isMobile && { width: 44, paddingHorizontal: 0, justifyContent: 'center' },
                ]}
                onPress={() => router.push('/cricket/inbox')}
              >
                <View>
                  <MessageCircle size={20} color="#64748B" />
                  {unreadCount > 0 && (
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {activeTab === 'board' && (
              <View style={[styles.rightActions, isMobile && { width: '100%', flexWrap: 'nowrap', gap: 8 }]}>
                <View style={[styles.subTabGroup, isMobile && { flex: 1 }]}>
                  <TouchableOpacity
                    style={[styles.subTabBtn, boardSubTab === 'players_needed' && styles.subTabBtnActive, isMobile && { flex: 1, alignItems: 'center' }]}
                    onPress={() => setBoardSubTab('players_needed')}
                  >
                    <Text style={[styles.subTabText, boardSubTab === 'players_needed' && styles.subTabTextActive]} numberOfLines={1}>
                      {isMobile ? 'Find Players' : 'Teams looking for Players'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.subTabBtn, boardSubTab === 'teams_needed' && styles.subTabBtnActive, isMobile && { flex: 1, alignItems: 'center' }]}
                    onPress={() => setBoardSubTab('teams_needed')}
                  >
                    <Text style={[styles.subTabText, boardSubTab === 'teams_needed' && styles.subTabTextActive]} numberOfLines={1}>
                      {isMobile ? 'Find Teams' : 'Players looking for Teams'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  style={styles.createPostBtn} 
                  onPress={() => setIsPostModalVisible(true)}
                >
                  <Plus size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Main Content Area */}
          {activeTab === 'board' && (() => {
            const currentPosts = boardSubTab === 'players_needed' ? playerRequests : teamRequests;
            const displayedPosts = currentPosts.filter(post => {
              if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesName = post.name?.toLowerCase().includes(query);
                const matchesMessage = post.message?.toLowerCase().includes(query);
                if (!matchesName && !matchesMessage) return false;
              }
              if (filterCity && post.city !== filterCity) return false;
              if (filterRole && post.role !== filterRole) return false;
              return true;
            });

            return (
            <View style={styles.boardContainer}>
              <View style={[styles.searchFilterContainer, { flexDirection: 'row', gap: 8, zIndex: 10, width: '100%' }]}>
                <View style={[styles.searchBar, { flex: 1.5, marginBottom: 0, minHeight: 44 }]}>
                  <Search size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                  <TextInput
                    style={[styles.searchInput, { outlineStyle: 'none' } as any]}
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                
                <View style={[styles.filtersRow, { flex: 1, gap: 8 }]}>
                  {/* Location Filter Dropdown */}
                  <View style={styles.filterDropdownContainer}>
                    <TouchableOpacity
                      style={[styles.modalInput, styles.dropdownInput, { marginBottom: 0, minHeight: 44, paddingHorizontal: 8, paddingVertical: 8 }]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setIsFilterCityOpen(!isFilterCityOpen);
                        setIsFilterRoleOpen(false);
                      }}
                    >
                      <MapPin size={14} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={[filterCity ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder, { flex: 1, fontSize: 12 }]}>
                        {filterCity || 'All Cities'}
                      </Text>
                      <ChevronDown size={14} color="#64748B" />
                    </TouchableOpacity>
                    {isFilterCityOpen && (
                      <View style={[styles.dropdownList, styles.filterDropdownList, { right: 0, minWidth: 160 }]}>
                        <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                          {['All Cities', ...CITIES].filter(c => c !== 'Other').map(city => (
                            <TouchableOpacity
                              key={city}
                              style={[styles.dropdownItem, filterCity === (city === 'All Cities' ? '' : city) && styles.dropdownItemActive]}
                              onPress={() => {
                                setFilterCity(city === 'All Cities' ? '' : city);
                                setIsFilterCityOpen(false);
                              }}
                            >
                              <Text style={[styles.dropdownItemText, filterCity === (city === 'All Cities' ? '' : city) && styles.dropdownItemTextActive]}>
                                {city}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Role Filter Dropdown */}
                  <View style={styles.filterDropdownContainer}>
                    <TouchableOpacity
                      style={[styles.modalInput, styles.dropdownInput, { marginBottom: 0, minHeight: 44, paddingHorizontal: 8, paddingVertical: 8 }]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setIsFilterRoleOpen(!isFilterRoleOpen);
                        setIsFilterCityOpen(false);
                      }}
                    >
                      <User size={14} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={[filterRole ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder, { flex: 1, fontSize: 12 }]}>
                        {filterRole || 'All Roles'}
                      </Text>
                      <ChevronDown size={14} color="#64748B" />
                    </TouchableOpacity>
                    {isFilterRoleOpen && (
                      <View style={[styles.dropdownList, styles.filterDropdownList, { right: 0, minWidth: 160 }]}>
                        <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                          {['All Roles', ...CRICKET_ROLES].map(role => (
                            <TouchableOpacity
                              key={role}
                              style={[styles.dropdownItem, filterRole === (role === 'All Roles' ? '' : role) && styles.dropdownItemActive]}
                              onPress={() => {
                                setFilterRole(role === 'All Roles' ? '' : role);
                                setIsFilterRoleOpen(false);
                              }}
                            >
                              <Text style={[styles.dropdownItemText, filterRole === (role === 'All Roles' ? '' : role) && styles.dropdownItemTextActive]}>
                                {role}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <FlatList
                data={displayedPosts}
                renderItem={renderBoardItem}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                numColumns={isMobile ? 1 : 2}
                key={isMobile ? 'v-board' : 'h-board'}
                columnWrapperStyle={(!isMobile && (boardSubTab === 'players_needed' ? playerRequests.length > 0 : teamRequests.length > 0)) ? { gap: 16 } : undefined}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <View style={styles.emptyStateContainer}>
                    <ClipboardList size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
                    <Text style={styles.emptyStateTitle}>No posts found</Text>
                    <Text style={styles.emptyStateSubtext}>Try adjusting your search or filters!</Text>
                  </View>
                }
              />
            </View>
            );
          })()}
        </View>

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
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{boardSubTab === 'players_needed' ? 'Team Name' : 'Your Name'}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={boardSubTab === 'players_needed' ? "e.g. Gurgaon Strikers" : "e.g. Rahul Kumar"}
                value={postName}
                onChangeText={setPostName}
              />

              <Text style={styles.inputLabel}>{boardSubTab === 'players_needed' ? 'Role Needed' : 'Your Specialization'}</Text>
              
              <View style={styles.rolesContainer}>
                {CRICKET_ROLES.map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleChip, selectedRoles.includes(role) && styles.roleChipActive]}
                    onPress={() => handleRoleToggle(role)}
                  >
                    <Text style={[styles.roleChipText, selectedRoles.includes(role) && styles.roleChipTextActive]}>{role}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder={boardSubTab === 'players_needed' ? "e.g. Top-order Batsman" : "e.g. Right-arm Fast"}
                value={postRole}
                onChangeText={(text) => {
                  setPostRole(text);
                  if (text === '') setSelectedRoles([]);
                }}
              />
              
              <Text style={styles.inputLabel}>City/Location</Text>
              <TouchableOpacity
                style={[styles.modalInput, styles.dropdownInput]}
                activeOpacity={0.7}
                onPress={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
              >
                <Text style={postCity ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder}>
                  {postCity || 'Select a city...'}
                </Text>
                <ChevronDown size={18} color="#64748B" />
              </TouchableOpacity>
              
              {isLocationDropdownOpen && (
                <View style={styles.dropdownList}>
                  {CITIES.map(city => (
                    <TouchableOpacity
                      key={city}
                      style={[styles.dropdownItem, postCity === city && styles.dropdownItemActive]}
                      onPress={() => {
                        setPostCity(city);
                        setIsLocationDropdownOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, postCity === city && styles.dropdownItemTextActive]}>
                        {city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>Message</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Add more details about what you're looking for..."
                value={postMessage}
                onChangeText={setPostMessage}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity style={styles.submitPostBtn} onPress={handleCreatePost} disabled={isSubmitting}>
                <Text style={styles.submitPostBtnText}>{isSubmitting ? 'Posting...' : 'Post Request'}</Text>
              </TouchableOpacity>
            </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 234, 107, 0.08)',
    paddingBottom: 16,
    marginBottom: 24,
    gap: 16,
    flexWrap: 'wrap',
  },
  tabBarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 16,
  },
  leftTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  rightActionsMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonActive: {
    backgroundColor: '#06392e',
    borderColor: '#06392e',
  },
  tabButtonMobile: {
    width: '100%',
  },
  tabIcon: {
    marginRight: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#00ea6b',
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
    ...Platform.select({
      web: {
        outlineColor: '#00ea6b',
      }
    })
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
    paddingBottom: 24,
  },
  searchFilterContainer: {
    marginBottom: 24,
    zIndex: 10,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
    zIndex: 20,
  },
  filterDropdownContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 20,
  },
  filterDropdownList: {
    position: 'absolute',
    top: '100%',
    marginTop: 4,
    zIndex: 50,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#0F172A',
  },
  chipsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  chipsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 32,
    paddingBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#06392e',
    borderColor: '#06392e',
  },
  filterChipText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#00ea6b',
    fontWeight: '800',
  },
  chipDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
    marginRight: 16,
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
    backgroundColor: '#06392e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00ea6b',
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
  badgeContainer: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
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
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  subTabBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  subTabBtnActive: {
    backgroundColor: '#06392e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#00ea6b',
  },
  createPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  createPostBtnText: {
    color: '#00ea6b',
    fontWeight: '500',
    fontSize: 14,
  },
  boardCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  boardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  roleTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  roleTag: {
    backgroundColor: '#06392e',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  roleTagText: {
    color: '#00ea6b',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  boardMessage: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
    marginBottom: 20,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#00ea6b',
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  contactBtnText: {
    color: '#06392e',
    fontWeight: '800',
    fontSize: 15,
  },
  // ── MODAL ───────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 57, 46, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#06392e',
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#06392e',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  roleChip: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  roleChipActive: {
    backgroundColor: '#06392e',
    borderColor: '#06392e',
  },
  roleChipText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  roleChipTextActive: {
    color: '#00ea6b',
    fontWeight: '800',
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
    ...Platform.select({
      web: {
        outlineColor: '#00ea6b',
      }
    })
  },
  modalTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dropdownInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownTextPlaceholder: {
    color: '#94A3B8',
    fontSize: 14,
  },
  dropdownTextSelected: {
    color: '#0F172A',
    fontSize: 14,
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#F8FAFC',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#334155',
  },
  dropdownItemTextActive: {
    color: '#06392e',
    fontWeight: '700',
  },
  submitPostBtn: {
    backgroundColor: '#00ea6b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitPostBtnText: {
    color: '#06392e',
    fontWeight: '800',
    fontSize: 16,
  },
});
