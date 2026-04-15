// hooks/useCricketScoring.ts
// Drop-in scoring engine adapted for BookYourGround
import { useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Ball {
  type: string;
  label: string;
  area?: string;
}

interface Batter {
  name: string;
  runs: number;
  balls: number;
  dots: number;
  fours: number;
  sixes: number;
  onStrike: boolean;
  status: 'batting' | 'out' | 'yet';
  out: boolean;
  dismissal: string;
  startTime?: number;
}

interface Bowler {
  name: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  maidens: number;
  overRuns: number;
  dots: number;
  fours: number;
  sixes: number;
}

interface InningState {
  battingTeam: string;
  bowlingTeam: string;
  battingPlayers: string[];
  bowlingPlayers: string[];
  runs: number;
  wickets: number;
  balls: number;
  legalBalls: number;
  extras: Record<string, number>;
  batters: Batter[];
  bowlers: Bowler[];
  currentBowlerIdx: number;
  overBalls: Ball[];
  allOvers: Ball[][];
  target: number | null;
  inningsId: string | null;
  lastBowlerName?: string | null;
  keeperName?: string | null;
}

const formatOvers = (legalBalls: number) =>
  `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;

const calcCRR = (runs: number, legalBalls: number) =>
  legalBalls > 0 ? parseFloat((runs / (legalBalls / 6)).toFixed(2)) : 0;

const calcRRR = (target: number, runs: number, legalBalls: number, totalOvers: number) => {
  const ballsLeft = totalOvers * 6 - legalBalls;
  if (ballsLeft <= 0) return null;
  const need = target - runs;
  return parseFloat((need / (ballsLeft / 6)).toFixed(2));
};

function initInning(battingTeam: string, bowlingTeam: string, battingPlayers: string[], bowlingPlayers: string[], target: number | null = null): InningState {
  return {
    battingTeam,
    bowlingTeam,
    battingPlayers,
    bowlingPlayers,
    runs: 0,
    wickets: 0,
    balls: 0,
    legalBalls: 0,
    extras: { wide: 0, noball: 0, bye: 0, legbye: 0, penalty: 0 },
    batters: battingPlayers.map((name, idx) => ({
      name,
      runs: 0,
      balls: 0,
      dots: 0,
      fours: 0,
      sixes: 0,
      onStrike: false,
      status: 'yet',
      out: false,
      dismissal: '',
      startTime: undefined
    })),
    bowlers: [],
    currentBowlerIdx: 0,
    overBalls: [],
    allOvers: [],
    target,
    inningsId: null
  };
}

export function useCricketScoring() {
  const savePlayingXi = useCallback(async (mid: string, teamId: string, players: any[], captainId?: string) => {
    console.log('[useCricketScoring] Saving Playing XI for match:', mid, 'team:', teamId, 'players:', players.length, 'captain:', captainId);
    await supabase.from('match_playing_xi').delete().eq('match_id', mid).eq('team_id', teamId);
    const rows = players.map(p => ({ 
      match_id: mid, 
      team_id: teamId, 
      player_id: p.id,
      is_captain: p.id === captainId 
    }));
    if (rows.length > 0) {
      await supabase.from('match_playing_xi').insert(rows);
    }
  }, []);
  const { session } = useAuth();
  const [matchId, setMatchId] = useState<string | null>(null);
  const [matchConfig, setConfig] = useState<any>(null);
  const [inningsList, setInningsList] = useState<[InningState | null, InningState | null]>([null, null]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<'setup' | 'toss' | 'live' | 'innings_break' | 'completed'>('setup');
  const [result, setResult] = useState<string | null>(null);
  const historyRef = useRef<InningState[]>([]);

  const inn = inningsList[currentIdx];

  const setInn = (updater: InningState | ((prev: InningState) => InningState)) => {
    setInningsList(prev => {
      const next = [...prev] as [InningState | null, InningState | null];
      const current = prev[currentIdx];
      if (!current) return prev;
      next[currentIdx] = typeof updater === 'function' ? updater(current) : updater;
      return next;
    });
  };

  const pushLiveState = useCallback(async (innState: InningState, cfg: any, mid: string, extraResult: string | null = null) => {
    if (!mid) return;
    const striker = innState.batters.find(b => b.onStrike && !b.out && b.status === 'batting');
    const nonStriker = innState.batters.find(b => !b.onStrike && !b.out && b.status === 'batting');
    const bowler = innState.bowlers[innState.currentBowlerIdx];
    const lastBall = innState.overBalls[innState.overBalls.length - 1];

    const payload = {
      match_id: mid,
      innings_number: currentIdx + 1,
      batting_team: innState.battingTeam,
      bowling_team: innState.bowlingTeam,
      runs: innState.runs,
      wickets: innState.wickets,
      legal_balls: innState.legalBalls,
      overs_total: cfg?.overs,
      target: innState.target,
      crr: calcCRR(innState.runs, innState.legalBalls),
      rrr: innState.target
        ? calcRRR(innState.target, innState.runs, innState.legalBalls, cfg?.overs)
        : null,
      striker_name: striker?.name ?? null,
      striker_runs: striker?.runs ?? 0,
      striker_balls: striker?.balls ?? 0,
      striker_fours: striker?.fours ?? 0,
      striker_sixes: striker?.sixes ?? 0,
      nonstriker_name: nonStriker?.name ?? null,
      nonstriker_runs: nonStriker?.runs ?? 0,
      nonstriker_balls: nonStriker?.balls ?? 0,
      nonstriker_fours: nonStriker?.fours ?? 0,
      nonstriker_sixes: nonStriker?.sixes ?? 0,
      bowler_name: bowler?.name ?? null,
      bowler_overs: bowler ? `${bowler.overs}.${bowler.balls}` : '0.0',
      bowler_runs: bowler?.runs ?? 0,
      bowler_wickets: bowler?.wickets ?? 0,
      bowler_maidens: bowler?.maidens ?? 0,
      last_ball_label: lastBall?.label ?? null,
      last_ball_type: lastBall?.type ?? null,
      current_over_balls: JSON.stringify(innState.overBalls),
      match_status: extraResult ? 'completed' : 'live',
      result_text: extraResult ?? null,
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from('match_live_state')
      .upsert(payload, { onConflict: 'match_id' });
  }, [currentIdx]);

  const logBall = useCallback(async (innState: InningState, ballData: any, mid: string) => {
    if (!mid || !innState.inningsId) return;
    const overNum = Math.floor(innState.legalBalls / 6);
    const ballNum = innState.overBalls.length;
    const bowler = innState.bowlers[innState.currentBowlerIdx];
    
    // Find the striker. If this is a wicket ball, the ballData might specify the dismissed batter
    const striker = ballData.batter_name 
      ? { name: ballData.batter_name } 
      : innState.batters.find(b => b.onStrike && !b.out && b.status === 'batting');

    await supabase.from('ball_log').insert({
      match_id: mid,
      innings_id: innState.inningsId,
      over_number: overNum,
      ball_number: ballNum,
      runs: ballData.runs ?? 0,
      extras: ballData.extras ?? 0,
      extra_type: ballData.extraType ?? null,
      is_wicket: ballData.isWicket ?? false,
      dismissal_type: ballData.dismissalType ?? null,
      batter_name: striker?.name ?? null,
      bowler_name: bowler?.name ?? null,
      fielder_name: ballData.fielder ?? null,
      label: ballData.label,
      ball_type: ballData.type,
      wagon_wheel_area: ballData.area ?? null,
    });
  }, []);

  const createMatch = useCallback(async (config: any) => {
    const { data, error } = await supabase
      .from('matches')
      .insert({
        owner_id: session?.user?.id,
        title: `${config.teamA} vs ${config.teamB}`,
        team_a: config.teamA,
        team_b: config.teamB,
        team_a_id: config.teamAId,
        team_b_id: config.teamBId,
        overs: config.overs,
        players: config.players,
        venue: config.venue,
        match_type: config.matchType,
        status: 'toss',
      })
      .select()
      .single();
    if (error) { console.error('createMatch error', error); return null; }
    setMatchId(data.id);
    setConfig(config);
    console.log('[useCricketScoring] Match created:', data.id);

    return data.id;
  }, [session]);

  const createInningsRow = useCallback(async (mid: string, innNum: number, batting: string, bowling: string, bPlayers: string[], blPlayers: string[], target: number | null = null) => {
    const { data, error } = await supabase
      .from('innings')
      .insert({
        match_id: mid,
        innings_number: innNum,
        batting_team: batting,
        bowling_team: bowling,
        batting_players: bPlayers,
        bowling_players: blPlayers,
        target,
      })
      .select()
      .single();
    if (error) { console.error('[useCricketScoring] createInningsRow error:', error, 'Params:', { mid, innNum, batting }); return null; }
    return data.id;
  }, []);

  const startMatch = useCallback(async (config: any, tossWinner: string, tossChoice: 'bat' | 'bowl', openers?: { striker: string, nonStriker: string, bowler: string, keeper: string }, existingMatchId?: string) => {
    console.log('[useCricketScoring] startMatch called. existingMatchId:', existingMatchId);
    const battingFirst = tossChoice === 'bat';
    const battingTeam = tossWinner === config.teamA
      ? (battingFirst ? config.teamA : config.teamB)
      : (battingFirst ? config.teamB : config.teamA);
    const bowlingTeam = battingTeam === config.teamA ? config.teamB : config.teamA;

    // Use existing ID if provided, otherwise create new match
    let mid = existingMatchId;
    if (!mid) {
      mid = await createMatch(config);
    } else {
      // If using existing, at least update it with current config
      await supabase.from('matches').update({
        title: `${config.teamA} vs ${config.teamB}`,
        team_a: config.teamA,
        team_b: config.teamB,
        overs: config.overs,
        venue: config.venue,
        match_type: config.matchType
      }).eq('id', mid);
    }

    if (!mid) return;
    
    // Check if inning 1 already exists for this match
    const { data: existingInnings } = await supabase.from('innings').select('*').eq('match_id', mid).eq('innings_number', 1).maybeSingle();
    
    let innId;
    if (existingInnings) {
      innId = existingInnings.id;
    } else {
      innId = await createInningsRow(mid, 1, battingTeam, bowlingTeam, 
        battingTeam === config.teamA ? config.teamAPlayers : config.teamBPlayers,
        bowlingTeam === config.teamA ? config.teamAPlayers : config.teamBPlayers
      );
    }
    
    const innObj = initInning(battingTeam, bowlingTeam, 
      battingTeam === config.teamA ? config.teamAPlayers : config.teamBPlayers,
      bowlingTeam === config.teamA ? config.teamAPlayers : config.teamBPlayers
    );
    innObj.inningsId = innId;

    // Apply openers directly so they appear immediately on the scoring screen
    if (openers) {
      innObj.batters = innObj.batters.map(b => {
        if (b.name === openers.striker) return { ...b, status: 'batting' as const, onStrike: true, startTime: Date.now() };
        if (b.name === openers.nonStriker) return { ...b, status: 'batting' as const, onStrike: false, startTime: Date.now() };
        return b;
      });
      if (!innObj.batters.find(b => b.name === openers.striker)) {
        innObj.batters.push({ name: openers.striker, runs: 0, balls: 0, dots: 0, fours: 0, sixes: 0, onStrike: true, status: 'batting', out: false, dismissal: '', startTime: Date.now() });
      }
      if (!innObj.batters.find(b => b.name === openers.nonStriker)) {
        innObj.batters.push({ name: openers.nonStriker, runs: 0, balls: 0, dots: 0, fours: 0, sixes: 0, onStrike: false, status: 'batting', out: false, dismissal: '', startTime: Date.now() });
      }
      const newBowler: Bowler = { name: openers.bowler, overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0, overRuns: 0, dots: 0, fours: 0, sixes: 0 };
      innObj.bowlers = [newBowler];
      innObj.currentBowlerIdx = 0;
      innObj.keeperName = openers.keeper;
    }

    await supabase.from('matches').update({ status: 'live', toss_winner: tossWinner, toss_choice: tossChoice }).eq('id', mid);

    setInningsList([innObj, null]);
    setCurrentIdx(0);
          await pushLiveState(innObj, config, mid);
      setPhase('live');
    return {
    matchId: mid, inn: innObj };
  }, [createMatch, createInningsRow]);

  const rotateStrike = (batters: Batter[]) => {
    const active = batters.filter(b => b.status === 'batting' && !b.out);
    if (active.length === 0) return batters;
    if (active.length === 1) {
      return batters.map(b => (b.status === 'batting' && !b.out) ? { ...b, onStrike: true } : b);
    }
    // Exactly 2 active: flip them
    return batters.map(b => {
      if (b.status === 'batting' && !b.out) {
        return {
    ...b, onStrike: !b.onStrike };
      }
      return b;
    });
  };

  const snapshot = (innState: InningState) => {
    historyRef.current.push(JSON.parse(JSON.stringify(innState)));
    if (historyRef.current.length > 30) historyRef.current.shift();
  };

  const declareInnings = useCallback(async () => {
    if (!inn) return;
    const confirm = typeof window !== 'undefined' ? window.confirm('Are you sure you want to declare/end this innings?') : true;
    if (!confirm) return;

    if (currentIdx === 0) {
      await supabase.from('innings').update({ 
        status: 'completed', 
        runs: inn.runs, 
        wickets: inn.wickets, 
        legal_balls: inn.legalBalls 
      }).eq('id', inn.inningsId);
      
      await supabase.from('matches').update({ status: 'innings_break' }).eq('id', matchId!);
      setPhase('innings_break');
      // setPhase handles the UI switch; setIsScoring is component-side state
      // setIsScoring(false); 

    } else {
      // End match result logic
      const inn1 = inningsList[0]!;
      let resultText;
      const totalPlayers = Number(matchConfig?.players || 11);
      const actualMaxWickets = Math.min(totalPlayers - 1, 10);
      
      if (inn.target && inn.runs >= inn.target) {
        const wktsLeft = actualMaxWickets - inn.wickets;
        resultText = `${inn.battingTeam} won by ${Math.max(1, wktsLeft)} wicket${wktsLeft !== 1 ? 's' : ''}`;
      } else {
        const runDiff = (inn.target || 0) - inn.runs - 1;
        if (runDiff === -1) resultText = 'Match Tied';
        else resultText = `${inn1.battingTeam} won by ${runDiff} run${runDiff !== 1 ? 's' : ''}`;
      }
      
      await supabase.from('innings').update({ 
        status: 'completed', 
        runs: inn.runs, 
        wickets: inn.wickets, 
        legal_balls: inn.legalBalls 
      }).eq('id', inn.inningsId);
      
      await supabase.from('matches').update({ status: 'completed' }).eq('id', matchId!);
      await pushLiveState(inn, matchConfig, matchId!, resultText);
      setResult(resultText);
      setPhase('completed');
      // setIsScoring(false); 

    }
  }, [inn, currentIdx, inningsList, matchId, matchConfig, pushLiveState]);

  const checkEnd = useCallback(async (innState: InningState, cfg: any, mid: string, ignoreAllOut: boolean = false) => {
    const totalPlayers = Number(cfg?.players || 11);
    const matchOvers = Number(cfg?.overs || 20);

    // Innings ends if:
    // 1. Overs are completed (e.g., 120 balls for a 20 over match)
    const oversUp = matchOvers > 0 && innState.legalBalls >= matchOvers * 6;
    
    // 2. All out conditions:
    const activeBatters = innState.batters.filter(b => b.status === 'batting' && !b.out).length;
    const yetToBatCount = innState.batters.filter(b => b.status === 'yet').length;
    
    // Standard rule: 10 wickets is all out regardless of team size
    const absoluteAllOut = innState.wickets >= 10;
    
    // Amateur/Custom rule: if we have fewer than 11 players, we are all out when we run out of partners
    // (Needs at least 2 people to continue batting, or at least 1 person available in the dugout)
    const teamAllOut = innState.wickets >= (totalPlayers - 1) && yetToBatCount === 0 && activeBatters < 2;
    
    // An innings ends if:
    // 1. They reached absolute all-out (10 wickets)
    // 2. They reached team all-out based on current squad size
    const allOut = !ignoreAllOut && (absoluteAllOut || teamAllOut);

    const chaseWon = currentIdx === 1 && innState.target && innState.runs >= innState.target;
    
    if (!allOut && !oversUp && !chaseWon) return false;

    if (currentIdx === 0) {
      // End of first innings
      await supabase.from('innings').update({ 
        status: 'completed', 
        runs: innState.runs, 
        wickets: innState.wickets, 
        legal_balls: innState.legalBalls 
      }).eq('id', innState.inningsId);
      
      await supabase.from('matches').update({ status: 'innings_break' }).eq('id', mid);
      setPhase('innings_break');
    } else {
      // End of second innings (Match Result)
      const inn1 = inningsList[0]!;
      let resultText;
      const actualMaxWickets = Math.min(totalPlayers - 1, 10);
      
      if (chaseWon) {
        const wktsLeft = actualMaxWickets - innState.wickets;
        resultText = `${innState.battingTeam} won by ${Math.max(1, wktsLeft)} wicket${wktsLeft !== 1 ? 's' : ''}`;
      } else {
        const runDiff = (innState.target || 0) - innState.runs - 1;
        if (runDiff === -1) {
           resultText = 'Match Tied';
        } else {
           resultText = `${inn1.battingTeam} won by ${runDiff} run${runDiff !== 1 ? 's' : ''}`;
        }
      }
      
      await supabase.from('innings').update({ 
        status: 'completed', 
        runs: innState.runs, 
        wickets: innState.wickets, 
        legal_balls: innState.legalBalls 
      }).eq('id', innState.inningsId);
      
      await supabase.from('matches').update({ status: 'completed' }).eq('id', mid);
      await pushLiveState(innState, cfg, mid, resultText);
      setResult(resultText);
      setPhase('completed');
    }
    return true;
  }, [currentIdx, inningsList, pushLiveState]);

  const handleOverEnd = useCallback((innState: InningState) => {
    const bowler = { ...innState.bowlers[innState.currentBowlerIdx] };
    if (bowler.overRuns === 0 && (innState.legalBalls % 6 === 0)) bowler.maidens++; 
    bowler.overRuns = 0;
    
    const newBowlers = innState.bowlers.map((b, i) =>
      i === innState.currentBowlerIdx ? bowler : b
    );
    const allOvers = [...(innState.allOvers || []), [...innState.overBalls]];
    return {
      ...innState, 
      bowlers: newBowlers, 
      allOvers, 
      overBalls: [],
      lastBowlerName: bowler.name
    };
  }, []);

  const addBall = useCallback(async (runs: number, area?: string) => {
    if (!inn) return;
    snapshot(inn);
    let next = { ...inn, batters: inn.batters.map(b => ({ ...b })), bowlers: inn.bowlers.map(b => ({ ...b })) };
    let strikerIdx = next.batters.findIndex(b => b.onStrike && !b.out && b.status === 'batting');
    
    // Safety check: if no one is on strike, pick the first batting player
    if (strikerIdx === -1) {
      const firstBatting = next.batters.findIndex(b => !b.out && b.status === 'batting');
      if (firstBatting !== -1) {
        next.batters[firstBatting].onStrike = true;
        strikerIdx = firstBatting;
      }
    }

    const bowlerIdx = next.currentBowlerIdx;

    next.runs += runs;
    next.balls += 1;
    next.legalBalls += 1;
    
    if (strikerIdx !== -1) {
      next.batters[strikerIdx].runs += runs;
      next.batters[strikerIdx].balls += 1;
      if (runs === 0) next.batters[strikerIdx].dots += 1;
      if (runs === 4) next.batters[strikerIdx].fours += 1;
      if (runs === 6) next.batters[strikerIdx].sixes += 1;
    }

    if (bowlerIdx !== -1 && next.bowlers[bowlerIdx]) {
      next.bowlers[bowlerIdx].runs += runs;
      next.bowlers[bowlerIdx].balls += 1;
      if (runs === 0) {
        next.bowlers[bowlerIdx].dots = (next.bowlers[bowlerIdx].dots || 0) + 1;
      }
      if (runs === 4) {
        next.bowlers[bowlerIdx].fours = (next.bowlers[bowlerIdx].fours || 0) + 1;
      }
      if (runs === 6) {
        next.bowlers[bowlerIdx].sixes = (next.bowlers[bowlerIdx].sixes || 0) + 1;
      }
      next.bowlers[bowlerIdx].overRuns = (next.bowlers[bowlerIdx].overRuns || 0) + runs;
      
      // Auto-increment over if 6 balls reached
      if (next.bowlers[bowlerIdx].balls >= 6) {
        next.bowlers[bowlerIdx].overs += 1;
        next.bowlers[bowlerIdx].balls = 0;
      }
    }

    const ballType = runs === 4 ? 'four' : runs === 6 ? 'six' : runs === 0 ? 'dot' : 'run';
    const ballLabel = runs === 0 ? '•' : String(runs);
    next.overBalls = [...next.overBalls, { type: ballType, label: ballLabel, area }];

    if (runs % 2 === 1) next.batters = rotateStrike(next.batters);

    if (next.legalBalls > 0 && next.legalBalls % 6 === 0) {
      next = handleOverEnd(next);
      next.batters = rotateStrike(next.batters);
    }

    setInn(next);
    await logBall(next, { runs, type: ballType, label: ballLabel, area }, matchId!);
    await pushLiveState(next, matchConfig, matchId!);
    await checkEnd(next, matchConfig, matchId!);

    return next;
  }, [inn, matchId, matchConfig, handleOverEnd, logBall, pushLiveState, checkEnd]);

  const addExtra = useCallback(async (type: string, additionalRuns: number = 0) => {
    if (!inn) return;
    snapshot(inn);
    let next = { ...inn, batters: inn.batters.map(b => ({ ...b })), bowlers: inn.bowlers.map(b => ({ ...b })) };
    const bowlerIdx = next.currentBowlerIdx;
    const labels: Record<string, string> = { wide: 'Wd', noball: 'Nb', bye: 'B', legbye: 'LB', penalty: 'P' };
    const ballType = type === 'wide' ? 'wide' : type === 'noball' ? 'noball' : 'run';

    // Calculation: 
    // Wide/NB: 1 (base) + additionalRuns
    // Bye/LB/Penalty: additionalRuns (if any, typically >= 1)
    const baseExtra = (type === 'wide' || type === 'noball') ? 1 : 0;
    const totalRuns = baseExtra + additionalRuns;

    next.runs += totalRuns;
    next.extras[type] = (next.extras[type] || 0) + totalRuns;
    
    const isLegalBall = type !== 'wide' && type !== 'noball';

    if (bowlerIdx !== -1 && next.bowlers[bowlerIdx]) {
      // Wides and No-balls count as runs against the bowler
      // Byes and Leg-byes do NOT count against the bowler
      if (type === 'wide' || type === 'noball') {
        next.bowlers[bowlerIdx].runs += totalRuns;
        next.bowlers[bowlerIdx].overRuns = (next.bowlers[bowlerIdx].overRuns || 0) + totalRuns;
        // Count dots for wides with 0 additional runs (1 run total) is not standard,
        // but let's count boundaries if they happened on extras
        if (additionalRuns === 4) next.bowlers[bowlerIdx].fours += 1;
        if (additionalRuns === 6) next.bowlers[bowlerIdx].sixes += 1;
      }

      if (isLegalBall) {
        next.bowlers[bowlerIdx].balls += 1;
        // Byes and Leg-byes are dot balls for the bowler since they concede 0 runs
        if (additionalRuns === 0 || type === 'bye' || type === 'legbye') {
           next.bowlers[bowlerIdx].dots = (next.bowlers[bowlerIdx].dots || 0) + 1;
        }
        if (next.bowlers[bowlerIdx].balls >= 6) {
          next.bowlers[bowlerIdx].overs += 1;
          next.bowlers[bowlerIdx].balls = 0;
        }
      }
    }

    // Batter stats for No-balls or legal balls with extras (like LB but runs counted)
    const strikerIdx = next.batters.findIndex(b => b.onStrike && !b.out && b.status === 'batting');
    if (strikerIdx !== -1) {
       // On a no-ball, the batter's runs are the additionalRuns
       // On a no-ball, the batter ALSO faces a ball
       if (type === 'noball') {
         next.batters[strikerIdx].runs += additionalRuns;
         next.batters[strikerIdx].balls += 1;
         if (additionalRuns === 4) next.batters[strikerIdx].fours += 1;
         if (additionalRuns === 6) next.batters[strikerIdx].sixes += 1;
         if (additionalRuns === 0) next.batters[strikerIdx].dots += 1;
       }
       // Note: Wides are NOT counted as balls faced for batter.
       // Byes/Leg-byes ARE balls faced but 0 runs for batter.
       if (type === 'bye' || type === 'legbye') {
         next.batters[strikerIdx].balls += 1;
         next.batters[strikerIdx].dots += 1;
       }
    }

    const label = additionalRuns > 0 ? `${labels[type]}${additionalRuns}` : labels[type];
    next.overBalls = [...next.overBalls, { type: ballType, label }];

    if (isLegalBall) {
      next.balls += 1;
      next.legalBalls += 1;
      if (next.legalBalls > 0 && next.legalBalls % 6 === 0) {
        next = handleOverEnd(next);
        next.batters = rotateStrike(next.batters);
      }
    }

    // Strike rotation for odd runs (Byes/Leg-byes also rotate strike)
    if (totalRuns % 2 === 1) {
       next.batters = rotateStrike(next.batters);
    }

    setInn(next);
    await logBall(next, { runs: totalRuns, extras: totalRuns, extraType: type, type: ballType, label }, matchId!);
    await pushLiveState(next, matchConfig, matchId!);
    await checkEnd(next, matchConfig, matchId!);
  }, [inn, matchId, matchConfig, handleOverEnd, logBall, pushLiveState, checkEnd]);

  const addWicket = useCallback(async ({ dismissedName, dismissalType, fielder, newBatterName }: any) => {
    if (!inn) return;
    snapshot(inn);
    let next = { ...inn, batters: inn.batters.map(b => ({ ...b })), bowlers: inn.bowlers.map(b => ({ ...b })) };
    const bowlerIdx = next.currentBowlerIdx;
    const dismissedIdx = next.batters.findIndex(b => b.name === dismissedName);

    if (dismissedIdx !== -1) {
      next.batters[dismissedIdx].out = true;
      next.batters[dismissedIdx].status = 'out';
      next.batters[dismissedIdx].onStrike = false;
      const bwrName = next.bowlers[bowlerIdx]?.name || 'Unknown';
      next.batters[dismissedIdx].dismissal = `${dismissalType} b ${bwrName}`;
      
      next.wickets += 1;
      if (bowlerIdx !== -1 && next.bowlers[bowlerIdx]) {
        next.bowlers[bowlerIdx].wickets += 1;
        // Wicket balls are also dot balls for the bowler (unless they concede runs)
        next.bowlers[bowlerIdx].dots = (next.bowlers[bowlerIdx].dots || 0) + 1;
      }
      
      next.balls += 1;
      next.legalBalls += 1;
      next.overBalls = [...next.overBalls, { type: 'wicket', label: 'W' }];
      
      await logBall(next, { isWicket: true, dismissalType, fielder, type: 'wicket', label: 'W', batter_name: dismissedName }, matchId!);

      if (next.legalBalls > 0 && next.legalBalls % 6 === 0) {
        next = handleOverEnd(next);
      }
    }

    if (newBatterName) {
      const someoneElseOnStrike = next.batters.find(b => b.onStrike && b.status === 'batting' && !b.out);
      const shouldTakeStrike = !someoneElseOnStrike;

      let bIdx = next.batters.findIndex(b => b.name.toLowerCase() === newBatterName.toLowerCase());
      if (bIdx === -1) {
        const newBatter: Batter = {
          name: newBatterName, runs: 0, balls: 0, dots: 0, fours: 0, sixes: 0,
          onStrike: !!shouldTakeStrike, status: 'batting', out: false, dismissal: '', startTime: Date.now()
        };
        next.batters.push(newBatter);
      } else {
        next.batters[bIdx].status = 'batting';
        next.batters[bIdx].onStrike = !!shouldTakeStrike;
        next.batters[bIdx].out = false;
        if (!next.batters[bIdx].startTime) next.batters[bIdx].startTime = Date.now();
      }
    }

    setInn(next);
    await pushLiveState(next, matchConfig, matchId!);
    
    // If we just added a new batter, use a temporary config override to ensure checkEnd doesn't see us as 'All Out'
    const effectiveConfig = { ...matchConfig };
    if (newBatterName && effectiveConfig.players) {
        // If we are choosing a new batter, we are obviously not all out yet
        // However, we still call checkEnd to see if the OVERS are finished
    }

    // Crucially: If a new batter was JUST provided, we are definitely NOT all out.
    // We pass a boolean to ignore the all-out check temporarily if needed.
    // Or just check overs.
    await checkEnd(next, effectiveConfig, matchId!, !!newBatterName);
  }, [inn, matchId, matchConfig, handleOverEnd, logBall, pushLiveState, checkEnd]);

  const addNewBowler = useCallback((name: string) => {
    setInn(prev => {
      if (prev.lastBowlerName && prev.lastBowlerName.toLowerCase() === name.toLowerCase()) {
        if (typeof window !== 'undefined') alert('Same bowler cannot bowl consecutive overs!');
        return prev;
      }
      const exists = prev.bowlers.find(b => b.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        const limit = parseInt(matchConfig?.oversPerBowler || '0');
        if (limit > 0 && exists.overs >= limit) {
          if (typeof window !== 'undefined') alert(`Bowler ${name} already bowled their limit of ${limit} overs!`);
          return prev;
        }
        return {
    ...prev, currentBowlerIdx: prev.bowlers.indexOf(exists) };
      }
      const newBowler: Bowler = {
        name, overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0, overRuns: 0
      };
      const nextBowlers = [...prev.bowlers, newBowler];
      return {
    ...prev, bowlers: nextBowlers, currentBowlerIdx: nextBowlers.length - 1 };
    });
  }, []);

  const changeBowler = useCallback((bowlerIdx: number) => {
    setInn(prev => ({ ...prev, currentBowlerIdx: bowlerIdx }));
  }, []);

  const undoLastBall = useCallback(async () => {
    if (historyRef.current.length === 0) {
      console.log('[useCricketScoring] Undo failed: No history available');
      return false;
    }
    const prev = historyRef.current.pop()!;
    console.log('[useCricketScoring] Undoing to state:', prev.runs, '-', prev.wickets);
    setInn(prev);
    
    // 1. Sync live state back to previous
    await pushLiveState(prev, matchConfig, matchId!);
    
    // 2. Delete the last ball from Supabase
    const { data: lastBalls } = await supabase
      .from('ball_log')
      .select('id')
      .eq('match_id', matchId!)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (lastBalls && lastBalls[0]) {
      console.log('[useCricketScoring] Deleting ball ID:', lastBalls[0].id);
      await supabase.from('ball_log').delete().eq('id', lastBalls[0].id);
    }
    
    return true;
  }, [matchId, matchConfig, pushLiveState]);

  const startSecondInnings = useCallback(async () => {
    if (!inningsList[0]) return;
    const inn1 = inningsList[0];
    const battingTeam = inn1.bowlingTeam;
    const bowlingTeam = inn1.battingTeam;
    const battingPlayers = inn1.bowlingPlayers;
    const bowlingPlayers = inn1.battingPlayers;
    const target = inn1.runs + 1;

    const innId = await createInningsRow(matchId!, 2, battingTeam, bowlingTeam, battingPlayers, bowlingPlayers, target);
    const inn2 = initInning(battingTeam, bowlingTeam, battingPlayers, bowlingPlayers, target);
    inn2.target = target;

    await supabase.from('matches').update({ status: 'live' }).eq('id', matchId!);

    setInningsList([inningsList[0], inn2]);
    setCurrentIdx(1);
    await pushLiveState(inn2, matchConfig, matchId!);
    setPhase('live');
    historyRef.current = [];
  }, [inningsList, matchConfig, matchId, createInningsRow]);

  const setOpeners = useCallback(async (strikerName: string, nonStrikerName: string, bowlerName: string, keeperName?: string) => {
    if (!inn) return;
    setInn(prev => {
      const next = { ...prev, batters: prev.batters.map(b => ({ ...b })), bowlers: prev.bowlers.map(b => ({ ...b })), keeperName };
      
      // Reset all batters to 'yet' first
      next.batters = next.batters.map(b => ({ ...b, status: 'yet', onStrike: false }));
      
      const sIdx = next.batters.findIndex(b => b.name === strikerName);
      const nsIdx = next.batters.findIndex(b => b.name === nonStrikerName);
      
      if (sIdx !== -1) {
        next.batters[sIdx].status = 'batting';
        next.batters[sIdx].onStrike = true;
      }
      if (nsIdx !== -1) {
        next.batters[nsIdx].status = 'batting';
        next.batters[nsIdx].onStrike = false;
      }

      let bIdx = next.bowlers.findIndex(b => b.name === bowlerName);
      if (bIdx === -1) {
        const newBowler: Bowler = { name: bowlerName, overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0, overRuns: 0 };
        next.bowlers.push(newBowler);
        bIdx = next.bowlers.length - 1;
      }
      next.currentBowlerIdx = bIdx;

      return next;
    });
  }, [inn]);

    const resumeMatch = useCallback(async (mid: string, isRecovery = false) => {
    try {
      console.log('[useCricketScoring] Attempting resume for:', mid);
      
      const { data: m, error: mErr } = await supabase.from('matches').select('*').eq('id', mid).maybeSingle();
      if (mErr) {
        console.error('[useCricketScoring] Error fetching match:', mErr);
        return false;
      }
      if (!m) {
        console.warn('[useCricketScoring] No match found for ID:', mid);
        return false;
      }
      console.log('[useCricketScoring] Match data loaded:', m.title);

      const { data: live, error: liveErr } = await supabase.from('match_live_state').select('*').eq('match_id', mid).maybeSingle();
      if (liveErr) console.error('[useCricketScoring] Error fetching live state (non-fatal):', liveErr);
      console.log('[useCricketScoring] Live state:', live ? 'present' : 'absent');

            // 2. Fetch Playing XI (joined with team_members for names)
      const { data: xiRows } = await supabase
        .from('match_playing_xi')
        .select(`
          *,
          team_members:player_id (
            player_name
          )
        `)
        .eq('match_id', mid);
      
      const { data: allInnings, error: innErr } = await supabase.from('innings').select('*').eq('match_id', mid).order('innings_number', { ascending: true });
      if (innErr) {
        console.error('[useCricketScoring] Error fetching innings:', innErr);
        return {
    status: 'error' };
      }
      // 3. Construct Config early so it's available even if innings are missing
            const config = {
        teamA: m.team_a,
        teamB: m.team_b,
        teamAId: m.team_a_id,
        teamBId: m.team_b_id,
        teamAPlayers: (xiRows && xiRows.length > 0)
          ? xiRows.filter(r => r.team_id === m.team_a_id).map(r => r.team_members?.player_name || 'Player').filter(Boolean)
          : (allInnings && allInnings.length > 0) ? (allInnings[0].batting_team === m.team_a ? allInnings[0].batting_players : allInnings[0].bowling_players) : [],
        teamBPlayers: (xiRows && xiRows.length > 0)
          ? xiRows.filter(r => r.team_id === m.team_b_id).map(r => r.team_members?.player_name || 'Player').filter(Boolean)
          : (allInnings && allInnings.length > 0) ? (allInnings[0].batting_team === m.team_a ? allInnings[0].bowling_players : allInnings[0].batting_players) : [],
        overs: m.overs || 20,
        players: m.players || 11,
        venue: m.venue || 'Standard Ground',
        matchType: m.match_type
      };

      // If no innings yet, set config but return 'needs_setup' so UI can continue setup flow
      if (!allInnings || allInnings.length === 0) {
        if (m.status === 'live' || m.status === 'innings_break' || (live && live.innings_number)) {
           console.log('[useCricketScoring] Match is live but innings missing, attempting recovery...');
           // Create a default inning row to avoid setup loop
           const recoveryInnId = await createInningsRow(mid, 1, m.team_a, m.team_b, config.teamAPlayers, config.teamBPlayers);
           // Re-trigger resume would be complex, so let's just proceed with this fake row for now
           if (isRecovery) {
               console.error('[useCricketScoring] Recovery failed to create innings, aborting to avoid loop');
               return { status: 'error' };
           }
           return resumeMatch(mid, true);
        }
        console.warn('[useCricketScoring] No innings found and match not live, returning needs_setup');
        setMatchId(mid);
        setConfig(config);
      console.log('[DEBUG-SQUAD] Config Players A:', config.teamAPlayers?.length);
      console.log('[DEBUG-SQUAD] Config Players B:', config.teamBPlayers?.length);
      console.log('[DEBUG-SQUAD] XI Rows Found:', xiRows?.length);

        setPhase(xiRows?.length > 0 ? 'toss' : 'setup');
        return { status: 'needs_setup', config, xiData: xiRows };
      }
      console.log('[useCricketScoring] Found innings:', allInnings.length);

      const currentInnNum = live?.innings_number || 1;
      const currentInnRow = allInnings.find((i: any) => i.innings_number === currentInnNum) || allInnings[0];
      if (!currentInnRow) throw new Error('Current inning row not found');

      // Update config with actual players from innings
      config.teamAPlayers = currentInnRow.batting_team === m.team_a ? currentInnRow.batting_players : currentInnRow.bowling_players;
      config.teamBPlayers = currentInnRow.batting_team === m.team_a ? currentInnRow.bowling_players : currentInnRow.batting_players;

      // 4. Fetch ball logs to reconstruct batters/bowlers stats
      const { data: logs } = await supabase.from('ball_log').select('*').eq('match_id', mid).order('created_at', { ascending: true });
      
      const constructInning = (innNum: number, innRow: any) => {
        const innLogs = logs?.filter((l: any) => l.innings_id === innRow.id) || [];
        let calcLegal = 0;
        let lastBowlerInLog = null;
        
        const battingTeam = innRow.batting_team;
        const bowlingTeam = innRow.bowling_team;


        const state: InningState = {
          battingTeam,
          bowlingTeam,
          battingPlayers: (innRow.batting_players && innRow.batting_players.length > 0) 
            ? innRow.batting_players 
            : [...new Set(innLogs.map((l: any) => l.batter_name).filter(Boolean))] as string[],
          bowlingPlayers: (innRow.bowling_players && innRow.bowling_players.length > 0) 
            ? innRow.bowling_players 
            : [...new Set(innLogs.map((l: any) => l.bowler_name).filter(Boolean))] as string[],
          runs: Math.max(innRow.runs || 0, innLogs.reduce((acc: number, b: any) => acc + (b.runs || 0) + (b.extras || 0), 0)),
          wickets: Math.max(innRow.wickets || 0, innLogs.filter((b: any) => b.is_wicket).length),
          balls: innLogs.length, 
          legalBalls: 0, // Calculated below
          extras: { wide: 0, noball: 0, bye: 0, legbye: 0, penalty: 0 },
          batters: [],
          bowlers: [],
          currentBowlerIdx: 0,
          overBalls: typeof live?.current_over_balls === 'string' 
            ? JSON.parse(live.current_over_balls) 
            : (live?.current_over_balls || []),
          allOvers: [],
          target: innRow.target,
          inningsId: innRow.id,
          lastBowlerName: lastBowlerInLog
        };
        console.log('[DEBUG-SQUAD] Inning', innNum, 'Batting Team:', battingTeam, 'Squad Size:', state.battingPlayers.length);

        const battersMap: Record<string, Batter> = {};
        const bowlersMap: Record<string, Bowler> = {};


        innLogs.forEach((ball: any) => {
          if (ball.bowler_name) lastBowlerInLog = ball.bowler_name;
          if (!ball.extra_type || (ball.extra_type !== 'wide' && ball.extra_type !== 'noball')) {
            calcLegal++;
          }
          if (ball.batter_name) {
            if (!battersMap[ball.batter_name]) {
              battersMap[ball.batter_name] = { name: ball.batter_name, runs: 0, balls: 0, fours: 0, sixes: 0, dots: 0, onStrike: false, status: 'yet', out: false, dismissal: '' };
            }
            battersMap[ball.batter_name].runs += (ball.runs || 0);
            if (!ball.extra_type || ball.extra_type === 'noball') battersMap[ball.batter_name].balls++;
            if (ball.runs === 4) battersMap[ball.batter_name].fours++;
            if (ball.runs === 6) battersMap[ball.batter_name].sixes++;
            if (ball.is_wicket) {
               battersMap[ball.batter_name].out = true;
               battersMap[ball.batter_name].status = 'out';
               battersMap[ball.batter_name].dismissal = `${ball.dismissal_type} b ${ball.bowler_name}`;
            }
          }
          if (ball.bowler_name) {
            if (!bowlersMap[ball.bowler_name]) {
              bowlersMap[ball.bowler_name] = { name: ball.bowler_name, overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0, overRuns: 0, dots: 0, fours: 0, sixes: 0 };
            }
            bowlersMap[ball.bowler_name].runs += (ball.runs || 0) + (ball.extras || 0);
            if (!ball.extra_type || (ball.extra_type !== 'wide' && ball.extra_type !== 'noball')) {
              bowlersMap[ball.bowler_name].balls++;
              if (bowlersMap[ball.bowler_name].balls === 6) {
                bowlersMap[ball.bowler_name].overs++;
                bowlersMap[ball.bowler_name].balls = 0;
              }
            }
            if (ball.is_wicket && ball.dismissal_type !== 'run out') bowlersMap[ball.bowler_name].wickets++;
          }
          if (ball.extra_type && state.extras[ball.extra_type] !== undefined) {
            state.extras[ball.extra_type] += (ball.extras || 0);
          }
        });

        
        state.legalBalls = Math.max(innRow.legal_balls || 0, calcLegal);

        if (live) {
          // Ensure striker and non-striker are in the batters list
          [live.striker_name, live.nonstriker_name].forEach(name => {
            if (name && !battersMap[name]) {
              battersMap[name] = { name, runs: 0, balls: 0, fours: 0, sixes: 0, dots: 0, onStrike: false, status: 'batting', out: false, dismissal: '', startTime: Date.now() };
            }
          });

          const activeInLogs = Object.values(battersMap).filter(b => !b.out && b.balls > 0);
          
          Object.values(battersMap).forEach(b => {
            if (live.striker_name && b.name === live.striker_name) { 
              b.onStrike = true; 
              b.status = 'batting'; 
            } else if (live.nonstriker_name && b.name === live.nonstriker_name) { 
              b.onStrike = false; 
              b.status = 'batting'; 
            } else if (!b.out && b.balls > 0 && (!live.striker_name || !live.nonstriker_name)) {
              // Fallback: if they faced balls and are not out, they must be one of the current batters
              b.status = 'batting';
              // If no strike info, first one gets it
              if (!Object.values(battersMap).some(tmp => tmp.onStrike)) b.onStrike = true;
            }
          });
          
          state.currentBowlerIdx = state.bowlers.findIndex(b => b.name === live.bowler_name);
          if (state.currentBowlerIdx === -1) {
             const lastBowler = Object.values(bowlersMap).sort((a,b) => (b.overs * 6 + b.balls) - (a.overs * 6 + a.balls))[0];
             if (live.bowler_name) {
                const newBowler = { name: live.bowler_name, overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0, overRuns: 0 };
                state.bowlers.push(newBowler);
                state.currentBowlerIdx = state.bowlers.length - 1;
             } else if (lastBowler) {
                state.currentBowlerIdx = Object.values(bowlersMap).indexOf(lastBowler);
             } else {
                state.currentBowlerIdx = 0;
             }
          }
        } else {
          // No live state record? Reconstruct from logs only
          Object.values(battersMap).forEach(b => {
             if (!b.out && b.balls > 0) {
                b.status = 'batting';
                if (!Object.values(battersMap).some(tmp => tmp.onStrike)) b.onStrike = true;
             }
          });
          const lastBowler = Object.values(bowlersMap).sort((a,b) => (b.overs * 6 + b.balls) - (a.overs * 6 + a.balls))[0];
          if (lastBowler) {
             state.currentBowlerIdx = Object.values(bowlersMap).indexOf(lastBowler);
          }
        }

        state.batters = Object.values(battersMap);
        state.bowlers = Object.values(bowlersMap);
        return state;
      };

      const inn1State = constructInning(1, allInnings[0]);
      const inn2State = allInnings[1] ? constructInning(2, allInnings[1]) : null;

      setMatchId(mid);
      setConfig(config);
      console.log('[DEBUG-SQUAD] Config Players A:', config.teamAPlayers?.length);
      console.log('[DEBUG-SQUAD] Config Players B:', config.teamBPlayers?.length);
      console.log('[DEBUG-SQUAD] XI Rows Found:', xiRows?.length);

      setInningsList([inn1State, inn2State]);
      setCurrentIdx(currentInnNum - 1);
      
      const currentInningToSync = currentInnNum === 1 ? inn1State : (inn2State || inn1State);
      await pushLiveState(currentInningToSync, config, mid);
      
      setPhase('live');
      const finalXi = (xiRows && xiRows.length > 0) ? xiRows : 
        [
          ...(config.teamAPlayers || []).map(name => ({ team_id: m.team_a_id, player_id: name, team_members: { player_name: name } })),
          ...(config.teamBPlayers || []).map(name => ({ team_id: m.team_b_id, player_id: name, team_members: { player_name: name } }))
        ];
      return {
        status: 'success', config, xiData: finalXi, lastBowlerName: currentInningToSync.lastBowlerName, tossWinnerId: m.toss_winner_id, tossDecision: m.toss_decision 
      };
    } catch (err) {
      console.error('Resume match failed:', err);
      return {
    status: 'error' };
    }
    }, []);

  const striker = useMemo(() => {
    if (!inn) return undefined;
    const batting = inn.batters.filter(b => b.status === 'batting' && !b.out);
    if (batting.length === 0) return undefined;
    
    const onStrike = batting.find(b => b.onStrike);
    if (onStrike) return onStrike;
    
    // Fallback: pick the first one which is batting
    return batting[0];
  }, [inn]);

  const nonStriker = useMemo(() => {
    if (!inn || !striker) return undefined;
    const others = inn.batters.filter(b => b.status === 'batting' && !b.out && b.name !== striker.name);
    return others.length > 0 ? others[0] : undefined;
  }, [inn, striker]);
  const bowler = inn?.bowlers[inn?.currentBowlerIdx];
  const crr = inn ? calcCRR(inn.runs, inn.legalBalls) : 0;
  const rrr = inn?.target ? calcRRR(inn.target, inn.runs, inn.legalBalls, matchConfig?.overs) : null;
  const yetToBat = inn?.batters.filter(b => b.status === 'yet') ?? [];

  
  const swapBatters = useCallback(() => {
    setInn(prev => {
      const strikers = prev.batters.filter(b => b.onStrike);
      const nonStrikers = prev.batters.filter(b => b.status === 'batting' && !b.onStrike);
      if (strikers.length && nonStrikers.length) {
         return {
           ...prev,
           batters: prev.batters.map(b => {
             if (b.name === strikers[0].name) return { ...b, onStrike: false };
             if (b.name === nonStrikers[0].name) return { ...b, onStrike: true };
             return b;
           })
         };
      }
      return prev;
    });
  }, []);

  const markRetiredHurt = useCallback(async (playerName: string) => {
    if (!inn) return;
    setInn(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        batters: prev.batters.map(b => {
          if (b.name === playerName) {
             return { ...b, status: 'out', out: true, dismissal: 'retired hurt', onStrike: false };
          }
          return b;
        })
      };
    });
    // We update live state after the next render or here
  }, [inn]);

  const reviseTarget = useCallback((newTarget: number) => {
    setInn(prev => {
        if (!prev) return prev;
        return { ...prev, target: newTarget };
    });
  }, []);

  const updateMatchConfig = useCallback((updates: any) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const changeSquad = useCallback(async (teamId: string, newPlayers: any[]) => {
    setInn(prev => {
       if (!prev) return prev;
       const teamBatters = prev.batters.map(b => b.name.toLowerCase());
       const added = newPlayers.filter(p => !teamBatters.includes(p.name.toLowerCase()));
       return {
         ...prev,
         batters: [...prev.batters, ...added.map(p => ({
           name: p.name, runs: 0, balls: 0, dots: 0, fours: 0, sixes: 0, onStrike: false, status: 'yet', out: false, dismissal: ''
         }))]
       };
    });
  }, []);

return {
    savePlayingXi,
    matchId, phase, result, currentIdx,
    inn, inn1: inningsList[0], inn2: inningsList[1],
    matchConfig,
    striker, nonStriker, bowler, crr, rrr, yetToBat,
    battingPlayers: inn?.battingPlayers || [], bowlingPlayers: inn?.bowlingPlayers || [],
    formatOvers,
    swapBatters, markRetiredHurt, reviseTarget, updateMatchConfig, changeSquad, declareInnings,
    startMatch, resumeMatch, addBall, addExtra, addWicket,
    changeBowler, addNewBowler, undoLastBall, startSecondInnings, setOpeners,
  };
}
