import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity, Platform, TextInput, useWindowDimensions } from 'react-native';
import { Search, X, Trash2, Calendar, MapPin, Tag, ClipboardList, User, Mail, Phone, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import CricketSubbar from '@/components/admin/CricketSubbar';
import { useAuth } from '@/contexts/AuthContext';

interface CreatorProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
}

interface NoticeBoardPost {
  id: string;
  post_type: 'players_needed' | 'teams_needed';
  creator_id: string;
  name: string;
  role: string;
  city: string;
  message: string;
  created_at: string;
  valid_until?: string;
  creator?: CreatorProfile | null;
}

export default function ManagePostsScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isSmallWeb = isWeb && width < 900;
  const isMobile = width < 768;

  const { user } = useAuth();
  const [posts, setPosts] = useState<NoticeBoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'players_needed' | 'teams_needed'>('all');
  const [cityFilter, setCityFilter] = useState<'all' | string>('all');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadPosts();
  }, [user]);

  const loadPosts = async () => {
    try {
      setErrorMessage(null);
      setLoading(true);

      // 1. Fetch Notice Board Posts
      const { data: postsData, error: postsError } = await supabase
        .from('notice_board_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // 2. Fetch Creator Profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone');

      if (profilesError) {
        console.warn('Could not fetch profiles for notice board posts:', profilesError);
      }

      // 3. Merge creator details into posts
      const merged = (postsData || []).map(post => ({
        ...post,
        creator: profilesData?.find(p => p.id === post.creator_id) || null
      }));

      setPosts(merged as NoticeBoardPost[]);
    } catch (error) {
      console.error('Error loading posts:', error);
      setErrorMessage('Failed to load posts. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (postId: string) => {
    const performDelete = async () => {
      try {
        setLoading(true);
        const { error } = await supabase
          .from('notice_board_posts')
          .delete()
          .eq('id', postId);

        if (error) throw error;

        if (Platform.OS !== 'web') Alert.alert('Success', 'Post deleted successfully');
        else alert('Post deleted successfully');

        loadPosts();
      } catch (error: any) {
        console.error('Deletion error:', error);
        if (Platform.OS === 'web') alert('Error: ' + error.message);
        else Alert.alert('Error', error.message);
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this notice board post? This action cannot be undone.')) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Delete Post',
        'Are you sure you want to delete this notice board post? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  // Extract unique cities for the city filter dropdown
  const uniqueCities = useMemo(() => {
    const cities = posts.map(p => p.city).filter(Boolean);
    return ['all', ...Array.from(new Set(cities))];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return posts.filter(p => {
      const name = p.name?.toLowerCase() || '';
      const role = p.role?.toLowerCase() || '';
      const city = p.city?.toLowerCase() || '';
      const message = p.message?.toLowerCase() || '';
      const creatorName = p.creator?.full_name?.toLowerCase() || '';
      const creatorEmail = p.creator?.email?.toLowerCase() || '';

      const matchesSearch = query === '' || 
             name.includes(query) || 
             role.includes(query) || 
             city.includes(query) || 
             message.includes(query) ||
             creatorName.includes(query) ||
             creatorEmail.includes(query);

      const matchesType = typeFilter === 'all' || p.post_type === typeFilter;
      const matchesCity = cityFilter === 'all' || p.city === cityFilter;

      return matchesSearch && matchesType && matchesCity;
    });
  }, [posts, searchQuery, typeFilter, cityFilter]);

  const FilterDropdown = ({ id, label, value, options, onSelect }: any) => {
    const isOpen = activeDropdown === id;
    const selectedLabel = options.find((o: any) => o.key === value)?.label || label;

    return (
      <View style={{ zIndex: isOpen ? 1000 : 1 }}>
        <TouchableOpacity
          style={[styles.dropdownTrigger, isOpen && styles.dropdownTriggerActive]}
          onPress={() => setActiveDropdown(isOpen ? null : id)}
        >
          <Text style={[styles.dropdownLabel, value !== 'all' && styles.dropdownLabelActive]}>{selectedLabel}</Text>
          <X size={14} color={value !== 'all' ? '#10b981' : '#6B7280'} style={{ transform: [{ rotate: '90deg' }] }} />
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.dropdownMenu}>
            {options.map((opt: any) => (
              <TouchableOpacity
                key={opt.key}
                style={styles.dropdownOption}
                onPress={() => {
                  onSelect(opt.key);
                  setActiveDropdown(null);
                }}
              >
                <Text style={[styles.dropdownOptionText, value === opt.key && styles.dropdownOptionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderWebPost = ({ item }: { item: NoticeBoardPost }) => {
    const isPlayersNeeded = item.post_type === 'players_needed';
    const initials = item.name ? item.name[0].toUpperCase() : 'U';

    return (
      <View key={item.id} style={styles.webRow}>
        <View style={[styles.cell, styles.colCreator]}>
          {item.creator ? (
            <View>
              <Text style={styles.creatorName}>{item.creator.full_name}</Text>
              <Text style={styles.creatorContact}>{item.creator.email}</Text>
              {item.creator.phone && <Text style={styles.creatorContact}>{item.creator.phone}</Text>}
            </View>
          ) : (
            <Text style={styles.anonymousText}>Anonymous User</Text>
          )}
        </View>

        <View style={[styles.cell, styles.colType]}>
          <View style={[styles.typeBadge, isPlayersNeeded ? styles.badgePlayers : styles.badgeTeams]}>
            <Text style={[styles.typeText, isPlayersNeeded ? styles.textPlayers : styles.textTeams]}>
              {isPlayersNeeded ? 'Players Needed' : 'Teams Needed'}
            </Text>
          </View>
        </View>

        <View style={[styles.cell, styles.colPostName]}>
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.postNameText}>{item.name}</Text>
            <View style={styles.cityRow}>
              <MapPin size={10} color="#9CA3AF" />
              <Text style={styles.cityText}>{item.city}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.cell, styles.colRole]}>
          <Text style={styles.roleText}>{item.role}</Text>
        </View>

        <View style={[styles.cell, styles.colMessage]}>
          <Text style={styles.messageText} numberOfLines={3}>{item.message}</Text>
        </View>

        <View style={[styles.cell, styles.colDates]}>
          <View style={styles.dateRow}>
            <Clock size={12} color="#9CA3AF" />
            <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
          {item.valid_until && (
            <View style={[styles.dateRow, { marginTop: 4 }]}>
              <Calendar size={12} color="#EF4444" />
              <Text style={[styles.dateText, { color: '#EF4444' }]}>Expires: {new Date(item.valid_until).toLocaleDateString()}</Text>
            </View>
          )}
        </View>

        <View style={[styles.cell, styles.colActions]}>
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={() => deletePost(item.id)}
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMobilePost = ({ item }: { item: NoticeBoardPost }) => {
    const isPlayersNeeded = item.post_type === 'players_needed';
    const initials = item.name ? item.name[0].toUpperCase() : 'U';

    return (
      <Card style={styles.mobileCard}>
        <View style={styles.mobileCardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.postNameText}>{item.name}</Text>
              <View style={styles.cityRow}>
                <MapPin size={10} color="#9CA3AF" />
                <Text style={styles.cityText}>{item.city}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.typeBadge, isPlayersNeeded ? styles.badgePlayers : styles.badgeTeams]}>
            <Text style={[styles.typeText, isPlayersNeeded ? styles.textPlayers : styles.textTeams]}>
              {isPlayersNeeded ? 'Player Needed' : 'Team Needed'}
            </Text>
          </View>
        </View>

        <View style={styles.mobileCardContent}>
          <View style={styles.roleTag}>
            <Tag size={12} color="#10B981" style={{ marginRight: 4 }} />
            <Text style={styles.roleTagText}>{item.role}</Text>
          </View>
          
          <Text style={styles.mobileMessageText}>{item.message}</Text>

          <View style={styles.divider} />

          <View style={styles.mobileCreatorBox}>
            <Text style={styles.mobileSectionTitle}>Posted By</Text>
            {item.creator ? (
              <View>
                <Text style={styles.mobileCreatorName}>{item.creator.full_name}</Text>
                <View style={styles.mobileCreatorContactRow}>
                  <Mail size={12} color="#6B7280" />
                  <Text style={styles.mobileCreatorContactText}>{item.creator.email}</Text>
                </View>
                {item.creator.phone && (
                  <View style={styles.mobileCreatorContactRow}>
                    <Phone size={12} color="#6B7280" />
                    <Text style={styles.mobileCreatorContactText}>{item.creator.phone}</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.anonymousText}>Anonymous User</Text>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.mobileCardFooter}>
            <View>
              <Text style={styles.mobileDateText}>Posted: {new Date(item.created_at).toLocaleDateString()}</Text>
              {item.valid_until && (
                <Text style={[styles.mobileDateText, { color: '#EF4444', marginTop: 2 }]}>
                  Expires: {new Date(item.valid_until).toLocaleDateString()}
                </Text>
              )}
            </View>
            <TouchableOpacity 
              style={styles.mobileDeleteBtn} 
              onPress={() => deletePost(item.id)}
            >
              <Trash2 size={16} color="#EF4444" />
              <Text style={styles.mobileDeleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  const content = (
    <CricketSubbar>
      <View style={styles.container}>
        {isWeb && (
          <View style={styles.headerArea}>
            <View style={[styles.headerFiltersRow, isSmallWeb && { flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={[styles.searchContainer, isSmallWeb && { maxWidth: '100%' }]}>
                <Search size={16} color="#6B7280" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search posts or creators..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                    <X size={14} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: isSmallWeb ? 8 : 0 }}>
                <FilterDropdown 
                  id="type" 
                  label="Post Type" 
                  value={typeFilter}
                  options={[
                    { key: 'all', label: 'All Post Types' },
                    { key: 'players_needed', label: 'Players Needed' },
                    { key: 'teams_needed', label: 'Teams Needed' },
                  ]}
                  onSelect={setTypeFilter}
                />

                <FilterDropdown 
                  id="city" 
                  label="City" 
                  value={cityFilter}
                  options={uniqueCities.map(city => ({
                    key: city,
                    label: city === 'all' ? 'All Cities' : city
                  }))}
                  onSelect={setCityFilter}
                />
              </View>
            </View>
          </View>
        )}

        {isWeb && !isSmallWeb && (
          <View style={styles.webTableHeader}>
            <Text style={[styles.headerLabel, styles.colCreator]}>Posted By</Text>
            <Text style={[styles.headerLabel, styles.colType]}>Post Type</Text>
            <Text style={[styles.headerLabel, styles.colPostName]}>Target Name & City</Text>
            <Text style={[styles.headerLabel, styles.colRole]}>Role / Specialization</Text>
            <Text style={[styles.headerLabel, styles.colMessage]}>Message</Text>
            <Text style={[styles.headerLabel, styles.colDates]}>Dates</Text>
            <Text style={[styles.headerLabel, styles.colActions, { textAlign: 'center' }]}>Action</Text>
          </View>
        )}

        {errorMessage && (
          <View style={styles.errorBanner}><Text style={styles.errorText}>{errorMessage}</Text></View>
        )}

        <FlatList
          data={filteredPosts}
          renderItem={(isWeb && !isSmallWeb) ? renderWebPost : renderMobilePost}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, (isMobile || isSmallWeb) && { padding: 16 }]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadPosts} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ClipboardList size={48} color="#E5E7EB" />
              <Text style={styles.emptyText}>{loading ? 'Fetching notice board...' : 'No posts found matching filters.'}</Text>
            </View>
          }
        />
      </View>
    </CricketSubbar>
  );

  return (
    <>
      {Platform.OS === 'web' ? (
        <WebLayout>{content}</WebLayout>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          <MobileAppNavbar title="MANAGE POSTS" titleColor="#10b981" />
          {content}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    zIndex: 10,
  },
  headerFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    maxWidth: 300,
    height: 36,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
    outlineStyle: 'none',
  } as any,
  clearButton: {
    padding: 2,
    marginLeft: 4,
  },
  dropdownTrigger: {
    height: 36,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownTriggerActive: {
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  dropdownLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  dropdownLabelActive: {
    color: '#065F46',
    fontWeight: '600',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    left: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 4,
    minWidth: 160,
  },
  dropdownOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  dropdownOptionText: {
    fontSize: 13,
    color: '#4B5563',
  },
  dropdownOptionTextActive: {
    color: '#10B981',
    fontWeight: '600',
    backgroundColor: '#E6F4EA',
  },
  list: {
    padding: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
  // Web Table Styles
  webTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'uppercase',
  },
  webRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cell: {
    justifyContent: 'center',
  },
  colCreator: { flex: 2 },
  colType: { flex: 1.5 },
  colPostName: { flex: 2.5, flexDirection: 'row', alignItems: 'center' },
  colRole: { flex: 2 },
  colMessage: { flex: 3 },
  colDates: { flex: 2 },
  colActions: { flex: 1, alignItems: 'center' },

  creatorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  creatorContact: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  anonymousText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  postNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  cityText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgePlayers: {
    backgroundColor: '#DBEAFE',
  },
  badgeTeams: {
    backgroundColor: '#FCE7F3',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textPlayers: {
    color: '#1D4ED8',
  },
  textTeams: {
    color: '#BE185D',
  },
  roleText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  messageText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  // Mobile Card Styles
  mobileCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mobileCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  mobileCardContent: {
    marginTop: 4,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 12,
  },
  roleTagText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
  mobileMessageText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  mobileCreatorBox: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
  },
  mobileSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  mobileCreatorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  mobileCreatorContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  mobileCreatorContactText: {
    fontSize: 12,
    color: '#4B5563',
  },
  mobileCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileDateText: {
    fontSize: 11,
    color: '#6B7280',
  },
  mobileDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  mobileDeleteBtnText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
});
