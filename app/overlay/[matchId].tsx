import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

// ─── Ball pill ───────────────────────────────────────────
const BALL_COLORS: any = {
  dot:    { bg: 'rgba(255,255,255,0.15)', color: '#fff' },
  run:    { bg: 'rgba(100,180,255,0.35)', color: '#fff' },
  four:   { bg: 'rgba(100,180,255,0.6)',  color: '#fff' },
  six:    { bg: 'rgba(30,200,120,0.7)',   color: '#fff' },
  wicket: { bg: 'rgba(230,60,60,0.75)',   color: '#fff' },
  wide:   { bg: 'rgba(255,200,50,0.5)',   color: '#fff' },
  noball: { bg: 'rgba(255,200,50,0.5)',   color: '#fff' },
};

function Ball({ b }: { b: { type: string, label: string } }) {
  const s = BALL_COLORS[b.type] || BALL_COLORS.run;
  return (
    <View style={[styles.ball, { backgroundColor: s.bg }]}>
      <Text style={[styles.ballLabel, { color: s.color }]}>{b.label}</Text>
    </View>
  );
}

// ─── Separator ───────────────────────────────────────────
const Sep = () => (
  <View style={styles.separator} />
);

export default function OBSOverlay() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [live, setLive] = useState<any>(null);
  const [match, setMatch] = useState<any>(null);
  const [flashType, setFlashType] = useState<'four' | 'six' | 'wicket' | null>(null);
  
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!matchId) return;
    const load = async () => {
      const [{ data: m }, { data: l }] = await Promise.all([
        supabase.from('matches').select('*').eq('id', matchId).single(),
        supabase.from('match_live_state').select('*').eq('match_id', matchId).single(),
      ]);
      if (m) setMatch(m);
      if (l) setLive(l);
    };
    load();
  }, [matchId]);

  useEffect(() => {
    if (!matchId) return;
    const channel = supabase
      .channel(`obs-overlay-${matchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_live_state', filter: `match_id=eq.${matchId}` },
        (payload) => {
          const newData = payload.new;
          setLive(newData);
          
          const lastType = newData.last_ball_type;
          if (lastType === 'four' || lastType === 'six' || lastType === 'wicket') {
            triggerFlash(lastType);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  const triggerFlash = (type: 'four' | 'six' | 'wicket') => {
    setFlashType(type);
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setFlashType(null));
  };

  if (!live || !match) return null;

  const overBalls = Array.isArray(live.current_over_balls)
    ? live.current_over_balls
    : JSON.parse(live.current_over_balls || '[]');

  const oversLabel = `${Math.floor(live.legal_balls / 6)}.${live.legal_balls % 6} / ${live.overs_total}`;
  const isCompleted = live.match_status === 'completed';

  return (
    <View style={styles.overlayContainer}>
      {/* Flash Animation Overlay */}
      {flashType && (
        <Animated.View style={[
          styles.flashBox, 
          { 
            opacity: flashAnim, 
            transform: [{ scale: flashAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
            backgroundColor: flashType === 'six' ? 'rgba(15,110,86,0.95)'
                           : flashType === 'four' ? 'rgba(24,95,165,0.95)'
                           : 'rgba(200,30,30,0.95)'
          }
        ]}>
           <Text style={styles.flashText}>
             {flashType === 'six' ? 'SIX!' : flashType === 'four' ? 'FOUR!' : 'WICKET!'}
           </Text>
           <Text style={styles.flashSub}>
             {flashType === 'six' ? `${live.striker_name} hits a maximum` 
              : flashType === 'four' ? `${live.striker_name} finds the boundary`
              : `${live.bowler_name} gets the wicket`}
           </Text>
        </Animated.View>
      )}

      {/* Result Banner */}
      {isCompleted && live.result_text && (
        <View style={styles.resultBanner}>
           <Text style={styles.resultLabel}>Match Result</Text>
           <Text style={styles.resultValue}>🏆 {live.result_text}</Text>
        </View>
      )}

      {/* Bottom Scoreboard Bar */}
      <View style={styles.scoreBar}>
          {/* Team + Score */}
          <View style={{ minWidth: 150 }}>
            <Text style={styles.label}>{live.batting_team}</Text>
            <Text style={styles.scoreText}>{live.runs}/{live.wickets}</Text>
            <Text style={styles.subLabel}>{oversLabel} ov</Text>
          </View>

          <Sep />

          {/* Target */}
          {live.innings_number === 2 && live.target && (
            <>
              <View style={{ minWidth: 100, alignItems: 'center' }}>
                <Text style={styles.label}>Target</Text>
                <Text style={styles.targetValue}>{live.target}</Text>
                <Text style={styles.subLabel}>Need {Math.max(0, live.target - live.runs)}</Text>
              </View>
              <Sep />
            </>
          )}

          {/* CRR / RRR */}
          <View style={{ minWidth: 100, alignItems: 'center' }}>
            <Text style={styles.label}>CRR</Text>
            <Text style={styles.midValue}>{live.crr}</Text>
            {live.rrr && live.innings_number === 2 && (
              <Text style={styles.miniLabel}>RRR: {live.rrr}</Text>
            )}
          </View>

          <Sep />

          {/* Striker */}
          {live.striker_name && (
            <View style={{ minWidth: 160 }}>
              <Text style={styles.label}>{live.striker_name} *</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={styles.midValue}>{live.striker_runs}</Text>
                <Text style={styles.ballsCount}> ({live.striker_balls})</Text>
              </View>
              <Text style={styles.subLabel}>SR: {live.striker_balls > 0 ? Math.round(live.striker_runs / live.striker_balls * 100) : 0}</Text>
            </View>
          )}

          {/* Non-striker */}
          {live.nonstriker_name && (
            <View style={{ minWidth: 140, opacity: 0.75 }}>
              <Text style={styles.label}>{live.nonstriker_name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={[styles.midValue, { fontSize: 20 }]}>{live.nonstriker_runs}</Text>
                <Text style={[styles.ballsCount, { fontSize: 12 }]}> ({live.nonstriker_balls})</Text>
              </View>
            </View>
          )}

          <Sep />

          {/* Bowler */}
          {live.bowler_name && (
            <View style={{ minWidth: 150 }}>
              <Text style={styles.label}>{live.bowler_name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={[styles.midValue, { fontSize: 22 }]}>{live.bowler_wickets}/{live.bowler_runs}</Text>
                <Text style={[styles.ballsCount, { fontSize: 13 }]}> {live.bowler_overs} ov</Text>
              </View>
            </View>
          )}

          <Sep />

          {/* Timeline */}
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>This over</Text>
            <View style={styles.ballList}>
              {overBalls.length === 0 ? (
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>New over</Text>
              ) : (
                overBalls.map((b: any, i: number) => <Ball key={i} b={b} />)
              )}
            </View>
          </View>

          {/* Branding */}
          <View style={{ marginLeft: 16, opacity: 0.5 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900', textAlign: 'right' }}>BookYourGround</Text>
            <Text style={{ color: '#fff', fontSize: 9, opacity: 0.7, textAlign: 'right' }}>bookyourground.com</Text>
          </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: { flex: 1, backgroundColor: 'transparent', position: 'relative' },
  flashBox: {
    position: 'absolute', top: '35%', alignSelf: 'center',
    paddingHorizontal: 60, paddingVertical: 30, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, zIndex: 100
  },
  flashText: { fontSize: 80, fontWeight: '900', color: '#FFFFFF', textTransform: 'uppercase' },
  flashSub: { fontSize: 20, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
  resultBanner: {
    position: 'absolute', top: '30%', alignSelf: 'center',
    backgroundColor: 'rgba(8,80,65,0.95)', padding: 24, borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center'
  },
  resultLabel: { fontSize: 14, color: '#FFFFFF', opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  resultValue: { fontSize: 36, fontWeight: 'bold', color: '#FFFFFF' },
  scoreBar: {
    position: 'absolute', bottom: 40, left: 40, right: 40,
    backgroundColor: 'rgba(8,32,20,0.92)', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(8px)' } : {})
  },
  label: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  subLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  scoreText: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', lineHeight: 40 },
  midValue: { fontSize: 26, fontWeight: '900', color: '#FFFFFF' },
  targetValue: { fontSize: 30, fontWeight: '900', color: '#FFFFFF' },
  miniLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  ballsCount: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '400' },
  separator: { width: 1, height: 44, backgroundColor: 'rgba(255,255,255,0.2)', mx: 20, marginHorizontal: 20 },
  ballList: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  ball: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  ballLabel: { fontSize: 13, fontWeight: 'bold' },
});
