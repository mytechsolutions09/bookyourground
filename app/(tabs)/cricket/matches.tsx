import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, TextInput, useWindowDimensions, Share, PanResponder, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, History, Calendar, Search, Radio, Trophy, Clock, Share2, Settings, ChevronLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useCricketScoring } from '@/hooks/useCricketScoring';
import { useAuth } from '@/contexts/AuthContext';

const MATCHES_DATA: any[] = [
  {
    id: 'static-1',
    type: 'League Matches',
    tournament: 'SL T20 Cricket Cup',
    status: 'Upcoming',
    date: '18-Apr-26',
    rawDate: new Date('2026-04-18'),
    location: 'Sushant Lok 3, Gurugram',
    team1: 'SL Titans',
    team2: 'Sikh Squad',
  },
  {
    id: 'static-2',
    type: 'Corporate Match',
    tournament: 'Weekend Bash',
    status: 'Result',
    date: '12-Apr-26',
    rawDate: new Date('2026-04-12'),
    location: 'Vicky Cricket Ground',
    team1: 'Tech XI',
    team2: 'Hustlers',
    team1Score: '154/6',
    team1Overs: '(20.0)',
    team2Score: '152/10',
    team2Overs: '(19.4)',
    result: 'Tech XI won by 2 runs',
  }
];

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

export default function CricketMatches() {
  const router = useRouter();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 1024;
  
  const [category, setCategory] = useState('played');
  const [status, setStatus] = useState('result');
  const [dateFilter, setDateFilter] = useState('all_time');
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchedMatches, setFetchedMatches] = useState<any[]>([]);
  const [userTeams, setUserTeams] = useState<string[]>([]);
  const [userPlayedMatches, setUserPlayedMatches] = useState<string[]>([]);
  useEffect(() => {
    fetchMatches();
    if (session?.user?.id) {
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
        if (session?.user?.id) fetchUserCricketContext();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  const fetchUserCricketContext = async () => {
    if (!session?.user?.id) return;

    const { data: memberEntries } = await supabase
      .from('team_members')
      .select('id, team_id')
      .eq('profile_id', session.user.id);

    const { data: ownedTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('owner_id', session.user.id);

    const myProfileIds = memberEntries?.map(p => p.id) || [];
    const myTeamIds = Array.from(new Set([
      ...(memberEntries?.map(m => m.team_id) || []),
      ...(ownedTeams?.map(t => t.id) || [])
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

  const allMatches = useMemo(() => [...fetchedMatches, ...MATCHES_DATA], [fetchedMatches]);

  const filteredMatches = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return allMatches.filter(m => {
      if (category === 'played') {
         if (!userPlayedMatches.includes(m.id)) {
            if (typeof m.id === 'string' && !m.id.startsWith('static-')) return false;
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
  }, [allMatches, category, status, userPlayedMatches, dateFilter, searchQuery]);

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
          <Icon size={14} color={isOpen ? '#01b854' : '#64748B'} />
          <Text style={[styles.dropdownTriggerText, isOpen && styles.dropdownTriggerTextActive]} numberOfLines={1}>
            {selectedLabel}
          </Text>
        </TouchableOpacity>

        {isOpen && (
          <>
            <TouchableOpacity 
              style={styles.dropdownOverlay} 
              activeOpacity={1} 
              onPress={() => setActiveDropdown(null)} 
            />
            <View style={styles.dropdownMenu}>
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
            <Calendar size={11} color="#94A3B8" />
            <Text style={styles.matchMeta}>{match.date}</Text>
            {match.location ? (
              <>
                <Text style={{ color: '#CBD5E1', fontSize: 10 }}>•</Text>
                <Text style={styles.matchMeta} numberOfLines={1}>{match.location}</Text>
              </>
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
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }}>
          <TouchableOpacity
            style={[styles.liveActionBtn, { flex: 1, backgroundColor: '#F0FDF4', borderRadius: 10 }]}
            onPress={() => router.push(`/live/${match.match_id}`)}
          >
            <Text style={styles.liveActionBtnText}>View</Text>
            <ChevronRight size={14} color="#01b854" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.liveActionBtn, { flex: 1.5, backgroundColor: '#06392e', borderRadius: 10 }]}
            onPress={() => router.push(`/cricket/scoring?matchId=${match.match_id}`)}
          >
            <Text style={[styles.liveActionBtnText, { color: '#FFFFFF' }]}>Resume Scoring</Text>
            <History size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
      {match.status === 'Result' && match.result && (
        <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Trophy size={12} color="#01b854" />
            <Text style={styles.resultText}>{match.result}</Text>
          </View>
        </View>
      )}
      {match.status === 'Upcoming' && (
        <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={12} color="#94A3B8" />
            <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '500' }}>Scheduled · {match.date}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Search size={16} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search teams, venue..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Refined Filters Row */}
      <View style={styles.filtersWrapper}>
         <View style={styles.filtersRow}>
            <FilterDropdown 
              id="category" 
              label="Category" 
              value={category} 
              options={CATEGORY_TABS} 
              onSelect={setCategory} 
              icon={Trophy}
            />
            <FilterDropdown 
              id="status" 
              label="Status" 
              value={status} 
              options={STATUS_FILTERS} 
              onSelect={setStatus} 
              icon={Radio}
            />
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
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  filtersWrapper: {
    marginBottom: 20,
    zIndex: 100,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  dropdownTriggerActive: {
    borderColor: '#01b854',
    backgroundColor: '#F0FDF4',
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
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
    left: 0,
    right: 0,
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
    fontSize: 14,
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
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  matchCardLive: {
    borderColor: '#01b85430',
    borderWidth: 1.5,
    backgroundColor: '#fafffe',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  matchType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchTournament: {
    color: '#64748B',
    fontWeight: '500',
  },
  matchMeta: {
    fontSize: 11,
    color: '#94A3B8',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusBadgeLive: { backgroundColor: '#F0FDF4' },
  statusBadgeResult: { backgroundColor: '#F1F5F9' },
  statusBadgeUpcoming: { backgroundColor: '#EFF6FF' },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  statusBadgeTextLive: { color: '#01b854' },
  statusBadgeTextResult: { color: '#64748B' },
  statusBadgeTextUpcoming: { color: '#518167' },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#01b854',
  },
  matchTeams: { gap: 12 },
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
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  teamNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  teamScoreText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#06392e',
  },
  teamOversText: {
    fontSize: 12,
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
    paddingVertical: 10,
    gap: 6,
  },
  liveActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#01b854',
  },
  resultText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#518167',
    fontStyle: 'italic',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#CBD5E1',
    textAlign: 'center',
  },
});
