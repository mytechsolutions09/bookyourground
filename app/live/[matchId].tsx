import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, useWindowDimensions, Platform, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import WebLayout from '@/components/web/WebLayout';
import { ChevronRight, ChevronLeft, ChevronDown, Award, MessageCircle, Share2, Trophy, BarChart3, Settings, Sliders, HelpCircle, ImagePlus, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

// ─── Helpers ──────────────────────────────────────────────
const fmtOvers = (legalBalls: number, total: number) =>
  `${Math.floor(legalBalls / 6)}.${legalBalls % 6} / ${total} ov`;

const srColor = (sr: number) =>
  sr >= 150 ? '#1D9E75' : sr >= 100 ? '#BA7517' : '#E24B4A';

const generateScorecard = (logs: any[], inningsNum: number) => {
  const innLogs = logs.filter(l => l.innings_number === inningsNum || !l.innings_number); // Fallback for old logs
  const batters: Record<string, any> = {};
  const bowlers: Record<string, any> = {};
  let extras = { wide: 0, noball: 0, bye: 0, legbye: 0, penalty: 0, total: 0 };
  let totalRuns = 0;
  let totalWickets = 0;
  let totalBalls = 0;

  innLogs.forEach(ball => {
    // Batting
    if (ball.batter_name) {
      if (!batters[ball.batter_name]) {
        batters[ball.batter_name] = { name: ball.batter_name, runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: 'not out' };
      }
      batters[ball.batter_name].runs += (ball.runs || 0);
      if (!ball.extra_type || ball.extra_type === 'noball') {
         batters[ball.batter_name].balls += 1;
      }
      if (ball.runs === 4) batters[ball.batter_name].fours += 1;
      if (ball.runs === 6) batters[ball.batter_name].sixes += 1;
      if (ball.is_wicket) {
         batters[ball.batter_name].dismissal = `${ball.dismissal_type || 'out'} ${ball.fielder_name ? `c ${ball.fielder_name}` : ''} b ${ball.bowler_name}`;
      }
    }

    // Bowling
    if (ball.bowler_name) {
      if (!bowlers[ball.bowler_name]) {
        bowlers[ball.bowler_name] = { name: ball.bowler_name, legalBalls: 0, runs: 0, wickets: 0, maidens: 0, dots: 0 };
      }
      bowlers[ball.bowler_name].runs += (ball.runs || 0) + (ball.extras || 0);
      if (ball.is_wicket && ball.dismissal_type !== 'run out') {
         bowlers[ball.bowler_name].wickets += 1;
      }
      if (!ball.extra_type || (ball.extra_type !== 'wide' && ball.extra_type !== 'noball')) {
         bowlers[ball.bowler_name].legalBalls += 1;
      }
      if (ball.runs === 0 && !ball.extra_type) bowlers[ball.bowler_name].dots += 1;
    }

    // Extras
    if (ball.extra_type) {
       const et = ball.extra_type as keyof typeof extras;
       if (extras[et] !== undefined) {
         extras[et] += (ball.extras || 0);
         extras.total += (ball.extras || 0);
       }
    }
  });

  return {
    batters: Object.values(batters),
    bowlers: Object.values(bowlers).map(b => ({
      ...b,
      overs: `${Math.floor(b.legalBalls / 6)}.${b.legalBalls % 6}`,
      eco: b.legalBalls > 0 ? ((b.runs / b.legalBalls) * 6).toFixed(2) : '0.00'
    })),
    extras
  };
};

const ballClass: any = {
  dot:    { bg: '#F1EFE8', color: '#888780', border: '#D3D1C7' },
  run:    { bg: '#E6F1FB', color: '#185FA5', border: '#B5D4F4' },
  four:   { bg: '#E6F1FB', color: '#185FA5', border: '#185FA5' },
  six:    { bg: '#E1F5EE', color: '#085041', border: '#1D9E75' },
  wicket: { bg: '#FCEBEB', color: '#E24B4A', border: '#E24B4A' },
  wide:   { bg: '#FAEEDA', color: '#633806', border: '#BA7517' },
  noball: { bg: '#FAEEDA', color: '#633806', border: '#BA7517' },
};

// ─── Ball component ───────────────────────────────────
function Ball({ b }: { b: { type: string, label: string } }) {
  const s = ballClass[b.type] || ballClass.run;
  return (
    <View style={[styles.ball, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[styles.ballLabel, { color: s.color }]}>{b.label}</Text>
    </View>
  );
}

const formatBallDescription = (ball: any) => {
  if (!ball) return '';
  const prefix = `${ball.bowler_name} to ${ball.batter_name}, `;
  if (ball.is_wicket) {
    return `${prefix}OUT ${ball.dismissal_type || 'Wicket'}!`;
  }
  if (ball.extra_type === 'wide') return `${prefix}wide`;
  if (ball.extra_type === 'noball') return `${prefix}no ball`;
  if (ball.runs === 4) return `${prefix}FOUR! Elegant shot.`;
  if (ball.runs === 6) return `${prefix}SIX! Out of the ground.`;
  if (ball.runs === 0) return `${prefix}no run`;
  return `${prefix}${ball.runs} run${ball.runs > 1 ? 's' : ''}`;
};

export default function LiveScorecard() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [live, setLive] = useState<any>(null);
  const [match, setMatch] = useState<any>(null);
  const [blink, setBlink] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [squadA, setSquadA] = useState<any[]>([]);
  const [squadB, setSquadB] = useState<any[]>([]);
  const [ballLogs, setBallLogs] = useState<any[]>([]);
  const [matchImages, setMatchImages] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handlePickImage = async () => {
    if (matchImages.length >= 4) {
      alert("Maximum 4 images allowed in gallery.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setIsUploading(true);
      try {
        const publicUrl = result.assets[0].uri; // In production, upload to storage
        const { data, error } = await supabase
          .from('match_images')
          .insert({ match_id: matchId, url: publicUrl })
          .select()
          .single();

        if (error) throw error;
        setMatchImages(prev => [...prev, data]);
      } catch (err) {
        console.error('Gallery upload error:', err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  // MVP Logic
  const getMVPList = () => {
    const players: Record<string, any> = {};

    const ensurePlayer = (name: string) => {
      if (!players[name]) {
        players[name] = { 
          name, 
          points: 0, 
          runs: 0, 
          balls: 0, 
          wickets: 0, 
          dots: 0, 
          catches: 0, 
          fours: 0, 
          sixes: 0,
          team: ''
        };
      }
    };

    ballLogs.forEach(ball => {
      // Striker points
      if (ball.batter_name) {
        ensurePlayer(ball.batter_name);
        players[ball.batter_name].runs += (ball.runs || 0);
        players[ball.batter_name].balls += 1;
        players[ball.batter_name].points += (ball.runs || 0);
        if (ball.runs === 4) { players[ball.batter_name].points += 1; players[ball.batter_name].fours += 1; }
        if (ball.runs === 6) { players[ball.batter_name].points += 2; players[ball.batter_name].sixes += 1; }
      }

      // Bowler points
      if (ball.bowler_name) {
        ensurePlayer(ball.bowler_name);
        if (ball.is_wicket) {
          players[ball.bowler_name].wickets += 1;
          players[ball.bowler_name].points += 20;
        }
        if (ball.runs === 0 && !ball.extra_type) {
          players[ball.bowler_name].dots += 1;
          players[ball.bowler_name].points += 1;
        }
      }

      // Fielder points
      if (ball.fielder_name) {
        ensurePlayer(ball.fielder_name);
        players[ball.fielder_name].catches += 1;
        players[ball.fielder_name].points += 10;
      }
    });

    // Milestone bonuses
    Object.values(players).forEach(p => {
      if (p.runs >= 50) p.points += 5;
      if (p.runs >= 100) p.points += 10;
      if (p.wickets >= 3) p.points += 10;
      if (p.wickets >= 5) p.points += 20;
    });

    return Object.values(players).sort((a, b) => b.points - a.points);
  };

  // Fetch initial state
  useEffect(() => {
    if (!matchId) return;
    const load = async () => {
      const [{ data: m }, { data: l }] = await Promise.all([
        supabase.from('matches').select('*').eq('id', matchId).single(),
        supabase.from('match_live_state').select('*').eq('match_id', matchId).single(),
      ]);
      
      if (m) {
        setMatch(m);
        // Fetch Squads (Team A & B)
        let idA = m.team_a_id;
        let idB = m.team_b_id;

        // Fallback: If IDs are missing, try to find team by name
        if (!idA && m.team_a) {
          const { data: tA } = await supabase.from('teams').select('id').eq('name', m.team_a).limit(1).single();
          if (tA) idA = tA.id;
        }
        if (!idB && m.team_b) {
          const { data: tB } = await supabase.from('teams').select('id').eq('name', m.team_b).limit(1).single();
          if (tB) idB = tB.id;
        }

        const [sqA, sqB] = await Promise.all([
          idA ? supabase.from('team_members').select('*, profiles(*)').eq('team_id', idA) : Promise.resolve({ data: [] }),
          idB ? supabase.from('team_members').select('*, profiles(*)').eq('team_id', idB) : Promise.resolve({ data: [] })
        ]);
        if (sqA.data) setSquadA(sqA.data);
        if (sqB.data) setSquadB(sqB.data);

        // Fetch Ball Logs
        const { data: logs } = await supabase
          .from('ball_log')
          .select('*')
          .eq('match_id', matchId)
          .order('over_number', { ascending: false })
          .order('ball_number', { ascending: false });
        if (logs) setBallLogs(logs || []);

        const { data: imgs } = await supabase
          .from('match_images')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: false });
        if (imgs) setMatchImages(imgs);
      }
      if (l) setLive(l);
    };
    load();
  }, [matchId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!matchId) return;
    const channel = supabase
      .channel(`live-score-${matchId}-${Math.random()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_live_state', filter: `match_id=eq.${matchId}` },
        (payload) => {
          setLive(payload.new);
          setLastUpdated(new Date());
          setBlink(true);
          setTimeout(() => setBlink(false), 600);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ball_log', filter: `match_id=eq.${matchId}` },
        (payload) => {
          setBallLogs(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  const [activeTab, setActiveTab] = useState('info');

  if (!live || !match) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0D9488" />
      <Text style={{ color: '#6B7280', marginTop: 16 }}>Loading match...</Text>
    </View>
  );

  const isCompleted = live.match_status === 'completed';
  const oversStr = fmtOvers(live.legal_balls, live.overs_total);

  const renderInningsScorecard = (innNum: number) => {
    const sc = generateScorecard(ballLogs, innNum);
    if (!sc.batters.length && !sc.bowlers.length) return null;

    const teamName = innNum === 1 ? match.team_a : match.team_b;
    const bowlingName = innNum === 1 ? match.team_b : match.team_a;

    return (
      <View style={[styles.scWrapper, { marginHorizontal: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 }]}>
        <View style={styles.scHeader}><Text style={styles.scHeaderText}>{teamName} Innings</Text></View>
        
        {/* Batting Table */}
        <View style={styles.scTable}>
          <View style={styles.scRowHead}>
            <Text style={[styles.scCol, { flex: 4 }]}>Batter</Text>
            <Text style={styles.scCol}>R</Text>
            <Text style={styles.scCol}>B</Text>
            <Text style={styles.scCol}>4s</Text>
            <Text style={styles.scCol}>6s</Text>
            <Text style={styles.scCol}>SR</Text>
          </View>
          {sc.batters.map((b: any, i: number) => (
            <View key={i} style={styles.scRow}>
              <View style={{ flex: 4 }}>
                <Text style={styles.scPlayerName}>{b.name}</Text>
                <Text style={styles.scDismissal}>{b.dismissal}</Text>
              </View>
              <Text style={[styles.scVal, { fontWeight: '700' }]}>{b.runs}</Text>
              <Text style={styles.scVal}>{b.balls}</Text>
              <Text style={styles.scVal}>{b.fours}</Text>
              <Text style={styles.scVal}>{b.sixes}</Text>
              <Text style={styles.scVal}>{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '-'}</Text>
            </View>
          ))}
          <View style={styles.scExtrasRow}>
            <Text style={styles.scExtrasLabel}>Extras</Text>
            <Text style={styles.scExtrasVal}>(w {sc.extras.wide}, nb {sc.extras.noball}, b {sc.extras.bye}, lb {sc.extras.legbye})</Text>
            <Text style={styles.scExtrasTotal}>{sc.extras.total}</Text>
          </View>
        </View>

        {/* Bowling Table */}
        <View style={[styles.scHeader, { marginTop: 16, backgroundColor: '#F3F4F6' }]}><Text style={[styles.scHeaderText, { color: '#4B5563' }]}>{bowlingName} Bowling</Text></View>
        <View style={styles.scTable}>
          <View style={styles.scRowHead}>
            <Text style={[styles.scCol, { flex: 4 }]}>Bowler</Text>
            <Text style={styles.scCol}>O</Text>
            <Text style={styles.scCol}>M</Text>
            <Text style={styles.scCol}>R</Text>
            <Text style={styles.scCol}>W</Text>
            <Text style={styles.scCol}>Eco</Text>
          </View>
          {sc.bowlers.map((b: any, i: number) => (
            <View key={i} style={styles.scRow}>
              <Text style={[styles.scPlayerName, { flex: 4 }]}>{b.name}</Text>
              <Text style={styles.scVal}>{b.overs}</Text>
              <Text style={styles.scVal}>{b.maidens}</Text>
              <Text style={styles.scVal}>{b.runs}</Text>
              <Text style={[styles.scVal, { fontWeight: '700' }]}>{b.wickets}</Text>
              <Text style={styles.scVal}>{b.eco}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'scoreboard':
        return (
          <ScrollView style={{ flex: 1, backgroundColor: '#F6F4F0' }} contentContainerStyle={{ paddingVertical: 12 }}>
            {/* Main Score Display in Scoreboard Tab */}
            <View style={[styles.scoreCard, { backgroundColor: isCompleted ? '#2C2C2A' : '#0F6E56', margin: 12, borderRadius: 12 }]}>
              {isCompleted && live.result_text && (
                <View style={styles.resultBanner}>
                   <Text style={styles.resultText}>🏆 {live.result_text}</Text>
                </View>
              )}

              <View style={styles.scoreRow}>
                 <View>
                    <Text style={styles.battingTeamName}>{live.batting_team}</Text>
                    <Text style={[styles.bigScore, blink && { transform: [{ scale: 1.05 }] }]}>
                      {live.runs}/{live.wickets}
                    </Text>
                    <Text style={styles.oversCount}>{fmtOvers(live.legal_balls, live.overs_total)}</Text>
                 </View>
                 {live.innings_number === 2 && live.target && (
                   <View style={styles.targetBox}>
                      <Text style={styles.targetLabel}>Target</Text>
                      <Text style={styles.targetValue}>{live.target}</Text>
                      <Text style={styles.targetSub}>
                        Need {Math.max(0, live.target - live.runs)} off {Math.max(0, live.overs_total * 6 - live.legal_balls)}
                      </Text>
                   </View>
                 )}
              </View>

              <View style={styles.statsRow}>
                <View style={[styles.statPill, { backgroundColor: 'rgba(255,255,255,0.1)' }]}><Text style={styles.statPillText}>CRR <Text style={{ fontWeight: 'bold' }}>{live.crr}</Text></Text></View>
                {live.rrr && live.innings_number === 2 && (
                  <View style={[styles.statPill, { backgroundColor: 'rgba(255,255,255,0.1)' }]}><Text style={styles.statPillText}>RRR <Text style={{ fontWeight: 'bold' }}>{live.rrr}</Text></Text></View>
                )}
                <View style={[styles.statPill, { backgroundColor: 'rgba(255,255,255,0.1)' }]}><Text style={styles.statPillText}>Last: <Text style={{ fontWeight: 'bold' }}>{live.last_ball_label ?? '—'}</Text></Text></View>
              </View>
            </View>

            {renderInningsScorecard(1)}
            <View style={{ height: 20 }} />
            {renderInningsScorecard(2)}
            <View style={{ height: 40 }} />
          </ScrollView>
        );
      case 'info':
        return (
          <View style={{ flex: 1, backgroundColor: '#F6F4F0', padding: 12 }}>
            {/* Main Info Card */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' }}>
              <TouchableOpacity 
                style={[styles.squadsShortcut, { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }]}
                onPress={() => setActiveTab('squads')}
              >
                 <Text style={styles.squadsShortcutText}>Squads</Text>
                 <ChevronRight size={20} color="#0D9488" />
              </TouchableOpacity>

              <View style={{ padding: 16 }}>
                <Text style={styles.infoHeading}>Info</Text>
                
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Teams</Text><Text style={styles.infoValue}>{match.team_a} vs {match.team_b}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Tournament</Text><Text style={styles.infoValue}>{match.title || 'Individual match'}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Match Type</Text><Text style={styles.infoValue}>{match.match_type || 'Limited Overs'}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Overs</Text><Text style={styles.infoValue}>{match.overs}</Text></View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date & Time</Text>
                  <Text style={styles.infoValue}>{new Date(match.created_at).toLocaleString()}</Text>
                </View>
                <TouchableOpacity style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Venue</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
                    <Text style={[styles.infoValue, { color: '#0D9488', flex: 0 }]}>{match.venue || 'Standard Ground'}</Text>
                    <ChevronRight size={16} color="#4B5563" />
                  </View>
                </TouchableOpacity>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Toss</Text><Text style={styles.infoValue}>{match.toss_winner} won toss, opted to {match.toss_choice}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Ball Type</Text><Text style={styles.infoValue}>LEATHER</Text></View>
                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.infoLabel}>Match Id</Text>
                  <Text style={styles.infoValue}>
                    {match.display_id ? match.display_id.toString().padStart(3, '0') : match.id.substring(0, 8)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.notesSection}>
               <Text style={styles.notesTitle}>Match Notes</Text>
               <View style={styles.teamNotesContainer}>
                  <Text style={styles.teamNotesHeader}>{match.team_a}</Text>
                  <View style={styles.notesContent}>
                    <Text style={styles.noteText}>• Match started at {new Date(match.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</Text>
                    {live.innings_number === 2 && (
                      <Text style={styles.noteText}>• 1st Innings completed at {new Date(live.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</Text>
                    )}
                    {isCompleted && (
                      <Text style={styles.noteText}>• Match ended at {new Date(live.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</Text>
                    )}
                  </View>
               </View>
            </View>
          </View>
        );
      case 'summary':
        return (
          <View style={{ flex: 1, backgroundColor: '#F6F4F0', padding: 12 }}>
             {/* Poll/Interactive Bar */}
             <View style={[styles.pollBar, { borderRadius: 12, marginBottom: 12 }]}>
                <View style={styles.pollIcon}><BarChart3 size={16} color="#B91C1C" /></View>
                <Text style={styles.pollText}>
                  Which team has scored more boundaries? <Text style={{ fontWeight: 'bold' }}>{match.team_a}</Text> or <Text style={{ fontWeight: 'bold' }}>{match.team_b}</Text>?
                </Text>
             </View>

             {/* Score Summary Card */}
             <View style={[styles.summaryScoresCard, { borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', padding: 16 }]}>
                <View style={styles.summaryTeamRow}>
                   <View style={{ flex: 1 }}>
                      <Text style={styles.summaryTeamName}>{match.team_a}</Text>
                      <Text style={styles.summaryMainScore}>
                        {live.innings_number === 1 ? `${live.runs}/${live.wickets}` : '...'} 
                        <Text style={styles.summaryOvers}> ({match.overs})</Text>
                      </Text>
                   </View>
                   {live.innings_number === 1 && !isCompleted && <View style={styles.liveBadgeMini}><Text style={styles.liveBadgeMiniText}>LIVE</Text></View>}
                </View>

                <View style={[styles.summaryTeamRow, { marginTop: 12 }]}>
                   <View style={{ flex: 1 }}>
                      <Text style={styles.summaryTeamName}>{match.team_b}</Text>
                      <Text style={styles.summaryMainScore}>
                        {live.innings_number === 2 ? `${live.runs}/${live.wickets}` : '...'}
                        <Text style={styles.summaryOvers}> ({oversStr})</Text>
                      </Text>
                   </View>
                   {isCompleted && <View style={styles.resultBadgeMini}><Text style={styles.resultBadgeMiniText}>Result</Text></View>}
                </View>

                {live.result_text && (
                  <Text style={styles.summaryResultText}>{live.result_text}</Text>
                )}

                <View style={styles.summaryActions}>
                   <TouchableOpacity style={styles.summaryActionBtn}><Text style={styles.summaryActionBtnText}>Points Table</Text></TouchableOpacity>
                   <TouchableOpacity style={styles.summaryActionBtn}><Text style={styles.summaryActionBtnText}>Leaderboard</Text></TouchableOpacity>
                </View>
             </View>

             {/* Milestones */}
             <View style={{ padding: 16 }}>
                <Text style={styles.sectionHeading}>Milestones</Text>
                <View style={styles.milestoneCard}>
                   <View style={styles.milestoneImageContainer}>
                      <Image source={{ uri: 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg' }} style={styles.milestoneImg} />
                      <View style={styles.milestoneOverlay}>
                         <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View>
                         <Text style={styles.milestoneType}>Terrific Hitter!!</Text>
                         <Text style={styles.milestoneDesc}>Striker has completed boundaries today. What a batter!</Text>
                      </View>
                   </View>
                   <TouchableOpacity style={styles.congratulateBtn}>
                      <MessageCircle size={18} color="#FFFFFF" />
                      <Text style={styles.congratulateBtnText}>CONGRATULATE</Text>
                   </TouchableOpacity>
                </View>
             </View>

             {/* Heroes */}
             <View style={{ padding: 16 }}>
                <Text style={styles.sectionHeading}>Heroes of the match</Text>
                <View style={styles.heroCard}>
                   <Image source={{ uri: 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg' }} style={styles.heroImg} />
                   <View style={styles.heroOverlay}>
                      <Text style={styles.heroLabel}>Player of the match</Text>
                      <Share2 size={24} color="#FFFFFF" style={{ position: 'absolute', top: 16, right: 16 }} />
                   </View>
                </View>
             </View>
          </View>
        );
      case 'comms':
        return (
          <View style={{ flex: 1, backgroundColor: '#F6F4F0', padding: 12 }}>
             {/* Filter Bar */}
             <View style={[styles.commsFilterBar, { backgroundColor: 'transparent', padding: 0, borderBottomWidth: 0, marginBottom: 12 }]}>
                <View style={[styles.commsFilterBtn, { flex: 1 }]}>
                   <Text style={styles.commsFilterText}>{live.batting_team}</Text>
                   <ChevronDown size={16} color="#4B5563" />
                </View>
                <View style={[styles.commsFilterBtn, { flex: 1, marginLeft: 10 }]}>
                   <Text style={styles.commsFilterText}>Full Commentary</Text>
                   <ChevronDown size={16} color="#4B5563" />
                </View>
             </View>

             <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' }}>
               <ScrollView style={{ flex: 1 }}>
                  {ballLogs.map((ball, idx) => {
                    return (
                      <View key={ball.id}>
                         <View style={styles.commsBallRow}>
                            <View style={styles.commsBallLeft}>
                               <Text style={styles.commsOverNum}>{ball.over_number}.{ball.ball_number}</Text>
                               <View style={[
                                  styles.commsResultCircle, 
                                  ball.is_wicket && styles.bgWicket,
                                  (ball.runs === 4 || ball.runs === 6) && styles.bgBoundary,
                                  ball.extra_type && styles.bgExtra
                               ]}>
                                  <Text style={[
                                     styles.commsResultText,
                                     (ball.is_wicket || ball.runs === 4 || ball.runs === 6 || ball.extra_type) && { color: '#FFFFFF' }
                                  ]}>
                                     {ball.label}
                                  </Text>
                               </View>
                            </View>
                            <View style={styles.commsBallRight}>
                               <Text style={[styles.commsDescText, ball.is_wicket && { fontWeight: '700' }]}>{formatBallDescription(ball)}</Text>
                               {ball.is_wicket && (
                                 <View style={styles.wicketDetailBox}>
                                    <Text style={styles.wicketDetailText}>{ball.batter_name} {ball.dismissal_type} {ball.fielder_name ? `c ${ball.fielder_name}` : ''} b {ball.bowler_name}</Text>
                                 </View>
                               )}
                            </View>
                         </View>
                         
                         {/* Over Summary */}
                         {ball.ball_number === 6 && (
                           <View style={styles.overSummaryBlock}>
                              <View style={styles.overBadge}><Text style={styles.overBadgeText}>OVER {ball.over_number + 1}</Text></View>
                              <Text style={styles.overSummaryRuns}>8 Runs | 1 Wkt</Text>
                              <Text style={styles.overSummaryScore}>{live.runs}/{live.wickets}</Text>
                           </View>
                         )}
                      </View>
                    );
                  })}
                  {ballLogs.length === 0 && (
                     <View style={{ padding: 60, alignItems: 'center' }}>
                        <Text style={{ color: '#9CA3AF' }}>Waiting for first ball...</Text>
                     </View>
                  )}
               </ScrollView>
             </View>
          </View>
        );
      case 'analysis':
        return (
          <ScrollView style={{ flex: 1, backgroundColor: '#F6F4F0' }} contentContainerStyle={{ padding: 12 }}>
             {/* Insights Banner */}
             <View style={[styles.insightsBanner, { borderRadius: 12, marginBottom: 12, borderBottomWidth: 0 }]}>
                <Text style={styles.insightsMsg}>Analyse this match in-depth with</Text>
                <TouchableOpacity style={styles.insightsBtnMain}>
                   <BarChart3 size={16} color="#FFFFFF" />
                   <Text style={styles.insightsBtnText}>Insights</Text>
                </TouchableOpacity>
             </View>

             <View style={[styles.analysisCard, { margin: 0, marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' }]}>
                <View style={styles.cardHeaderRow}>
                   <Text style={styles.cardTitle}>Manhattan</Text>
                   <View style={styles.cardHeaderIcons}>
                      <Sliders size={20} color="#9CA3AF" />
                      <Share2 size={20} color="#9CA3AF" style={{ marginLeft: 16 }} />
                   </View>
                </View>

                {/* Legend */}
                <View style={styles.chartLegend}>
                   <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} /><Text style={styles.legendText}>{match.team_a}</Text></View>
                   <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#F97316' }]} /><Text style={styles.legendText}>{match.team_b}</Text></View>
                </View>

                {/* Manhattan Chart Mockup */}
                <View style={styles.manhattanContainer}>
                   <View style={styles.yAxis}>
                      <Text style={styles.yText}>24</Text>
                      <Text style={styles.yText}>16</Text>
                      <Text style={styles.yText}>8</Text>
                      <Text style={styles.yText}>0</Text>
                   </View>
                   <View style={styles.chartArea}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'flex-end', height: 200, paddingBottom: 20 }}>
                         {[...Array(20)].map((_, i) => (
                           <View key={i} style={styles.overGroup}>
                              <View style={[styles.overBar, { height: 40 + Math.random() * 100, backgroundColor: '#3B82F6' }]}>
                                 {i % 4 === 0 && <View style={styles.wktBubble}><Text style={styles.wktBubbleText}>1W</Text></View>}
                              </View>
                              <View style={[styles.overBar, { height: 30 + Math.random() * 80, backgroundColor: '#F97316' }]}>
                                 {i % 7 === 0 && <View style={[styles.wktBubble, { borderColor: '#F97316' }]}><Text style={styles.wktBubbleText}>2W</Text></View>}
                              </View>
                           </View>
                         ))}
                      </ScrollView>
                      <View style={styles.xAxis}>
                         <Text style={styles.xAxisLabel}>Overs</Text>
                      </View>
                   </View>
                </View>
             </View>

             <View style={[styles.analysisCard, { margin: 0, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' }]}>
                <View style={styles.cardHeaderRow}>
                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.cardTitle}>Wagon Wheel</Text>
                      <HelpCircle size={16} color="#9CA3AF" style={{ marginLeft: 8 }} />
                   </View>
                   <View style={styles.cardHeaderIcons}>
                      <Sliders size={20} color="#9CA3AF" />
                      <Share2 size={20} color="#9CA3AF" style={{ marginLeft: 16 }} />
                   </View>
                </View>
                <Text style={styles.subLabel}>Both Teams</Text>

                <View style={styles.wagonWheelVisual}>
                   <View style={styles.groundCircle}>
                      <View style={styles.pitchArea} />
                      <View style={styles.boundaryLine} />
                      <View style={styles.innerCircle} />
                   </View>
                   <View style={styles.noDataOverlay}>
                      <Text style={styles.noDataText}>No wagon wheel data available.</Text>
                   </View>
                </View>
             </View>
          </ScrollView>
        );
      case 'mvp':
        const mvpData = getMVPList();
        return (
          <View style={{ flex: 1, backgroundColor: '#F6F4F0', padding: 12 }}>
             {/* MVP Explanation Banner */}
             <View style={[styles.mvpHeader, { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' }]}>
                <TouchableOpacity 
                   style={styles.calcTrigger}
                   onPress={() => router.push('/blog/mvp-calculation')}
                >
                   <Text style={[styles.calcTriggerText, { color: '#01b854' }]}>How is Most Valuable Players Calculated?</Text>
                </TouchableOpacity>
             </View>

             <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' }}>
               <ScrollView style={{ flex: 1 }}>
                  {mvpData.map((player, idx) => (
                    <View key={idx} style={styles.mvpPlayerRow}>
                       <View style={styles.mvpRankBox}>
                          <Text style={styles.mvpRankText}>{idx + 1}</Text>
                       </View>
                       <View style={styles.mvpAvatarContainer}>
                          <Image source={{ uri: `https://i.pravatar.cc/100?u=${player.name}` }} style={styles.mvpAvatar} />
                          {(idx < 3) && <View style={styles.mvpProBadge}><Text style={styles.mvpProText}>PRO</Text></View>}
                       </View>
                       <View style={styles.mvpInfoBody}>
                          <Text style={styles.mvpPlayerName}>{player.name}</Text>
                          <Text style={styles.mvpTeamName}>{idx % 2 === 0 ? match.team_a : match.team_b}</Text>
                       </View>
                       <View style={styles.mvpScoreBox}>
                          <Text style={styles.mvpScoreVal}>{player.points.toFixed(1)}</Text>
                       </View>
                    </View>
                  ))}
                  {mvpData.length === 0 && (
                    <View style={{ padding: 60, alignItems: 'center' }}>
                       <Trophy size={48} color="#E5E7EB" />
                       <Text style={{ color: '#9CA3AF', marginTop: 12, textAlign: 'center' }}>Match points will appear as game progresses.</Text>
                    </View>
                  )}
               </ScrollView>
             </View>
          </View>
        );
      case 'gallery':
        return (
          <View style={{ flex: 1, backgroundColor: '#F6F4F0', padding: 12 }}>
             {matchImages.length === 0 ? (
               <View style={[styles.emptyGalleryContainer, { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' }]}>
                  <View style={styles.emptyGalleryIconBox}>
                     <ImagePlus size={64} color="#D1D5DB" />
                  </View>
                  <Text style={styles.emptyGalleryTitle}>Oops...It's empty in here.</Text>
                  <Text style={styles.emptyGallerySub}>Scorer has not uploaded any photos yet.</Text>
                  
                  <TouchableOpacity 
                    style={styles.addPhotoBtnLarge}
                    onPress={handlePickImage}
                    disabled={isUploading}
                  >
                     {isUploading ? (
                       <ActivityIndicator color="#FFFFFF" size="small" />
                     ) : (
                       <>
                         <Camera size={20} color="#FFFFFF" />
                         <Text style={styles.addPhotoBtnLargeText}>Add Photos (Up to 4)</Text>
                       </>
                     )}
                  </TouchableOpacity>
               </View>
             ) : (
               <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' }}>
                 <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.galleryGrid}>
                    {matchImages.map((img, idx) => (
                      <View key={img.id || idx} style={styles.galleryItem}>
                         <Image source={{ uri: img.url }} style={styles.galleryImage} />
                      </View>
                    ))}
                    {matchImages.length < 4 && (
                      <TouchableOpacity 
                        style={styles.galleryAddMore}
                        onPress={handlePickImage}
                        disabled={isUploading}
                      >
                         <ImagePlus size={32} color="#0D9488" />
                         <Text style={styles.galleryAddMoreText}>Add More</Text>
                      </TouchableOpacity>
                    )}
                 </ScrollView>
               </View>
             )}
          </View>
        );
      case 'squads':
        return (
          <View style={{ flex: 1, backgroundColor: '#F6F4F0', padding: 12 }}>
             {/* Squad Card */}
             <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' }}>
               <View style={styles.squadTeamsHeader}>
                  <View style={styles.squadTeamInfo}>
                     <Image source={{ uri: `https://ui-avatars.com/api/?name=${match.team_a}&background=0D9488&color=fff` }} style={styles.squadTeamLogo} />
                     <Text style={styles.squadTeamName}>{match.team_a}</Text>
                  </View>
                  <View style={[styles.squadTeamInfo, { justifyContent: 'flex-end', borderLeftWidth: 1, borderLeftColor: '#F3F4F6' }]}>
                     <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.squadTeamName}>{match.team_b}</Text>
                        <View style={styles.squadBannerBtn}><Text style={styles.squadBannerBtnText}>Get Squad Banner</Text></View>
                     </View>
                     <Image source={{ uri: `https://ui-avatars.com/api/?name=${match.team_b}&background=DC2626&color=fff` }} style={styles.squadTeamLogo} />
                  </View>
               </View>

               <View style={styles.playingSquadDivider}>
                  <Text style={styles.playingSquadText}>Playing Squad</Text>
               </View>

               <View style={{ flexDirection: 'row' }}>
                  {/* Team A Squad */}
                  <View style={{ flex: 1, borderRightWidth: 0.5, borderRightColor: '#F3F4F6' }}>
                     {squadA.map((m, idx) => (
                        <View key={m.id} style={styles.squadPlayerRow}>
                           <View style={styles.playerAvatarContainer}>
                              <Image 
                                source={{ uri: m.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${m.id}` }} 
                                style={styles.playerAvatar} 
                              />
                              {m.profiles?.player_type === 'pro' && <View style={styles.proMiniBadge}><Text style={styles.proMiniText}>PRO</Text></View>}
                              {m.role === 'captain' && <View style={styles.captMiniBadge}><Text style={styles.captMiniText}>C</Text></View>}
                           </View>
                           <View style={{ marginLeft: 8 }}>
                              <Text style={styles.playerNameText}>{m.player_name || m.profiles?.full_name || 'Player'}</Text>
                              <Text style={styles.playerRoleText}>{m.profiles?.player_type || 'Player'} • {m.role}</Text>
                           </View>
                        </View>
                     ))}
                     {squadA.length === 0 && <Text style={{ padding: 20, color: '#9CA3AF', textAlign: 'center' }}>No members found</Text>}
                  </View>

                  {/* Team B Squad */}
                  <View style={{ flex: 1 }}>
                     {squadB.map((m, idx) => (
                        <View key={m.id} style={[styles.squadPlayerRow, { flexDirection: 'row-reverse' }]}>
                           <View style={styles.playerAvatarContainer}>
                              <Image 
                                source={{ uri: m.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${m.id}b` }} 
                                style={styles.playerAvatar} 
                              />
                              {m.profiles?.player_type === 'pro' && <View style={styles.proMiniBadge}><Text style={styles.proMiniText}>PRO</Text></View>}
                              {m.role === 'captain' && <View style={styles.captMiniBadge}><Text style={styles.captMiniText}>C</Text></View>}
                           </View>
                           <View style={{ marginRight: 8, alignItems: 'flex-end' }}>
                              <Text style={styles.playerNameText}>{m.player_name || m.profiles?.full_name || 'Player'}</Text>
                              <Text style={styles.playerRoleText}>{m.profiles?.player_type || 'Player'} • {m.role}</Text>
                           </View>
                        </View>
                     ))}
                     {squadB.length === 0 && <Text style={{ padding: 20, color: '#9CA3AF', textAlign: 'center' }}>No members found</Text>}
                  </View>
               </View>
             </View>
          </View>
        );
      default: return null;
    }
  };

  return (
    <WebLayout noCard>
      <Stack.Screen options={{ title: `${match.team_a} vs ${match.team_b} - Live Score` }} />
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
           <TouchableOpacity 
             onPress={() => router.canGoBack() ? router.back() : router.push('/cricket')}
             style={{ padding: 8, marginLeft: -8 }}
           >
             <ChevronLeft size={24} color="#111827" />
           </TouchableOpacity>
           <Text style={styles.headerMainTitle}>{match.title || 'Individual Match'}</Text>
        </View>
        <View style={styles.headerRight}>
           <TouchableOpacity style={styles.headerAction}><Share2 size={20} color="#111827" /></TouchableOpacity>
           <TouchableOpacity style={styles.headerAction}><Settings size={20} color="#111827" /></TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 56, backgroundColor: '#FFFFFF' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContainerStyle}>
          {['Info', 'Summary', 'Scoreboard', 'Comms', 'Squads', 'Analysis', 'MVP', 'Gallery'].map((tab) => (
             <TouchableOpacity 
               key={tab} 
               style={[styles.tabBtnRaw, activeTab === tab.toLowerCase() && styles.tabBtnActiveRaw]}
               onPress={() => setActiveTab(tab.toLowerCase())}
             >
                <Text style={[styles.tabBtnTextRaw, activeTab === tab.toLowerCase() && styles.tabBtnTextActiveRaw]}>{tab}</Text>
             </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}

        {/* Footer */}
        <View style={styles.footer}>
           <Text style={styles.lastUpdated}>
             {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Waiting for updates...'}
           </Text>
           <Text style={styles.shareHint}>Share this page to let others follow live</Text>
        </View>
      </ScrollView>
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F6F4F0' },
  topHeader: { height: 56, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerMainTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  headerRight: { flexDirection: 'row', gap: 16 },
  headerAction: { padding: 4 },
  
  tabScroll: { backgroundColor: '#F3F4F6', marginHorizontal: 16, marginVertical: 8, borderRadius: 12 },
  tabContainerStyle: { paddingHorizontal: 4, height: 40, alignItems: 'center' },
  tabBtnRaw: { height: 32, paddingHorizontal: 16, marginHorizontal: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  tabBtnActiveRaw: { backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  tabBtnTextRaw: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabBtnTextActiveRaw: { color: '#111827' },
  
  scoreCard: { padding: 24, paddingBottom: 20 },
  resultBanner: { backgroundColor: '#FAEEDA', padding: 10, borderRadius: 8, marginBottom: 16, alignItems: 'center' },
  resultText: { color: '#633806', fontSize: 13, fontWeight: 'bold' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between' },
  battingTeamName: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  bigScore: { fontSize: 48, fontWeight: '900', color: '#FFFFFF' },
  oversCount: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
  targetBox: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12, alignItems: 'center', width: 120 },
  targetLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  targetValue: { fontSize: 28, fontWeight: '900', color: '#FFFFFF' },
  targetSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 20, flexWrap: 'wrap' },
  statPill: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statPillText: { fontSize: 12, color: '#FFFFFF' },
  dataSection: { backgroundColor: '#FFFFFF', margin: 12, marginBottom: 0, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8E6E0' },
  sectionTitle: { fontSize: 11, color: '#888780', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12 },
  tableHead: { flexDirection: 'row', backgroundColor: '#F6F4F0', padding: 8, borderRadius: 4 },
  headText: { fontSize: 11, color: '#888780', flex: 1, textAlign: 'right' },
  tableRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1EFE8' },
  cellText: { fontSize: 14, flex: 1, textAlign: 'right', color: '#111827' },
  ballList: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  ball: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  ballLabel: { fontSize: 12, fontWeight: 'bold' },
  bowlerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bowlerName: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  bowlerStats: { flexDirection: 'row', gap: 16 },
  bowlerStat: { fontSize: 13, color: '#6B7280' },
  tabScroll: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E8E6E0', flexGrow: 0 },
  tabContainerStyle: { paddingHorizontal: 16, paddingVertical: 12, gap: 10, flexDirection: 'row' },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F6F4F0' },
  tabBtnActive: { backgroundColor: '#111827' },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#888780' },
  tabBtnTextActive: { color: '#FFFFFF' },
  infoRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1EFE8', justifyContent: 'space-between' },
  infoLabel: { fontSize: 13, color: '#888780', fontWeight: '600' },
  infoValue: { fontSize: 13, color: '#111827', fontWeight: 'bold', flex: 1, textAlign: 'right', paddingLeft: 20 },
  squadsShortcut: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1EFE8',
    marginTop: 4,
  },
  squadsShortcutText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  infoHeading: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 },
  notesSection: { backgroundColor: '#F3F4F6', padding: 16, marginTop: 24 },
  notesTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 16 },
  teamNotesContainer: { backgroundColor: '#F9FAFB' },
  teamNotesHeader: { fontSize: 14, fontWeight: '700', color: '#111827', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  notesContent: { paddingVertical: 12, gap: 8 },
  noteText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  
  // Summary Tab
  pollBar: { backgroundColor: '#E0F2FE', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pollIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  pollText: { fontSize: 13, color: '#1E40AF', flex: 1 },
  summaryScoresCard: { backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  summaryTeamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryTeamName: { fontSize: 13, color: '#4B5563', marginBottom: 2 },
  summaryMainScore: { fontSize: 22, fontWeight: '800', color: '#111827' },
  summaryOvers: { fontSize: 14, color: '#9CA3AF', fontWeight: 'normal' },
  liveBadgeMini: { backgroundColor: '#DC2626', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveBadgeMiniText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  resultBadgeMini: { backgroundColor: '#374151', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  resultBadgeMiniText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  summaryResultText: { fontSize: 13, color: '#0D9488', fontWeight: 'bold', marginTop: 12 },
  summaryActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  summaryActionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center', backgroundColor: '#F9FAFB' },
  summaryActionBtnText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  sectionHeading: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 },
  milestoneCard: { backgroundColor: '#111827', borderRadius: 12, overflow: 'hidden' },
  milestoneImageContainer: { height: 160, position: 'relative' },
  milestoneImg: { width: '100%', height: '100%' },
  milestoneOverlay: { position: 'absolute', inset: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  proBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#0D9488', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  proBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  milestoneType: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  milestoneDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 12, lineHeight: 18 },
  congratulateBtn: { backgroundColor: '#0D9488', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  congratulateBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  heroCard: { height: 300, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.6)' },
  heroLabel: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  
  // Squads Tab
  squadTeamsHeader: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  squadTeamInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  squadTeamLogo: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6' },
  squadTeamName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  squadBannerBtn: { marginTop: 4, backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  squadBannerBtnText: { fontSize: 10, color: '#0D9488', fontWeight: 'bold' },
  playingSquadDivider: { backgroundColor: '#F3F4F6', paddingVertical: 8, alignItems: 'center' },
  playingSquadText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  squadPlayerRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  playerAvatarContainer: { position: 'relative' },
  playerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6' },
  proMiniBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#0D9488', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  proMiniText: { color: '#FFFFFF', fontSize: 8, fontWeight: 'bold' },
  captMiniBadge: { position: 'absolute', bottom: -2, left: -2, backgroundColor: '#111827', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  captMiniText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  playerNameText: { fontSize: 13, fontWeight: '700', color: '#111827' },
  playerRoleText: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  footer: { padding: 32, alignItems: 'center' },
  lastUpdated: { fontSize: 12, color: '#B4B2A9' },
  shareHint: { fontSize: 11, color: '#B4B2A9', marginTop: 4 },

  // Comms Styles
  commsFilterBar: { flexDirection: 'row', padding: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  commsFilterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F9FAF7', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  commsFilterText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  commsBallRow: { flexDirection: 'row', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F9FAF7' },
  commsBallLeft: { alignItems: 'center', width: 45, marginRight: 16 },
  commsOverNum: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  commsResultCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  commsResultText: { fontSize: 11, fontWeight: '800', color: '#4B5563' },
  bgWicket: { backgroundColor: '#EF4444', borderColor: '#DC2626' },
  bgBoundary: { backgroundColor: '#10B981', borderColor: '#059669' },
  bgExtra: { backgroundColor: '#F59E0B', borderColor: '#D97706' },
  commsBallRight: { flex: 1, justifyContent: 'center' },
  commsDescText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  wicketDetailBox: { marginTop: 8, padding: 8, backgroundColor: '#FEF2F2', borderRadius: 4, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  wicketDetailText: { fontSize: 12, color: '#B91C1C', fontStyle: 'italic' },
  overSummaryBlock: { margin: 12, padding: 16, backgroundColor: '#F3F4F6', borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  overBadge: { backgroundColor: '#111827', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginRight: 12 },
  overBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  overSummaryRuns: { flex: 1, fontSize: 13, fontWeight: '700', color: '#374151' },
  overSummaryScore: { fontSize: 15, fontWeight: '800', color: '#111827' },

  // Analysis Styles
  insightsBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#ECFEFF', borderBottomWidth: 1, borderBottomColor: '#CFFAFE' },
  insightsMsg: { fontSize: 13, color: '#0891B2', fontWeight: '600' },
  insightsBtnMain: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0D9488', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  insightsBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  analysisCard: { margin: 12, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  cardHeaderIcons: { flexDirection: 'row', alignItems: 'center' },
  chartLegend: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  manhattanContainer: { flexDirection: 'row', height: 220 },
  yAxis: { width: 20, justifyContent: 'space-between', paddingBottom: 35, alignItems: 'center' },
  yText: { fontSize: 10, color: '#9CA3AF' },
  chartArea: { flex: 1, marginLeft: 8 },
  overGroup: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginRight: 10, position: 'relative' },
  overBar: { width: 12, borderTopLeftRadius: 3, borderTopRightRadius: 3, position: 'relative' },
  wktBubble: { position: 'absolute', top: -25, left: -6, width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#3B82F6', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  wktBubbleText: { fontSize: 8, fontWeight: '800', color: '#111827' },
  xAxis: { height: 20, justifyContent: 'center', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  xAxisLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
  wagonWheelVisual: { height: 200, backgroundColor: '#0D9488', borderRadius: 12, overflow: 'hidden', position: 'relative', alignItems: 'center', justifyContent: 'flex-end' },
  groundCircle: { width: 350, height: 350, borderRadius: 175, backgroundColor: '#10B981', borderWidth: 8, borderColor: '#F97316', position: 'absolute', bottom: -175, alignItems: 'center' },
  pitchArea: { width: 30, height: 50, backgroundColor: '#FDE68A', borderRadius: 4, marginTop: 20, borderWidth: 1, borderColor: '#F59E0B' },
  boundaryLine: { position: 'absolute', top: 10, left: 10, right: 10, bottom: 10, borderRadius: 175, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderStyle: 'dashed' },
  innerCircle: { position: 'absolute', top: 60, left: 60, right: 60, bottom: 60, borderRadius: 175, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  noDataOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
  noDataText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  subLabel: { fontSize: 12, color: '#6B7280', marginBottom: 16 },

  // Scorecard Table Styles
  scWrapper: { backgroundColor: '#FFFFFF', marginTop: 8 },
  scHeader: { backgroundColor: '#043529', paddingVertical: 8, paddingHorizontal: 16 },
  scHeaderText: { color: '#01b854', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  scTable: { paddingBottom: 12 },
  scRowHead: { flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  scCol: { flex: 1, fontSize: 11, fontWeight: '700', color: '#9CA3AF', textAlign: 'center' },
  scRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F9FAFB', alignItems: 'center' },
  scPlayerName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  scDismissal: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  scVal: { flex: 1, fontSize: 12, color: '#374151', textAlign: 'center' },
  scExtrasRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center' },
  scExtrasLabel: { fontSize: 13, fontWeight: '800', color: '#111827', width: 60 },
  scExtrasVal: { flex: 1, fontSize: 12, color: '#6B7280' },
  scExtrasTotal: { fontSize: 13, fontWeight: '800', color: '#111827' },

  // MVP Styles
  mvpHeader: { padding: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'flex-end' },
  calcTrigger: { paddingHorizontal: 4, paddingVertical: 4 },
  calcTriggerText: { fontSize: 11, color: '#0D9488', fontWeight: 'bold' },
  mvpPlayerRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  mvpRankBox: { width: 30, alignItems: 'center' },
  mvpRankText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  mvpAvatarContainer: { position: 'relative', marginHorizontal: 12 },
  mvpAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6' },
  mvpProBadge: { position: 'absolute', top: -2, right: -4, backgroundColor: '#0D9488', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  mvpProText: { color: '#FFFFFF', fontSize: 8, fontWeight: 'bold' },
  mvpInfoBody: { flex: 1 },
  mvpPlayerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  mvpTeamName: { fontSize: 11, color: '#6B7280', marginTop: 2, fontStyle: 'italic' },
  mvpScoreBox: { paddingHorizontal: 8 },
  mvpScoreVal: { fontSize: 22, fontWeight: '400', color: '#111827' },

  // Gallery Styles
  emptyGalleryContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyGalleryIconBox: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyGalleryTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyGallerySub: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 32 },
  addPhotoBtnLarge: { backgroundColor: '#0D9488', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, elevation: 4 },
  addPhotoBtnLargeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  galleryItem: { width: '48%', height: 150, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F3F4F6' },
  galleryImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  galleryAddMore: { width: '48%', height: 150, borderRadius: 12, borderBasis: 1, borderStyle: 'dashed', borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  galleryAddMoreText: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginTop: 8 },
});
