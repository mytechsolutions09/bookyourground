import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, History, PlayCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useCricketScoring } from '@/hooks/useCricketScoring';

const MATCHES_DATA = [
  {
    id: '1',
    type: 'League Matches',
    tournament: 'SL T20 Cricket Cup',
    status: 'Upcoming',
    date: '18-Apr-26',
    time: '1:30 PM',
    location: 'Sushant Lok 3, Gurugram',
    team1: 'SL Titans',
    team2: 'Sikh Squad',
  },
  {
    id: '2',
    type: 'Corporate Match',
    tournament: 'Weekend Bash',
    status: 'Result',
    date: '12-Apr-26',
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

export default function CricketMatches() {
  const router = useRouter();
  const [subTab, setSubTab] = useState('all');
  const [fetchedMatches, setFetchedMatches] = useState<any[]>([]);
  const { resumeMatch } = useCricketScoring();

  useEffect(() => {
    fetchMatches();

    const channel = supabase
      .channel(`live-matches-list-${Math.random()}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'match_live_state' 
      }, () => {
        fetchMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        match_live_state (*),
        innings (*)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const dbMatches = data.map(m => {
        const live = m.match_live_state;
        const secondInn = m.innings?.find((i: any) => i.innings_number === 2);
        const firstInn = m.innings?.find((i: any) => i.innings_number === 1);
        const oversLimit = Number(m.overs || 20) * 6;

        // Comprehensive check for match completion
        const dbCompleted = m.status === 'completed' || m.status === 'Result';
        const liveCompleted = live?.match_status === 'completed' || live?.match_status === 'Result';
        const mathCompleted = (secondInn && Number(secondInn.wickets) >= (Number(m.players || 11) - 1)) || 
                              (secondInn && Number(secondInn.legal_balls) >= oversLimit) ||
                              (secondInn && secondInn.target && secondInn.runs >= secondInn.target) ||
                              (live?.innings_number === 2 && (Number(live.legal_balls) >= oversLimit || (live.target && live.runs >= live.target)));

        const isCompleted = dbCompleted || liveCompleted || !!mathCompleted;
        const isLive = !isCompleted && (m.status === 'live' || m.status === 'innings_break' || !!live);
        const status = isCompleted ? 'Result' : (isLive ? 'Live' : 'Upcoming');
        
        let matchResult = m.result_text || live?.result_text;
        let team1Score, team1Overs, team2Score, team2Overs;

        // Step 1: Base scores from Innings table (historical)
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

        // Step 2: Override with Live State (most fresh data for current/final inning)
        if (live) {
          const isTeamABatting = live.batting_team === m.team_a;
          const currentScore = `${live.runs}/${live.wickets}`;
          const currentOvers = `(${Math.floor(live.legal_balls / 6)}.${live.legal_balls % 6} Ov)`;
          
          if (isTeamABatting) {
            team1Score = currentScore;
            team1Overs = currentOvers;
          } else {
            team2Score = currentScore;
            team2Overs = currentOvers;
          }
        }

        return {
          id: m.id,
          match_id: m.id,
          type: m.match_type || 'Limited Overs',
          tournament: 'Open Match',
          status,
          date: (() => {
             const d = new Date(m.created_at);
             const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
             const day = d.getDate();
             const month = months[d.getMonth()];
             const year = d.getFullYear().toString().slice(-2);
             return `${day}-${month}-${year}`;
           })(),
          location: m.venue || 'Unknown Grounds',
          team1: m.team_a,
          team2: m.team_b,
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

  const MatchCard = ({ match }: { match: any }) => (
    <TouchableOpacity 
      activeOpacity={0.9}
      style={styles.matchCard}
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
          <Text style={styles.matchMeta}>{match.date} | {match.location}</Text>
        </View>
        <View style={[
          styles.statusBadge, 
          match.status === 'Result' ? styles.statusBadgeResult : 
          (match.status === 'Live' ? styles.statusBadgeLive : styles.statusBadgeUpcoming)
        ]}>
          {match.status === 'Live' && <View style={styles.pulseDot} />}
          <Text style={[
            styles.statusBadgeText,
            match.status === 'Result' ? styles.statusBadgeTextResult : 
            (match.status === 'Live' ? styles.statusBadgeTextLive : styles.statusBadgeTextUpcoming)
          ]}>{match.status === 'Live' ? 'LIVE' : match.status}</Text>
        </View>
      </View>

      <View style={styles.matchTeams}>
        <View style={styles.matchTeamRow}>
          <View style={styles.teamInfo}>
            <View style={[styles.miniAvatar, { width: 32, height: 32, backgroundColor: '#F1F5F9' }]}>
               <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748B' }}>{match.team1[0]}</Text>
            </View>
            <Text style={styles.teamNameText} numberOfLines={1}>{match.team1}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {match.status === 'Live' && match.batting_team === match.team1 && <View style={styles.liveIndicatorDot} />}
            {match.team1Score && <Text style={styles.teamScoreText}>{match.team1Score} <Text style={styles.teamOversText}>{match.team1Overs}</Text></Text>}
          </View>
        </View>

        <View style={styles.matchTeamRow}>
          <View style={styles.teamInfo}>
            <View style={[styles.miniAvatar, { width: 32, height: 32, backgroundColor: '#F1F5F9' }]}>
               <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748B' }}>{match.team2[0]}</Text>
            </View>
            <Text style={styles.teamNameText} numberOfLines={1}>{match.team2}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {match.status === 'Live' && match.batting_team === match.team2 && <View style={styles.liveIndicatorDot} />}
            {match.team2Score && <Text style={styles.teamScoreText}>{match.team2Score} <Text style={styles.teamOversText}>{match.team2Overs}</Text></Text>}
          </View>
        </View>
      </View>

      {match.status === 'Live' && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }}>
            <TouchableOpacity 
            style={[styles.liveActionBtn, { flex: 1, backgroundColor: '#F0FDF4', borderRadius: 8 }]}
            onPress={() => router.push(`/live/${match.match_id}`)}
          >
            <Text style={styles.liveActionBtnText}>View</Text>
            <ChevronRight size={14} color="#01b854" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.liveActionBtn, { flex: 1.5, backgroundColor: '#01b854', borderRadius: 8 }]}
            onPress={() => router.push(`/cricket/scoring?matchId=${match.match_id}`)}
          >
            <Text style={[styles.liveActionBtnText, { color: '#FFFFFF' }]}>Resume Scoring</Text>
            <History size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
      {match.status === 'Result' && match.result && (
        <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }}>
          <Text style={styles.resultText}>{match.result}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.subTabContainer}>
        {['All', 'Played'].map((label) => (
          <TouchableOpacity
            key={label}
            style={[styles.subTab, subTab === label.toLowerCase() && styles.subTabActive]}
            onPress={() => setSubTab(label.toLowerCase())}
          >
            <Text style={[styles.subTabText, subTab === label.toLowerCase() && styles.subTabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.matchesList}>
        {[...fetchedMatches, ...MATCHES_DATA]
          .filter(m => {
            if (subTab === 'all') return true;
            if (subTab === 'played') return m.status === 'Result' || m.status === 'completed';
            return m.status.toLowerCase() === subTab.toLowerCase();
          })
          .map(match => (
            <MatchCard key={match.id} match={match} />
          ))
        }
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  subTabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  subTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: {
    borderBottomColor: '#01b854',
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#01b854',
  },
  matchesList: {
    gap: 16,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  matchType: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
  },
  matchTournament: {
    color: '#64748B',
    fontWeight: '500',
  },
  matchMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadgeLive: {
    backgroundColor: '#F0FDF4',
  },
  statusBadgeResult: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeUpcoming: {
    backgroundColor: '#EFF6FF',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgeTextLive: {
    color: '#10B981',
  },
  statusBadgeTextResult: {
    color: '#64748B',
  },
  statusBadgeTextUpcoming: {
    color: '#3B82F6',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  matchTeams: {
    gap: 12,
  },
  matchTeamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  teamNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    maxWidth: 200,
  },
  teamScoreText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  teamOversText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
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
  matchFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  resultText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontStyle: 'italic',
  },
});
