import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, TextInput, useWindowDimensions, Share, PanResponder, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, History, Calendar, Search, Radio, Trophy, Clock, Share2, Settings, ChevronLeft, Users } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useCricketScoring } from '@/hooks/useCricketScoring';
import { useAuth } from '@/contexts/AuthContext';

const CATEGORY_TABS = [
  { key: 'all',    label: 'All' },
  { key: 'played', label: 'Played' },
];

const STATUS_FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'live',     label: 'Live' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'result',   label: 'Result' },
];

const DATE_FILTERS = [
  { key: 'all_time',   label: 'All Time' },
  { key: 'today',      label: 'Today' },
  { key: 'this_week',  label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
];

interface CricketMatchesProps {
  playerId?: string;
  categoryFilter?: string;
  onCategoryChange?: (val: string) => void;
  statusFilter?: string;
  onStatusChange?: (val: string) => void;
}

const CricketMatches = React.memo(({ 
  playerId, 
  categoryFilter = 'all', 
  onCategoryChange,
  statusFilter,
  onStatusChange
}: CricketMatchesProps) => {
  const router = useRouter();
  const { session } = useAuth();
  const effectivePlayerId = playerId || session?.user?.id;
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 1024;
  
  const [status, setStatus] = useState(statusFilter || 'result');
  const [dateFilter, setDateFilter] = useState('all_time');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (statusFilter && statusFilter !== status) {
      setStatus(statusFilter);
    }
  }, [statusFilter]);
  const [fetchedMatches, setFetchedMatches] = useState<any[]>([]);
  const [userTeams, setUserTeams] = useState<string[]>([]);
  const [userPlayedMatches, setUserPlayedMatches] = useState<string[]>([]);
  useEffect(() => {
    fetchMatches();
    if (effectivePlayerId) {
       fetchUserCricketContext();
    }

    const channel = supabase
      .channel(`live-matches-list-${Math.random()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'match_live_state'
      }, () => { 
        fetchMatches(); 
        if (effectivePlayerId) fetchUserCricketContext();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [effectivePlayerId]);

  const fetchUserCricketContext = async () => {
    if (!effectivePlayerId) return;

    const { data: memberEntries } = await supabase
      .from('team_members')
      .select('id, team_id')
      .eq('profile_id', effectivePlayerId);

    const { data: ownedTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('owner_id', effectivePlayerId);

    const myProfileIds = memberEntries?.map(p => p.id).filter(id => !!id) || [];
    const myTeamIds = Array.from(new Set([
      ...(memberEntries?.map(m => m.team_id).filter(id => !!id) || []),
      ...(ownedTeams?.map(t => t.id).filter(id => !!id) || [])
    ]));

    if (myProfileIds.length > 0) {
      const { data: playedInXi } = await supabase
        .from('match_playing_xi')
        .select('match_id')
        .in('player_id', myProfileIds);
      
      if (playedInXi) {
        setUserPlayedMatches(playedInXi.map(pxi => pxi.match_id));
      }
    }

    setUserTeams(myTeamIds);
  };

  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select(`*, match_live_state (*), innings (*)`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const dbMatches = data.map(m => {
        const live = m.match_live_state;
        const secondInn = m.innings?.find((i: any) => i.innings_number === 2);
        const firstInn = m.innings?.find((i: any) => i.innings_number === 1);
        const oversLimit = Number(m.overs || 20) * 6;

        const dbCompleted = m.status === 'completed' || m.status === 'Result';
        const liveCompleted = live?.match_status === 'completed' || live?.match_status === 'Result';
        const mathCompleted =
          (secondInn && Number(secondInn.wickets) >= (Number(m.players || 11) - 1)) ||
          (secondInn && Number(secondInn.legal_balls) >= oversLimit) ||
          (secondInn && secondInn.target && secondInn.runs >= secondInn.target) ||
          (live?.innings_number === 2 && (Number(live.legal_balls) >= oversLimit || (live.target && live.runs >= live.target)));

        const isCompleted = dbCompleted || liveCompleted || !!mathCompleted;
        const isLive = !isCompleted && (m.status === 'live' || m.status === 'innings_break' || !!live);
        const status = isCompleted ? 'Result' : (isLive ? 'Live' : 'Upcoming');

        let matchResult = m.result_text || live?.result_text;
        let team1Score, team1Overs, team2Score, team2Overs;

        if (firstInn) {
          if (firstInn.batting_team === m.team_a) {
            team1Score = `${firstInn.runs}/${firstInn.wickets}`;
            team1Overs = `(${Math.floor(firstInn.legal_balls / 6)}.${firstInn.legal_balls % 6} Ov)`;
          } else if (firstInn.batting_team === m.team_b) {
            team2Score = `${firstInn.runs}/${firstInn.wickets}`;
            team2Overs = `(${Math.floor(firstInn.legal_balls / 6)}.${firstInn.legal_balls % 6} Ov)`;
          }
        }
        if (secondInn) {
          if (secondInn.batting_team === m.team_a) {
            team1Score = `${secondInn.runs}/${secondInn.wickets}`;
            team1Overs = `(${Math.floor(secondInn.legal_balls / 6)}.${secondInn.legal_balls % 6} Ov)`;
          } else if (secondInn.batting_team === m.team_b) {
            team2Score = `${secondInn.runs}/${secondInn.wickets}`;
            team2Overs = `(${Math.floor(secondInn.legal_balls / 6)}.${secondInn.legal_balls % 6} Ov)`;
          }
        }
        if (live) {
          const isTeamABatting = live.batting_team === m.team_a;
          const currentScore = `${live.runs}/${live.wickets}`;
          const currentOvers = `(${Math.floor(live.legal_balls / 6)}.${live.legal_balls % 6} Ov)`;
          if (isTeamABatting) { team1Score = currentScore; team1Overs = currentOvers; }
          else { team2Score = currentScore; team2Overs = currentOvers; }
        }

        const rawDate = new Date(m.created_at);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const formattedDate = `${rawDate.getDate()}-${months[rawDate.getMonth()]}-${rawDate.getFullYear().toString().slice(-2)}`;

        return {
          id: m.id,
          match_id: m.id,
          type: m.match_type || 'Limited Overs',
          tournament: 'Open Match',
          status,
          date: formattedDate,
          rawDate,
          location: m.venue || 'Unknown Grounds',
          team1: m.team_a,
          team2: m.team_b,
          team_a_id: m.team_a_id,
          team_b_id: m.team_b_id,
          team1Score,
          team1Overs,
          team2Score,
          team2Overs,
          result: matchResult,
          batting_team: live?.batting_team
        };
      });
      setFetchedMatches(dbMatches);
    }
  };

  const allMatches = useMemo(() => fetchedMatches, [fetchedMatches]);

  const filteredMatches = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return allMatches.filter(m => {
      if (categoryFilter === 'played') {
         if (!userPlayedMatches.includes(m.id)) {
            return false;
         }
      }

      if (status !== 'all') {
        if (status === 'live' && m.status !== 'Live') return false;
        if (status === 'upcoming' && m.status !== 'Upcoming') return false;
        if (status === 'result' && (m.status !== 'Result' && m.status !== 'completed')) return false;
      }

      const matchDate = m.rawDate ? new Date(m.rawDate) : null;
      if (matchDate) {
        if (dateFilter === 'today' && matchDate < startOfToday) return false;
        if (dateFilter === 'this_week' && matchDate < startOfWeek) return false;
        if (dateFilter === 'this_month' && matchDate < startOfMonth) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.team1?.toLowerCase().includes(q) ||
          m.team2?.toLowerCase().includes(q) ||
          m.location?.toLowerCase().includes(q) ||
          m.tournament?.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [allMatches, categoryFilter, status, userPlayedMatches, dateFilter, searchQuery]);

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const FilterDropdown = ({ 
    label, 
    value, 
    options, 
    onSelect, 
    id, 
    icon: Icon 
  }: { 
    label: string, 
    value: string, 
    options: any[], 
    onSelect: (val: string) => void, 
    id: string,
    icon: any 
  }) => {
    const isOpen = activeDropdown === id;
    const selectedLabel = options.find(o => o.key === value)?.label || label;
    
    return (
      <View style={{ flex: 1, position: 'relative', zIndex: isOpen ? 100 : 1 }}>
        <TouchableOpacity 
          style={[styles.dropdownTrigger, isOpen && styles.dropdownTriggerActive]}
          onPress={() => setActiveDropdown(isOpen ? null : id)}
        >
          <Text style={[styles.dropdownTriggerText, isOpen && styles.dropdownTriggerTextActive]} numberOfLines={1}>
            {selectedLabel}
          </Text>
          <ChevronRight 
            size={12} 
            color={isOpen ? "#01b854" : "#CBD5E1"} 
            style={{ marginLeft: 4, transform: [{ rotate: '90deg' }] }} 
          />
        </TouchableOpacity>

        {isOpen && (
          <>
            <TouchableOpacity 
              style={styles.dropdownOverlay} 
              activeOpacity={1} 
              onPress={() => setActiveDropdown(null)} 
            />
            <View style={[
              styles.dropdownMenu, 
              id === 'date' ? { right: 0 } : { left: 0 },
              { width: 140 }
            ]}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.dropdownOption, value === opt.key && styles.dropdownOptionActive]}
                  onPress={() => {
                    onSelect(opt.key);
                    setActiveDropdown(null);
                  }}
                >
                  <Text style={[styles.dropdownOptionText, value === opt.key && styles.dropdownOptionTextActive]}>
                    {opt.label}
                  </Text>
                  {value === opt.key && <View style={styles.dropdownOptionDot} />}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>
    );
  };

  const MatchCard = ({ match }: { match: any }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.matchCard, match.status === 'Live' && styles.matchCardLive]}
      onPress={() => {
        if (match.status === 'Live' || match.status === 'Result') {
          router.push(`/live/${match.match_id}`);
        }
      }}
    >
      <View style={styles.matchHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.matchType}>
            {match.type}, <Text style={styles.matchTournament}>{match.tournament}</Text>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            {match.status !== 'Upcoming' && <Text style={styles.matchMeta}>{match.date}</Text>}
            {match.status !== 'Upcoming' && match.location ? (
              <Text style={{ color: '#CBD5E1', fontSize: 10 }}>•</Text>
            ) : null}
            {match.location ? (
              <Text style={styles.matchMeta} numberOfLines={1}>{match.location}</Text>
            ) : null}
          </View>
        </View>
        <View style={[
          styles.statusBadge,
          match.status === 'Result' ? styles.statusBadgeResult :
          match.status === 'Live' ? styles.statusBadgeLive : styles.statusBadgeUpcoming
        ]}>
          {match.status === 'Live' && <View style={styles.pulseDot} />}
          <Text style={[
            styles.statusBadgeText,
            match.status === 'Result' ? styles.statusBadgeTextResult :
            match.status === 'Live' ? styles.statusBadgeTextLive : styles.statusBadgeTextUpcoming
          ]}>{match.status === 'Live' ? 'LIVE' : match.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.matchTeams}>
        <View style={styles.matchTeamRow}>
          <View style={styles.teamInfo}>
            <View style={[styles.miniAvatar, { backgroundColor: '#F1F5F9' }]}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748B' }}>{(match.team1 || '?')[0]}</Text>
            </View>
            <Text style={styles.teamNameText} numberOfLines={1}>{match.team1 || 'TBC'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {match.status === 'Live' && match.batting_team === match.team1 && <View style={styles.liveIndicatorDot} />}
            {match.team1Score && (
              <Text style={styles.teamScoreText}>{match.team1Score} <Text style={styles.teamOversText}>{match.team1Overs}</Text></Text>
            )}
          </View>
        </View>

        <View style={styles.matchTeamRow}>
          <View style={styles.teamInfo}>
            <View style={[styles.miniAvatar, { backgroundColor: '#F8FAFC' }]}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748B' }}>{(match.team2 || '?')[0]}</Text>
            </View>
            <Text style={styles.teamNameText} numberOfLines={1}>{match.team2 || 'TBC'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {match.status === 'Live' && match.batting_team === match.team2 && <View style={styles.liveIndicatorDot} />}
            {match.team2Score && (
              <Text style={styles.teamScoreText}>{match.team2Score} <Text style={styles.teamOversText}>{match.team2Overs}</Text></Text>
            )}
          </View>
        </View>
      </View>

      {match.status === 'Live' && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 }}>
          <TouchableOpacity
            style={[styles.liveActionBtn, { flex: 1, borderRadius: 10 }]}
            onPress={() => router.push(`/live/${match.match_id}`)}
          >
            <Text style={styles.liveActionBtnText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.liveActionBtn, { flex: 1.5, borderRadius: 10 }]}
            onPress={() => router.push(`/cricket/scoring?matchId=${match.match_id}`)}
          >
            <Text style={styles.liveActionBtnText}>Resume Scoring</Text>
          </TouchableOpacity>
        </View>
      )}
      {match.status === 'Result' && match.result && (
        <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.resultText}>{match.result}</Text>
          </View>
        </View>
      )}
      {match.status === 'Upcoming' && (
        <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '500' }}>Scheduled · {match.date}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, paddingHorizontal: 0 }}>
      {/* Search & Secondary Filters Row */}
      <View style={styles.topFiltersRow}>
        <View style={styles.searchBox}>
          <Search size={14} color="#94A3B8" />
          <TextInput
            style={styles.searchBoxInput}
            placeholder="Search matches..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={{ width: 120 }}>
          <FilterDropdown 
            id="date" 
            label="Date" 
            value={dateFilter} 
            options={DATE_FILTERS} 
            onSelect={setDateFilter} 
            icon={Calendar}
          />
        </View>
      </View>



      {/* Matches List */}
      <View style={styles.matchesList}>
        {filteredMatches.length === 0 ? (
          <View style={styles.emptyState}>
            <Radio size={40} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No matches found</Text>
            <Text style={styles.emptyDesc}>Try changing the filter or search term</Text>
          </View>
        ) : (
          filteredMatches.map(match => (
            <MatchCard key={match.id} match={match} />
          ))
        )}
      </View>
    </View>
  );
});

export default CricketMatches;

const styles = StyleSheet.create({
  statusToggleWrapper: {
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  toggleLabelActive: {
    color: '#01b854',
  },
  topFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12, // Added padding under subbar
    marginBottom: 16,
    zIndex: 110,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchBoxInput: {
    fontFamily: 'Inter',
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
    paddingVertical: 0,
  },


  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  dropdownTriggerActive: {
    borderColor: '#01b854',
    backgroundColor: 'rgba(216, 247, 157, 0.1)',
  },
  dropdownTriggerText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    flex: 1,
  },
  dropdownTriggerTextActive: {
    color: '#01b854',
    fontWeight: '700',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'transparent',
    zIndex: 90,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 100,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dropdownOptionActive: {
    backgroundColor: '#F8FAFC',
  },
  dropdownOptionText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  dropdownOptionTextActive: {
    color: '#043529',
    fontWeight: '700',
  },
  dropdownOptionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#01b854',
  },
  matchesList: {
    gap: 14,
    paddingBottom: 32,
    paddingHorizontal: 0,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  matchCardLive: {
    borderColor: '#E2E8F0',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  matchType: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchTournament: {
    fontFamily: 'Inter',
    color: '#64748B',
    fontWeight: '500',
  },
  matchMeta: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#94A3B8',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusBadgeLive: { backgroundColor: '#01b854' },
  statusBadgeResult: { backgroundColor: '#01b85480' },
  statusBadgeUpcoming: { backgroundColor: '#4f2c63' },
  statusBadgeText: { 
    fontFamily: 'Inter',
    fontSize: 9, 
    fontWeight: '700' 
  },
  statusBadgeTextLive: { color: '#FFFFFF' },
  statusBadgeTextResult: { color: '#FFFFFF' },
  statusBadgeTextUpcoming: { color: '#FFFFFF' },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  matchTeams: { gap: 6 },
  matchTeamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  miniAvatar: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  teamNameText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '400',
    color: '#1E293B',
    flex: 1,
  },
  teamScoreText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: '#06392e',
  },
  teamOversText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  liveIndicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#01b854',
  },
  liveActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  liveActionBtnText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#2a533a',
  },
  resultText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontStyle: 'italic',
    fontFamily: 'Inter',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
  },
  emptyDesc: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#CBD5E1',
    textAlign: 'center',
  },
});
