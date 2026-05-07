import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Platform, 
  ActivityIndicator, 
  FlatList, 
  RefreshControl,
  Modal,
  Pressable,
  TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ChevronRight, 
  Plus, 
  RefreshCcw, 
  Search, 
  Filter, 
  Calendar,
  MoreVertical,
  Flag,
  CheckCircle2,
  X
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import CricketSubbar from '@/components/admin/CricketSubbar';
import WebLayout from '@/components/web/WebLayout';

export default function AdminCricketMatches() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    fetchMatches();
  }, []);

  const endMatch = async (id: string) => {
    const confirmed = Platform.OS === 'web' 
      ? window.confirm('Are you sure you want to end this match? This will set the status to completed.')
      : true; // Simple for mobile admin

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'completed' })
        .eq('id', id);

      if (error) throw error;
      fetchMatches();
    } catch (err) {
      console.error('Error ending match:', err);
      alert('Failed to end match');
    }
  };

  const toggleReviewStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ is_under_review: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchMatches();
    } catch (err) {
      console.error('Error toggling review status:', err);
      alert('Failed to update review status');
    }
  };

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          match_live_state (*),
          innings (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setMatches(data);
    } catch (err) {
      console.error('Error fetching admin matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = useMemo(() => {
    let filtered = matches;
    
    // 1. Tab Filter
    if (activeTab === 'live') filtered = filtered.filter(m => m.status === 'live');
    else if (activeTab === 'completed') filtered = filtered.filter(m => m.status === 'completed');
    else if (activeTab === 'upcoming') filtered = filtered.filter(m => m.status !== 'live' && m.status !== 'completed');

    // 2. Date Filter
    if (selectedDate) {
      filtered = filtered.filter(m => {
        const matchDate = new Date(m.created_at).toISOString().split('T')[0];
        return matchDate === selectedDate;
      });
    }

    // 3. Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.team_a.toLowerCase().includes(q) || 
        m.team_b.toLowerCase().includes(q) ||
        (m.venue && m.venue.toLowerCase().includes(q)) ||
        m.id.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [matches, activeTab, selectedDate, searchQuery]);

  const content = (
    <CricketSubbar>
      <View style={styles.container}>


        {isWeb ? (
          <View style={styles.tableWrapper}>
            <FlatList
              data={[
                { type: 'filters' },
                { type: 'header' },
                ...filteredMatches.map(m => ({ ...m, type: 'match' }))
              ]}
              keyExtractor={(item, index) => item.id || `extra-${index}`}
              contentContainerStyle={styles.tableBody}
              stickyHeaderIndices={[1]}
              refreshControl={
                <RefreshControl refreshing={loading} onRefresh={fetchMatches} color="#10b981" />
              }
              renderItem={({ item }) => {
                if (item.type === 'filters') {
                  return (
                    <View style={styles.headerCompact}>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.tabRow}
                        style={styles.tabScrollWrapCompact}
                      >
                        <TouchableOpacity
                          onPress={() => setActiveTab('all')}
                          style={[styles.tabChip, activeTab === 'all' && styles.tabChipActive]}
                        >
                          <Text style={[styles.tabChipText, activeTab === 'all' && styles.tabChipTextActive]}>
                            All Match ({matches.length})
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setActiveTab('live')}
                          style={[styles.tabChip, activeTab === 'live' && styles.tabChipActive]}
                        >
                          <Text style={[styles.tabChipText, activeTab === 'live' && styles.tabChipTextActive]}>
                            Live ({matches.filter(m => m.status === 'live').length})
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setActiveTab('upcoming')}
                          style={[styles.tabChip, activeTab === 'upcoming' && styles.tabChipActive]}
                        >
                          <Text style={[styles.tabChipText, activeTab === 'upcoming' && styles.tabChipTextActive]}>
                            Upcoming ({matches.filter(m => m.status !== 'live' && m.status !== 'completed').length})
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setActiveTab('completed')}
                          style={[styles.tabChip, activeTab === 'completed' && styles.tabChipActive]}
                        >
                          <Text style={[styles.tabChipText, activeTab === 'completed' && styles.tabChipTextActive]}>
                            Completed ({matches.filter(m => m.status === 'completed').length})
                          </Text>
                        </TouchableOpacity>

                        <View style={styles.dateFilterWrap}>
                          <View 
                            style={[
                              styles.tabChip, 
                              selectedDate && styles.tabChipActive,
                              { paddingRight: selectedDate ? 32 : 12, position: 'relative' }
                            ]}
                          >
                            <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Calendar 
                                size={14} 
                                color={selectedDate ? '#10b981' : '#6B7280'} 
                              />
                              <Text 
                                style={[
                                  styles.tabChipText, 
                                  selectedDate && styles.tabChipTextActive
                                ]}
                              >
                                {selectedDate ? selectedDate : 'Filter by Date'}
                              </Text>
                            </View>
                            
                            <input
                                type="date"
                                value={selectedDate ?? ''}
                                onChange={(e: any) =>
                                  setSelectedDate(e.target.value ? e.target.value : null)
                                }
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  opacity: 0,
                                  cursor: 'pointer',
                                  width: '100%',
                                  zIndex: 10,
                                  borderWidth: 0,
                                  display: 'block',
                                }}
                            />
                          </View>
                          
                          {selectedDate && (
                            <TouchableOpacity 
                              onPress={() => setSelectedDate(null)}
                              style={styles.dateClearBtn}
                            >
                              <RefreshCcw size={12} color="#6B7280" />
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={styles.searchWrap}>
                          <Search size={14} color="#6B7280" style={styles.searchIcon} />
                          <TextInput
                            placeholder="Search by team or venue..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={styles.searchInput}
                            placeholderTextColor="#9CA3AF"
                          />
                          {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearch}>
                              <X size={14} color="#9CA3AF" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </ScrollView>

                      <Button 
                        title="Start New Match" 
                        icon={Plus} 
                        onPress={() => router.push('/cricket/scoring')}
                        size="small"
                        style={styles.compactBtn}
                      />
                    </View>
                  );
                }

                if (item.type === 'header') {
                  return (
                    <View style={styles.tableHeaderContainer}>
                      <View style={styles.tableHeaderRow}>
                        <Text style={[styles.tableHeaderCell, styles.colDate]}>Date / Time</Text>
                        <Text style={[styles.tableHeaderCell, styles.colTeams]}>Teams</Text>
                        <Text style={[styles.tableHeaderCell, styles.colVenue]}>Venue</Text>
                        <Text style={[styles.tableHeaderCell, styles.colScore]}>Live Score</Text>
                        <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
                        <Text style={[styles.tableHeaderCell, styles.colActions]}>Actions</Text>
                      </View>
                    </View>
                  );
                }

                const liveData = item.match_live_state;
                const scoreText = liveData ? `${liveData.runs}/${liveData.wickets} (${liveData.overs || 0})` : '—';
                
                return (
                  <View style={[
                    styles.tableRow, 
                    openMenuId === item.id && { zIndex: 10000, position: 'relative' }
                  ]}>
                    <View style={[styles.tableCell, styles.colDate]}>
                      <Text style={styles.cellMainText}>{new Date(item.created_at).toLocaleDateString()}</Text>
                      <Text style={styles.cellSubText}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
 
                    <View style={[styles.tableCell, styles.colTeams]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.teamName}>{item.team_a}</Text>
                        <Text style={styles.vsText}>vs</Text>
                      </View>
                      <Text style={styles.teamName}>{item.team_b}</Text>
                    </View>
 
                    <View style={[styles.tableCell, styles.colVenue]}>
                      <Text style={styles.cellMainText}>{item.venue || 'TBD'}</Text>
                      <Text style={styles.cellSubText}>{item.overs_limit ? `${item.overs_limit} Overs` : 'Standard'}</Text>
                    </View>
 
                    <View style={[styles.tableCell, styles.colScore]}>
                      <Text style={styles.scoreText}>{scoreText}</Text>
                      {item.status === 'live' && <View style={styles.liveIndicator} />}
                    </View>
 
                    <View style={[styles.tableCell, styles.colStatus]}>
                       <View style={{ gap: 4 }}>
                         <View style={[
                           styles.statusBadge,
                           item.status === 'live' ? styles.statusLive : (item.status === 'completed' ? styles.statusResult : styles.statusUpcoming)
                         ]}>
                           <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                         </View>
                         <Text style={styles.matchIdText}>ID: {item.id.slice(0, 8).toUpperCase()}</Text>
                         {item.is_under_review && (
                           <View style={[styles.statusBadge, styles.statusReview]}>
                             <Text style={styles.statusText}>UNDER REVIEW</Text>
                           </View>
                         )}
                       </View>
                     </View>
 
                    <View style={[styles.tableCell, styles.colActions]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative' }}>
                          <TouchableOpacity 
                            style={styles.actionBtnRow}
                            onPress={() => router.push(`/live/${item.id}`)}
                          >
                             <Text style={styles.actionBtnText}>Match Hub</Text>
                             <ChevronRight size={14} color="#10b981" />
                          </TouchableOpacity>
 
                          <View style={{ position: 'relative' }}>
                            <TouchableOpacity 
                              style={styles.manageBtn}
                              onPress={() => setOpenMenuId(item.id)}
                            >
                              <Text style={styles.manageBtnText}>Manage</Text>
                              <ChevronRight size={12} color="#6B7280" style={{ transform: [{ rotate: '90deg' }] }} />
                            </TouchableOpacity>
                          </View>
                        </View>
                     </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No matches found</Text>
                </View>
              }
            />
          </View>
        ) : (
          <FlatList
            data={[
              { type: 'filters' },
              ...filteredMatches.map(m => ({ ...m, type: 'match' }))
            ]}
            keyExtractor={(item, index) => item.id || `extra-mobile-${index}`}
            contentContainerStyle={styles.mobileList}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={fetchMatches} color="#10b981" />
            }
            renderItem={({ item }) => {
              if (item.type === 'filters') {
                return (
                  <View style={[styles.headerCompact, { paddingHorizontal: 16 }]}>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false} 
                      contentContainerStyle={styles.tabRow}
                      style={styles.tabScrollWrapCompact}
                    >
                      <TouchableOpacity
                        onPress={() => setActiveTab('all')}
                        style={[styles.tabChip, activeTab === 'all' && styles.tabChipActive]}
                      >
                        <Text style={[styles.tabChipText, activeTab === 'all' && styles.tabChipTextActive]}>
                          All ({matches.length})
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setActiveTab('live')}
                        style={[styles.tabChip, activeTab === 'live' && styles.tabChipActive]}
                      >
                        <Text style={[styles.tabChipText, activeTab === 'live' && styles.tabChipTextActive]}>
                          Live ({matches.filter(m => m.status === 'live').length})
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setActiveTab('upcoming')}
                        style={[styles.tabChip, activeTab === 'upcoming' && styles.tabChipActive]}
                      >
                        <Text style={[styles.tabChipText, activeTab === 'upcoming' && styles.tabChipTextActive]}>
                          Upcoming ({matches.filter(m => m.status !== 'live' && m.status !== 'completed').length})
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setActiveTab('completed')}
                        style={[styles.tabChip, activeTab === 'completed' && styles.tabChipActive]}
                      >
                        <Text style={[styles.tabChipText, activeTab === 'completed' && styles.tabChipTextActive]}>
                          Completed ({matches.filter(m => m.status === 'completed').length})
                        </Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                );
              }

              return (
                <Card style={styles.mobileCard}>
                  <View style={styles.mobileCardHeader}>
                    <Text style={styles.mobileDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    <View style={[
                      styles.statusBadge,
                      item.status === 'live' ? styles.statusLive : (item.status === 'completed' ? styles.statusResult : styles.statusUpcoming)
                    ]}>
                      <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.mobileTeams}>
                    <Text style={styles.mobileTeamName}>{item.team_a} vs {item.team_b}</Text>
                  </View>
                  {item.is_under_review && (
                    <View style={[styles.statusBadge, styles.statusReview, { alignSelf: 'flex-start', marginBottom: 8 }]}>
                      <Text style={styles.statusText}>UNDER REVIEW</Text>
                    </View>
                  )}
                  <Text style={styles.mobileVenue}>{item.venue || 'No Venue'}</Text>
                  <TouchableOpacity 
                    style={styles.mobileAction}
                    onPress={() => router.push(`/live/${item.id}`)}
                  >
                    <Text style={styles.mobileActionText}>View Details</Text>
                    <ChevronRight size={16} color="#10b981" />
                  </TouchableOpacity>

                  {item.status === 'live' && (
                    <TouchableOpacity 
                      style={[styles.mobileAction, { marginTop: 12, justifyContent: 'center', backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8 }]}
                      onPress={() => endMatch(item.id)}
                    >
                      <Text style={[styles.mobileActionText, { color: '#ef4444' }]}>End Match</Text>
                    </TouchableOpacity>
                  )}
                </Card>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No matches found</Text>
              </View>
            }
          />
        )}
        {/* Action Modal */}
        <Modal
          visible={!!openMenuId}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setOpenMenuId(null)}
        >
          <Pressable 
            style={styles.modalOverlay} 
            onPress={() => setOpenMenuId(null)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Manage Match</Text>
                <TouchableOpacity onPress={() => setOpenMenuId(null)}>
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {matches.find(m => m.id === openMenuId) && (
                <View style={styles.modalBody}>
                  <TouchableOpacity 
                    style={styles.modalActionItem}
                    onPress={() => {
                      const match = matches.find(m => m.id === openMenuId);
                      toggleReviewStatus(match.id, match.is_under_review);
                      setOpenMenuId(null);
                    }}
                  >
                    <View style={[styles.modalActionIcon, { backgroundColor: '#FFF7ED' }]}>
                      <Flag size={18} color="#EA580C" />
                    </View>
                    <View>
                      <Text style={styles.modalActionTitle}>
                        {matches.find(m => m.id === openMenuId)?.is_under_review ? 'Remove Review' : 'Put Under Review'}
                      </Text>
                      <Text style={styles.modalActionSub}>Mark match for moderation review</Text>
                    </View>
                  </TouchableOpacity>

                  {matches.find(m => m.id === openMenuId)?.status === 'live' && (
                    <TouchableOpacity 
                      style={styles.modalActionItem}
                      onPress={() => {
                        endMatch(openMenuId!);
                        setOpenMenuId(null);
                      }}
                    >
                      <View style={[styles.modalActionIcon, { backgroundColor: '#FEF2F2' }]}>
                        <CheckCircle2 size={18} color="#ef4444" />
                      </View>
                      <View>
                        <Text style={[styles.modalActionTitle, { color: '#ef4444' }]}>End Match</Text>
                        <Text style={styles.modalActionSub}>Finalize match and stop live scoring</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </Pressable>
        </Modal>
      </View>
    </CricketSubbar>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerCompact: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabScrollWrapCompact: {
    flex: 1,
    marginRight: 16,
  },
  compactBtn: {
    minWidth: 140,
    borderRadius: 16,
  },
  dateFilterWrap: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateClearBtn: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    marginLeft: 8,
    width: 240,
    height: 32,
    borderRadius: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#111827',
    fontFamily: 'Inter',
    outlineStyle: 'none' as any,
  },
  clearSearch: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  tabScrollWrap: {
    marginTop: 8,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#10b981',
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabChipTextActive: {
    color: '#10b981',
  },
  tableWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'visible',
  },
  tableHeaderContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableBody: {
    padding: 0,
    overflow: 'visible',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    // shadow
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
      }
    })
  },
  tableCell: {
    paddingRight: 12,
  },
  colDate: { width: 120 },
  colTeams: { flex: 1.5 },
  colVenue: { flex: 1.2 },
  colScore: { width: 140, flexDirection: 'row', alignItems: 'center', gap: 8 },
  colStatus: { width: 140 },
  colActions: { width: 240, zIndex: 10001 },
  
  cellMainText: { fontSize: 11.5, fontWeight: '600', color: '#111827', fontFamily: 'Inter' },
  cellSubText: { fontSize: 9.5, color: '#9CA3AF', marginTop: 1, fontFamily: 'Inter' },
  
  actionBtnRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4,
    marginRight: 16,
  },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: '#10b981', fontFamily: 'Inter' },
  
  teamName: { fontSize: 11.5, fontWeight: '600', color: '#111827' },
  vsText: { fontSize: 8.5, color: '#9CA3AF', marginVertical: 1, textTransform: 'uppercase', fontWeight: '800' },
  
  scoreText: { fontSize: 11.5, fontWeight: '700', color: '#111827' },
  liveIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, alignItems: 'center' },
  statusLive: { backgroundColor: '#FEF2F2', color: '#ef4444' },
  statusResult: { backgroundColor: '#F3F4F6', color: '#374151' },
  statusUpcoming: { backgroundColor: '#EFF6FF', color: '#2563eb' },
  statusText: { fontSize: 9.5, fontWeight: '700', fontFamily: 'Inter' },

  matchIdText: {
    fontSize: 9,
    color: '#9CA3AF',
    fontFamily: 'Inter',
    marginTop: 4,
    textAlign: 'center',
  },

  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  manageBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    fontFamily: 'Inter',
  },
  dropdownMenu: {
    position: 'absolute' as any,
    top: 25,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 99999,
    minWidth: 180,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: {
        transition: 'background-color 0.2s',
      }
    })
  },
  dropdownItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Inter',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }
    })
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  modalBody: {
    padding: 12,
  },
  modalActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: {
        transition: 'background-color 0.2s',
      }
    })
  },
  modalActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },
  modalActionSub: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  
  reviewBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 0, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  reviewBtnActive: { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' },
  reviewBtnText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  reviewBtnTextActive: { color: '#EA580C' },

  endBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 0, borderWidth: 1, borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' },
  endBtnText: { fontSize: 11, fontWeight: '700', color: '#ef4444' },

  emptyContainer: { padding: 80, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#9CA3AF' },

  mobileCard: { padding: 16, marginBottom: 12 },
  mobileCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  mobileDate: { fontSize: 12, color: '#6B7280' },
  mobileTeams: { marginBottom: 4 },
  mobileTeamName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  mobileVenue: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
  mobileAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  mobileActionText: { fontSize: 14, fontWeight: '700', color: '#10b981' },
  mobileList: {
    padding: 16,
    paddingTop: 8,
  },
});
