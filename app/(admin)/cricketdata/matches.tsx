import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Plus, RefreshCcw, Search, Filter, Calendar } from 'lucide-react-native';
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
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    fetchMatches();
  }, []);

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

    return filtered;
  }, [matches, activeTab, selectedDate]);

  const content = (
    <CricketSubbar>
      <View style={styles.container}>
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

            {isWeb && (
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
            )}
          </ScrollView>

          <Button 
            title="Start New Match" 
            icon={Plus} 
            onPress={() => router.push('/cricket/scoring')}
            size="small"
            style={styles.compactBtn}
          />
        </View>

        {isWeb && (
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
        )}

        <FlatList
          data={filteredMatches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchMatches} color="#10b981" />
          }
          renderItem={({ item }) => {
            if (isWeb) {
               const liveData = item.match_live_state;
               const scoreText = liveData ? `${liveData.runs}/${liveData.wickets} (${liveData.overs})` : '—';
               
               return (
                 <TouchableOpacity 
                   style={styles.tableRow}
                   onPress={() => router.push(`/live/${item.id}`)}
                 >
                   <View style={[styles.tableCell, styles.colDate]}>
                     <Text style={styles.cellMainText}>{new Date(item.created_at).toLocaleDateString()}</Text>
                     <Text style={styles.cellSubText}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                   </View>

                   <View style={[styles.tableCell, styles.colTeams]}>
                     <Text style={styles.teamName}>{item.team_a}</Text>
                     <Text style={styles.vsText}>vs</Text>
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
                     <View style={[
                       styles.statusBadge,
                       item.status === 'live' ? styles.statusLive : (item.status === 'completed' ? styles.statusResult : styles.statusUpcoming)
                     ]}>
                       <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                     </View>
                   </View>

                   <View style={[styles.tableCell, styles.colActions]}>
                      <TouchableOpacity 
                        style={styles.actionBtn}
                        onPress={() => router.push(`/live/${item.id}`)}
                      >
                         <Text style={styles.actionBtnText}>Match Hub</Text>
                         <ChevronRight size={14} color="#10b981" />
                      </TouchableOpacity>
                   </View>
                 </TouchableOpacity>
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
                <Text style={styles.mobileVenue}>{item.venue || 'No Venue'}</Text>
                <TouchableOpacity 
                  style={styles.mobileAction}
                  onPress={() => router.push(`/live/${item.id}`)}
                >
                  <Text style={styles.mobileActionText}>View Details</Text>
                  <ChevronRight size={16} color="#10b981" />
                </TouchableOpacity>
              </Card>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No matches found</Text>
            </View>
          }
        />
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
    backgroundColor: Platform.OS === 'web' ? '#F5F5F5' : '#F9FAFB',
  },
  headerCompact: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#10b981',
    borderWidth: 1.5,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabChipTextActive: {
    color: '#10b981',
  },
  tableHeaderContainer: {
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    padding: 24,
    paddingTop: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    // shadow
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
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
  colStatus: { width: 120 },
  colActions: { width: 120 },
  
  cellMainText: { fontSize: 13, fontWeight: '700', color: '#111827' },
  cellSubText: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  
  teamName: { fontSize: 14, fontWeight: '800', color: '#111827' },
  vsText: { fontSize: 10, color: '#9CA3AF', marginVertical: 1, textTransform: 'uppercase', fontWeight: '900' },
  
  scoreText: { fontSize: 14, fontWeight: '900', color: '#111827' },
  liveIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignItems: 'center' },
  statusLive: { backgroundColor: '#FEF2F2', color: '#ef4444' },
  statusResult: { backgroundColor: '#F3F4F6', color: '#374151' },
  statusUpcoming: { backgroundColor: '#EFF6FF', color: '#2563eb' },
  statusText: { fontSize: 10, fontWeight: '800' },

  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtnText: { fontSize: 12, fontWeight: '800', color: '#10b981' },

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
});
