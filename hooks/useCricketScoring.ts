// hooks/useCricketScoring.ts
// Drop-in scoring engine adapted for BookYourGround
import { useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Ball {
  type: string;
  label: string;
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
  const now = Date.now();
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
    const striker = innState.batters.find(b => b.onStrike && !b.out && b.status === 'batting');
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
    if (error) { console.error('createInningsRow error', error); return null; }
    return data.id;
  }, []);

  const startMatch = useCallback(async (config: any, tossWinner: string, tossChoice: 'bat' | 'bowl') => {
    const battingFirst = tossChoice === 'bat';
    const battingTeam = tossWinner === config.teamA
      ? (battingFirst ? config.teamA : config.teamB)
      : (battingFirst ? config.teamB : config.teamA);
    const bowlingTeam = battingTeam === config.teamA ? config.teamB : config.teamA;
    const battingPlayers = battingTeam === config.teamA ? config.teamAPlayers : config.teamBPlayers;
    const bowlingPlayers = bowlingTeam === config.teamA ? config.teamAPlayers : config.teamBPlayers;

    const mid = await createMatch(config);
    if (!mid) return;
    const innId = await createInningsRow(mid, 1, config.teamA, config.teamB, config.teamAPlayers, config.teamBPlayers);
    const innObj = initInning(config.teamA, config.teamB, config.teamAPlayers, config.teamBPlayers);
    innObj.inningsId = innId;

    await supabase.from('matches').update({ status: 'live', toss_winner: tossWinner, toss_choice: tossChoice }).eq('id', mid);

    setInningsList([innObj, null]);
    setCurrentIdx(0);
    setPhase('live');
    return { matchId: mid, inn: innObj };
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
        return { ...b, onStrike: !b.onStrike };
      }
      return b;
    });
  };

  const snapshot = (innState: InningState) => {
    historyRef.current.push(JSON.parse(JSON.stringify(innState)));
    if (historyRef.current.length > 30) historyRef.current.shift();
  };

  const checkEnd = useCallback(async (innState: InningState, cfg: any, mid: string) => {
    const totalPlayers = cfg?.players || 11;
    const maxWickets = Math.min(totalPlayers - 1, 10);
    const matchOvers = Number(cfg?.overs || 0);

    const allOut = innState.wickets >= maxWickets;
    const oversUp = matchOvers > 0 && innState.legalBalls >= matchOvers * 6;
    const chaseWon = currentIdx === 1 && innState.target && innState.runs >= innState.target;
    
    if (!allOut && !oversUp && !chaseWon) return false;

    if (currentIdx === 0) {
      await supabase.from('innings').update({ status: 'completed', runs: innState.runs, wickets: innState.wickets, legal_balls: innState.legalBalls }).eq('id', innState.inningsId);
      await supabase.from('matches').update({ status: 'innings_break' }).eq('id', mid);
      setPhase('innings_break');
    } else {
      const inn1 = inningsList[0]!;
      let resultText;
      const maxWickets = Math.min(cfg.players - 1, 10);
      if (chaseWon) {
        const wktsLeft = maxWickets - innState.wickets;
        resultText = `${innState.battingTeam} won by ${wktsLeft} wicket${wktsLeft !== 1 ? 's' : ''}`;
      } else {
        const runDiff = (innState.target || 0) - innState.runs - 1;
        resultText = `${inn1.battingTeam} won by ${runDiff} run${runDiff !== 1 ? 's' : ''}`;
      }
      await supabase.from('innings').update({ status: 'completed', runs: innState.runs, wickets: innState.wickets, legal_balls: innState.legalBalls }).eq('id', innState.inningsId);
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
    return { ...innState, bowlers: newBowlers, allOvers, overBalls: [] };
  }, []);

  const addBall = useCallback(async (runs: number) => {
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
      next.bowlers[bowlerIdx].overRuns = (next.bowlers[bowlerIdx].overRuns || 0) + runs;
      
      // Auto-increment over if 6 balls reached
      if (next.bowlers[bowlerIdx].balls >= 6) {
        next.bowlers[bowlerIdx].overs += 1;
        next.bowlers[bowlerIdx].balls = 0;
      }
    }

    const ballType = runs === 4 ? 'four' : runs === 6 ? 'six' : runs === 0 ? 'dot' : 'run';
    const ballLabel = runs === 0 ? '•' : String(runs);
    next.overBalls = [...next.overBalls, { type: ballType, label: ballLabel }];

    if (runs % 2 === 1) next.batters = rotateStrike(next.batters);

    if (next.legalBalls > 0 && next.legalBalls % 6 === 0) {
      next = handleOverEnd(next);
      next.batters = rotateStrike(next.batters);
    }

    setInn(next);
    await logBall(next, { runs, type: ballType, label: ballLabel }, matchId!);
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
        if (next.bowlers[bowlerIdx].balls >= 6) {
          next.bowlers[bowlerIdx].overs += 1;
          next.bowlers[bowlerIdx].balls = 0;
        }
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
    const nextBatIdx = next.batters.findIndex(b => b.name === newBatterName);

    if (dismissedIdx !== -1) {
      next.batters[dismissedIdx].out = true;
      next.batters[dismissedIdx].status = 'out';
      next.batters[dismissedIdx].onStrike = false;
      const bwrName = next.bowlers[bowlerIdx]?.name || 'Unknown';
      next.batters[dismissedIdx].dismissal = `${dismissalType} b ${bwrName}`;
      
      next.wickets += 1;
      if (bowlerIdx !== -1 && next.bowlers[bowlerIdx]) {
        next.bowlers[bowlerIdx].wickets += 1;
      }
      
      next.balls += 1;
      next.legalBalls += 1;
      next.overBalls = [...next.overBalls, { type: 'wicket', label: 'W' }];
      
      await logBall(next, { isWicket: true, dismissalType, fielder, type: 'wicket', label: 'W' }, matchId!);

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
    await checkEnd(next, matchConfig, matchId!);
  }, [inn, matchId, matchConfig, handleOverEnd, logBall, pushLiveState, checkEnd]);

  const addNewBowler = useCallback((name: string) => {
    setInn(prev => {
      const exists = prev.bowlers.find(b => b.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        return { ...prev, currentBowlerIdx: prev.bowlers.indexOf(exists) };
      }
      const newBowler: Bowler = {
        name, overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0, overRuns: 0
      };
      const nextBowlers = [...prev.bowlers, newBowler];
      return { ...prev, bowlers: nextBowlers, currentBowlerIdx: nextBowlers.length - 1 };
    });
  }, []);

  const changeBowler = useCallback((bowlerIdx: number) => {
    setInn(prev => ({ ...prev, currentBowlerIdx: bowlerIdx }));
  }, []);

  const undoLastBall = useCallback(async () => {
    if (historyRef.current.length === 0) return false;
    const prev = historyRef.current.pop()!;
    setInn(prev);
    await pushLiveState(prev, matchConfig, matchId!);
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
    setPhase('live');
    historyRef.current = [];
  }, [inningsList, matchConfig, matchId, createInningsRow]);

  const setOpeners = useCallback(async (strikerName: string, nonStrikerName: string, bowlerName: string) => {
    if (!inn) return;
    setInn(prev => {
      const next = { ...prev, batters: prev.batters.map(b => ({ ...b })), bowlers: prev.bowlers.map(b => ({ ...b })) };
      
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

  const resumeMatch = useCallback(async (mid: string) => {
    try {
      // 1. Fetch match and live state
      const [{ data: m }, { data: live }] = await Promise.all([
        supabase.from('matches').select('*').eq('id', mid).single(),
        supabase.from('match_live_state').select('*').eq('match_id', mid).single(),
      ]);

      if (!m || !live) throw new Error('Match not found');

      // 2. Fetch all innings for this match
      const { data: allInnings } = await supabase.from('innings').select('*').eq('match_id', mid).order('innings_number', { ascending: true });
      if (!allInnings) throw new Error('Innings not found');

      const currentInnNum = live.innings_number || 1;
      const currentInnRow = allInnings.find(i => i.innings_number === currentInnNum);
      if (!currentInnRow) throw new Error('Current inning row not found');

      // 3. Construct Config
      const config = {
        teamA: m.team_a,
        teamB: m.team_b,
        teamAId: m.team_a_id,
        teamBId: m.team_b_id,
        // We'll try to get these if they exist, or fallback
        teamAPlayers: [], 
        teamBPlayers: [],
        overs: m.overs,
        players: m.players,
        venue: m.venue,
        matchType: m.match_type
      };

      // 4. Fetch ball logs to reconstruct batters/bowlers stats
      const { data: logs } = await supabase.from('ball_log').select('*').eq('match_id', mid).order('created_at', { ascending: true });
      
      const constructInning = (innNum: number, innRow: any) => {
        const innLogs = logs?.filter(l => l.innings_id === innRow.id) || [];
        
        // Re-construct batters from team members if possible, otherwise from logs
        // For simplicity in resume, we start with players from logs + teams
        // This is complex, but let's at least restore the basics
        const battingTeam = innRow.batting_team;
        const bowlingTeam = innRow.bowling_team;

        // Basic reconstruction logic
        const state: InningState = {
          battingTeam,
          bowlingTeam,
          battingPlayers: (innRow.batting_players && innRow.batting_players.length > 0) 
            ? innRow.batting_players 
            : [...new Set(logs?.filter(l => l.innings_id === innRow.id).map(l => l.batter_name).filter(Boolean))],
          bowlingPlayers: (innRow.bowling_players && innRow.bowling_players.length > 0) 
            ? innRow.bowling_players 
            : [...new Set(logs?.filter(l => l.innings_id === innRow.id).map(l => l.bowler_name).filter(Boolean))],
          runs: innRow.runs || 0,
          wickets: innRow.wickets || 0,
          balls: innLogs.length, 
          legalBalls: innRow.legal_balls || 0,
          extras: { wide: 0, noball: 0, bye: 0, legbye: 0, penalty: 0 },
          batters: [],
          bowlers: [],
          currentBowlerIdx: 0,
          overBalls: JSON.parse(live.current_over_balls || '[]'),
          allOvers: [],
          target: innRow.target,
          inningsId: innRow.id
        };

        // Reconstruct batters/bowlers from logs
        const battersMap: Record<string, Batter> = {};
        const bowlersMap: Record<string, Bowler> = {};

        innLogs.forEach(ball => {
          if (ball.batter_name) {
            if (!battersMap[ball.batter_name]) {
              battersMap[ball.batter_name] = { name: ball.batter_name, runs: 0, balls: 0, fours: 0, sixes: 0, onStrike: false, status: 'yet', out: false, dismissal: '' };
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
              bowlersMap[ball.bowler_name] = { name: ball.bowler_name, overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0, overRuns: 0 };
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

        state.batters = Object.values(battersMap);
        state.bowlers = Object.values(bowlersMap);

        // Restore striker/non-striker from live state
        state.batters.forEach(b => {
          if (b.name === live.striker_name) { b.onStrike = true; b.status = 'batting'; }
          if (b.name === live.nonstriker_name) { b.onStrike = false; b.status = 'batting'; }
        });

        state.currentBowlerIdx = state.bowlers.findIndex(b => b.name === live.bowler_name);
        if (state.currentBowlerIdx === -1) state.currentBowlerIdx = 0;

        return state;
      };

      const inn1State = constructInning(1, allInnings[0]);
      const inn2State = allInnings[1] ? constructInning(2, allInnings[1]) : null;

      setMatchId(mid);
      setConfig(config);
      setInningsList([inn1State, inn2State]);
      setCurrentIdx(currentInnNum - 1);
      setPhase('live');
      
      return true;
    } catch (err) {
      console.error('Resume match failed:', err);
      return false;
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

  return {
    matchId, phase, result,
    inn, inn1: inningsList[0], inn2: inningsList[1],
    matchConfig,
    striker, nonStriker, bowler, crr, rrr, yetToBat,
    battingPlayers: inn?.battingPlayers || [], bowlingPlayers: inn?.bowlingPlayers || [],
    formatOvers,
    startMatch, resumeMatch, addBall, addExtra, addWicket,
    changeBowler, addNewBowler, undoLastBall, startSecondInnings, setOpeners,
  };
}
